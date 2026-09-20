# Cell and mitochondrion structural cutaways

The cell and organelle stages now share one mitochondrial construction. Outer
and inner membranes have an open front sector. Eight invaginations are formed
within one indexed inner-membrane mesh; cristae are not disconnected toruses.
The matrix remains visible, with a closed unknotted mitochondrial DNA loop,
fourteen simplified ribosomes and twenty-four ATP synthases whose catalytic
heads point into the matrix. A marked cut edge locates the intermembrane space.

The cell includes a double nuclear envelope with actual removed triangles at
four enlarged pore complexes, visible interphase chromatin and a nucleolus.
Four flattened rough-ER cisternae have a common connecting spine, a nuclear
envelope connection and surface ribosomes. A branching smooth-ER network
joins the rough ER. Five separate flattened Golgi cisternae have adjacent
transport vesicles. The model also includes a cut-open lysosome, a ribosome
on mRNA, selected cytoskeletal fibres and a simplified centriole pair.

Every metadata entry has an object anchor within the scene. Existing cell and
organelle hotspot IDs are retained. Added cell labels cover chromatin, the
nuclear envelope, transport vesicles and the centrosome. No UI palette,
navigation, AI, camera or deployment configuration is changed by these files.

## Evidence and limits

Structural references checked on 2026-09-20:

- [NCBI Bookshelf: The Cell, Mitochondria](https://www.ncbi.nlm.nih.gov/books/NBK9896/): double membranes, cristae, matrix and mitochondrial genetic system.
- [OpenStax Biology 2e, 4.3](https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells): nuclear compartments, organelles and animal-cell organization.
- [OpenStax Biology 2e, 4.4](https://openstax.org/books/biology-2e/pages/4-4-the-endomembrane-system-and-proteins): ER continuity, flattened cisternae, Golgi and vesicular transport.

These are schematic animal-cell cutaways, not patient-specific reconstructions,
atomic protein structures, electron micrographs or measured optical simulations.
Display coordinates are dimensionless; the approximate scale labels describe
typical orders of magnitude. Membrane separation, pore size, protein size, counts,
colours and organelle placement are exaggerated for inspection. A single membrane
surface represents a bilayer; molecular leaflet architecture is not resolved.
Real crista junctions and crista geometry vary and are simplified here. The
nucleus opening is an illustration convention, not a damaged cell. Chromatin
paths are illustrative and do not encode a genomic sequence. Movement is a slow
presentation motion, not a kinetic model. No energy sparks or proton trajectories
are asserted as experimental behaviour.

## Verification

`node --test tests/universe-cell.test.cjs` loads the real vendored Three.js module
with a stub canvas. It checks membrane mesh connectivity and fold depth, ATP
synthase orientation, a closed DNA path, real nuclear openings, ER junctions,
flattened sacs, all scene anchors, finite bounded geometry, stationary zero-dt
frames and geometry/material disposal. A geometry regression also ensures that
all rough-ER sac vertices stay outside the outer nuclear envelope after a first
browser inspection identified overlap with the exposed nucleus. The coordinating task performs the HTML
build, real-browser visual inspection and deployment checks separately.
