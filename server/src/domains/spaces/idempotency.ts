import mongoose, { Schema, type Types } from "mongoose";
import { BadRequestError } from "../../common/errors/index.js";

// Idempotency keys are client-generated opaque identifiers. We accept a
// reasonable ASCII range (UUIDs and similar) and enforce a length bound so a
// garbage header can't be used to grow the collection.
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9._:-]{8,128}$/;

export function validateIdempotencyKey(key: string): void {
  if (!IDEMPOTENCY_KEY_RE.test(key)) {
    throw new BadRequestError(
      "Invalid Idempotency-Key. Use 8–128 characters (letters, digits, . _ : -)."
    );
  }
}

export interface IdempotencyKeyDoc {
  userId: Types.ObjectId;
  key: string;
  statusCode: number;
  responseBody: Record<string, unknown>;
  pending: boolean;
  createdAt: Date;
}

const idempotencyKeySchema = new Schema<IdempotencyKeyDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
      default: 200,
    },
    responseBody: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    pending: {
      type: Boolean,
      required: true,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24 hours TTL
    },
  }
);

idempotencyKeySchema.index({ userId: 1, key: 1 }, { unique: true });

export const IdempotencyKeyModel =
  mongoose.models.IdempotencyKey ||
  mongoose.model<IdempotencyKeyDoc>("IdempotencyKey", idempotencyKeySchema);

/**
 * Check whether a completed response is already cached for this key.
 * Returns null if no record exists, or the record is still pending (in-flight).
 */
export async function getCachedResponse(
  userId: Types.ObjectId,
  key: string
): Promise<{ statusCode: number; responseBody: Record<string, unknown> } | null> {
  const record = await IdempotencyKeyModel.findOne({
    userId,
    key,
    pending: false,
  }).lean();
  if (!record) return null;
  return {
    statusCode: record.statusCode,
    responseBody: record.responseBody,
  };
}

/**
 * Try to acquire an idempotency lease. Inserts a `pending: true` placeholder
 * to block concurrent requests with the same key.
 *
 * - Returns `"acquired"` when the insert succeeds — caller should proceed.
 * - Returns `"completed"` when a finished response already exists — caller
 *   should return the cached result.
 * - Returns `"pending"` when another request is still in flight — caller
 *   should wait/retry or return 409.
 *
 * Throws on unexpected Mongo errors (non-duplicate-key).
 */
export async function acquireLease(
  userId: Types.ObjectId,
  key: string
): Promise<"acquired" | "completed" | "pending"> {
  try {
    await IdempotencyKeyModel.create({
      userId,
      key,
      pending: true,
      statusCode: 200,
      responseBody: {},
    });
    return "acquired";
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      // A record already exists — check if it's completed or still pending
      const existing = await IdempotencyKeyModel.findOne({ userId, key })
        .select("pending statusCode responseBody")
        .lean();
      if (!existing) {
        // Shouldn't happen, but treat as acquired
        return "acquired";
      }
      if (!existing.pending) {
        return "completed";
      }
      return "pending";
    }
    throw err;
  }
}

/**
 * Finalize a lease by writing the actual response. Only swallows duplicate-key
 * errors (harmless race on the upsert); rethrows everything else.
 */
export async function finalizeLease(
  userId: Types.ObjectId,
  key: string,
  statusCode: number,
  responseBody: Record<string, unknown>
): Promise<void> {
  try {
    await IdempotencyKeyModel.updateOne(
      { userId, key },
      {
        $set: {
          statusCode,
          responseBody,
          pending: false,
        },
      }
    );
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) return;
    throw err;
  }
}

/**
 * Release an in-flight lease after a handler failure so a retry with the same
 * key can acquire a fresh lease. Only removes the pending placeholder; a
 * completed (finalized) response is left intact.
 */
export async function releaseLease(
  userId: Types.ObjectId,
  key: string
): Promise<void> {
  await IdempotencyKeyModel.deleteOne({ userId, key, pending: true });
}

/**
 * @deprecated Use acquireLease + finalizeLease instead. Kept for backward compat.
 */
export async function storeCachedResponse(
  userId: Types.ObjectId,
  key: string,
  statusCode: number,
  responseBody: Record<string, unknown>
): Promise<void> {
  try {
    await IdempotencyKeyModel.updateOne(
      { userId, key },
      {
        $set: {
          statusCode,
          responseBody,
          pending: false,
        },
      },
      { upsert: true }
    );
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) return;
    throw err;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}
