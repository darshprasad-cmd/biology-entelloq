# Earthworm diagonal: bounded renderer diagnosis

The black diagonal was reproduced in the actual 1440 × 1000 WebGL lab using its
earthworm camera. It was not resolved by hiding the decorative overhead fixture,
disabling all light shadows, hiding the additive light-pool plane, or hiding the
contact-shadow plane individually. Raycasts through the black region hit the
ordinary pad/bench, not an intervening lamp.

Hiding all three environment planes removed the artifact. With the pool and
contact plane individually excluded as causes, the remaining opaque 70 × 70
bench was isolated. Replacing **only** its `PlaneGeometry(70, 70)` with
`PlaneGeometry(70, 70, 12, 12)` removed the diagonal while retaining the original
bench dimensions, transform, material, lights and specimen. See `before.png`
and `segmented-bench.png` from the live diagnostic.

This establishes an oversized-triangle rendering artifact in the tested
browser/renderer path, not the exact driver-level mechanism. Postprocessing was
unavailable in that offline fallback (`composer` was null), so this observed
artifact did not require ambient occlusion. An attempted optional AO toggle
therefore had no applicable pass; it was not the successful intervention.

The source fix uses 288 bench triangles instead of two (+286), with no specimen,
organ-position, interaction, layout, lighting-quality or material change. The
unrelated hide-lamp workaround was reverted, restoring the original fixture.

`node scripts/check-earthworm-scene-browser.cjs` checks the actual built page's
bench geometry and samples three previously black points that raycast onto the
pad. It requires them to render the green pad. `--diagnose` additionally renders
the original two-triangle bench for comparison without requiring all GPU drivers
to reproduce its old artifact. This is a focused render regression, not full
specimen or real-camera QA. The final regression run is coordinated by the root
task after its source-to-page build.
