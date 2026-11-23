# Rally Stamp Card and Lanes redesign

## Intent

Replace Rally's repeated card layout with a distinctive punch-card view of shared progress. A member's check-in is a stamp; the challenge is a stage; member histories run as parallel lanes. The lanes connect Today and History so the same activity is legible across both screens.

## Goals

- Give Today one focal point: a large current run, a clear check-in action, and a shared lane view.
- Make challenge progress readable as days and members, with a 14-day window on narrow viewports and a scrollable full-range view on wider screens.
- Rework History, Goals, Tasks, Settings, Profile, and Help to use flat rows, rules, and whitespace instead of a grid of equally weighted cards.
- Use the supplied cool concrete palette, one yellow stamp accent, Big Shoulders Display for editorial numerals and headings, and Hanken Grotesk for UI text.
- Keep accessible names, focus, keyboard controls, reduced-motion behavior, persisted records, and existing route behavior.

## Constraints and scope

- Preserve routes, authentication, workspace membership/roles, check-in date rules, goal/task CRUD, and existing record history.
- Do not edit `.env.local`, commit, push, or deploy.
- No new runtime packages. Use CSS, inline SVG, and small React components.
- The user approved two narrowly scoped backend exceptions: undoing a newly created check-in for the current challenge-local day, and persisting task order.
- Keep these exceptions additive and separately authorized at the database boundary. Do not grant direct check-in DELETE or task-order column UPDATE to clients.

## Approaches considered

1. **One Stamp Card and Lanes model (selected).** A shared lane component displays actual member/day state in Today and History. This gives the product one visual idea and avoids duplicating representations of progress.
2. **Retain the heatmap and streak ring, then restyle them.** This is cheaper, but leaves the core activity split across unrelated widgets and retains the hierarchy problem identified in the brief.
3. **Render lanes from client-only sample state.** This could produce a fast visual mock, but would detach stamps from persisted check-ins and is rejected.

For the two interactions that need durable support, a frontend-only undo/reorder was rejected because it would misrepresent saved state. The selected implementation uses additive, authenticated database operations.

## Main screens

- **Shell:** 232px sticky sidebar, 100dvh; active navigation uses a yellow bar; workspace name and role are plain text. The account footer omits email. Mobile navigation stays fixed above safe-area padding without covering reachable content. Preserve existing routes and workspace selection behavior.
- **Today:** challenge title and localized date/day at top; large run numeral and check-in action; one lane component; then a plain Updates feed beside compact task and goal lists. The check-in ticket replaces the form after save.
- **Lanes:** one row per member and one square slot per day. Yellow means stamped; empty/missed/future states use outlines or a dash, with no color-only status. Today is outlined. Milestone flags have no lock icons. On wide desktop, show the full challenge; below 900px, provide a 14-day window with previous/next controls, and on mobile orient days vertically and members horizontally. Arrow keys move a roving focus; Enter opens a day detail; Escape closes it. Hover and focus reveal the member, date, and first update line.
- **History:** the same lanes, filters, compact weekly totals, and chronological feed. The requested day range is windowed/paginated so long challenges do not require unbounded page loads.
- **Goals and Tasks:** rule-separated rows, plain underlined filters, visible primary actions, segmented goal progress, compact task status squares, and drawers for existing forms. Task status cycles through to do, in progress, and done; drag and keyboard controls reorder within a status group. Goal progress segments remain individually operable and past segments open their associated update.
- **Settings, Profile, Help:** plain underlined tabs; Settings preview updates locally while editing; Profile uses a flat stats row; Help uses a connected four-step track and native disclosure elements.

## Backend additions

1. **Check-in undo:** extend the existing save RPC result with the created check-in ID. Show Undo only for a newly created check-in and for the six-second toast window in the brief. Add an authenticated RPC that deletes only that exact row when it still belongs to the caller, is for the challenge-local current day, and has not been edited since creation; apply the existing check-in rate limit. Keep table DELETE revoked and create no general DELETE policy. Existing edits do not show a destructive undo action.
2. **Task ordering:** add an integer order column, backfill deterministically from `created_at` and `id`, and add an authenticated reorder RPC. A member may move only a task they created, within the same workspace and status group. The saved ordering is shared by workspace members; the operation changes ordering only, not task ownership or content. The RPC verifies membership and both task records, serializes concurrent moves, and reindexes affected tasks transactionally. Clients receive no direct grant to update the order column.

Both additions get negative authorization and concurrency coverage. Existing status changes continue to call the current task status actions.

## Motion and visual rules

- Remove gradients, blur, soft shadows, glow, tilt, idle loops, shimmer, confetti, and load animation outside Today lanes.
- Use the hard offset shadow only on primary buttons; no hover lift.
- The one Today entrance draws columns with a short stagger. Check-in stamps animate only after a successful user action; Undo reverses the stamp and streak only while its six-second toast is active. Reduced motion switches to immediate state changes. Task status and goal segment feedback answer user actions; no other entrance or idle animation runs.
- A command palette opens on Cmd/Ctrl+K. Single-key shortcuts work only when focus is outside an editable control; Help lists the shortcuts. Existing route transitions and drawer focus behavior are preserved while adding the requested keyboard affordances.
- Use a full border around blockers, not a tinted callout or left stripe. Links are underlined and do not append arrows. FAQs use text Show/Hide controls.

## Copy and fixtures

Use sentence case and concrete labels, remove greeting-by-name and marketing subtitles, format dates as `Mon 23 Nov`, and keep metadata in separate elements. Screenshot fixtures use synthetic names (Maya, Dev, and two others), several challenge days, a reached milestone, and one non-duplicated blocker.

## Verification

Run the existing typecheck, lint, unit, database, E2E, build, dependency, and contrast commands. Add focused tests for lane date layout, keyboard traversal, check-in undo authorization and expiry, task reorder authorization/order stability, task status changes, segmented goal progress, command palette, reduced motion, and screenshot viewport overflow. Capture live-viewport screenshots for every route at 375px and 1440px in both themes, plus a short stamp frame sequence. Do not commit, push, or deploy.

## Open design calls

- Keep all challenge days in History available through bounded windows; Today defaults to the final 14 days on mobile and shows the complete challenge when it fits on desktop.
- Only the task creator can drag-reorder that task. Workspace owners do not gain new task-edit permissions through ordering.
