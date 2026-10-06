# Physiology and plant systems: additive concept expansion

Authored October 6, 2026. `src/library/extended-systems.js` adds 18 complete concepts without rewriting the original 73 lessons. It may load after `topics.js` alone for the app registry or after the existing enrichment/depth modules for Learn, Reason and Solve. Matching completed IDs are removed from the planned roadmap, and the editorial count is derived from the resulting registry.

## Authored coverage

The module contains 12 human-physiology lessons and six plant-biology lessons: `digestive-system`, `nutrient-absorption`, `endocrine-system`, `insulin-glucagon`, `kidney`, `nephron`, `osmoregulation`, `muscle-contraction`, `reproductive-anatomy`, `gametogenesis`, `fertilization`, `innate-immunity`, `plant-tissues`, `plant-hormones`, `tropisms`, `plant-reproduction`, `pollination` and `seed-germination`.

Each has six independently authored explanation modes, three key terms, four process steps, a quick check and two additional practice checks. Each also has three objectives, three substantive mechanism stages, a misconception correction, a fully worked evidence investigation, a transfer question, a short curiosity and a worked example. The compact worked example deliberately reuses that topic's evidence reasoning rather than introducing conflicting numerical scenarios. Correct options are rotated deterministically and remain balanced across the 36 added enrichment questions.

Totals for this module: 108 explanations, 54 key terms, 72 process steps, 54 retrieval questions, 18 evidence investigations and 18 transfer tasks. The single-module registry check gave 91 topics; the complete release includes a separately authored 18-topic core expansion and therefore has 109. Curriculum tags identify suitable explanation depth, not official NEET, CBSE/ICSE, AP, IB or university certification.

## Mechanism references checked

These are editorial verification and further-reading links. The prose, questions, tables and process sequences were authored for Entelloq; no source images, textbook assessments or copied prose blocks were included. Source IDs use the `es-` prefix so the existing registry is unchanged.

| Topics | Authoritative teaching reference | Mechanisms checked |
| --- | --- | --- |
| Digestive system | [OpenStax: digestive processes and regulation](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-2-digestive-system-processes-and-regulation) | Propulsion versus mixing; compartment-specific secretions; distinction between digestion and absorption. |
| Digestion and absorption | [OpenStax: chemical digestion and absorption](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-7-chemical-digestion-and-absorption-a-closer-look) | Bile is not a lipase; polarized epithelial transport; portal versus chylomicron/lymph routes. |
| Endocrine system | [OpenStax: hormones](https://openstax.org/books/anatomy-and-physiology-2e/pages/17-2-hormones) | Target receptors; membrane versus intracellular signaling; negative feedback. |
| Insulin and glucagon | [OpenStax: endocrine pancreas](https://openstax.org/books/anatomy-and-physiology-2e/pages/17-9-the-endocrine-pancreas), [NCBI Bookshelf: introduction to diabetes](https://www.ncbi.nlm.nih.gov/books/NBK1671/) | Alpha/beta cell sources; regulated liver output; GLUT4 in responsive tissues; ATP-linked electrical and calcium signaling. Only the stable mechanistic sections are used, not older treatment or prevalence claims. |
| Kidney | [OpenStax: gross anatomy of the kidney](https://openstax.org/books/anatomy-and-physiology-2e/pages/25-3-gross-anatomy-of-the-kidney) | Cortex, medulla and drainage; separation of renal blood and urine routes. |
| Kidney and nephron | [OpenStax: microscopic anatomy of the kidney](https://openstax.org/books/anatomy-and-physiology-2e/pages/25-4-microscopic-anatomy-of-the-kidney) | Filtration, segment-specific transport, reabsorption and secretion. |
| Nephron and osmoregulation | [OpenStax: water balance](https://openstax.org/books/anatomy-and-physiology-2e/pages/26-2-water-balance) | Hypothalamic ADH synthesis, posterior-pituitary release and aquaporin-dependent permeability. No fluid-intake targets or clinical reference ranges are supplied. |
| Muscle contraction | [OpenStax: muscle fiber contraction and relaxation](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-3-muscle-fiber-contraction-and-relaxation) | Skeletal-muscle calcium/troponin regulation; ATP-dependent detachment and recovery; sliding rather than shortening of filaments. |
| Reproductive anatomy and gametogenesis | [OpenStax: human reproductive anatomy and gametogenesis](https://openstax.org/books/biology-2e/pages/43-3-human-reproductive-anatomy-and-gametogenesis), [NCBI Bookshelf: meiosis and fertilization](https://www.ncbi.nlm.nih.gov/books/NBK9901/) | Production, maturation and transport are separate; asymmetric oocyte divisions; chromosome-set versus chromatid accounting. |
| Fertilization | [NCBI Bookshelf: fertilization](https://www.ncbi.nlm.nih.gov/books/NBK26843/), [NCBI Bookshelf: meiosis and fertilization](https://www.ncbi.nlm.nih.gov/books/NBK9901/) | Mammalian activation, calcium signaling, cortical response and distinction between fusion and later development. |
| Innate immunity | [OpenStax: innate immune response](https://openstax.org/books/biology-2e/pages/42-1-innate-immune-response), [Kleinnijenhuis et al. 2012: NOD2-dependent trained innate responses](https://pubmed.ncbi.nlm.nih.gov/22988082/) | Barriers, pattern recognition, phagocytes, inflammatory signaling and links to adaptive responses. The research paper supplies evidence for the cautious trained-innate extension; this is not equated with classical antigen-specific B/T-cell memory or generalized to every innate cell and exposure. |
| Plant tissues | [OpenStax: the plant body](https://openstax.org/books/biology-2e/pages/30-1-the-plant-body), [OpenStax: stems](https://openstax.org/books/biology-2e/pages/30-2-stems) | Meristems and tissue systems; collenchyma and lignified walls; complex vascular tissues rather than uniformly dead xylem. |
| Plant hormones and tropisms | [OpenStax: plant sensory systems and responses](https://openstax.org/books/biology-2e/pages/30-6-plant-sensory-systems-and-responses) | Directional sensing, asymmetric extension, major hormone groups and context-dependent responses. |
| Plant reproduction | [OpenStax: reproductive development and structure](https://openstax.org/books/biology-2e/pages/32-1-reproductive-development-and-structure), [OpenStax: asexual reproduction](https://openstax.org/books/biology-2e/pages/32-3-asexual-reproduction) | Sporophyte/spore/gametophyte sequence; vegetative reproduction differs from gamete fusion. |
| Pollination and germination | [OpenStax: pollination and fertilization](https://openstax.org/books/biology-2e/pages/32-2-pollination-and-fertilization) | Pollen arrival differs from fertilization; typical angiosperm double fertilization; seed reserves, dormancy and germination requirements. |

## Important boundaries and editorial choices

- All new visuals are process schematics, not anatomical reconstructions, micrographs, moving physiological simulations or to-scale measurements.
- Human examples describe common anatomical and physiological patterns while acknowledging variation. They do not assign identity, fertility or health from anatomy and provide no clinical or reproductive advice.
- The fertilization lesson does not import the sea-urchin electrical fast block into mammalian physiology. An OpenStax anatomy passage encountered during checking generalized that mechanism; the mammalian account instead uses the NCBI references above and emphasizes species-dependent polyspermy prevention. No clinical success claims are made.
- GLUT4-mediated uptake is not presented as the universal route for glucose entry. Human beta-cell transporter identity is not reduced to a universal rodent GLUT2 account.
- Muscle content explicitly covers skeletal muscle; the regulatory scheme is not generalized unchanged to smooth or cardiac muscle. Tension and overall shortening are distinct.
- Osmoregulation separates amount, volume, concentration and effective membrane permeability. ADH changes permeability rather than pumping or creating water.
- Plant hormone groups are not an exhaustive list. Dose responses and root/shoot effects are contextual; no universal growth response or agricultural dosing instruction is offered.
- The gravity-response transfer task uses rotated and unrotated seedlings under uniform, non-directional illumination. A fixed directional lamp is insufficient: rotation changes its direction relative to the organ. This correction distinguishes a controlled cue from merely fixed equipment, consistent with the need to separate directional light and gravity described in [NASA's Gravitational Plant Physiology Facility account](https://ntrs.nasa.gov/api/citations/19930003925/downloads/19930003925.pdf). The comparison reduces a confound without proving the sensing mechanism.
- Plant meiosis produces spores. Gametophytes make gametes by mitosis. The diploid embryo/triploid endosperm example explicitly assumes the usual diploid angiosperm pattern, not every plant reproductive system.
- Seed germination uses a stated radicle-emergence endpoint. Non-emergence is not equated with death, and germination is not equated with successful establishment.
- Selected mechanism checking and automated content contracts are not qualified educator review, board approval or scientific validation of every sentence. That review remains a release-quality limitation.

## Quantitative and evidence audit

All datasets are labeled synthetic, fictional, idealized or theoretical in their displayed context. None are clinical readings, measured plant experiments or real treatment results. Every task has a hint, three reasoning steps, a worked answer and a limitation.

| Investigation | Checked result |
| --- | --- |
| Digestive surface access | 10 / 4 = 2.5 times measured product; no-enzyme result is a control, not proof of the only cause. |
| Nutrient uptake | 5 to 6 units/min is a 20% increase despite doubling concentration. |
| Endocrine receptors | Same supplied concentration, different response; receptor sensitivity is not secretion rate. |
| Glucose balance | Entry minus exit gives +4, 0 and −3 arbitrary units. |
| Kidney water accounting | 100−99 = 1, 100−97 = 3 and 80−79 = 1 mL. These are invented volumes. |
| Nephron solute accounting | Filtered−reabsorbed+secreted gives 4, 1 and 7 units/min. |
| Osmotic ratio | 30/3 = 10 and 30/2 = 15 units/L; rise = 50%. |
| Muscle mechanics | Fixed-length model: zero length change with positive force, consistent with isometric conditions. |
| Reproductive transport | Equal production counts do not establish equal downstream delivery or hormonal output. |
| Gametogenesis | Five primary spermatocytes × four ideal meiotic products = 20 spermatids, not 20 offspring. |
| Fertilization stages | Fusion-to-activation decreases are 8 versus 40 detections; no later reproductive endpoint is inferred. |
| Innate responses | Sterile damage raises the modeled response without a microbial signal; inflammation is not a unique cause marker. |
| Plant tissues | Type B has both a thickened primary wall and living contents; one counterexample defeats the universal claim. |
| Plant signaling | High-dose root extension decreases 2 mm relative to control while shoot extension increases 4 mm. |
| Tropism mechanics | Shaded-side extension exceeds lit-side extension by 2 mm; no numeric curvature angle is inferred. |
| Plant life cycle | Stated 2n=12 gives n=6; mitotic gametophyte growth retains n, fertilization restores 2n. |
| Pollination | 70−20 = 50 extra seeds with compatible hand pollen; confounds and absent replication remain explicit. |
| Germination | 30/40=75%, 8/40=20%, 12/40=30%; no inference that ungerminated seeds are dead. |

## Content verification

The combined expansion passed the 15 cases in `library-content.test.cjs`, `library-depth-content.test.cjs`, `library-enrichment.test.cjs` and `library-expansion.test.cjs` on October 6. Checks cover original-lesson preservation, topic links, six-mode completeness, substantive mechanism lengths, evidence provenance and shape, separate app-registry loading, balanced answer positions, unique practice questions and authored enrichment contracts. Browser integration, narrow builder synchronization and release checks are performed by the integrating task, not claimed by this source-authoring module.
