# Biology learning depth

The existing Biology interface, six explanation modes and interactive models
remain the entry point. Every one of the 73 published concepts now has an
authored sequence that connects a mechanism with evidence and a new situation.
The nine six-lens Lessons link to the corresponding Learn, Reason and Solve
concepts. Roadmap topics are not advertised as completed material.

Three older lesson text fields also receive science corrections: enzyme Km is
not universally a direct binding-affinity measure, and continuous logistic
growth is distinguished from the separate discrete map that can exhibit chaos.
The lesson data snapshot is updated for these exact text edits; the original
simulation-builder fingerprint is retained.

Each concept includes three learning objectives, three substantial mechanism
stages, an explained misconception, an evidence table with a question and hint,
a worked chain of reasoning, an explicit evidence limitation, and a transfer
problem with its own hint and explanation. Sources are linked in each unit.
Quantitative investigations distinguish fictional teaching data from theoretical
bookkeeping; neither is presented as an empirical or clinical dataset.

Learn contains the complete treatment. Reason adds the evidence investigation
to its existing prediction and reflection workflow. Solve retains the three
existing topic checks and adds the transfer problem. The same activity uses the
same saved draft across these entry points. Reading a page does not count as
mastery; the revisit list records only the student's explicit self-review.

## Authoring and storage

- `src/library/depth-foundations.js` and `depth-processes.js` own the 73 units.
- `src/library/depth-study.js` renders disclosures, accessible evidence tables,
  hints, private drafts, self-review, the revisit list and Markdown exports.
- `src/library/depth-study.css` extends the existing palette and reading surfaces.
- `scripts/build-library.py` inlines the content into Learn, Reason and Solve.
- `src/_lessons.js` owns the nine lesson-to-concept mappings; the existing narrow
  learning builder updates the deployed Lessons artifact.

Notes use separate per-topic, per-activity `bioq.depth-study.v1.*` browser keys.
They never overwrite existing lesson journals, Solve marks or lab notebooks.
Malformed state is rejected; changed questions retain drafts but invalidate
the prior self-review. Closing an answer preserves the intention to revisit it.
Unavailable/full storage keeps notes for the current page session and offers
an export. A full reload without working browser storage cannot retain them.
Notes are not sent to the AI service. Written explanations use self-comparison,
not automatic grading. Exported investigations include their evidence and limits.

## Validation

```powershell
python scripts/build-library.py
python scripts/build-learning.py
node scripts/check-learning.cjs
python -m http.server 3026 --bind 127.0.0.1
node scripts/check-depth-browser.cjs
```

The focused browser check covers all 73 rendered units, answer/hint disclosure,
notes across Learn/Reason/Solve and reload, self-review and revisit navigation,
export contents, denied storage, the app iframe, keyboard controls and
320/390/768/1440 px Learn layouts. `BIOLOGY_PREVIEW_URL` selects another root.
The same check can run against the published HTTPS site in a fresh browser.

The complete local static suite passed all 13 groups, including the full unit
tests, generated-source checks, navigation/tutorial contracts and protected
dissection boundaries. A subsequent rerun after the final disclosure-save fix
passed 12 groups but reached the 90-second budget in the heavy geometry tests;
release therefore also requires the full CI suite on the final commit.
The browser report records the separate UI checks.
An independent second-agent editorial review covered all 73 new units and the
quantitative examples; its findings were corrected before release. This is an
internal review, not external academic peer review.

Scope limits: the checks do not establish measured learning gains, exhaustive
exam-board alignment, or clinical validity. This change does not alter the
simulation mathematics, dissection, camera tracking, provider or deployment
configuration. The existing repository checks preserve those source boundaries.
