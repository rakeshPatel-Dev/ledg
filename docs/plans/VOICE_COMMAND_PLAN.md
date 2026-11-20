# Ledg AI — Voice Commands Design & Implementation Plan

> **Next step:** Browser speech recognition is being replaced by Gemini Live
> API for realtime audio understanding and tool calling. See
> [`VOICE_LIVE_API_PLAN.md`](./VOICE_LIVE_API_PLAN.md). The one-shot flow, draft
> card, confirmation rule, and Edge TTS behavior in this document still apply.

## Overview

Ledg gets **Ledg AI**, a voice entry flow: the user long-presses the **+** button, talks naturally, and the assistant builds a transaction draft — asking a follow-up only when something important is missing. The user confirms on the draft card, and the transaction is created through the existing transaction service.

The experience is **one-shot first**: the mic opens immediately, the transcript appears live, and the sheet parses the whole thought when the user pauses or taps done. A draft card is the confirmation UI; speech is reserved for a missing slot and the short success line. There is no spoken greeting and no spoken recap before the card.

**Example**

```
Long-press +        → haptic, voice sheet opens, mic already live
"Samosa for 50"     → live transcript
(1.1s pause)        → one voice turn
Draft card           → Food · ₹50 · cash needed
"Cash" / tap Cash    → draft card updates
Tap Save             → created, short "Added."
```

A fully specified utterance goes straight to a ready draft card in one call.

---

## Locked Decisions

| Decision           | Choice                                                      |
| ------------------ | ----------------------------------------------------------- |
| Language (v1)      | English only (`en-IN`, fallback `en-US`)                    |
| Scope (v1)         | Create transactions only                                    |
| Interaction        | One-shot capture + draft review                             |
| Confirm policy     | Always confirm before creating                              |
| Assistant voice    | Speaks only slot questions and "Added.", with a mute toggle |
| Cloud AI           | Google Gemini API free tier, server-side only               |
| Without a key      | Deterministic rule parser keeps the feature working         |
| Transaction source | New `"voice"` value on `TRANSACTION_SOURCES`                |
| Conversation state | Stateless server; the client owns draft + recent history    |

---

## Current Status

Updated 20 Nov 2026.

**Built and verified**

- Long-press +, voice sheet, orb, mute toggle, and text fallback.
- Direction A flow: mic opens on sheet open with no spoken greeting, transcript is live, a pause or tap finishes the thought, and the draft card is the confirmation UI. Speech is used only for a missing slot and the short "Added."
- Continuous Web Speech recognition: completed segments accumulate across browser restarts, pending interim words are kept, and Android's restart handshake pauses the quiet countdown instead of submitting only the first word or two. The turn ends after a 1.1s quiet window or a tap.
- Confirmation guard: a pure agreement ("of course", "yes", "add it") can never change the draft. Rules and Gemini both pin the previous draft, so "of course" cannot become Education. A correction such as "make it 60" keeps the note and updates only the amount.
- Web Speech recognition with on-device pack preference, plus the recorded-clip fallback for browsers that block the remote recogniser.
- Rules parser covering 28 utterances: amounts, categories, dates, income, chat, confirmation variants, negative variants, and corrections.
- Gemini text and audio turns, live-tested against the configured key (a synthesized clip transcribed and parsed correctly).
- Stateless `POST /voice/turn` and `POST /voice/audio`, per-user rate limiting, and creation through the existing transaction service with `source: "voice"`.
- `POST /voice/speak` with Microsoft Edge neural TTS: a warm female `en-IN-NeerjaNeural` voice, an in-process 120-clip cache, startup warming for the fixed prompts, a 1.2s client timeout, and automatic `speechSynthesis` fallback. No key and no billing.
- Fast path: a fully specified rules utterance returns without a Gemini call.
- Discoverability: mic badge on the + button and a **Talk instead** shortcut in the add form.

**Remaining**

- Real-device QA: Android Chrome chime/restart behaviour, remote TTS playback and autoplay policy, iOS Safari auto-restart, desktop, Bluetooth/noisy microphones.
- Cold-start TTS latency: the first uncached line uses the device voice by design; verify the cached second line sounds consistent.
- Daily quota cap; optional transcript cache.
- Settings preference for voice on/off and default mute (mute is currently per-device `localStorage`).
- Voice analytics: create count, draft-edit rate, confirmation rate, abandonment.
- First-run coach mark (the + badge and form shortcut are the current hint).
- Nepali/Hinglish, extra intents, and on-device Whisper remain post-v1.

---

## Goals

1. Create an expense or income in under 10 seconds without typing.
2. Infer amount, type, category, date, payment method, note and space where possible.
3. Ask at most **one** clarifying question per turn.
4. Never create a transaction without an explicit confirmation.
5. Degrade gracefully: no mic, no network, no AI key, or exhausted quota must not dead-end the user.
6. Keep the existing transaction form as the source of truth for editing.

## Non-Goals (v1)

- Real-time streaming audio (Gemini Live / WebSocket).
- Nepali or Hinglish speech.
- Voice queries, dues, spaces, analytics, deletion.
- Wake word ("Hey Ledg").
- Storing raw audio.

---

## Architecture

```
┌──────────────────────────── client ────────────────────────────┐
│ Long-press +  →  VoiceSheet                                    │
│                    │                                           │
│   SpeechRecognition│ (Web Speech API, en-IN)                   │
│                    ▼                                           │
│   transcript ──► POST /api/v1/voice/turn                       │
│                    │  { transcript, draft, history, spaces }   │
│                    ▼                                           │
│   reply/draft ◄── { reply, intent, draft, missing, ready }     │
│                    │                                           │
│   speechSynthesis ◄┘  (or mute)                                │
│                    │                                           │
│   confirm ──► POST /spaces/:id/transactions (existing)         │
└────────────────────────────────────────────────────────────────┘

server:
  /voice/turn
    → rules parser (always)
    → Gemini parser (when configured + useful)
    → validation / normalisation
    → reply + merged draft
```

Why rules first: instant, free, deterministic, testable, and a safety net when the free tier is unavailable. Gemini handles unusual phrasing, mixed slot answers, and better note/category extraction.

---

## Conversation Contract

Defined in `client/src/shared/voice/index.ts`, copied to the server by `sync-shared`.

```ts
export type VoiceDraft = {
  type: "expense" | "income";
  amount: number | null;
  category: string | null;
  note: string;
  date: string | null; // YYYY-MM-DD, Asia/Kathmandu
  paymentMethod: "cash" | "card" | "bank_transfer" | "wallet" | null;
  spaceId: string | null;
};

export type VoiceTurnInput = {
  transcript: string;
  draft: VoiceDraft | null;
  history: { role: "user" | "assistant"; text: string }[]; // max 12
  spaces: { id: string; name: string }[]; // max 50
};

export type VoiceTurnResult = {
  reply: string;
  intent: "draft" | "ask" | "confirm" | "cancel" | "chat";
  draft: VoiceDraft;
  missing: ("amount" | "paymentMethod")[];
  ready: boolean;
  confidence: number; // 0..1
  provider?: "rules" | "gemini";
};

export type VoiceAudioTurnInput = {
  audio: string; // base64 WAV, max ~10s
  mimeType: "audio/wav" | "audio/mpeg" | ...;
  draft: VoiceDraft | null;
  history: { role: "user" | "assistant"; text: string }[];
  spaces: { id: string; name: string }[];
};

export type VoiceAudioTurnResult = {
  transcript: string; // empty when the clip had no usable words
  result: VoiceTurnResult;
};
```

Server rules:

- `ready` and `missing` are **recomputed server-side**, never trusted from the model.
- `intent: "confirm"` is only valid when the previous draft was complete and the utterance is a pure agreement ("yes", "of course", "add it"). For a pure agreement the previous draft is returned unchanged, even if the model proposed edits.
- Every other turn is a new draft or a question; a correction ("make it 60") keeps unrelated fields such as the note.
- `intent: "cancel"` on a negative utterance.
- `intent: "chat"` for greetings and meta questions ("are you listening?", "what can you do?"). Chat never changes the draft.
- A model response that fails Zod validation falls back to the rule result.

### Intent semantics at the client

| Intent    | Client behaviour                                                    |
| --------- | ------------------------------------------------------------------- |
| `ask`     | Show the missing-slot control, speak the one question, listen again |
| `draft`   | Show/update the draft card; stop the mic and wait for Save          |
| `confirm` | Create from the previous draft immediately, announce success        |
| `cancel`  | Stop the session                                                    |
| `chat`    | Answer, keep the existing draft, listen again                       |

The final create is gated by a deterministic yes/no check on the client as well. The model proposes; code decides.

---

## Slot Policy

| Slot           | Source                              | If missing                               |
| -------------- | ----------------------------------- | ---------------------------------------- |
| Type           | verbs, income cues, default expense | default expense                          |
| Amount         | number + price heuristics           | **ask**                                  |
| Payment method | cash/card/esewa/khalti/bank cues    | **ask** ("cash, card, or wallet?")       |
| Category       | alias keyword map, then Gemini      | fall back to `Other`, never ask          |
| Date           | today/yesterday/weekday/relative    | default today                            |
| Note           | cleaned item phrase                 | empty                                    |
| Space          | matched space name                  | default personal space, else first space |

Amount heuristics must resolve "2 samosa for 20" to **20**, not 2. Currency-adjacent and "for X" numbers outrank quantities followed by item nouns. Confirmation is the final safety net.

---

## Server Design

New domain: `server/src/domains/voice/`

| File             | Responsibility                                              |
| ---------------- | ----------------------------------------------------------- |
| `routes.ts`      | `POST /turn` and `POST /audio`, auth + per-user rate limit  |
| `controller.ts`  | Validate input, call service, return envelope               |
| `validator.ts`   | Zod parsing of the turn and recording requests              |
| `service.ts`     | Rules + Gemini orchestration, normalisation, reply fallback |
| `rules.ts`       | Pure deterministic parser (no I/O)                          |
| `gemini.ts`      | Text/audio `generateContent`, timeout, JSON parse, fallback |
| `prompt.ts`      | System prompt + schema instructions                         |
| `rules.test.ts`  | Parser unit tests                                           |
| `gemini.test.ts` | Audio transcription + fallback tests                        |

Mounting: `router.use("/voice", voiceRoutes)` in `server/src/routes.ts`.

Configuration:

```
GEMINI_API_KEY=...        # optional; absent → rules only
GEMINI_MODEL=gemini-2.5-flash
```

`validateEnv()` does **not** require the key. The feature is enabled when present.

Rate limiting: `authenticate` runs first, then a limiter keyed by `userId` (40 turns / 15 min, shared by text and audio). A daily cap can follow once usage is known. Identical normalized transcripts may be cached in Upstash for 24h later.

### Audio fallback

Some browsers cannot use Web Speech at all: Brave blocks the remote recogniser, and Linux builds often have no local language pack. For those, the client records a short clip with `MediaRecorder` and posts it to `POST /voice/audio`:

- The client downmixes to 16 kHz mono WAV in the browser, so no server transcoder is needed and the upload stays around 32 KB per second.
- A small energy VAD stops after ~1.2s of silence, gives up after ~4.5s without speech, and hard-caps the clip at 10s.
- One Gemini request both transcribes and parses the clip (`inlineData`). Splitting it into two calls would double the free-tier request count for no gain.
- The fallback only runs when the browser recogniser is missing or fails with `network` / `service-not-allowed` / `language-not-supported`. Chrome, Edge, Firefox and Safari keep speech on-device.
- Without `GEMINI_API_KEY`, `/voice/audio` returns 503 and the sheet switches to typing.

---

## Shared Category Knowledge

`client/src/lib/categories.ts` holds icons and is client-only. The parser needs the category names and aliases, so add:

`client/src/shared/voice/categories.ts`

```ts
export const VOICE_CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["samosa", "momo", "chiya", "tea", "lunch", "dinner", ...],
  Groceries: ["bhatbhateni", "big mart", "vegetables", "milk", ...],
  ...
};
```

Names must match the existing category list exactly. Icons remain in `client/src/lib/categories.ts`. Unioning the two lists into a single source is a follow-up refactor, not a blocker.

Payment aliases live in the server parser:

- `cash`, `in cash` → `cash`
- `card`, `credit card`, `debit card`, `visa` → `card`
- `bank`, `bank transfer`, `mobile banking`, `ibft`, `cheque` → `bank_transfer`
- `wallet`, `esewa`, `khalti`, `fonepay`, `ime pay`, `upi`, `online` → `wallet`

---

## Client Design

| File                                             | Responsibility                                       |
| ------------------------------------------------ | ---------------------------------------------------- |
| `client/src/lib/voice/speech.ts`                 | Recognition + TTS wrappers, feature detection        |
| `client/src/lib/voice/recorder.ts`               | MediaRecorder fallback, VAD, WAV encoding            |
| `client/src/lib/voice/use-voice-session.ts`      | One-shot capture + draft review state machine        |
| `client/src/components/voice/voice-provider.tsx` | Global open/close context                            |
| `client/src/components/voice/voice-sheet.tsx`    | Call UI, transcript, draft card, controls            |
| `client/src/components/voice/voice-orb.tsx`      | Animated mic orb + status rings                      |
| `client/src/lib/api.ts`                          | `voice.turn()`, `voice.audioTurn()`, `voice.speak()` |
| `client/src/lib/transaction-form.tsx`            | `openWithDraft()` handoff                            |
| `client/src/components/layout/bottom-nav.tsx`    | Long-press wiring                                    |

### State machine

```
idle → listening → thinking → review ──► saving → done
                       │          ├──► listening (missing slot / correction)
                       │          └──► error (retry / type instead)
                       └──► speaking (one question only) → listening
```

Rules:

- Opening the sheet clears the session and starts recognition after ~80ms. There is no greeting and no TTS before the mic.
- Recognition is continuous: final segments accumulate, `onend` restarts the session while the turn is open, and `no-speech` is not an error.
- A 1.1s window without new words ends the turn; tapping the orb ends it immediately. The 20s ceiling submits whatever was heard.
- A ready draft moves to `review` and the mic closes. Save is the only way to create unless the user speaks another turn (for example "of course").
- Speech is used only for a missing-slot question and the short "Added." A ready draft is never recited.
- Replies try the server's cached neural clip first. If a clip is not cached within 1.2s, the device voice takes over and the clip is cached for the next time that line is spoken. `VITE_VOICE_TTS=off` forces device-only speech.
- Stop recognition before speaking, or the assistant transcribes itself.
- Tapping the orb while speaking interrupts and listens immediately.
- If the sheet closes, abort recognition and cancel speech.
- If the recogniser reports `network` / `service-not-allowed` / `language-not-supported` and `MediaRecorder` exists, the session switches to the recorded-clip path and keeps the same flow. Text heard before the failure is submitted instead of discarded.
- Text input in the sheet uses the same `voice.turn` endpoint. Missing amount and payment method also have an inline input and payment chips.
- Mute persists in `localStorage` (`ledg.voice.muted`).

### Long press

- `pointerdown` starts a 450ms timer; `pointerup` before it keeps the current click behaviour.
- Timer fires → haptic, open voice sheet, suppress the following click.
- Cancel on pointer move > 10px, pointer leave, or pointer cancel.
- `contextmenu` prevented; `touch-action: none` on the button.
- Long press disabled on `/dues` (same button means "add due" there).

### Draft handoff

`openWithDraft(draft)` opens the existing transaction form pre-filled, so the user can change anything the parser got wrong. The voice sheet closes first. Creation from the voice sheet uses the same `useCreateTransaction` mutation with `source: "voice"`.

---

## Guardrails

1. **Explicit confirmation** before every create.
2. **Server-side validation** with the existing `transactionSchema`; the voice draft is never written directly.
3. **Amount sanity**: positive, capped at 10,000,000, two decimals.
4. **Date sanity**: within one year back and one day forward.
5. **Category whitelist**: unknown categories become `Other`.
6. **Space membership** is enforced by `createUserTransaction` (unchanged).
7. **No destructive actions** in v1.
8. **Transcript length** capped at 1,000 chars; history capped at 12 messages.
9. **No audio stored.** Web Speech audio stays inside the browser; fallback clips are forwarded to Gemini for transcription and are never written to disk.
10. **Privacy copy** in the sheet: voice text is processed by Google when Gemini is enabled.

---

## Privacy & Cost

- STT: browser Web Speech API — free, no key. Chrome sends audio to Google; the app never receives it. When the browser recogniser is unavailable, a short clip is sent to Gemini for transcription and is not stored.
- NLU: Gemini free tier. Send only the utterance/clip, current draft, category/space names and short history. Never balances or transaction history.
- Google's **free** tier may use inputs to improve their products. The paid tier does not. If that becomes unacceptable, switch the provider interface to Ollama or a paid key.
- TTS: Microsoft Edge's neural Read Aloud voices — free, no key, no billing. The default is the warm female `en-IN-NeerjaNeural` at a slightly calmer pace. Only the assistant's prompt text is sent, never amounts or balances. Clips are cached in memory on both sides; an uncached line takes ~0.3–1s, so the browser falls back to `speechSynthesis` after 1.2s and fixed prompts are warmed at startup. The service is unofficial, so any failure returns silence and the device voice covers it.
- Per-user rate limits and the deterministic fallback keep the free tier from becoming a dependency.

### Why this TTS provider

Checked 2026-11-20 against live catalogs:

| Provider              | Result                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Edge TTS              | **Chosen.** Free, no key, natural female `en-IN-NeerjaNeural`, ~0.3–1s uncached and instant on a cache hit. Unofficial, so the device voice is the fallback. |
| OpenRouter            | No free TTS. 477 models, 15 free, but the only free audio-output models are Lyria music. `fish-audio/*` and `heygen/*` IDs do not exist. |
| Fish Audio            | Free plan is personal-use only; API is pay-as-you-go.                                                                                    |
| HeyGen                | Voice is part of the avatar/video product, not a standalone TTS API.                                                                     |
| Gemini TTS            | Good quality, but the free tier allows only 10 clips per day — one conversation can exhaust it.                                          |
| Cloudflare Workers AI | MeloTTS deprecated 2026-11-20; Whisper remains useful for STT.                                                                           |
| Groq Orpheus          | $22 per 1M characters; not a free tier.                                                                                                  |
| NVIDIA NIM Chatterbox | Available, but needs a new NVIDIA account/key.                                                                                           |
| Kokoro/Piper          | Genuinely free and private, but adds a large model/runtime to the API host. A later option if hosted TTS becomes unacceptable.           |

---

## Build Phases

### Phase 1 — Voice loop spike

- `speech.ts`, provider, sheet, orb.
- Long-press +.
- Live transcript, TTS repeat-back.
- Test on a real phone (iOS Safari especially).

**Exit:** long-press opens the sheet, speech transcribes, assistant speaks, loop continues.

### Phase 2 — Vertical slice

- Shared contract + `voice` source.
- Rules parser + `/voice/turn`.
- Draft card, confirm, create, success state.
- Category aliases.
- Unit tests for ~20 utterances.

**Exit:** "samosa for 50" → asks payment → "cash" → confirm → transaction exists with `source: "voice"`.

### Phase 3 — Gemini

- Provider interface, prompt, JSON parsing, fallback.
- Env flag and quota-aware behaviour.
- Confirm that rules still win for bare yes/no/slot answers.

**Exit:** complex sentences parse correctly; removing the key changes nothing functionally.

### Phase 4 — Hardening

- Real-device testing (iOS/Android/desktop).
- Rate limits + daily cap.
- Error and empty states, mic-permission guidance.
- Analytics: voice create count, draft edit rate, confirmation rate, abandonment.
- Settings: voice on/off, mute default, privacy copy.

### Phase 5 — Later

- Nepali/Hinglish (likely Gemini audio or Groq Whisper).
- More intents: spend queries, dues, spaces, undo.
- On-device Whisper fallback.
- First-run discoverability hint.

---

## Testing

**Unit (server, no DB)**

- Amount: "2 samosa for 20", "paid 500 for 2 shirts", "1.5k", "twenty five rupees".
- Category: samosa → Food, bhatbhateni → Groceries, pathao → Transport, esewa → wallet.
- Date: today, yesterday, 2 days ago, last friday.
- Income: salary, refund, rent received.
- Conversation: "yes" with a complete draft → confirm; "no" → cancel; "cash" → fills payment; "actually 60" → updates amount.
- Invalid/empty: no amount → ask; nonsense → ask again.

**Manual**

- Mic permission denied.
- No speech / silence.
- Gemini 429 / timeout.
- Offline.
- Cached TTS clip (fast) versus cold clip (1.2s then device fallback).
- Screen reader labels and keyboard text fallback.
- iOS Safari auto-restart behaviour.

### Environment notes

- **Brave on Linux** blocks Google's remote speech service; recognition fails
  with `network`. The sheet now records a short clip and transcribes it through
  Gemini instead, so voice still works once `GEMINI_API_KEY` is set.
- `speechSynthesis` needs an installed system voice. On Arch:
  `sudo pacman -S speech-dispatcher espeak-ng`, then restart the browser.
- Spoken replies need no extra key: the server uses Edge's neural voices
  (`en-IN-NeerjaNeural` by default). Clips live in a 120-entry in-process cache,
  so a serverless deployment re-warms after a cold start. Set
  `VOICE_TTS_VOICE` to another Edge voice, `VOICE_TTS_PREWARM=false` to skip
  startup warming, `VOICE_TTS=off` to disable remote speech server-side, or
  `VITE_VOICE_TTS=off` to skip it in the client.
- Chromium 139+ can use an on-device language pack
  (`SpeechRecognition.available({ processLocally: true })`), but Brave/Linux
  builds may not ship one.

---

## Open Items

1. Daily quota cap value — decide after observing real usage.
2. Gemini audio adds one request per recorded turn (~32 tokens/second of audio). Watch the free-tier RPD after release; the 40-turn limiter already caps abuse.
3. Whether to persist the raw transcript in analytics (privacy trade-off).
4. Single source of truth for category names (shared data vs `lib/categories.ts`).
5. First-run discoverability treatment for long-press.
6. Nepali timeline.
