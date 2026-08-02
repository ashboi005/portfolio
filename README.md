# ASHWATH.SYS

> A portfolio that pretends to be a living operating system. Boot sequence, fake terminal, wandering pixel cats, hidden Sprite cans — the whole thing is themed as `ASHWATH.SYS v5.2.1`.

A Bun monorepo: a **Next.js 16** frontend styled as a boot-to-desktop terminal HUD, backed by a lean **Elysia** API whose one real job is emailing contact-form submissions. All site content lives in a single JSON file — no database at runtime.

## Tech Stack

| Layer | Tech |
|---|---|
| Runtime / tooling | Bun 1.3 workspaces (with dependency catalog), TypeScript 6 |
| Frontend | Next.js 16 (App Router, React Compiler, typed routes, standalone output), React 19 |
| Styling | Tailwind CSS v4, shadcn/ui primitives (`@portfolio/ui`), next-themes |
| Animation | GSAP + ScrollTrigger, Motion (Framer Motion 12) |
| 3D | Three.js via @react-three/fiber + drei |
| Backend | Elysia 1.4 on Bun, Nodemailer (Gmail SMTP), Eden for typed client |
| Speech / AI | Deepgram `nova-3` (batch STT), AutoSage RAG agents (chat + drill coach) |
| Fonts | Chakra Petch, IBM Plex Sans, JetBrains Mono, Press Start 2P |
| Scaffold (not used at runtime) | Drizzle ORM + Postgres, Better-Auth — Better-T-Stack leftovers kept for future use |

## Features

Everything is driven from `apps/web/src/content/content.json` (typed by `src/types/portfolio.ts`), and every effect respects `prefers-reduced-motion`.

### System chrome
- **Boot sequence** (`fx/boot-overlay.tsx`) — CRT power-on, scrolling boot log, loader bar, monitor-off collapse. Skippable with any key.
- **HUD frame** (`hud/hud-frame.tsx`) — scroll progress bar, rotating status quips, live uptime counter, live IST clock, and a left-side process-list nav where each section is a PID (`001 boot`, `017 whoami`, `042 deploys`…).
- **Terminal** — press `~` for a full fake shell (`terminal/terminal-overlay.tsx`) with history and typewriter output: `whoami`/`neofetch`, `ls projects`, `stack`, `cat` (ASCII cat), `fact`, `sudo hire-me`, `matrix`, `rm` ("nice try"), and more.

### Playful layer
- **Custom cursor** (`fx/custom-cursor.tsx`) — cyan "packet" cursor with a dot trail and drifting dev glyphs; clicks emit floating HTTP status codes (404, 418, 200 OK…).
- **Cats everywhere** — a wandering colony (`fx/cat-colony.tsx`), an edge-crawling cat circling the viewport (`fx/edge-crawler.tsx`), and a sleepy cat napping on a laptop in the contact section (`fx/sleepy-cat.tsx`). Petting any cat bursts hearts (`lib/pet.ts`).
- **Sprite-can quest** (`quest/`) — 10 pixel Sprite cans hidden down the page, with a HUD counter, popup banter, and a reward dialog when all are found.
- **Nerd buddy** (`fx/nerd-buddy.tsx`) — a floating 🤓 next to the hero that dispenses non-repeating fun facts (`lib/fact-tracker.ts`).
- **Floating icons** (`fx/floating-icons.tsx`) — tool SVGs drifting and bouncing off viewport edges.

### Sections
- **Hero** — WebGL network constellation with packets pulsing along edges (`three/system-constellation.tsx`), glitch-text name, rotating job titles, cinematic scroll zoom.
- **About / whoami** — identity card rendered as a syntax-highlighted `GET /api/v1/profile → 200 OK` JSON response, plus a fake `top` process monitor.
- **Arsenal** — tech chips spring-drop into place on scroll, then a cat hops across and knocks them around.
- **Experience / deploys** — CI/CD-pipeline timeline where each job is a Minecraft-style grass-block deploy node.
- **Projects / services** — horizontally-scrolling cards with LIVE / NDA / SHIPPED / LAB status badges.
- **Achievements / wins** — rank card, count-up stats, and a live `tail -f /var/log/ashwath` log feed.
- **Vitals** — ticking fake telemetry and load meters.
- **Contact** — the form is an HTTP request builder (`POST /api/v1/contact`) with a live JSON body preview and an animated status-code + latency response.

Shared text FX: decode/scramble/glitch text, typing cycle, count-up, reveal, parallax — plus automatic gold emphasis of metrics via `lib/keywords.tsx`.

### DRILL.EXE (`/drill`)
A separate route — pick a difficulty, get dealt a backend concept slot-machine style, speak about it against a timer, get graded in Ashwath's voice.

- **The reel** (`drill/concept-slot.tsx`) — starts flicking ~75 hardcoded decoy titles on the same frame as the click and keeps going until the real concept arrives from the server, then decelerates and slams into it. The network wait *is* the animation; a fast response still gets 1.5s of spin, and after 5s it lands on a local fallback.
- **Recording** (`lib/use-recorder.ts`) — two-step by design: `prepare()` clears the mic permission dialog, *then* the 3-2-1 count-in runs, so the first second of the answer isn't eaten by a browser prompt. A Web Audio `AnalyserNode` drives a live oscilloscope (`drill/waveform.tsx`) — chosen over interim speech-recognition captions, which are frequently wrong and distracting mid-answer.
- **Transcription** — Deepgram `nova-3`, batch not streaming, with keyterms seeded from the concept's own title and tags plus a backend glossary. Chrome's built-in `webkitSpeechRecognition` was rejected: it auto-stops after a few seconds of silence, which is fatal when someone pauses to think.
- **Grading** — a *second* AutoSage agent (one-shot, never given a `chat_id`) returns a rubric: correctness, depth, structure, signal/noise, plus a verdict, what you skipped, and what he'd have asked next. Setup lives in `docs/drill-coach-agent-prompt.md`; the pasteable prompt is `docs/drill-coach-prompt.txt`.
- **Follow-ups** — that "what I'd ask next" is answerable, and answering produces another question: a rolling interview on one topic, capped at 25 rounds before a hardcoded sign-off takes over. The question text never round-trips through the browser — the server stores it against a short-lived `followUpId` and the client only echoes the id back, which keeps the client-can-never-supply-the-topic rule (and the injection defence) intact.
- **Fallbacks** — mic denied, Deepgram unconfigured, or grading failed all land on a typed-answer stage that feeds the same grading path. When grading fails after a successful transcription, the transcript is pre-filled so retrying costs no second Deepgram call.
- **Progress** — localStorage only (`lib/drill-history.ts`): day streak, last 10 scores, and seen concept ids that feed the `exclude` param so topics don't repeat.

The concept bank is `apps/server/src/data/concepts.json` — **405 concepts** across three levels (118 beginner / 159 intermediate / 128 advanced), each with `probes` that double as on-screen hints and the grading bar sent to the agent. Covers HTTP and API design, SQL and database internals, caching, queues and streaming, distributed systems, concurrency, performance, DevOps (CI/CD, Kubernetes, Linux, IaC, cloud, observability), and application security.

Ambient tool icons drift behind the page, and cats roam — but only on the idle and result screens. They're unmounted the moment a topic is dealt, because a cat wandering past mid-answer is the one thing guaranteed to derail a ninety-second explanation. Score 70 or better and you're handed a Sprite can, separate from the site-wide can hunt so grinding drills can't complete it.

Reachable from the HUD process list (`099 drill`) and the terminal `drill` command.

### API (`apps/server`)
Route modules live in `src/routes`; anything that reads configuration goes through `src/lib/env.ts` so dotenv has run first.

- `GET /` and `GET /health` — status checks (`cats: "roaming"`).
- `POST /api/v1/contact` — validated, HTML-escaped, sent via Gmail SMTP with visitor as reply-to. Gracefully degrades to log-only (`202`) if SMTP isn't configured.
- `POST /api/v1/chat` · `GET /api/v1/chat/history` — AutoSage proxy for the chatbot, key stays server-side.
- `GET /api/v1/meme/:id` — meme id → CloudFront URL.
- `GET /api/v1/drill/concept` — deal a concept at a level, minus ids already seen.
- `POST /api/v1/drill/transcribe` — recorded answer → text via Deepgram.
- `POST /api/v1/drill/grade` — text → rubric verdict via the coach agent.

The two drill routes cost money per call and are publicly reachable, so both sit behind an in-memory per-IP hourly limiter. Missing `DEEPGRAM_API_KEY` or `AUTOSAGE_COACH_AGENT_ID` degrades to `503` rather than failing at boot.

`bun test` (in `apps/server`) covers concept picking and verdict parsing/clamping.

## Project Structure

```
portfolio/
├── apps/
│   ├── web/                # Next.js frontend (port 3001)
│   │   └── src/
│   │       ├── app/            # layout, page, drill/page
│   │       ├── components/
│   │       │   ├── drill/      # DRILL.EXE — reel, recorder, verdict
│   │       │   ├── fx/         # cats, cursor, boot, glitch, floaters…
│   │       │   ├── hud/        # system shell + HUD frame
│   │       │   ├── quest/      # Sprite-can easter-egg game
│   │       │   ├── sections/   # hero, about, experience, projects…
│   │       │   ├── terminal/   # fake shell overlay
│   │       │   └── three/      # WebGL constellation
│   │       ├── content/content.json   # single source of truth for all copy
│   │       ├── lib/            # content, fact-tracker, pet, keywords, drill
│   │       └── types/portfolio.ts
│   └── server/             # Elysia API (port 3000)
│       └── src/
│           ├── routes/         # contact, chat, meme, drill
│           ├── lib/            # env, autosage, deepgram, coach, concepts…
│           └── data/           # concepts.json, memes.json
├── packages/
│   ├── ui/                 # shared shadcn/ui components + globals.css
│   ├── env/                # t3-env + Zod validated env vars
│   ├── db/                 # Drizzle + Postgres (scaffold, unused at runtime)
│   ├── auth/               # Better-Auth (scaffold, unused at runtime)
│   └── config/             # shared config
├── Dockerfile.web          # Next standalone image
├── Dockerfile.server       # Elysia image
└── bts.jsonc               # Better-T-Stack config
```

## Getting Started

```bash
bun install

# env (see .env.example)
# GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO (optional),
# CORS_ORIGIN, NEXT_PUBLIC_SERVER_URL, PORT
# AUTOSAGE_BASE_URL, AUTOSAGE_API_KEY, AUTOSAGE_AGENT_ID    — chatbot
# AUTOSAGE_COACH_AGENT_ID, DEEPGRAM_API_KEY                 — /drill

bun run dev          # everything
bun run dev:web      # web only → http://localhost:3001
bun run dev:server   # api only → http://localhost:3000
```

Other scripts: `bun run build`, `bun run check-types`, and Drizzle helpers (`db:push`, `db:studio`, `db:generate`, `db:migrate`) for the scaffolded DB.

## Deploy

Both apps ship as Docker images built from the repo root (so workspace packages resolve):

```bash
docker build -f Dockerfile.web -t ashwath-sys-web .       # Next standalone, port 3001
docker build -f Dockerfile.server -t ashwath-sys-api .    # Elysia, port 3000
```

`Dockerfile.web` takes `NEXT_PUBLIC_*` as build args; the server reads SMTP + CORS config at runtime.
