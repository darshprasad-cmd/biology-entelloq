# Dissection interaction release

## Scope

Preserves the existing dark-green app, page layout, shared launcher, offline
imports, tutorial and normal learning pages. No new dependency or downloaded
asset. User photographs informed finishes; they are not redistributed.

The September 6 follow-up explicitly reopens `cutting.js`, `surface.js` and
`hands.js` in the narrow dissection builder. The separate masked-shell hash is
derived from the original `4dcb67d2b1654d74d065b588acbde7831e6f5737:lab.html`
with those three additional approved module bodies masked. The original
40-file fingerprint fixture is **unchanged**; all other original source and
page-wrapper boundaries remain enforced.

## Corrected behavior

- Either anatomical tracker slot drives the selected instrument. Driver changes
  end a grip at its previous contact, reset wrist/flick history and never join
  unrelated cursors with an accidental cut. Two-hand separation uses the value
  actually published by the tracker. UI meters follow the same driving slot.
- Live incisions create separated surface triangles and layered geometric cut
  faces. Position-array lengths remain stable for softbody integration; topology
  is not rebuilt each display frame. Rest positions are captured before presses.
- A cut makes an access layer available for a deliberate forceps pull. Pulling
  works beyond the original silhouette. Completed access sheets are hidden,
  marked removed, and excluded from picking; no faded sheet or wound overlay is
  left over the cavity. Structural skin/body-wall shells retain plane-clipped
  uncut backing/head/tail with a continuous thin rim. Supplementary fascia,
  peritoneum, pericardium and epicardium sheets leave no residual film or hoop.
  A click, a cut alone or retraction alone cannot remove an access sheet.
- Preview-visible deeper organs cannot intercept tools before their layer is
  exposed. Frog guidance no longer skips fascia/peritoneum; heart guidance
  includes the fat covering and epicardium. Legacy species hints resolve tool
  numbers against the actual dock order.
- Grip strength is not penetration depth: a firm pinch or mouse button alone
  no longer awards a perforation injury. Explicit depth input retains that path.
- Active hands use a compact status/Settings/Stop strip. Expanded settings are
  stable across tracking updates; camera-picture off removes the empty preview.
  Stop cancels pending model/camera initialization and releases late tracks.
  Rapid re-opt-in queues behind cancellation rather than failing permanently.
- Four frog limb roots are buried inside the authored trunk, taper into existing
  feet and have smoother radial sections. All five specimens receive restrained,
  tissue-specific finishes with procedural roughness variation.
- Both heart ventricular surfaces have corrected outward triangle winding.
  All 32 heart parts retain identical positions, bounds and transforms; only
  the two ventricular surfaces' face order/normals change. Real front-surface
  ray tests now produce incision gaps while retaining the opposite wall.
- The large bench plane uses a small 12-by-12 grid instead of two oversized
  triangles, removing a verified black diagonal in the earthworm working view.
  Table dimensions, materials, illumination and the original lamp are unchanged.
- Changing a case after an attempt starts loads a fresh specimen, avoiding stale
  cut topology and removed surfaces being reused by the new pathology.

## Verification

`python scripts/build-dissection.py --check` verifies exact source/artifact sync.
`node scripts/check-learning.cjs` runs all eight required local check groups,
including the original preservation boundaries and all Node/Python contracts.
The final release check results are recorded below after integration with main.

Focused automated checks cover left/right tracking slots, two-hand span, loss
handoff, camera cancellation/restart, case resets, all-five cut geometry,
forceps completion, ghost exclusion, geometry disposal, frog attachments and
surface-material lifecycle.

`scripts/check-dissection-interactions-browser.cjs` loads the actual standalone
lab and all five specimens with real WebGL. Synthetic right-hand snapshots go
through the production input router. It operates pins, incisions and forceps,
uses the species-specific access sequence, verifies active topology changes and
complete removal, and allows actual application frames between cutting and
removal so softbody/constraints/cutting integration is exercised. It forbids
camera requests. See `browser/interactions.json` and intact/opened screenshots.
All five specimen sequences passed, with zero page errors and zero camera
requests. Frog traverses four access layers, fish two and heart three, and
earthworm/cockroach one exterior access layer each. Cockroach wings/fat, fish
operculum and the heart fat covering are also lifted with forceps. The final
heart-only rerun in `heart-final/` additionally opens the left ventricular wall
after verifying its corrected surface; the initial all-five run ends at the
epicardium and is retained separately.

`scripts/check-hand-layout-browser.cjs` separately checks the actual shell at six
desktop/tablet/phone/landscape sizes, with keyboard, off/loading/failure/live,
expanded/collapsed and camera-hidden states. See `hand-layout/hand-layout.json`.
These are application and layout checks, **not** webcam recognition tests.
Current layout result: all 60 observations across six sizes passed, with no
overlap/interaction errors; active control height is 60–61 pixels.

## Scientific and visual limits

The supplied photos and [Carolina's frog dissection guide](https://knowledge.carolina.com/discipline/life-science/anatomy-and-physiology/frog-dissection/)
support distinguishing skin access from body-wall access; the implementation
still simplifies that process. One sufficient incision followed by a forceps
pull releases a predefined access side, not the physically simulated cutting
of every boundary/attachment of an arbitrary freeform flap. The cut rim has
depth, but tissue tearing, elastic fracture, bleeding and haptics are not
validated physical models. Distances are model units, not calibrated millimetres.

These remain procedural teaching models, not scanned specimens or photorealistic
reconstructions. The separate fascia/peritoneum and epicardium stages are
teaching abstractions, not a prescribed real-world dissection protocol.
Species and organ-detail limitations recorded in
[ANATOMY.md](../dissection-realism/ANATOMY.md) are not solved by surface finish.
Educator review and real-webcam/device validation remain necessary; no claim of
complete anatomical accuracy, clinical use, guaranteed frame rate or GTA-level
fidelity is made.
