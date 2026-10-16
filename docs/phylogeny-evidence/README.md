# Read the branches, not the label order

## Bounded learning improvement

The existing Phylogenetic Trees concept explained common ancestors and node
rotation but displayed generic process cards. Its evidence table supplied the
shared-node answers without drawing a branching tree. This release gives that
one lesson an original rooted-tree diagram and an applied comparison task.

| Before | After | Why |
| --- | --- | --- |
| Three generic process cards | Three manually selected tree drawings | Students can inspect actual ancestor–descendant connections. |
| An answer-giving shared-node table | T1/T2/T3 nested groupings, a private explanation, then worked reasoning | Students justify equivalent topology using descendant sets. |
| Generic stage/timing wording | Explicit alternative drawings and unscaled-length limits | Changing the view must not imply evolution proceeds through these three trees. |

T1 groups A with B and C with D. T2 reverses the layout while preserving those
clades. T3 groups A with C and B with D, changing the hypothesis. The task also
asks why A is equally related to C and D in T1, why A+C alone is not a clade,
and why the drawings cannot supply dates. A textual grouping, structured SVG
description and annotation accompany each drawing. Color is supplementary:
labels and connections carry the meaning. There is no autoplay or motion.

The design-engineering skill guided single-tree phone legibility and immediate
keyboard feedback. Back at the first view returns focus to the enabled Next
annotation control. The engineering-workflow skill confines the upgrade to
this topic's visual and evidence task. Existing six explanation modes, three
graded questions and rationales, transfer task, routes, notes, all other
concepts, application layout and dissection lab remain unchanged.

## Evidence and limits

- [OpenStax Biology 2e: Organizing Life on Earth](https://openstax.org/books/biology-2e/pages/20-1-organizing-life-on-earth)
  supports the distinction between node rotation and changed relationships,
  and warns against interpreting uncalibrated lengths as elapsed time.
- [UC Museum of Paleontology: Understanding phylogenies](https://evolution.berkeley.edu/evolution-101/the-history-of-life-looking-at-the-patterns/understanding-phylogenies/)
  explains shared ancestry and clades as an ancestor with all descendants.

Checked October 16, 2026. All illustrations, groupings, questions and wording
are original. No source illustration, photograph, measured dataset or external
asset is bundled. The trees are invented teaching hypotheses with no character
analysis, sequence data or statistical support. They do not establish a real
species history. This deepens one of 109 completed concepts without increasing
the lesson count or claiming official NEET/AP/IB alignment, qualified educator
review or measured learning effectiveness.

## Preservation and verification

The accepted e34914e baseline is captured in a new immutable fixture; previous
fingerprint fixtures and hashes are retained. Independent tests derive clades
and common ancestors, protect every unrelated library record and visual, and
exercise obsolete-task migration: drafts survive while stale self-review is
reset for the changed task. The unchanged transfer and graded practice retain
their state. Browser checks reconstruct the graph from actual SVG path
endpoints rather than trusting declared topology metadata.

```powershell
python scripts/build-library.py
node --test tests/library-phylogeny.test.cjs
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-phylogeny-browser.cjs
node scripts/check-library-expansion-browser.cjs
node scripts/check-single-file-browser.cjs
```

Set `BIOLOGY_PREVIEW_URL` to the source server or deployed HTTPS origin and
`BIOLOGY_PHYLOGENY_OUTPUT` to a fresh evidence directory. Use
`BIOLOGY_PHYLOGENY_PACKAGED=1` for the portable application; for live verification,
also set `BIOLOGY_DEPLOYED_ARTIFACT` to the downloaded successful CI artifact
so the runner checks exact served bytes before exercising the page.

The focused runner covers source and packaged pages, both themes and
320/390/768/1440 widths. The portable runner includes the new tree interaction
in isolated HTTP and copied-alone file checks with external dependencies
blocked. Release requires green CI, the exact tested merge, successful Pages
deployment, downloaded CI-artifact/live-byte parity and changed behavior on
live HTTPS. Browser assertions are not screen-reader speech, physical mobile
hardware, webcam tracking or formal accessibility certification.
