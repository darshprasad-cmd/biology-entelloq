# Follow-up usability QA

The original dark/green format and dissection boundary remain in scope as
constraints, not redesign targets. No lab was opened, rendered or interacted
with. Hidden lab prefetch requests were blocked inside isolated test browsers.

## Focused local run

`local-followup.json` records a successful 8.5-second run on 5 September 2026:

- First Tab on the landing page reaches Skip to content; activating it focuses
  the single main landmark. Native FAQ disclosures work by keyboard and pointer.
- Ctrl+K and Meta+K from an embedded lesson input open the parent app's unified
  search. Escape returns to that exact input without losing its typed query.
- The last lesson lens and prediction survive returning and reloading.
- Answer feedback has explicit text labels and receives focus. Retake clears
  the current answer, focuses the first option and accepts a fresh prediction.
- Lessons remain independent; malformed JSON and stale question signatures are
  handled safely.
- With browser storage denied, the mobile lesson remains usable and explicitly
  states that progress lasts only for the current visit.

## Final storage and mobile-header supplement

After the multi-tab persistence fix and compact-header adjustment,
`local-storage-tabs.json` records another successful 8.9-second run:

- Both pages load before edits. An Enzyme lens change does not erase the other
  page's Diffusion prediction.
- Two pages open the same lesson. A stale lens-only change preserves the other
  page's newer prediction while saving the new lens.
- A conflicting stale answer displays the retained first prediction. Explicit
  retake then saves a new answer, also visible after the other page reloads.
- At 320px and 390px widths, the landing entry button remains one line and exactly
  44px tall. Brand, Sign in and entry controls do not overlap or overflow.

Both runs completed with zero uncaught browser errors. The final mobile header
and FAQ screenshot was personally inspected. It is
`local-storage-tabs-faq-mobile.png`; `local-followup-faq-mobile.png` is the earlier
capture before the compact-header adjustment, retained as comparison evidence.

Other evidence: `local-followup-resumed-prediction-desktop.png`,
`local-followup-storage-unavailable-mobile.png`, and
`local-storage-tabs-preserved-prediction.png`.

## Reproduce

With this repository served at port 3002:

```text
node scripts/check-usability-browser.cjs --followup
node scripts/check-usability-browser.cjs --storage-tabs
```

Override `BIOLOGY_PREVIEW_URL` or `BIOLOGY_PLAYWRIGHT_MODULES` when necessary.
The runner reuses an existing Playwright installation and launches one browser
at a time, with isolated contexts, reduced motion and 15-second action limits.
It writes only this directory's reports/screenshots; it never runs builders,
changes product files, publishes Git changes, or modifies deployment settings.

These bounded checks are not a full scientific, assistive-technology, physical-
device or cross-browser audit. Storage-denied testing is browser emulation;
real browser policy and quota behavior can differ. Automated state tests cover
additional parsing, quota and merge edge cases separately.
