# Final DOM controls verification

Date: 2026-09-20. Both suites passed against the final source controls, including the latest Universe marker-centering change. No runtime or source files were changed by this verification.

| Command | Result |
| --- | --- |
| `node tests/check-universe-subparts.cjs` | Exit 0; 81 named subparts across 13 scales; five viewports; no page errors. |
| `node tests/check-lab-mobile-controls.cjs` | Exit 0; five initial viewports plus eight live resize cases; no page errors. |

Both suites cover 1440×1000, 768×1024, 390×844, 320×640 and 844×390, including tablet, phone portrait and phone landscape.

The Universe suite checks all named structures, previous/next navigation, all 13 options in the touch scale selector, inspection controls, keyboard focus, visible 44px exits after scrolling, and cancellation of stale AI responses. The lab suite checks the native Undo button state and callback, visible exits for controls, specimen chooser, structure details, console, attempt record, viva, tutor question, imaging and hand settings; focus restoration; modal keyboard containment; and long specimen names beside Undo and the ecosystem launcher.

The live resize regression starts the same mounted shell at 1440×1000, resizes through 390×844, 844×390 and 320×640, then returns to desktop. It runs once with mouse input and once with a coarse touch pointer. Assertions check the actual `bioq-phone` class and `shell.isPhone()`, hand and system DOM placement, horizontal tool tray, bounded objective and hand panels, retained instrument and Undo state, and zero camera requests. The real shared AI widget is mounted without sending a request: its existing launcher joins the phone footer, its panel opens and closes, and the launcher returns to its original host on desktop.

These are DOM and event checks with mocked engine/service state. They do not exercise WebGL rendering, actual undo geometry, real camera access or a live AI provider. Existing separate hand-layout evidence remains in `review/`; its three-device run has 30 observations and no issues.

Each suite saved five screenshots to the system temporary directory, using `biology-universe-subparts-WIDTHxHEIGHT.png` and `biology-lab-controls-WIDTHxHEIGHT.png`. Existing screenshots in `docs/dissection-interactions/hand-layout/` were untouched, verified by an empty scoped Git status.
