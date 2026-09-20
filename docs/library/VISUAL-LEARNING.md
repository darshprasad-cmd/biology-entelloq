# Visual browsing and connected practice

Biology keeps its existing dark and light palettes and launch photograph. The changes focus on layout, visible model previews, concise complete content, and a connected Learn–Reason–Solve loop.

| Before | After | Why |
| --- | --- | --- |
| Experience choices mostly described their destination in paragraphs. | Home, the section chooser, lessons, labs, practice choices and recommendations show the actual model or view before opening. Learn has static model previews for all 73 published concepts. | Students can recognize the experience and compare choices, including on touch screens. |
| Learn put most detail on the first reading surface. | A short explanation leads; further detail and worked reasoning unfold on demand. Every published topic has a curiosity card, a complete example and a linked prerequisite/related-concept map. | Preserve depth without making the first screen a wall of text. |
| Moving into practice lost the active concept. | Learn links to topic-specific Reason and Solve. Both return to the same concept and explanation mode, including inside the app and after reload. | Make learning and self-testing one continuous activity. |
| Atlas and timeline choices used labels alone. | Ten body systems and twelve evolution stages have distinct conceptual diagrams and matching selected views. | Show the subject before selection while keeping the scientific simplification explicit. |

## Practice behavior

All 73 published concepts have three distinct Solve questions: the original quick check and two authored application checks. Feedback explains the mechanism, answers survive navigation, and a retry starts a fresh topic attempt. Reason lets a learner write a prediction, reveal causal steps, compare with the model answer and save a reflection. Written reasoning is not automatically graded or represented as measured mastery. Original Solve sessions, scores and mistake history remain independent.

Routes use `learn.html#topic/{id}/{mode}`, `reason.html#learn/{id}/{mode}` and `solve.html#learn/{id}/{mode}`. The same-origin app bridge preserves the complete route in its own URL. Storage failures retain usable session-only practice and say so.

The three original Reason cases retain their seven-stage exercises, with visible concept diagrams and contextual Learn/Solve links. Their wording now distinguishes red-cell mass from concentration, selection from mutation, and regulated glucose ranges from an exact fixed value.

## Preview maintenance

- `src/previews/previews.js` and `.css`: shared browsing and shell surfaces; no experiment starts on hover.
- `src/library/visuals.js`: static Learn previews come from the same diagrams as the interactive models, with unique SVG IDs and no timers.
- `src/previews/reference.js` and `.css`: conceptual Atlas/timeline illustrations, using existing theme variables.
- `scripts/capture-lab-previews.cjs`, `capture-study-previews.cjs`, and `capture-app-previews.cjs`: real isolated view captures, compressed to WebP. Capturing never reads real learner activity.
- `scripts/build-previews.py` and `build-library.py`: explicit generated slots, with idempotent `--check` validation.

Preview images are lazy-loaded. The asset collection is under 1 MB. The 175 unwritten curriculum entries stay in editorial metadata and are excluded from learner results; the experience catalog exposes only working destinations.

## Verification

The focused browser suites cover all published models, preview coverage, original lab workflows, desktop/mobile layout, keyboard selection, restricted storage, exact practice round trips and reloads. Reports and selected screenshots are kept beside this document. The aggregate checker covers scientific model contracts, preserved dissection boundaries, generated-page drift and existing navigation. The AI regression uses a mocked service boundary; it does not imply live provider, camera or account verification.
