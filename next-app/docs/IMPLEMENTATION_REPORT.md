# Biology Entelloq implementation report

## Outcome

The former sparse launch screen and single-path lab now offer a richer learning experience: an editorial launch page, guided investigation, accessible 2D atlas, procedural 3D dissection, reversible tools, ordered assessment, mastery feedback, saved progress, grounded tutor modes, and viva.

The interface is responsive from phone to desktop, respects reduced-motion preferences, exposes visible focus states and landmarks, and has a WebGL error fallback. Reviewed educational content is visibly distinguished from generated tutor responses.

## Earlier production performance baseline

These measurements were recorded before the dark-green visual revision and are not a fresh performance claim for the current design. Production Lighthouse reports are saved beside this file in `docs/performance/`. See [the design update](DARK_DESIGN_UPDATE.md) for current validation.

| Surface | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Launch page | 97 | 100 | 100 | 100 | 2.3 s | 140 ms | 0 |
| Lab entry | 82 | 100 | 100 | 100 | 3.5 s | 300 ms | 0 |

The final lab-entry transfer was 424 KiB under Lighthouse's mobile profile. WebGL is deferred until the learner chooses an input route, and the heart curriculum is split from its Three.js renderer. This improved the measured lab score from 47 during the hardening pass to 82.

Static production JavaScript changed from 2,037.0 KiB across 20 files at baseline to 1,940.5 KiB across 20 files, a 96.5 KiB (4.7%) reduction despite the added product scope. CSS grew from 43.4 KiB to 72.4 KiB to support the new marketing and responsive lab systems.

Lighthouse occasionally reports a Windows temporary-directory cleanup warning after writing a complete JSON report; report integrity and category values were verified after each run.

## Verification

- ESLint: clean.
- TypeScript: clean.
- Vitest: 10 of 10 tests passed.
- Playwright: 9 journeys passed and 1 intentional mobile skip; includes desktop/mobile navigation, the accessible atlas, saved progress, 3D load, reduced motion, and axe scans.
- Automated accessibility: zero axe violations on the launch page and 2D lab in both tested viewports.
- Dependency audit: zero known production or development vulnerabilities after upgrading Next.js.
- Production build: successful; `/` and `/lab` are statically prerendered and `/api/instructor` is server-rendered on demand.

## Product proof

Current screenshots are in `docs/screenshots/`. They are generated from the running application by the Playwright journeys rather than from mockups.
