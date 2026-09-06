# Anatomy: what these models represent

The five specimens are **generalized procedural teaching approximations**, not
certified species-faithful anatomical reconstructions. Their dimensions are
illustrative model units, not calibrated millimetres. Surface shape, colour,
tissue response and organ proportions should not be used for clinical work,
specimen identification or assessment without educator review.

This update corrects specific geometry errors. It does not establish that every
organ, duct, vessel, valve or tissue layer is complete or correctly represented.
No reference photographs, copyrighted diagrams or third-party model assets were
copied into the product.

## Corrections in this update

| Specimen | Corrected relationship | Boundary of the correction |
| --- | --- | --- |
| Frog | Oesophagus and duodenum now meet the stomach's actual deformed surface instead of independent estimated endpoints. | The procedural stomach and gut are still simplified, closed meshes; touching surfaces are not a simulated continuous lumen. |
| Frog | Removed a duplicated longitudinal taper that turned the already rounded sphere into a pointed leaf silhouette. | This is bounded geometric shaping, not reconstruction from measured frog morphology. Organ positions and root orientation are preserved. |
| Mammalian heart | Aortic arch now curves anatomically left and posteriorly; its branches remain attached. | The three illustrative arch branches follow a human pattern. This is not a validated sheep heart or a universal mammalian branch pattern. |
| Fish | The posterior swim-bladder chamber now lies posteriorly along the body, with a longitudinal connecting neck, rather than dropping ventrally into the gut. | The existing two-chamber design is retained; it is not a claim that all teleost species have this bladder shape. |
| Cockroach | Crop now follows the foregut's longitudinal axis, between oesophagus and gizzard, instead of standing across the dorsoventral axis. | It remains a simplified storage sac. No reproductive structures or additional organs were invented. |

The whole-specimen tray orientations are kept separate from these local
relationships: frog ventral surface up, cockroach and earthworm dorsal surface
up, fish left flank up, heart anterior surface up.

The rendered review also corrected obvious external discontinuities: cockroach
thoracic/cervical connecting surfaces and thoracic leg-parent offsets, and fish
fin root geometry, joined tail lobes and duplicated body taper. These are original
procedural shapes, not measured anatomical reconstruction. Fine morphology and
species-specific fin patterns remain unvalidated.

## Species and completeness limits

### Frog

The model uses a generalized Rana-type arrangement. The stomach is anatomically
left, kidneys dorsal, and bladder ventral to the rectal region. It does not yet
include a complete pancreas/duct system, ureters or sex-specific reproductive
anatomy. A next anatomical revision should choose a species and sex before adding
those structures and validate the organ-to-duct connections together.

Reference: [NCERT, Structural Organisation in Animals, pp.81–84, figures 7.2–7.4](https://ncert.nic.in/textbook/pdf/kebo107.pdf).
This supports the alimentary sequence, kidney/cloaca connections and organ
relationships, not the model's arbitrary dimensions or tissue mechanics.

### Mammalian heart

The model combines generalized mammalian chamber relationships with illustrative
human great-vessel branching. It must not be described as an exact sheep specimen.
Chamber-wall geometry, coronary courses, chordal attachment details and valve
mechanics still require specialist review. Three-dimensional visibility and
surface connection tests do not establish physiological function.

References: [OpenStax, Circulatory Pathways — aorta and arch branches](https://openstax.org/books/anatomy-and-physiology/pages/20-5-circulatory-pathways),
[OpenStax, Heart Anatomy — chambers, valves and vessels](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy).

### Fish

The current fish is a **mixed teleost teaching model**, not an accurate Labeo or
perch specimen. It combines a stomach/pyloric-caeca arrangement with cyprinid-like
features and a two-chamber swim bladder. Labeo and other Indian major carps lack
a true stomach and pyloric caeca. Correcting that mismatch requires a coherent
species revision, not casually deleting organs or renaming this fish as a perch.
The corrected dorsal bladder relationship does not resolve the species mixture.

References: [Uttarakhand Open University, Fish and Fisheries, MSCZO-606, section 5.6](https://www.uou.ac.in/sites/default/files/slm/MSCZO-606.pdf)
(intestinal bulb and absent pyloric caeca in stomachless cyprinids);
[Fisheries and Oceans Canada, Perch anatomy](https://www.dfo-mpo.gc.ca/science/aah-saa/publications/figures/perch-perchaude-eng.html)
(comparison of lateral organ relationships, not a claim that this model is perch).

### Earthworm

No organ geometry was changed in this update. The current model mixes
Pheretima-style clitellar/reproductive landmarks with a Lumbricus-like crop/gizzard
sequence and generalized paired nephridia. It is not species-validated.
Pheretima's oesophagus–gizzard–stomach–intestine arrangement needs a different
coherent digestive model. Segment numbering, reproductive structures and
excretory types must be revised together after a reference species is selected.

Reference: [NCERT material hosted by IIT Kanpur SATHEE, Structural Organisation in Animals, Earthworm](https://sathee.iitk.ac.in/ncert-books/ncert-books-theory/class-11/nbt-bio-11/bio-11-chapter-7-structural-organisation-in-animals/).

### Cockroach

The model is a generalized cockroach teaching approximation. Its foregut order,
dorsal heart and ventral nerve-cord relationships are useful orientation cues,
but its reproductive representation is not sex-specific: the current single
midline body does not reproduce paired gonads and their ducts. The caecal-ring
geometry and detailed tracheal/gland connections remain review items. These
limitations should not be concealed by more realistic surface rendering.

Reference: [NCERT material hosted by IIT Kanpur SATHEE, Structural Organisation in Animals, Cockroach](https://sathee.iitk.ac.in/ncert-books/ncert-books-theory/class-11/nbt-bio-11/bio-11-chapter-7-structural-organisation-in-animals/).

## Verification and next review

`node --test tests/anatomy-positioning.test.cjs` instantiates all five builders
using the already-vendored Three.js runtime without a browser or network. Checks
cover finite geometry, retained parts, whole-specimen orientations, corrected
directional relationships and selected surface/bounding-volume connections.
They do **not** certify species accuracy, internal lumens, histology, biological
mechanics or every anatomical connection. Browser inspection and a qualified
biology educator's anatomical review are still required before claiming those.
