# Potato osmometer — bounded interactive rehearsal

Status at source checkpoint: implementation, model and responsive apparatus verification passed locally. Required PR checks, merge, deployment and live verification remain separate release gates; [PR #45's release conversation](https://github.com/darshprasad-cmd/biology-entelloq/pull/45) records their subsequent outcome. This source checkpoint is not a live deployment-status feed; use that production evidence before choosing the next practical.

## Gap and scope

CBSE Class XI A3 (`b11-a-e03`) had a preparation guide and a link to the single-cell osmosis model. It did not have a potato cup, a matched control, level readings or apparatus faults. The new bench is embedded in that existing guide at `#cbse:11/practicals/b11-a-e03`. The class catalogue identifies the interactive addition; the existing accessible pathway still links to the standard guide. All 59 guides, their notes, original lesson/lab records and incoming routes remain available.

Only one practical interaction is added. The 44 standard / 15 accessible guides remain guides, not 59 new simulations. The historical audit's capability statuses are not retroactively rewritten. The checkpoint ledger reconciles the previously shipped guide release with PR #41 evidence, and records this interaction separately.

## What a learner does

1. Select 0%, 10% or 20% sucrose (this bench explicitly uses % w/v), inward or reversed solution placement, one of three illustrative repeats, and an intact/punctured/flooded test cup.
2. Start both cups at their baseline. Keep controls fixed within a run; advance manually by 10 model minutes to 60. The comparison cup always has water inside and outside and remains intact.
3. Read both levels, calculate the signed differential change and enter the answers. Specific feedback distinguishes an incorrect level from incorrect subtraction. Zero-time observations are reference readings, not results.
4. Save checked simulated observations in an isolated, versioned, bounded local notebook. Re-reading a condition/repeat/time replaces that row. New setup does not erase observations; CSV export retains arrangement, units and illustrative provenance. Blocked storage retains session data and gives a download warning.
5. Compare reversed gradients and apparatus faults, and explain why a rise alone cannot establish osmosis. No score, mastery record or school-completion flag is written.

## Reference and scientific boundary

- [CBSE Biology 2026–27, PDF p.6 A3; p.8 accessible C8](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Biology_SecP2_2026-27.pdf#page=6).
- [NCERT Class XI Biology laboratory manual, Exercise 15, printed pp.81–82 / PDF pp.1–2](https://ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classXI/biology/kelm312.pdf#page=1). This is the current potato-exercise filename, not kelm313.pdf. The method calls for a half-filled cavity, approximately two-thirds immersion, marked starting level, a roughly hour-long observation, and reversing inner/outer liquids. NCERT states 20% without specifying the concentration convention; the bench defines w/v explicitly as an adaptation. Original explanations and SVG only; no copied figure or specimen asset.

An independent reference review read the primary manual successfully; repeat fetches subsequently timed out. Reference availability is separate from the already-read method evidence. No educator or physical-apparatus validation is claimed.

The deliberately simple height law is **not calibrated biology**. With selected concentration `c`, model time `t` and illustrative repeat factor `f` (0.9, 1, 1.1), the forward test height is `8 + 0.45c(1 − exp(−tf/30))` mm, while the reverse height is `8 − 0.2c(1 − exp(−tf/30))` mm. These coefficients are chosen teaching-response shapes, not membrane permeability or a measured equilibrium. In the ideal constant-area forward cavity, concentration is diluted according to `c(t)h(t) = c(0)h(0)`; this is a proportional solute index, not mass without a defined area. The reverse case treats the bath as a reservoir and does not claim finite-bath mass balance.

The ideal water-only control is flat at 8 mm. Real tissue solutes, evaporation and preparation variation may change real controls. Hydrostatic pressure, tissue state, changing bath concentration and solute transport are omitted. Deterministic repeats cannot establish experimental uncertainty or confidence intervals. A leaking test cup tends toward the bath level by direct exchange. A flooded test cup loses its separate meniscus: later readings refer to the bath surface. Neither fault supports an osmosis-only inference.

The schematic uses 8 mm initial height and 24 mm rim height with simplified immersion. A visible note distinguishes this from NCERT's half-filled cavity and two-thirds immersion. It is not an exact apparatus reproduction. Real cutting and preparation remain teacher-supervised; students must not eat experimental material. Accessible numeric readouts supplement, not certify, tactile/physical accommodations.

## Interface review

| Before | After | Why |
| --- | --- | --- |
| Potato guide links only a generic single-cell model | Two-cup apparatus within the existing guide | Teach the prescribed apparatus distinction without replacing the old model |
| Expected rise can be read passively | Student-controlled arrangement, time and level/calculation checks | Require observation and signed reasoning |
| A level rise may be confused with proof | Leak/flood counterexamples and explicitly matched water control | Separate observation from causal inference |
| No potato observation record | Isolated local notebook, checked raw readings and CSV | Preserve existing notes and distinguish simulated results from school records |
| Small screens could compress the apparatus | Two columns become vertically stacked cups; 44+ px controls and text readings | Retain readable access on narrow phones without gesture-only input |

No dependency, authentication, analytics, camera, scientific legacy-model, shared-asset, launcher, dissection or deployment-setting change. The design skill guided instant keyboard actions, scoped styles, accessible disclosure and reduced-motion behavior.

## Owned paths and verification gates

- New model/UI/styles: `src/cbse/potato-osmosis-{model,ui}.js`, `potato-osmosis-ui.css`.
- Narrow guide mount/discovery: `src/cbse/practicals-ui.js`.
- Existing portable builder includes these sources in its CBSE-only slots: `scripts/build-single-file.py`.
- New model/UI tests and `scripts/check-potato-osmosis-browser.cjs`.
- This release evidence and coverage ledger; previous practical release status reconciled with verified PR #41 evidence.

Original preservation fixtures remain untouched. Existing page-source builders can normalize Windows checkout line endings; no generated authoring-page content is part of this change. `dist/index.html` is rebuilt, not committed.

Required local gates: all fast checks, model/UI/content/reference checks, source synchronization, portable build parity, existing questionnaire/practical/learning workflows, new responsive/keyboard/reduced-motion/accessibility/storage/offline checks. Browser evidence is Chromium emulation, not physical touch or screen-reader certification. Required PR checks and a clean review must pass before merge; live behavior and artifact parity are separate gates.

### Local evidence, 26 October 2026

- `node scripts/check-learning.cjs`: all **14/14 groups** passed, including **35 Python contracts** and **577 Node tests**. This includes 12 new model tests and four new UI/storage/source-contract tests. No original fixture was changed.
- `python scripts/build-library.py --check`, `build-learning.py --check` and `build-dissection.py --check`: source slots synchronized. Only the single-file CBSE inclusion lists changed; the lab builder and dissection sources did not.
- `node scripts/check-potato-osmosis-browser.cjs`: 1440/768/390/320 px, reduced motion, real keyboard start/disclosures/exit, observed values at every 10-minute step, inward/reverse/zero conditions, repeat variants, leak/flood flags, incorrect/correct reading and signed-calculation feedback, deduplicated records, exact CSV, reload and preserved old notes, malformed/injected storage and blocked-storage session fallback. **12 scoped axe scans: zero violations.** The copied single-file application also supports the interaction with external requests blocked. Zero page errors or camera calls.
- Existing questionnaire suite passed all four widths, profile edit/reset, deep links, real lesson routing, blocked storage, first paint before the manifest and offline copy.
- Existing practical suite passed all **59 guides**, classes/search/viva/notes/export, keyboard/Close/Escape, invalid cross-class recovery, real microscope support route, storage failure and offline guide. Its **12 scoped axe scans also had zero violations**.
- Existing full single-file suite passed **20 HTTP + 20 offline checks**, including real prepared frog/cockroach rendering, exit controls and Universe routes. Streamed opening/recovery checks passed without errors; none of these checks validate camera tracking.
- Existing exam-answer workflow passed all six Solve formats, guided Reason workouts, partial scoring and saved drafts at 1280/320 px. Four-width answer-formatting checks reported no unsafe nodes, external requests or runtime errors. The final rebuilt package passes `build-single-file.py --check` (44,601,965 bytes), and the new apparatus browser suite was rerun on that final build.
- The author and independent browser reviewer inspected responsive screenshots, including paired apparatus on a 320 px viewport and flooding with the correct bath/meniscus distinction. Evidence: `docs/cbse/potato-osmosis-browser/report.json` and 18 local screenshots; generated QA artifacts are not shipped runtime assets.

During development, a hand-calculated test constant was corrected, a cross-realm assertion was changed to semantic object comparison, and inherited CRLF-only source drift was normalized by the existing builders. Subsequent checks passed; no production source boundary was widened or test weakened to admit changed legacy behavior.
