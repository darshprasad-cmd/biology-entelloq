# Biology launch restoration — 16 October 2026

Restore the established public page, keeping the current app interiors and learning behavior. The source design is `937717be541b1600b58ef72cb47a6aa5d3b79c75` (before PR 34); the implementation starts from production `884b6c145754fa3bad940656ab7f6229b0e9526a`, including PRs 35 and 36.

## Composition and realism

The original botanical green DNA hero, thin “Where Biology Comes Alive” heading, compact navigation, numbered section rail, floating Unravel Life marker, four photographic teaser cards, and immediate app entry return. The original ten sections retain their order: introduction, learning steps, worlds, reasoning, enzyme experiment, scientific assumptions, hand tutorial, FAQ, founder, final invitation. The original footer and family links remain.

The wet, refractive DNA artwork already carries convincing depth. A directional text scrim preserves its bright right edge. Restrained upper highlights and contact shadows give existing cards and the floating marker clearer material definition. A translucent animal-cell illustration appears only inside the existing Life Up Close teaser, labelled illustrative. Biological images are simplified illustrations, not microscopy. The founder portrait remains in its original color; factual founder copy replaces the historical invented quotation.

## Motion storyboard

1. The original brief entrance settles into a slow, low-amplitude DNA drift. Pointer movement is bounded to four pixels.
2. The original motes and floating marker move gently. Existing sections reveal once on entry; there is no pinned camera sequence.
3. The original normalized enzyme illustration retains its model and controls. Global pause also pauses this decorative animation.
4. Pause persists locally. Reduced motion gives a static page with all content available. DNA animation and pointer updates stop while the hero is offscreen or the document is hidden. Mobile removes card backdrop blur.

## Preservation boundary

Only the public `index.html`, two launch-only source files, a bounded browser check, and this evidence folder change. The app shell, host readiness handoff and 15-second error/retry recovery, current interior styles, science controls, learning modules, progress persistence, dissection, search destinations, and latest evidence-table/phylogeny improvements remain unchanged. The single-file artifact is rebuilt from source; generated HTML is never edited directly.

The source preview is `http://127.0.0.1:3039/`. Design screenshots must be reviewed before merging or publishing this restoration. Historical October 14 release evidence remains historical.

## Local validation

- Root and independent visual review accepted the restored 1600px desktop and 390px mobile direction. The mobile family switcher uses a 44px circle at its established bottom offset, clear of teaser text.
- Six source widths (360, 390, 768, 1440, 1600, 1920): all ten sections, four teasers, complete visible images, no horizontal overflow, original-color founder, valid anchors, search, FAQ and unchanged enzyme rates. Keyboard skip, persisted pause, offscreen pause/resume and immediate Home entry pass.
- Packaged 1440px and 390px: hero and assets, search closes on the first Escape, family switcher, founder color, fragment navigation, Home entry and Learn readiness without recovery overlay pass; no page errors.
- 32 Python contracts and the learning check's unit, navigation, tutorial, syntax and source-boundary groups pass. The initial Windows CRLF-only drift was verified to contain no content differences and normalized by the existing source builders; the four affected check groups then passed. Nine launch unit cases pass.
- Single-file build and deterministic check pass (27,207,382 bytes locally). The app shell, reading pages, library and single-file host/bridge have no Git content diff against the production starting commit.

Local screenshots and JSON reports are in this folder and its `package` subfolder. Browser checks are bounded Chromium evidence, not physical-device or screen-reader validation. Publication must additionally wait for required CI and verify the live CI-built bytes plus decoded package contents; Linux and Windows compressor output can differ.
