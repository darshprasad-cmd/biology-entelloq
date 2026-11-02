# Real-student usability protocol

Status on 2026-10-29: **prepared, not executed**. No participants were recruited or observed by this automated work. No findings, quotes, success rates or learning gains are invented. Exact blocker: a consenting student cohort, moderator and actual device sessions are not available to this workstream.

## Purpose and scope

Evaluate Physics and Biology separately across desktop and mobile: discover → launch → manipulate → understand → save → resume. The first meaningful interaction target is 30 seconds from a fresh landing to an action that changes the scientific experiment. Opening a menu, dismissing onboarding or clicking Launch alone does not meet that definition.

Start with four to six formative sessions per subject/device flow, adapted to available students; this follows the scale described by [PhET's design interviews](https://phet.colorado.edu/en/research), not a promise of statistical power. Record real device/OS/browser. Include different subject familiarity and input/accessibility needs where participants consent. Do not infer population-wide usability from a small formative sample.

## Consent and privacy

Recruitment is a human-owner action; this document does not authorize messaging students. Obtain voluntary participation and any school/guardian approval appropriate to age/context. Explain that the product is being tested, not the student; allow stopping without penalty. Use anonymous participant codes, avoid names/emails/grades in research exports, and keep recordings off by default. If recording is needed, obtain explicit consent, state purpose/access/retention and avoid webcam capture beyond the experiment's opt-in use. Never include student records in public repository commits.

## Session procedure

1. Record build/source identifier, product, device, viewport, connection, input method and whether this is the first exposure. Use a fresh profile for the first-run task; retain a separate prepared profile for save/resume failure tests.
2. Tell the student: “Explore this science app. Find an experiment you can change, and show what happens.” Start timing when the landing is usable. Do not point at controls. Record loading time separately from interaction time.
3. Ask for one prediction and one parameter change. Ask “What changed, and what do the numbers mean?” Record misconception or missing units; do not turn the interview into tutoring before the task ends.
4. Ask the student to find a related explanation and return to the same experiment. Record lost state, navigation uncertainty, hidden controls and unnecessary scrolling.
5. Ask the student to record an observation and save their work. Then reload or leave/return and ask them to resume it. Check actual restored state, not their confidence alone. Ask “Where is this saved?” to verify understanding of local-only storage.
6. Ask for a CSV/report export. Record whether the file opens and conveys units, assumptions and provenance. Do not count canceled or failed exports as completion.
7. Use a second scenario to find a concept with a synonym or natural-language query. Record empty/irrelevant search results and whether the destination matched the student's intent.
8. Where appropriate, test one permission-denied or unavailable-camera flow without pressuring the student to enable a camera. Confirm touch/keyboard/mouse alternatives. Native app acceptance requires actual iPhone/iPad/Android sessions separately.
9. End with “What was confusing?” and “What would you expect to happen next?” Record participant words exactly only when actually observed.

## Before/after comparison

Use equivalent tasks and preserve the baseline build. Counterbalance order, or use separate fresh participants, to reduce practice effects. Do not ask the same student to locate an already-memorized button and claim the resulting speed proves a redesign benefit. Compare matched device classes and network conditions. Screenshots document observable interface differences; session notes document behavior. Clearly separate automated completion time from human discovery time.

| Field | Record |
| --- | --- |
| Session | Anonymous ID, date, moderator, consent recorded yes/no |
| Environment | Product, build, device, OS, browser/native version, viewport, input, network |
| Discovery | First meaningful interaction time; target met yes/no; assistance count |
| Manipulation | Intended/actual parameter change; response understood; units understood |
| Navigation | Wrong turns, lost experiment state, explanation-return success |
| Persistence | Save status seen; actual saved payload; reload/resume success; local/cloud understanding |
| Export | File type, opened successfully, units/provenance retained, cancellation/error |
| Accessibility | Focus loss, touch target, zoom, screen reader or reduced-motion issue observed |
| Finding | Observation; participant quote if available; severity; proposed repair; retest |

## Decision rule

Publish counts and individual times with the sample size, not unsupported percentages alone. Flag any data-loss/false-save, inaccessible essential control, unintended camera activation or scientific misunderstanding caused by the UI as a blocking usability finding for that affected flow. Refine and retest the changed flow. A 30-second target met by automation does not satisfy the real-student criterion. The user-facing redesign must remain documented as awaiting student validation until sessions are completed.
