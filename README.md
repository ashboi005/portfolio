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

### API (`apps/server`)
- `GET /` and `GET /health` — status checks (`cats: "roaming"`).
- `POST /api/v1/contact` — validated, HTML-escaped, sent via Gmail SMTP with visitor as reply-to. Gracefully degrades to log-only (`202`) if SMTP isn't configured.

## Project Structure

```
portfolio/
├── apps/
│   ├── web/                # Next.js frontend (port 3001)
│   │   └── src/
│   │       ├── app/            # layout, page
│   │       ├── components/
│   │       │   ├── fx/         # cats, cursor, boot, glitch, floaters…
│   │       │   ├── hud/        # system shell + HUD frame
│   │       │   ├── quest/      # Sprite-can easter-egg game
│   │       │   ├── sections/   # hero, about, experience, projects…
│   │       │   ├── terminal/   # fake shell overlay
│   │       │   └── three/      # WebGL constellation
│   │       ├── content/content.json   # single source of truth for all copy
│   │       ├── lib/            # content, fact-tracker, pet, keywords
│   │       └── types/portfolio.ts
│   └── server/             # Elysia API (port 3000) — contact email
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
