import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VoiceDraft, VoiceSpace } from "../../shared/index.js";
import { normalizeDraft, parseWithRules } from "./rules.js";

const TODAY = "2026-11-18";

const SPACES: VoiceSpace[] = [
  { id: "64b7f0c2a1b2c3d4e5f60001", name: "Personal" },
  { id: "64b7f0c2a1b2c3d4e5f60002", name: "Pokhara Trip" },
];

function turn(
  transcript: string,
  draft: VoiceDraft | null = null,
  spaces: VoiceSpace[] = SPACES
) {
  return parseWithRules({ transcript, draft, history: [], spaces });
}

describe("voice rule parser", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T06:00:00Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses a fully specified expense", () => {
    const result = turn("I bought samosa for 20 rupee cash today");

    expect(result.draft).toMatchObject({
      type: "expense",
      amount: 20,
      category: "Food",
      note: "samosa",
      paymentMethod: "cash",
      date: TODAY,
    });
    expect(result.ready).toBe(true);
    expect(result.intent).toBe("draft");
    expect(result.reply).toContain("Food for 20 rupees");
  });

  it("asks for the payment method when it is missing", () => {
    const result = turn("samosa for 50");

    expect(result.draft.amount).toBe(50);
    expect(result.draft.category).toBe("Food");
    expect(result.missing).toEqual(["paymentMethod"]);
    expect(result.intent).toBe("ask");
    expect(result.reply).toContain("cash, card, or wallet");
  });

  it("merges a short payment answer into the draft", () => {
    const first = turn("samosa for 50");
    const second = turn("cash", first.draft);

    expect(second.draft.paymentMethod).toBe("cash");
    expect(second.draft.amount).toBe(50);
    expect(second.ready).toBe(true);
    expect(second.intent).toBe("draft");
  });

  it("confirms only when the draft was already complete", () => {
    const first = turn("samosa for 50 cash");
    const confirmed = turn("yes", first.draft);

    expect(confirmed.intent).toBe("confirm");
    expect(confirmed.ready).toBe(true);
    expect(confirmed.draft).toEqual(first.draft);
  });

  it("does not confirm an incomplete draft", () => {
    const first = turn("samosa");
    const result = turn("yes", first.draft);

    expect(result.intent).toBe("ask");
    expect(result.ready).toBe(false);
  });

  it("keeps an incomplete draft intact when the user agrees", () => {
    const first = turn("samosa");
    const result = turn("of course", first.draft);

    expect(result.intent).toBe("ask");
    expect(result.draft).toEqual(first.draft);
  });

  it("does not create a draft from a bare agreement", () => {
    const result = turn("of course");

    expect(result.intent).toBe("chat");
    expect(result.draft.category).toBeNull();
  });

  it("confirms 'of course' without changing the category", () => {
    const first = turn("samosa for 20 cash");
    const confirmed = turn("of course", first.draft);

    expect(confirmed.intent).toBe("confirm");
    expect(confirmed.draft).toEqual(first.draft);
    expect(confirmed.draft.category).toBe("Food");
  });

  it("confirms a longer 'of course, add it'", () => {
    const first = turn("samosa for 20 cash");
    const confirmed = turn("of course, add it", first.draft);

    expect(confirmed.intent).toBe("confirm");
    expect(confirmed.draft).toEqual(first.draft);
  });

  it("treats 'yes, make it 60' as a correction, not a confirmation", () => {
    const first = turn("samosa for 20 cash");
    const corrected = turn("yes, make it 60", first.draft);

    expect(corrected.intent).not.toBe("confirm");
    expect(corrected.draft.amount).toBe(60);
    expect(corrected.draft.category).toBe("Food");
    expect(corrected.draft.note).toBe("samosa");
  });

  it("keeps the note when the correction words change", () => {
    const first = turn("samosa for 20 cash");
    const corrected = turn("change it to 60", first.draft);

    expect(corrected.draft.amount).toBe(60);
    expect(corrected.draft.note).toBe("samosa");
  });

  it("still reads a course fee as Education", () => {
    const result = turn("course fee 500 cash");

    expect(result.draft.category).toBe("Education");
    expect(result.draft.amount).toBe(500);
  });

  it("cancels on a negative answer", () => {
    const first = turn("samosa for 50 cash");
    const cancelled = turn("no", first.draft);

    expect(cancelled.intent).toBe("cancel");
  });

  it("prefers the price over the quantity", () => {
    expect(turn("two samosa for 20 rupees").draft.amount).toBe(20);
    expect(turn("paid 500 for 2 shirts").draft.amount).toBe(500);
  });

  it("does not treat a bare quantity as a price", () => {
    const result = turn("I bought one samosa");

    expect(result.draft.amount).toBeNull();
    expect(result.intent).toBe("ask");
  });

  it("parses income and its category", () => {
    const result = turn("salary 50000 received today");

    expect(result.draft).toMatchObject({
      type: "income",
      amount: 50000,
      category: "Salary",
      date: TODAY,
    });
  });

  it("parses rent received as rental income", () => {
    const result = turn("rent received 15000 cash");

    expect(result.draft.type).toBe("income");
    expect(result.draft.category).toBe("Rental");
  });

  it("recognises local merchants and wallets", () => {
    const groceries = turn("bhatbhateni 1200 cash");
    const ride = turn("pathao 180 wallet");
    const momo = turn("esewa 250 for momo");

    expect(groceries.draft.category).toBe("Groceries");
    expect(ride.draft.category).toBe("Transport");
    expect(ride.draft.paymentMethod).toBe("wallet");
    expect(momo.draft.category).toBe("Food");
    expect(momo.draft.paymentMethod).toBe("wallet");
  });

  it("parses numeric shorthand", () => {
    expect(turn("1.5k rent cash").draft.amount).toBe(1500);
    expect(turn("lunch twenty five cash").draft.amount).toBe(25);
    expect(turn("fifty rupees for chai cash").draft.amount).toBe(50);
  });

  it("parses grouped thousands with commas", () => {
    expect(turn("spent 1,200 on groceries cash").draft.amount).toBe(1200);
    expect(turn("paid 2,500 for rent by bank").draft.amount).toBe(2500);
    expect(turn("paid 1,20,000 for rent cash").draft.amount).toBe(120000);
    expect(turn("groceries 1,200 cash").draft.note).toBe("groceries");
  });

  it("parses relative dates", () => {
    expect(turn("groceries 500 cash yesterday").draft.date).toBe("2026-11-17");
    expect(turn("groceries 500 cash 2 days ago").draft.date).toBe("2026-11-16");
    expect(turn("groceries 500 cash last friday").draft.date).toBe("2026-11-13");
    expect(turn("groceries 500 cash on the 15th").draft.date).toBe("2026-11-15");
  });

  it("updates an existing draft without losing other fields", () => {
    const first = turn("samosa for 50");
    const corrected = turn("actually 60", first.draft);

    expect(corrected.draft.amount).toBe(60);
    expect(corrected.draft.category).toBe("Food");
    expect(corrected.ready).toBe(false);
  });

  it("matches a named space and keeps it out of the note", () => {
    const result = turn("taxi 300 cash in pokhara trip");

    expect(result.draft.spaceId).toBe(SPACES[1].id);
    expect(result.draft.note).toBe("taxi");
    expect(result.draft.category).toBe("Transport");
  });

  it("falls back to asking when nothing usable was said", () => {
    const result = turn("hmm okay so anyway");

    expect(result.draft.amount).toBeNull();
    expect(result.intent).toBe("ask");
    expect(result.ready).toBe(false);
  });

  it("treats greetings and meta questions as chat, not transactions", () => {
    const listening = turn("are you listening to me");
    const greeting = turn("hello");
    const capability = turn("what can you do");

    expect(listening.intent).toBe("chat");
    expect(listening.draft.note).toBe("");
    expect(listening.draft.amount).toBeNull();
    expect(listening.reply).toContain("listening");

    expect(greeting.intent).toBe("chat");
    expect(greeting.draft.note).toBe("");

    expect(capability.intent).toBe("chat");
    expect(capability.draft.note).toBe("");
  });

  it("does not let small talk overwrite an existing draft", () => {
    const first = turn("samosa for 50 cash");
    const chatter = turn("are you listening to me", first.draft);

    expect(chatter.intent).toBe("chat");
    expect(chatter.draft).toEqual(first.draft);
    expect(chatter.draft.note).toBe("samosa");
  });

  it("accepts a longer agreement as confirmation", () => {
    const first = turn("samosa for 50 cash");
    const confirmed = turn("yes please add it", first.draft);

    expect(confirmed.intent).toBe("confirm");
    expect(confirmed.draft).toEqual(first.draft);
  });

  it("treats a correction as new information, not a confirmation", () => {
    const first = turn("samosa for 50 cash");
    const corrected = turn("yes make it 60", first.draft);

    expect(corrected.intent).not.toBe("confirm");
    expect(corrected.draft.amount).toBe(60);
  });

  it("still parses a greeting attached to a real transaction", () => {
    const result = turn("hi samosa 50 cash");

    expect(result.intent).toBe("draft");
    expect(result.draft.amount).toBe(50);
    expect(result.draft.category).toBe("Food");
  });
});

describe("normalizeDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T06:00:00Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("drops unknown categories, future dates and unknown spaces", () => {
    const normalized = normalizeDraft(
      {
        type: "expense",
        amount: 120.456,
        category: "Not a real category",
        note: "x",
        date: "2027-01-01",
        paymentMethod: "cash",
        spaceId: "64b7f0c2a1b2c3d4e5f60009",
      },
      SPACES
    );

    expect(normalized.category).toBeNull();
    expect(normalized.date).toBe(TODAY);
    expect(normalized.spaceId).toBeNull();
    expect(normalized.amount).toBe(120.46);
  });

  it("rejects a category that belongs to the other transaction type", () => {
    const normalized = normalizeDraft(
      {
        type: "income",
        amount: 100,
        category: "Food",
        note: "",
        date: TODAY,
        paymentMethod: null,
        spaceId: null,
      },
      SPACES
    );

    expect(normalized.category).toBeNull();
  });
});
