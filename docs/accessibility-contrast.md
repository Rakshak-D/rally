# Rally contrast audit

Run `node scripts/audit-contrast.mjs` to calculate WCAG contrast ratios from the light, explicit dark, and system-dark theme tokens in `src/app/styles/tokens.css`.

The audit checks body and muted text on canvas, surface, quiet, and semantic surfaces; primary text and selected states; button labels; success, warning, and danger labels; primary focus rings; and the strong borders used by controls.

| Theme | Lowest text pair | Lowest text ratio | Lowest control/focus ratio |
| --- | --- | ---: | ---: |
| Light | Primary text on selected surface | 4.56:1 | 3.06:1 |
| Dark | Primary button label | 4.82:1 | 3.29:1 |

All audited text pairs meet 4.5:1. Focus rings and control borders meet 3:1. `--border` remains a soft decorative separator for cards and sections; interactive field outlines use `--border-strong`, and keyboard focus uses the primary ring.

The script also verifies that explicit dark tokens and system-preference dark tokens stay aligned.
