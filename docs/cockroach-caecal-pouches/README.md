# Cockroach gastric caeca — bounded anatomy correction

September 28, 2026. Base: `54a699ce447c7d9283fabae34bcf75a2e9256476`.

## Correction and preservation

The former selectable caecal torus lay in the gut's longitudinal plane, while
eight decorative child fingers surrounded it in a different plane. Some fingers
did not meet the midgut, and nonrecursive dissection picking targeted the ring,
not the fingers.

The replacement contains eight separately closed, curved pouches batched into
one owned, selectable mesh. Embedded roots meet the anterior midgut in its
transverse plane. Rounded distal caps are blind ends; no invented visible ring
connects them. The ventral pouches do not extend below the existing gut's floor.
The same part ID, layer, cut/lift flags, material and objective remain in use.

Only `src/lab/cockroach.js` and its approved generated `lab.html` slot change at
runtime. Layout, hand tracking, shared materials, other organs, other specimen
builders, launcher and deployment settings are unchanged. The other 26 cockroach
parts retain exact metadata/transform and interior-vertex hashes captured from
the accepted base commit. The original dissection fingerprint fixture is intact.
The revised part uses one mesh and 7,488 triangles, versus nine meshes and
14,720 triangles in the previous procedural caeca; this is a part-local geometry
comparison, not a measured application frame-rate improvement.

## Evidence and limits

[Richard Fox's Lander University P. americana dissection guide](https://lanwebs.lander.edu/faculty/rsfox/invertebrates/periplaneta.html)
supports eight fingerlike digestive pouches at the anterior midgut. This is not
a measured reconstruction: dimensions, curvature and anterior display direction
are illustrative. Roots are closed surfaces intersecting a separate gut mesh,
not simulated ducts or a continuous lumen. No reference image was copied.

The whole cockroach remains a generalized teaching model, not a certified
P. americana specimen. Reproductive, gland, tracheal and straight-midgut
simplifications remain documented in `../dissection-realism/ANATOMY.md`.
The old procedural ventral shell does not completely enclose the old gut;
the new tests prevent additional ventral protrusion, not claim complete cavity fit.
An educator's review is still needed for anatomical validation.

## Reproducible verification

- `python scripts/build-dissection.py --check`: narrow source synchronization.
- `node scripts/check-learning.cjs`: all fast checks, source drift, original
  boundaries and headless suites. Run separately from software-GPU browsers to
  avoid contention with the existing 90-second unit-test budget.
- `node --test tests/cockroach-caeca.test.cjs`: five tests using actual geometry,
  not author metadata. Eight closed components, edge incidence/winding,
  nondegenerate outward faces, actual midgut-surface intersections, direct
  picking of each pouch and real probe/scalpel/forceps engine actions.
- `node scripts/check-cockroach-caeca-browser.cjs`: actual prepared cockroach
  with a deliberately isolated digestive-region view; verifies rendering,
  probe/forceps removal and the app's extraction Undo boundary. This diagnostic
  is not presented as the normal shell-opening workflow.
- `node scripts/check-dissection-interactions-browser.cjs`: actual rendered
  opening sequences across all five specimens using synthetic tracker snapshots
  routed through production input. Includes native phone-tap access-layer Undo.
- `node scripts/check-dissection-browser.cjs`: actual loaded prepared exteriors,
  five-specimen support contact/orientation and absence of idle tissue motion.
  The check now waits for the asynchronous loader instead of sampling before
  prepared assets finish. It checks the served artifact bytes and forbids camera
  access.
- `node scripts/check-hand-layout-browser.cjs`: real shell and CSS at desktop,
  laptop, tablet, two portrait phone sizes and landscape; synthetic hand states,
  no renderer or tracker. It does not validate webcam recognition.

Preview uses `BIOLOGY_PREVIEW_URL=http://127.0.0.1:3007`. Reports are stored in
`detail/caeca.json`, `interactions/interactions.json`, `bench/browser.json` and
`hand-layout/hand-layout.json`. Require
`complete: true` before considering a browser run successful. Optional remote
bloom addons are deliberately blocked; core rendering is local and unchanged.

The app intentionally clears Undo at organ extraction or attachment severing.
This release does not weaken that safety boundary. Isolated engine Undo tests
are distinct from app-level restoration; incisions and peeled access sheets
retain their existing Undo behavior.

Production verification is separate: after green PR checks and deployment,
compare HTTPS artifact bytes with the merged source and repeat the focused
browser check against the live page. Local screenshots alone do not prove release.

## Final preview results

- Focused real-render probe/extraction check: passed, prepared exterior loaded,
  no page errors or camera requests.
- Final independent `check-learning.cjs` run: 13/13 groups passed in 36.3 seconds,
  including the five new caeca tests, preservation contracts and source drift.
- All five rendered cut/forceps sequences: passed, including phone access-layer
  Undo and no residual removed coverings.
- All five table-contact/orientation checks: passed; preserved tissue remains
  stationary when physiology is off.
- Responsive hand-shell check: 60 observations across six viewport families,
  zero reported issues or page errors. This remains a synthetic layout harness.
- Every real-render report above checks the same `lab.html` SHA-256:
  `9f03f49b7fb9cf993dce809a16a6df805b2218efacb7347116ec33dd3bf1d4b7`.

Machine reports and representative screenshots are committed; the full capture
set remains in the local evidence directory. Remote CI must also pass before
merge. One overlapping software-GPU/fast-check
attempt exceeded the unit runner's 90-second budget; it is not a passing result.
