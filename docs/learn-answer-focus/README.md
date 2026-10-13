# Learn quick-check focus

## Confirmed issue and bounded repair

On October 13, 2026, real Chromium keyboard checks at 390 and 1440 CSS pixels
showed that submitting either a correct or incorrect Learn answer moved
`document.activeElement` to `BODY`: all options, including the active one, were
disabled. The next Tab did reach Retry, but focus was no longer visibly located
on a learning element while the explanation appeared.

| Before | After | Why |
| --- | --- | --- |
| Submitting an answer disables the focused option and loses visible focus | A new answer focuses its result-and-explanation paragraph | The learner has a visible, meaningful reading destination |
| Feedback is revealed as a previously hidden live region | Feedback is ordinary content with a programmatic `tabindex="-1"` focus target | Focus carries the response without a competing live-region announcement |
| Retry returns to the first answer; saved responses reappear | Both behaviors remain unchanged | Retrying is one Tab away, while opening a lesson or changing modes does not jump into a saved quiz |

The explanation uses the existing focus indicator and dark-green styling, no
new animation, and no additional ordinary Tab stop. All authored lesson text,
answer keys, progress storage formats, private notes, routes and cross-pillar
practice remain unchanged. The lab, launcher, shared assets and deployment
configuration are outside this change.

The engineering-workflow skill guides the narrow source change and release
gates; the design-engineering skill guides visible, predictable focus without
motion or a redesign. The PR-checking skill guides green-check and review
triage before merging.

## Reference and limits

[W3C APG: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#discernible-and-predictable-keyboard-focus)
describes preserving discernible focus when the active element is removed or
hidden, predictable movement and programmatically focusable `tabindex="-1"`
elements. Reviewed October 13, 2026. This implementation applies those principles
to disabling a quiz option; it is not a claim of formal WCAG certification.

Browser checks verify DOM semantics, native keyboard behavior, visible focus,
responsive layout and persistence. They do not verify screen-reader speech,
physical touch devices, learning effectiveness or camera tracking. No camera
is requested by the learning workflow.

## Checks

```powershell
python scripts/build-library.py
node --test tests/library-answer-focus.test.cjs
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-library-answer-browser.cjs
node scripts/check-library-expansion-browser.cjs
node scripts/check-single-file-browser.cjs
```

The focused runner supports `BIOLOGY_PREVIEW_URL`, `BIOLOGY_ANSWER_OUTPUT`,
`BIOLOGY_ANSWER_PACKAGED=1` and `BIOLOGY_DEPLOYED_ARTIFACT`. It checks source,
portable and live rendering, using real theme controls and original/new
concepts. The shared browser helper also runs inside the existing portable CI
checks, covering an isolated HTTP page and the copied-alone file with network
dependencies blocked. Actual CI-built artifact parity and live behavior remain
separate release gates; passing local tests alone does not mean a release is
published.
