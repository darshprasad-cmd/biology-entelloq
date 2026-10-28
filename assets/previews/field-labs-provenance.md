# Field-lab previews

`lab-stomatal-transpiration.webp` and `lab-quadrat-sampling.webp` are native browser captures of the original diagrams rendered by `src/library/field-labs.js`, captured on 2026-10-27. They contain no generated biological photograph or external image. The depicted organisms, leaf chambers and numerical observations are explicitly illustrative teaching simulations.

- Stomatal preview: the actual paired-chamber view, with the test leaf's lower surface sealed after a 30-model-minute comparison.
- Quadrat preview: the actual seeded meadow map and sampling grid, using seed 1729 and clustered positions.
- Processing: native PNG capture, RGB conversion, proportional thumbnail within 960 × 720 pixels, WebP quality 86. No biological detail was added or enhanced.

Reproduce from a served source build with `scripts/capture-lab-previews.cjs --ids=stomatal-transpiration,quadrat-sampling`. The isolated browser regression script also captures these exact component views without building or modifying the product. Preview states can differ in selected quadrat while preserving the same deterministic field.
