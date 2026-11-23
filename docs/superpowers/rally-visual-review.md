# Rally visual review

## Design decisions

- A warm neutral canvas keeps long progress views comfortable; white and quiet surfaces separate controls and records without making every section compete.
- Indigo identifies actions and selected navigation, green marks participation and success, and orange stays in the Rally mark and streak flame.
- Today gives the check-in first position. Team consistency, streak context, tasks, goals, and activity follow in a stable reading order.
- Rounded controls and panels share a small set of shape tokens. Motion is restrained, with static behavior under reduced-motion and no pointer tilt on touch devices.

## Final screenshots

The six requested routes have light/dark screenshots at 375px and 1440px in `output/playwright/`, named `rally-{today,history,goals,tasks,settings,profile}-{375,1440}-{light,dark}.png`. The Help route has the same screenshot coverage. The E2E suite also checks overflow at 390px, 768px, and 1024px.

The existing `output/playwright/before-interim/` images are interim captures, not a true pre-redesign baseline. They are retained without presenting them as original before screenshots.

## Remaining limitation

The styles are split into responsibility-based files, but together total 3,714 lines. The requested under-1,800-line target was not met; reducing the full component and responsive styling further needs a separate review rather than line-count-only compression.
