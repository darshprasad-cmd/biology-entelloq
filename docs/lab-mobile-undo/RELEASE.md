# Universe subparts and mobile dissection release

Validated 2026-09-20 against the integrated branch based on `6e36fb9` (PR #16).
The learning/preview and shared AI changes from that release are preserved.

## Outcome

- Thirteen existing Universe scales retained, with 81 selectable, scene-anchored
  subparts, more complete biological geometry, measured PDB molecular coordinates,
  model/source notes, and a separate orbit/zoom inspection mode.
- Per-action dissection Undo restores pins, incisions and forceps access-layer
  pulls without resetting the specimen. History is bounded and preserves the
  prepared frog cavity clearance fix. See [Undo boundaries](../dissection-interactions/UNDO.md).
- Visible close buttons, focus restoration and 44px primary controls; all scales
  can be selected by touch. The lab adapts to viewport changes without rebuilding
  controls or restarting the camera. Its existing layout and specimens remain.

## Checks

| Check | Result |
| --- | --- |
| `node scripts/check-learning.cjs` | All 13 groups pass, including Python contracts, discovered unit suites, source-build guards, navigation, syntax and diff hygiene |
| `python scripts/build-universe.py --check` | Pass; original offline runtime, embedded textures and shared shell preserved |
| `python scripts/build-dissection.py --check` | Pass; only approved source slots synchronized |
| PDB preparation `--check` | Both archived coordinate blocks match deterministic regeneration |
| `scripts/check-universe-browser.cjs` | All 13 stages render at desktop and phone sizes; tablet cell, five actual 3D inspection flows, pinch/wheel/keyboard, reduced motion and panel controls pass |
| `scripts/check-dissection-interactions-browser.cjs` | All five specimens pin/cut/open through production synthetic-hand routing; prepared frog/roach required; actual phone Undo restores the final frog layer and Ctrl+Z restores its incision |
| `tests/check-universe-subparts.cjs` | All 81 entries across 13 scales; five viewports; navigation, focus and stale AI cancellation pass |
| `tests/check-lab-mobile-controls.cjs` | Five fresh viewports and eight live resize cases; X exits, Undo, real AI launcher placement and focus/state preservation pass |
| `tests/dissection-undo.test.cjs` | All four actual frog access layers undo and re-remove independently; 40 cavity rays clear; exact topology/normals, material identity, bounded history and irreversible-action boundaries pass |

Browser reports are in [Universe](../universe-realism/release-browser/report.json),
[five-specimen interactions](webgl/interactions.json), and
[DOM controls](DOM-CONTROLS-VERIFICATION.md). No camera request or page error occurred.
The WebGL harness intentionally blocks optional CDN post-processing and tests its
graceful no-bloom fallback; software-renderer readback warnings are not GPU speed
measurements. Real webcam recognition and physical phone hardware were not tested.

Canonical LF artifact SHA-256:

```text
universe.html ad4ba1d9f76c765d38156271bee2cf838713d74ec6fd82c90af60a70110ce217
lab.html      dadf44e92fe7fc1e8497b3f41f92ac013f002f00b730f56a0da138c5cef92136
```

## Visual and scientific review

| Before | After | Why |
| --- | --- | --- |
| Generic molecular coils and disconnected membrane loops | Deposited haemoglobin/DNA coordinates and connected mitochondrial folds | Improve structural accuracy rather than adding decorative gloss |
| Rough ER obscured the open nucleus in the first review | ER outside the nucleus with a narrow envelope connection | Correct the actual rendered compartment relationship |
| A narrow window retained desktop panels | Live responsive layout and an integrated mobile assistant launcher | Keep the tool tray, hand controls and close buttons on-screen |
| Undo could reveal a currently hidden system | Current system visibility preference survives rollback | Restore an action without changing the learner’s display choice |

These are explanatory 3D models, not photogrammetry or clinically validated
anatomical assets. Molecular display radii/colours are illustrative; atom clouds
are qualitative, and zoom transitions are not literal physical scale. Sources,
licensing and individual limitations are documented in
[Universe completeness](../universe-realism/COMPLETENESS.md).

No new runtime dependency, authentication, camera permission, AI provider,
deployment configuration or specimen asset change is included.
