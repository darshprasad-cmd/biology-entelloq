# Third-party notices

## Manim Community 0.22.0

Source: https://github.com/ManimCommunity/manim/tree/v0.22.0

License: MIT; the complete upstream notice is in `licenses/manim-MIT.txt`.

Manim is used as a build-time renderer. The delivered web runtime contains original Entelloq media and player code; it does not include Manim Python or its native dependencies. These scenes are original, not copied from the Manim example gallery.

## Render-time tools

`requirements-lock.txt` records the isolated render toolchain. PyAV and imageio-ffmpeg provide media encoding/inspection at build time. Their Python packages and FFmpeg binaries are not shipped with the website. Installers retain their own upstream notices. FFmpeg encoding here produces H.264/yuv420p media for broad browser playback; codec/patent obligations, where applicable to a distributor, are independent of the source-code licenses.

Segoe UI is used through the operating system for rendering. No font files are bundled. Browsers use their available system fonts for the surrounding player.

## Educational references

OpenStax University Physics Volume 1 §2.1 and Biology 2e §6.5 were consulted for scientific verification. No figures, tables or passages are reproduced. Film geometry, explanations, text and captions are original. The media contains no human subjects, photographs, audio recordings or externally sourced visual assets.
