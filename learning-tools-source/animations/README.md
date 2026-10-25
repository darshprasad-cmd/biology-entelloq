# Entelloq animated explanations

Two original 22-second explanations rendered with **Manim Community 0.22.0**, with editable Python scenes and a local, dependency-free browser player. This is authored explanation media, not live simulation or experimental footage.

- `index.html?subject=physics`: vector components, head-to-tail addition, resultant, the exact 3–4–5 triangle, and the distinction between distance and displacement.
- `index.html?subject=biology`: a generic `E + S ⇌ ES → E + P` catalytic cycle. Enzyme shapes and screen times are symbolic. This chosen model has one substrate and one product; it is not an atomic mechanism or an enzyme-specific rate model.

## Product integration

Place in the existing Learn section, preserving the host layout and navigation. Copy only the paths in `asset-manifest.json` into the delivered runtime. The entry marker is `#animation-app`; query parameters select `subject=physics|biology` and `theme=light|dark`.

The player accepts `entelloq:theme` and `entelloq-learning:theme` messages only from its own parent and matching origin. Fields: `theme`, `tokens: {accent,surface,text,muted,border}`. Only valid CSS colors are accepted. Initial query theme is honored. No cross-window content or command messages are accepted.

No autoplay or remote request is needed. Only a poster loads initially. The poster is loaded through a relative PNG fetch and a typed Blob URL, so Biology's deferred portable assets work without a direct image-path request. Four stills are fetched and decoded when their disclosure is opened. Image failures offer a retry and keep the transcript available. Images have their own abort controller and Blob lifetime, separate from video resets. On Play or explicit chapter selection, the player fetches the same-origin MP4 and VTT and creates typed Blob URLs. Chapter selection seeks and pauses. Pause occurs on page hiding; iframe removal/pagehide aborts pending fetches and revokes all owned image/video URLs. A restored page reloads its visible images without autoplay. The two MP4s are under 0.5 MB each; the total runtime budget is under 3 MB.

Native video controls, keyboard-operable custom controls, four chapter buttons, complete transcripts and four static stills per subject are included. Reduced-motion users start with the transcript open and playback stopped. Stills load lazily. No external JavaScript, fonts, analytics or AI model. The host should call `iframe.contentWindow.EntelloqAnimations.destroy()` before removing a same-origin iframe; this synchronously pauses, aborts and revokes media. A `pagehide` fallback is also installed. When merely hiding a retained iframe, call `EntelloqAnimations.pause()` to stop current playback and invalidate a pending Play request without discarding the loaded film. A later explicit Play resumes normally. Classic entry scripts are at the end of `body`, so converting them to inline scripts in Biology's portable build preserves DOM readiness.

The overview poster has no active chapter until the film is loaded. A direct **Read without playback** link opens and focuses the transcript without fetching video. Playback status, chapter caption and progress reflect native controls as well as the wrapper. Each subject includes one optional, keyboard-operable comprehension question with explanatory retry feedback. It writes no storage and does not infer mastery or modify the review queue. All primary controls have at least 44px target heights; the player is checked at 320px, 768px and desktop widths in both themes.

## Rebuild

Use Python 3.12 and Node.js. Install into an isolated virtual environment:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements-lock.txt
.venv/Scripts/python.exe render.py
node build.mjs
node tests/browser.cjs
```

`render.py` invokes real Manim Cairo rendering, then encodes browser H.264/yuv420p MP4 with fast-start using the imageio-ffmpeg build. It verifies a complete FFmpeg decode, 660 frames, 30 fps, 1280×720, 22 seconds, silent audio state and per-video size budget. It extracts actual rendered stills and a contact sheet per subject. No TeX installation is needed: the scenes use Manim Text and geometry. The authored typography uses Segoe UI, present on Windows; on another OS install an appropriately licensed local font and change `FONT` before rebuilding (font differences can change line widths). No font file is redistributed.

`requirements.txt` records direct pins; `requirements-lock.txt` records the complete verified Windows/Python 3.12 render environment. Runtime browsers need no Python. Render cache and virtual environment are deliberately excluded from Git.

## Scientific scope and sources

Physics vectors are displacements in metres in a flat Cartesian plane with equal axis scales. Numerical assertions check `(3,0)+(0,4)=(3,4)`, magnitude `5 m`, and direction `atan2(4,3) ≈ 53.1°`. Traversing A then B has total distance `7 m`. The example does not infer speed from animation timing.

Biology uses one generic catalytic cycle. Reversible substrate binding is represented explicitly; the forward catalytic/release arrow is a simplification. The film does not claim a universal binding geometry, enzyme-specific stoichiometry, reaction duration, measured rate, equilibrium shift, or atomic mechanism. The enzyme is not consumed in the illustrated cycle. Lowering the activation barrier does not itself change reaction free energy or equilibrium; the animation makes no claim otherwise.

The original wording and geometry were checked against these authored textbooks; no textbook figures or prose were copied:

- [OpenStax, University Physics 1: Scalars and Vectors](https://openstax.org/books/university-physics-volume-1/pages/2-1-scalars-and-vectors)
- [OpenStax, Biology 2e: Enzymes](https://openstax.org/books/biology-2e/pages/6-5-enzymes)

## Verification

`qa/media-checks.json` records actual media properties, complete decoding and hashes. `qa/physics-contact.png` and `qa/biology-contact.png` show all four rendered phases and were visually inspected. `qa/browser-checks.json` records actual local playback, pause, chapter seeks, native caption cues, transcript/still alternatives, reduced motion, no pre-play video request, local-only requests, failure fallback, parent/origin theme gating, desktop/mobile layout and Blob URL cleanup. Pending-load regressions hold an already-buffered MP4 or VTT response across host teardown, then release it and verify no late Blob URL or media attachment is created. Host portable/live integration checks remain the responsibility of each product release.

Upstream [v0.22.0 release](https://github.com/ManimCommunity/manim/releases/tag/v0.22.0), [installation documentation](https://docs.manim.community/en/stable/installation/uv.html), and [MIT license](https://github.com/ManimCommunity/manim/blob/v0.22.0/LICENSE) verified on 24 October 2026. See `THIRD-PARTY-NOTICES.md`.
