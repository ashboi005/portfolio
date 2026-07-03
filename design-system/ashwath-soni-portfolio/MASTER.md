# Design System Master File — "THE SYSTEM IS ALIVE"

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Ashwath Soni Portfolio
**Revised:** 2026-07-03
**Concept:** The site is a live distributed system. The visitor is a request packet
traveling through it. Every section is a service; every label is telemetry; nothing
is decoration — statuses, timestamps and latencies are real content.

---

## Global Rules

### Color Palette (semantic, not decorative)

| Role | Hex | CSS Variable | Usage rule |
|------|-----|--------------|------------|
| Void (canvas) | `#04050A` | `--void` | Page background. Deep blue-black, never pure #000. |
| Surface | `#0A0C13` | `--surface` | Cards, panels. |
| Surface-2 | `#10131C` | `--surface-2` | Hover states, nested panels. |
| Line | `rgba(230,233,242,0.08)` | `--line` | All borders/hairlines. |
| Electric Cyan | `#33E0FF` | `--cyan` | Interactive + system-active ONLY: links, focus, live cursors, active nav, packet pulses. |
| Cyan Deep | `#0E7490` | `--cyan-deep` | Dim cyan strokes, glows at low alpha. |
| Gold | `#F5C518` | `--gold` | KEYWORDS ONLY — inline emphasized tech terms & metrics in prose. Never buttons, never borders. |
| Signal Red | `#FF4655` | `--red` | CRITICAL ONLY — NDA badges, "HOT" markers, error states, destructive actions. |
| Text | `#E6E9F2` | `--text` | Primary text. |
| Text Dim | `#8B92A7` | `--text-dim` | Secondary text, labels. |
| White particle | `rgba(237,239,247,*)` | — | Ambient particles / constellation nodes at 20–70% alpha. |

**Discipline:** cyan = "the system talking to you", gold = "the words that matter",
red = "pay attention / restricted". If a color could be swapped without losing meaning,
it's being used wrong.

### Typography

- **Display:** Chakra Petch (500/600/700) — section titles, hero name, big numerals. Techno-angular, reads like hardware labeling. Use with letter-spacing 0 to -0.02em at large sizes; uppercase + 0.12em tracking at small eyebrow sizes.
- **Body:** IBM Plex Sans (400/500) — all prose. Line-height 1.65. Max measure 65ch.
- **Data/Utility:** JetBrains Mono (400/500) — logs, labels, eyebrows, timestamps, JSON, badges, nav. Usually 11–13px, uppercase for eyebrows.

```css
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
```

(In Next.js use `next/font/google` instead of the CSS import.)

### Structure Vocabulary

Every section opens with a mono "service eyebrow" that is real telemetry, e.g.:

```
[SVC] portfolio.projects — 6 services registered · 2 live
[LOG] career.timeline — tail -f /var/log/ashwath/deploys
[API] contact.gateway — POST /api/v1/contact · avg 42ms
```

Section titles in Chakra Petch below the eyebrow. Content follows the metaphor of the
section (service cards, log lines, API console) but body prose stays plain, readable
IBM Plex Sans.

### Spacing & Radii

- Section vertical rhythm: 128px desktop / 80px mobile between sections.
- Panels: radius 4px MAX (instrument panels, not bubbles). Hairline `--line` borders.
- Grid gutter 24px; content max-width 1200px; prose max-width 65ch.

### Motion Rules

- Signature moment: hero constellation (WebGL) — always moving, subtle, mouse-reactive.
- Scroll-in: section eyebrows "decode" (scramble → resolve, 600ms); content fades up 12px, 500ms ease-out, stagger 60ms.
- Hover: borders shift to cyan at 40% alpha + 150–250ms transitions. No layout-shifting scale.
- Ambient: status bar uptime ticker (1s), blinking cursors (steps), packet pulses in canvas.
- `prefers-reduced-motion`: kill constellation drift + decode; keep static layout fully readable.
- **CRITICAL RULE:** effects never sit on top of body text. Canvas stays behind at low luminance; text containers get solid/near-solid backgrounds when overlapping canvas.

## Signature Element

Full-viewport **system constellation** behind the hero: white/cyan nodes with hairline
edges, packets pulsing along edges, gentle drift, nodes react to cursor. Persistent HUD:
top status bar (uptime, region, ALL SYSTEMS NOMINAL), left process-list nav rail,
thin cyan scroll-progress line ("request progress").

## Easter Eggs

- `~` opens a terminal overlay: `help`, `whoami`, `ls projects`, `stack`, `sudo hire-me`, `exit`.
- `hobbies: null` joke appears in profile JSON.

## Anti-Patterns (Do NOT Use)

- ❌ Gold or red as generic accents (they are semantic).
- ❌ Rounded-bubble cards, big radii, soft shadows — this is an instrument panel.
- ❌ Emojis as icons — use Lucide SVGs.
- ❌ Effects that reduce text contrast below 4.5:1.
- ❌ Layout-shifting hovers, invisible focus states, instant state changes.
- ❌ Green "code run" accents from the old system — retired.

## Pre-Delivery Checklist

- [ ] Text readable everywhere (contrast ≥ 4.5:1, canvas never fights prose)
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px; no horizontal scroll
- [ ] Keyboard focus visible; cursor-pointer on clickables
- [ ] Fonts loaded via next/font (no FOUT flash of wrong face)
