import { Types } from "mongoose";

import { BadRequestError } from "../../common/errors/index.js";
import {
  importTransactionRowSchema,
  type ImportInput,
  type ImportResult,
  type ImportTransactionRow,
} from "../../shared/index.js";
import { invalidateDashboardCache } from "../analytics/cache.js";
import type { SpaceDoc } from "../spaces/model.js";
import * as spaceRepository from "../spaces/repository.js";
import * as transactionRepository from "../transactions/repository.js";
import { getUserContext } from "../transactions/user-context.js";

// Asia/Kathmandu (UTC+05:45). Kept in sync with analytics/service.ts.
const APP_TZ_OFFSET_MINUTES = 345;
const MAX_SPACES = 10;

function localDayKey(date: Date): string {
  const shifted = new Date(date.getTime() + APP_TZ_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

function dedupeKey(
  spaceId: string,
  row: {
    type: string;
    amount: number;
    category: string;
    note: string;
    date: Date;
  }
): string {
  return [
    spaceId,
    row.type,
    row.amount.toFixed(2),
    row.category.trim().toLowerCase(),
    row.note.trim().toLowerCase(),
    localDayKey(row.date),
  ].join("|");
}

function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid row";
}

/**
 * Import normalised rows from a CSV or JSON backup.
 *
 * Each row is validated independently so one bad line does not reject the
 * file. Duplicates are matched on space, type, amount, category, note and
 * local day; this is intentionally coarser than the stored timestamp because
 * CSV exports only carry a date and time.
 */
export async function importTransactions(
  userId: Types.ObjectId,
  input: ImportInput
): Promise<ImportResult> {
  const user = await getUserContext(userId);
  const spaces = await spaceRepository.findSpacesForUser(userId);
  const spaceById = new Map(spaces.map((space) => [String(space.id), space]));
  const spaceByName = new Map<string, SpaceDoc>();

  for (const space of spaces) {
    const key = space.name.trim().toLowerCase();
    const existing = spaceByName.get(key);
    // Prefer a space the user owns when two share a name.
    if (!existing || space.ownerId.toString() === userId.toString()) {
      spaceByName.set(key, space);
    }
  }

  let spacesCreated = 0;
  // The space cap counts owned spaces, not memberships (see countUserSpaces).
  let spaceCount = spaces.filter(
    (space) => space.ownerId.toString() === userId.toString()
  ).length;
  let targetSpace: SpaceDoc | null = null;

  if (input.targetSpaceId) {
    targetSpace = spaceById.get(input.targetSpaceId) ?? null;
    if (!targetSpace) {
      throw new BadRequestError("Destination space not found");
    }
  }

  const errors: ImportResult["errors"] = [];
  const resolved: Array<{
    index: number;
    spaceId: string;
    row: ImportTransactionRow;
    date: Date;
  }> = [];

  for (let index = 0; index < input.transactions.length; index++) {
    const parsed = importTransactionRowSchema.safeParse(input.transactions[index]);
    if (!parsed.success) {
      errors.push({ index, message: firstIssue(parsed.error) });
      continue;
    }

    const row = parsed.data;
    const date = new Date(row.date);
    if (Number.isNaN(date.getTime())) {
      errors.push({ index, message: "Invalid date" });
      continue;
    }

    let space: SpaceDoc | null = targetSpace;

    if (!space) {
      // A backup restored into another account carries stale space ids, so
      // fall back to the name before giving up.
      if (row.spaceId) {
        space = spaceById.get(row.spaceId) ?? null;
      }
      if (!space && row.spaceName) {
        space = spaceByName.get(row.spaceName.trim().toLowerCase()) ?? null;
      }
    }

    if (!space && row.spaceName && input.createSpaces) {
      const name = row.spaceName.trim();

      if (spaceCount >= MAX_SPACES) {
        errors.push({
          index,
          message: `Space limit reached, cannot create "${name}"`,
        });
        continue;
      }

      try {
        const created = await spaceRepository.createSpace(
          {
            userId: user.userId,
            email: user.email,
            name: user.name,
            username: user.username,
          },
          { name, type: "personal" }
        );
        space = created;
        spaceById.set(String(created.id), created);
        spaceByName.set(name.toLowerCase(), created);
        spaceCount += 1;
        spacesCreated += 1;
      } catch {
        errors.push({
          index,
          message: `Could not create space "${name}"`,
        });
        continue;
      }
    }

    if (!space) {
      errors.push({
        index,
        message: row.spaceName
          ? `Space "${row.spaceName}" not found (enable "create missing spaces")`
          : "No destination space for this row",
      });
      continue;
    }

    resolved.push({ index, spaceId: String(space.id), row, date });
  }

  if (resolved.length === 0) {
    return {
      imported: 0,
      skipped: 0,
      failed: input.transactions.length,
      spacesCreated,
      errors,
      importedIds: [],
    };
  }

  const normalised = resolved.map(({ spaceId, row, date }) => ({
    spaceId,
    doc: {
      spaceId: new Types.ObjectId(spaceId),
      category: row.category,
      type: row.type,
      amount: row.amount,
      note: row.note,
      date,
      paymentMethod: row.paymentMethod ?? null,
      source: "manual" as const,
      createdBy: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    },
  }));

  const affectedSpaceIds = [...new Set(normalised.map((item) => item.spaceId))];
  const timestamps = normalised.map((item) => item.doc.date.getTime());
  const from = new Date(Math.min(...timestamps));
  const to = new Date(Math.max(...timestamps));

  let docs = normalised;
  let skipped = 0;

  if (input.skipDuplicates) {
    const existing = await transactionRepository.findTransactionsForDedupe(
      affectedSpaceIds.map((id) => new Types.ObjectId(id)),
      from,
      to
    );
    const seen = new Set(
      existing.map((transaction) =>
        dedupeKey(String(transaction.spaceId), {
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          note: transaction.note,
          date: transaction.date,
        })
      )
    );

    docs = [];
    for (const item of normalised) {
      const key = dedupeKey(item.spaceId, item.doc);
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      // Also skip duplicates that appear twice in the same file.
      seen.add(key);
      docs.push(item);
    }
  }

  const invalidCount = errors.length;
  const inserted = await transactionRepository.createManyTransactions(
    docs.map((item) => item.doc)
  );
  const imported = inserted.inserted;

  const failed = Math.max(input.transactions.length - imported - skipped, 0);
  if (failed > invalidCount) {
    errors.push({
      index: -1,
      message: `${failed - invalidCount} row(s) could not be saved`,
    });
  }

  // Refresh every affected user's dashboard. A restore should not emit one
  // notification per row for the other members of a shared space.
  const affectedUsers = new Set<string>([String(userId)]);
  for (const spaceId of affectedSpaceIds) {
    for (const member of spaceById.get(spaceId)?.members ?? []) {
      affectedUsers.add(String(member.userId));
    }
  }
  await invalidateDashboardCache([...affectedUsers]);

  return {
    imported,
    skipped,
    failed,
    spacesCreated,
    errors,
    importedIds: inserted.ids,
  };
}
