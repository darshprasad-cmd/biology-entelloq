# Frog practical checks

The isolated scripts test the repository-built vanilla lab, not the separate Next application. Serve this checkout on `127.0.0.1:3001`; the student entry is `app.html#lab`, whose iframe opens `lab.html?instant=1`.

## One-command local check

```powershell
node scripts/check-frog-lab.cjs
```

Runs Node regressions, Python builder and static-site tests, generated-page drift, ecosystem/tutorial contracts, and all top-level lab JavaScript syntax checks in parallel. It works from any current directory when called by its absolute path, explicitly lists Node test files for Windows, installs nothing, and never rebuilds or publishes. Node 20+ and Python must already be available. Syntax parsing is batched in one process and never evaluates the application. Set `FROG_PYTHON` to a Python executable path if needed; the defaults are `python` on Windows and `python3` elsewhere.

After starting the local server described below, use `node scripts/check-frog-lab.cjs --browser` to run the same checks followed by journeys and then polish, sequentially. Browser checks start only if the read-only checks pass, reuse `FROG_BASE_URL` / `FROG_NODE_MODULES`, and update existing reports/screenshots. They do not start a server or include resource profiling/baseline capture. Keep other browser workloads closed during this option. Use `--help` for a compact reference.

## Build safety

```powershell
python scripts/build-frog-lab.py
python scripts/build-frog-lab.py --check
python scripts/frog-lab/test_build.py
```

The builder writes only `lab.html`. It takes the ordered modules from `src/lab/assemble.py`, embeds the repository-vendored Three and OrbitControls, and preserves the current lab's post-module integration tail and known feature-tutorial head includes. It does not read Downloads, rebuild the other public pages, or publish anything. The safety tests are read-only. They exercise integration preservation, vendor identity, ambiguous-input rejection, the fixed output target, and tutorial include deduplication.

## Browser checks

In one terminal, serve the checkout:

```powershell
python -m http.server 3001 --bind 127.0.0.1
```

Then run these serially in another terminal:

```powershell
node scripts/frog-lab/check-journeys.cjs
node scripts/frog-lab/check-polish.cjs
node scripts/frog-lab/check-resources.cjs
node scripts/frog-lab/capture-baseline.cjs --after
```

The scripts reuse the existing Playwright installation in the sibling `biology-entelloq/node_modules` checkout. For a different location, set `FROG_NODE_MODULES` to the node_modules directory for journeys/resources and `FROG_PLAYWRIGHT_PATH` to its `playwright` package for captures. `FROG_BASE_URL` overrides the server address. No dependency is downloaded by these scripts.

The eight browser cases cover:

1. Desktop pointer placement, invalid torso rejection, all four visible targets, undo, exact-anchor restore, explicit Continue, and actual selection of the unlocked scalpel.
2. The same complete flow using actual touchscreen taps at 834×1112.
3. The same complete flow using actual touchscreen taps at 390×844, including collapsed/expanded controls.
4. Keyboard selection, three successive arrow nudges, Enter preserving the adjusted anchor, and restart.
5. Accessible SVG keyboard activation with focus retained, Explore/Guided visibility and prerequisite isolation, and the old Console remaining closed.
6. WebGL-unavailable startup and completion through the 2D alternative.
7. Unavailable browser storage, honest session-only copy, one-at-a-time guided placement, and restart.
8. Reduced-motion UI, presentation/quality settings, and an unfiltered automatic axe audit of the direct lab page.

Canvas coordinates are computed from the authored target and live camera, but placement uses real mouse/touch events rather than procedure API shortcuts. Each target must be inside the viewport and unobscured according to `elementFromPoint`. Browser errors and failure diagnostics are retained. The resource test deliberately uses the specimen-replacement API; that isolates disposal from the separate user-input journeys.

The focused polish script checks the integrated parent/iframe hit targets, full tool labels and Exit spacing, actual Probe → Scalpel selection after pin completion, record/review controls, retained Heart/Frog navigation, all nine feature-guide steps without camera requests or procedure credit, final axe, and host-switcher restoration after exiting the lab. It saves the newest initial views as `final-desktop.png`, `final-tablet.png`, `final-mobile.png`, plus `final-2d.png`. It does not overwrite the measured `after.json` scene sample. `--extra-only` runs just the inexpensive 2D/Exit integration check and writes `polish-extra.json`. `--phone-only` runs phone controls plus that 2D/Exit check and writes `polish-phone.json`, preserving the earlier full report. These partial runs are not represented as a complete six-case rerun.

`--resume` preserves already-passed polish cases only when hashes of `lab.html`, `app.html`, and the feature-tutorial JS/CSS all match the earlier run; missing fingerprints are rejected. This guards parent overlays and tutorial integration as well as the lab itself. Browser actions log their current target and cap each layout/pointer-dispatch wait at 30 seconds; a timeout is retained as a timeout, not silently converted into a passing application claim.

`--filter=phone`, for example, runs just the matching browser case and writes `journeys-phone.json`; a full run writes `journeys.json`. Partial runs do not overwrite the full report. Screenshot evidence includes initial before/after views and four-pin states. After-capture also measures tool-label truncation, header/tool center hit targets, parent Exit overlap, document overflow, scene inventory and rendering samples.

Do not rerun capture without `--after` against the updated application: the default is specifically the baseline capture and would overwrite the original baseline evidence. The original baseline is already retained in this directory.

## Interpretation limits

Run only one automated rendering workload at a time for comparisons. Headless Chromium here uses SwiftShader software rendering, not the user's physical GPU; frame rates do not certify physical laptop/tablet performance. Renderer geometry/texture allocation counts after five replacements are useful disposal checks, not GPU-byte measurements or a proof of absence of all JavaScript leaks. Heap values are sampled without forced garbage collection. Network totals sum available response Content-Length headers, not complete compressed transfer accounting.

These checks establish the first-step pinning slice, UI transitions, and recovery behavior. They do not validate the later incision/layer-dissection exercise, physical instruments, haptics, hand-camera tracking, a screen-reader session, or species-specific anatomical accuracy. Automatic accessibility checks supplement, not replace, manual keyboard and visual checks.
