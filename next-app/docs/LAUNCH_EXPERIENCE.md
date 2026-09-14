# An invitation to investigate

The launch page was rebuilt to show the breadth and learning experience of Biology Entelloq, while preserving its near-black and emerald visual identity.

## What changed

- A larger editorial opening: “Don’t just study life. Step inside it.” Original sculptural heart artwork replaces the small card-bound hero preview.
- A functional first investigation: switch surface, circulation, and interior illustrations; predict why ventricular wall thickness differs; receive an explanation and try again.
- A five-practical collection with original specimen sketches. The five practicals, fifty structures, and four study modes are counts verified against the current implementation.
- Interactive tutor examples for simplifying, connecting, and self-testing, explicitly labelled as illustrative rather than live AI.
- Clear support for mouse, optional webcam controls, and the 2D atlas; a real workspace screenshot shows the actual model quality and interface.
- More concise source context, practical FAQs, an emphatic closing invitation, and responsive layouts.

## Product honesty

The earlier claims about adaptive weak-concept recommendations, weighted mastery signals, simulated pressure controls, and microscope optical controls were removed. Those capabilities are not implemented. No user counts, partnerships, outcomes, reviews, or credentials are invented.

Hero artwork is conceptual, not an application screenshot or clinically validated anatomy. The SVG demonstration is an educational approximation; its short activity does not alter the learner's stored lab progress. The tutor examples are local authored content and make no provider calls.

The lab currently restores the active practical in this browser, not a cross-practical mastery history. Collection links open the lab; learners choose the specimen in its selector. This update does not change models, scientific simulation, camera tracking, AI-provider boundaries, or deployment configuration.

## Assets and performance

The optimized hero is 140,956 bytes and the workspace screenshot is 46,008 bytes. The hero uses responsive image delivery and high fetch priority; the actual-workspace image is lazy-loaded. The page does not load the Three.js viewer or hand tracking for its interactive preview. No runtime dependency was added.

Landing links disable automatic lab-route prefetching so the heavier viewer code is deferred until entry. Browser coverage asserts that the landing route makes no `/lab` requests before the learner selects its call to action.

The final production mobile Lighthouse run measured **95 performance, 100 accessibility, 100 best practices, and 100 SEO**, with 2.858 s LCP, 100 ms TBT, zero CLS, and 272.7 KiB total transfer. The report contains no runtime errors, warnings, or console errors.

During this pass, removing automatic lab prefetch reduced measured transfer from 476,370 to 279,258 bytes (41.4%) and eliminated `/lab` requests on the launch page. The earlier within-pass score was 85. These are individual simulated-mobile runs, not field measurements; the host CPU benchmark varied, so timing and score differences should not be attributed solely to the code change.

Both runs are retained in `docs/performance/lighthouse-launch-v2.json` and `docs/performance/lighthouse-launch-v2-before-prefetch-fix.json`. See [artwork provenance and the exact prompt](HERO_ARTWORK.md) and the [asset register](ASSET_LICENSES.md). Reports from before this launch redesign remain historical baselines.

## Verification

- Lint, TypeScript, and production build passed.
- 14 unit/component tests passed.
- 14 production browser journeys passed; 2 intentional skips (mobile 3D and the duplicate mobile viewport matrix).
- Zero axe violations in tested desktop/mobile landing and 2D lab journeys.
- Keyboard anatomy controls, both prediction outcomes and reset, tutor modes, FAQ expansion, reduced motion, and 390/834/1440-pixel overflow checks passed.
- Visual review confirmed desktop, tablet, and mobile layouts and no page exceptions. Existing lab journeys remain green.

Current viewport screenshots are `docs/screenshots/launch-v2-desktop.png`, `launch-v2-tablet.png`, and `launch-v2-mobile.png`. The full landing page is `launch-v2-full.png`; browser journeys also refresh `landing-desktop.png` and `landing-mobile.png`.
