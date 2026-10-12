# Hardy–Weinberg: reasoning from a mismatch

## One bounded learning improvement

The previous investigation used an exact-match sample (49 AA, 42 Aa, 9 aa).
It practised substitution but did not exercise the lesson's objective of
interpreting a deviation without assigning a cause. The revised, explicitly
synthetic sample (58 AA, 24 Aa, 18 aa) has the same allele frequencies but
different genotype counts. Students calculate the expectation, describe the
18-individual heterozygote deficit, and distinguish that description from a
claim about selection, significance or change over time.

Three compact reasoning steps, an accessible evidence table, a hint and an
explicit limitation use the existing learning components. The derived worked
example in Reason stays in sync with Learn. This is a deeper existing concept,
not an additional lesson: the library still contains 109 completed concepts.

The engineering-workflow skill guided this narrow learning change,
independent review and preservation checks. The design-engineering skill guided
the embedded study-action repair without added motion or a redesign.

| Before | After | Why |
| --- | --- | --- |
| The embedded shell's existing site-footer rule also hid the lesson's notes export and references | The study component uses a named action group with the same classes and styles | Students can reach their notes and source reading without changing the shell or global CSS |

The focused packaged check reproduced a real hidden export button, with the
study footer at `display:none`, before this repair. The same real click and
download assertions must pass after it; no forced clicks or display overrides
are used. The action-group fix benefits existing lessons as well as this task.

No lab, storage
format, MCQ, shared asset, launcher or deployment configuration changed. The
existing task-signature logic preserves a student's previous draft but resets
old comparison/review state when the evidence changes. The independent transfer
task and other notes retain their state.

## Scientific scope

- [OpenStax Biology 2e 19.1](https://openstax.org/books/biology-2e/pages/19-1-population-evolution)
  supports allele-copy counting and the two-allele null-model expectations.
- [OpenStax Biology 2e 19.2](https://openstax.org/books/biology-2e/pages/19-2-population-genetics)
  supports considering multiple influences, including nonrandom mating.

References were rechecked on October 12, 2026. The prose and invented counts are
original; no textbook exercise, figure or data is redistributed. This task does
not perform a significance test, identify an evolutionary cause, or establish
that allele frequencies changed through time. Classroom-depth tags are not
official syllabus alignment. Reference review and software checks are not
qualified educator review or evidence of learning effectiveness.

## Reproducible checks

```powershell
python scripts/build-library.py
node --test tests/library-hardy-weinberg.test.cjs
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-library-expansion-browser.cjs
node scripts/check-hardy-weinberg-browser.cjs
node scripts/check-single-file-browser.cjs
```

The focused browser runner supports `BIOLOGY_PREVIEW_URL`, `BIOLOGY_HW_OUTPUT`
and `BIOLOGY_HW_PACKAGED=1`. It checks the old-task draft migration, the actual
evidence/answer flow, cross-pillar persistence, note downloads, unchanged Solve
questions, and dark/light reading at 320, 390, 768 and 1440 CSS pixels. Run it
against source, the built single-file page and the deployed HTTPS page. Existing
portable checks separately exercise isolated HTTP and a copied-alone file with
network dependencies blocked. The existing portable runner now also asserts
visible study references and a real keyboard-triggered notes download, so the
embedded-action regression is covered by the unchanged CI workflow.

Release requires green CI, review and exact live bytes matching the actual
CI-built Pages artifact. Browser checks use synthetic input, not physical mobile
hardware, screen-reader speech, camera tracking or clinical validation.

Local checks on October 12 passed all 13 fast-check groups and seven targeted
regressions. Independent arithmetic and inference review found no issue. The
focused source and packaged checks both passed the migration, keyboard,
cross-pillar, grading and actual-download flows, plus 24 Hardy–Weinberg and 12
photosynthesis width/theme/view cases each, with zero page errors or camera
requests. A replay of the accepted baseline fails the intended new-content and
hidden-footer assertions. CI and live artifact/behavior checks remain separate
release gates; these local results alone do not establish publication.
