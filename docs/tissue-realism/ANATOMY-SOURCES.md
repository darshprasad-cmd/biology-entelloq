# Tissue realism: anatomy references and scientific limits

Research checked 30 September 2026. This document records the basis for the tissue-realism work and its intended acceptance criteria. It is not evidence that every item below has been implemented or independently validated.

## Scope

Biology Entelloq presents an interactive educational illustration. Procedural geometry, tissue deformation, cutting resistance, blood effects, and optional circulation are visual teaching models. They have not been calibrated against measured specimen mechanics, perfusion, fluid volumes, or clinical outcomes. They are not a validated surgical or veterinary simulator.

Preserved dissection and fresh-tissue illustration are different states. A newly changed rendering style does not establish exact species, sex, age, preservation chemistry, or specimen dimensions. Anatomy varies with those factors; the current composite models must not be advertised as a complete species-specific anatomical reconstruction.

## Frog dissection and organ relationships

Carolina's preserved-frog guide supports sequential skin and muscle opening and a three-lobed brown liver covering the green gallbladder. Its reference figures are useful for relative landmarks; do not reuse its artwork without permission. [Carolina: Frog Dissection](https://knowledge.carolina.com/discipline/life-science/anatomy-and-physiology/frog-dissection/)

The NWTC laboratory manual supports a stomach on anatomical left, coiled intestine, yellow finger-like fat bodies, a three-chambered heart, dorsal kidneys, and a bladder near the cloaca. Use specimen-relative left/right, consistently through rotation. [Courtney Mayer, Northeast Wisconsin Technical College: Amphibian Dissection](https://bio.libretexts.org/Courses/Northeast_Wisconsin_Technical_College/General_Biology_Laboratory_Manual/Laboratory_14:_Vertebrates/14.02:_Amphibian_(Frog)_Dissection)

Design consequences:

- Exposing skin does not by itself expose every organ. Skin and body-wall opening need visibly distinct states.
- Organ overlap matters. A deeper structure should become visible by exposure or retraction rather than appearing as an isolated icon on top of all neighboring organs.
- A cut trace, lifted margin, tissue flap, and an organ are different scene elements. Cutting feedback should track the tissue actually contacted.
- A highlighted teaching structure may use more contrast than the specimen. Make that distinction explicit in the interface rather than implying that saturated teaching colors are the specimen's natural appearance.

## Amphibian skin cross-section

An outside-to-inside schematic may show epidermis, superficial spongy dermis (stratum spongiosum), deeper compact dermis (stratum compactum), thin hypodermis/subcutis, subcutaneous lymph space, and body musculature. The two named dermal strata are subdivisions of the dermis, not separate organs.

Primary histology of Leptodactylus frogs documents glands, pigment cells, and vessels within loose spongy dermis; the deeper compact stratum contains organized collagen, with loose hypodermis beneath. The study also establishes variation among species, so its measured thicknesses must not be transferred to an unspecified frog model. [Ponssa et al., 2017, The Anatomical Record, DOI 10.1002/ar.23640](https://doi.org/10.1002/ar.23640)

Subcutaneous lymph sacs and their relationship with skin and skeletal muscles are supported by experiments in cane toads and bullfrogs. This does not establish a uniform lymph-space thickness around every body region. [Drewes et al., 2007, Journal of Experimental Biology, DOI 10.1242/jeb.009548](https://pubmed.ncbi.nlm.nih.gov/17981860/)

A university-hosted practical zoology reference places lymph space beneath compact dermis and above musculature. Its frog skin discussion is on printed page 231. [Mohanlal Sukhadia University: Practical Zoology, Vertebrate](https://www.mlsu.ac.in/econtents/1410_Practical%20Zoology%20Vertebrate.pdf)

Implementation boundaries:

- Label a magnified section as schematic and not to scale. UI depth settings are not measured micrometers or a force-controlled instrument.
- Do not add mammalian hair follicles or a continuous yellow adipose band to a frog cross-section.
- Draw mucous/granular glands as embedded dermal structures with surface ducts, not an independent continuous gland layer.
- Keep the subcutaneous lymph space distinct from a vessel and from the abdominal body cavity.
- Do not make the Eberth-Kastschenko layer universal. Its presence and prominence require species-specific support.
- A visible separation plane is an educational abstraction, not a claim that the user can peel microscopic strata individually with ordinary dissection tools.

## Preserved specimens, blood, and circulation

Preservation changes color, flexibility, and moisture appearance. Carolina's specimen comparison documents differences in tissue pliability and color retention; no single brown/gray palette is universal. [Carolina: Preserved Specimen Comparison](https://knowledge.carolina.com/product-resources/carolinas-perfect-solution-specimen-comparison/)

Bright vessel colors can be an injection aid: Carolina describes red arterial and blue venous latex in a double-injected frog kit. A red/blue teaching overlay must not imply that venous blood is naturally blue. [Carolina: Frog Anatomy Kit](https://www.carolina.com/frog-dissection-kits/frog-anatomy-kit-with-dissecting-set/221520.pr?bvstate=pg%3A2%2Fct%3Ar)

The following are simulation decisions, not a quantitative conclusion measured in those references:

- Preserved mode has no active circulation, breathing, or pulsatile bleeding. Subtle moisture and limited residual staining are illustrative; preparation can remove or alter visible blood.
- Fresh-tissue mode may show localized blood when a valid cut reaches an eligible surface. Fluid appears from accepted cuts, not from hovering, missed gestures, or dragging a tool across empty tray space.
- Blood appearance is not proof of a severed named vessel unless that vessel and its collision behavior are explicitly modeled.
- An optional circulation demonstration is separate from specimen freshness. Fresh tissue alone does not imply a living animal, a perfused preparation, or a beating isolated heart.
- Circulation animation is limited to explicitly supported frog/heart demonstrations. Do not project frog chamber patterns, mammalian pressure behavior, or generic heartbeats onto every species.
- Flow speed, blood quantity, clotting, pressure, oxygenation colors, healing, and damage severity are uncalibrated unless a later evidence-backed model specifically adds them.

## Species-specific fluids

Cockroach hemolymph is generally colorless. Egg-producing adult females can show a slight orange tint; hemolymph does not perform the vertebrate hemoglobin-based oxygen transport depicted by red blood. The UMass expert FAQ also distinguishes cockroach bleeding from mammalian blood-pressure behavior. Use a near-clear visual default, and do not describe it as red blood. [Joseph Kunkel, University of Massachusetts: Cockroach FAQ, questions 31 and 17](https://www.bio.umass.edu/biology/kunkel/cockroach_faq.html)

Earthworms have red blood associated with hemoglobin dissolved in plasma and a closed circulation. This does not imply that every released coelomic fluid is blood, or that a whole body-cavity tint represents a real injured vessel. [YCMOU: Animal Diversity, printed pages 140-141](https://ycmou.ac.in/wp-content/uploads/custom-assets/ebooks/V100_ZGY101_Animal%20Diversity_org.pdf)

## Review and verification boundaries

Source checking supports the bounded facts above. Browser checks can verify that layer controls, cut progression, materials, retraction, fluid switches, and mobile layouts behave as designed. Passing those checks cannot certify anatomical completeness or biological accuracy of every mesh.

Before any stronger accuracy claim, obtain species-specific references and a qualified anatomy review of proportions, orientation, attachment points, organ occlusion, vascular continuity, and cut order. Distinguish that review from ordinary software QA.

No third-party reference photos or figures were downloaded into the product as part of this research. The NWTC page declares CC BY 4.0; individual image credits and license scope still need checking before reuse. Links and paraphrased anatomical facts do not grant rights to source artwork.
