# Biology product integration

The existing static app, isolated scientific documents and single-file delivery remain the architecture. The product change is opt-in with `?excellence=1`, defaults on for localhost staging and is explicitly disabled by `?excellence=0`. The classroom file exchange additionally requires `classroom=1`.

The current integration runtime is `87df88b0117c1b54fa2c0c8667343c1e3bd1f435` (2026-11-20). It includes released questionnaire, pollen and chromatography work alongside the product workspace and reviewed navigation ownership/recovery fixes. The chromatography merge retains its released model, UI and persistence rules; only the builder conflict and explicit preservation-test baselines needed integration. Exact artifact, catalogue and test evidence is indexed in [the chromatography integration report](product-excellence/chromatography-integration-20261120/README.md).

## Ownership and integration

- `app.html` owns the original shell and a small `BioShell` adapter exposing navigation, route labels, search hooks and existing activity. The original immersive launcher regions remain fingerprint protected.
- `src/product-excellence/biology.js` adapts existing navigation to Explore, Learn, Virtual Labs, Investigate and My Workspace; keeps the immersive entries and all old routes; adds guest entry, shared search, saved experiment discovery and scoped workspace actions.
- `src/product-excellence/biology.css` owns only flagged product styling, mobile controls, graph scrolling and the scoped scientific workspace.
- `src/library/labs.js` keeps `LABS` as the registry and owns mounting/disposal. Product actions attach to a successfully mounted experiment. Additional tools are placed after the scientific workspace; their engines and deep links remain available.
- `src/library/notebook.js` continues owning existing per-lab notes and 80-trial histories. Graph selections now persist. Its read-only `draft()` returns a validated copy of current notes, trials and active graph axes/type; the product adapter never substitutes stale storage for the visible draft. A failed write returns failure; confirmed session-only reset still works without altering disk records. Existing stale-tab checks remain active.
- `assets/entelloq-science.js` is the shared deterministic search and versioned notebook contract. `entelloq.science.biology.v1` is additive; existing `bioq.*` records are not migrated or deleted. Status explicitly says local-only and no cloud sync.
- `assets/entelloq-classroom.js` is the separately flagged local assignment/submission/review exchange. Canonical catalogue IDs bind submissions to the assigned experiment. No student account, cloud inbox, network upload or automatic feedback delivery is implied.
- `scripts/build-scientific-catalog.cjs` exports 221 current Biology entries from real registries to `assets/entelloq-biology-catalog.json`. Concepts, working labs, lessons, practical preparation guides and tools have distinct kinds.
- `scripts/build-library.py` embeds product source slots and both subject catalogues. `build-single-file.py` includes shared feature gating before first-run code and packages local scripts and styles. No new production dependency or renderer was introduced. The existing Axe accessibility tool is pinned alongside Playwright for the CI browser checks.
- `src/cbse/chromatography-model.js`, `chromatography-ui.js` and `chromatography-ui.css` mount through the existing Class 11 practical route `#cbse:11/practicals/b11-a-e08`. Synthetic observations remain in their existing local practical notebook; they do not claim experimental plant measurements or school completion. The catalogue remains 221 Biology entries and the copied Physics catalogue contains 343 entries.

## Persistence and model capabilities

The shared notebook saves observations, scientific measurements, model metadata, configuration and graph data. CSV exports retain data; printable reports provide the browser's Print / Save as PDF flow. The reports contain source-labelled model data and do not claim empirical measurements.

If the original trial notebook has a quota failure or another-tab conflict, a successful scientific workspace save captures the current in-memory draft and explicitly says that the original trial notebook remains unsaved. It does not overwrite or repair the original conflicting record. Both the original notebook export and scientific printable report remain draft rescue paths.

While an actual experiment is active, the original assistant and ecosystem launcher buttons move to contextual toolbar actions. Their original handlers and destinations remain available; closing returns focus to the contextual action. Floating launchers return when the user leaves the experiment. This suppression spans the portable shell's ancestor frames so optional controls cannot cover the scientific touch targets.

Six already implemented shared-builder experiments expose `serialize()` and `restore(config)`:

| Experiment | Restored state |
| --- | --- |
| Osmosis | Cell type, external concentration, cell volume/lysis flag, model time and graph history |
| Photosynthesis | Light/carbon/temperature/colour, accumulated oxygen, model time and graph history |
| Cellular respiration | Existing controls, accumulated ATP/carbon dioxide, model time and graph history |
| Heart physiology | Existing controls, accumulated beats, model time and graph history |
| Gas exchange | Existing controls, cumulative oxygen proxy, model time and graph history |
| Mitosis | Existing controls, stage/checkpoint flags and model state |

Restore validates experiment identity/version, enumerated control values, numerical control bounds, state types, finite values, time range and bounded graph history before mutating anything. It resumes paused. Numerical formulas, stepping intervals, drawing algorithms and model assumptions are unchanged. A theme observer now calls the existing redraw when the theme changes, without advancing time; it disconnects on disposal. Other labs support saved evidence without claiming full internal-state restoration. This includes virtual dissection: saving its evidence does not reload incision/tool/camera state.

The public configuration is ordinary JSON suitable for the shared offline contract. Native iOS packaging belongs to the separately owned native chat; this Windows checkout does not claim a native build, WKWebView device validation or camera certification.

## Preserved critical areas

`lab.html`, `src/lab/*`, prepared specimen assets, `src/universe/*`, existing webcam lifecycle/gesture logic and the original `tests/fixtures/dissection-original.json` remain unchanged. No dissection builder runs are needed. The existing source-slot and original-boundary tests must pass. Source-level stale-context filtering now checks the active native/portable child route before a queued context event updates shell history, including omitted default lens and pending portable documents.

## Build and verification

```powershell
node scripts/build-scientific-catalog.cjs
python scripts/build-library.py
python scripts/build-single-file.py
node scripts/build-scientific-catalog.cjs --check
python scripts/build-single-file.py --check
node scripts/check-learning.cjs
node scripts/check-model-resume-browser.cjs
node scripts/check-chromatography-browser.cjs
node scripts/check-product-excellence-browser.cjs
node scripts/check-product-excellence-browser.cjs --portable
node scripts/check-product-excellence-browser.cjs --file
```

Set `BIOLOGY_PLAYWRIGHT_MODULES` to the existing Playwright/Axe runtime if it is not on the default local path. Original `check-single-file-browser.cjs` still checks all section navigation, original notebook persistence, frog/cockroach rendering and isolated copied-file behavior. Its flag-off baseline and the flag-on product checks are complementary.

## Local staging and rollback

Run `python -m http.server 3029 --bind 127.0.0.1` from the checkout. Open `/dist/index.html?excellence=1#home`; append `&classroom=1` to the query for the classroom pilot. Loopback cross-subject mappings are validated by the shared resolver; ordinary production destinations remain canonical HTTPS URLs.

For immediate staging rollback of the product surface use `excellence=0`. Existing keys and engines remain usable. To inspect the original audit baseline, use `a8c303c` in a clean separate checkout; it predates subsequently released questionnaire, pollen and chromatography work and is not a full-content rollback target. To reproduce the candidate before the chromatography integration, use `6296dbe` in a clean separate checkout and rebuild `dist/index.html`. Do not reset a checkout containing user work. A future production rollback would revert the approved release commit through the protected PR/check/deploy process. Upstream work has been merged into this development branch; this candidate has not been merged into production or deployed. Explicit user approval is required before production deployment.
