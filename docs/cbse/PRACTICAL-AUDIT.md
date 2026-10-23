# CBSE practicals: source and capability audit

Audit date: 24 October 2026 · academic year: 2026–27 · **source inventory complete; implementation incomplete**.

The requested target is Classes 9–12 Physics and Biology. Class 9 uses the new **Science STANDARD** syllabus, not the older Class 9 list or the separate Advanced course. The eight Chemistry items in integrated Science are retained as an explicit deferred boundary, so this cannot be described as complete Class 9–10 Science.

[practicals.json](./practicals.json) is the machine-readable source of truth. It includes original concise objectives, every prescribed subpart/specimen, official numbered IDs, PDF pages, actual resource IDs, present capability, remaining gap, accessible alternatives, apparatus familiarity and record requirements. It is an audit/tracker, **not an app feature or a completion certificate**.

## Verified scope

PDF pages are one-based. A compound experiment is one numbered item with several components; alternatives and suggested projects are not silently added to a student's mandatory workload.

| Class and subject | Standard experiments | Standard activities | Spotting / identification | Standard total | Accessible alternative items |
| --- | ---: | ---: | ---: | ---: | ---: |
| 9 Physics | 5 | 0 | 0 | 5 | No separate list |
| 9 Biology | 4 | 0 | 1 | 5 | No separate list |
| 9 Chemistry — deferred | 3 | 0 | 0 | 3 | No separate list |
| 10 Physics | 5 | 0 | 0 | 5 | No separate list |
| 10 Biology | 4 | 0 | 0 | 4 | No separate list |
| 10 Chemistry — deferred | 5 | 0 | 0 | 5 | No separate list |
| 11 Physics | 20 | 14 | 0 | 34 | 10 |
| 11 Biology | 13 | 0 | 6 | 19 | 8 |
| 12 Physics | 15 | 13 | 0 | 28 | 8 |
| 12 Biology | 5 | 0 | 11 | 16 | 7 |

That is **124 standard numbered items**, comprising 72 Physics, 44 Biology and 8 deferred Chemistry items. There are also **33 separately identified accessibility alternatives**, **8 suggested Class 12 Physics project options**, and **4 apparatus-familiarity collections with 103 deduplicated named items**. The JSON retains source OR choices and local plant-family substitutions.

These counts describe inventory units, not 165 compulsory experiments, not unique apparatus, and not finished lessons.

## What already works — and what does not

This is read-only source inspection of Biology commit `476703c73cffe0c4a3510f87e34e47cc1768c979` and Physics commit `cb0ea8a998c79e361e31c74612b5d9a38e9a39b4`. It is not a claim of browser, hardware or assistive-technology validation. Later practical implementation must attach its own evidence.

For the 124 standard rows, the baseline is:

| Capability status | Items | Meaning |
| --- | ---: | --- |
| existing-simulation | 2 | Core virtual task has actionable synthetic data: Class 10 Ohm V–I and Class 11 spring stiffness. |
| existing-protocol | 6 | A relevant authored procedure exists; apparatus is not interactive. |
| partial | 47 | Some support exists but prescribed measurements, specimen, method or components are missing. |
| missing | 69 | No matching practical workflow identified. |

There is **no “CBSE complete” percentage**. Accessible alternatives remain unverified as dedicated accessible workflows, even where ordinary topic controls exist.

### Physics evidence

- `index.html` → `Research` provides actual input-driven synthetic measurements, tables, fits and CSV export. Existing IDs include `pendulum-g`, `hooke-k`, `ohm-R`, `newton-mass`, `wave-v`, `refraction-n`, `resistivity` and `specific-heat`.
- `Expt` contains written procedures. The audit uses stable review IDs such as `physics:protocol:0:3`, with the real `data-xsec` / `data-xit` selectors retained in the resource catalogue.
- **Vernier calipers, screw gauges, spherometers, sonometers and resonance-tube apparatus are missing at this baseline.** Mentioning a micrometer in the Young-modulus procedure does not implement scale reading.
- `PeqBench.has()` returns true for every name. Its canvas mount animates elapsed time and returns `{stop}`; that is a preview, not an operated measuring instrument.
- `SIMS.pendulum` is a **double pendulum**. The separate `Research` simple-pendulum task can generate period–length data, but does not yet cover bob-mass trials, a stopwatch, energy conservation or explicit seconds-pendulum inference.
- Wave-speed support uses frequency/wavelength, not Class 9 timed pulses. Refraction support uses one boundary, not a slab with an emergent ray. Water-heating specific heat is not the hot-solid method of mixtures. These differences remain gaps.

### Biology evidence

- `src/_lab_bench.js` registers a functional virtual microscope with objective, focus, stage, stain and annotations, but only onion, blood, stomata and bacteria slides. There are no cheek, tissue, reproductive or mitosis specimen slides.
- `src/library/experiments.js` implements cell-volume/plasmolysis, fictional cell metabolism, spindle-checkpoint mitosis and breeding probabilities. Those are not potato osmometers, plant respirometers, prepared tissue slides, seed-sorting or pedigree-construction practicals.
- `src/_lab_molecular.js` implements ordered DNA-extraction reagent states. Strawberry/onion are suitable plant-source examples, but the model begins after homogenisation and omits plant mashing/filtration. The DNA yields/purity are explicitly illustrative.
- The greenhouse and pond investigations are fictional evidence-reasoning exercises, not stomatal counts, transpiration comparisons or quadrat sampling.
- Dissection theatre links support frog/earthworm observations; they do not implement the complete taxonomic spotting collection. Generic bony-fish anatomy does not establish Rohu identity. Do not relabel it as verified Rohu.
- No additional complete spotting/protocol collection was found in the audited lab modules. Existing notebooks can retain observations, but a notebook is not practical coverage.

## Implementation workflow

1. **Measurement instruments first.** Deliver `p11-a-e01` vernier (external/internal/depth/volume), `p11-a-e02` screw gauge (wire/sheet), then the lamina and spherometer tasks. Require readable scales, declared least count, signed zero error/correction, repeated observations, units and uncertainty; not a decorative apparatus with a revealed answer.
2. **Honest class-specific practical library.** Expose all source rows, complete original protocol guides and current capability badges. Preserve notes/routes. A guide may be “protocol available” while its apparatus remains missing. No template-only or roadmap entry receives completion credit.
3. **Reuse real functionality carefully.** Add apparatus/measurement flows to Ohm/spring/simple-pendulum tasks; do not discard existing tables/fits. Add microscopy specimen/preparation workflows, plant osmosis and quadrat density/frequency using correct mechanisms.
4. **Complete physics families.** Mechanics and fluids → heat/waves/sonometer → circuit assembly/metre bridge/galvanometer/diode/multimeter → optical-bench/slab/prism/travelling-microscope/liquid-index tasks.
5. **Complete biology families.** Cells/tissues/reproduction mounts → botany/floral/tissue/transpiration/chromatography → biochemical tests → taxonomy/skeleton/mitosis/meiosis/development → pollination/ecology/inheritance. Retain every prescribed spotting specimen and explain permitted alternatives.
6. **Accessible alternatives and practical records.** Offer equivalent keyboard/text/large-target tasks, explicit nonvisual procedures and teacher-facing accommodations. Keep alternative frog development distinct from standard mammalian blastula. Do not imply a website replaces tactile apparatus or teacher-signed practical work.
7. **Evidence before completion.** For every capability transition, record source files, real route/ID, input-driven behavior checks, observation/answer validation, responsive and keyboard checks, source/distribution synchronization, regression tests, reviewed PR/CI and live artifact parity. Do not count an agent's intent, a label or a preview as finished.

The eight Class 9–10 Chemistry items need a separate owner/product decision before claiming full Science coverage; they must not disappear from the tracker.

## Assessment and source cautions

- Physics XI and XII require a school record of at least eight experiments (four per section), six activities (three per section), and a project report. The eight XII projects are suggestions, not eight compulsory projects.
- Biology XI and XII separately assess experiments, slide preparation, spotting, records/viva and project work. A completed app checklist does not certify school completion.
- Accessibility guidelines refer to ten alternatives generically, but the printed lists contain XI Physics 10, XII Physics 8, XI Biology 8 and XII Biology 7. Preserve what is printed; do not invent missing items. Teachers should confirm local assessment arrangements.
- The Class X theory document contains an ambiguous year-end assessment note. Its explicit practical list is retained independently; do not infer guaranteed exam coverage from a concept tag.
- The Biology syllabus suggests several human pedigree examples that are often oversimplified. Prefer a carefully qualified colour-vision/ABO model or a fictional controlled trait. Tongue rolling, ear lobes and widow's peak must not be presented as universally simple Mendelian traits.
- The permitted local family substitution in XI plant morphology is a **practical** allowance, not a rewrite of theory scope.
- Urine tests must use fictional/synthetic samples in the app and never infer a student's health. Real body-fluid, heating, corrosive, scalpel and electrical work requires school supervision. Never provide unsupervised mains wiring; the sonometer mains-frequency task must use a virtual safe source.
- School simulations do not validate anatomy clinically, replace educator review, or verify webcam tracking. No camera should start without explicit user action.

## Official references

- [CBSE 2026–27 curriculum index](https://cbseacademic.nic.in/curriculum_2027.html): confirms distinct Class IX STANDARD/Advanced documents.
- [Class IX Science STANDARD](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/ScienceSt_SecP1_2026-27.pdf), p19: 13 practicals with new Class IX scope.
- [Class X Science](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf), pp7–8: 14 practicals; pp5–6 contain the assessment-note ambiguity.
- [Physics XI–XII](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Physics_SecP2_2026-27.pdf), pp7–10: XI standard/alternative practicals; pp17–19: XII standard practicals/projects; pp20–21: accessible evaluation and XII alternatives.
- [Biology XI–XII](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Biology_SecP2_2026-27.pdf), pp6–8: XI practicals/spotting/alternatives; pp12–14: XII practicals/spotting/alternatives.

All objective wording in the tracker is concise original paraphrase. No commercial reference imagery or external model asset was copied.
