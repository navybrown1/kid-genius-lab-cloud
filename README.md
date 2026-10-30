# Kid Genius Lab Cloud

A parent-supervised AI learning playground for curious kids. Kid Genius Lab turns any topic into a tutor conversation, an adaptive quiz, a hands-on mission, or a bedtime story — then rewards the curiosity with XP, levels, streaks, badges, and daily goals.

The interface is built around a **Neon Observatory** design language: a dark cosmic canvas, glass panels, orbital motion, editorial serif accents, and a distinct color aura for each child.

## What is inside

### Learning experiences

- **AI tutor chat** — ask a question, get a kid-sized explanation with a wild analogy, three easy steps, and a tiny challenge. Follow-up questions keep the conversation going, and replies can be read aloud.
- **Adaptive quiz arena** — generated question decks, difficulty labels, hints, per-question feedback, combo tracking, a progress rail, and a session results screen with stars and XP.
- **Lab missions** — a visual step timeline, live timer, progress ring, and a claimable reward when every step is checked off.
- **Bedtime stories** — generated stories split into illustrated-book pages with a paper texture, page dots, read-aloud, and a completion reward.
- **Daily spark** — a fresh wonder question every day, plus one-tap topic chips for Space, Dinosaurs, Ocean, Volcanoes, Robots, and Art.
- **Parent zone** — overview, activity history, AI coaching insight, and lab controls in one modal.

### Progression and motivation

- XP, levels, and level-up celebrations.
- Daily streaks and a configurable daily star goal.
- Badge cabinet with unlock toasts.
- Per-child progress, history, mastered topics, and “needs another pass” tracking.
- Confetti, sound effects, and optional voice input/output.

### Kid profiles

Three profiles — **Ethan**, **Valentino**, and **Enzo** — each with their own avatar, color theme, level, XP, streak, badges, and topic history.

### Comfort and accessibility

- Onboarding tour for first-time visitors.
- Sound, voice, and reduced-motion toggles saved in `localStorage`.
- Keyboard-focus styles, semantic buttons, and responsive layouts from 390px to widescreen.
- Installable PWA manifest and app icon.

## Tech stack

- Next.js 15 (App Router) + React 19
- Prisma + PostgreSQL for cloud persistence
- Zod for request validation
- Kilo AI Gateway for server-side AI generation (OpenAI-compatible API)
- Hand-written CSS design system split into focused files under `src/app/css/`

## Design system

The visual layer lives in `src/app/css/` and is imported by `src/app/globals.css`:

| File | Responsibility |
| --- | --- |
| `base.css` | Tokens, reset, cosmic background, topbar, buttons, footer, animations |
| `hero.css` | Hero, composer, daily spark panel, orbital, marquee |
| `sections.css` | Crew cards, action dock, workspace shell, right rail |
| `panels.css` | Tutor chat, quiz, feedback, mission, story, rings |
| `overlays.css` | Modals, parent zone, settings, toasts, onboarding, confetti |
| `responsive.css` | Breakpoints and reduced-motion rules |

Fonts: **Bricolage Grotesque** (display), **Instrument Serif** (italic accents), **Outfit** (body), **IBM Plex Mono** (labels).

## Local development

```bash
cp .env.example .env.local
npm install
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> If your global `~/.npmrc` sets `workspaces=...`, npm may report `No workspaces found!`. Run `npm install --workspaces=false` instead.

The app still runs without PostgreSQL or an AI key:

- `/api/state` returns normalized defaults when the database is unreachable and accepts optimistic saves without a 500.
- AI routes fall back to local templates, so tutor, quiz, mission, and story flows remain usable.
- The topbar reports **Local brain ready** when the AI key is missing.

### Database

```bash
npx prisma db push
```

This creates the `AppState` table used by `GET/POST /api/state`.

## Environment variables

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
KILO_API_KEY="your_kilo_api_key_here"
KILO_MODEL="kilo-auto/free"
KILO_BASE_URL="https://ai-gateway.kilo.ai/api/v1"
```

`KIMI_MODEL` and `KIMI_BASE_URL` are optional. The app also accepts `MOONSHOT_API_KEY`, `MOONSHOT_MODEL`, and `MOONSHOT_BASE_URL` as aliases, and normalizes either base-URL format.

Keys are used only in server-side routes and are never exposed to the browser.

## API routes

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Runtime AI configuration (no secrets) |
| `GET /api/health?ai=1` | Live AI connection test; returns `ok: false` / `status: "degraded"` when unavailable |
| `GET /api/state` | Load the persisted app state |
| `POST /api/state` | Save the app state (graceful fallback when Postgres is down) |
| `POST /api/learning` | Tutor, chat, practice, hint, feedback, encouragement, summary |
| `POST /api/mission` | Generate a mission |
| `POST /api/story` | Generate a story |
| `POST /api/explain` | Generate an explanation |

## Deploy on Vercel

1. Import this repository into Vercel.
2. Add `DATABASE_URL`, `KIMI_API_KEY`, and any optional AI variables.
3. Deploy.
4. Run `npx prisma db push` once against the production database.

## Privacy note

Child profile data and progress are stored in the configured PostgreSQL database. AI prompts are sent only from server-side routes. The app is designed for parent-supervised use.
