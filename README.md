# Kid Genius Lab Cloud

Kid Genius Lab is a cloud-first learning mission app for parents. It supports Ethan Mode, Valentino Mode, and Enzo Mode, with missions, bedtime stories, explanations, progress tracking, and cloud persistence.

## What is fixed

- Next.js app designed for cloud deployment.
- PostgreSQL persistence through Prisma.
- Server-side Kimi calls only. The API key is never exposed to the browser.
- Local browser fallback is kept only as a convenience if the database is not configured yet.
- AI generation has safe fallback templates so the app does not crash if Kimi is unavailable.
- No dependency on Edwin's machine.

## Required environment variables

Set these in Vercel or your cloud provider:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
KIMI_API_KEY="your_kimi_api_key_here"
KIMI_MODEL="kimi-k2-0905-preview"
KIMI_BASE_URL="https://api.moonshot.ai/v1/chat/completions"
```

`KIMI_MODEL` and `KIMI_BASE_URL` are optional. If omitted, the app uses `kimi-k2-0905-preview` and the default Moonshot-compatible endpoint.

## Local development

```bash
npm install
npx prisma generate
npm run dev
```

## Database setup

After adding `DATABASE_URL`, run:

```bash
npx prisma db push
```

## Deploy on Vercel

1. Import this GitHub repo into Vercel.
2. Add the required environment variables.
3. Deploy.
4. If the database is empty, run `npx prisma db push` through your preferred workflow or local terminal once.

## API routes

- `GET /api/health`
- `GET /api/state`
- `POST /api/state`
- `POST /api/mission`
- `POST /api/story`
- `POST /api/explain`
- `POST /api/learning` (tutor, practice, hint, feedback, encouragement, summary)

## Privacy note

This is a cloud app. Child profile data and progress are stored in the configured PostgreSQL database. AI prompts are sent only from server-side routes when `KIMI_API_KEY` is configured.