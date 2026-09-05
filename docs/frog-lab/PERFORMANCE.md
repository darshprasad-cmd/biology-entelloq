# Measured rendering and resource behavior

2026-09-05. These are local Chromium **SwiftShader software-rendering** observations, not physical desktop/tablet/phone benchmarks. Three-second samples are short and noisy (4–10 frames after the change). They do not establish 30/60 FPS readiness. No performance improvement is claimed. The table and inventories below were cross-checked against the saved JSON reports; desktop and phone frame-time regressions remain visible rather than being averaged away.

| Viewport | Before FPS | After FPS | Before p95 frame | After p95 frame | Before JS heap | After JS heap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop 1440 × 1000 | 1.59 | 1.33 | 650.0 ms | 766.6 ms | 25,695,909 B | 32,128,880 B |
| Tablet 834 × 1112 | 2.07 | 2.09 | 499.9 ms | 483.4 ms | 31,099,904 B | 28,263,768 B |
| Phone 390 × 844 | 5.08 | 2.96 | 216.7 ms | 416.7 ms | 28,072,544 B | 28,981,303 B |

The available HTTP Content-Length response totals were **2,918,162 → 2,972,971 bytes** for each viewport, about 1.9% more. This is not complete compressed transfer accounting: missing Content-Length responses contribute zero, and the outer app prefetches another page. Production compression/caching differ. No external frog mesh or image-texture download was introduced. Subsequent small control/camera fixes and upstream tutorial integration add bytes beyond the captured revision; this number is explicitly not the exact final deploy payload.

## Fidelity cost and model inventory

The complete runtime specimen changed from 141 → 124 meshes, 141 → 118 materials, and 109,980 → 146,434 total triangles. Initially visible triangles changed from 14,618 → 43,168. The pure frog builder alone has 94,154 triangles; runtime decoration and retained internal anatomy account for the larger runtime total. These are separate inventories and must not be compared as if they were the same measurement.

The original aspirational total-triangle budget was not achieved. The visible body's continuous loft, modeled digits/webbing and stable limb surfaces add fidelity; smaller material/mesh counts do not cancel that rasterization cost. Retained internal anatomy still receives generic surface detail. Further LOD/tessellation work should be judged on real low-power hardware and include later-layer visual checks, not simply reduce anatomy to hit a number. The low-power option reduces pixel density/shadow resolution without changing the validated placement rules; the 2D alternative pauses 3D rendering.

## Restart resources

The initial specimen plus five replacements stayed at exactly **27 renderer geometry allocations, 6 texture allocations, and 1 workspace**. No uncaught errors were recorded. These are allocated-resource counts, not geometry/texture byte sizes. JS heap was sampled without forced garbage collection; oscillating heap values do not prove the absence of all retained-memory leaks. A separate pair of unit tests verifies that completed and unfinished incision marks release their materials/geometries at reset/disposal.

## Evidence and revision scope

- [baseline.json](baseline.json): unchanged shipped lab; full method and driver caveats in [BASELINE.md](BASELINE.md).
- [after.json](after.json): scene capture at `2026-09-05T14:24:55.938Z` from the 2,626,627-byte generated lab, before final host-switcher, label/help, camera-cancellation and upstream tutorial changes. The specimen, tray, lighting and camera framing did not change after this capture.
- [resources.json](resources.json): five replacement cycles at `2026-09-05T14:26:17.386Z` on that same scene revision; six samples including the initial specimen, with `passed: true` and an empty error list.
- `before-desktop.png`, `before-tablet.png`, `before-mobile.png`: original view.
- Final post-integration screenshots and [polish.json](polish.json) supersede intermediate screenshots for control placement only after the complete six-case polish run passes; they do not silently replace the earlier timing sample. The eight passing journeys in [journeys.json](journeys.json) do not certify the separate final polish gate.

Physical-device frame-time, touch/hand tracking and sustained-session profiling remain release follow-ups. A favorable software number would not remove that requirement.

The single-command checker in [IMPLEMENTATION.md](IMPLEMENTATION.md) parallelizes independent read-only checks to reduce development feedback time; this is not a claim of faster application rendering. Optional browser journeys/polish and any timing captures must run serially to avoid resource contention contaminating their results.
