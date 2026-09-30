# Foundation depth: editorial and evidence notes

`src/library/depth-foundations.js` supplies authored depth for the first 37 canonical topics, from `cell-structure` through `enzyme-inhibition`. Each topic has three learning objectives, three mechanism steps, a corrected misconception, a table-based investigation with staged reasoning, a transfer question, and one or two linked references. The content is independent of the renderer and adds no runtime dependency.

All explanations, questions, numerical examples and table scenarios were written for this library. References support mechanisms and provide further reading; no source prose, figures or experimental datasets were reproduced. Tables are explicitly illustrative/fictional, or theoretical bookkeeping, rather than reported experimental or clinical results. Relative units, stated assumptions and model limitations are retained in the learner-facing content.

## Scientific decisions

- **Transport:** A concentration gradient alone does not determine ion flux; voltage and a permeable route also matter. Carrier saturation does not prove active transport. A pre-existing ion gradient can briefly support secondary transport after the ATP-dependent pump stops.
- **Osmosis and plant mechanics:** Solute permeability, observation time and pressure affect volume predictions. The water-potential example uses MPa and explicitly neglects gravitational and matric terms. Cell walls provide mechanical resistance; the membrane supplies the main selective lipid barrier.
- **Energy:** ATP hydrolysis compares complete chemical states; breaking an isolated bond costs energy. Thermodynamic feasibility does not supply a biochemical coupling mechanism. Electron transfer, oxygen consumption and ATP production are separate measurements; no fixed universal ATP-per-glucose yield is asserted.
- **Chromosome accounting:** Ploidy, DNA amount and chromosome count are separated. Anaphase counts refer explicitly to the whole still-undivided cell. Meiosis examples distinguish homolog separation from sister separation and do not imply that every life cycle makes four equivalent gametes.
- **Inference:** Localization at one time point establishes distribution, not temporal order. Pulse-label comparisons track a cohort over time. Cargo accumulation is distinguished from throughput in lysosomal recycling and ribosome loading. Restoration controls strengthen causal arguments without establishing every molecular step.
- **Inheritance:** Single-locus genotype probabilities remain conditional on segregation, dominance, survival and sampling assumptions. The single-locus limitation refers to segregation distortion, classification and survival rather than linkage between loci.
- **Cell diversity:** Typical animal-cell diagrams are not universal templates. Plant acentrosomal spindle organization, cell-specific organelle abundance, and nonphotosynthetic plant cells are described explicitly.
- **Inhibition:** Pure noncompetitive inhibition is treated as the equal-affinity special case of mixed inhibition. Allosteric binding is not equated with this kinetic pattern, and Km is not called a universal binding-affinity measure.
- **Physiology and immunity:** Numerical examples are educational models. They do not diagnose, prescribe, supply normal ranges, or predict individual clinical protection.

## Mechanism reference checks

Publisher pages and NCBI indexed chapter records were checked on 2026-09-30. Some direct NCBI chapter opens returned a browser challenge; indexed official chapter records supplied title and mechanism confirmation. Linked educational chapters include older foundational books, so the content avoids presenting their historical quantitative estimates as current universal values.

| Mechanism checked | References |
| --- | --- |
| Compartments, targeting and nuclear exchange | [NCBI: Compartmentalization](https://www.ncbi.nlm.nih.gov/books/NBK26907/), [NCBI: Nuclear transport](https://www.ncbi.nlm.nih.gov/books/NBK26932/) |
| Nucleolar assembly and export | [NCBI: The Nucleolus](https://www.ncbi.nlm.nih.gov/books/NBK9939/), [NCBI: Ribosome assembly and transport](https://www.ncbi.nlm.nih.gov/books/NBK586897/) |
| ER targeting and Golgi traffic | [NCBI: ER](https://www.ncbi.nlm.nih.gov/books/NBK26841/), [NCBI: ER-to-Golgi transport](https://www.ncbi.nlm.nih.gov/books/NBK26941/) |
| Lysosomal acidity, delivery and recycling | [NCBI: Lysosomes](https://www.ncbi.nlm.nih.gov/books/NBK9953/), [NCBI: Golgi-to-lysosome transport](https://www.ncbi.nlm.nih.gov/books/NBK26844/) |
| Peroxisomal oxidation and peroxide handling | [NCBI: Peroxisomes](https://www.ncbi.nlm.nih.gov/books/NBK9930/), [NCBI: Peroxisomal chemistry](https://www.ncbi.nlm.nih.gov/books/NBK26858/) |
| Acentrosomal organization | [NCBI: Microtubules](https://www.ncbi.nlm.nih.gov/books/NBK9932/), [The Plant Cell: Nuclear-surface nucleation](https://pmc.ncbi.nlm.nih.gov/articles/PMC160504/) |
| Membrane motion and transport | [NCBI: Lipid bilayer](https://www.ncbi.nlm.nih.gov/books/NBK26871/), [OpenStax: Passive transport](https://openstax.org/books/biology-2e/pages/5-2-passive-transport), [OpenStax: Active transport](https://openstax.org/books/biology-2e/pages/5-3-active-transport) |
| Plant turgor and translocation | [NCBI: Plant cell wall](https://www.ncbi.nlm.nih.gov/books/NBK26928/), [OpenStax: Plant transport](https://openstax.org/books/biology-2e/pages/30-5-transport-of-water-and-solutes-in-plants) |
| Photosynthetic compartments and carbon fixation | [OpenStax: Light reactions](https://openstax.org/books/biology-2e/pages/8-2-the-light-dependent-reactions-of-photosynthesis), [OpenStax: Carbon fixation](https://openstax.org/books/biology-2e/pages/8-3-using-light-energy-to-make-organic-molecules) |
| Respiratory coupling and ATP | [OpenStax: Oxidative phosphorylation](https://openstax.org/books/biology-2e/pages/7-4-oxidative-phosphorylation), [NCBI: Catalysis and cellular energy](https://www.ncbi.nlm.nih.gov/books/NBK26838/) |
| Enzyme kinetics and inhibition | [OpenStax: Enzymes](https://openstax.org/books/biology-2e/pages/6-5-enzymes), [NCBI Assay Guidance Manual: Mechanism of action](https://www.ncbi.nlm.nih.gov/books/NBK92001/) |
| DNA and inheritance | [NHGRI: DNA](https://www.genome.gov/genetics-glossary/Deoxyribonucleic-Acid-DNA), [OpenStax: Laws of inheritance](https://openstax.org/books/biology-2e/pages/12-3-laws-of-inheritance) |
| Physiology | [OpenStax: Cardiac physiology](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-4-cardiac-physiology), [OpenStax: Gas exchange](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-4-gas-exchange), [OpenStax: Action potential](https://openstax.org/books/anatomy-and-physiology-2e/pages/12-4-the-action-potential) |
| Immunity, selection and ecology | [OpenStax: Adaptive immunity](https://openstax.org/books/biology-2e/pages/42-2-adaptive-immune-response), [OpenStax: Adaptive evolution](https://openstax.org/books/biology-2e/pages/19-3-adaptive-evolution), [OpenStax: Ecosystem energy](https://openstax.org/books/biology-2e/pages/46-2-energy-flow-through-ecosystems) |

These checks support editorial accuracy; they are not external peer review or curriculum certification. A subject specialist can use the topic-level source links to continue review.
