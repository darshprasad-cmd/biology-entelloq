# Extended core biology: source and scope audit

Authored 2026-10-06 for school biology, NEET/AP/IB study and introductory university depth. These are broad learning-level tags, **not official curriculum certification or an exhaustive examination-syllabus map**. The original 73 canonical concepts are unchanged by this module. Eighteen matching roadmap entries become completed lessons; other roadmap entries remain explicitly planned.

## Content delivered

`src/library/extended-core.js` appends 18 unique canonical concepts, 108 independently authored explanation modes, 54 causal mechanism stages, 18 three-objective depth units, 18 evidence investigations, 18 transfer tasks, 18 compact worked examples and 36 additional multiple-choice checkpoints. Each topic has its own quick check, giving 54 practice questions across these concepts. Correct positions in the 36 additional checkpoints are rotated evenly (12 per position). Existing renderer and storage interfaces are retained. No laboratory, deployment, image or shared-asset changes are involved.

The evidence tasks are original synthetic, theoretical or idealized exercises, not observations from the cited sources. Source references check mechanisms and terminology; the lesson text, examples and questions are independently authored rather than copied textbook excerpts. No source figures, photographs, exam questions or external datasets are bundled. The process cards are causal teaching diagrams, not literal molecular imagery or scientific simulations.

## Reference map

All links were checked by web retrieval or indexed source text during authoring. NHGRI and NCBI are institutional sources; OpenStax is used as the publisher's own biology teaching reference. Paper links provide targeted research support, including a protein-disorder review, not a claim that the authored examples reproduce their experiments. Some NCBI/PMC direct opens returned a browser challenge; their indexed institutional abstracts or source text supplied the relevant checks.

| Concept | Reference checked | Main boundary retained |
| --- | --- | --- |
| Water | [OpenStax: Water](https://openstax.org/books/biology-2e/pages/2-2-water) | Polarity is not net charge; heat-capacity calculation excludes loss and phase change. |
| Carbohydrates | [OpenStax: Carbohydrates](https://openstax.org/books/biology-2e/pages/3-2-carbohydrates) | Identical glucose building blocks do not imply identical linkage or enzyme susceptibility. |
| Lipids | [OpenStax: Lipids](https://openstax.org/books/biology-2e/pages/3-3-lipids) | Lipids are not universally polymers; membrane effects depend on temperature and composition. |
| Proteins | [OpenStax: Proteins](https://openstax.org/books/biology-2e/pages/3-4-proteins), [Functional roles of disordered protein regions](https://pubmed.ncbi.nlm.nih.gov/25631540/) | Denaturation is not wholesale peptide hydrolysis; abundance does not establish activity; flexible or disordered regions can have functions. |
| Gene regulation | [OpenStax: Prokaryotic Gene Regulation](https://openstax.org/books/biology-2e/pages/16-2-prokaryotic-gene-regulation), [OpenStax: Regulation of Gene Expression](https://openstax.org/books/biology-2e/pages/16-1-regulation-of-gene-expression) | Lac expression is graded; relief of repression is distinguished from CAP-dependent activation; eukaryotic regulation spans chromatin, RNA and protein stages. |
| Sex-linked inheritance | [OpenStax: Characteristics and Traits](https://openstax.org/books/biology-2e/pages/12-2-characteristics-and-traits) | Explicit simplified non-pseudoautosomal XX/XY model; penetrance and X-inactivation qualify real phenotype inference. |
| Pedigrees | [NHGRI: Pedigree](https://www.genome.gov/genetics-glossary/Pedigree) | Fictional families, consent/privacy, no diagnosis from symbols; conditional probabilities require stated assumptions. |
| Hardy–Weinberg | [OpenStax: Population Evolution](https://openstax.org/books/biology-2e/pages/19-1-population-evolution) | Null model; allele counting does not require equilibrium; deviation does not identify selection by itself. |
| Speciation | [OpenStax: Formation of New Species](https://openstax.org/books/biology-2e/pages/18-2-formation-of-new-species) | Isolation does not instantaneously create species; reproductive species concept has limits. |
| Phylogenetic trees | [OpenStax: Organizing Life on Earth](https://openstax.org/books/biology-2e/pages/20-1-organizing-life-on-earth) | Topology is not tip order; uncalibrated branch lengths are not dates or progress ranks. |
| Biodiversity | [OpenStax: The Biodiversity Crisis](https://openstax.org/books/biology-2e/pages/47-1-the-biodiversity-crisis) | Richness differs from evenness; explicit 1 − Σpᵢ² formula; no current global counts copied. |
| Conservation | [OpenStax: Preserving Biodiversity](https://openstax.org/books/biology-2e/pages/47-4-preserving-biodiversity) | Outcomes differ from effort; connectivity has tradeoffs; participation and inference limits remain explicit. |
| Fungi | [OpenStax: Characteristics of Fungi](https://openstax.org/books/biology-2e/pages/24-1-characteristics-of-fungi) | Yeasts and filamentous fungi differ; extracellular digestion precedes uptake; no foraging guidance. |
| Microbiome | [NHGRI: Microbiome](https://www.genome.gov/genetics-glossary/Microbiome), [Morton et al.: Microbial composition reference frames](https://pubmed.ncbi.nlm.nih.gov/31222023/) | Relative abundance does not establish absolute growth; detection is not activity or causation; no treatment recommendation. |
| Recombinant DNA | [NHGRI: Recombinant DNA Technology](https://www.genome.gov/genetics-glossary/Recombinant-DNA-Technology) | Selection is not sequence verification; conceptual workflow is not a laboratory protocol or biosafety approval. |
| DNA sequencing | [NHGRI: DNA Sequencing](https://www.genome.gov/about-genomics/fact-sheets/DNA-Sequencing-Fact-Sheet), [Richterich: Sequence error validation](https://pmc.ncbi.nlm.nih.gov/articles/PMC310698/) | Phred estimates require calibration; depth cannot eliminate systematic error; variants do not automatically imply effects. |
| Bioinformatics | [NHGRI: Bioinformatics](https://www.genome.gov/genetics-glossary/Bioinformatics), [NCBI: BLAST Glossary](https://www.ncbi.nlm.nih.gov/books/NBK62051/) | Identity is numerical, homology is an inference; coverage and reproducibility matter; no actual search is claimed. |
| Surface area and volume | [OpenStax: Prokaryotic Cells](https://openstax.org/books/biology-2e/pages/4-2-prokaryotic-cells) | Explicit geometric units; millimeter cubes are ideal models, not cell-size claims; exchange also depends on physiology. |

## Numerical review

- Water: 840/(50×4.2) = 4 °C; doubling mass halves this rise under stated assumptions.
- Sex-linked cross: XᴬXᵃ × XᴬY gives four equally probable outcomes; XᵃY is 1/4 overall and 1/2 conditional on a son.
- Pedigree: P(Aa | not aa) = (1/2)/(3/4) = 2/3 under complete recessivity and penetrance.
- Hardy–Weinberg: (2×49 + 42)/200 = 0.70; q = 0.30; 2pq×100 = 42.
- Biodiversity: site A = 1−(0.8²+0.1²+0.1²) = 0.34; site B = 1−(0.34²+0.33²+0.33²) = 0.6666.
- Conservation: restored change 60−30 = 30 percentage points; reference change 10 points; difference in changes 20 points, not definitive causal proof.
- Microbiome: A remains 100 cells while total falls 1,000→500, so its share rises 10%→20% without growth.
- Recombinant DNA: theoretical backbone 3 kb plus insert 1 kb gives 4 kb total; flanking digest size agreement cannot read individual bases.
- Sequencing: Q10/Q20/Q30 map to estimated P = 0.1/0.01/0.001; in 1,000 calls the expected errors are 100/10/1, not guaranteed exact counts.
- Bioinformatics: B has 243/270 = 90% identity and 270/300 = 90% coverage. A has 100% identity over only 10% of the query.
- Cubes: area/volume = 6/a; a = 1, 2, 4 mm gives 6, 3, 1.5 mm⁻¹.

## Verification and remaining review

Module syntax and local schema audits cover all 18 records: complete modes, resolvable topic links, source IDs, three mechanisms of at least 35 words, explanatory misconceptions, rectangular 3–4-row evidence tables, three reasoning steps, and balanced checkpoint answers. The integrated content, depth-content and enrichment test files passed 11/11 tests across all 109 concepts after both expansion modules were present. Full generated-page and browser checks belong to the release workflow and must pass before publication.

This is original educational content with selected reference checks, **not qualified educator review, formal NEET/AP/IB alignment, clinical validation or proof of learning effectiveness**. Mechanism diagrams simplify systems. Students should compare course-specific terminology and required depth with their teacher and current examination specifications. Medical and genetic examples explicitly avoid personalized diagnosis or advice.
