# Evidence tables: keep conditions beside results

## Bounded reading improvement

The accepted library has 109 authored evidence tables: nine with two columns,
78 with three, and 22 with four. On phones, horizontal scrolling reveals the
later results but can remove their row labels from view. Baseline browser
inspection reproduced that loss in 28 of 36 stress-topic/theme/width cases.

| Before | After | Why |
| --- | --- | --- |
| A result can be visible while its condition has scrolled away | A narrow first column stays visible during horizontal scrolling | Keep the relationship between a condition and its evidence readable |
| Every column requires at least 120 pixels | Mobile labels use 100 pixels and wrap; result columns keep their existing minimum | A 320-pixel viewport can show the label and a complete result column together |
| Table borders move with the scrolled cells | Opaque theme-matched label cells retain their separator and row shading | Prevent text behind a pinned label from showing through |

Only the mobile evidence-table CSS changes. Existing native scrolling and
keyboard focus remain; no animation, duplicated card layout, extra controls,
runtime dependency or event handler is introduced. Desktop tables retain their
existing layout. The renderer, all lesson text/answers/references, private
study state, routes, launch page, shell and dissection lab are unchanged.

The engineering-workflow skill limits the patch to the canonical stylesheet
and its narrow generated Learn/Reason/Solve slots. The design-engineering skill
informs the unanimated, native behavior and review of small-screen edge cases.
The PR-checking and release-verification skills gate merge on green checks and
separate deployment success from exact live artifact parity and live behavior.

## Reference basis

- [W3C WAI: Tables tutorial](https://www.w3.org/WAI/tutorials/tables/): retain the
  native table, caption, column headings and row headings, rather than replacing
  their relationships with a visually styled non-table structure.
- [MDN: CSS position](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position):
  sticky positioning stays tied to its scrolling ancestor and needs an inset.

Checked October 15, 2026. These guide implementation; they do not certify this
product's accessibility. No biological content, source asset or empirical
dataset is added or changed by this release.

## Verification

- Native-table unit contracts cover all 218 Learn/Reason presentations,
  exact authored cells and header associations, escaping, and unchanged actual
  private-study records, review state and exported notes.
- Real-browser checks must prove labels and a complete selected result column
  are visible simultaneously, including edge/center hit-testing to detect
  overlapping cells and explicit opaque-background checks to prevent bleed-through.
  Native arrow-key scrolling must reach every result column without changing
  route, notes or review state. Geometry alone is insufficient.
- Exercise all 109 topics on phones, plus long labels, long values, four-column
  tables, Learn/Reason, both themes, narrow packaged frames and desktop widths.
- Reuse the small browser helper in the existing single-file check, so the
  regression runs in normal CI and in copied-alone/offline mode without a
  deployment-workflow change.
- Disposable original-CSS and transparent-label negative controls must fail the
  same browser contract. They change only isolated test documents, which are
  reloaded before verifying the actual application.
- Run normal content, answer, reference, fingerprint, build-sync and learning
  workflow checks unchanged; rebuild and validate the distributable.
- After green PR checks and merge, verify the actual CI Pages artifact against
  live HTTPS bytes, then repeat the focused browser flow on the live package.

```powershell
python scripts/build-library.py
node --test tests/library-evidence-tables.test.cjs
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-evidence-tables-browser.cjs
node scripts/check-library-expansion-browser.cjs
node scripts/check-single-file-browser.cjs
```

Browser keyboard/touch input is synthetic. Physical mobile hardware,
screen-reader speech and educational outcomes require separate validation.
No camera is requested by these checks.
