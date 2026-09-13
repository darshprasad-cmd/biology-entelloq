# Specimen release review — 14 September 2026

## Scope and appearance

All five specimens are active. The established dark-green shell and hand controls
are retained. Earlier frog-only checkpoint notes are superseded.

- Frog: a CC0 black-spotted pond frog surface scan, simplified and split into
  five functional roots. Real colour texture, connected limbs, bounded tissue
  movement at shared seams, ventral preparation and whole-specimen framing.
  This is a Pelophylax exterior around generalized teaching-model internals.
- Cockroach: a licensed textured asset converted from its rig into five static
  functional roots in original part coordinate frames. Controlled chitin
  roughness, separate removable wings, no whole-body decorative overlay. The
  abdominal access window preserves all six legs and peripheral appendages.
- Fish: procedural scale relief, ray-supported/scalloped fins and bilateral
  external details on the existing cuttable flank. It remains a generalized
  mixed teleost, not a species-exact carp or rohu.
- Earthworm: tapered, nonuniform annulation and a lower-density cuttable wall
  that now participates in tissue-pressure simulation. Its pinned centreline
  and internal anchors stay unchanged.
- Heart: spatial myocardial pigmentation, tapered/lobulated localized fat,
  conforming sac and vessel-stump lumens on the existing functional parts.
  A closed ventricular UV-seam lighting artifact is corrected through tissue
  motion; redundant angular decorative arteries are removed, not named coronaries.

This is an improvement release, not an exact photographic match. Fish, earthworm,
heart and internal anatomy remain illustrative procedural models. Existing
scientific simplifications are recorded in docs/dissection-realism/ANATOMY.md;
they are not educator-certified.

## Operational safeguards

The frog is prepared before startup. Cockroach assets load on selection, with
a 20-second deadline, visible cancellation, late-result disposal and an honest
working fallback. An in-flight selection cannot cut the previous specimen or
reuse a held pinch on the new specimen. Source textures are cached; per-attempt
geometry/material clones are restored and released after consumers stop.

The loader accepts only bounded same-origin embedded static GLBs; no external
texture fetches, animations, rigs, compressed extensions or morphs. All assets
keep their licences beside the deployed files.

## Verification record

Focused actual-asset, lifecycle, input, anatomy-preservation and surface tests
live under tests/. Final release evidence is in release-browser/,
release-interactions/ and docs/universe-realism/. The release command is
node scripts/check-learning.cjs; dissection and Universe each have a separate
targeted source-slot builder.

The first parallel software-renderer run triggered a cockroach loading fallback;
it is not acceptance evidence for the new roach. Final checks explicitly require
both imported assets and stop the animation loop during selected-asset decoding.

WebGL interaction evidence uses synthetic right-hand tracker snapshots through
the production router. It does not establish physical camera tracking,
AR registration, real tissue mechanics or phone GPU performance. No camera is
automatically requested by startup, model loading or test runs.

Deployment status and exact verification counts must be reported from final
CI/deployment results, not inferred from this review document.
