# Animation quality pass — 24 October 2026

The existing films, captions, scientific assumptions, local assets and teardown contract are preserved. The upgrade improves how a learner reads, controls and checks the explanation.

| Before | After | Why |
| --- | --- | --- |
| Finished overview poster highlighted chapter one and displayed its caption. | Overview prompt with no active chapter until the movie is loaded. | The text now describes the image and actual playback state. |
| Native pause/end could leave “Playing” in the status. | Native and custom controls update pause, replay, end, chapter and progress state. | Visible feedback matches what is happening. |
| Mobile caption reserved 142px even for one short sentence; controls could be 36–42px high. | Content-sized caption with a clear chapter label and controls at least 44px high. | Less dead space and more usable touch targets. |
| Reading alternative required finding a disclosure below the player. | Keyboard-accessible “Read without playback” opens and focuses the transcript, without fetching video. | Reading is a first-class path, including reduced motion. |
| No active recall after watching. | One optional subject-specific question with explanatory retry feedback. | Learners can check the key idea without adding a grade or changing their review record. |
| Biology's deferred portable image assets did not resolve from direct image paths, leaving broken posters/stills despite valid PNGs. | Relative fetches create typed image Blob URLs; stills load on disclosure, failures offer retry, and teardown cancels/revokes image ownership separately from video. | Images can render through the portable fetch bridge without loading video automatically. |

## Verification

- `PLAYWRIGHT_CHANNEL=chrome node tests/browser.cjs`: **26 passed**, no page errors, no external requests (final image-loader checks on 26 October).
- Both subjects: explicit playback, native captions, speed, paused chapter seeking, full transcript and stills, failure retry, pending-load cancellation and Blob cleanup retained.
- New checks: keyboard transcript focus without media fetch; wrong-answer retry then correct explanation; zero localStorage writes; native end/replay status and exact 22-second progress.
- 320px phone, 768px tablet and 1280px desktop, light/dark, reduced motion: no horizontal overflow; all primary controls at least 44px high.
- Inspected `quality-light-320.png` and `quality-dark-768.png`, plus existing subject screenshots. Screenshot filenames beginning `quality-` record the new responsive pass.
- `node build.mjs`: 18 runtime assets, with final byte sizes and hashes in `asset-manifest.json`. No new dependency or media render.
- Image-specific checks block direct image URLs while allowing the same relative-fetch mechanism as the portable bridge: poster and all four stills decode at 1280px; only the poster is fetched before opening stills; image retry works; pending-image teardown cannot attach or allocate late URLs; page restoration reloads images. Real portable host verification remains separate.
- `node --check main.js`, `git diff --check`: passed.

The checkpoint is held only in this document and resets on reload. It does not certify mastery, modify FSRS, or write a student record. Existing media remains authored explanation, not live simulation.

Content checked against [OpenStax vectors](https://openstax.org/books/university-physics-volume-1/pages/2-1-scalars-and-vectors) and [OpenStax enzymes](https://openstax.org/books/biology-2e/pages/6-5-enzymes). Original wording; no figures copied.
