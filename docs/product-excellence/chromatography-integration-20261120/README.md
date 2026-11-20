# Chromatography integration into the Biology product branch

This normal merge combines released main `131a9a43` (PR53) with product branch `6296dbe`, whose runtime was `8a765df`. It prepares identical web content for native packaging. It does not authorize a production deployment, PR merge, physical-device claim or supervised-practical certification.

The combined runtime is frozen at merge commit `87df88b0117c1b54fa2c0c8667343c1e3bd1f435`, with parents `6296dbeebfeb5f4a4b89392fa0201fa87aedbfa4` and `131a9a43ac3faf2d3605cfa9d805f6a9cbb49ed6`. Later evidence-only commits do not change that runtime or artifact.

## Merge resolution and preservation

The only content conflict was the single-file builder's CBSE bundle declaration. The resolution retains the product branch's `assets/entelloq-science.js` prelude, which supplies the guest-entry feature flag, and adds the released chromatography model, UI and stylesheet in the released order. All previous module ordering remains intact. The new chromatography model, UI, styles and practical mount are the released source; no scientific equations or persistence rules were rewritten.

PR53's preservation tests pinned the pre-product source. Exact hash assertions remain, with three explicitly reviewed baselines updated to the already accepted product runtime `8a765df`: the builder with its flag prelude, `entry.js` with guest entry, and `host.js` with the `33f6f3c` navigation ownership fix. The entry stylesheet, authored practical data and outer shell retain their released pins. Removing the two chromatography mount/cue slots still exactly recovers the released practical UI. No assertions were removed.

The original chromatography browser checks still verify the questionnaire, class selection, focus, every measurement assertion and all error/storage cases. Its local HTTP URL now explicitly requests `?excellence=0`. Separate guest cases request `?excellence=1` on desktop, narrow mobile and a copied-alone file, asserting direct entry, rendered measurements, a checked observation and persistence after reload. The original file-mode questionnaire check remains.

The Biology catalogue already contains `b11-a-e08`; that route now mounts the new bench. Catalogue counts remain 221 Biology and 343 Physics. Neither catalogue nor shared scientific/classroom assets changed in this merge. Dissection, specimens, webcam interactions, existing lab engines and existing notebook implementations remain unchanged.

An independent read-only review recomputed all seven preservation fixture values from the Git baseline and verified the released model/UI/styles and model/UI tests against `131a9a43`; it found no blocking issue. `artifact-and-preservation.json` records normalized source hashes and protected Git objects, alongside exact artifact and catalogue hashes.

## Scientific boundary

The bench uses two fictional leaf extracts and authored synthetic endpoints. Distances are in millimetres from a common pencil origin; `Rf` is dimensionless. The checked leaf-B/front-80/B4 example is 80 mm, 72 mm and `Rf = 0.9`. The exercise rejects unprepared, unmarked, dried-front and faulted setups. Repeating a configuration replaces its existing row rather than adding an independent observation. These values are not measured plants, a separation-rate model, chemical identification or evidence of school practical completion. The original [release document](../../cbse/CHROMATOGRAPHY-RELEASE.md) retains its references and limitations.

## Build and validation

The Windows artifact was rebuilt and verified with CPython 3.14.5/zlib 1.3.1.zlib-ng: 45,027,873 bytes, SHA256 `88e2ad8c082d75176220878e5d0c00ae6d9af85a79da3961c5fa9932a1ea64fe`. Compressed hashes remain runtime-specific; the earlier [compression audit](../integration-20261120/ci-followup/compression-parity-c955/README.md) explains that boundary and applies only to its historical source revision.

`checks.json` records each command and result. All existing dependencies came from the unchanged lockfile; no dependency was added. New evidence is isolated here, leaving earlier before/after and release evidence intact. The browser uses the existing `BIOLOGY_PLAYWRIGHT_MODULES=C:/Users/darsh/biology-entelloq/node_modules` runtime.

All 22 sequential commands passed on 2026-11-20, with no failed attempt in this integration run:

| Coverage | Result | Evidence |
| --- | --- | --- |
| Learning tool install, units and asset/source parity | Passed; unchanged lockfile, 14 learning and 6 sketch tests | `checks.json`, `logs/` |
| Existing static/source/model contracts | All 14 groups passed, including all 19 chromatography unit/integration tests | `logs/biology-chrom-static.log` |
| Chromatography browser | 20 report cases passed, including 24 synthetic configurations, eight scoped Axe scans with zero violations, original questionnaire and three product guest cases | `chromatography/` |
| Product source, served portable and copied-alone file | All three complete at 320, 390, 768 and 1440 CSS pixels | `product-source/`, `product-portable/`, `product-file/` |
| Full portable preservation | 31 HTTP and 31 copied-file checks passed, including dissection and notebook persistence | `single-file/` |
| Opening recovery and navigation ownership | All 10 checks passed, including real timeout recovery and delayed outgoing child routes | `auxiliary/opening-browser-report.json` |
| Exam answers and AI formatting | Passed desktop/mobile feedback, saved answers, grading and formatting | `auxiliary/`, `logs/` |
| Learning, visual and host quality | Source and portable suites all passed | `learning-tools/`, `visual-tools/`, `host-quality/` |
| Protein Atlas | Passed rendering, interaction, routes and no unexpected network/errors | `protein/` |
| Model resume and theme disposal | Six round trips, 36 invalid-state rejections and six paused-theme/disposal cases passed | `logs/biology-chrom-model-resume.log` |

The generated portable HTML is kept in ignored `dist/`; screenshots, machine-readable reports and logs are committed here without duplicating the 45 MB application. Existing helpers' historical evidence was restored after copying their fresh outputs into this directory. Source and runtime remained frozen throughout the validation run. Hosted CI for the exact candidate, production deployment, real-student studies and physical-device/camera validation are not claimed by these local checks.
