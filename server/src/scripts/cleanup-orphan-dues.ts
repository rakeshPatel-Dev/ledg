import mongoose from "mongoose";
import { config } from "dotenv";

import { DebtModel, DebtSettlementModel } from "../domains/dues/model.js";
import { SpaceModel } from "../domains/spaces/model.js";

config({ path: ".env.local" });

export async function cleanupOrphanDues(): Promise<{
  deletedDebts: number;
  deletedSettlements: number;
  orphanSpaces: number;
}> {
  const [debtSpaceIds, settlementSpaceIds] = await Promise.all([
    DebtModel.distinct("spaceId"),
    DebtSettlementModel.distinct("spaceId"),
  ]);

  const candidateSpaceIds = [
    ...new Set([...debtSpaceIds, ...settlementSpaceIds].map(String)),
  ];
  if (candidateSpaceIds.length === 0) {
    return { deletedDebts: 0, deletedSettlements: 0, orphanSpaces: 0 };
  }

  const existingSpaces = await SpaceModel.find({
    _id: { $in: candidateSpaceIds },
  })
    .select("_id")
    .lean();
  const existingSpaceIds = new Set(existingSpaces.map((space) => String(space._id)));
  const orphanSpaceIds = candidateSpaceIds.filter((id) => !existingSpaceIds.has(id));

  if (orphanSpaceIds.length === 0) {
    return { deletedDebts: 0, deletedSettlements: 0, orphanSpaces: 0 };
  }

  // Remove settlements before debts so a repair that keeps a debt never leaves
  // behind settlements pointing at a deleted parent.
  const settlementResult = await DebtSettlementModel.deleteMany({
    spaceId: { $in: orphanSpaceIds },
  });
  const debtResult = await DebtModel.deleteMany({ spaceId: { $in: orphanSpaceIds } });

  return {
    deletedDebts: debtResult.deletedCount ?? 0,
    deletedSettlements: settlementResult.deletedCount ?? 0,
    orphanSpaces: orphanSpaceIds.length,
  };
}

// Standalone execution
if (process.argv[1] && /cleanup-orphan-dues\.(ts|js)$/.test(process.argv[1])) {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!mongoUri) {
    console.error("MONGODB_URI is not defined");
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { dbName });
  console.log("Connected to MongoDB, cleaning up orphaned dues...");

  const result = await cleanupOrphanDues();
  console.log(
    `Cleanup completed: ${result.deletedDebts} dues and ` +
      `${result.deletedSettlements} settlements removed across ` +
      `${result.orphanSpaces} deleted space(s).`
  );

  await mongoose.disconnect();
  process.exit(0);
}
