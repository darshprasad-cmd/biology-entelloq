# Frog forceps obstruction hotfix

Scope: only the prepared frog's skin-removal access window. Existing control positions, other specimens, organ geometry, pathology, histology and Universe are unchanged in this release.

## Cause and correction

A short flank incision supplied an oblique removal plane, leaving the opposite ventral skin over the cavity. The generic end margin also retained a pelvic strip over the bladder/cloaca. The prepared frog now uses its authored +Y ventral direction and abdominal limits z=-3.40..3.15. These are coordinates of this derivative, not measured biological dimensions or a general anatomy solver. Original head, dorsal backing, pelvic end and all four independently owned limbs are retained.

## Validation

- 26/26 targeted cutting, actual prepared-frog and cockroach asset tests passed.
- Five real shipped-frog GLB incision cases: midline, short pelvic, short cranial and both oblique flanks. Each checks 40 optical rays for obstructing upper skin, exact retained original triangles, all four unchanged limb meshes and finite attributes.
- All 12 repository validation groups passed, including 15 Python contracts and original-page boundaries.
- Browser test loaded the actual prepared frog and routed synthetic hand snapshots through the production input path. Four pins and all four access layers were cut and removed with forceps; no page errors or camera requests. Opened image reviewed for the reported obstruction.
- Local Windows checkout line endings required normalization for newer library/background drift checks; no non-lab page content is included in this hotfix.

Evidence: `browser/interactions.json`, `browser/frog-intact.png`, `browser/frog-opened.png`.

Limits: synthetic hand input does not validate webcam recognition. The opening remains an educational geometric approximation, not physically simulated tissue tearing or photograph-equivalent anatomy. The separate pathology fixes and exploration upgrades are not part of this hotfix.
