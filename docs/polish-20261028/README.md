# Interface polish: study setup and everyday navigation

Requested scope: improve rough Biology UI, especially the visual quality of the
first-visit questionnaire. This is presentation and navigation work, not a new
curriculum, assessment, model or scientific-content release.

## Design review

| Before | After | Why |
| --- | --- | --- |
| Flat full-width questionnaire with uneven phone wrapping | App-matched charcoal/mint study-setup panel, balanced type and deliberate choice grids | Make the first screen feel like the existing product |
| Class choices wrap 3+1; session times wrap onto multiple lines | Four class cards on desktop, two-by-two on smaller screens; three single-line session choices | Predictable scanning and touch targets |
| Privacy explanation appears after a long form on phones | A concise device-local note appears before the form; full explanation remains below | Explain the boundary before the student answers |
| All search triggers disappear below 850px | An accessible 44px search button stays in the app header; dialog says Close, not only Esc | Make search usable without a keyboard |
| Labs search leaves matching cards below the phone viewport; returning from a bench loses focus | Enter/Show results focuses a persistent results heading; All labs restores the originating card | Preserve discovery context without stealing focus while typing |
| Me topic description shrinks to about 38px at 320px width | Status/ring moves below a 172px reading column | Readable progress cards without changing progress calculations |

The four questions, option values, defaults, recommendation logic, local storage
keys, native inputs, Skip/Cancel/Edit/Reset and explicit deep-link handling are
preserved. The setup controller still runs before the large portable manifest.
The added copy describes existing learning approaches, not inferred mastery.

Questionnaire overrides are scoped to `data-view=questionnaire`; curriculum and
practical screens retain their layout. New content is dependency-free; no fonts,
images, analytics, accounts or camera permissions are fetched for setup.
The familiar app shell, dark-green palette, working dissection lab, scientific
models, protected launcher regions and original fixtures are unchanged.

Captured previews: [desktop](questionnaire-browser-final/questionnaire-1440.png)
and [phone](questionnaire-browser-final/questionnaire-390.png). These are real
rendered screens from the packaged application, not design mockups.

## Source/build ownership

- `src/cbse/entry.js` / `entry.css`: first-visit presentation, embedded by the
  portable builder. The controller's data/routing behavior is retained.
- `app.html` and `src/physics-layout/app.css`: search trigger/label; synchronize
  with `scripts/sync-physics-shell.py`.
- `src/library/labs.js` / `lab-catalog.css`: catalogue navigation only;
  synchronize with `scripts/build-library.py`. No lab model changes.
- `me.html`: eight narrowly scoped responsive CSS lines.

## Local verification

- Fast checks: 14/14 groups passed, including original lab boundaries, source
  synchronization, content/answers, model contracts and syntax.
- Packaged application: 30 HTTP and 30 copied-alone offline checks passed.
  Existing checks are retained; added assertions cover search, Labs return focus,
  Me geometry and first-visit setup. No automatic camera requests or uncaught
  application errors were observed.
- Questionnaire: four widths (1440/768/390/320), native focus, equal target sizes,
  selection styling, unchanged questions/defaults, save/edit/reset, deep links,
  blocked storage, held manifest and file-offline use passed.
- Automated WCAG checks: questionnaire and dashboard passed at all four widths.
- Labs navigation: four widths in both themes passed for source, packaged HTTP
  and direct-file builds. Portable theme checks use the real Appearance control.
- Me: 16 source cases (four widths, both themes, empty and synthetic saved
  practice), keyboard sample-preview round trip, and exact notebook/history
  preservation passed. Packaged checks also exercise 1440/390/320px layouts.
- Actual screenshots were inspected, not only overflow counters.

An initial catalogue test ran against a stale distribution and failed before
any case completed. A second harness issue used native location inside a
packaged srcdoc instead of the existing logical-route adapter. The harness was
corrected to exercise that adapter; no product assertions were removed. Failure
evidence and subsequent successful runs remain in the local QA directory.

Reproduce with the existing free runtime (set `BIOLOGY_PLAYWRIGHT_MODULES` when
needed):

```text
python scripts/sync-physics-shell.py --check
python scripts/build-library.py --check
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-cbse-entry-browser.cjs
node scripts/check-cbse-accessibility.cjs
node scripts/check-single-file-browser.cjs
node scripts/check-opening-browser.cjs
node scripts/check-lab-catalog-navigation-browser.cjs --portable
node scripts/check-lab-catalog-navigation-browser.cjs --file
node scripts/check-interface-polish-browser.cjs
```

Emulated Chromium/SwiftShader and automated accessibility checks do not certify
physical phones, screen-reader speech, webcam tracking or scientific accuracy.
No authentication, billing, infrastructure or deployment setting changed.
Hosted checks, deployment identity and live behavior must be reported separately
in the release PR; local success alone is not deployment evidence.
