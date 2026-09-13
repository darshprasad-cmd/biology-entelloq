# Fish: cuttable exterior detail pass

The existing generalized fish now has shallow staggered scale relief in the
actual flank geometry, with matching pigment modulation. Relief fades before
the smooth cranial region. The body has 7,081 vertices, below the existing
9,000-vertex tissue-response cutoff; cuts remove the scale-bearing triangles.
There is no second closed shell over the interactive specimen.

The skin and operculum now use opaque tissue materials with restrained
specular response and a darker slate-silver/olive flank gradient. This removes
the inherited light-transmitting skin finish and reduces the pale plastic
appearance without changing the organs or interactive surface geometry.

Each fin now includes a membrane receding between the supporting rays, a muted
root-to-edge colour variation and rays that taper distally. Rays remain batched
as one child mesh per fin. The existing fitted root positions and tray-side fin
placement remain unchanged. The lateral eye and nostril detail is bilateral so
rotating the fish does not reveal a blank opposite side.

All original part metadata, incisions, transforms and internal geometry remain
unchanged. Existing fin attachment, gill-cover separation, resource-disposal,
triangle budget, incision/removal and anatomical relationship tests pass. New
tests inspect the actual scale displacement field, fin scalloping, ray taper
and bilateral eye ownership. Material tests also check opacity, transmission,
specular intensity and dorsal/flank/ventral luminance separation.

## Scientific and visual boundary

This is still the mixed-teleost teaching model described in
[ANATOMY.md](../dissection-realism/ANATOMY.md), not a realistic scanned carp,
Rohu or validated perch. The model's stomach/pyloric caeca and two-chamber swim
bladder combination cannot be resolved by relabelling it. The introductory
source comment now makes that limitation explicit; the UI stays **Bony fish**.

The [DFO external and internal perch reference](https://www.dfo-mpo.gc.ca/science/aah-saa/publications/figures/perch-perchaude-eng.html)
and [Uttarakhand Open University Fish and Fisheries text](https://www.uou.ac.in/sites/default/files/slm/MSCZO-606.pdf)
were checked on 2026-09-13 for orientation and the existing species caveat, not
used to declare this mixed model a particular species. Scale count, low relief,
fin shape and colour are illustrative. No source photograph or downloaded
closed model is overlaid on the cuttable model.

Automated checks do not establish photographic equivalence, phone frame rate,
webcam tracking or educator-reviewed anatomy. Real-render review is still a
separate release requirement.
