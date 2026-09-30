# Cut-face rendering

The cut engine removes crossed triangles from the contacted surface, retains its position buffer for the soft-body engine, and restores the original topology on undo. The lining rides with the original tissue. Cut edges never intercept dissection picks.

Incision depth now limits the visible tissue stack. A superficial score no longer paints the full stack down to muscle or lumen. The learning labels and face geometry use the same reached-layer boundary. Skin, fascia, membrane, muscle, fat, solid organs, gut, vessel, nerve, bone and cuticle have bounded relative depth, gape, edge roll, roughness and wetness. Deterministic fine relief and pigment variation distinguish fibrous, lobulated, folded and porous surface cues. This is a display approximation, not a finite-element tear simulation or measured biomechanics.

The procedural and prepared frog exteriors identify their own skin. Their schematic stack is epidermis, gland-bearing spongy dermis, compact dermis, thin hypodermis and the underlying lymph space. Muscle belongs to the separate body-wall model. The stack does not introduce a mammalian yellow fat pad. Pericardial/serosal membranes no longer inherit the lung's air-space column. Insect exoskeleton uses cuticle layers instead of the muscle fallback.

Frog reference: Ponssa et al. (2017), *Anatomical Record*, [DOI 10.1002/ar.23640](https://doi.org/10.1002/ar.23640), reports skin layers and species variation; [Drewes et al. (2007)](https://pubmed.ncbi.nlm.nih.gov/17981860/) describes anuran subcutaneous lymph sacs. Layer fractions, colours, magnification and display dimensions are authored teaching aids. They are not measurements from the scanned specimen, histology images or species-specific blade penetration estimates.

Cut-face colouring no longer adds a universal red pool. Blood is owned by the separate blood renderer and its preparation mode. The cuticle and nerve therefore keep their tissue hues even at the cut floor.

The opening still removes whole crossed source triangles. A coarse scanned exterior can show angular gaps alongside a narrow incision; smooth arbitrary cut boundaries would require topology subdivision and new soft-body ownership support. The lining follows the existing surface frame and does not establish a microscopically resolved edge.

Validation: `node --test tests/cut-tissue-realism.test.cjs tests/cutting-access.test.cjs tests/prepared-frog-access-clearance.test.cjs tests/prepared-frog-interactions.test.cjs`. These exercise layer reach, amphibian classification, tissue contrast, blood-free nerve pigment, undo, detail settings, pick safety and actual prepared-frog access. Visual review still needs the integrated browser build and does not establish physical or histological accuracy.
