/**
 * Seed demo data so every feature has something to show.
 *
 * Usage (from the repo root):
 *   npm run seed                 # seed the most recently created user
 *   npm run seed -- --email=you@example.com
 *   npm run seed -- --user=<app user _id>
 *   npm run seed -- --reset      # remove demo data and exit
 *
 * Data lives in three dedicated spaces ("Demo · ...") so it can be removed
 * without touching the user's real spaces. Re-running replaces the demo data.
 */

import "../config/env.js";

import mongoose, { Types } from "mongoose";

import { connectDatabase } from "../database/index.js";
import { SpaceModel } from "../domains/spaces/model.js";
import { TransactionModel } from "../domains/transactions/model.js";
import { UserModel } from "../domains/users/model.js";
import { DebtModel, DebtSettlementModel } from "../domains/dues/model.js";
import { NotificationModel } from "../domains/notifications/model.js";
import { SpaceInvitationModel } from "../domains/invitations/model.js";
import { createDue, settleDue } from "../domains/dues/service.js";
import { invalidateDashboardCache } from "../domains/analytics/cache.js";
import type {
  DebtDirection,
  PaymentMethod,
  SpaceType,
  TransactionType,
} from "../shared/index.js";

// ─── Args ────────────────────────────────────────────────────────────────────

function argValue(name: string): string | undefined {
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return undefined;
}

const RESET_ONLY = process.argv.includes("--reset");

// ─── Dates (Asia/Kathmandu, matching the analytics service) ──────────────────

const TZ_OFFSET_MINUTES = 345;
const DAY_MS = 24 * 60 * 60 * 1000;

function zonedParts(date: Date): { y: number; m: number; d: number } {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MINUTES * 60_000);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
  };
}

function zonedBoundary(y: number, m: number, d: number, end = false): Date {
  const ms = end
    ? Date.UTC(y, m, d, 23, 59, 59, 999)
    : Date.UTC(y, m, d, 0, 0, 0, 0);
  return new Date(ms - TZ_OFFSET_MINUTES * 60_000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// ─── Demo spaces ─────────────────────────────────────────────────────────────

type SpaceKey = "household" | "trip" | "hustle";

const DEMO_SPACES: Array<{
  key: SpaceKey;
  name: string;
  type: SpaceType;
  monthlyBudget: number | null;
}> = [
  { key: "household", name: "Demo · Household", type: "family", monthlyBudget: 60000 },
  { key: "trip", name: "Demo · Goa Trip", type: "trip", monthlyBudget: 40000 },
  { key: "hustle", name: "Demo · Side Hustle", type: "business", monthlyBudget: null },
];

// ─── Transactions ────────────────────────────────────────────────────────────

interface TxSeed {
  space: SpaceKey;
  type: TransactionType;
  category: string;
  amount: number;
  note: string;
  paymentMethod: PaymentMethod | null;
  at: number; // fraction of the current month, 0 = first day, 1 = now
}

const CURRENT_MONTH_TX: TxSeed[] = [
  // Income
  { space: "household", type: "income", category: "Salary", amount: 85000, note: "Monthly salary", paymentMethod: "bank_transfer", at: 0.0 },
  { space: "household", type: "income", category: "Freelance", amount: 18000, note: "Client invoice", paymentMethod: "bank_transfer", at: 0.68 },
  { space: "household", type: "income", category: "Investment", amount: 2400, note: "Dividend", paymentMethod: "bank_transfer", at: 0.80 },
  { space: "hustle", type: "income", category: "Freelance", amount: 7500, note: "Logo project", paymentMethod: "wallet", at: 0.55 },
  { space: "hustle", type: "income", category: "Business", amount: 12000, note: "Retainer", paymentMethod: "bank_transfer", at: 0.74 },

  // Household expenses
  { space: "household", type: "expense", category: "Rent", amount: 25000, note: "Monthly rent", paymentMethod: "bank_transfer", at: 0.02 },
  { space: "household", type: "expense", category: "Groceries", amount: 3200, note: "Bhatbhateni", paymentMethod: "card", at: 0.08 },
  { space: "household", type: "expense", category: "Food", amount: 450, note: "Lunch at Thamel", paymentMethod: "wallet", at: 0.10 },
  { space: "household", type: "expense", category: "Transport", amount: 250, note: "Pathao ride", paymentMethod: "wallet", at: 0.13 },
  { space: "household", type: "expense", category: "Bills", amount: 1800, note: "Internet bill", paymentMethod: "bank_transfer", at: 0.16 },
  { space: "household", type: "expense", category: "Bills", amount: 1200, note: "Electricity", paymentMethod: "wallet", at: 0.18 },
  { space: "household", type: "expense", category: "Shopping", amount: 4500, note: "Daraz order", paymentMethod: "card", at: 0.22 },
  { space: "household", type: "expense", category: "Entertainment", amount: 1500, note: "Netflix", paymentMethod: "card", at: 0.25 },
  { space: "household", type: "expense", category: "Food", amount: 380, note: "Lunch at Thamel", paymentMethod: "cash", at: 0.28 },
  { space: "household", type: "expense", category: "Groceries", amount: 2850, note: "Bhatbhateni", paymentMethod: "card", at: 0.32 },
  { space: "household", type: "expense", category: "Transport", amount: 180, note: "Pathao ride", paymentMethod: "wallet", at: 0.35 },
  { space: "household", type: "expense", category: "Health", amount: 900, note: "Pharmacy", paymentMethod: "cash", at: 0.40 },
  { space: "household", type: "expense", category: "Education", amount: 2000, note: "Coursera", paymentMethod: "card", at: 0.44 },
  { space: "household", type: "expense", category: "Family", amount: 5000, note: "Sent to parents", paymentMethod: "bank_transfer", at: 0.48 },
  { space: "household", type: "expense", category: "Food", amount: 520, note: "Lunch at Thamel", paymentMethod: "wallet", at: 0.52 },
  { space: "household", type: "expense", category: "Entertainment", amount: 1500, note: "Netflix", paymentMethod: "card", at: 0.56 },
  { space: "household", type: "expense", category: "Groceries", amount: 2100, note: "Bhatbhateni", paymentMethod: "cash", at: 0.60 },
  { space: "household", type: "expense", category: "Other", amount: 600, note: "Misc", paymentMethod: "cash", at: 0.64 },
  { space: "household", type: "expense", category: "Shopping", amount: 2200, note: "New shoes", paymentMethod: "card", at: 0.72 },
  { space: "household", type: "expense", category: "Transport", amount: 320, note: "Pathao ride", paymentMethod: "wallet", at: 0.76 },
  { space: "household", type: "expense", category: "Food", amount: 700, note: "Dinner out", paymentMethod: "card", at: 0.84 },
  { space: "household", type: "expense", category: "Bills", amount: 900, note: "Mobile top-up", paymentMethod: "wallet", at: 0.88 },

  // Trip
  { space: "trip", type: "expense", category: "Travel", amount: 12000, note: "Pokhara flight", paymentMethod: "card", at: 0.20 },
  { space: "trip", type: "expense", category: "Travel", amount: 3500, note: "Hotel booking", paymentMethod: "card", at: 0.30 },
  { space: "trip", type: "expense", category: "Food", amount: 1800, note: "Lakeside dinner", paymentMethod: "cash", at: 0.42 },
  { space: "trip", type: "expense", category: "Transport", amount: 1200, note: "Local taxi", paymentMethod: "cash", at: 0.50 },

  // Side hustle
  { space: "hustle", type: "expense", category: "Other", amount: 1500, note: "Adobe subscription", paymentMethod: "card", at: 0.62 },
];

const PREVIOUS_MONTH_TX: TxSeed[] = [
  { space: "household", type: "income", category: "Salary", amount: 85000, note: "Monthly salary", paymentMethod: "bank_transfer", at: 0.0 },
  { space: "household", type: "income", category: "Freelance", amount: 15000, note: "Client invoice", paymentMethod: "bank_transfer", at: 0.85 },
  { space: "household", type: "expense", category: "Rent", amount: 22000, note: "Monthly rent", paymentMethod: "bank_transfer", at: 0.02 },
  { space: "household", type: "expense", category: "Groceries", amount: 4000, note: "Bhatbhateni", paymentMethod: "card", at: 0.10 },
  { space: "household", type: "expense", category: "Food", amount: 1200, note: "Lunch at Thamel", paymentMethod: "cash", at: 0.15 },
  { space: "household", type: "expense", category: "Transport", amount: 600, note: "Pathao ride", paymentMethod: "wallet", at: 0.20 },
  { space: "household", type: "expense", category: "Bills", amount: 2000, note: "Utilities", paymentMethod: "bank_transfer", at: 0.25 },
  { space: "household", type: "expense", category: "Shopping", amount: 3000, note: "Dashain shopping", paymentMethod: "card", at: 0.35 },
  { space: "household", type: "expense", category: "Entertainment", amount: 1500, note: "Netflix", paymentMethod: "card", at: 0.45 },
  { space: "household", type: "expense", category: "Travel", amount: 4000, note: "Chitwan trip", paymentMethod: "card", at: 0.55 },
  { space: "household", type: "expense", category: "Health", amount: 1500, note: "Dental checkup", paymentMethod: "cash", at: 0.65 },
  { space: "household", type: "expense", category: "Family", amount: 5000, note: "Sent to parents", paymentMethod: "bank_transfer", at: 0.75 },
  { space: "household", type: "expense", category: "Food", amount: 900, note: "Dinner out", paymentMethod: "wallet", at: 0.90 },
];

const LAST_YEAR_TX: TxSeed[] = [
  { space: "household", type: "income", category: "Salary", amount: 70000, note: "Monthly salary", paymentMethod: "bank_transfer", at: 0.0 },
  { space: "household", type: "expense", category: "Rent", amount: 22000, note: "Monthly rent", paymentMethod: "bank_transfer", at: 0.05 },
  { space: "household", type: "expense", category: "Groceries", amount: 3500, note: "Bhatbhateni", paymentMethod: "card", at: 0.30 },
  { space: "household", type: "expense", category: "Travel", amount: 15000, note: "Everest base camp", paymentMethod: "card", at: 0.55 },
  { space: "household", type: "expense", category: "Shopping", amount: 4000, note: "Winter clothes", paymentMethod: "card", at: 0.80 },
];

// ─── Dues ────────────────────────────────────────────────────────────────────

interface DueSeed {
  space: SpaceKey;
  direction: DebtDirection;
  name: string;
  principal: number;
  note: string;
  dueInDays: number;
  settled: number;
}

const DUE_SEEDS: DueSeed[] = [
  { space: "household", direction: "lent", name: "Suman Shrestha", principal: 5000, note: "Bike repair", dueInDays: 14, settled: 0 },
  { space: "household", direction: "lent", name: "Anita Gurung", principal: 12000, note: "Trip advance", dueInDays: 30, settled: 5000 },
  { space: "household", direction: "borrowed", name: "Bikash Thapa", principal: 8000, note: "Rent help", dueInDays: 5, settled: 0 },
  { space: "household", direction: "borrowed", name: "Ramesh KC", principal: 3000, note: "Short-term loan", dueInDays: -3, settled: 3000 },
  { space: "hustle", direction: "lent", name: "Prakash Adhikari", principal: 2500, note: "Lunch split", dueInDays: -7, settled: 0 },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function resolveUser() {
  const email = argValue("email") ?? process.env.SEED_EMAIL;
  const id = argValue("user");

  if (id) {
    const user = await UserModel.findById(id);
    if (user) return user;
    throw new Error(`No user with _id ${id}`);
  }

  if (email) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (user) return user;
    throw new Error(`No user with email ${email}`);
  }

  const user = await UserModel.findOne().sort({ createdAt: -1 });
  if (user) return user;

  throw new Error(
    "No users found. Sign in to the app once, then re-run the seed."
  );
}

async function clearDemoData(ownerId: Types.ObjectId) {
  const names = DEMO_SPACES.map((space) => space.name);
  const spaces = await SpaceModel.find({ ownerId, name: { $in: names } });
  const spaceIds = spaces.map((space) => space._id);

  if (spaceIds.length === 0) return;

  const debts = await DebtModel.find({ spaceId: { $in: spaceIds } }).select(
    "_id"
  );
  await DebtSettlementModel.deleteMany({
    debtId: { $in: debts.map((debt) => debt._id) },
  });
  await DebtModel.deleteMany({ spaceId: { $in: spaceIds } });
  await TransactionModel.deleteMany({ spaceId: { $in: spaceIds } });
  await SpaceInvitationModel.deleteMany({ spaceId: { $in: spaceIds } });
  await NotificationModel.deleteMany({
    "data.spaceId": { $in: spaceIds.map(String) },
  });
  await SpaceModel.deleteMany({ _id: { $in: spaceIds } });
}

async function main() {
  await connectDatabase();
  console.log("Connected to MongoDB");

  const user = await resolveUser();
  const ownerId = user._id;

  console.log(`Target user: ${user.name} <${user.email}> (${ownerId})`);

  await clearDemoData(ownerId);

  if (RESET_ONLY) {
    await invalidateDashboardCache([String(ownerId)]);
    console.log("Demo data removed.");
    return;
  }

  // ── Spaces ────────────────────────────────────────────────────────────────
  const member = {
    userId: ownerId,
    email: user.email,
    name: user.name || "Ledg User",
    username: user.username ?? null,
    role: "owner" as const,
    joinedAt: new Date(),
  };

  const spaces = new Map<SpaceKey, InstanceType<typeof SpaceModel>>();
  for (const def of DEMO_SPACES) {
    const space = await SpaceModel.create({
      ownerId,
      name: def.name,
      type: def.type,
      monthlyBudget: def.monthlyBudget,
      isShared: false,
      members: [member],
      status: "active",
    });
    spaces.set(def.key, space);
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  const now = new Date();
  const { y, m } = zonedParts(now);
  const monthStart = zonedBoundary(y, m, 1);
  const previousMonthStart = zonedBoundary(y, m - 1, 1);
  const previousMonthEnd = new Date(monthStart.getTime() - 1);
  const lastYearStart = zonedBoundary(y - 1, m, 1);
  const lastYearEnd = zonedBoundary(y - 1, m + 1, 1);

  const currentMonthAt = (fraction: number) =>
    new Date(
      monthStart.getTime() +
        (now.getTime() - monthStart.getTime()) * fraction
    );

  const previousMonthAt = (fraction: number) =>
    new Date(
      previousMonthStart.getTime() +
        (previousMonthEnd.getTime() - previousMonthStart.getTime()) * fraction
    );

  const lastYearAt = (fraction: number) =>
    new Date(
      lastYearStart.getTime() +
        (lastYearEnd.getTime() - lastYearStart.getTime()) * fraction
    );

  const createdBy = {
    userId: ownerId,
    name: user.name || "Ledg User",
    email: user.email,
    username: user.username ?? null,
  };

  const toDoc = (seed: TxSeed, date: Date) => ({
    spaceId: spaces.get(seed.space)!._id,
    type: seed.type,
    category: seed.category,
    amount: seed.amount,
    note: seed.note,
    date,
    paymentMethod: seed.paymentMethod,
    source: "manual" as const,
    createdBy,
  });

  const docs = [
    ...CURRENT_MONTH_TX.map((seed) =>
      toDoc(seed, currentMonthAt(seed.at))
    ),
    ...PREVIOUS_MONTH_TX.map((seed) =>
      toDoc(seed, previousMonthAt(seed.at))
    ),
    ...LAST_YEAR_TX.map((seed) => toDoc(seed, lastYearAt(seed.at))),
    // A couple dated right now so the "Today" period is populated too.
    toDoc(
      {
        space: "household",
        type: "expense",
        category: "Food",
        amount: 350,
        note: "Morning coffee",
        paymentMethod: "wallet",
        at: 1,
      },
      now
    ),
    toDoc(
      {
        space: "hustle",
        type: "income",
        category: "Freelance",
        amount: 2500,
        note: "Quick fix",
        paymentMethod: "wallet",
        at: 1,
      },
      now
    ),
  ];

  await TransactionModel.insertMany(docs);

  // ── Dues (uses the real service so ledger + settlements stay consistent) ──
  let openCount = 0;
  let partialCount = 0;
  let settledCount = 0;

  for (const [index, seed] of DUE_SEEDS.entries()) {
    const space = spaces.get(seed.space)!;
    const created = await createDue(ownerId, {
      spaceId: String(space._id),
      direction: seed.direction,
      counterparty: { name: seed.name },
      principal: seed.principal,
      date: addDays(now, -20 - index * 3),
      dueDate: addDays(now, seed.dueInDays),
      note: seed.note,
      paymentMethod: "cash",
    });

    if (seed.settled > 0) {
      await settleDue(ownerId, created.id, {
        amount: seed.settled,
        date: addDays(now, -5),
        paymentMethod: "bank_transfer",
        note: seed.settled >= seed.principal ? "Full settlement" : "Part payment",
      });
      if (seed.settled >= seed.principal) settledCount += 1;
      else partialCount += 1;
    } else {
      openCount += 1;
    }
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  const household = spaces.get("household")!;
  await NotificationModel.create([
    {
      userId: ownerId,
      type: "member_joined",
      title: "New Member Joined",
      message: `Anita Gurung joined "${household.name}"`,
      read: false,
      data: {
        spaceId: String(household._id),
        spaceName: household.name,
        actorName: "Anita Gurung",
      },
    },
    {
      userId: ownerId,
      type: "transaction_added",
      title: "New Transaction Added",
      message: `Anita Gurung added an expense of 1250 in "${household.name}"`,
      read: false,
      data: {
        spaceId: String(household._id),
        spaceName: household.name,
        actorName: "Anita Gurung",
        transactionType: "expense",
        amount: 1250,
      },
    },
    {
      userId: ownerId,
      type: "space_invite",
      title: "New Space Invitation",
      message: `Sita Sharma invited you to join "Office Lunch Club"`,
      read: true,
      data: { spaceName: "Office Lunch Club", actorName: "Sita Sharma" },
    },
  ]);

  // ── Outgoing invitation ───────────────────────────────────────────────────
  await SpaceInvitationModel.findOneAndUpdate(
    { spaceId: household._id, inviteeEmail: "sita@example.com" },
    {
      $set: {
        spaceName: household.name,
        inviterId: ownerId,
        inviterName: user.name || "Ledg User",
        inviterUsername: user.username ?? null,
        inviterEmail: user.email,
        inviteeEmail: "sita@example.com",
        role: "member",
        status: "pending",
        tokenHash: null,
        expiresAt: addDays(now, 7),
      },
    },
    { upsert: true }
  );

  await invalidateDashboardCache([String(ownerId)]);

  console.log("");
  console.log("Seed complete");
  console.log(`  spaces:       ${DEMO_SPACES.map((s) => s.name).join(", ")}`);
  console.log(`  transactions: ${docs.length}`);
  console.log(
    `  dues:         ${DUE_SEEDS.length} (${openCount} open, ${partialCount} partially settled, ${settledCount} settled)`
  );
  console.log("  notifications: 3");
  console.log("  invitations:  1 pending (sita@example.com)");
  console.log("");
  console.log("Open the app and check Dashboard, Analytics, Dues and Notifications.");
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
