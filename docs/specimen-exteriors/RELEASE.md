# Tested realism increment — 14 September 2026

This release covers all five specimens and the thirteen-stage scroll-zoom
Universe while retaining the existing dark-green interface and control positions.
It is not completion of the photographic reference target.

## Acceptance evidence

- `node scripts/check-learning.cjs`: **10/10 groups passed**, 55.5 seconds.
- `CI=true python -m unittest discover -s tests`: **12 tests passed**, including
  the committed-runtime allowlist and original protected-region fingerprints.
- Dissection and Universe targeted builders: both `--check` commands passed.
- `release-browser/exteriors.json`: all five actual WebGL exteriors, finite
  geometry and table-support bounds; the frog and cockroach must use their actual
  prepared GLBs, not a procedural fallback.
- `release-interactions/interactions.json`: all five real cut/forceps workflows
  passed through production input routing. Removed access layers disappear;
  prepared-roach abdominal clipping retains all six walking legs.
- Both final browser reports identify the same local lab artifact:
  `0ded8fb31597f4c8b7ab7c56e10ea26083cb96950dddc3038609e7a239978b03`.
  Both have zero page errors and zero camera requests. Optional remote bloom was
  deliberately blocked; software-renderer readback warnings are recorded.
- `hand-layout/hand-layout.json`: **60 responsive camera-panel states passed**
  with no errors or layout issues. These are shell tests, not physical
  webcam-recognition tests.
- `../universe-realism/browser/report.json`: all 13 stages, real browser
  pinch/wheel/keyboard events, live reduced-motion preference, tablet and phone.

The intact and opened screenshots were reviewed after the final frog/roach
integration, fish material changes and heart seam/decorative-vessel fixes.
The cockroach's appendages are no longer cut into floating segments. The heart's
closed ventricular lighting seam and false orange triangular decoration are gone.

## Canonical release bytes

The local browser evidence uses Windows working-copy bytes. Git and Pages use
canonical LF for text, so deployment verification must use the committed hashes
below, not the raw local HTML hash above.

| File | SHA-256 |
| --- | --- |
| `lab.html` | `a6ce061952cbd99074f4280b8a92ee5c95cef157abcdc3cdb5115adb189330b0` |
| `universe.html` | `3e639f618d7ae4735103ab35379067cbd474a63f534a4af390b75d2d9aa4f27d` |
| `assets/specimens/frog.glb` | `64ccc2056475153d70b5f68a2b3b94ff075f0491c63c76a65b7157e7f7c349bc` |
| `assets/specimens/cockroach.glb` | `03faef8793c04108c27a33cd581b11affa522e4565fc62558c09e54671444410` |

The source archives, rejected assets, duplicate preparation GLB and unrelated
layout work are deliberately excluded. Only the two prepared GLBs and their
attributions ship. Attribution is discoverable in the lab's help panel.

## Remaining work and release gate

The frog is a real scanned exterior and the cockroach is a textured authored
asset. Fish, earthworm, heart and internal anatomy remain procedural teaching
models, not exact photographic or species-validated reconstructions. The heart
still has simplified chamber boundaries. Universe is an illustrative scale
journey, not a calibrated molecular/astronomical simulation. Synthetic tracker
snapshots do not validate physical hand tracking or hardware performance.

Deployment requires a feature-branch PR, passing **Static site checks**, merge,
successful GitHub Pages deployment and verification of the HTTPS bytes. This
pre-merge evidence file does not itself assert that deployment has completed.
