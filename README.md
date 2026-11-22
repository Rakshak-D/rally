# Rally

**Show up together.** Rally is a collaborative progress app for daily check-ins, shared challenges, goals, and practical next steps.

## What is in V1

- Email-confirmed signup, sign-in, sign-out, password recovery, and profile editing.
- Multiple timezoned workspaces, owner/member roles, private one-time or multi-use invites, and workspace switching.
- Inclusive-date challenges with a suggested 60-day starting range.
- One challenge-local check-in per member per day, current-day edits, team activity, history, streaks, and consistency.
- Member-owned goals and tasks with status changes, completion, reopening, and deletion.
- Responsive dashboard, history, and workspace/account settings.

## Local setup

Requirements: Node.js 24 or newer, npm 11, and Docker Desktop or another working Docker Engine.

1. Install dependencies:

   ```powershell
   npm ci
   ```

2. Start the local Supabase stack:

   ```powershell
   npm run db:start
   ```

3. Create `.env.local` from `.env.example`. Get only the local API URL and **publishable** key with:

   ```powershell
   npx supabase status --output env | Select-String '^(API_URL|PUBLISHABLE_KEY)='
   ```

   Set those values in `.env.local` and set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. The local stack runs the database migrations on first start. Email confirmation is enabled; confirmation and recovery emails are captured by Mailpit at `http://127.0.0.1:54324`.

4. Run the app:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:3000`.

Only the Supabase project URL and publishable key belong in browser-visible environment variables. Never use a service-role or secret key in the app, and never commit `.env.local`.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run db:test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit --audit-level=high
```

The database and browser tests use the local Supabase stack. Playwright exercises real signup and confirmation, password recovery, workspace creation and switching, invitation redemption and replay rejection, check-ins, streaks, tasks, goals, history, owner/member boundaries, outsider access, and desktop/mobile layouts. Dashboard screenshots are written to the ignored `output/playwright/` directory.

## Data and security

- PostgreSQL migrations in `supabase/migrations/` define the schema, constraints, row-level security, indexes, and permission-checked RPCs.
- `src/lib/data/` is the server-side read layer. Server actions validate inputs with Zod; PostgreSQL and RLS enforce record ownership and workspace roles.
- Invitations store only SHA-256 token hashes. Authenticated redemption checks expiry, revocation, remaining uses, and existing membership atomically.
- Check-in dates are assigned by PostgreSQL in the challenge timezone. Unique constraints and database triggers prevent duplicates, backdating, future dates, and edits to another member's record.
- Authenticated pages are dynamic and excluded from indexing. No service-role credential is shipped to browser code.

See [docs/design/rally-v1.md](docs/design/rally-v1.md) for the design direction, architecture, data model, and release boundary.

## GitHub Actions and release configuration

The `main` branch workflow runs lint, typecheck, unit and pgTAP checks, Playwright against local Supabase, an npm vulnerability audit, and a production build.

For a hosted deployment, create a Supabase project and configure these values through Vercel's protected environment settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (the canonical HTTPS application URL)

Apply the checked-in Supabase migrations to the hosted database and allow the canonical callback URL in Supabase Auth. Keep all provider secrets in the provider's secret store. No open-source license has been selected for this repository.
