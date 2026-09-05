# Dark botanical design update

The landing page now uses the same near-black and emerald palette as the practical workspace. The warm cream surfaces were removed at the user's request.

## Changes

- Unified dark page, card, navigation, and lab surface tokens.
- White headings, emerald emphasis, restrained borders and glowing primary actions.
- A new lightweight original SVG heart with surface, flow, and chamber views.
- Revised hero, specimen collection strip, clearer source panel, and responsive spacing.
- Sample mastery is identified as an example. Removed a performance target from the specimen preview and replaced it with useful interaction guidance.

The SVG preview is stylized and not a validated clinical model; the existing practical supplies the teaching content. This design pass does not change the scientific simulation, camera tracking, or AI-provider behavior.

## Verification

The desktop/mobile browser journeys passed, including the 3D and accessible atlas routes, saved progress, reduced motion, and automated accessibility scans (9 passed, one intentional mobile 3D skip). Lint passed. Viewport screenshots show desktop, tablet, and phone layouts; the original performance report remains a record of the earlier production build rather than a new claim for this visual revision.

## Publishing

The existing public site is a separate static product. This application is collected in `next-app/` on the `codex/biology-dark-lab` review branch of the same GitHub repository. The branch preserves the existing root pages and domain configuration. Publishing its source does not replace the public homepage.

Run the refreshed application from `next-app/` with `npm ci` and `npm run dev`. A deployment destination is a separate choice: add a new lab path, replace the homepage, or retain the branch for review.
