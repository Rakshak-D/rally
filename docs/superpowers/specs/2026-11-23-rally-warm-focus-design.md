# Rally Warm Focus Design

## Intent

Refresh Rally's existing authenticated product into a clear, tactile progress tool. The primary job of Today is to help a member make one check-in, understand the group's rhythm, and see the next useful action. Keep the existing brand mark, routes, server data, RLS, and mutations.

## Goals

- Give every screen one visible primary action and a clear reading order.
- Replace tracked all-caps eyebrows, numbered navigation, tiny metadata, and mono-heavy styling with sentence-case labels and readable Plus Jakarta Sans.
- Use a warm neutral canvas, white surfaces, indigo actions, orange only for the Rally mark and streak flame, and distinct semantic success/warning/danger colors.
- Add a system-aware dark theme with a profile-menu override persisted safely in local storage.
- Make the shell, Today, History, Goals, Tasks, Settings, Help, and Profile useful at 375–1440px.
- Add profile photos and a short tagline through one additive migration and the existing authenticated Supabase session.
- Keep motion purposeful, text-equivalent, reduced-motion safe, and disabled on touch for hover/tilt.

## Non-goals and anti-goals

- Do not alter check-in, task, goal, challenge, invitation, workspace, or ownership business rules.
- Do not add a component library, chart package, image crop dependency, real-time transport, or new privileged credential.
- Do not add decorative gradients, stock imagery, generic cards, ambiguous arrows, or motion that carries meaning without text.
- Do not apply the avatar migration to the hosted Supabase project in this work.

## Approaches

1. Replace pages and styles wholesale. This is quick to sketch but risks breaking the existing server-action forms and accessibility fixes.
2. Preserve Server Component data/action boundaries, introduce focused client components for interactions, and migrate the existing CSS into token/base/shell/product/accessibility partials. This keeps mutations and authorization intact while allowing a coherent redesign. **Chosen.**
3. Rebuild the UI with Tailwind utilities. Tailwind is installed, but the application already has hand-written CSS and this would add churn without improving the product boundary.

The request specifies the selected direction and layout, so no visual axis is reopened.

## Visual system

### Color

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f7f6f3` | warm app canvas |
| `--surface` | `#ffffff` | primary panels and menus |
| `--surface-2` | `#f1efe9` | inputs and quiet wells |
| `--border` | `#e6e3db` | dividers and component borders |
| `--text` | `#1b1d22` | primary content |
| `--text-muted` | `#5b606b` | secondary content, AA checked |
| `--primary` | `#5b4bff` | actions, focus, active navigation |
| `--primary-hover` | `#4636e6` | action hover |
| `--primary-soft` | `#eceaff` | selected backgrounds |
| `--streak` | `#ff7a1a` | logo and streak flame only |
| `--success` | `#12805c` | completed/checked-in state |
| `--warning` | `#a15c00` | blocker and due-soon state |
| `--danger` | `#c0392b` | destructive action and errors |

Dark theme uses `[data-theme="dark"]` overrides and system preference until a stored preference exists. Every foreground/background pair and focus/border treatment is tested; color is never the only status cue.

### Type and shape

- Plus Jakarta Sans is the display and UI family; tabular numerals are used for dates, streaks, and percentages. IBM Plex Mono remains only for invite-link text.
- Scale: 12, 14, 16, 18, 22, 28, 36, 56px. Body is 16px/1.55. No functional text below 12px; headings never track tighter than `-.01em`.
- 4px spacing grid; controls 12px radius, cards 20px, pills 999px. Cards use restrained layered depth, with interaction feedback only where it clarifies action.
- Focus: 2px indigo with 2px offset, `:focus-visible` only.

## Layout sketches

### Today, desktop

```text
┌ 264px sidebar ┐ ┌ greeting · challenge title · day progress ─────────┐
│ logo          │ │ primary check-in card            streak ring       │
│ workspace     │ │ team list                         28-day heatmap   │
│ icon nav      │ │ recent activity                    open tasks      │
│ profile       │ │                                  active goals      │
└───────────────┘ └───────────────────────────────────────────────────┘
```

### Today, mobile

```text
┌ logo · workspace · avatar ┐
│ Good morning, Maya        │
│ challenge · day progress  │
│ check-in card             │
│ Overview / Tasks / Goals  │
│ team                      │
│ recent activity           │
└ Today · History · Goals · Tasks ┘
```

Pages are left aligned on a centered max-1200px content area. Today gives the check-in the strongest visual weight. History uses week columns and visible labels. Goals and Tasks use a true primary button and a dialog/sheet for creation. Settings shows one route-selected area at a time. Profile and Help explain Rally without introducing marketing copy.

## Interaction and accessibility

- Profile and workspace menus use semantic menu/listbox patterns, roving focus, keyboard arrows, Escape, outside-click handling, and focus restoration.
- Dialogs keep focus inside and return it to the trigger; escape closes where safe.
- Check-in notes expand inline as a group note/blocker. Existing `notes` storage remains unchanged.
- Streak, heatmap, and goal visuals always have labels/text equivalents.
- Motion tokens are limited to 120/220/480ms. `prefers-reduced-motion: reduce` removes animation and transition; `(hover: none)` disables tilt and hover depth.
- Avatar upload accepts PNG/JPEG/WebP up to 2MB, crops in canvas with zoom/drag, exports 256×256 WebP/JPEG, reports progress/errors, and has initials fallback.

## Architecture and data boundaries

- Existing protected pages keep their server-side reads and actions. New UI components consume their typed props; client state is limited to menus, tabs, crop interaction, theme preference, and transient feedback.
- Avatar storage uses one public `avatars` bucket because profile images are explicitly non-sensitive. Database Storage policies allow object insert/update/delete only at the authenticated user's fixed avatar path; public reads reveal only avatar objects.
- The migration adds nullable `avatar_path` and bounded `tagline`, preserves existing profile grants, sets bucket MIME/size limits, and adds storage policies. The application derives the object path from the authenticated session, never from a client-supplied user ID.
- Database types and server reads are updated together. No service-role key is used.

## Review against the brief

The selected plan deliberately follows the brief's specified indigo action palette and dark theme despite those choices being common in other products. Rally's point of difference is the calm shared-progress hierarchy, bright streak-only orange, concrete copy, and the interactive consistency ring/heatmap tied to real records. Repeated card borders, uppercase eyebrows, numeric navigation labels, and fake data are excluded.
