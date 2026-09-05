# Frog lab implementation handoff

2026-09-05 · First-step specimen, tray and four-limb pinning slice.

## Outcome and scope

The frog now has an authored ventral-up body/head profile, attached-looking limbs, small lateral eyes, four modeled forelimb fingers and five hindlimb toes. A dedicated matte pinning tray, restrained lighting and camera presets provide a laboratory working view within the existing dark-green identity. The focused workspace exposes the current task, pin count, anatomical help, settings and accessible placement controls.

Pin completion is no longer a set of arbitrary limb clicks. Four distinct distal anchors must pass the same tray/target validation through pointer, keyboard, guided placement or the 2D alternative. Placement, repositioning, removal, undo, reset and persisted resume retain exact anchor coordinates. Continue requires four valid pins and explicit confirmation; later cutting tools cannot bypass that prerequisite. Limbs deform from cached rest vertices with fixed proximal roots, bounded displacement and exact restoration.

This is a focused correction to the existing `app.html#lab` experience, not a redesign of the rest of Biology Entelloq. Other product pages remain outside the rebuild target. Small scoped changes in `app.html` hide its duplicate ecosystem switcher only while the lab is open and make explicit Exit close once without accidentally reopening a direct-link session. The lab's own switcher stays available; leaving the lab restores the outer one. The 27 frog-builder anatomy IDs and runtime strata compatibility are preserved. Existing organs and later procedure steps are retained, **not rebuilt or independently anatomically audited**. Shared dissection cleanup also releases replaced/unfinished incision resources. Existing record/review access is retained in Help.

The baseline problems and measurements are in [BASELINE.md](BASELINE.md). Detailed anatomy references, exact bounds, IDs and limits are in [ANATOMY_AND_ASSETS.md](ANATOMY_AND_ASSETS.md).

## Source map

| File | Responsibility |
| --- | --- |
| `src/lab/frog.js` | Original exterior geometry, landmarks, material variation and four-limb deformation adapter. |
| `src/lab/frog-stage.js` | Frog-only tray, lighting, framing, view presets and quality controls. |
| `src/lab/frog-workspace.js` | Focused dark-green controls, anatomy/settings/help, keyboard workflow and 2D alternative. |
| `src/lab/pin-state.js` | Pure anchor validation, prerequisite state, history and guarded persistence. |
| `src/lab/dissect.js` | Pin-state/tool integration, preview and steel-pin visuals, anchor projection and resource cleanup. |
| `src/lab/main.js`, `env.js`, `shell.js` | Frog lifecycle, input/fallback integration and isolation from generic exterior deformation and theatrical effects. |
| `src/lab/hands.js`, `tests/hands-lifecycle.test.mjs` | Cancel pending camera startup, release late streams, and keep stale results from reactivating a cancelled session. |
| `app.html` | Prevent the outer app switcher from overlapping the embedded lab's phone tools. No navigation or page-layout redesign. |
| `src/lab/assemble.py`, `scripts/build-frog-lab.py` | Module assembly and lab-only public build preserving existing host integrations. |
| `tests/*.test.mjs`, `scripts/frog-lab/test_build.py`, `scripts/check-frog-lab.cjs`, `.github/workflows/ci.yml` | Geometry, pin-state, cleanup, build-safety, one-command local gate and CI checks. |
| `lab.html` | Generated public lab; edit source modules and regenerate, not the assembled module by hand. |

The specimen and tray are original procedural assets built with existing vendored Three.js; no external models/textures, Blender/GLB pipeline, paid assets or new application dependencies were introduced. Browser QA reuses an external development Playwright/axe installation; it is not shipped in the app. Prettier 3.6.2 was run as a one-off free development formatter, not added as a product dependency. Original authored asset provenance and existing dependency-license boundaries are documented in the anatomy report.

## Verified checks and reproduction

Confirmed on the handoff sources: **37 Node tests passed; 11 builder tests passed; 4 static-site tests passed; generated-output drift check passed.** Geometry coverage includes all 27 IDs, finite mesh data, real digit caps, tray clearance, 32 boundary placements, fixed root rings and exact undo. Pin tests cover invalid placements, prerequisite bypass attempts, persistence/storage failure and incision-resource disposal. Eleven deterministic camera lifecycle tests exercise cancellation without requesting a real camera; six host tests exercise the real Exit callback and safe iframe cleanup. The one-command checker passed all seven groups, including network/tutorial contracts and JavaScript syntax, in approximately 1.6–5.3 seconds across local runs.

The eight browser journeys passed, with zero axe violations in the audited direct lab state. Subsequent audits caught and fixed host-switcher overlap, review-panel Close placement and direct-link Exit reopening. **The latest targeted browser report passes 2/2**: phone review open/close, clear labels/header targets, a real Probe-to-Scalpel transition, and WebGL-fallback Exit restoring the host switcher. See [polish-phone.json](polish-phone.json), which fingerprints the lab, app and tutorial assets.

The earlier [polish.json](polish.json) is deliberately retained as an intermediate diagnostic, not presented as all-green. Its phone-Close and Exit defects are superseded by the latest targeted pass. Its Heart-to-Frog return and tutorial action acknowledgements timed out in software-rendered automation; a prior unchanged-tutorial run passed all nine steps, while the Heart-return path remains not fully verified. Desktop review open/close and the direct-page axe audit passed in that intermediate run. No fresh all-six-case polish pass is claimed. These browser limits keep this a review build, not a certified production release.

## Before and after

[Before desktop](before-desktop.png) · [Final desktop](final-desktop.png) · [Final tablet](final-tablet.png) · [Final phone](final-mobile.png) · [Final 2D alternative](final-2d.png). These are captures of the running application, not mockups. The final desktop/tablet images precede the last phone-only panel and Exit fixes; their specimen scene and visible layout did not change.

Run the fast, read-only checks from the repository root with one command:

```sh
node scripts/check-frog-lab.cjs
```

The checker runs independent checks in parallel and collects their outcomes. It does not download dependencies, start a server, regenerate files, commit or publish. `--help` lists usage; `FROG_PYTHON` overrides the Python executable. Individual commands remain available in [TESTING.md](TESTING.md).

After intentional source edits, `python scripts/build-frog-lab.py` regenerates **only `lab.html`**, retaining its ecosystem switcher, embedding tail and recognized tutorial includes. Do not use a broad site rebuild for this slice.

For browser reproduction, first serve the repository locally (for example `python -m http.server 3001 --bind 127.0.0.1`), then add the optional browser gate:

```sh
node scripts/check-frog-lab.cjs --browser
```

After the default checks pass, this runs journeys and polish **serially**, avoiding competing browser workloads. Resource sampling remains a separate explicit command:

```sh
node scripts/frog-lab/check-resources.cjs
```

`FROG_BASE_URL` overrides the server URL; `FROG_NODE_MODULES` points to an existing Playwright/axe runtime. These commands overwrite their QA reports/screenshots. Do not rerun `capture-baseline.cjs` against the improved model: it would overwrite the before evidence.

## Acceptance limits

Browser conclusions are scoped to [journeys.json](journeys.json), [accessibility.json](accessibility.json), [resources.json](resources.json) and the post-integration smoke report, not just the unit-test count. [PERFORMANCE.md](PERFORMANCE.md) contains the measured before/after comparison, fidelity tradeoff and capture revision limits. See [TESTING.md](TESTING.md) for exact browser reproduction. This vanilla repository has no configured TypeScript or lint pipeline: JavaScript syntax, source/unit contracts, formatter, static checks, lab production assembly and browser execution were used; no nonexistent type-check/lint command is reported as passing.

Automated Chromium/SwiftShader observations do not certify physical laptop/tablet frame rates. Renderer allocation counts are not GPU-byte measurements or a retained-heap leak proof. Physical-device interaction/performance and educator review remain required before claiming classroom or scientific certification.

This is a generalized, sex-unspecified Rana-type educational approximation with preserved-specimen coloration. Coordinates and tension indicators are unitless, not measured force or calibrated biomechanics. There is no skeletal rig, watertight anatomical scan, clinical validation or full tissue-contact solver. Retained hidden deep anatomy extends slightly below the tray and needs a separate later-layer audit. No publication or deployment status is implied by this document.
