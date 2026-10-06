# Biology library expansion and reading design

## Scope

This release adds 36 authored concepts to the 73 established lessons, for 109
completed concepts in 13 fields. It targets school biology, NEET/AP/IB-level
learning and introductory university depth. The tags describe appropriate depth;
they are not official syllabus mapping, exam endorsement or a claim that every
biology subject is covered. The remaining roadmap entries stay unpublished.

`extended-core.js` develops biological chemistry, inheritance, evolution,
conservation, microbes and biotechnology. `extended-systems.js` develops human
physiology, reproduction and plant biology. Each new concept has six explanation
modes, key terms, a staged conceptual diagram, three retrieval checks with
feedback, a compact worked example, three mechanism sections, misconception
correction, an evidence investigation and a transfer problem. Synthetic exercises
are explicitly labeled; they are not experimental observations or clinical advice.
Reference checks and limitations are recorded in the two EXTENDED source notes
under `docs/library/`. These are authored teaching resources, not independently
peer-reviewed curricula or measured learning-outcome evidence.

The additions provide 216 explanation views, 108 retrieval questions, 36 worked
examples and 36 evidence investigations. In total, the library now contains 654
explanation views and 327 retrieval questions; this does not mean 654 distinct
concepts. Generic diagrams show the authored sequence and highlight the current
stage. They are explicitly conceptual, not anatomical reconstructions. Existing
specialized diagrams retain their rendering.

The original lesson content is retained. Learn gains three optional study paths,
visible card summaries and expandable subtopics. Lesson jump controls move focus
without changing the topic/mode route. Typography, reading widths, key-term
boxes, evidence tables and mobile controls are refined within the existing
dark-green design. A visited-concept meter explicitly does not represent mastery.
The design-engineering skill favors quick, accessible navigation and restrained
interaction feedback rather than decorative motion.

## Boundaries

The narrow library builder synchronizes Learn, Reason, Solve and the existing
home registry. The single-file builder packages the complete application.
No dissection source, specimen asset, camera code, authentication, billing,
provider implementation, deployment configuration, shared theme or protected
launcher region is edited. Original fingerprint fixtures remain unchanged.
Existing lesson notes, laboratory notebooks, Solve history and independent
`bioq.depth-study.v1.*` study drafts retain their storage formats.

## Verification

```powershell
python scripts/build-library.py
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-library-expansion-browser.cjs
node scripts/check-depth-browser.cjs
node tests/library-previews-browser.cjs
node scripts/check-single-file-browser.cjs
```

The expansion unit contract verifies all 36 named additions, roadmap removal,
resolved references and identical registries in the home and learning pages.
An independently captured hash preserves all 73 original topic records except
the added NEET learning-level tag. Existing content, depth, enrichment and
practice tests now cover the full 109-topic registry rather than only the old
data file.

The focused browser script supports standalone source pages, the portable
application and HTTPS deployment. Set `BIOLOGY_PREVIEW_URL` to the source or
distribution root; set `BIOLOGY_EXPANSION_PACKAGED=1` for a portable page.
`BIOLOGY_EXPANSION_OUTPUT` selects a new evidence folder, and
`BIOLOGY_DEPLOYED_ARTIFACT` enables exact comparison with an independently
downloaded deployment artifact. It verifies six modes for every new lesson,
cross-pillar notes and practice, study paths, focus-preserving section jumps,
and 320/390/768/1440 px layouts. The full single-file check separately tests
network-blocked HTTP and a copy of the HTML alone via file access.

Browser inputs are synthetic. These checks do not validate physical phones,
webcam tracking, live AI, login, medical use or scientific learning efficacy.
Release status, CI and live parity must be verified on the final commit; this
document alone does not establish that a deployment passed.

Output folders can be isolated with `BIOLOGY_DEPTH_OUTPUT`,
`BIOLOGY_PREVIEW_OUTPUT` and `BIOLOGY_SINGLE_OUTPUT`; prior release evidence is
not overwritten. The focused expansion browser check counts camera requests
outside page documents so navigation cannot erase a denied request.

Independent bounded review corrected a gravity/light confound in the tropisms
transfer exercise and added specific sources for eukaryotic regulation, protein
disorder and trained innate responses. These agent reviews do not replace a
qualified biology educator's review.

## Initial local evidence (October 6, 2026, before main integration)

- All 13 fast-check groups passed, including the full unit suite, source-drift
  contracts and original-dissection boundaries.
- All 25 targeted library/content/practice/sequence tests passed.
- Source-browser checks covered all 109 depth units and Solve routes, all 36
  additions in six modes, persistence, restricted storage, previews and mobile
  layouts. Selected screenshots and focused design reports are retained here.
- The 26,712,656-byte local package passed both isolated HTTP and copied-alone
  file checks (10 complete-application checks per mode), with network dependencies
  blocked. Its SHA-256 is
  `a413aa36f81fa43bfb2beffd63912d88f9734f4dbb9b34d583b581000c90734b`.
  This local package fingerprint is not a claim of production byte parity;
  deployment verification must use the actual CI-produced artifact.

## Integration with the concurrent exam-answer release

Main advanced to `80c8ac6` while this branch's first CI run was passing. The
generated Reason/Solve style conflicts are resolved by the narrow builder, with
both the new reading styles and the incoming exam-answer styles retained. The
incoming responsive-startup implementation and all existing answer formatting
are inherited unchanged, not reverted.

`exam-extended-core.js` and `exam-extended-systems.js` supply exact-question,
exact-option rationales for all 108 new questions. They extend the incoming
maps after the original rationale modules load; grading and saved-answer
formats remain untouched. Tests must now cover all 109 concepts and 327 topic
questions, including option rotation, rather than silently checking only the
original 73. Final integration checks and deployment must run on the merged
tree; the initial artifact hash above is not the integrated release hash.
