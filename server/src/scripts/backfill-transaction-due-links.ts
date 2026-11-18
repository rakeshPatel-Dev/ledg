import mongoose from "mongoose";
import { config } from "dotenv";

import { DebtModel, DebtSettlementModel } from "../domains/dues/model.js";
import { TransactionModel } from "../domains/transactions/model.js";

config({ path: ".env.local" });

const CHUNK_SIZE = 500;

export async function backfillTransactionDueLinks(): Promise<{
  updated: number;
  missing: number;
  total: number;
}> {
  // A single transaction can only belong to one due, but map by transaction id
  // so a bad row with two owners is written once and logged instead of racing.
  const links = new Map<string, string>();
  let duplicateLinks = 0;

  const debts = await DebtModel.find({ transactionId: { $ne: null } })
    .select("_id transactionId")
    .lean();
  for (const debt of debts) {
    if (!debt.transactionId) continue;
    const transactionId = String(debt.transactionId);
    if (links.has(transactionId)) {
      duplicateLinks++;
      continue;
    }
    links.set(transactionId, String(debt._id));
  }

  const settlements = await DebtSettlementModel.find({ transactionId: { $ne: null } })
    .select("_id debtId transactionId")
    .lean();
  for (const settlement of settlements) {
    if (!settlement.transactionId) continue;
    const transactionId = String(settlement.transactionId);
    if (links.has(transactionId)) {
      duplicateLinks++;
      continue;
    }
    links.set(transactionId, String(settlement.debtId));
  }

  if (links.size === 0) {
    return { updated: 0, missing: 0, total: 0 };
  }

  const entries = [...links.entries()];
  let matched = 0;
  let modified = 0;

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    const result = await TransactionModel.bulkWrite(
      chunk.map(([transactionId, dueId]) => ({
        updateOne: {
          filter: { _id: transactionId },
          update: { $set: { dueId, source: "dues" } },
        },
      }))
    );

    matched += result.matchedCount;
    modified += result.modifiedCount;
  }

  const missing = entries.length - matched;
  if (duplicateLinks > 0) {
    console.warn(
      `Skipped ${duplicateLinks} duplicate transaction link(s); only the first due was kept.`
    );
  }

  return { updated: modified, missing, total: entries.length };
}

// Standalone execution
if (process.argv[1] && /backfill-transaction-due-links\.(ts|js)$/.test(process.argv[1])) {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!mongoUri) {
    console.error("MONGODB_URI is not defined");
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { dbName });
  console.log("Connected to MongoDB, backfilling transaction due links...");

  const result = await backfillTransactionDueLinks();
  console.log(
    `Backfill completed: ${result.updated} updated, ${result.missing} missing ` +
      `out of ${result.total} linked transactions.`
  );

  await mongoose.disconnect();
  process.exit(0);
}
