# Biology integration validation — 20 November 2026

Integrated `origin/main` at `8062791` (questionnaire/mobile navigation #50 and pollen practical #51) into `codex/product-excellence-20261029`, previously `487c28f`. This is branch integration evidence; no production deployment or PR merge was performed.

## Resolutions and preservation

- Kept upstream's decoded child-route guard in `src/library/app-library.js`, retaining the flagged Virtual Labs label, then regenerated its `app.html` slot. This prevents queued child messages from undoing catalogue navigation.
- Combined the single-file builder's pollen modules with the shared feature-flag module that permits immediate guest experiments. The newer questionnaire remains available, including its original first-run behavior under `?excellence=0`.
- Kept upstream's persistent filter/result nodes, keyboard submit, card-return focus and mobile progress layout alongside deterministic scientific search and workspace actions.
- Browser helpers assert the exact accessible search name and first-run behavior for the active flag. The questionnaire suite explicitly requests the legacy mode; pollen covers the guest path on localhost and the legacy path in the offline file.
- Added an output-directory option to the product browser suite so this rerun preserves the original before/after evidence.
- No changes to `lab.html`, `src/lab/`, specimen assets, webcam interactions, `src/library/experiments.js`, `src/library/notebook.js`, shared scientific/classroom modules or either catalogue during this integration.

## Artifact and catalogue

`python scripts/build-single-file.py` and `--check` produced the same verified 44,988,000-byte `dist/index.html`:

`e8bf0a8e9da95eaef7459de726f544daa26a41d1a938319d19b096a9a72e644e`

The Biology catalogue remains 221 entries, SHA256 `ec4b29416152058f5ce9191a725c0b9a5c61b60e9bb3c83943b9c675c99bcd5d`. Pollen mounts within the already-catalogued `b12-a-e01` practical. No cross-subject catalogue update is required.

## Checks

- `node scripts/check-learning.cjs`: 14/14 groups passed, including all discovered unit/model tests, Python contracts, protected dissection boundaries, source/generated drift, syntax and diff hygiene.
- `node scripts/build-scientific-catalog.cjs --check`, `python scripts/build-learning-tools.py --check`, `python scripts/sync-learning-tools.py --check`, and single-file host/bridge syntax checks passed.
- Targeted route, catalogue, search, progress and pollen unit tests: 33/33 passed.
- `check-interface-polish-browser.cjs`: actual shared search, lab catalogue and progress at 1440/390/320 CSS pixels; no overflow, page errors or camera requests.
- `check-lab-catalog-navigation-browser.cjs --portable`: all four widths in both light and dark themes; native/explicit submit, stable result nodes, reset, card-return/fallback focus and invalid-route recovery all passed.
- `check-cbse-entry-browser.cjs`: legacy questionnaire at 1440/768/390/320, deep links, preference editing/reset, failed storage, early questionnaire before manifest, and offline file.
- `check-pollen-browser.cjs`: 1440/768/390/320; independently counted/measured rendered synthetic grain geometry, incorrect-answer rejection, preparation faults, pooled counts by time, exact CSV, reload and storage denial/corruption; offline file also passed. Scoped axe checks reported zero violations.
- `check-product-excellence-browser.cjs --portable` and `--file`: all four widths; guest manipulate/record/save/resume/reload, usable graph and control targets, natural-language deterministic search, CSV/PDF, local classroom assignment/submission/review, truthful storage denial and current-draft rescue, and original navigation with feature flag off. Scoped axe checks reported zero violations.
- `check-single-file-browser.cjs`: 31/31 checks in each of HTTP and standalone-file modes. Original dissection launch, controls-dialog ownership and exit, all 13 Universe stages, deep-link navigation, source-free assets, search, study references, notebook reload, lesson/practice focus, evidence tables and phylogeny checks passed. No uncaught application errors, forbidden dependencies or automatic camera requests.

Machine-readable reports and actual screenshots are stored in the corresponding subdirectories. The earlier `../before`, `../after-source`, `../after-portable` and `../after-file` evidence remains unchanged. Browser runtime came from the existing `BIOLOGY_PLAYWRIGHT_MODULES=C:/Users/darsh/biology-entelloq/node_modules`; no runtime dependency was added.

## Boundaries

Chromium emulation does not establish real-student usability, physical touch behavior, screen-reader speech or physical webcam tracking. No accounts, cloud sync, live AI or production services were exercised. Pollen fields remain clearly synthetic and illustrative. Existing release flags and rollback instructions remain applicable; production deployment still requires explicit approval. Unchanged legacy suites can run in hosted CI before any merge.
