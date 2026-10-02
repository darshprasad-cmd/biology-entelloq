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

Final release checks and exact artifact hashes are recorded below after the
browser suites finish. The focused airway diagnostic intentionally exposes only
the respiratory subset; it is not evidence of a normal dissection sequence.
The separate five-specimen suite exercises actual cut/forceps access. Hand-panel
checks use synthetic shell state and do not validate webcam hardware.

The first Windows checkout run exposed CRLF-versus-LF drift in unchanged learning
pages. Only checkout line endings were normalized; those pages have no Git
content diff. No checks or tolerances were relaxed.
