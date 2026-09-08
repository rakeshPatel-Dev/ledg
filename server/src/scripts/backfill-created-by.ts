import mongoose, { Types } from "mongoose";
import { config } from "dotenv";

import { SpaceModel } from "../domains/spaces/model.js";
import { TransactionModel } from "../domains/transactions/model.js";
import { UserModel } from "../domains/users/model.js";

config({ path: ".env.local" });

const FALLBACK_USER_ID = new Types.ObjectId("000000000000000000000000");

export async function backfillCreatedBy(): Promise<{ updated: number; total: number }> {
  const missingTxns = await TransactionModel.find({
    $or: [{ createdBy: { $exists: false } }, { createdBy: null }],
  }).lean();

  if (missingTxns.length === 0) {
    return { updated: 0, total: 0 };
  }

  // Pre-fetch all spaces and owners
  const spaceIds = [...new Set(missingTxns.map((t) => String(t.spaceId)))];
  const spaces = await SpaceModel.find({ _id: { $in: spaceIds } }).lean();
  const spaceMap = new Map(spaces.map((s) => [String(s._id), s]));

  const ownerIds = [...new Set(spaces.map((s) => String(s.ownerId)))];
  const users = await UserModel.find({ _id: { $in: ownerIds } }).lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  let updatedCount = 0;

  for (const txn of missingTxns) {
    const space = spaceMap.get(String(txn.spaceId));
    const owner = space ? userMap.get(String(space.ownerId)) : null;

    const createdBy = owner
      ? {
          userId: owner._id,
          name: owner.name || "Ledg User",
          email: owner.email || "user@ledg.app",
          username: owner.username ?? null,
        }
      : space
        ? {
            userId: space.ownerId,
            name: "Unknown",
            email: "unknown@ledg.app",
            username: null,
          }
        : {
            userId: FALLBACK_USER_ID,
            name: "Unknown",
            email: "unknown@ledg.app",
            username: null,
          };

    await TransactionModel.updateOne(
      { _id: txn._id },
      { $set: { createdBy } }
    );
    updatedCount++;
  }

  return { updated: updatedCount, total: missingTxns.length };
}

// Standalone execution
if (
  process.argv[1] &&
  /backfill-created-by\.(ts|js)$/.test(process.argv[1])
) {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!mongoUri) {
    console.error("MONGODB_URI is not defined");
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { dbName });
  console.log("Connected to MongoDB, running backfill...");

  const result = await backfillCreatedBy();
  console.log(`Backfill completed: ${result.updated} / ${result.total} transactions updated.`);

  await mongoose.disconnect();
  process.exit(0);
}
