# Rally V1 Product and Architecture

## Product direction

Rally helps a small group sustain daily effort through a shared challenge, personal check-ins, practical goals and tasks, and visible accountability. The interface is an editorial productivity workspace: warm paper surfaces, ink typography, a narrow orange rally mark, dark green progress accents, crisp dividers, and deliberate open space. The desktop dashboard prioritizes today's check-in and team activity; mobile uses a compact top bar and bottom navigation.

## Visual system

| Token | Color | Use |
|---|---|---|
| Paper | `#F5F3EE` | Main warm canvas |
| Ink | `#171916` | Headings, body text, primary controls |
| Secondary | `#60645F` | Supporting copy and timestamps |
| Rally orange | `#E4572E` | Brand symbol and non-text progress accents |
| Deep green | `#28665B` | Completed state and progress marks |
| Soft line | `#DDDCD5` | Dividers and input/panel borders |

Use Archivo for headings and body copy, with IBM Plex Mono only for dates and numeric progress. Load both through `next/font` so the browser receives same-origin font assets. Keep primary text dark; orange is an accent, not small text, to preserve contrast. Buttons and fields use 10px corners; panels use 14px corners; chips stay compact. Borders carry hierarchy; shadows are reserved for native overlays.

Desktop dashboard at 1440px:

```text
┌────────────── 232px workspace rail ──────────────┬─────────────────────────────────────────────┐
│ Rally mark                                       │ Workspace / date / member controls         │
│ Workspace switcher                               ├───────────────────────────┬─────────────────┤
│ Today · History · Settings                       │ Today's check-in editor   │ Challenge       │
│                                                  │                           │ Streak + days   │
│                                                  ├───────────────────────────┤ Open tasks      │
│ Member list / workspace actions                 │ Recent team activity      │ Goal progress   │
└──────────────────────────────────────────────────┴───────────────────────────┴─────────────────┘
```

Mobile at 390px keeps one left edge and one column: Rally/workspace header, challenge day, check-in editor, open tasks, recent member updates, then fixed bottom navigation. Nothing becomes a row of identical stat cards; progress uses large type, a compact date strip, and member rows.

The recognizable moment is the three-part convergence mark that meets at one shared point. Keep the rest quiet: no photo wallpaper, gradients, decorative floating objects, arbitrary animation, or motivational filler. Use motion only to answer a user's action, and honor reduced-motion preferences.

## Application boundaries

- Next.js App Router renders authenticated workspace pages on the server. A server-only data access layer authorizes reads and returns minimal DTOs; every server action validates the caller and mutation with Zod and uses the signed-in Supabase SSR client.
- Supabase Auth owns credentials and sessions. Cookie refresh runs in the Next.js request proxy, which is not an authorization boundary. Browser code receives only the public URL and anon/publishable key.
- PostgreSQL owns records, uniqueness, timestamps, local-day assignment, invite redemption, and authorization. RLS applies to every app table; security-definer functions use a fixed search path, narrow grants, `auth.uid()`, and explicit membership checks.
- Domain utilities calculate challenge-local dates, inclusive day numbers, remaining days, and streaks with calendar dates. They are isolated from UI and covered by Vitest.
- The challenge timezone is selected at creation and is the authority for check-in dates and challenge-day displays. Workspace timezone is the default and remains configurable.

## Data and permission model

`profiles` maps one auth user to a display name. `workspaces` and `workspace_members` define isolated groups with `owner` or `member` roles. `workspace_invites` stores only a token hash, expiry, revocation time, usage limit and count. Redemption requires an authenticated user and is a single database transaction that checks expiry, revocation, capacity, and existing membership before creating a member row.

`challenges` preserve title, description, start/end dates, timezone, creator and lifecycle status. Challenge ranges within a workspace cannot overlap, ensuring there is at most one active challenge. `checkins` are keyed by challenge, user and challenge-local date; the database assigns today's date and rejects future/backdated writes. Goals and tasks are workspace-scoped and challenge-associated; users can mutate only records they own, while owners can manage workspace-level settings and challenges.

## Important behavior

- Authentication is required before private workspace content is queried or an invitation is redeemed. Invite previews reveal no workspace name, members, or progress.
- Workspace and challenge local-day changes follow IANA timezones and calendar dates, including daylight-saving changes.
- A check-in can be edited only on the current challenge-local day. Its timestamp is generated by PostgreSQL.
- A current streak ends on the current local day or yesterday when no check-in exists today. Longest streak and consistency use distinct completed local dates.
- Challenge duration is date-driven; the default onboarding choice is 60 days but owners can choose other inclusive ranges.
- Historical challenges and their check-ins remain queryable. Dashboard, history and feed reads are membership-scoped and bounded.

## Verification shape

Vitest covers date, streak, schema and formatting rules. Supabase pgTAP tests cover RLS, role changes, invite races and check-in integrity. Playwright covers authenticated flows, route protection, workspace switching, ordinary task and goal actions, and mobile usability against local Supabase when its services are available. CI runs typecheck, lint, unit tests, database tests where infrastructure is available, and a production build.

## Release boundary

Public GitHub and Vercel release requires a validated main-branch commit. Supabase, GitHub and Vercel credentials are supplied only through their secure provider/local configuration. Missing account access or environment configuration is reported as a concrete blocker; it is never replaced with fake users, data or deployment claims.
