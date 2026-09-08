import mongoose from "mongoose";
import { config } from "dotenv";

import { SpaceModel } from "../domains/spaces/model.js";
import { UserModel } from "../domains/users/model.js";

config({ path: ".env.local" });

export async function backfillMemberUsernames(): Promise<{ updated: number; total: number }> {
  // Any space whose member snapshots predate the `username` field will be
  // missing the key on at least one member. Fill each missing member username
  // from the live user document (falls back to null if the user is gone).
  const spaces = await SpaceModel.find({
    "members.username": { $exists: false },
  })
    .select("members")
    .lean();

  let updatedCount = 0;

  for (const space of spaces) {
    // Legacy docs may be missing the members array entirely (healed elsewhere).
    if (!space.members || space.members.length === 0) continue;

    const ops = [];

    for (const member of space.members) {
      if (member.username) continue;

      const user = await UserModel.findById(member.userId).select("username").lean();
      ops.push({
        updateOne: {
          filter: { _id: space._id, "members.userId": member.userId },
          update: { $set: { "members.$[elem].username": user?.username ?? null } },
          arrayFilters: [{ "elem.userId": member.userId }],
        },
      });
    }

    if (ops.length > 0) {
      await SpaceModel.bulkWrite(ops);
      updatedCount++;
    }
  }

  return { updated: updatedCount, total: spaces.length };
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith("backfill-member-usernames.ts")) {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!mongoUri) {
    console.error("MONGODB_URI is not defined");
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { dbName });
  console.log("Connected to MongoDB, running backfill...");

  const result = await backfillMemberUsernames();
  console.log(`Backfill completed: ${result.updated} / ${result.total} spaces updated.`);

  await mongoose.disconnect();
  process.exit(0);
}