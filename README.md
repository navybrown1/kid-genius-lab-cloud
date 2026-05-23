# Kid Genius Lab Cloud

Kid Genius Lab is a cloud-first learning mission app for parents. It supports Ethan Mode, Valentino Mode, and Enzo Mode, with missions, bedtime stories, explanations, progress tracking, and cloud persistence.

## What is fixed

- Next.js app designed for cloud deployment.
- PostgreSQL persistence through Prisma.
- Server-side Kimi calls only. The API key is never exposed to the browser.
- Local browser fallback is kept only as a convenience if the database is not configured yet.
- AI generation has safer fallback templates so the app does not crash if Kimi is unavailable.
- AI prompts now push for topic-specific explanations instead of vague generic content.
- No dependency on Edwin's machine.

## Required environment variables

Set these in Vercel or your cloud provider:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
KIMI_API_KEY="your_kimi_api_key_here"
KIMI_MODEL="moonshot-v1-8k"
KIMI_BASE_URL="https://api.moonshot.ai/v1"
```

`KIMI_MODEL` and `KIMI_BASE_URL` are optional. If omitted, the app uses `moonshot-v1-8k` and `https://api.moonshot.ai/v1`. The app also accepts `MOONSHOT_API_KEY`, `MOONSHOT_MODEL`, and `MOONSHOT_BASE_URL` as aliases.

If you previously set `KIMI_BASE_URL` to `https://api.moonshot.ai/v1/chat/completions`, that still works. The runtime normalizes either base URL format.

## AI diagnostics

After deployment, open:

```text
/api/health
```

This shows whether the app sees an AI key and which endpoint/model it is configured to use. It does not expose the secret key.

For a live Kimi test, open:

```text
/api/health?ai=1
```

If this returns `ai.ok: false`, check the Vercel environment variables and redeploy. Most failures come from a missing key, wrong model name, wrong base URL, or Vercel not having been redeployed after env changes.

## Local Development Safe Setup

To run the application locally, follow these steps to securely configure your environment variables:

1. **Copy the example configuration** to create your local variables file:
   ```bash
   cp .env.example .env.local
   ```
2. **Add your real API keys** (like `KIMI_API_KEY`, `GROQ_API_KEY`, etc.) inside `.env.local`.
3. **Never commit `.env.local`**: The project's `.gitignore` is pre-configured to ignore all `.env.local` files, preventing private API keys from ever being exposed to GitHub.
4. **Deploying to production**:
   - In production (e.g., on Vercel, Render, Railway, Netlify), add your real API keys using the platform's Environment Variables dashboard.
   - Private keys remain server-side only and are never exposed to the client.

To start the local environment:
```bash
npm install
npx prisma generate
npm run dev
```

## Database setup

To sync your database schema, run:
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
- `GET /api/health?ai=1`
- `GET /api/state`
- `POST /api/state`
- `POST /api/mission`
- `POST /api/story`
- `POST /api/explain`
- `POST /api/learning` (tutor, practice, hint, feedback, encouragement, summary)

## Privacy note

This is a cloud app. Child profile data and progress are stored in the configured PostgreSQL database. AI prompts are sent only from server-side routes when `KIMI_API_KEY` or `MOONSHOT_API_KEY` is configured.