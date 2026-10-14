# Recombinant DNA: size is not orientation

## One deeper existing concept

The lesson already distinguishes insert size, orientation and sequence, but its
old investigation tested only size. The revised evidence task compares two
same-sized candidates using two separate diagnostic patterns. It asks learners
to explain why one observation cannot discriminate, identify which candidate
fits the intended arrangement, and limit the inference.

All numbers and candidate observations are original synthetic teaching data.
The first row is explicitly a design prediction, not a measurement. A 3 kb
backbone plus a 1 kb insert forms a 4 kb circle; a junction-only check always
gives 3 and 1 kb. An offset check gives 0.7 and 3.3 kb for the intended insert,
or 1.3 and 2.7 kb when reversed. The two checks are separate, with complete
cutting and no additional cuts assumed. The reference map's coordinate
derivation is recorded in [the source ledger](../library/EXTENDED-CORE-SOURCES.md).

The existing evidence table, hint, three compact reasoning steps, worked
example and notes workflow are reused. Six explanation lenses, conceptual
process diagrams, all three MCQs and the transfer question remain unchanged.
This deepens one of the 109 completed concepts; it adds no lesson count or
claim of complete NEET/AP/IB coverage.

## Source and scientific limits

- [Addgene: Diagnostic Restriction Digest](https://www.addgene.org/protocols/diagnostic-digest/)
  explains how asymmetric insert and backbone sites distinguish orientation,
  whereas a size-only pattern cannot do so.
- [NHGRI: Recombinant DNA Technology](https://www.genome.gov/genetics-glossary/Recombinant-DNA-Technology)
  provides the retained overview of constructed and propagated DNA.

Both were checked October 14, 2026. No textbook example, photograph, diagram,
protocol, enzyme-specific recipe or source dataset is redistributed. Matching
fragment lengths supports an orientation only under the stated map; it does
not establish exact sequence, error-free junctions, expression or function.
Partial cutting, unresolved bands and unexpected sites can complicate real
interpretation. This is a conceptual exercise, not a laboratory protocol,
biosafety approval, qualified educator review or evidence of learning outcomes.

## Preservation and release

The engineering-workflow skill keeps this change confined to one authored
investigation, its automatically derived Reason example and references. The
existing task-signature logic preserves private drafts but resets stale
self-review when the question and evidence change. Transfer notes, MCQ
progress, routes, layout, lab, assets and deployment configuration stay intact.

Existing fingerprint fixtures and the original 73-lesson hash remain unchanged.
The historic Hardy–Weinberg preservation hash is also retained: its comparison
restores only the previous recombinant investigation/example/source slots from
an immutable snapshot of accepted commit `0aea0f3`. A separate full-library
baseline check permits only this release's named task/example and single exact
reference addition. That check protects the already shipped Hardy–Weinberg
content and all other lesson metadata, questions, roadmap and sources.

```powershell
python scripts/build-library.py
node --test tests/library-recombinant.test.cjs tests/library-hardy-weinberg.test.cjs
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-recombinant-browser.cjs
node scripts/check-library-expansion-browser.cjs
node scripts/check-single-file-browser.cjs
```

The focused browser runner uses `BIOLOGY_PREVIEW_URL`,
`BIOLOGY_RECOMBINANT_OUTPUT`, `BIOLOGY_RECOMBINANT_PACKAGED=1` and
`BIOLOGY_DEPLOYED_ARTIFACT` to check source, portable and live pages. Checks
exercise the changed evidence, genuine obsolete-task draft migration, unchanged
Solve checks, cross-pillar notes, actual downloads and responsive dark/light
reading. Existing offline package and CI gates remain in force.

The PR-checking and release-verification skills require green checks before
merge and exact live HTTPS parity with the actual CI-built Pages artifact,
followed by live behavior checks. Browser input is synthetic: screen-reader
speech, physical mobile hardware, real camera tracking and educational efficacy
are not validated by these checks.
