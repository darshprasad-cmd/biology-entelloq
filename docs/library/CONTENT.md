# Biology Entelloq learning content

The Learn extension uses **73 completed canonical concepts across all 13 requested fields**. Each completed concept has six independently written perspectives, a staged visual narrative, key terms, related concepts, prerequisites and a retrieval question with explanatory feedback. All 18 first-priority concepts and all 15 requested major organelles are included.

There are **438 explanations, 247 visual steps, 164 key-term definitions and 73 quick checks**. Explanations contain approximately 15,784 words in total. Another **175 concepts are indexed as planned dedicated lessons**, not counted as finished lessons and not populated with generated placeholder explanations. Several planned dedicated subtopics are already introduced within the completed parent lesson.

## Source and rendering contract

`src/library/topics.js` is the editable content source. It exports `window.BIO_LIBRARY` in a browser and `globalThis.BIO_LIBRARY` in a non-browser JavaScript context. It requires no framework, network, DOM or package dependency. The registry is separate from Learn rendering and laboratory simulation code.

The exported object contains:

- `categories`: canonical field ID, title and summary.
- `topics`: complete lessons with stable IDs.
- `roadmap`: searchable curriculum metadata with `status: "planned"`; these are not lesson objects.
- `sources`: shared references with an ID, title and HTTPS URL.
- `editorial`: content scope and review limits.

Every completed topic has `id`, `title`, `category`, `summary`, `aliases`, `explanations`, `keyTerms`, `relatedTopics`, `prerequisites`, `labs`, `curriculumTags`, `difficulty`, `depth`, `visual`, `quickCheck`, `sources` and `status`. Subtopics also have `parentId`. Some topics have `additionalCategories`, allowing one canonical lesson to appear in connected fields: Photosynthesis appears in both Bioenergetics and Plant Biology, for example.

The explanation keys are exactly `layman`, `intuition`, `visual`, `scientific`, `advanced` and `realWorld`. Values are plain text, not trusted HTML. The content helper expands each authored six-entry array into this named-key object. It converts key-term and visual-step tuples into explicit objects. It also rotates the authored answer-option order deterministically so correct choices are distributed across positions; the exported `answer` is the correct zero-based index after that transformation.

`visual.kind` selects a conceptual diagram family. `visual.steps` provides `{title, detail}` stages. A diagram is a labeled schematic with selective mechanisms, not a microscopic image, anatomical measurement or complete quantitative biological model.

All `parentId`, `relatedTopics` and `prerequisites` in completed topics resolve to completed topic IDs. Source IDs resolve through the shared source list. Lab IDs use the actual Lab registry: links offer a related investigation, and do not imply a laboratory directly measures every molecular mechanism described by the lesson.

## Coverage

| Canonical field | Completed concepts |
| --- | ---: |
| Cell Biology | 19 |
| Biomolecules | 3 |
| Bioenergetics | 10 |
| Cell Division | 4 |
| Genetics | 5 |
| Molecular Biology | 3 |
| Human Physiology | 10 |
| Plant Biology | 4 |
| Evolution | 2 |
| Ecology | 5 |
| Microbiology | 3 |
| Developmental Biology | 2 |
| Biotechnology | 3 |

These counts use the primary category only, so each concept is counted once. Cross-field browsing may show additional linked concepts.

The full priority IDs are `cell-structure`, `membrane-transport`, `biomolecules`, `enzymes`, `photosynthesis`, `cellular-respiration`, `mitosis`, `meiosis`, `dna`, `protein-synthesis`, `mendelian-genetics`, `heart-circulation`, `gas-exchange`, `nervous-system`, `immunity`, `plant-transport`, `natural-selection` and `ecology`.

The organelle IDs are `nucleus`, `nucleolus`, `mitochondria`, `ribosomes`, `rough-er`, `smooth-er`, `golgi-apparatus`, `lysosomes`, `peroxisomes`, `vacuoles`, `chloroplasts`, `centrosomes`, `cytoskeleton`, `cell-membrane` and `cell-wall`.

Aliases provide local search matches for “cell powerhouse,” “protein factory,” “plant food” and common alternative scientific names. Mitochondria-associated search metadata connects ATP, electron transport, chemiosmosis and cellular respiration. The endosymbiotic-theory roadmap item links to completed mitochondrial and chloroplast lessons that already introduce its evidence.

## Scientific boundaries incorporated into the content

- ATP hydrolysis is described through the net reaction, not the false claim that breaking a bond by itself releases energy. Enzymes change activation barriers, not overall reaction free energy or equilibrium.
- Michaelis–Menten kinetics is explicitly a simple initial-rate model; Km is not universally a direct binding affinity. Pure noncompetitive, mixed and allosteric inhibition are distinguished.
- Osmosis accounts for pressure and solute permeability. Tonicity is distinguished from total osmotic concentration. Ideal osmotic pressure requires internally consistent units.
- Photosynthetic O₂ comes from water. The Calvin cycle yields net triose phosphate and regenerates RuBP; it is not presented as a night-only pathway or as directly producing a glucose molecule on every turn.
- Respiration tracks carbon separately from electrons. Complex II is not shown pumping protons, oxygen acts at the end of the chain, and aerobic ATP yield is presented as a conditional accounting estimate rather than a universal integer.
- Fermentation regenerates NAD⁺ and is distinguished from anaerobic respiration. Lactate is not blamed for delayed-onset muscle soreness.
- DNA amount, chromosome number, sister chromatids and homologs are distinguished. Meiosis I separates homologs; meiosis II separates sister chromatids. Plant meiosis makes spores, and oogenesis does not produce four equally sized functional eggs.
- Mendelian phenotype ratios state their assumptions. Probabilities do not guarantee a fixed offspring order; dominance does not mean strength, commonness or fitness. Linked genes, epistasis and environmental effects are introduced.
- Arteries and veins are defined by direction. Diagram colors do not imply blue human blood. Ventilation, gas exchange, blood transport and cellular respiration are separate processes.
- Action-potential repolarization is attributed to channel dynamics; the Na⁺/K⁺ pump maintains gradients over time. Myelin, synapses and receptor-dependent responses are presented as simplified circuit mechanisms.
- Immune memory, long-lived plasma cells and memory lymphocytes are distinguished. Vaccination is not described as guaranteeing the prevention of every infection.
- Xylem flow is linked to water potential and cohesion-tension. Phloem runs from source to sink, not universally downward. Stomatal closure includes a CO₂-water tradeoff, and CAM behavior is noted as an exception to simple daytime-opening models.
- Selection acts on inherited variation and reproductive success without foresight. Drift can change neutral alleles and can overcome selection in small populations. Antibiotic resistance is separated from purposeful adaptation and from tolerance or persistence.
- Ecology separates energy flow from material cycling. A fixed 10% trophic-transfer efficiency is only an approximation, standing biomass can differ from flow, and carrying capacity depends on environmental and model assumptions.
- PCR doubling is idealized; actual efficiency and controls matter. Equal gel positions do not establish sequence identity. CRISPR targeting and repair are separate steps, and precise targeting does not guarantee one precise outcome.
- Developmental content distinguishes differentiation, self-renewal, pluripotency and restricted lineage potential. It avoids unnecessary explicit reproductive detail and does not present experimental stem-cell applications as universally established treatments.

## References and editorial status

Explanations, examples and assessment wording were written for this library. Linked references were used for selected mechanism verification and further reading; no textbook images or copied paragraph blocks are included. This is an authored educational release with documented checks, not a claim of full independent scientific peer review. Curriculum tags indicate shared levels of explanation, not formal certification against each board’s current examination specification.

Sources checked on 2026-09-13/14 include:

- [NCBI Bookshelf: Intracellular Compartments and Protein Sorting](https://www.ncbi.nlm.nih.gov/books/NBK21053/) — compartment identities and trafficking distinctions.
- [NCBI Bookshelf: Mitochondria](https://www.ncbi.nlm.nih.gov/books/NBK9896/) — compartment structure and nuclear-encoded protein import.
- [NCBI Bookshelf: ER, Golgi Apparatus and Lysosomes](https://www.ncbi.nlm.nih.gov/books/NBK9897/) — secretory-pathway organization.
- [OpenStax Biology 2e: Enzymes](https://openstax.org/books/biology-2e/pages/6-5-enzymes) — activation barriers, conditions and regulation; the library states additional kinetic distinctions explicitly.
- [OpenStax Biology 2e: Oxidative Phosphorylation](https://openstax.org/books/biology-2e/pages/7-4-oxidative-phosphorylation) — electron transfer, proton gradients and ATP coupling.
- [OpenStax Biology 2e: Light-Dependent Reactions](https://openstax.org/books/biology-2e/pages/8-2-the-light-dependent-reactions-of-photosynthesis) — light-driven electron flow and thylakoid compartments.
- [OpenStax Biology 2e: Carbon Fixation](https://openstax.org/books/biology-2e/pages/8-3-using-light-energy-to-make-organic-molecules) — fixation, reduction, regeneration and carbon accounting.
- [OpenStax Biology 2e: Meiosis](https://openstax.org/books/biology-2e/pages/11-1-the-process-of-meiosis) — homolog and chromatid separation.
- [OpenStax Biology 2e: Ribosomes and Protein Synthesis](https://openstax.org/books/biology-2e/pages/15-5-ribosomes-and-protein-synthesis) — translation stages and decoding machinery.
- [OpenStax Anatomy and Physiology 2e: Action Potential](https://openstax.org/books/anatomy-and-physiology-2e/pages/12-4-the-action-potential) — excitation and channel behavior.
- [OpenStax Biology 2e: Adaptive Immune Response](https://openstax.org/books/biology-2e/pages/42-2-adaptive-immune-response) — adaptive-cell roles and memory.
- [OpenStax Biology 2e: Plant Transport](https://openstax.org/books/biology-2e/pages/30-5-transport-of-water-and-solutes-in-plants) — water potential, xylem, phloem and stomata.
- [OpenStax Biology 2e: Population Evolution](https://openstax.org/books/biology-2e/pages/19-1-population-evolution) — allele frequencies and population processes.
- [NHGRI: PCR Fact Sheet](https://www.genome.gov/about-genomics/fact-sheets/Polymerase-Chain-Reaction-Fact-Sheet) — amplification concept and applications.
- [NHGRI: CRISPR](https://www.genome.gov/genetics-glossary/CRISPR) — microbial origins and sequence-targeting overview.
- [NIH: Stem Cell Basics](https://stemcells.nih.gov/info/basics/stc-basics) — self-renewal, differentiation and distinct stem-cell potential. Regulatory-approval statements on that older page are not repeated as current guidance.

## Adding or reviewing a lesson

1. Choose a stable canonical ID. If a planned concept already exists, reuse its ID; export automatically omits a matching roadmap entry after a completed lesson is added.
2. Author all six modes. The intuition should explain causation; advanced should add mechanism, exceptions, regulation or a bounded quantitative relationship rather than merely more words.
3. Add a concise visual sequence, precise terms and a question testing a misconception or prediction. Avoid answer options that become incorrect when reordered.
4. Link only existing completed concepts and real lab IDs. Add an optional parent for hierarchical navigation and additional categories when appropriate.
5. Verify mechanism-specific claims with suitable references. State units, assumptions and approximations for quantitative relationships.
6. Evaluate the file with Node `vm` or a browser and validate uniqueness, references, explanation keys, answer bounds and source IDs. Then verify the topic’s actual rendered visual, mode switching and related navigation.

The initial content contract check confirmed all 73 completed IDs were unique, all 175 roadmap IDs were unique and distinct from completed IDs, all six modes were nonempty, all completed concept references resolved, and every answer index was in range. Browser behavior and scientific simulations are validated separately by the integration workflow.
