# Cockroach tracheal contact — October 2, 2026

## Cause and bounded correction

The dissection picker deliberately intersects each part's own mesh, not its
decorative children. The tracheal system had only its left trunk in that mesh:
the right trunk and all ten transverse branches rendered but could not be
directly probed or gripped. Branch inlet mouths also extended past the outside
of their side trunks before crossing inward.

`src/lab/cockroach.js` now batches those same twelve tubes into one selectable
mesh and seats branch inlet rims inside the lateral trunks. Trunk dimensions,
material, branch count, part ID, layer and noncuttable/detachable behavior are
retained. Temporary tube buffers are released. No shared geometry helper,
picker, camera code, other specimen, layout or deployment setting changes.
`lab.html` is synchronized only through `scripts/build-dissection.py`; the
existing single-file builder packages the result for deployment.

## Anatomy and limits

[Herhold et al. (2023), P. americana tracheal-system treatment](https://zenodo.org/records/7733331)
supports interconnected longitudinal trunks and segmental branching. Its scan
has acknowledged resolution/infill limits. [Fox's Lander dissection guide](https://lanwebs.lander.edu/faculty/rsfox/invertebrates/periplaneta.html)
also describes an interconnected airway network; several of its illustrations
depict other Periplaneta species. Neither source validates the model's arbitrary
dimensions, five branch pairs or medial tissue overlaps. No reference images,
scans or diagrams are shipped.

This remains a partial schematic: additional dorsal/ventral trunks, spiracle
valves, terminal tracheoles and ventilation are absent. Overlapping tube surfaces
are not a continuous lumen. The updated organ note states these omissions and
that whole-network extraction is an exploration aid, not a realistic procedure.
This is not a species-certified reconstruction or clinical validation.

## Preservation and regression checks

- Six new tracheal tests fail against accepted base
  `841c0a7b1269728490756fab4e89e1632a4fbdf9` and pass with the correction.
- Twenty-nine targeted tests pass: tracheae, caeca, midgut and fish/cockroach
  exterior contracts. These cover actual indexed geometry, both trunks/all ten
  branches, real polygonal inlet containment, tool and layer gating, scalpel
  refusal, complete extraction, engine-only Undo and resource disposal.
- The preservation test excludes **only tracheae**. All other 26 cockroach
  parts, including the accepted midgut and caeca, retain independently derived
  base hashes; original historical hashes remain recorded. The original lab
  fingerprint fixture and all unapproved source boundaries are unchanged.
- The midgut clearance test now derives the two trunk envelopes from real
  merged geometry instead of depending on the obsolete child-mesh hierarchy.
- App-level Undo still intentionally excludes organ extraction. The focused
  browser test checks that restriction; access-layer Undo is exercised by the
  full interaction suite. Engine-only Undo is not presented as app behavior.

## Release evidence

All source/render evidence below uses the final product code. The focused airway
diagnostic intentionally exposes only the respiratory subset; it is not evidence
of a normal dissection sequence. The separate five-specimen suite exercises
actual cut/forceps access. Hand-panel checks use synthetic shell state and do not
validate webcam hardware.

| Check | Result / retained evidence |
| --- | --- |
| Narrow dissection builder and portable builder checks | Passed; protected slots retained, deterministic portable package verified. |
| `node scripts/check-learning.cjs` | All 13 groups passed in 89.5 seconds on the final source and test set. |
| Real-render airway diagnostic | Both trunks and all ten branches directly probed; right-branch extraction cleared the cavity; unchanged extraction-Undo boundary. `detail/tracheae.json` |
| Normal access interactions | All five specimens completed cut/forceps access without residual access sheets; frog phone/keyboard access-layer Undo passed. `interactions/interactions.json` |
| Actual tray placement | All five specimens contact the pad, retain dissection orientation and remain still. `bench/browser.json` |
| Responsive hand panels | 60 observations across six viewport families; zero layout issues. `hand-layout/hand-layout.json` |
| Actual portable package | Same airway probe/extraction checks passed inside the nested packaged lab; zero page errors or camera requests. `packaged/tracheae.json` |

Standalone source artifact SHA-256 (Windows preview bytes):
`6f6da294f3fcd2e6bb3827e4b55d187fc48946cb20903134a4b0da8723c37330`.
The source diagnostics, access suite and tray suite all report this same hash.
Portable deployment artifact SHA-256:
`eac7a556d5e474b788681395caec3f061fbb83ae9476c63afdf6bd25c692c57b`.
The latter is generated with normalized newlines and does not depend on checkout
CRLF. The generated package is ignored by Git and rebuilt by existing CI/Pages.

The full offline packaged-app browser suite remains a required, unchanged CI
check on the final head of [PR #26](https://github.com/darshprasad-cmd/biology-entelloq/pull/26).
Its reports include desktop/mobile navigation, saved data, prepared models,
Universe stages and modal/exit ownership; CI retains those reports separately.
Merge and live verification are gated on that check, not inferred from the
focused diagnostic. No actual camera, account or live AI service is exercised.

The first Windows checkout run exposed CRLF-versus-LF drift in unchanged learning
pages. Only checkout line endings were normalized; those pages have no Git
content diff. No checks or tolerances were relaxed.
One later local run exceeded the existing unit-test time limit and was not
counted as passing; the clean rerun above completed. The new diagnostic initially
hit Chromium inspector-cache eviction on the 26 MB package; it now compares HTTP
bytes independently before opening that URL. This changes only the diagnostic,
not the packaged app or its tests. Source browser runs intentionally deny the
optional remote bloom dependency; software-renderer readback warnings are not
device-performance measurements.
