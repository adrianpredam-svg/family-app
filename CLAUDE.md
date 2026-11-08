# CLAUDE.md — house rules for the Preda family app

This repo is the Preda family organiser, live at https://preda.app.
Family members who are not developers ask Claude for new features, so keep
changes small, safe and easy to review.

## Stack (do not change without asking Adrian)
- Next.js (App Router) + TypeScript, `output: "standalone"`
- PostgreSQL via Drizzle ORM; migrations in `/drizzle`, run automatically on container start
- Tailwind CSS for styling
- FullCalendar (MIT packages only: core, react, daygrid, timegrid, interaction)
- Auth: pick your name + 4–6 digit PIN, session cookie (see `src/lib/auth.ts`, `src/lib/session.ts`, `src/middleware.ts`)
- PWA: `src/app/manifest.ts` + `public/sw.js`; Web Push with `web-push` + VAPID keys
- Deployed by Coolify from the `main` branch using the `Dockerfile` (server is ARM64 — keep images multi-arch, e.g. `node:22-alpine`)
- Timezone for display: Europe/Copenhagen. Store all times in UTC.

## Folder layout
- `src/app/` — pages and route handlers
- `src/modules/<feature>/` — one folder per feature (e.g. `tasks`, `calendar`, `notifications`).
  New features go in a NEW module folder; touch shared code only when needed.
- `src/lib/` — shared helpers (db, auth, push). Changes here need extra care.
- `src/components/ui/` — shared UI pieces; reuse them before creating new ones.

## Rules
1. Never commit secrets. All secrets come from environment variables (see `.env.example`).
2. Never change login/auth, the database schema of existing tables, or the Dockerfile
   unless the request explicitly asks for it. Adding NEW tables/columns is OK (with a migration).
3. Every feature: works on a phone screen first (375px wide), big tap targets, plain-language labels.
4. Keep the look consistent: each family member has a colour (`members.color`); use it for their tasks.
5. Run `npm run lint`, `npm run typecheck` and `npm test` before opening a pull request; all must pass.
6. Open a pull request with a short, non-technical description of what changed and how to try it
   on the preview link. Never push directly to `main`.
7. Previews use their own database with fake seed data — never connect a preview to production data.
8. Prefer simple code over clever code. Add a short comment where something non-obvious happens.

## Useful commands
- `npm run dev` — local dev server (needs Postgres, see `docker-compose.dev.yml`)
- `npm run db:generate` — create a migration after changing `src/lib/db/schema.ts`
- `npm run db:seed` — create family members from `FAMILY_MEMBERS`
- `npx web-push generate-vapid-keys` — create push keys (once, store in Coolify)
