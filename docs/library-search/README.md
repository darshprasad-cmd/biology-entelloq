# Search-to-results accessibility

## Bounded improvement

The 109-concept library is unchanged. This release makes its existing search
usable without traversing the suggestions, study paths and fourteen field
buttons each time a student wants to reach a match.

| Before | After | Why |
| --- | --- | --- |
| Enter in search only cancelled submission | Enter or Show results focuses the results heading | Direct keyboard and mobile navigation without changing the route |
| Each update replaced the results status node | One persistent, atomic status reports the count and selected field/curriculum | The live region exists before the change it describes |
| The empty state offered advice but no control | A local reset restores search focus and clears the same filters as the original reset | Recovery is available beside the empty result |
| Reset rebuilt the full catalog header | Reset updates controls and results in place | Open study paths and the live region remain mounted |

Typing and selecting filters do not move focus. Results still update immediately;
the explicit jump uses no animation. Scoped styles retain the accepted layout,
themes and 44px touch targets. Content, answer maps, references, storage formats,
dissection, shared assets, launcher and deployment settings are not changed.

The engineering-workflow and design-engineering skills guided the narrow fix,
focus preservation and regression checks, without a redesign or new dependency.

## Evidence and references

Before rebuilding the unchanged main page, a real Chromium check reproduced:
Enter left focus on `bl-search`, no result focus target or jump existed, and an
impossible query had zero cards with no empty-state reset button.
The new helper was also run against the unchanged `HEAD:learn.html` response:
it failed at the missing persistent heading assertion, as expected.

- [W3C ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22): keep the
  status role present before the status message occurs; explicitly mark atomic
  updates for environments that do not consistently apply the implicit value.
- [W3C Bypass Blocks](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html):
  direct access to results avoids repeated keyboard traversal of filter controls.

These references guide implementation; they do not certify full WCAG compliance.
Browser assertions cover DOM semantics, focus, node identity, route/storage
preservation, reset recovery and responsive layout. They do not establish actual
screen-reader speech, physical-phone behavior or measured learning outcomes.

## Checks

`tests/library-search-browser.cjs` is reused by the existing single-file check,
so the same behavior is exercised over isolated HTTP and a copied-alone file
with network dependencies blocked. No CI configuration change is needed.

```powershell
python scripts/build-library.py
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-single-file-browser.cjs
node scripts/check-library-search-browser.cjs
```

The focused helper is also run on source and deployed Learn at 320, 390, 768
and 1440 CSS pixels in both themes. Live release verification requires exact
equality with the actual CI-produced deployment artifact, not the local package.

Local verification on October 10, 2026 passed all 13 fast-check groups, the
four-width/two-theme source matrix and the full learning expansion workflow
(including cross-pillar drafts and all 108 recently added question rationales).
The portable check passed 12 checks in each HTTP/file mode, including the new
search coverage on desktop and mobile. Original fingerprint fixtures and all
content, lab and deployment sources are unchanged. CI and live parity remain
separate release gates; local results alone do not establish publication.
