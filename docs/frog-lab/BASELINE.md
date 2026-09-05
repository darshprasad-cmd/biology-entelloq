# Frog lab baseline

Captured from the unmodified shipped `lab.html` before source assembly or frog-model changes. Route: `app.html#lab`, which loads `lab.html?instant=1` inside `iframe#launchFrame`. The frog opens automatically in step 1.

## Reproduction and observed defects

- Desktop: the frog presents a pointed teardrop silhouette with large prominent eyes. Forelimb sections visibly separate at the joints, feet do not meet the limbs convincingly, and hindlimbs appear behind the body rather than spread on a tray. The instrument points at the body but the teaching view gives no four-limb target regions or pin count.
- Tablet: the same anatomy defects remain; the structure inspector overlaps the system navigation. The tool dock, hand controls, blood setting, console, inspector, tutor launcher, and step panel all compete with the specimen.
- Phone: the camera framing clips distal limbs at the left and right viewport edges. The large lower inspector obscures part of the specimen; it is not possible to infer the complete four-limb task from this framing. Document overflow is zero, illustrating why an overflow test alone is insufficient.
- All sizes: atmospheric particles, glossy highlights, and the dark theatrical floor obscure the intended laboratory context. The student-facing Console button is present. No JavaScript page errors or failed requests were observed; these defects are model/presentation/interaction problems, not a failed application boot.

## Model and scene inventory

The model is original procedural JavaScript, not a GLB/glTF asset. There is no skeleton, no bones, and no rigged skin. The baseline specimen contains 141 meshes, 141 geometries, and 141 distinct materials. Total specimen triangles: 109,980; initially visible specimen triangles: 14,618. The complete scene contains 180 meshes. Nineteen generated texture objects were found, all 256 by 256 pixels. No external model or texture transfer is required.

The 29 independently represented anatomy parts include skin, four limbs, body-wall layers, liver lobes, gall bladder, heart, lungs, digestive tract, cloaca, urinary bladder, spleen, fat bodies, kidneys, dorsal aorta, vertebral column, superficial fascia, and parietal peritoneum. Their part IDs, material/geometry information, transforms, world-space bounds, visibility and triangle counts are retained in `baseline.json`. Most decorative mesh names are empty, even though selectable parts have `userData.partId` identifiers.

Likely contributors established by source inspection:

1. `src/lab/frog.js` builds the body from a strongly profiled sphere and independent tube/primitive limbs; it is not an authored continuous anatomical surface. Limb attachment therefore depends entirely on matching endpoint geometry and transforms, with no skeleton to maintain joint continuity.
2. The whole specimen receives an x rotation of `-Math.PI / 2.35`, despite its own coordinate convention declaring positive y as the ventral direction. This materially changes what the teaching camera sees and where the anatomy lies relative to the tray.
3. The eye primitives and head/trunk profile do not read as an appropriately posed teaching specimen in the observed camera view. Material effects cannot repair these geometric relationships.
4. `dissect.js` records a set of pinned part IDs and draws a cone at a picked point; it has no distal anchor schema, exact persisted anchor coordinates, step-one undo/reposition workflow, or visible four-target placement interface in this baseline.
5. The environment/post-processing/dust systems emphasize a theatre, while `shell.js` keeps multiple competing panels visible. The requested first-step experience requires coordinated geometry, camera, procedure and interface changes.

This evidence supports correcting/replacing the original procedural specimen and its controlled pose, not masking the current shape with new shaders. Model correction and detailed biological review are tracked separately from this read-only baseline.

## Repeatable local measurements

| Viewport | Sampled frame rate | p95 frame interval | JS heap used | Available HTTP Content-Length total |
| --- | ---: | ---: | ---: | ---: |
| Desktop 1440×1000 | 1.59 fps | 650.0 ms | 25,695,909 B | 2,918,162 B |
| Tablet 834×1112 | 2.07 fps | 499.9 ms | 31,099,904 B | 2,918,162 B |
| Phone 390×844 | 5.08 fps | 216.7 ms | 28,072,544 B | 2,918,162 B |

Method: fresh headless Chromium context per viewport, device pixel ratio 1, a three-second requestAnimationFrame sample after the specimen is ready. These numbers describe this automated rendering environment, not physical school-laptop or tablet performance. Chromium reported GPU stalls associated with ReadPixels. The report deliberately does not claim 30/60 fps hardware certification or GPU-memory measurements. Heap samples are not a restart-leak test. HTTP totals sum available Content-Length response headers, including the app shell's prefetched page; responses without this header contribute zero, so this is not complete compressed transfer accounting. Production compression and browser caching will differ. Inlined model/vendor bytes are part of the HTML response. Core Three and OrbitControls are vendored, but optional post-processing still requests unpkg modules, and the outer shell requests Google fonts.

A separate read-only query of the unchanged baseline confirmed the renderer is `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`. This is software rasterization, not the user's physical GPU. Before/after timings on this driver are useful only as a directional automated comparison.

Initial improvement budget: reduce continuously active post-processing and duplicated specimen materials; retain separately identifiable anatomy while targeting fewer than the baseline 109,980 specimen triangles and 141 materials; keep the lab route within the existing approximately 3 MB uncompressed local transfer envelope unless documented anatomy fidelity requires more. Evaluate measured visual fidelity and safe interaction before reducing geometry further. The user’s 12 MB GLB and 16 MB texture limits are not directly applicable while the authored model remains procedural.

## Evidence and rerun

- `before-desktop.png`, `before-tablet.png`, `before-mobile.png`: complete student view.
- `before-*-scene.png`: scene region with the same camera/view.
- `baseline.json`: raw inventory, transforms, frame samples, memory samples, text, network outcomes and console diagnostics.
- Run `node scripts/frog-lab/capture-baseline.cjs` against a separately served unchanged baseline only. It overwrites the baseline evidence. The external validation runtime can be overridden with `FROG_PLAYWRIGHT_PATH`; the URL with `FROG_BASE_URL`.

Repository note: this base revision did not contain `AGENTS.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` or `CRITICAL_AREAS.md`. The repository README, assembler, anatomy, frog, dissection, shell and main-module contracts were inspected. No app source or generated page was changed during baseline capture.
