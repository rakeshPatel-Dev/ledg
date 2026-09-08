import mongoose from "mongoose";
import { config } from "dotenv";

import { TransactionModel } from "../domains/transactions/model.js";
import { UserModel } from "../domains/users/model.js";

config({ path: ".env.local" });

export async function backfillTransactionUsernames(): Promise<{
  updated: number;
  total: number;
}> {
  const missingTxns = await TransactionModel.find({
    createdBy: { $ne: null, $exists: true },
    "createdBy.username": { $exists: false },
  }).lean();

  if (missingTxns.length === 0) {
    return { updated: 0, total: 0 };
  }

  const userIds = [
    ...new Set(missingTxns.map((t) => String(t.createdBy?.userId)).filter(Boolean)),
  ];
  const users = await UserModel.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const ops = [];
  for (const txn of missingTxns) {
    const user = userMap.get(String(txn.createdBy?.userId));
    ops.push({
      updateOne: {
        filter: { _id: txn._id },
        update: { $set: { "createdBy.username": user?.username ?? null } },
      },
    });
  }

  if (ops.length > 0) {
    await TransactionModel.bulkWrite(ops);
  }

  return { updated: ops.length, total: missingTxns.length };
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith("backfill-transactions-username.ts")) {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!mongoUri) {
    console.error("MONGODB_URI is not defined");
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { dbName });
  console.log("Connected to MongoDB, running backfill...");

  const result = await backfillTransactionUsernames();
  console.log(
    `Backfill completed: ${result.updated} / ${result.total} transactions updated.`
  );

  await mongoose.disconnect();
  process.exit(0);
}