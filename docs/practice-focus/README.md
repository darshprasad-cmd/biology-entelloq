# Keep practice destinations in view

## Bounded improvement

Solve and Reason replace their practice content after explicit actions. The
existing focus helper then suppressed browser scrolling, leaving the new question,
answer status or draft focused outside the visible page.

The accepted baseline `8554153` reproduces this with native keyboard activation
in Chromium: at 320 x 640 CSS pixels, Solve Retry leaves the question between
-1236 and -1107 pixels, and Next leaves it between -1294 and -1035. Reason's Hide
worked answer leaves its draft between -1151 and -953. The issue also reproduces
at 390, 768 and 1440 pixels. Initial Reason comparison can focus a status below
the bottom edge instead. These measurements are browser evidence, not physical
device or assistive-technology testing.

| Before | After | Why |
| --- | --- | --- |
| Retry and Next focus a question above the old answer's scroll position | Native focus scrolls the destination into view | Students can see where practice continues |
| Revealing or hiding reasoning can focus an off-screen status or draft | The existing destination is brought into view | Focus and reading position remain together |
| A tall feedback card can put its verdict behind the fixed header | Immediately center the short verdict while retaining focus on the status region | The result is readable without changing keyboard navigation |
| Layout, scoring and notes already work | Their implementation and data formats stay unchanged | This is a navigation repair, not a redesign |

The design-engineering skill guided an immediate native response rather than a
new animated transition. The engineering workflow confines production changes
to `src/library/practice-bridge.js` and its generated Reason/Solve script slots.
Initial loads retain their existing no-autofocus behavior. Existing disabled
answer controls, grading, Retry semantics and cross-pillar routes remain intact.
The optional verdict scroll is host-scoped and explicitly instantaneous, including
when reduced motion is enabled. Browser checks include hit-testing for header
occlusion, not just viewport coordinates.

## Guidance and boundaries

[W3C's focus visibility guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
explains why a sighted keyboard user needs to see the focused item. This repair
supports that usability goal; it is not a claim of full WCAG conformance.

No content, answer keys, references, curriculum tags, student storage format,
authentication, camera code, lab source, launcher, shared asset, infrastructure
or deployment setting changes. All 109 completed concepts remain unchanged;
this release adds no new lessons. Tests use isolated profiles and synthetic
input, not real student records. No tracking code is added.

## Verification

```powershell
python scripts/build-library.py
python scripts/build-library.py --check
node --test tests/practice-focus.test.cjs
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-practice-focus-browser.cjs
node scripts/check-library-expansion-browser.cjs
node tests/library-practice-browser.cjs
node scripts/check-single-file-browser.cjs
```

The focused browser helper also runs within the existing network-blocked
single-file checks, over HTTP and a copied-alone file. Source, package and live
matrices exercise narrow/wide viewports, both themes, keyboard actions and saved
work. A baseline negative control must fail on the old off-screen destination.
Release evidence is retained locally in this directory rather than committing
generated screenshots or deployment payloads.

Local candidate results: 13/13 fast-check groups; 9/9 new production-handler
tests (13/13 including existing practice tests); 8/8 viewport/theme cases each
for source and packaged pages, with 80 native keyboard actions per matrix;
20/20 isolated HTTP checks and 20/20 copied-alone file checks. The focused
matrices also verify 16 initial loads and eight saved-state replays each, with
zero page errors or camera requests. Earlier interrupted/time-out runs remain
in local evidence and are not counted as passes. The learning-workflow check
retains all 109 existing routes and private study work.

Required CI, deployment success, actual CI-artifact/live byte parity and live
changed-behavior checks are separate gates. This document does not establish
their outcome. Physical phones, screen-reader speech, webcam tracking, live AI,
login and learning outcomes are outside this verification.
