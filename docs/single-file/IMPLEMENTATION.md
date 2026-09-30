# Single-file Biology application

`python scripts/build-single-file.py` creates the complete application as
`dist/index.html`. It contains the landing page, app shell, eight pillar
documents, the dissection theatre and Universe, plus local scripts, styles,
preview images, prepared frog/cockroach GLBs and their attribution. The Three.js
r160 postprocessing graph is vendored with its license and provenance.

The authored source pages remain unchanged. The build normalizes text newlines,
uses deterministic gzip payloads, checks local dependency paths and rewrites
document navigation APIs only in executable code. Protected lab/source
fingerprints and the existing scientific model tests still apply.

The host decompresses the embedded payloads and uses same-origin `srcdoc`
documents to preserve the existing script and CSS scopes. A document bridge
resolves packaged resources and synchronizes logical routes with the containing
file's browser history. Hosted storage retains the existing origin and keys.
The prepared-model loader still validates its byte budget, GLB schema, anatomy
part contract and resource lifecycle; its bytes come from the package.

Only the generated application is deployed, alongside `CNAME`, `.nojekyll`, and
a small `404.html` that redirects legacy section URLs into the single file.
No companion files are required when sharing the generated HTML itself.

## Verification

- `node scripts/check-learning.cjs`: existing source contracts, scientific/model
  tests, source drift, boundary fingerprints, navigation, tutorials and syntax.
- `python scripts/build-single-file.py --check`: generated artifact consistency.
- `node scripts/check-single-file-browser.cjs`: real application served using
  only the generated HTML, then the same HTML copied into an otherwise empty
  temporary directory. All network dependencies are denied. The runner checks
  section routing, Back/reload, saved notebooks, theme, prepared specimens,
  immersive modal ownership, Universe scales, mobile layout and camera inactivity.
- `tests/test_single_file_build.py`: complete inventory, dependency validation,
  binary preservation, lexical transform regressions, module graph, source
  containment, compatibility routing and deterministic serialization.

Browser screenshots and structured results are written to this directory but
are excluded from source control. `--worlds-only` and `--file-only` are bounded
diagnostics that write separately named reports; only the default invocation
represents the full browser suite.

## Explicit boundaries

Live AI, Google identity, optional MediaPipe model downloads and web fonts retain
their online services. The offline browser suite does not verify live AI, real
accounts, real camera hardware, or anatomical accuracy beyond existing model
contracts. Scientific assumptions and educational labels remain authored content.

A file opened from disk has browser/file-specific storage. It does not inherit
website progress, and moving or renaming the file can change that storage scope.
The implementation requires `DecompressionStream`; automated verification uses
Chromium with software WebGL. No service worker or local web server is required.
