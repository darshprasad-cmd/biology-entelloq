# Keep the learner at the destination

## Bounded improvement

Learn replaces its catalog or lesson DOM when a hash route changes. Previously,
activating a search-result link by keyboard removed the focused link and left
focus on the document body. Chromium's next Tab reached the new lesson's Learn
breadcrumb instead of continuing into its content. The same loss occurred on
return to the catalog. Reproduced on accepted revision `2903edc` at 320 and
1440 CSS pixels, with no page errors.

| Before | After | Why |
| --- | --- | --- |
| Opening a different concept scrolls the lesson but leaves focus on the body | Its existing heading receives programmatic focus | The reading position and keyboard position agree |
| Returning to a field loses focus and starts above the catalog | The results heading receives focus and scrolls into view | Students resume at that field's concepts |
| Returning to the library removes the active breadcrumb | The library heading receives focus | The new view has an identifiable starting point |

Only `src/library/learn.js` and its generated Learn slot change in production.
The design-engineering skill guided immediate, non-animated navigation rather
than a layout change. The engineering workflow keeps the fix within existing
route and focus contracts. The initial page render does not move focus; changing
explanation modes retains the existing selected-tab behavior. Filtering and
typing retain their existing focus-safe updates. Unknown and legacy cell or
microscope hashes do not receive an unrelated heading focus.

All 109 concepts, authored diagrams, explanations, questions, answers, reference
lists, student storage formats, cross-pillar links, application chrome, lab,
shared assets and publishing settings remain unchanged. No new dependencies,
analytics, network requests or camera action are introduced.

## Guidance and limits

[W3C Understanding Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
describes a meaningful, operable keyboard sequence and permits programmatic
focus on static content when it supports that sequence. This informed the
heading destination; it is not a claim of full WCAG conformance. The production
heading uses `tabindex="-1"`, so it does not add a repeated stop to normal Tab
navigation. Existing focus-visible styling and responsive layouts are reused.

Browser assertions validate DOM focus, real keyboard navigation, route state,
storage preservation and layout at CSS viewport sizes. They do not validate
screen-reader speech, physical-phone hardware or educational outcomes.

## Verification

The focused browser helper is reused in the existing isolated single-file test,
covering HTTP and copied-alone offline packaging without a CI settings change.
The dedicated runner supports source, packaged and live origins. Release also
requires the broad learning workflow, preservation/source checks, green PR CI,
successful Pages deployment, exact published-artifact/live byte parity and a
live run of the changed navigation behavior.

```powershell
python scripts/build-library.py
node --test tests/library-route-focus.test.cjs
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-library-route-browser.cjs
node scripts/check-library-expansion-browser.cjs
node scripts/check-single-file-browser.cjs
```

Verification reports and screenshots are retained locally under this directory.
Tests use isolated browser profiles and synthetic input, not real student data.

The focused runner uses `BIOLOGY_PREVIEW_URL` and `BIOLOGY_ROUTE_OUTPUT`.
Set `BIOLOGY_ROUTE_PACKAGED=1` for the packaged or live application. For live
verification, `BIOLOGY_DEPLOYED_ARTIFACT` must identify the downloaded successful
Pages artifact; the runner checks served bytes before exercising the interface.

Local verification on October 22, 2026 passed all 13 fast-check groups, 10 new
router regressions (14 with existing answer-focus tests), eight width/theme
cases each on source and package, and 18 isolated checks each over HTTP and a
copied-alone file. Each focused matrix also verified 16 initial-load assertions
without autofocus. Search and answer-feedback regression matrices and the
109-concept discovery / 36-expanded-lesson workflow passed. No page errors or
camera requests occurred. The unchanged accepted source fails the new browser
assertion at the lost lesson focus, independently of the production fix.

Original fixtures and all authored content, lab, launcher and shared assets
retain identical canonical Git blobs. Generated Learn differs only by the
source-module substitution. CI, deployment and live verification remain
separate gates; these local results alone do not establish publication.
