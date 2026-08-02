# DRILL.EXE — Spoken Backend-Concept Practice

**Date:** 2026-08-02
**Route:** `/drill`
**Status:** Approved, ready for implementation plan

## Purpose

A standalone page on ASHWATH.SYS where a visitor picks a difficulty level, gets a
random backend concept dealt to them slot-machine style, speaks about it against a
timer, and gets graded — in Ashwath's voice — by a dedicated AutoSage RAG agent.

It is a practice tool, not a chat. One request, one verdict, no follow-up conversation.

## Non-Goals

- No accounts, no server-side user records, no cross-visitor leaderboard.
- No multi-turn conversation with the grading agent.
- No live/streaming transcription. Batch only.
- No changes to the existing home-page sections beyond adding an entry point.

## User Flow

```
idle ──START──▶ spinning ──▶ armed ──RECORD──▶ recording ──▶ transcribing ──▶ grading ──▶ result ─┐
                                  │                                                                │
                                  └── mic denied ──▶ typing ──────────────────────────────────────┘
```

| State | Behaviour |
|---|---|
| `idle` | Level filter (ALL / BEGINNER / INTERMEDIATE / ADVANCED), duration picker (30/60/90/120/180s, default 90), START button. Displays streak and last score from localStorage. |
| `spinning` | Decoy titles flick immediately; `GET /api/v1/drill/concept` runs in parallel; the reel decelerates and lands on the real concept. Minimum 1.5s so it always feels deliberate; after 5s without a response it lands on a local fallback concept. |
| `armed` | Concept title, level badge, and 2–3 probe hints. The explicit RECORD button doubles as the user's thinking time. |
| `recording` | Countdown ring, live oscilloscope from an `AnalyserNode`, elapsed/remaining readout, STOP EARLY button. Auto-stops at the chosen duration. |
| `transcribing` | Terminal-style progress readout while the audio blob uploads and Deepgram responds. |
| `grading` | Rotating "thinking lines", following the pattern already used in `apps/web/src/lib/chat.ts`. |
| `result` | Four rubric gauges, overall score /100, verdict prose, `missed` bullets, `nextQuestion`, and a collapsible transcript with word count and WPM. GO AGAIN returns to `idle`. |
| `typing` | Fallback when the mic is denied or Deepgram is unavailable: a textarea feeding the same grading path. |

## Speech-to-Text: Deepgram, batch mode

**Decision: Deepgram pre-recorded API, not the Web Speech API.**

Rationale:

1. Chrome's `webkitSpeechRecognition` auto-stops after roughly 5–8 seconds of silence.
   A user pausing to think mid-answer ends the recognition session; restarting it in
   `onend` drops words across the seam. This alone disqualifies it for 30–180s monologues.
2. Firefox has no support at all; Safari's is inconsistent.
3. The transcript is *graded*. Mis-transcribed technical vocabulary produces unfair
   verdicts. Deepgram's `nova-3` supports keyterm prompting, which we seed from the
   concept's own title and tags plus a global backend glossary.

Cost is approximately half a cent per minute, making the available credit good for
tens of thousands of sessions. Batch (pre-recorded) mode keeps the API key server-side
with no temporary-token minting and no WebSocket, mirroring the existing AutoSage proxy.

Live feedback during recording comes from a Web Audio `AnalyserNode` oscilloscope, not
from interim speech-recognition text — it cannot be wrong, and it suits the terminal aesthetic.

## Architecture

### Server (`apps/server`)

The existing `index.ts` is 262 lines covering contact, chat, and memes. Three new routes
plus a Deepgram client would push it past 500, and the AutoSage call logic must now be
shared between chat and drill. The server is therefore split into modules:

```
apps/server/src/
  index.ts              app assembly, cors, listen
  routes/contact.ts
  routes/chat.ts
  routes/meme.ts
  routes/drill.ts
  lib/autosage.ts       callAgent(agentId, message) + response extraction  ← shared
  data/concepts.json
  data/memes.json
```

Elysia plugins compose via `.use()`, and the Eden `App` type export is preserved.

#### `GET /api/v1/drill/concept?level=&exclude=`

- `level`: `all` | `beginner` | `intermediate` | `advanced`
- `exclude`: comma-separated concept IDs the client has seen, capped at 50
- Filters by level, removes excluded IDs, returns a random pick.
- If filtering leaves nothing, the exclude list is ignored rather than returning empty.
- Response: `{ concept: { id, title, level, tags, probes } }`

#### `POST /api/v1/drill/transcribe`

- `multipart/form-data`: audio blob + concept ID.
- Forwards to Deepgram `nova-3` with `smart_format` and `punctuate`, and with keyterms
  built from the concept's title, its tags, and a global backend glossary.
- Guards: 5MB body cap, content-type allowlist, 30s timeout.
- Missing `DEEPGRAM_API_KEY` returns 503 with a message steering the user to the typing
  fallback, matching how the contact and chat routes already degrade.
- Response: `{ transcript, durationSec }`

#### `POST /api/v1/drill/grade`

- Body: `{ conceptId, conceptTitle, level, probes, durationSec, transcript }`
- One-shot call to the coach agent. Never sends `chat_id`; never returns one.
- Scores are clamped to 0–100 server-side regardless of what the model returns.
- If the model's JSON fails to parse, the raw prose is returned as the verdict with
  null scores, so the user always receives something.
- Response: `{ overall, scores: { correctness, depth, structure, signalToNoise }, verdict, missed[], nextQuestion }`

#### Rate limiting

Both `transcribe` and `grade` cost money per call and are publicly reachable. An
in-memory per-IP limiter (~20 requests/hour) guards against loops burning credit.

### Concept data

`apps/server/src/data/concepts.json`:

```json
{ "id": "c-idempotency",
  "title": "Idempotency in APIs",
  "level": "intermediate",
  "tags": ["api", "reliability", "http"],
  "probes": ["Why is PUT idempotent but POST isn't?",
             "How would you implement an idempotency key?"] }
```

Target 300+ concepts across HTTP/REST, auth, SQL/NoSQL, indexing, transactions,
caching, queues and messaging, distributed systems, concurrency, system design,
observability, security, infrastructure, testing, and performance.

`probes` serve two purposes: on-screen hints for the user, and grading context for the
agent so it knows what a complete answer covers.

### Frontend (`apps/web`)

```
app/drill/page.tsx                    server component: metadata + shell
components/drill/
  drill-shell.tsx                     slim client chrome
  drill-console.tsx                   the state machine
  level-select.tsx                    level filter + duration picker
  concept-slot.tsx                    slot-machine reveal
  record-stage.tsx                    countdown ring + scope + stop
  waveform.tsx                        AnalyserNode canvas
  verdict-card.tsx                    rubric gauges + verdict + transcript
lib/
  drill.ts                            API client
  drill-decoys.ts                     ~60 decoy titles for the reel
  drill-history.ts                    localStorage: streak, seen IDs, last 10 scores
  use-recorder.ts                     MediaRecorder + AnalyserNode hook
```

`drill-console.tsx` owns the state machine; every other component is presentational.

#### Chrome

`drill-shell.tsx` provides the custom cursor, a slim top bar (back link, clock, status),
and the `~` terminal hotkey. It deliberately omits the boot overlay, quest provider, cat
colony, edge crawler, and floating icons — ambient motion is hostile to someone
concentrating on speaking. A single cat appears on the results screen.

**Related fix:** `BootOverlay` currently has no persistence and replays on every mount,
so navigating back from `/drill` re-runs the full CRT boot. It will be gated on
`sessionStorage` to boot once per tab.

#### Recording

- `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })`
- `MediaRecorder` with `audio/webm;codecs=opus`, feature-detected via
  `MediaRecorder.isTypeSupported` with an `audio/mp4` fallback for Safari. Deepgram
  accepts both.
- The same stream feeds an `AnalyserNode` for the oscilloscope.
- Mic tracks are explicitly stopped on unmount and after recording so the browser's
  recording indicator does not stay lit.

#### Discoverability

- HUD process-list nav on the home page gains `099 drill` linking to `/drill`.
- The fake terminal gains a `drill` command that navigates there.

## The coach agent

Created by Ashwath in the AutoSage dashboard with the knowledge base attached; its UUID
goes into `AUTOSAGE_COACH_AGENT_ID`. The system prompt is authored as part of this work
and specifies:

- Ashwath's voice: blunt, funny, no feedback sandwich. Explicitly anti-sycophantic —
  a substanceless 90 seconds earns a low score and is told so plainly.
- Grading relative to the stated level: advanced concepts are held to a higher bar.
- Strict JSON output only, matching the `grade` response schema, with length caps so
  the UI cannot break.
- Explicit handling for empty, very short, and off-topic transcripts.
- **Injection defence:** the transcript is untrusted user speech. It is wrapped in hard
  delimiters with an instruction that its content is never a command. Scores are clamped
  server-side regardless of the model's output.

The existing chat agent is not reused: its system prompt mandates a `parts`/meme output
contract that would conflict with the rubric schema.

## Persistence

localStorage only:

- Current streak and last 10 scores.
- Seen concept IDs, sent as the `exclude` parameter so topics do not repeat.

Transcripts never leave the browser except for the single grading call, and are not
stored server-side.

## Error Handling

| Failure | Behaviour |
|---|---|
| Mic permission denied | Switch to `typing` state; same grading path. |
| `DEEPGRAM_API_KEY` unset | 503 with a message steering to the typing fallback. |
| Deepgram error or timeout | Offer retry, or switch to typing with the recording discarded. |
| Empty or near-empty transcript | Sent to the grader, which has explicit instructions for it. |
| Coach agent unreachable | Show the transcript plus an apologetic message; offer retry. |
| Coach agent returns unparseable JSON | Render the raw prose as the verdict with null scores. |
| Concept fetch slow (>5s) | Reel lands on a local fallback concept. |
| Rate limit exceeded | 429 with a message in voice. |

## Testing

The repository has no test setup. Scope is deliberately minimal:

- `bun test` covering the two pure server functions worth testing: concept
  filtering/exclusion, and score clamping with the JSON-parse fallback.
- Manual matrix: Chrome, Firefox, Safari; mic denied; network dropped mid-recording;
  empty answer; five-word answer; a prompt-injection attempt in the transcript.

No broader harness.

## Environment

New:

```
DEEPGRAM_API_KEY=
AUTOSAGE_COACH_AGENT_ID=
```

Reuses the existing `AUTOSAGE_BASE_URL` and `AUTOSAGE_API_KEY`. Both new variables are
optional at boot: the server warns and the affected route degrades, consistent with the
existing SMTP and chat behaviour.

## Build Order

1. Server module split, `lib/autosage.ts`, `concepts.json` with ~40 seed concepts, and
   the concept endpoint. Verifiable with curl.
2. Deepgram transcribe route and the rate limiter.
3. Coach agent system prompt and the grade route.
4. Frontend page, shell, state machine, recorder hook, waveform.
5. Verdict UI and localStorage history.
6. Fill `concepts.json` to 300+, write the decoy list, add HUD and terminal entry
   points, apply the boot-once fix.
