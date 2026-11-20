# Biology verification report

Audit began 2026-10-29; the original redesign review continued through 2026-11-03 (Asia/Calcutta). Original base: `a8c303c`. Branch: `codex/product-excellence-20261029`. Integration validation continued on 2026-11-20. Local results below do not claim hosted CI success or production merge/deployment.

## Current integrated candidate — 2026-11-20

Runtime `87df88b0117c1b54fa2c0c8667343c1e3bd1f435` combines released chromatography main `131a9a43` with the product branch, questionnaire/pollen content and navigation recovery/ownership fixes. Current Windows `dist/index.html`: **45,027,873 bytes**, SHA-256 `88e2ad8c082d75176220878e5d0c00ae6d9af85a79da3961c5fa9932a1ea64fe` (CPython 3.14.5/zlib 1.3.1.zlib-ng). Catalogue counts remain 221 Biology and 343 Physics. Compressed artifact hashes can differ across runtimes; exact source and preservation evidence is retained.

All 22 sequential validation commands passed: 14 static groups including 19 chromatography unit/integration tests; 20 chromatography browser cases; product flows on source, served portable and copied-alone file at 320, 390, 768 and 1440px; 31 HTTP plus 31 copied-file preservation checks; opening recovery/ownership; exam feedback; AI formatting; source/portable learning, visual and host-quality checks; Protein Atlas; and six-model resume, invalid-state and paused-theme checks. Build and catalogue parity also passed. [The current integration report](product-excellence/chromatography-integration-20261120/README.md) indexes exact commands, logs, screenshots, artifact hashes and the reviewed preservation-test baseline updates. Hosted CI for this exact integration remains a separate gate.

The sections below retain the original redesign baseline and November 3 results as historical before/after evidence; their artifact and check counts describe that earlier revision.

## Baseline

- `docs/product-excellence/before/browser-report.json`: 20 HTTP and 20 copied-alone-file checks passed against the actual baseline distributable, including all sections, notebook persistence, frog/cockroach rendering and Universe. Desktop and 390px screenshots are retained.
- `docs/product-excellence/before/static-checks.txt`: fresh Windows checkout initially passed 10/14 groups. The failures were exact-byte CRLF/LF drift in generated non-lab pages. The existing library/background/preview builders normalized those authored pages. No dissection bytes were rebuilt.
- Baseline mobile screenshot showed three optional tool cards occupying the first experiment viewport; baseline mobile navigation's Lab destination opened only dissection. These are actual browser observations, not source-only deductions.

## Original redesign evidence — 2026-11-03

Original reviewed artifact: `dist/index.html`, **44,939,188 bytes**, SHA-256 `6fb91ff747fb0ad0fccc298cce7b7618f1d1da921871d515ceca47eaa6d3a20e`.

| Final check | Result | Evidence |
| --- | --- | --- |
| Deterministic single-file build/check and catalogue parity | Passed; 221 Biology catalogue entries | Builder output and `assets/entelloq-biology-catalog.json` |
| Existing static/unit/source-boundary checks | 14/14 groups passed | `product-excellence/final-static.txt` |
| Product flow on authored source | Passed at 320, 390, 768, 1440px | `product-excellence/after-source/report.json` |
| Product flow on served portable artifact | Passed at all four widths | `product-excellence/after-portable/report.json` |
| Product flow on file copied alone outside repository | Passed at all four widths | `product-excellence/after-file/report.json` |
| Existing protected surfaces and routes on final artifact | 20 HTTP + 20 copied-file checks passed | `product-excellence/after-preservation/browser-report.json` |
| Model resume, corrupt state and paused-theme rendering | 6 models, 36 rejected invalid states, 6 theme/disposal checks passed | `product-excellence/model-resume.txt` |

All three final product reports have `complete: true`, zero uncaught page errors and zero unsolicited camera requests. Final source and both portable forms include real keyboard chart scrolling and the compact mobile workspace. Hosted CI, physical hardware and real-student study results are separate gates below.

`scripts/check-product-excellence-browser.cjs` exercises the actual source or portable application at 1440, 768, 390 and 320 CSS pixels. It checks guest entry, a meaningful parameter change, recorded trial, saved experiment, reset/resume, reload/resume, CSV download, natural language search, keyboard search, assignment download, submission download/import, local teacher review, horizontal containment, storage denial and explicit flag-off behavior. Screenshots and reports are under `docs/product-excellence/after-source`, `after-portable` and `after-file` when those runs complete. Complete results are authoritative only when the respective JSON report has `complete: true`.

The test also scopes Axe to the added scientific controls/graph where available and renders the actual printable scientific report to PDF for inspection. This is automated accessibility coverage, not a full WCAG certification or screen-reader speech audit. The first-meaningful-interaction timings describe this automated local test machine, not real-student usability. Screenshot instrumentation time is recorded separately and excluded; navigation and waits for actionable experiment controls remain included. An earlier concurrent run exceeded 30 seconds including screenshot capture; its failure log is retained as `source-concurrent-timing-failure.txt`.

`docs/product-excellence/model-resume.txt` records six passing real-browser model round trips and 36 corrupt-state rejection cases. Each restored model reproduces the saved variables, readings, model time and graph history, stays paused and leaves current state unchanged after invalid input.

The same model test also verifies six paused-theme changes: actual canvas bytes recolor while serialized model state, time, readings and actions remain exactly equal; after disposal, theme changes no longer repaint. This corrects a pre-existing paused-canvas dark-to-light mismatch without touching numerical models.

The existing `node scripts/check-learning.cjs` passed all 14 groups after integration, including protected dissection fingerprints, Python contracts, model/content/learning tests and source drift. Four stale-context regressions now pass in `tests/library-context-route.test.cjs`; shared notebook/classroom tests are included in the standard unit discovery. Final per-run output is retained in `docs/product-excellence/`.

## Findings and refinements

- Fixed an initial adapter bug caused by assuming the app's IIFE functions were global; `BioShell` now exposes an explicit narrow adapter.
- Made the classroom pilot available through the mobile Explore sheet after its first desktop-only integration proved inaccessible on a 768px viewport.
- Replaced a too-exact flag-off test label with its real existing text, which includes an arrow; the original entry behavior was intact.
- Inspected actual 390px screenshots, enlarged controls/labels, separated the bottom navigation from floating controls and made scientific graphs horizontally scrollable while retaining the readable trial table.
- Independent screenshot review still found floating assistant/switch buttons covering Record and Save. Replaced active-lab floats with contextual actions, retained the original panels, and added three-point hit tests through all ancestor frames, 44px targets, actual panel open/close, focus restoration and launcher restoration after navigation.
- Independent failure injection found that a legacy notebook quota failure could save an older stored note alongside current model state. The adapter now uses a validated immutable snapshot of live notes, trials and graph selection. Targeted quota and independent revision-conflict checks require current draft data, preserve the original record, verify rescue exports and retain an explicit original-notebook-unsaved warning.
- Added a same-route Photosynthesis comparison at the baseline's 390×844 CSS viewport, light theme and page top. Both full-scale and baseline half-device-scale screenshots are retained; differences in image pixel dimensions must not be mistaken for changes in CSS layout size.
- The first comparison still showed too much toolbar above the apparatus. Narrow screens now retain Record/Save and visible status, disclose secondary saved-work/tools, and place the apparatus ahead of the prediction form in both visual and DOM order. The existing Experiment jump remains visible. Failure messages never disappear into the disclosure.
- The final mini-chart refinement gives model and notebook SVG labels a rendered 14px font on narrow screens, with native horizontal scrolling. Model graph regions can receive keyboard focus; actual ArrowRight interaction verifies scrolling at 320 and 390px.
- Preserved failed-attempt logs separately rather than presenting a clean-only history as the baseline.

## Evidence boundaries and exact blockers

- No recruited students are available in this session. Real student usability validation and recorded participant findings remain a release gate; browser automation is not substituted for that evidence.
- No physical webcam, iOS device, VoiceOver session or hardware hand-tracking trial was performed. Existing virtual dissection bytes and lifecycle tests are preserved, and browser runs assert no unsolicited camera requests.
- No cloud synchronization or private classroom backend exists in the static architecture. Classroom mode is a feature-flagged local file exchange with honest persistence states; production school use requires privacy/permission review and real teacher validation.
- No production deployment is permitted without explicit user approval. Local staging success is not hosted CI success, production-byte parity or live interaction verification.
