# OmniSync AI Personal Assistant

OmniSync is a Next.js personal assistant dashboard that connects communication tools, generates AI briefings, tracks alerts, and provides an assistant chat experience over synced app data.

## Tech Stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **UI:** React, Tailwind CSS, Lucide, Hugeicons
- **Backend:** InsForge database, auth, realtime, and storage-ready SDK client
- **AI:** Google Gemini through `@google/genai`
- **Background jobs:** Trigger.dev schedules and tasks
- **Messaging:** Gmail OAuth/MCP-style routes, WhatsApp session helpers, Sent.dm OTP delivery

## Project Structure

```text
app/
  page.tsx                         Landing page and interactive product demo.
  layout.tsx                       Root providers, fonts, metadata, and theme bootstrap.
  dashboard/
    layout.tsx                     Authenticated dashboard shell and sidebar navigation.
    page.tsx                       Main dashboard tabs, panels, AI agent, integrations, alerts, and settings.
    briefing/[id]/page.tsx         Detail view for a generated briefing.
  auth/
    callback/page.tsx              InsForge auth redirect handler.
    gmail-callback/page.tsx        Google OAuth callback handoff.
  api/
    ai-chat/route.ts               AI assistant endpoint using synced Gmail/WhatsApp context.
    dashboard-brief/route.ts       Dashboard intelligence brief generation and caching.
    briefings/*                    Briefing CRUD, schedules, and AI draft routes.
    alerts/*                       Alert list, rules, suggestions, actions, and AI helper routes.
    gmail-*                        Gmail OAuth and Gmail data proxy routes.
    whatsapp-*                     WhatsApp connect/status/data proxy routes.
    phone-auth/*                   OTP send and verify routes.
components/
  auth-provider.tsx                Client auth context and user profile synchronization.
  theme-provider.tsx               Light/dark theme state.
lib/
  insforge.ts                      Shared public InsForge SDK client.
  insforge-admin.ts                Server-side admin client fallback helper.
  alert-auto-generation.ts         Fetches connected activity and turns it into alerts.
  alerts-realtime.ts               Publishes alert events over InsForge realtime.
  whatsapp.ts                      WhatsApp connection/session logic.
  otp-store.ts                     In-memory OTP store for local verification.
trigger/
  alerts.ts                        Scheduled alert checks and alert creation jobs.
  briefing.ts                      Scheduled briefing generation jobs.
db/
  alerts.sql                       Alert schema and database setup SQL.
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root.

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000

NEXT_PUBLIC_INSFORGE_URL=https://3ewxfrr2.us-east.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your_insforge_anon_key
INSFORGE_API_KEY=your_insforge_admin_or_api_key

GEMINI_API_KEY=your_gemini_api_key

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

SENT_DM_API_KEY=your_sentdm_api_key
SENT_DM_TEMPLATE_ID=your_sentdm_template_id
```

3. Configure Google OAuth.

- Add `http://localhost:3000/auth/gmail-callback` as an authorized redirect URI.
- Use the same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`.

4. Prepare the database.

- Apply the SQL in `db/alerts.sql` to the InsForge project.
- Make sure the `users`, `alerts`, `alert_rules`, `briefing_schedules`, and `generated_briefings` tables exist before using dashboard workflows.
- Keep secrets in `.env.local` and InsForge project config; do not hardcode private keys.

5. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev      # Start local development server
npm run build    # Create production build
npm run start    # Start production server after build
npm run lint     # Run ESLint
```

## How The App Works

Authentication starts in `components/auth-provider.tsx`. It checks for a local phone-auth user first, then falls back to InsForge auth. When a user signs in, the provider creates or updates the matching `users` row so dashboard data and integrations stay attached to one user ID.

The dashboard in `app/dashboard/page.tsx` reads the active tab from the `tab` query parameter. Each panel handles one workflow: overview, AI agent, briefing, inbox/follow-ups, integrations, alerts, settings, or pricing.

AI chat uses `app/api/ai-chat/route.ts`. The route validates the user, reads integration metadata from InsForge, fetches recent Gmail/WhatsApp context when connected, and sends that context to Gemini. If `GEMINI_API_KEY` is missing, it returns a simulated response instead of breaking the UI.

Dashboard briefs use `app/api/dashboard-brief/route.ts`. Briefs are cached in the `users.dashboard_brief` field for two hours unless the request asks to regenerate. With connected app data and a Gemini key, the route creates a real summary. Otherwise it saves a simulated preview.

Alerts use `lib/alert-auto-generation.ts`, `app/api/alerts/*`, and `trigger/alerts.ts`. The background job checks active alert rules, fetches connected app activity, deduplicates alerts with a `dedupe_key`, saves new alerts, and publishes realtime updates through InsForge.

Scheduled briefings use `trigger/briefing.ts`. The cron task finds due briefing schedules, advances `next_run_at`, fetches connected communication data, generates a Gemini briefing when possible, and stores the result in `generated_briefings`.

Phone auth uses `app/api/phone-auth/send-otp/route.ts`, `app/api/phone-auth/verify-otp/route.ts`, and `lib/otp-store.ts`. OTPs are stored in memory for local development and consumed after one successful verification. For production, replace the in-memory store with Redis or a database-backed TTL table.

## Environment Notes

- `NEXT_PUBLIC_*` variables are available in browser code. Do not put private secrets in them.
- `INSFORGE_API_KEY` is required for server workflows that need to bypass row-level security, such as background alert generation.
- `GEMINI_API_KEY` enables real AI summaries and assistant responses.
- `APP_URL` should point to the deployed app URL in production so Trigger.dev jobs can call local API routes correctly.
- The public InsForge anon key can be used by client code, but admin/API keys must stay server-side only.

## Development Workflow

1. Make the smallest focused code change.
2. Keep InsForge database writes associated with the authenticated `userId`.
3. Run `npm run lint` before committing.
4. Run `npm run build` when changing routes, server code, or shared types.
5. Test the main dashboard flows manually: sign in, connect integrations, generate a brief, ask the AI agent, and create or resolve an alert.

## Production Checklist

- Replace local callback URLs with deployed URLs in Google OAuth settings.
- Set production values for every required environment variable.
- Use a durable OTP store instead of the module-level `Map`.
- Confirm InsForge RLS policies allow intended user-owned reads/writes only.
- Configure Trigger.dev deployment and schedules.
- Verify that `APP_URL` and `NEXT_PUBLIC_APP_URL` match the deployed domain.
