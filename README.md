# ChangeDesk

A self-serve client change-request portal for freelance/agency Shopify work.
Clients log in, submit change requests (screenshots, references, priority)
against their store, and track status in real time. You (and your team) run
every client's queue from a single admin view.

Built on **Next.js 15 (App Router) + TypeScript**, **Better Auth**
(organization + admin plugins), **Drizzle ORM + PostgreSQL**, **Shopify
Polaris**, **Resend**, and **Upstash** (rate limiting / Redis) — the stack
from the PRD (`PRD.md`).

## What's implemented (Phase 1 MVP +)

- **Auth & RBAC** — Better Auth email/password, per-org roles
  (`owner` / `admin` / `member`) plus a global role
  (`super_admin` / `team_member`), all enforced **server-side on every route**.
- **Invite-based onboarding** — invite by email → client sets a password via
  the emailed link → invitation accepted. (Sign-up page exists too.)
- **Change requests** — title, description, type, priority, store, reference
  link, target section, and drag-drop / paste-from-clipboard screenshots.
- **Status workflow** — Submitted → Acknowledged → In Progress → In Review →
  Completed (plus On Hold / Rejected), with the PRD's transition rules,
  an **append-only audit trail**, and a per-request activity timeline.
- **Comments** — threaded timeline with file re-attachment.
- **Admin queue** — all orgs in one place, filterable by org/status/priority/
  search, with per-org analytics (turnaround, completion rate, overdue, monthly).
- **Client dashboard** — scoped strictly to their org, "New request" CTA,
  status badges, empty states.
- **Notifications** — in-app bell (read/unread) + email engine with
  per-org hourly caps, a 5-minute debounce for status flips, digest fallback,
  per-user frequency prefs, and idempotency keys (see `lib/notifications.ts`).
- **Rate limiting** — Upstash Ratelimit (in-memory fallback in dev) on API,
  auth, upload, and invite endpoints.
- **Attachments** — screenshots are compressed in the browser before
  upload (Vercel caps request bodies at ~4.5 MB), then stored privately:
  Postgres `file_blobs` by default (works on serverless), Cloudflare R2
  automatically when `R2_*` vars are set. Served through an authenticated
  proxy route.

## Getting started

```bash
cp .env.example .env.local      # then fill in the values
npm install
npm run db:push                 # create tables (or db:migrate for SQL files)
npm run db:seed                 # demo orgs, users, requests
npm run dev                     # http://localhost:3000
```

### Required env vars

| Var | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon/Supabase) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` in dev |
| `NEXT_PUBLIC_APP_URL` | Same |
| `SUPER_ADMIN_EMAIL` | Your email — promoted to super admin by the seed |

Optional: `RESEND_API_KEY` / `EMAIL_FROM` (emails log to the console in dev),
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (shared rate limiting),
`R2_*` (store screenshots in Cloudflare R2), `CRON_SECRET` (protect the email
cron route).

### Demo accounts (after `db:seed`)

| Role | Email | Password |
|---|---|---|
| Super admin | your `SUPER_ADMIN_EMAIL` | `ChangeDesk123!` (or `SUPER_ADMIN_PASSWORD`) |
| Team member | `priya@changedesk.dev` | `ChangeDesk123!` |
| Client owner | `prachi@studiocaramel.com` | `ChangeDesk123!` |
| Client owner | `meera@noirbeauty.com` | `ChangeDesk123!` |
| Client member | `aarav@studiocaramel.com` | `ChangeDesk123!` |

## Deploying to Vercel

```bash
vercel login                    # first time only
vercel env add DATABASE_URL production
vercel env add BETTER_AUTH_SECRET production
vercel env add BETTER_AUTH_URL production     # https://your-app.vercel.app
vercel env add NEXT_PUBLIC_APP_URL production # https://your-app.vercel.app
vercel env add SUPER_ADMIN_EMAIL production   # your email (seed promotes it)
vercel env add RESEND_API_KEY production
vercel env add EMAIL_FROM production         # see note below
vercel env add CRON_SECRET production        # protects /api/cron/emails
vercel deploy --prod
```

**Email without a domain yet:** with only a `RESEND_API_KEY`, use Resend's
test sender `ChangeDesk <onboarding@resend.dev>` as `EMAIL_FROM`. It delivers
only to *your own* Resend account email — enough to verify the pipeline live.
To send to real clients, verify a domain in the Resend dashboard (free) and
switch `EMAIL_FROM` to `ChangeDesk <no-reply@yourdomain.com>`.

After deploying, run the seed against the production DB if it's a fresh
database: `DATABASE_URL=... npm run db:seed` from your machine.

## Project layout

```
app/                      Next.js App Router — pages + API routes
  api/auth/[...all]       Better Auth handler
  api/change-requests     list/create/detail/status/comments/attachments
  api/orgs                orgs, members, invites, stores, analytics
  api/notifications       in-app notifications + preferences
  api/email|cron          email queue flushing (manual + scheduled)
  (app)/                  protected pages (dashboard, admin, settings…)
components/               Polaris UI components
db/schema.ts              Drizzle schema (Better Auth tables + domain)
db/seed.ts                demo data
lib/                      auth, rbac, notifications, rate limiting, storage…
```

## Key architecture decisions

- **Tenant isolation** — every request is scoped by `org_id`, but the org id
  is never trusted from the client: it must match the caller's memberships
  (super admin excepted). See `lib/rbac.ts`.
- **RBAC** — global role + per-org role, enforced in API routes, not the UI.
- **Email reliability** — writes go to an outbox table first (idempotency
  keys), then `flushOutbox()` sends respecting caps/debounce/digest; a cron
  route (`GET /api/cron/emails`) picks up anything pending.
- **Polaris + Tailwind** — Polaris supplies the Shopify-admin-native
  components; Tailwind only does page layout, per the PRD's UI guidelines.

## Roadmap notes

Phase 2/3 items not yet built: Kanban view, notification digests on a
schedule (the machinery exists — wire `cron` to run hourly/daily), Slack
webhook, PDF/CSV exports, screenshot annotation, client logo branding.
See `PRD.md` for the full plan.
