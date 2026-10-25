# CBSE Biology practical preparation — release candidate

Status: released and live-verified in PR #41, merge `7c9c67783a3deba8c4d9571b8fb550d562c1c402`. The original local report below is retained as historical evidence. The [production verification record](https://github.com/darshprasad-cmd/biology-entelloq/pull/41#issuecomment-6374201740) confirms required CI, Pages artifact parity and responsive live workflows. `CHECKPOINTS.json` overlays this released coverage on the historical apparatus audit; it does not convert guides into new simulations.

## What is included

The CBSE workspace now has a separate **Practical preparation** entry for Classes 9–12. The library contains 44 standard numbered Biology preparation guides (Class 9: 5; Class 10: 4; Class 11: 19; Class 12: 16), plus 15 separately labelled visually impaired alternative pathways (Class 11: 8; Class 12: 7). Exact IDs, class years and official PDF page numbers match `docs/cbse/practicals.json`.

These are **59 preparation guides, not 59 new instrument simulations**. They do not mark a school practical performed, award mastery, replace practical records or certify competence. Existing supporting models are linked with an explicit partial-coverage notice; the 23-lab registry is unchanged.

Every guide has individually authored principle, apparatus/materials, ordered preparation steps, blank observation headings, analysis, errors/precautions, safety and sources. There are 103 explained retrieval questions. Stable option rotation avoids an always-first-answer shortcut. Expected patterns and worked calculations are distinct from student observations. No fabricated measured results are prefilled.

## Interface and state

| Before | After | Why |
| --- | --- | --- |
| CBSE dashboard linked supporting lessons but not an indexed practical guide library | A separate class-filtered, searchable practical area | Students can find the numbered method without confusing it with general exploration or a full simulation |
| No practical-specific reader | Method, observations, analysis, viva, notes and sources with keyboard section jumps | Supports preparation and evidence reasoning on desktop and narrow phones |
| No separate preparation notes | Versioned per-guide local notes and plain-text download | Preserves all existing lesson/lab notes and avoids storing health or identity data |
| Practical incoming URLs had no dedicated route | `#cbse:<class>/practicals/<official-id>` | Preserves direct practical entry through the first-visit questionnaire; supports back/close navigation |

The accepted dark-green layout, launcher source and working dissection lab are unchanged. No camera, network analytics, authentication, infrastructure or deployment configuration was added. No new dependency is needed by the product.

Notes use `bioq.cbse.practical-notes.v1.<id>`, reject malformed/version-mismatched records, escape rendered text, limit content to 12,000 characters, and warn when persistent storage fails. Session-only notes remain available during that session. Saving a note is not practical completion. The existing profile key, skip behavior, old lesson routes and unrelated student data remain separate.

## Source and safety review

Coverage follows the [CBSE IX Science STANDARD 2026–27 list](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/ScienceSt_SecP1_2026-27.pdf#page=19), [X Science list](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf#page=8) and [XI–XII Biology list](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Biology_SecP2_2026-27.pdf#page=6). The official page applicable to each individual guide is linked in its reader. [NCERT laboratory manuals](https://ncert.nic.in/science-laboratory-manual.php) support methods, not a claim that older manual contents are the current syllabus.

An independent content review checked all 59 IDs and compound specimens, calculation definitions and 103 answer indices/rationales. Corrections made during review:

- The bile-salt guide uses synthetic samples in a surface-tension demonstration and distinguishes bile salts from bile pigments. Its method reference is [JRU's Hay test, PDF p.9](https://www.jru.edu.in/studentcorner/lab-manual/BMLT/2nd-sem/Clinical%20Chemistry-I.pdf#page=9), with explicit non-specificity and no diagnosis claim.
- The urea guide labels its synthetic urease adaptation and links the [NCERT urease method](https://ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classXI/biology/kelm315.pdf).
- Ascaris standard and accessible guides include non-specific symptom examples and asymptomatic infection, supported by [CDC educational background](https://www.cdc.gov/sth/about/ascariasis.html), without personal health interpretation.
- The frog blastula accessible alternative remains separate from the mammalian blastocyst standard guide. Tongue rolling/earlobe attachment are not taught as reliable simple Mendelian human traits.

All urine activities use synthetic teaching samples or teacher-supplied demonstration results in the app. Animal/human material uses prepared slides, authorised images or models; no home collection, culturing, clinical interpretation or diagnostic workflow. Hazardous reagents, blades, heat and solvents are explicitly teacher-controlled. Accessibility alternatives require school-approved accommodations; reading an accessible guide is not a substitute for tactile apparatus or support.

## Verification completed locally

Commands run in `C:/Users/darsh/biology-entelloq-cbse-20261024`:

```text
node --test tests/cbse-practicals.test.cjs tests/cbse-entry.test.cjs
python scripts/build-library.py --check
python scripts/build-learning.py --check
python scripts/build-dissection.py --check
python scripts/build-single-file.py
python scripts/build-single-file.py --check
node scripts/check-learning.cjs --syntax-only
node scripts/check-cbse-entry-browser.cjs
node scripts/check-cbse-practicals-browser.cjs
node scripts/check-learning.cjs
node scripts/check-single-file-browser.cjs
node scripts/check-opening-browser.cjs
node scripts/check-exam-answers-browser.cjs
node tests/check-ai-answer-formatting.cjs
git diff --check
```

Results:

- 10 unit/content tests pass, including exhaustive 44+15 audit-ID/page matching, authored content shape, correct/incorrect viva answers, source/safety boundaries, malformed notes, blocked writes and isolated keys.
- Library, learning and dissection source slots are in sync. Single-file package rebuild/parity passes. 72 inline scripts parse across 10 non-lab pages.
- Existing first-screen regression passes at 1440/768/390/320 px, including held-manifest first paint, profile persistence/edit/reset, class/deep-link routing, blocked storage and offline file behavior.
- Practical browser checks pass at all four widths: all class lists; search and empty state; correct/incorrect viva feedback; notes save/reload/download; existing lesson and lab note keys preserved; keyboard focus containment, Close and Escape; incoming guide retained after questionnaire submit/skip; invalid cross-class link recovery; real supporting microscope navigation; offline packaged guide; blocked-storage session fallback.
- Every one of the 59 guides was opened in the packaged browser, with method step counts, viva counts and official page links checked.
- Scoped axe WCAG 2 A/AA and 2.1 AA scans report **zero violations in 12 states**: catalogue, guide including safety/viva/notebook, and saved-note state at each of 1440/768/390/320 px.
- Representative desktop catalogue, mobile guide and 320px method screenshots were visually inspected. A narrow-screen grid overflow found during testing was fixed with bounded grid tracks; tables scroll inside their own labelled region.
- No diff in `src/lab`, the dissection builder or the original lab-preservation fixture.
- Release-owner regression: all 13 fast-check groups pass, including 32 Python contracts, learning unit tests and original dissection boundaries. The complete single-file browser suite passes 20 checks over HTTP and 20 from a copied offline file, including actual prepared frog/cockroach rendering, lab exit and Universe navigation. Streamed opening/recovery, exam answers and four-width answer-formatting checks pass with no reported errors. These are browser/synthetic checks, not webcam or physical-hardware validation.

Evidence: `docs/cbse/practicals-browser/report.json` and `guide-*.png`, `library-*.png`, `method-*.png`; existing first-screen report in `docs/cbse/browser/report.json`. Generated screenshot folders are local QA evidence, not required runtime assets.

Production runner: set `BIOLOGY_CBSE_URL=https://biology.entelloq.com/` before running `node scripts/check-cbse-practicals-browser.cjs`. The local-only file test is skipped in production mode. `BIOLOGY_PRACTICALS_OUTPUT` can direct evidence to a separate folder.

## Release boundaries and remaining gates

The original local suite and source/generated diff review passed. Subsequent required CI run 40016433267 and deployment run 40018359739 passed. The deployed artifact and HTTPS index matched (27,323,127 bytes; SHA256 `0571329722cd613e91fa8b33bf13b7c4ba2eb9159e11f82d9f335110da4f1fb9`), and live questionnaire/practical workflows passed at 1440/768/390/320 px. This is historical PR #41 evidence, not a claim that later production commits retain that hash. The production record above contains the separate release gates and live-only navigation timeout allowance.

Browser evidence is Chromium emulation, not physical touch hardware, screen-reader certification or a qualified educator's approval. No actual wet laboratory, biological specimen, camera, medical test or live AI operation was validated. The authored methods require school/teacher review before real apparatus use, and syllabus coverage does not imply CBSE endorsement.

## Owned implementation files

- New: `src/cbse/practicals-data.js`, `practicals-ui.js`, `practicals-ui.css`.
- Narrow integration: `src/cbse/entry.js`, `scripts/build-single-file.py`.
- New verification: `tests/cbse-practicals.test.cjs`, `scripts/check-cbse-practicals-browser.cjs`.
- This release note. Audit inventory/docs and parent release workflow are separately owned.

The single-file `dist/index.html` is rebuilt output. Unrelated pre-existing generated-page line-ending status and other agents' documents are not this implementation's changes.
