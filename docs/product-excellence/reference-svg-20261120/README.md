# Explore reference SVG correction

Runtime `e94c65fdf0011b852ce2de04bf9f6b9c954389d4` follows the fully validated chromatography integration `f365b98b`. The only runtime correction is seven literal coordinate separators in four lines of `src/previews/reference.js`, reflected in its generated `explore.html` slot and rebuilt portable artifact. No engine, scientific calculation, route, notebook, catalogue, dissection, specimen, webcam or shared-module source changed.

## Cause and existing impact

The templates joined a computed positive y coordinate directly to the next positive x coordinate. For example, `${93+i*16}257` became `93257`, making `Q237 93257 120` an incomplete quadratic curve instead of `Q237 93 257 120`. Chromium rejected the curve and rendered zero path length. The faulty source originated in `6e36fb99` (PR16, 2026-09-20). Its Git blob `c5ec4b20be8c3ade15a3e9893681cc5603651b42` is identical at that commit, original audit baseline `a8c303c`, released chromatography main `131a9a43` and the pre-correction product candidate.

| Original source line | Illustration | Missing separators | Invisible paths per diagram |
| --- | --- | --- | --- |
| 31 | Skeletal framework | Before 257 and 343 | 5 paired rib paths |
| 44 | Early life | Before 290 | 3 water curves |
| 45 | Microbial mats | Before 225, 337 and 486 | 6 stromatolite layer paths |
| 49 | Cambrian explosion | Before 211 | 6 segment paths |

There are 20 broken thumbnail paths. Initial Explore rendering repeats the three Early-life paths in its default selected detail, giving 23 initial parser errors. Native's two-route traversal observed 46. The before-capture flow here selected all four affected details, adding 20 errors to initial rendering, so each source/portable width reports 43. These are different interaction scopes, not contradictory counts.

## Actual before and after

`before/report.json` records the real pre-correction source and portable UI at 1440 and 390 CSS pixels, including each malformed path string and browser-measured zero length. The four selected diagrams have exactly 5, 3, 6 and 6 zero-length paths respectively. The source code was not patched or substituted in the browser.

`after-source/report.json` and `after-portable/report.json` verify all ten atlas systems and twelve timeline events at 1440, 390 and 320 CSS pixels. Every thumbnail and selected-detail path now has finite positive length. The four corrected diagrams retain exact total path counts, repeated-curve counts and independently specified endpoints. Keyboard selection and page containment also pass; no SVG parser errors, uncaught browser errors or camera calls occur.

The same diagrams, authored text and surrounding interface appear in the before/after screenshots. In particular, `before/portable-1440-timeline-1.png` and `after-portable/1440-timeline-1.png` show the previously empty microbial-mat region gaining its six layers. The skeletal mobile pair shows the restored ribs; its scroll position differs because the after check traverses every original tab, so it is a geometry comparison rather than a pixel-diff assertion. The conceptual/not-to-scale labels remain intact; this correction adds no anatomical fidelity or model-validation claim.

## Regression coverage and artifact

`tests/reference-geometry-browser.cjs` is reused by the focused source/portable runner and the existing full single-file suite at desktop and mobile widths. The full suite also rejects SVG path-parser console messages, which do not necessarily raise `pageerror`. Positive geometry, exact counts and independent endpoints prevent a removed or partially parsed curve from passing silently.

Build commands passed: `python scripts/build-previews.py`, its `--check`, `python scripts/build-single-file.py` and its `--check`. The focused runner is `node scripts/check-reference-previews-browser.cjs`, repeated with `--portable`; both completed. The Windows artifact is 45,027,873 bytes, SHA256 `cfd1e4968045417e2b4d00e8db205146212c5d0119e4cf0aa30473bbcc943364`, using CPython 3.14.5/zlib 1.3.1.zlib-ng. Catalogue counts and hashes remain identical to the [chromatography integration](../chromatography-integration-20261120/README.md).

All affected checks passed without a failed attempt:

| Check | Result |
| --- | --- |
| Preview and portable build parity | Passed |
| Focused source and portable reference browser | All 22 diagrams at 1440, 390 and 320px; zero parser/page errors or camera calls |
| Existing static contracts | 14/14 groups passed, including protected dissection and generated-source checks |
| Existing full single-file suite | 33 HTTP + 33 copied-file checks passed; four desktop/mobile invocations of the new geometry helper |
| Product source, portable and copied-alone file | All three reports complete at 1440, 768, 390 and 320px; zero page errors or camera calls |

`checks.json` and `logs/` record the sequential static, full single-file and product checks. Product adapters were unchanged, so their earlier chromatography validation remained applicable; the already-running batch also completed all three queued product modes on this artifact. No further unrelated local suites were repeated. Earlier unaffected suites retain their completed evidence in the chromatography report. Hosted CI will run the complete workflow for the new revision. This report does not claim production deployment, real-student validation or physical-device/camera testing.
