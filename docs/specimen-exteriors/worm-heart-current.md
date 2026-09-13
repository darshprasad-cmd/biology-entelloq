# Earthworm and heart: bounded tissue realism pass

This pass improves the existing interactive geometry; it does not install a
closed model over the cuttable specimen or claim photographic equivalence.

## Earthworm

- One nonuniform but monotone annular phase now drives both the shallow segment
  furrows and pigmentation across the body, terminal pieces and clitellum.
- Subtle longitudinal fullness changes remove the perfectly repeating cylindrical
  silhouette without moving organs, existing pin landmarks or incision anchors.
- The body wall now has **8,745 vertices**, below the existing 9,000-vertex tissue
  response limit. The former 10,197-vertex body silently skipped that response.
- The pinned, extended centreline remains intentional. Curving only the external
  wall would separate it from the internal digestive, vascular and nerve anatomy.

The existing Pheretima/Lumbricus mixture remains a documented limitation in
[ANATOMY.md](../dissection-realism/ANATOMY.md); surface rendering does not resolve
species-specific clitellar, digestive or reproductive differences.

## Mammalian heart

- Myocardial pigment varies in object space on the existing ventricular, atrial
  and auricular meshes. Duplicate seam vertices receive the same colour and the
  pigment survives the ordinary finishing and cutting pipeline.
- Local epicardial fat is flatter, tapered and lobulated along the previously
  sampled myocardial surface, with warm spatial pigment. It remains one original
  removable part, not another enclosing membrane or decorative replacement model.
- Internal valves, chordae, septum, papillary muscles, root transforms, authored
  incision anchors and named coronary courses are unchanged.
- The closed LV's duplicate UV vertices now share lighting normals after both
  surface displacement and tissue response. This fixes a verified triangular
  highlight seam without welding geometry, UVs, index buffers or open RV edges.
- Fine ventricular vein paths use shorter surface-following steps. The redundant
  unnamed orange ventricular artery overlay is omitted; all named coronary
  anatomy remains. This removes misleading polygonal decorative lines.

[OpenStax, Heart Anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy)
was checked on 2026-09-13 for the relationship of fat-filled sulci, coronary
vessels and myocardial layers. Colour, pad proportions and procedural relief
here are art-directed approximations, not measured histology, a fixative standard
or validated sheep morphology. No reference image was copied into the model.

## Verification boundary

Focused tests cover actual offline Three.js geometry, unchanged historical
anatomy/contracts, visible soft-body response and recovery, deterministic pigment,
seam continuity, pad taper, and surface-material ownership. Existing incision and
forceps-removal tests also pass. They do not validate webcam tracking, mobile frame
rate, photographic similarity, species accuracy or physiological function.

A no-camera local browser diagnostic on 2026-09-14 isolated serosa, RV/LV,
shadows, material transmission and child decorations. The remaining LV wedge
responded to seam-normal averaging; the thin orange polygonal lines responded
to removing the redundant generic arterial overlay. The final rendered check
has no page errors or camera requests. The RV free edge and generalized chamber
silhouettes are still visibly simplified, not a photographic reconstruction.
See `heart-diagnostic-current/final-baseline.png` and its `diagnostic.json` for
the tested artifact hash. The other diagnostic images record earlier isolation
variants, not all the final build.
