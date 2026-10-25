# Biology: mechanisms and microscopy

Two additions for the **existing** Biology product: enzyme kinetics belongs in Labs; fluorescence volume exploration belongs in Explore. These modules do not replace the product shell or Protein Atlas.

## Runtime integration

`index.html?panel=kinetics` and `index.html?panel=volume` are self-contained entries apart from their two local classic bundles. Required runtime paths:

- `index.html`
- `dist/main.js` — UI, CSS, chart, loopback-client; about 22 KB.
- `dist/volume.js` — lazy vtk.js plus the compact CC0 microscopy sample; about 1.85 MB.
- Retain `dist/THIRD-PARTY.txt` and `dist/VTK-Copyright.txt` in distribution.

There are no runtime npm imports, CDN loads, trackers, or model inference calls. The inert `#volume-library` script's raw `src` attribute is read by `main.js` before mount. Loading uses `fetch(src) -> Blob -> temporary script URL`, so the portable host's fetch bridge can resolve deferred bytes on demand. Normalize that raw path to the portable asset key **before main.js executes**; it does not need an eagerly decoded blob URL. Temporary script URLs are revoked after execution/error/cancellation, and pending fetch is aborted on unmount. The vtk bundle contains the data and makes no separate data requests. Its source JSON and provenance are also retained under `assets/` for reproducibility.

Global API: `EntelloqBiologyNext.mount(element, {theme: 'light'|'dark', panel: 'kinetics'|'volume'})` returns `{setTheme, panel, unmount}`. Loading `main.js` automatically mounts only if `#biology-next` exists. A mount owns its DOM; unmount aborts pending requests, unregisters handlers, disconnects resize observers, releases vtk objects and removes the UI.

An iframe accepts `{type:'entelloq:theme', theme:'light'|'dark'}` only from its parent window and the origin obtained from `document.referrer` (falling back to the current origin). The initial `html[data-theme]` is also respected. The host can call `biologyNext.setTheme()` directly when same-origin access is available. Slice/sample settings and experiment inputs persist locally; calculated results are exported explicitly, not silently stored or uploaded.

## Tellurium companion

Python **3.12** is the verified Windows runtime. Install and run from the module directory:

```powershell
./service/start-companion.ps1 -Install -Python 'C:/path/to/python.exe'
# Later runs:
./service/start-companion.ps1
```

Or, on macOS/Linux:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r service/requirements.txt
.venv/bin/python service/serve.py
```

The API and optional local preview bind **only** to `127.0.0.1:8932`. Visit that URL to preview. A published static app still needs the companion running on the user's computer and may need browser local-network permission. A missing service produces a clear error and never fabricated curves. The service accepts exact Biology production origins and local HTTP localhost/127.0.0.1 origins; it validates Host, Origin, a per-process token, content size and finite parameter ranges. It executes one fixed mechanism, never uploaded Antimony or arbitrary code. Native calculations are serialized. Cancelling stops the browser request and discards its result; it does not promise to terminate an already-running short native solve.

`service/requirements.txt` pins Tellurium. `service/requirements-lock-windows.txt` records the full Python 3.12 Windows environment actually tested, including transitive libraries; use it to reproduce that platform. Rebuild preprocessing additionally requires `tifffile==2025.6.11`.

## Scientific definition

The model is `E + S -> ES`, `ES -> E + S`, `ES -> E + P`, with mass-action binding `2 µM⁻¹ s⁻¹`, unbinding `1 s⁻¹` and adjustable catalysis `0–2 s⁻¹`. Concentrations are µM, time seconds, fixed unit-volume well-mixed compartment. The numerical compartment size 1 is a normalization, not a claimed cell volume. There is no diffusion, regulation, inhibition or empirical organism-specific calibration. It conserves **moieties** `S+ES+P` and `E+ES`; it is not an atom-balanced molecular reaction. Conservation drift above `1e-7 µM` or negative concentrations below `-1e-8 µM` withholds the result.

Tellurium 2.2.13.1 / libRoadRunner CVODE computes 201 samples. The test independently integrates the same ODEs with SciPy DOP853, checks maximum deviation, null cases, parameter extremes, monotonic response to enzyme/catalysis, and a separate analytically solved first-order reaction. CSV contains every result row; JSON includes parameters, units, engine, conservation, assumptions and source model; SBML includes concentration substance/volume units and explicit seconds.

## Microscopy provenance

The real `cells3d.tif` volume is from Allen Institute for Cell Science, distributed **CC0** by [scikit-image sample data](https://gitlab.com/scikit-image/data/-/blob/master/README.md). The [official scikit-image description](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.cells3d) identifies membrane and nuclear channels and voxel spacing. Do not infer a cell type or organism not given by the source.

Pinned source: `https://gitlab.com/scikit-image/data/-/raw/2cdc5ce89b334d28f06a58c9f0ca21aa6992a5ba/cells3d.tif`.

Source SHA-256: `afc7c7d80d38bfde09788b4064ac1e64ec14e88454ab785ebdc8dbba5ca3b222`.

The generator block-averages XY 4×4, preserves all Z planes, and maps each channel's 99.7th percentile to uint8 255, clipping brighter values. The resulting 64×64×60 grid has spacing `(1.04,1.04,0.29) µm` and origin `(0.39,0.39,0) µm`, accounting for averaging-centre offset. Axis labels refer only to dataset XYZ. Physical aspect ratio is retained by vtk image spacing. Intensities are display-scaled signals, not concentrations. Slice mode locks rotation to preserve the labelled directions; volume mode permits rotation and has an adjustable opacity threshold. Exports include view settings, source/hash, processing, spacing and limitations, not a claimed segmentation or diagnosis.

To reproduce the compact data: `.venv/Scripts/python.exe scripts/prepare-volume.py`. Cached original TIFF is ignored by Git. `assets/provenance.json` and channel SHA-256 values record the exact derivation.

## Build and checks

```powershell
npm ci
npm run build
./.venv/Scripts/python.exe tests/test_science.py
./.venv/Scripts/python.exe tests/test_service.py
# Start companion in another terminal first; point at an installed Playwright package:
$env:CODEX_NODE_MODULES = 'C:/path/to/node_modules'
npm run test:browser
```

Browser evidence includes real vtk rendering (orthogonal slices and volume), lazy-load boundary, physical coordinate/orientation labels, CSV/provenance export, input/view persistence, light mobile and dark desktop, no overflow/page errors, missing-companion error, cancellation and cleanup. Browser rendering is Chromium SwiftShader, not device GPU performance proof. Hardware touch gestures and production-host local-network policy still need destination smoke checks. Root integration owns final portable-package and live-host QA.

## Upstream software and notices

- [vtk.js](https://github.com/Kitware/vtk-js), 37.4.6, BSD-3-Clause. Full bundled dependency notices in `dist/THIRD-PARTY.txt` (generated from pinned npm packages).
- [Tellurium](https://github.com/sys-bio/tellurium), 2.2.13.1, Apache-2.0; installed scientific dependencies have their own licences. Companion uses pip distributions rather than redistributing native binaries in the app.
- [Antimony unit syntax](https://tellurium.readthedocs.io/en/latest/antimony.html) defines exported model annotations; they do not change the numerical solver.

This module preserves the Biology teal/emerald palette, supports light/dark host choice, native keyboard controls, labelled status regions, accessible tabular scientific data and reduced motion.

Enzyme parameters have both sliders and precise number fields with visible units, ranges and step sizes. Invalid drafts immediately prevent a run without replacing the last valid saved value. A pending run owns a fixed parameter snapshot and temporarily disables parameter changes; cancellation, failure or completion restores the controls. Microscopy controls become available only after its renderer loads, with view-specific disabled states and a recoverable loading error.

Run `node tests/quality.mjs` for the focused interaction checks; no companion is needed for this suite. It renders the real vtk sample and intercepts only companion unavailable/pending states. The existing `npm run test:browser` separately verifies the genuine local Tellurium engine. Both browser runners accept `CHECK_BROWSER=chrome` for an installed Chrome. See `qa/quality-report.md` and `qa/quality/` for evidence and limits.
