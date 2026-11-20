# Preda Family app

A family calendar for phones. Everyone logs in with their name + PIN, adds tasks in one-hour slots
for themselves or someone else, and the other person gets a notification.
Live at **https://preda.app**. House rules for Claude are in `CLAUDE.md`.

## What it does (v1)
- **Login:** tap your name, type your PIN. 5 wrong PINs lock that person for 10 minutes.
- **Calendar:** day view on phones, week view on computers (Day / Week / Month buttons), 1-hour slots, 06:00–24:00.
- **Tasks:** tap an hour or "+ Task". Pick who it's for, how long, notes. Each task shows "Adrian → Ana"
  and has the colour of the person it's for. Mark done, edit, delete, or drag to move/resize.
  Only the creator and the target person can change a task.
- **Notifications:** bell with unread items (checks every 30 s) + phone push notifications.
  The target person is told when a task is added or changed for them; the creator is told when it's done.
- **Installable app (PWA):** "Add to Home Screen" on iPhone/Android. On iPhone, push only works after that.

## Settings (environment variables)
Set these in Coolify → your app → Environment Variables. See `.env.example`.

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection URL (from the Coolify database page, "internal URL") |
| `SESSION_SECRET` | Long random text. Make one with `openssl rand -base64 32` |
| `FAMILY_MEMBERS` | `Name:PIN:#colour` list, e.g. `Adrian:4821:#2563eb,Ana:1937:#db2777` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push keys. Make once with `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:adrian@preda.app` |
| `APP_URL` | `https://preda.app` |
| `COOKIE_DOMAIN` | `.preda.app` — lets the same PIN login unlock `home.preda.app` |
| `HOME_URL` | Optional house button, e.g. `https://home.preda.app/preda-home-drawing/plan` |
| `SEED_DEMO_DATA` | `true` only for preview deployments (adds Mum/Dad/Kid with PIN 0000) |

**Add a family member:** add them to `FAMILY_MEMBERS` in Coolify and redeploy (they start with that PIN).
**Change a PIN:** everyone can do it themselves — tap your avatar → 🔑 Change my PIN. After that,
`FAMILY_MEMBERS` no longer overwrites their PIN.
**Forgotten PIN:** put the new PIN for that person in `FAMILY_MEMBERS`, add `FAMILY_PIN_RESET=Sonia`
(names, comma separated), redeploy once, then remove `FAMILY_PIN_RESET` again.
Every start runs the database migrations and creates/updates the members.

## Run it on your computer
```bash
npm install
docker compose -f docker-compose.dev.yml up -d   # local Postgres
cp .env.example .env.local                        # then edit values
export $(grep -v '^#' .env.local | xargs)
npm run db:migrate && npm run db:seed
npm run dev                                       # http://localhost:3000
```

## Checks (also run automatically on every pull request)
```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Change the database
Edit `src/lib/db/schema.ts`, then `npm run db:generate` to create a migration in `drizzle/`. Commit both.

## Deploy
Coolify builds the `Dockerfile` on every push to `main` (port 3000, health check `/api/health`).
