# Frog specimen: anatomy, provenance and limits

Reviewed 2026-09-05. This document describes the original procedural frog in `src/lab/frog.js`, not a downloaded anatomical asset or an independently validated biological reconstruction.

## What this first slice covers

The current improvement is the initial specimen-and-tray experience: a stable ventral-up pose, a connected-looking body and limbs, readable external landmarks, four distal pin targets, bounded limb adjustment, and reversible pin placement. The existing app navigation, selectable anatomy identifiers and later procedure remain compatible. Passing the geometry tests verifies these implementation properties; it does not establish biological or educational efficacy.

The model represents a **generalized adult Rana-type frog**, not a verified species-specific specimen. “Rana-type” is a visual teaching approximation, not a taxonomic determination. Sex is unspecified. Do not use its eye/tympanum ratio, throat color or omitted reproductive structures to determine sex. The retained internal organs, positions, labels and procedure text have **not been independently audited** for this change. Their presence is not an assertion of a complete anatomical atlas.

The pale abdominal field, muted olive flanks and subdued surface sheen intentionally suggest a prepared/preserved teaching specimen. These are authored appearance choices, not a simulation of fixation chemistry, tissue viability, living blood perfusion or measured tissue color. The presentation is clean and clinical in tone, but the model is not clinically validated. It is not a substitute for instructor-led laboratory safety, a veterinary procedure simulator, or a claim of GTA-style production/game-engine fidelity.

## Anatomy references and how they were used

The references below were checked as educational comparison material. No images, diagram traces, mesh data or textures from them are embedded in the product.

- CUNY's *General Biology OER Laboratory Manual*, “Week 9: Animals II — Chordates,” includes a leopard-frog external-anatomy activity and photographs credited to D. Brogun. It supports checking the relative fore-/hindlimb proportions, eyes, nares and tympana, and the belly-up dissection-pan orientation. This was used as a qualitative pose/landmark reference, not to claim that our generalized specimen matches the pictured species or every later dissection instruction. The chapter's indexed content was readable; direct fetching intermittently returned HTTP 403. [CUNY chapter](https://pressbooks.cuny.edu/dimbro7/chapter/week-9-animals-ii-chordates/)
- University of Michigan BioKIDS, “Green Frog — *Lithobates clamitans*,” describes webbed toes, lateral tympana, and sex-linked differences in tympanum size and throat coloration. It provides an additional university/museum educational check and highlights why this model must not be presented as species- or sex-validated. It is a reference to a different named species, not proof of the model's exact proportions. [University of Michigan BioKIDS species account](https://biokids.umich.edu/critters/Lithobates_clamitans/)

The source has four modeled fingers per forelimb and five modeled toes per hindlimb, with limited hindfoot webbing. This digit count is covered by a geometric regression test. Web extent, digit length ratios, skin markings, joint proportions and landmark placement remain authored approximations rather than measurements from a particular specimen.

## Asset provenance and construction

The replacement exterior was authored directly for Biology Entelloq in JavaScript using the repository's existing vendored Three.js and shared geometry/material helpers in `src/lab/anatomy.js`. It consists of original numeric profiles, curves, deterministic vertex relief and vertex colors. Existing procedural internal organs were retained for procedure/selection compatibility. Existing dependency licenses remain applicable to Three.js and other vendored code; this document does not relicense them.

No external frog model, image texture, photogrammetry scan, anatomical scan, stock asset, generated raster artwork, purchased asset or new dependency was downloaded for this specimen. No Blender project or GLB/glTF file was created: the editable source asset is the procedural builder. A `.blend`/GLB deliverable would falsely imply a separate asset pipeline that does not exist here. The model ships within the assembled lab HTML; it makes no external model/texture request. This statement concerns the specimen asset, not unrelated optional app services or font/post-processing requests.

The existing `tisMaps` helper supplies small procedural normal/roughness maps in a browser. The original exterior coloration is a vertex attribute; it is not a downloaded albedo map. The Node tests intentionally run without a DOM, so those canvas-generated maps are absent from their material inventory. Geometry and vertex colors are checked for deterministic reproduction.

Construction details:

- Body/head: one longitudinal profile loft, 88 axial segments by 64 circumferential segments, with a broad jaw/trunk transition, shallow throat/midline relief and constrained dorsal depth.
- Limbs: each selectable limb is one merged indexed geometry containing a continuous varying-radius loft, overlapping palm/sole surface, curved digit surfaces and terminal caps; hindfeet also include partial web surfaces. The overlapping pieces are visually connected, **not one welded, watertight anatomical manifold**.
- External landmarks: small lateral eye domes/pupils, tympana, nares, a mandibular margin and a posterior cloacal-region marker, all attached beneath the skin part's hierarchy.
- The specimen root is named `frog-specimen`. All 27 selectable source meshes are named exactly by their part IDs. Named skin children include `left-eye`, `right-eye`, `left-pupil`, `right-pupil`, `left-tympanum`, `right-tympanum`, `left-naris`, `right-naris`, `mandibular-margin`, and `external-cloacal-region`.
- There are no bones, `Skeleton`, `SkinnedMesh`, inverse-kinematic joints or imported animation rig. Pin response is authored vertex displacement. It does not model tendon paths, joint articulation, tissue tearing, volume conservation or physical collision between anatomy pieces.

## Preserved selection and procedure contract

`buildFrog(THREE)` returns `{ group, parts, pinning }`. The 27 original source part IDs remain unchanged and in this order:

```text
skin
forelimb-left
forelimb-right
hindlimb-left
hindlimb-right
muscle-wall
ventral-abdominal-vein
liver-right
liver-left
liver-median
gall-bladder
frog-heart
lung-left
lung-right
stomach
oesophagus
small-intestine
large-intestine
cloaca
urinary-bladder
spleen
fat-body-left
fat-body-right
kidney-left
kidney-right
dorsal-aorta
vertebral-column
```

The runtime strata system can additionally insert `subcutaneous-fascia` and `parietal-peritoneum`, explaining a 29-part application inventory. Those are not two newly renamed/replaced frog-builder IDs. Geometry tests below measure the raw builder before strata, dissection overlays, tray, lights or application effects.

## Coordinates, contact and measured bounds

All values below are **unitless scene coordinates**, not centimeters or millimeters. The root has position `[0, 0, 0]`, quaternion `[0, 0, 0, 1]` and scale `[1, 1, 1]`. Positive Y is ventral/up; negative Y is dorsal/down; positive Z is anterior/snout; negative Z is posterior. Negative X denotes the animal's left, independent of the viewer's camera angle. No extra “lay supine” root rotation should be applied.

The pinning liner plane is `Y = -1.22`, with usable rectangle `X [-5.8, 5.8]`, `Z [-6.9, 6.9]`. A small render clearance prevents surface z-fighting; this is not a contact-mechanics solver.

| Target / part ID | Anchor-region center [X, Y, Z] | Radius | Rest palm projection [X, Y, Z] |
| --- | --- | ---: | --- |
| forelimb-left | [-3.53, -1.22, 2.82] | 0.46 | [-3.41, -1.22, 2.70] |
| forelimb-right | [3.53, -1.22, 2.82] | 0.46 | [3.41, -1.22, 2.70] |
| hindlimb-left | [-3.70, -1.22, -4.72] | 0.55 | [-3.58, -1.22, -4.60] |
| hindlimb-right | [3.70, -1.22, -4.72] | 0.55 | [3.58, -1.22, -4.60] |

Exact rest-pose axis-aligned bounds measured from actual transformed vertices with the vendored Three.js builder:

```json
{
  "exterior": {
    "min": [-4.3520002365112305, -1.2050000429153442, -6.136000156402588],
    "max": [4.3520002365112305, 0.8043234348297119, 4.550000190734863]
  },
  "allBuilderPartsIncludingHiddenAnatomy": {
    "min": [-4.3520002365112305, -1.2400115728378296, -6.136000156402588],
    "max": [4.3520002365112305, 0.9825037121772766, 4.550000190734863]
  }
}
```

The external dorsal surface is approximately 0.015 above the liner. Limb lofts are clamped at least 0.018 above it when authored, and at least 0.016 above it during pin adjustment. The retained hidden deep anatomy extends approximately 0.020 below the liner; first-step contact verification **does not** certify those later exposed layers. Deep-layer intersections and overall internal anatomy require a separate audit.

Raw builder inventory: **27 selectable parts; 72 meshes; 72 geometries; 66 material objects; 94,154 triangles overall, of which 42,816 belong to initially visible exterior parts and their children.** Browser-generated maps, runtime strata and scene furniture are excluded. The measured counts are not a frame-rate guarantee. See `BASELINE.md` and browser QA evidence for environment-specific performance limitations.

## Authored pin deformation and its limits

The four limb meshes carry `userData.frogAuthored` and `userData.authoredPinLimb`; the skin is also marked `frogAuthored`. The main loop must exclude this exterior from the generic surface/softbody writers, which would otherwise compete with the cached authored rest geometry.

`pinning.setAnchor(id, point)` accepts specimen-local arrays or a Three.js vector; `null` requests restoration. `pinning.update(dtMs)` advances the visible interpolation; `dispose()` restores exact rest vertices. The procedure's independent pin-state validator, not this mesh adapter, decides whether a proposed point is in the correct distal region and on the tray. The adapter additionally rejects nonfinite coordinates and caps displacement for defensive rendering stability.

For each vertex, the nearest of 61 centerline samples defines a smooth blend weight. The proximal 16% remains fixed; the following 72% blends toward distal motion. Fingers, toes and webbing belong to the same merged geometry and move with it. Requested displacement is limited to length 0.85; the vertical component is first limited to ±0.035. The interpolation uses a 100 ms response constant with each update capped at 64 ms, and snaps a residual below 0.0001 to the target. Reduced-motion preference removes that interpolation. No root transform changes are needed.

“Tension,” grip and similar UI controls are normalized teaching indicators, **not force in newtons, tissue stress, measured strain or injury thresholds**. The weights and clamps were chosen to maintain a stable first-step interaction, not fitted to biomechanical data. Valid target-edge placements are tested, but arbitrary anatomy intersections, inverse kinematics, realistic joint limits, tissue damage and subsequent incision behavior are outside these tests.

## Reproducible verification

From the repository root, using Node and the already-vendored Three.js:

```sh
node --test tests/frog-geometry.test.mjs
node --test tests/pin-state.test.mjs tests/frog-geometry.test.mjs
```

The geometry suite reads the actual production builders, matching the assembler's shared module scope, without generated HTML, a DOM, GPU, network connection or package installation. It checks:

1. All 27 IDs/names, identity root, intended initial visibility, absence of a skeleton, finite positions/normals, inventory and triangle budgets.
2. Rest-pose body/limb clearance and complete tray bounds, with no independently drifting limb child meshes.
3. Four actual indexed fingertip cap surfaces per forelimb and five toe-tip surfaces per hindlimb, in addition to metadata. The topology-specific check must be deliberately updated if the mesh is later welded or retopologized.
4. Eight boundary directions for each of the four real targets: accepted pin-state placement, moving digit caps, fixed proximal rings, finite bounded vertices, no liner penetration, and exact vertex-array restoration through undo. The torso remains unchanged.
5. Invalid/nonfinite inputs, oversized adapter displacement, safe disposal/restoration and deterministic exterior construction.

Result on the documented model: **6 geometry tests passed, 0 failed**. These are geometry/interaction invariants, not visual or scientific certification. Browser interaction, keyboard, mobile framing, accessibility and full later-step audits remain separate evidence.
