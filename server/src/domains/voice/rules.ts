import {
  missingVoiceSlots,
  VOICE_CATEGORY_KEYWORDS,
  type PaymentMethod,
  type TransactionType,
  type VoiceDraft,
  type VoiceSpace,
  type VoiceTurnInput,
  type VoiceTurnResult,
} from "../../shared/index.js";

/**
 * Deterministic voice parser.
 *
 * This is deliberately dependency-free and side-effect-free: it is the floor
 * the feature stands on when Gemini is unavailable, rate-limited, or simply
 * not configured. It is also faster and more predictable for short answers
 * such as "cash" or "yes".
 */

const TIME_ZONE = "Asia/Kathmandu";

const INCOME_CATEGORIES = new Set([
  "Salary",
  "Business",
  "Freelance",
  "Investment",
  "Gift",
  "Refund",
  "Interest",
  "Rental",
]);

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const SMALL_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SCALES: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  lakh: 100_000,
  lakhs: 100_000,
  million: 1_000_000,
  crore: 10_000_000,
};

const AFFIRMATIVE = new Set([
  "yes",
  "yeah",
  "yep",
  "yup",
  "sure",
  "ok",
  "okay",
  "add",
  "add it",
  "add this",
  "add that",
  "confirm",
  "confirmed",
  "do it",
  "go ahead",
  "correct",
  "right",
  "sounds good",
  "yes please",
  "thats right",
  "that's right",
  "create it",
]);

const NEGATIVE = new Set([
  "no",
  "nope",
  "nah",
  "cancel",
  "stop",
  "never mind",
  "nevermind",
  "dont",
  "don't",
  "do not",
  "not now",
  "wrong",
  "hold on",
  "wait",
]);

/** Longer agreements ("yes please add it", "ok save this") still mean yes. */
const CONFIRM_PHRASE =
  /^(yes|yeah|yep|yup|ok|okay|sure|correct|right)\b.*\b(add|save|confirm|do it|go ahead)\b/;

const GREETING_RE = /^(hi|hello|hey|namaste|yo)\b/;
const LISTENING_CHECK_RE =
  /\b(are you (there|listening|hearing)|can you hear me|do you hear me|you there|is this working|are you awake)\b/;
const CAPABILITY_RE =
  /\b(what can you do|who are you|what are you|how do i use|what should i say|help me)\b/;
const THANKS_RE = /\b(thanks|thank you|dhanyabad)\b/;
const TEST_RE = /^(test|testing|mic test|check check)\b/;

/** Clauses that make the sentence about a different thing than spending. */
const EXPENSE_CUES =
  /(?<![a-z])(bought|buy|buying|purchased|purchase|paid|pay|paying|spent|spend|spending|cost|costs|recharge|topup|top up|bill|bills|gave|sent|donated)(?![a-z])/;

const INCOME_CUES =
  /(?<![a-z])(received|receive|salary|credited|earned|earn|income|refund|cashback|sold|sell|sales|bonus|interest|rent received|got paid|got salary|freelance payment)(?![a-z])/;

const AMOUNT_UNIT_AFTER =
  /^\s*(kg|kgs|kilo|kilos|gram|grams|g|litre|liter|litres|liters|ml|piece|pieces|pcs|pc|cup|cups|plate|plates|bottle|bottles|pack|packs|packet|packets|dozen|km|kms|meter|meters|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years|percent|%|am|pm|o'clock|oclock|st|nd|rd|th)(?![a-z])/;

const AMOUNT_STOP_AFTER =
  /^\s*(for|on|at|and|in|by|with|from|to|today|tomorrow|yesterday|tonight|now|received|credited|paid|spent|only|each|cash|card|bank|wallet|online|esewa|khalti|fonepay|upi|rupees?|rs|npr)(?![a-z])/;

const CURRENCY_AFTER = /^\s*(rs|rs\.|npr|rupees?|rupaye)(?![a-z])/;
const CURRENCY_BEFORE = /(rs|rs\.|npr|rupees?|rupaye)\s*$/;
const PRICE_CUE_BEFORE =
  /(for|at|cost|costs|price|worth|of|spent|paid|buy|bought|purchase|purchased|gave|sent|received|earned|salary|topup|top up|recharge)\s+$/;

const NOISE_WORDS = [
  "i've",
  "ive",
  "i",
  "we",
  "my",
  "our",
  "me",
  "please",
  "just",
  "also",
  "can",
  "could",
  "you",
  "add",
  "log",
  "record",
  "create",
  "note",
  "put",
  "make",
  "entry",
  "transaction",
  "bought",
  "buy",
  "buying",
  "purchased",
  "purchase",
  "paid",
  "pay",
  "paying",
  "spent",
  "spend",
  "spending",
  "cost",
  "costs",
  "gave",
  "give",
  "sent",
  "send",
  "received",
  "receive",
  "got",
  "get",
  "earned",
  "earn",
  "sold",
  "sell",
  "for",
  "on",
  "at",
  "of",
  "the",
  "a",
  "an",
  "to",
  "from",
  "by",
  "with",
  "in",
  "into",
  "rs",
  "rs.",
  "rupees",
  "rupee",
  "npr",
  "rupaye",
  "cash",
  "card",
  "credit",
  "debit",
  "bank",
  "transfer",
  "wallet",
  "online",
  "esewa",
  "e-sewa",
  "khalti",
  "fonepay",
  "imepay",
  "ime",
  "upi",
  "cheque",
  "check",
  "today",
  "tomorrow",
  "yesterday",
  "tonight",
  "morning",
  "afternoon",
  "evening",
  "night",
  "now",
  "last",
  "ago",
  "day",
  "days",
  "week",
  "weeks",
  "month",
  "months",
  "year",
  "years",
  "yes",
  "yeah",
  "yep",
  "yup",
  "sure",
  "ok",
  "okay",
  "confirm",
  "cancel",
  "stop",
  "wait",
  "it",
  "was",
  "were",
  "is",
  "are",
  "be",
  "been",
  "this",
  "that",
  "these",
  "those",
  "here",
  "there",
  ...WEEKDAYS,
  ...Object.keys(MONTHS),
];

const NOISE_RE = buildPhraseRegex(NOISE_WORDS, false);

interface AmountMatch {
  value: number;
  start: number;
  end: number;
}

interface DateMatch {
  date: string;
  label: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary regex for a phrasing, tolerant of punctuation removed upstream. */
function buildPhraseRegex(phrases: readonly string[], capture = true): RegExp {
  const sorted = [...phrases].sort((a, b) => b.length - a.length).map(escapeRegex);
  const body = sorted.join("|");
  return new RegExp(`(?<![a-z])(${body})(?![a-z])`, capture ? "i" : "gi");
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s.:/,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";

  return `${read("year")}-${read("month")}-${read("day")}`;
}

function todayKey(): string {
  return dayKey(new Date());
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function safeDate(year: number, month: number, day: number): string {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const clamped = Math.min(day, lastDay);
  return `${year}-${pad(month + 1)}-${pad(clamped)}`;
}

/** "1.5k" / "50 thousand" → numeric strings before word-number parsing. */
function expandNumericUnits(text: string): string {
  return text.replace(
    /(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lakhs|million|crore)(?![a-z])/g,
    (_match, rawNumber: string, unit: string) => {
      const multipliers: Record<string, number> = {
        k: 1000,
        thousand: 1000,
        lakh: 100_000,
        lakhs: 100_000,
        million: 1_000_000,
        crore: 10_000_000,
      };
      return String(Number(rawNumber) * (multipliers[unit] ?? 1));
    }
  );
}

function parseNumberRun(tokens: readonly string[]): number | null {
  let total = 0;
  let current = 0;
  let matched = false;

  for (const token of tokens) {
    if (token === "and") continue;
    if (token === "a" || token === "an") {
      current = current || 1;
      matched = true;
      continue;
    }
    if (SMALL_NUMBERS[token] != null) {
      current += SMALL_NUMBERS[token];
      matched = true;
      continue;
    }
    if (TENS[token] != null) {
      current += TENS[token];
      matched = true;
      continue;
    }
    if (SCALES[token] != null) {
      const scale = SCALES[token];
      if (scale === 100) {
        current = (current || 1) * 100;
      } else {
        total += (current || 1) * scale;
        current = 0;
      }
      matched = true;
    }
  }

  return matched ? total + current : null;
}

/** Rewrites number words ("twenty five") into digits so one regex sees all. */
function normalizeNumberWords(text: string): string {
  const tokens = text.split(" ");
  const output: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index] ?? "";
    const startsRun =
      SMALL_NUMBERS[token] != null ||
      TENS[token] != null ||
      SCALES[token] != null ||
      ((token === "a" || token === "an") && SCALES[tokens[index + 1] ?? ""] != null);

    if (!startsRun) {
      output.push(token);
      index += 1;
      continue;
    }

    const run: string[] = [];
    while (index < tokens.length) {
      const next = tokens[index] ?? "";
      if (
        SMALL_NUMBERS[next] != null ||
        TENS[next] != null ||
        SCALES[next] != null ||
        next === "and" ||
        ((next === "a" || next === "an") && SCALES[tokens[index + 1] ?? ""] != null)
      ) {
        run.push(next);
        index += 1;
      } else {
        break;
      }
    }

    const value = parseNumberRun(run);
    if (value == null) {
      output.push(...run);
    } else {
      output.push(String(value));
    }
  }

  return output.join(" ");
}

function extractAmount(text: string): AmountMatch | null {
  // Accept grouped digits too: Web Speech often transcribes "1,200" or the
  // Nepali/Indian grouping "1,20,000". Plain decimals still match.
  const matches = [...text.matchAll(/\d+(?:,\d{2,3})*(?:\.\d{1,2})?/g)];
  if (matches.length === 0) return null;

  const numbers = matches.map((match) => {
    const start = match.index ?? 0;
    return {
      value: Number(match[0].replace(/,/g, "")),
      start,
      end: start + match[0].length,
    };
  });

  let best: (AmountMatch & { score: number }) | null = null;
  let fallback: AmountMatch | null = null;

  for (const candidate of numbers) {
    const before = text.slice(Math.max(0, candidate.start - 24), candidate.start);
    const after = text.slice(candidate.end, candidate.end + 24);

    // Ordinals ("on the 15th"), times ("10:30", "8 pm"), and years are dates.
    if (/^\s*(st|nd|rd|th)(?![a-z])/.test(after)) continue;
    if (/:\d{0,2}$/.test(before) || /^:\d{2}/.test(after)) continue;
    if (/(?<![a-z])(am|pm|oclock|o'clock)\b/.test(after)) continue;
    if (
      candidate.value >= 1900 &&
      candidate.value <= 2100 &&
      new RegExp(`(${Object.keys(MONTHS).join("|")})`).test(after + before)
    ) {
      continue;
    }

    const hasUnit = AMOUNT_UNIT_AFTER.test(after);
    const followedByWord = /^\s*[a-z]/.test(after) && !AMOUNT_STOP_AFTER.test(after);
    const hasCurrency = CURRENCY_AFTER.test(after) || CURRENCY_BEFORE.test(before);

    let score = 0;
    if (hasCurrency) score += 6;
    if (PRICE_CUE_BEFORE.test(before) && !followedByWord) score += 4;
    if (candidate.start > 0 && candidate.end === text.length) score += 1;
    if (followedByWord) score -= 3;
    if (hasUnit) score -= 4;

    const scored = { ...candidate, score };
    if (!best || scored.score > best.score) best = scored;

    // A bare quantity ("two samosa") is not a price. Only keep a fallback when
    // the number is not glued to an item noun, something marks it as money, or
    // it is large enough that a quantity reading is implausible ("1.5k rent").
    if (!hasUnit && (!followedByWord || hasCurrency || candidate.value >= 100)) {
      fallback = candidate;
    }
  }

  // Prefer a positively-scored number; otherwise use the last plausible one so
  // "samosa 50" still works. Explicit units are never treated as money.
  if (best && best.score > 0) return best;
  return fallback;
}

function extractPayment(text: string): PaymentMethod | null {
  if (
    /(?<![a-z])(esewa|e-sewa|khalti|fonepay|ime pay|imepay|upi|wallet|online)(?![a-z])/.test(
      text
    )
  ) {
    return "wallet";
  }
  if (/(?<![a-z])(credit card|debit card|visa|mastercard|card)(?![a-z])/.test(text)) {
    return "card";
  }
  if (/(?<![a-z])(cash)(?![a-z])/.test(text)) {
    return "cash";
  }
  if (
    /(?<![a-z])(bank transfer|mobile banking|ibft|bank|cheque|check)(?![a-z])/.test(text)
  ) {
    return "bank_transfer";
  }
  return null;
}

function detectType(text: string): TransactionType | null {
  const expense = EXPENSE_CUES.exec(text);
  const income = INCOME_CUES.exec(text);

  if (expense && income) {
    return (income.index ?? Number.MAX_SAFE_INTEGER) <
      (expense.index ?? Number.MAX_SAFE_INTEGER)
      ? "income"
      : "expense";
  }
  if (income) return "income";
  if (expense) return "expense";
  return null;
}

function extractDate(text: string, today: string): DateMatch | null {
  if (/(day before yesterday|two days ago)/.test(text)) {
    return { date: addDays(today, -2), label: "2 days ago" };
  }
  if (/(?<![a-z])(yesterday|last night)(?![a-z])/.test(text)) {
    return { date: addDays(today, -1), label: "yesterday" };
  }
  if (
    /(?<![a-z])(today|tonight|this morning|this afternoon|this evening|just now|right now)(?![a-z])/.test(
      text
    )
  ) {
    return { date: today, label: "today" };
  }

  const daysAgo = text.match(/(\d+)\s+days?\s+ago/);
  if (daysAgo) {
    const days = Number(daysAgo[1]);
    return { date: addDays(today, -days), label: `${days} days ago` };
  }

  if (/(?<![a-z])(a week ago|last week)(?![a-z])/.test(text)) {
    return { date: addDays(today, -7), label: "last week" };
  }
  if (/(?<![a-z])last month(?![a-z])/.test(text)) {
    return { date: addDays(today, -30), label: "last month" };
  }

  const weekday = text.match(
    /(?<![a-z])(?:last|on|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?![a-z])/
  );
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[1]);
    const todayIndex = new Date(`${today}T12:00:00Z`).getUTCDay();
    const diff = (todayIndex - target + 7) % 7;
    return {
      date: addDays(today, -diff),
      label: diff === 0 ? "today" : `last ${weekday[1]}`,
    };
  }

  const monthFirst = text.match(
    /(?<![a-z])(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?![a-z])/
  );
  if (monthFirst) {
    const month = MONTHS[monthFirst[1]];
    const day = Number(monthFirst[2]);
    const year = Number(today.slice(0, 4));
    const candidate = safeDate(year, month, day);
    const date = candidate > today ? safeDate(year - 1, month, day) : candidate;
    return { date, label: `on ${day} ${MONTH_LABELS[month]}` };
  }

  const dayFirst = text.match(
    /(?<![a-z])(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?![a-z])/
  );
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = MONTHS[dayFirst[2]];
    const year = Number(today.slice(0, 4));
    const candidate = safeDate(year, month, day);
    const date = candidate > today ? safeDate(year - 1, month, day) : candidate;
    return { date, label: `on ${day} ${MONTH_LABELS[month]}` };
  }

  const ordinal = text.match(
    /(?<![a-z])(?:on\s+the\s+)?(\d{1,2})(?:st|nd|rd|th)(?![a-z])/
  );
  if (ordinal) {
    const day = Number(ordinal[1]);
    const anchor = new Date(`${today}T12:00:00Z`);
    let year = anchor.getUTCFullYear();
    let month = anchor.getUTCMonth();
    if (day > anchor.getUTCDate()) {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
    }
    return { date: safeDate(year, month, day), label: `on the ${day}th` };
  }

  return null;
}

function containsPhrase(text: string, phrase: string): boolean {
  return buildPhraseRegex([phrase]).test(text);
}

function findCategory(
  text: string,
  type: TransactionType
): { category: string; keyword: string } | null {
  let best: { category: string; keyword: string } | null = null;

  for (const [category, keywords] of Object.entries(VOICE_CATEGORY_KEYWORDS)) {
    const isIncomeCategory = INCOME_CATEGORIES.has(category);
    if (type === "income" && !isIncomeCategory) continue;
    if (type === "expense" && isIncomeCategory) continue;

    for (const keyword of keywords) {
      if (keyword.length <= (best?.keyword.length ?? 0)) continue;
      if (containsPhrase(text, keyword)) {
        best = { category, keyword };
      }
    }
  }

  return best;
}

function findSpace(text: string, spaces: readonly VoiceSpace[]): VoiceSpace | null {
  let best: VoiceSpace | null = null;
  for (const space of spaces) {
    const name = space.name.trim().toLowerCase();
    if (!name) continue;
    if (containsPhrase(text, name) && name.length > (best?.name.length ?? 0)) {
      best = space;
    }
  }
  return best;
}

function cleanNote(
  text: string,
  amount: AmountMatch | null,
  spaceName: string | null
): string {
  let note = amount ? `${text.slice(0, amount.start)} ${text.slice(amount.end)}` : text;

  // Strip the matched space name before the generic noise pass, otherwise
  // short words inside it (e.g. "my" in "My Trip") disappear first and the
  // remaining fragment survives.
  if (spaceName) {
    note = note.replace(buildPhraseRegex([spaceName.trim().toLowerCase()], false), " ");
  }

  note = note
    .replace(NOISE_RE, " ")
    .replace(/\b\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?\b/g, " ")
    .replace(/\b\d+(?:\.\d{1,2})?\b/g, " ")
    .replace(/\b\d+(?:st|nd|rd|th)\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:!?/-]+|[\s.,;:!?/-]+$/g, "")
    .trim();

  return note.slice(0, 500);
}

function defaultDraft(today: string): VoiceDraft {
  return {
    type: "expense",
    amount: null,
    category: null,
    note: "",
    date: today,
    paymentMethod: null,
    spaceId: null,
  };
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function formatDateLabel(date: string, today: string): string {
  if (date === today) return "today";
  if (date === addDays(today, -1)) return "yesterday";

  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;

  return `on ${parsed.getUTCDate()} ${MONTH_LABELS[parsed.getUTCMonth()]}`;
}

function paymentSpoken(method: PaymentMethod): string {
  switch (method) {
    case "cash":
      return "cash";
    case "card":
      return "card";
    case "bank_transfer":
      return "bank transfer";
    case "wallet":
      return "wallet";
  }
}

function confirmationReply(draft: VoiceDraft, today: string): string {
  const category = draft.category ?? "Other";
  const amount = draft.amount ?? 0;
  const payment = draft.paymentMethod ? paymentSpoken(draft.paymentMethod) : "cash";
  const date = formatDateLabel(draft.date ?? today, today);
  return `${category} for ${formatAmount(amount)} rupees, ${payment}, ${date}. Add it?`;
}

export function detectTypeCue(transcript: string): TransactionType | null {
  return detectType(normalize(transcript));
}

export function isBareAffirmative(transcript: string): boolean {
  return AFFIRMATIVE.has(normalize(transcript));
}

export function isBareNegative(transcript: string): boolean {
  return NEGATIVE.has(normalize(transcript));
}

/**
 * Short answers ("cash", "yesterday", "50") are cheaper and safer to resolve
 * deterministically than to round-trip through the model.
 */
export function isBareSlotAnswer(transcript: string): boolean {
  const text = normalize(transcript);
  if (AFFIRMATIVE.has(text) || NEGATIVE.has(text)) return true;
  if (/^\d+(?:\.\d{1,2})?$/.test(text)) return true;
  if (extractPayment(text)) return true;
  if (extractDate(text, todayKey())) return true;
  return false;
}

/**
 * Small talk is not a transaction. Without this guard, "are you listening?"
 * becomes an expense whose note is "listening".
 */
function chatReplyFor(text: string): string | null {
  if (LISTENING_CHECK_RE.test(text)) {
    return "Yes, I'm listening. What did you spend on?";
  }
  if (CAPABILITY_RE.test(text)) {
    return "I can log expenses and income. Try saying samosa for 50 cash.";
  }
  if (THANKS_RE.test(text)) {
    return "Anytime. Anything else?";
  }
  if (GREETING_RE.test(text)) {
    return "Hi. Tell me a transaction, like chai for 30 cash.";
  }
  if (TEST_RE.test(text)) {
    return "I'm here. Say something like samosa for 50 cash.";
  }
  if (
    text.split(" ").length >= 3 &&
    /\b(what|who|why|how|are|is|can|do|does|did)\b/.test(text)
  ) {
    return "I'm here to log transactions. Try: samosa for 50 cash.";
  }
  return null;
}

export function parseWithRules(input: VoiceTurnInput): VoiceTurnResult {
  const today = todayKey();
  const text = normalizeNumberWords(expandNumericUnits(normalize(input.transcript)));
  const previous = input.draft;
  const previousMissing = previous ? missingVoiceSlots(previous) : null;
  const previousReady = previousMissing != null && previousMissing.length === 0;

  const typeCue = detectType(text);
  const amountCue = extractAmount(text);
  const paymentCue = extractPayment(text);
  const dateCue = extractDate(text, today);
  const type = typeCue ?? previous?.type ?? "expense";
  const categoryCue = findCategory(text, type);
  const spaceCue = findSpace(text, input.spaces);
  const noteCue = cleanNote(text, amountCue, spaceCue?.name ?? null);

  // "Listening" and "hello" should never become transaction fields. Only the
  // explicit cues count as new information; note text alone is too weak.
  const hasExplicitInfo = Boolean(
    typeCue || amountCue || paymentCue || dateCue || categoryCue || spaceCue
  );
  const bareAffirmative = AFFIRMATIVE.has(text) || CONFIRM_PHRASE.test(text);
  const bareNegative = NEGATIVE.has(text) || /^(no|nope|nah)\b/.test(text);

  if (previous && previousReady && bareAffirmative && !hasExplicitInfo) {
    return {
      reply: "Adding it now.",
      intent: "confirm",
      draft: previous,
      missing: [],
      ready: true,
      confidence: 0.99,
      provider: "rules",
    };
  }

  if (previous && bareNegative) {
    return {
      reply: "Okay, cancelled.",
      intent: "cancel",
      draft: previous,
      missing: previousMissing ?? [],
      ready: previousReady,
      confidence: 0.99,
      provider: "rules",
    };
  }

  if (!hasExplicitInfo) {
    const chatReply = chatReplyFor(text);
    if (chatReply) {
      const draft = previous ?? defaultDraft(today);
      const missing = missingVoiceSlots(draft);
      return {
        reply: chatReply,
        intent: "chat",
        draft,
        missing,
        ready: missing.length === 0,
        confidence: 0.99,
        provider: "rules",
      };
    }
  }

  const draft: VoiceDraft = { ...(previous ?? defaultDraft(today)) };

  if (typeCue) {
    draft.type = typeCue;
    if (previous && previous.type !== typeCue && !categoryCue) {
      draft.category = null;
    }
  }
  if (amountCue) draft.amount = Math.round(amountCue.value * 100) / 100;
  if (paymentCue) draft.paymentMethod = paymentCue;
  if (dateCue) draft.date = dateCue.date;
  if (categoryCue) draft.category = categoryCue.category;
  if (spaceCue) draft.spaceId = spaceCue.id;
  if (noteCue) draft.note = noteCue;
  if (!draft.date) draft.date = today;

  const missing = missingVoiceSlots(draft);
  const ready = missing.length === 0;

  let reply: string;
  if (missing.includes("amount")) {
    const subject = draft.note && draft.note.length <= 40 ? ` for the ${draft.note}` : "";
    reply = `How much${subject}?`;
  } else if (missing.includes("paymentMethod")) {
    reply = "Was that cash, card, or wallet?";
  } else {
    reply = confirmationReply(draft, today);
  }

  const explicitSlots = [amountCue, paymentCue, dateCue, categoryCue].filter(
    Boolean
  ).length;
  const confidence = ready ? Math.min(0.98, 0.75 + explicitSlots * 0.05) : 0.5;

  return {
    reply,
    intent: ready ? "draft" : "ask",
    draft,
    missing,
    ready,
    confidence,
    provider: "rules",
  };
}

/**
 * Normalises anything the LLM produced. Categories outside the known list fall
 * back to Other, dates outside a sane window fall back to today, and unknown
 * spaces are dropped. `ready`/`missing` are always recomputed.
 */
export function normalizeDraft(
  draft: VoiceDraft,
  spaces: readonly VoiceSpace[],
  today = todayKey()
): VoiceDraft {
  const allowedSpace = spaces.some((space) => space.id === draft.spaceId);
  const categoryKnown =
    draft.category != null &&
    Object.prototype.hasOwnProperty.call(VOICE_CATEGORY_KEYWORDS, draft.category);
  const categoryMatchesType =
    categoryKnown &&
    (draft.type === "income"
      ? INCOME_CATEGORIES.has(draft.category as string)
      : !INCOME_CATEGORIES.has(draft.category as string));

  const minDate = addDays(today, -365);
  const maxDate = addDays(today, 1);
  const dateIsSane = draft.date != null && draft.date >= minDate && draft.date <= maxDate;

  return {
    type: draft.type,
    amount:
      draft.amount != null && Number.isFinite(draft.amount) && draft.amount > 0
        ? Math.round(draft.amount * 100) / 100
        : null,
    category: categoryMatchesType ? draft.category : null,
    note: draft.note.slice(0, 500),
    date: dateIsSane ? draft.date : today,
    paymentMethod: draft.paymentMethod,
    spaceId: allowedSpace ? draft.spaceId : null,
  };
}

export { confirmationReply, normalize, todayKey };
