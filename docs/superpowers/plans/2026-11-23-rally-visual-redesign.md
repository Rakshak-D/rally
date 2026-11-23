# Rally Visual Redesign Implementation Plan

> **For agentic workers:** Execute tasks in order and use the existing branch. Each phase is tested and committed before the next phase. No subagents or production database changes.

**Goal:** Deliver the specified Warm Focus UI redesign, interactive help/profile/theme features, and secure user avatar upload without regressing Rally's existing business behavior.

**Architecture:** Keep App Router pages and existing server reads/actions as the source of truth. Use small client components for menus, dialogs, responsive tabs, theme state, crop interaction, and feedback. Keep CSS tokenized and split by responsibility; use one additive Supabase migration for profile metadata and avatar storage.

**Tech Stack:** Next.js 16.4.6 App Router, React 19.3.1, strict TypeScript, existing hand-written CSS/Tailwind 4 import, Supabase SSR/Storage/Postgres/RLS, Vitest, pgTAP, Playwright, axe-core. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-11-23-rally-warm-focus-design.md`

## Global Constraints

- Preserve every existing route, server action, validation schema, RLS policy, and behavior.
- Only database change: one additive avatar/tagline migration; never apply it to the hosted project in this work.
- No new runtime dependency except none; image crop is canvas-based.
- All motion respects reduced motion; hover/tilt disabled for touch.
- Maintain WCAG AA, visible focus, keyboard operation, and no color-only status.
- No horizontal overflow at 375, 390, 768, 1024, or 1440px.
- Never read, modify, stage, or print `.env.local`; commit no secret.
- Create one local `main` commit per implementation phase.
- Final checks: typecheck, lint, unit tests, database tests, Playwright, production build, axe, responsive screenshots, console/hydration check.

## Review Focus

- Theme localStorage unavailable or malformed: render in system mode without hydration errors.
- Avatar upload oversized, wrong MIME, empty, or failed: keep old avatar and show a precise accessible error.
- Avatar upsert/remove for another user's path: reject through Storage RLS and server-derived identity.
- Client JavaScript disabled or delayed: GET filters/forms and auth/record actions remain functional.
- Touch/reduced-motion preference: do not run tilt, idle loop, or entrance animation.

---

### Phase 1: Foundations

**Files:** `src/app/layout.tsx`, `src/app/globals.css`, new `src/app/styles/*.css`, new `src/components/ui/icons.tsx`, new theme preference component/helper, design doc, this plan.

- [x] Establish Plus Jakarta Sans via `next/font/google`; remove global IBM Plex Mono except invite-link token text.
- [x] Add light/dark design tokens, semantic states, spacing/shape/type scale, focus, reduced-motion, and touch rules.
- [ ] Split CSS by tokens/base/components/layouts/media; remove obsolete selectors while keeping total under 1,800 lines. The styles are split into partials and dead selectors were removed, but the combined stylesheet is 3,714 lines after the redesign; this size target remains unmet.
- [x] Add original small inline SVG icon set and reusable primitive styles (buttons, fields, chips, surfaces).
- [x] Add theme state synchronization with safe localStorage access and system default.
- [x] Verify fonts/build, token contrast, and responsive baseline; commit `style: establish Rally warm focus foundations`.

### Phase 2: Shell

**Files:** `src/components/app/app-shell.tsx`, new `profile-menu.tsx`, new `workspace-switcher.tsx`, `src/components/dashboard/member-avatar.tsx`, CSS partials, Playwright tests.

- [x] Replace numbered nav and native workspace selects with icon nav, a keyboard-accessible workspace menu, create/join entry points, and route-preserving switch.
- [x] Replace static profile block with a keyboard menu for Profile, Settings, Help, theme, and Sign out; add the same mobile entry point.
- [x] Add mobile top bar, icon+label bottom tabs, safe-area spacing, and a subtle route pending indicator.
- [x] Add interaction tests for menu keys, focus return, outside close, and workspace route preservation; commit `feat: redesign Rally app shell`.

### Phase 3: Today

**Files:** `src/app/(protected)/app/page.tsx`, dashboard components, new `streak-ring.tsx`, new `consistency-heatmap.tsx`, new `first-run-helper.tsx`, new `note-callout.tsx`, CSS partials, unit/Playwright tests.

- [x] Replace generic title with workspace-timezone greeting, challenge title, and day progress.
- [x] Make the check-in the primary card; move note/blocker expansion inside it and show a compact saved summary after completion.
- [x] Add SVG streak ring, milestones, 28-day heat strip, first-run helper, member avatars, status, and readable progress.
- [x] Sort self first, then checked-in members; add relative activity time and note callouts.
- [x] Add tests for ring milestones, helper dismissal failure safety, note/blocker behavior, and no-data states; commit `feat: focus Today on shared progress`.

### Phase 4: History, Goals, Tasks

**Files:** protected history/goals/tasks pages, `src/components/history/*`, `src/components/product/*`, new dialog/status/filter components, CSS partials, Vitest/Playwright tests.

- [x] Auto-apply challenge/member filters while preserving GET operation without JavaScript.
- [x] Build a labeled 12-week/challenge-range heatmap and readable grouped feed with expanded note callouts.
- [x] Add active/completed and task-status query filters, clear count chips, real New Goal/Task dialogs, and intentional empty states.
- [x] Strengthen progress displays, add quick goal progress entry, task status control, due date states, and assignee avatars without replacing existing actions.
- [x] Test filters, dialog Escape/focus restore, task progression, and progress accessibility; commit `feat: redesign progress history goals and tasks`.

### Phase 5: Settings and Help

**Files:** `src/app/(protected)/settings/page.tsx`, new `settings-tabs.tsx`, new `/help` route, CSS partials, Playwright tests.

- [x] Split Profile, Workspace, People, Challenges, and Account into linkable route-selected tabs while retaining anchors and existing forms/actions.
- [x] Improve invitation/member context and keep confirmations.
- [x] Add protected Help page with four steps, FAQs, keyboard tips, and Settings link.
- [x] Verify each tab has a direct URL and all prior controls still work; commit `feat: organize settings and add Rally help`.

### Phase 6: Profile and avatars

**Files:** one new `supabase/migrations/*_profile_avatar_and_tagline.sql`, `supabase/config.toml`, database types, profile validation/actions/form, new `/profile` route, avatar editor/helper, MemberAvatar, dashboard/history/settings data selects, pgTAP/Vitest/Playwright tests.

- [x] Write failing validation/RLS tests first; implement bounded tagline and avatar fields, public bucket size/MIME rules, owner-folder policies, and local bucket configuration in one additive migration.
- [x] Add server-derived upload/remove actions, strict file/type/size/path checks, and rollback/error handling.
- [x] Add canvas crop/zoom/drag UI and profile stats; use fallback initials everywhere.
- [x] Update member/activity/history/goal/task/shell data so avatars appear consistently and remain workspace-scoped.
- [x] Apply and test the migration against local Supabase only, covering own/other object permissions, tagline bounds, upload/remove/reload; commit `feat: add Rally profiles and avatars`.

### Phase 7: Polish

**Files:** CSS partials, changed components, `e2e/rally.spec.ts`, docs/screenshots.

- [x] Inspect light/dark screenshots for Today, History, Goals, Tasks, Settings, Profile at desktop and mobile; adjust visual hierarchy and spacing.
- [x] Run axe on every supported route/theme at 375 and 1440px; fix every violation.
- [x] Verify all required widths, no console/hydration errors, reduced-motion behavior, keyboard menus/dialogs, and contrast pairs. CSS line count is 3,714, so the under-1,800 target remains open.
- [x] Run all required commands and capture screenshots to ignored `output/playwright/`; commit `style: polish Rally warm focus interactions`.
