# Scientific classification and validation

Scope: the inspected model subset in `./scientific-model-registry.json`, dated 2026-10-29. This is a seed registry with explicit coverage, not a claim that every existing experiment has been independently validated. No production scientific solver was changed by this workstream.

## Classification rules

| Classification | Meaning | Required disclosure |
| --- | --- | --- |
| Analytical | A closed-form relationship or exact discrete calculation under stated assumptions | Equation/rule, unit convention, valid domain, reference and excluded effects. |
| Numerical | An approximation obtained by finite steps, sampled solutions or numerical integration | Solver, step/tolerance, convergence/error behavior, boundary handling and deterministic/reproducible settings. |
| Illustrative | A schematic, authored response curve or rule-based visualization without calibrated quantitative predictive validity | What is synthetic, which mechanisms are represented and which numerical values/visual dimensions must not be treated as measured facts. |

Classify components when an experiment mixes approaches. For example, a virtual microscope can use an analytical magnification relationship while rendering illustrative cells. Exact arithmetic on invented biological coefficients does not turn those coefficients into empirically validated predictions. A visually convincing dissection is not a physical specimen or evidence of supervised practical competence.

Every new/updated model record needs: stable ID; source module and hash; classification/components; inputs with units and bounds; outputs with units; assumptions and exclusions; reference sources with their role (equation versus qualitative mechanism versus asset provenance); expected comparison values; tolerance; existing and missing checks; and review status. Keep scientific data outside renderer coordinates. Persist this record with notebook output so exported conclusions retain the model's limits.

## Inspected examples

- Physics `learning-tools-source/physics/core.mjs` implements ideal planar projectile motion analytically. The tool normalizer bounds positive g and upward vy; the direct `trajectory` function assumes valid input. Tests cover start/landing/apex and leftward velocity. The equal-height flight formula must not be reused for a different landing height. [OpenStax projectile motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion)
- Physics `visualization-source/core.mjs` implements RK4 and adaptive streamline stepping. Its own comment correctly distinguishes field direction curves from trajectories: the parameter follows arc length rather than physical time. Existing tests compare an oscillator with cosine and check fourth-order refinement. Zero fields and bounds terminate streamlines.
- Biology `src/library/experiments.js` explicitly calls its numerical constants teaching assumptions. The photosynthesis/respiration curves and uptake cap are illustrative; tests of saturation, sign and finite results establish software behavior, not a calibrated biological fit. [OpenStax mechanism reference](https://openstax.org/books/biology-2e/pages/8-2-the-light-dependent-reactions-of-photosynthesis)
- The Biology Mendelian probability calculation is exact under equal segregation, independent loci and random fertilization; sampled offspring are reproducible synthetic outcomes, not guaranteed family ratios. [OpenStax inheritance](https://openstax.org/books/biology-2e/pages/12-3-laws-of-inheritance)
- Biology's translation table uses the standard genetic code with a short fictional coding strand and fixed start/frame assumptions. NCBI documents multiple genetic codes; do not label this model universal across mitochondria and all taxa. [NCBI genetic codes](https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi)
- Biology `src/cbse/microscopy-model.js` declares illustrative slides, chosen 18 mm field number and 10× eyepiece. Magnification and field diameter relationships are mathematical; focus, stain, cells and readiness are authored teaching models. Actual calibration/resolution and supervised preparation remain outside its claims.

## Checks actually run

From `entelloq-product-excellence`, using bundled Node 24.19.0:

```text
node --test physics/visualization-source/tests/core.test.mjs physics/learning-tools-source/physics/tests/core.test.mjs biology/tests/library-models.test.cjs biology/tests/microscopy-model.test.cjs
```

Original source review: **29 October 2026**. Final frozen-source refresh: **3 November 2026, Asia/Calcutta**, independently rerunning the selected command once: **43 tests passed, 0 failed, 0 skipped**, exit code 0. This covers existing model, storage and contract checks; it is not 43 independent scientific validations. Current hashes and verification time, the 29 October integrated snapshot and original audit hashes are retained in `./scientific-validation-evidence.json`; raw output is `scientific-checks-2026-11-03.txt`. Each registry model now carries its current source hash.

The Biology experiment file changed only by adding a data-theme MutationObserver that calls the existing renderer and disconnects at disposal. An independent exact-byte inverse check, removing only that observer declaration and disconnect call, reconstructed its original audit SHA-256 `36fe601936320c214edbb0746f51f62b6bd64ae8852452ebe2f824e255521069`. Its current SHA-256 is `81fce6c53d9a41e78f2051d75cc66b6b0a24b75080fd9a2b488dfc65e1fbd2ac`. The other three scientific source hashes remain unchanged. The 43 selected checks were rerun against the current file; they do not replace the source owner's separate six-model theme/repaint browser checks or full final UI validation.

Coverage remains limited to the 12 inspected source-model records. The DNA example covers the inspected translation table and fictional-sequence rules; it does not establish validation of every DNA/PCR activity, anatomy asset, curriculum item or legacy experiment.

Important limits: the codon test checks table count and selected codons, not an independent comparison of every entry; the softened-dipole/interference checks exercise test-defined kernels and should not be misreported as exhaustive production adapter parity; the physics circuit tests validate generated CircuitJS configuration, not the remote CircuitJS solver or offline availability.

## Reference test strategy

1. **Independent expectations.** Put a small hand-derived/reference fixture beside tests, with the source, units and tolerance rationale. Do not call the same implementation to calculate its expected result. Snapshot screenshots establish appearance, not mathematical truth.
2. **Analytical examples.** For vx=8 m/s, vy=10 m/s and g=10 m/s², assert flight 2 s, range 16 m and apex 5 m. Check t=0, apex, landing, zero horizontal speed and negative vx. The current normalized domain excludes g=0 and downward launches; test rejection/normalization at the UI boundary.
3. **Numerical convergence.** Hold initial state and final physical time fixed while halving timestep. For a smooth RK4 fixture, error should approach fourth-order reduction before floating-point noise dominates. Record an absolute tolerance near zero and a relative tolerance at nonzero scale. Test conservation only for models where assumptions imply conservation.
4. **Scientific dimensions.** Check that plotted labels, table readings and CSV data agree in units. Prevent distances between axes of incompatible dimensions. NIST's [quantity/unit conventions](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-7-rules-and-style-conventions-expressing-values) support labeling; a unit string alone is not dimensional-analysis validation.
5. **Boundary and invalid inputs.** Check every supported minimum/maximum, zero where allowed, non-finite values, corrupt restored state, malformed strings and division denominators. Never silently clamp a restored unsupported model into a result that looks like the saved experiment; indicate conversion or failure.
6. **Biology references.** Independently compare all 64 standard codons, preserve distinction between coding and template strand orientation, verify phenotype/genotype probabilities sum to one, and test sampled-count conservation separately. Validate anatomy IDs, labels and layer mappings against actual licensed model provenance, with educator review for biological interpretation.
7. **Data provenance.** Tag measured/imported/model-generated data at creation; retain source, licence, units and model version through graphing/export. An animation screenshot or generated slide is synthetic even when scientifically motivated. Do not imply patient or physical-lab data.
8. **Workflow parity.** Change one parameter, read the result, save, reload/resume and export. Compare actual engine state and exported values; the saved record must include any model version needed to interpret the result.

## Remaining scientific gates

The registry does not cover every legacy inline Physics engine, full sandbox solver, anatomical asset, histology/imaging representation or practical. Existing tests must be expanded by the responsible source owner when those engines change. Physical hardware, real specimens, clinical validation, educator sign-off, curriculum completeness and learning outcomes have not been validated by this run. Preserve those boundaries in UI, reports and release notes.
