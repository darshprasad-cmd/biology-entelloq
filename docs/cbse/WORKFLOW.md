# CBSE-first delivery workflow

## Scope and truthfulness

Build Physics and Biology for Classes 9–12 first. Classes 9–10 sections cover the relevant strands of integrated Science, **not the complete Science course**. Class 9 uses standard Science, not the separately published Advanced Level course. Keep each class and subject in its own section, and keep general exploration available.

Baseline: official CBSE academic year **2026–27**, checked 24 October 2026. These are editorial study pathways, not CBSE endorsement or an assurance of complete examination coverage.

- [Curriculum index](https://cbseacademic.nic.in/curriculum_2027.html)
- [Class 9 standard Science](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/ScienceSt_SecP1_2026-27.pdf)
- [Class 10 Science](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf)
- [Physics 11–12](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Physics_SecP2_2026-27.pdf)
- [Biology 11–12](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Biology_SecP2_2026-27.pdf)

Class 10's detailed topic lists and its broad teacher note on PDF page 6 contain an assessment-scope ambiguity concerning heredity and electricity. Preserve the distinction between explicitly formative topics and study support; do not silently resolve conflicting wording into an exam guarantee. Ask students to confirm their school's assessed portion. The detailed lists explicitly mark evolution and motor/induction/generator material as formative. Do not reuse an older syllabus just because it looks familiar.

## First visit and personalization contract

1. The questionnaire is the first usable screen at a new visit, before the old landing presentation. No account, camera or personal identifier is required.
2. Ask class, learning goal, available session time and a class-relevant topic focus. Allow a deliberate skip and later edit.
3. Save only this small, versioned preference record on the current origin. Physics and Biology are separate sites; do not imply cross-site or cloud synchronization.
4. Returning students with a saved profile open their class area by default. An explicit incoming lesson or lab deep link takes precedence after setup; navigation must not be silently redirected.
5. Recommend real, available lessons. Session minutes are a planning suggestion, not a promise of mastery or a timed lock.
6. Self-reported goals, reading a page, finishing setup and opening a link are **not mastery evidence**. Preserve all existing answer records, notes, notebooks, mistakes and progress.
7. Invalid, obsolete or blocked storage must not break entry. Explain session-only persistence when necessary. Reset clears only the questionnaire key, never unrelated student data.
8. Keyboard focus stays within an open setup dialog and returns sensibly when it closes. Small phones, reduced motion, light/dark themes and offline copies remain usable.

## Editorial completion gate

A curriculum label, supporting lesson link or roadmap heading is not a completed objective. Use these separate stages:

| Stage | Required evidence |
| --- | --- |
| Unmapped | Official source/page known; objective-level mapping not yet audited |
| Mapped support | Existing canonical lesson identified; relevance and missing depth documented |
| Authored | Original explanation, prerequisites and appropriate diagram/worked reasoning |
| Practised | Retrieval plus application/evidence questions, explicit answers, reasoning and misconception feedback |
| Verified | Content/reference checks, units/model limits, functioning routes, accessible UI and automated regressions |
| Released | Green required CI, reviewed PR, successful deploy, live artifact parity and changed-behavior smoke |
| Educator reviewed | A named qualified reviewer and scope/date of review recorded separately |

To declare a class-subject track complete, enumerate **every** applicable theory objective, evidence skill and practical requirement in the current official syllabus, map exclusions/formative-only material explicitly, and pass each applicable gate. No percentage or total-completion claim until the denominator and evidence are audited. Simulations support learning; they do not substitute for supervised required practicals or certify practical competence.

For every objective, record:
- stable ID, class/subject/year, source URL and PDF page;
- assessment scope (including unclear/formative/supplementary);
- canonical lesson and prerequisites;
- explanation, worked reasoning/diagram, misconceptions;
- at least one retrieval and one transfer/evidence task with justified answers;
- practical support and real-world safety/measurement limitations where applicable;
- tests, review status, PR/commit and live verification evidence.

## Daily implementation loop

1. Inspect both repositories, instructions, dirty worktrees, active tasks and open PRs. Reuse suitable worktrees; never overwrite unrelated changes.
2. Consult the checkpoint ledger and current canonical course data. Alternate subjects where practical, prioritizing missing foundations before deeper extensions.
3. Pick one small objective or a specific accessibility/navigation defect with reproducible evidence.
4. Research authoritative sources; author original content. Check arithmetic, diagrams, answer uniqueness, units, biological scope and source availability. Do not copy textbook prose or generated reference artwork.
5. Implement through the existing narrow sources/builders. Keep authentication, billing, infrastructure, deployment settings, scientific models and the working dissection lab out of scope.
6. Add meaningful regression coverage and inspect the rendered feature on desktop, tablet and phone. Preserve original fingerprint fixtures.
7. Review source and generated diffs. Push a focused branch/PR, wait for every required check, triage unresolved review comments, and merge only green verified work.
8. Verify production HTTPS bytes against the merged artifact and exercise the changed behavior. Record the evidence; leave the ledger incomplete when a gate has not passed.
9. Report the shipped improvement or a concrete failure/decision. Do not create churn on unchanged cycles.

The existing daily automation has been retargeted to this workflow; it is not a second competing publisher.

## Design review

| Before | After | Why |
| --- | --- | --- |
| General launch offers no class-specific starting setup | New visitors see a short questionnaire first | Make the requested personalization discoverable |
| Broad concept library mixes levels | Separate class-specific CBSE paths beside general exploration | Give students an understandable starting point without hiding exploration |
| Curriculum tags can be mistaken for coverage | Supporting lessons and incomplete coverage are disclosed | A topic label is not a completed syllabus objective |
| Personalization could be confused with testing | Local preferences are explicitly distinct from mastery | Preserve evidence-based learning records |

## Current milestone

The initial milestone is **entry, navigation and preference-based recommendations**, not completion of all CBSE content. See `CHECKPOINTS.json` for the deliberately conservative audit status and the release record for actual test/deployment evidence.

The user's next explicit priority is every prescribed Physics and Biology practical in Classes 9–12, including Vernier calipers and screw gauge. Audit experiments, activities, spotting tasks and accessible alternatives separately. A theory mention of an instrument does not implement it. Add missing usable apparatus or clearly labelled supervised-practical preparation; never label a protocol as an interactive simulation.
