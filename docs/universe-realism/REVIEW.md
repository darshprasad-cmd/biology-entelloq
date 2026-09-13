# Universe rendering and navigation pass

September 13, 2026. This is a bounded rendering/input improvement to the existing
thirteen-stage Universe, not a replacement with photorealistic anatomical scans.
The existing dark-green HUD, stage order, hotspot content and shared launcher are
retained. No new dependencies or downloaded images were introduced.

## Observed issues and implemented changes

| Before | After | Why |
| --- | --- | --- |
| Touch generated both pointer-drag and separate touch-pinch input; spreading fingers zoomed outward. | One tracked Pointer Events gesture; spreading fingers zooms inward; third fingers cannot steal the gesture. | Predictable navigation without double input or jumps after finger release. |
| Keyboard input eased and inherited momentum; reduced motion stopped only a marker pulse. | Keyboard navigation is immediate. Reduced motion cancels inertia and parallax, freezes idle stage animation, and responds to live preference changes. | Repeated navigation remains responsive and motion-sensitive users can explore. |
| Dissolving opaque surfaces still wrote depth; two animated materials ignored stage fade. | Depth writing turns off during fade and restores only for originally opaque surfaces. Animated opacity also multiplies stage fade. | Approaching scales are not occluded by a nearly invisible previous shell. |
| Tissue roughness maps were roughly 50% grey, halving authored roughness; strong cyan/violet fill made tissue look lacquered. | Near-white linear-data roughness maps, restrained moist defaults, neutral key/fill and softer rim lighting. | Tissue retains diffuse form and broad highlights instead of a coloured plastic finish. |
| Displacement used uncorrelated per-vertex noise. | Coherent trilinear value noise with smooth interpolation. | Organic surfaces no longer look crumpled or faceted; repeated seam positions remain coincident. |
| Earth had oversized stacked atmosphere rings and a bright blurry deep-field background. | Thinner, dimmer atmosphere and restrained background and city-light emission. | Cleaner planetary silhouette; atmosphere is still illustrative, not a calibrated scattering simulation. |
| A phone cropped most of the subject; the launcher obscured the scale. | Responsive field of view preserves horizontal framing, and a small HUD offset clears the unchanged launcher. | A complete cell/planet remains visible and the scale remains readable. |
| The HUD removed the `~` qualifiers from authored sizes. | Approximate sizes retained, plus an explicit illustrative-model / non-scaled-transition note. | Visual polish must not imply measured microscopy or physically calibrated travel. |

## Scope and preservation

Approved source slots: `kit.js`, `core.js`, `ui.js`, `stage_cosmic.js`,
`stage_molecular.js`. `scripts/build-universe.py` syncs exactly those slots; it
does not run the legacy assembler or touch imports, external scripts, the
launcher, embedded imagery, other stage modules, knowledge data or startup.

`tests/fixtures/universe-shell.sha256` was derived **before modifying universe.html**
by masking only these five slot bodies in the existing artifact. Fingerprint:
`877eb6161b431a3a8328cb2c4038157b884c09c9bfb116d28be87b754d9b47e8`.
The builder rejects missing/ambiguous slots and shell changes; `--check` is
non-mutating. The original dissection fingerprint is not altered by this pass.

## Verification

- `python scripts/build-universe.py --check`
- `node --test tests/universe-controls.test.cjs tests/universe-build.test.cjs`
  — 10 tests passing, including real Three.js material/geometry contracts.
- `node scripts/check-universe-browser.cjs` — real Chromium/WebGL renderer,
  offline optional post-processing failure path, all thirteen scales, keyboard,
  reduced motion, touch-pinch browser events, tablet/mobile captures. See
  `browser/report.json` for the completed run, not a claim based on test names.
- `before/` captures were taken from the original artifact. Visual review of
  the after captures checked colour cast, silhouette, mobile framing and HUD.

Synthetic browser touch events are not physical-phone testing. Software WebGL
captures do not establish hardware FPS. Webcam/AR is not used by this experience
and no camera is requested. The complete repository release checks belong to
the coordinating task and must pass before deployment.

## Scientific and visual limits

The renderer is a conceptual scale relay: its constant on-screen scale factor
does not represent the unequal physical size ratios between stages. Biological
colours and motion aid interpretation. Existing heart/cell/protein geometry is
procedural and remains stylized, not photographic or clinically validated.
The molecular stage is schematic, including a Bohr-style atom and simplified
chemical structures; it is not an atomic-coordinate reconstruction. The existing
protein combines generic structural motifs and should not be presented as a
validated haemoglobin fold. Upgrading those models requires a separately tested
coordinate-based model/content pass; this rendering improvement does not fix
that pre-existing scientific limitation.

Public-domain source photographs already embedded in `_textures.js` remain
unchanged; there are no new licensing claims or newly copied reference images.
