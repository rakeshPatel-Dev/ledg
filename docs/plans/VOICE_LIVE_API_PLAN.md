# Ledg AI — Gemini Live API & Voice Tools Plan

Status: proposed, not implemented.
Date: 20 Nov 2026.
Supersedes the recognition and single-purpose parsing parts of
[`VOICE_COMMAND_PLAN.md`](./VOICE_COMMAND_PLAN.md). The one-shot interaction,
draft card, confirmation rule, and Edge TTS work stay.

---

## Why the current flow still cuts words and mishears commands

The remaining problems are mostly the browser API, not the parser.

1. **Chrome's Web Speech is a black box.** It has no custom vocabulary, no
   access to the user's categories, spaces, or payment methods, and no way to
   bias toward "add it", "save", "bKash", "samosa", or a space name. "Add it"
   becoming "edit" and "save" becoming "safe" are classic homophone errors from
   a general-purpose recogniser.
2. **Android Chrome does not honour `continuous = true`.** It ends the session
   after a phrase. Our `onend` restart keeps the turn alive, but every restart
   is a short gap where audio is not heard. Slow restarts still look like a
   finished thought, especially on the second and third conversation.
3. **Restarts lose acoustic context.** Even with the current accumulation fix,
   the recogniser starts a new language-model context for each phrase. It cannot
   use the first half of the sentence to interpret the second half.
4. **No confidence or timing per word.** We cannot distinguish "I am sure the
   user said save" from "this might be safe", so the only safe move is to show
   the transcript and let the user correct it.
5. **The parser is downstream of the damage.** The rules and Gemini text parser
   can only work with the words the browser gives them. If the browser says
   "edit it", the parser has no audio evidence to recover "add it".

The Live API fixes the root problem: it receives the raw audio continuously,
keeps one session context, and can call typed tools directly. The transcript is
a side effect for the UI, not the only input to the parser.

---

## What was verified against the configured Gemini key

These were live probes using `server/.env.local`, not assumptions from docs.
Probe scripts were temporary and are not committed.

- `POST /v1beta/auth_tokens` issued a single-use ephemeral token.
- `wss://.../BidiGenerateContentConstrained?access_token=...` connected to
  `gemini-3.8-live`.
- The session returned raw PCM audio at `audio/pcm;rate=24000` and input/output
  transcriptions.
- With an `update_transaction_draft` function declaration, the spoken-style text
  "Samosa for 50 cash" produced exactly:
  `{ type: "expense", amount: 50, note: "Samosa", paymentMethod: "cash" }`.
- Returning the tool response with `scheduling: "SILENT"` and a "do not speak"
  system instruction produced **zero audio bytes** for that turn. This is the
  key to keeping the current silent one-shot flow.
- Gemini's pricing page lists Free Tier "Free of charge" input and output for
  Gemini 3.8 Live. The exact RPM/RPD limits are only shown in AI Studio, so the
  plan still includes quota guards and a fallback.
- `liveConnectConstraints` (locking the model/system prompt/tools into the
  token) returned `Unknown name` on both `v1beta` and `v1alpha`. The token is
  still short-lived and single-use, but the client will send the setup config.
  Revisit constraints when Google ships them.

---

## Target architecture

```
VoiceSheet
  └─ useVoiceSession
       ├─ POST /voice/live-token          (authenticated, rate-limited)
       │     └─ Google auth_tokens        (uses: 1, 60s start, 10m session)
       ├─ LiveClient (WebSocket, direct to Google)
       │     ├─ MicStream                16 kHz mono PCM, AudioWorklet
       │     ├─ LivePlayer               24 kHz PCM (phase 4, off by default)
       │     └─ ToolRouter
       │           ├─ draft tools        local state only
       │           ├─ read tools         existing REST API
       │           └─ proposal tools     confirmation card, never a write
       └─ fallback: Web Speech + POST /voice/turn
                    recorded clip + POST /voice/audio
                    typing
```

### Why client-to-server and not a server WebSocket proxy

- Google recommends ephemeral tokens for browser clients.
- Audio never touches the Ledg server, so we do not pay bandwidth for every
  microphone frame and do not hold long-lived sockets on a serverless host.
- The token endpoint is the only new server surface. It is easy to rate-limit
  and disable.
- The client still authenticates every REST call it makes for tool results, so
  the server remains the authority for space access.

If the app later deploys on a host that must terminate all WebSockets, add a
proxy behind the same `LiveTransport` interface. The rest of the client does
not change.

### Server: `POST /voice/live-token`

- Auth required. Key by `req.userId`.
- New limiter `voiceLiveTokenLimiter`: 20 requests / 15 minutes / user.
- Request Google with:
  - `uses: 1`
  - `expireTime`: now + 10 minutes
  - `newSessionExpireTime`: now + 60 seconds
- Respond `{ token, model, expiresAt }` with `Cache-Control: no-store`.
- Return `503` when `GEMINI_API_KEY` is missing, `VOICE_LIVE=off`, or Google
  fails. The client treats `503` as "use the fallback", not as a fatal error.
- Never log the token or the API key.

### Client: Live transport

- New module `client/src/lib/voice/live/` split into:
  - `client.ts` — WebSocket lifecycle, setup, event parsing, retry/close.
  - `protocol.ts` — Zod schemas for server messages and tool args.
  - `audio-input.ts` — `getUserMedia`, AudioWorklet, downsample, base64.
  - `audio-output.ts` — 24 kHz PCM scheduler (phase 4).
  - `tools.ts` — tool declarations, validation, dispatch.
- `client/public/voice/pcm-worklet.js` — a small processor that posts mono
  Float32 frames. No third-party dependency.
- `use-voice-session.ts` gets a new internal mode with four values: `"live"`,
  `"speech"`, `"record"`, and `"off"`. The public prop stays the user's intent;
  the active mode can downgrade on failure.
- `voice-sheet.tsx` gets a `connecting` phase/status, a "Live" indicator only
  when useful, and updated privacy copy. A slow first connection (2–3s) shows
  "Connecting…" rather than an error; the fallback starts only after the
  connection actually fails.

### Setup message that actually worked

Use `generationConfig.responseModalities`. A top-level `responseModalities`
field was rejected by the raw WebSocket API.

```json
{
  "setup": {
    "model": "models/gemini-3.8-live",
    "generationConfig": { "responseModalities": ["AUDIO"] },
    "systemInstruction": { "parts": [{ "text": "..." }] },
    "tools": [{ "functionDeclarations": [] }],
    "inputAudioTranscription": {
      "customVocabulary": ["Ledg", "bKash", "Nagad", "samosa", "momo", "Pathao"]
    },
    "outputAudioTranscription": {}
  }
}
```

### Output policy for phase 1

Live is the **ears and tool caller**, not the voice.

- All transaction turns are silent: system instruction says do not speak, and
  tool responses use `scheduling: "SILENT"`. The probe produced zero audio.
- Missing-slot questions and "Added." stay on the existing Edge TTS path, so
  the assistant keeps the same natural female voice the user just approved.
- If the model produces audio anyway, the client suppresses it unless the
  session is in a state that expects speech.
- Phase 4 can A/B native Live audio behind `VITE_VOICE_LIVE_AUDIO=on`; it is not
  part of the first migration.

This avoids a voice regression and keeps the one-shot promise: no greeting, no
recap, just the draft card.

---

## Tool catalog

Tools are how the model acts. They are not a second REST API and they are not
allowed to write directly. Every write is a **proposal** followed by a user tap.

### Draft tools (local, safe)

| Tool                       | Args                                                                                        | Behaviour                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `update_transaction_draft` | `type?`, `amount?`, `category?`, `note?`, `date?`, `paymentMethod?`, `spaceName?`, `clear?` | Merge only supplied fields into the current draft. Validate with `voiceDraftSchema`. |
| `clear_transaction_draft`  | none                                                                                        | Clear the draft and any pending proposal.                                            |
| `request_save`             | none                                                                                        | Put the sheet in review and highlight Save. Never creates anything.                  |

Rules:

- `spaceName` is resolved against the spaces the client already loaded. The
  model never supplies an ObjectId.
- `date` is `YYYY-MM-DD`; the system prompt includes today's date and the
  current draft. Invalid dates are ignored, not guessed.
- `clear` is a list of fields to unset, for "remove the payment method".
- The field-wise merge mirrors `mergeModelDraft` in
  `server/src/domains/voice/gemini.ts`.

### Read tools (existing API)

| Tool                   | Args                                                                                      | Source                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `list_spaces`          | none                                                                                      | `useSpaces()` / `GET /spaces`                                   |
| `find_transactions`    | `spaceName?`, `type?`, `category?`, `dateFrom?`, `dateTo?`, `keyword?`, `limit?` (max 20) | `GET /spaces/:id/transactions` or `GET /transactions/all`       |
| `get_transaction`      | `transactionId`                                                                           | `GET /spaces/:id/transactions/:id`                              |
| `get_spending_summary` | `spaceName?`, `period?` (`today`/`month`/`3months`/`year`/`all`), `dateFrom?`, `dateTo?`  | `GET /spaces/:id/analytics/summary` or `GET /analytics/summary` |

Read results are compact: id, type, amount, category, note, date, space name,
payment method. No emails, member lists, or internal fields.

### Proposal tools (write intent, no write)

| Tool                         | Args                                                                                            | UI confirmation                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `propose_update_transaction` | `transactionId`, `amount?`, `category?`, `note?`, `date?`, `paymentMethod?`, `spaceName?`       | Old → new card; Confirm calls `PUT`.              |
| `propose_delete_transaction` | `transactionId`, `reason?`                                                                      | Destructive card; Confirm calls `DELETE`.         |
| `propose_create_space`       | `name`, `type` (`personal`/`family`/`trip`/`business`), `monthlyBudget?`, `inviteeIdentifiers?` | Space card; Confirm calls `POST /spaces`.         |
| `propose_update_space`       | `spaceName`, `name?`, `monthlyBudget?`                                                          | Old → new card; Confirm calls `PUT /spaces/:id`.  |
| `propose_delete_space`       | `spaceName`                                                                                     | Requires typing the space name, matching the API. |

Later, after the first four are stable: `list_space_members`,
`propose_invite_member`, `get_dues`, `propose_settle_due`.

### Confirmation policy

- **Create transaction:** draft card + Save. The model cannot create. A spoken
  "add it" can call `request_save`, which only highlights the button.
- **Update/delete transaction:** proposal card + Confirm. Never a direct write.
- **Create/update space:** proposal card + Confirm.
- **Delete space:** typed name confirmation, exactly like the current API.
- **Shared space:** the card shows the space name and "Visible to N members".
- **No partial writes.** If validation fails, the card is not shown and the
  model gets an error result to ask again.

This is the line between "tool calling" and "an AI that can delete your data
because it misheard you". The model is allowed to propose anything; the user
remains the only actor that writes.

---

## Session state machine

```
open
  → request token + mic permission in parallel
  → connect WebSocket
  → setupComplete
  → listening (mic frames flow, VAD is server-side)
  → user pauses (~1.1–1.3s)
  → toolCall(s)
      → dispatch, merge draft, send SILENT toolResponse
      → draft ready?  → review (mic paused, Save visible)
      → slot missing? → speak question (Edge TTS) → listening
  → tap Save → existing create path → "Added." → done
close / save / error → stop mic, close AudioContext, close socket
```

### End-of-turn

- Use server VAD with `silenceDurationMs: 1100` and `prefixPaddingMs: 300`.
  This is close to the current `SILENCE_MS` and avoids the Android restart
  handshake entirely.
- Optional hybrid: a client-side quiet timer sends `audioStreamEnd` after
  1.25s. Keep it as a tuning knob, not the default, because an early flush
  cuts mid-sentence pauses.
- `MAX_LISTEN_MS`-style cap: stop sending audio after 20s of a single turn and
  ask the user to try again.
- If `turnComplete` arrives with no tool call:
  - use the output transcription as a chat reply, speak it via Edge TTS;
  - if there is a draft and the transcript is a bare affirmative, call the
    same local `request_save` path;
  - otherwise show the text and keep listening.

### Live transcript

- `inputTranscription.text` fragments update the existing `interim` bubble.
- On tool call or `turnComplete`, append the accumulated transcript as the user
  message.
- If the transcript is empty but a tool call arrived, build the user message
  from the draft ("Samosa · ₹50 · cash") rather than showing nothing.
- Do not let transcript text drive the draft. Tool args are the source of truth;
  transcript is display only.

### Corrections

- The model sees the previous draft in the tool response. "Make it 60" should
  send only `{ amount: 60 }`.
- The client merges, re-validates, and updates the card.
- A correction never creates. The user must still tap Save.
- "Cancel" / "never mind" clears the draft and closes the review state.
- The review state intentionally pauses the mic to protect the draft. Change
  the current "or say a correction" copy to "Tap the mic to correct" so the UI
  does not promise a voice path that is closed.

### Save interruption

- On Save, invalidate any in-flight turn token, stop the mic, cancel Edge TTS,
  and close the Live socket after the create succeeds.
- If the create fails, keep the draft and show the error. The Live socket may be
  closed; "Try again" falls back to the normal path.

---

## Quick fixes that stay useful even with Live

These are small and worth doing in the same branch:

1. Add a **phrase-level** homophone normaliser for bare commands only:
   `edit it` → `add it`, `safe` / `safe it` → `save` / `save it`.
   Never rewrite these words inside a note. This helps the fallback path and
   typed input.
2. Increase the Web Speech quiet window from 1.1s to 1.3s on Android, or make
   it configurable. The current 1.1s is still close to a natural pause.
3. Keep the transcript visible long enough to correct; do not auto-submit on
   the first final result.
4. Add domain terms to the text prompt and the Live custom vocabulary:
   categories, payment methods, space names, "bKash", "Nagad", "eSewa",
   "Khalti", "Pathao", "samosa", "momo", "chai".
5. Add a `voice.live` debug flag that logs event names and timings, never audio
   or full transcripts.

---

## Security, privacy, and cost

### Security

- The long-lived `GEMINI_API_KEY` never leaves the server.
- Ephemeral token: single use, 60s to start, 10m maximum, no-store response.
- Tool args are validated with Zod. Unknown ids, space names, and dates are
  rejected before they touch state.
- Server authorization remains authoritative for every read/write tool. The
  model cannot bypass `assertSpaceAccess`.
- The client never sends a tool result that claims a write happened. Proposal
  tools return `needs_confirmation` and stop.
- Prompt injection is contained: the worst a malicious utterance can do is
  propose an action; the user still has to tap Confirm.

### Privacy

- Free-tier Gemini may use content to improve Google's products. Update the
  voice sheet disclosure to say audio is streamed to Google's Gemini Live API
  and that Ledg does not store it.
- Add a deployment-level `VOICE_LIVE=off` and a user-facing mute/typing path.
- Do not log raw audio or full transcripts. Log event names, tool names,
  durations, and error codes.

### Cost and quota

- Free tier is the target. Exact RPM/RPD is checked in AI Studio, not published
  in the docs.
- Token limiter caps session starts at 20/15min/user.
- One session per sheet open; close on save, close, idle timeout, or error.
- Session cap 10 minutes, well under the 15-minute audio-only limit.
- Fallback to Web Speech on any 429/5xx/token failure, so a quota exhaustion
  degrades instead of breaking.
- Monitor: token failures, setup time, tool-call success, fallback rate, average
  session seconds, and 429s.

---

## Implementation phases

### Phase 0 — decisions and guardrails (0.5 day)

- Land this plan and link it from `VOICE_COMMAND_PLAN.md`.
- Add `VOICE_LIVE` / `VITE_VOICE_LIVE` flags and env examples.
- Add the bare-command homophone normaliser and the Android quiet-window knob.
- Add the `voiceLiveTokenLimiter` skeleton and tests.
- No user-visible change yet.

### Phase 1 — Live transport + draft tool (2–3 days)

Server:

- `server/src/domains/voice/live-token.ts` — Google token request, timeout,
  error mapping.
- `voice/controller.ts` — `liveToken` handler.
- `voice/routes.ts` — `POST /live-token`.
- `common/middlewares/rate-limit.ts` — limiter.
- Tests: success, missing key, Google 429/500, disabled flag, no-store header.

Client:

- `client/src/lib/voice/live/protocol.ts` — Zod event/tool schemas.
- `client/src/lib/voice/live/client.ts` — connect, setup, send audio, parse
  events, close.
- `client/src/lib/voice/live/audio-input.ts` + `pcm-worklet.js` — mic to
  16 kHz PCM.
- `client/src/lib/voice/live/tools.ts` — `update_transaction_draft`,
  `clear_transaction_draft`, `request_save`.
- `client/src/lib/api.ts` — `voice.liveToken()`.
- `use-voice-session.ts` — live mode, transcript, draft merge, fallback.
- `voice-sheet.tsx` — connecting state, disclosure.

Definition of done:

- On Android Chrome, a full sentence lands in the transcript and draft without
  the restart gap.
- "Add it" / "save" cannot turn into a category change or a create without a
  tap.
- Live failure falls back to Web Speech within ~2s.
- Save still requires a tap.
- No key in client code or network responses.
- Existing 90 server tests, typecheck, lint, and client build pass.

### Phase 2 — one-shot quality and Android QA (1–2 days)

- Missing-slot prompts, cancellation, corrections, save interruption.
- Tune VAD, prefix padding, and custom vocabulary with real device recordings.
- Handle mic permission denial, page background, network switch, socket close,
  and token expiry.
- Add a recorded-fixture test for a full turn + tool call + turn complete.
- Manual Android Chrome matrix (below).

### Phase 3 — CRUD tools (2–3 days)

- Read tools: `list_spaces`, `find_transactions`, `get_transaction`,
  `get_spending_summary`.
- Proposal tools + `ActionCard` UI: update/delete transaction, create/update/
  delete space.
- Space name resolution and shared-space warnings.
- Tests for every proposal path; assert no direct write from a tool call.
- Update docs and voice examples.

### Phase 4 — optional native audio and more tools (2+ days)

- A/B Live native audio for questions/chat behind `VITE_VOICE_LIVE_AUDIO`.
- Barge-in, `interrupted` handling, 24 kHz playback.
- Session resumption for long sessions.
- Dues, members, invitations, recurring spend.

---

## Test plan

### Automated

- Token endpoint: auth, limiter, 503 on missing key, 503 on Google error,
  no-store, no token in logs.
- Protocol schemas: setup, transcription, tool call, turn complete, close.
- Tool dispatch: merge, clear, invalid amount/date/space, unknown tool, duplicate
  tool call, tool call after socket close.
- Confirmation gate: every `propose_*` returns `needs_confirmation`; no API
  mutation function is called from `tools.ts`.
- Fallback: token 503 → Web Speech; socket close before setup → Web Speech;
  close mid-turn → keep transcript and offer retry.
- Existing server suite must stay green.

### Manual, Android Chrome (physical device)

1. First open: permission prompt, mic live, full 10-word sentence, draft appears.
2. Second and third conversations in the same app session: no first-word cut.
3. "Samosa for 50 cash" → Food, ₹50, cash, Save.
4. "Samosa for 50" → amount captured, payment question, tap Cash, Save.
5. "Add it" / "Save it" with a ready draft → Save highlighted, no create until tap.
6. "Actually 60" after a draft → only amount changes.
7. "Delete the last transaction" → proposal card, Confirm, toast.
8. "Create a trip space called Goa" → proposal card, Confirm.
9. "Show my spending this month" → summary card, spoken summary if enabled.
10. Mid-sentence pause of 0.8s → sentence continues.
11. Screen lock / app background → mic stops; return shows retry, not a stuck orb.
12. Wi-Fi → 4G switch mid-turn → fallback or retry without losing the draft.
13. Deny mic permission → typing fallback, no crash.
14. `VOICE_LIVE=off` → legacy flow, same draft and Save behaviour.
15. Simulated 429 / token failure → legacy flow within 2s.

---

## Rollout

- Default `VOICE_LIVE=on` for development and the user's device; `off` is a
  one-variable kill switch.
- Client flag `VITE_VOICE_LIVE=off` forces the legacy path without a server
  deploy.
- Keep `/voice/turn`, `/voice/audio`, and `/voice/speak` in place. They are the
  fallback and the typed path.
- After two weeks, review fallback rate and tool-call success before making Live
  the only recognition path.

---

## Open questions

1. What are the actual free-tier RPM/RPD for `gemini-3.8-live` on this project?
   Check AI Studio before relying on it for daily use.
2. Does Live input transcription beat Chrome on Indian English and Nepglish
   names, or do we still need a correction pass? Test with real recordings.
3. Should writes be limited to the personal space in v1, with shared-space
   writes behind an extra confirmation? Recommendation: yes for delete, no for
   create/update if the card names the space.
4. Do we want Live's native voice for questions, or keep Edge Neerja? Plan says
   Edge for phase 1, A/B later.
5. When `liveConnectConstraints` ships, move the system prompt and tool
   declarations into the token so the client cannot alter them.
6. Do we need session resumption, or is a fresh session per sheet open enough?
   For one-shot entry, fresh is simpler.

---

## References

- Gemini Live API overview: https://ai.google.dev/gemini-api/docs/live
- WebSocket setup: https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket
- Ephemeral tokens: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
- Live capabilities (VAD, transcription, native audio):
  https://ai.google.dev/gemini-api/docs/live-api/capabilities
- Live tools: https://ai.google.dev/gemini-api/docs/live-api/tools
- Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits