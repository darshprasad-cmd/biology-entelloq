# Class 11 chromatography measurement rehearsal

## Audited gap and bounded scope

On 20 November 2026, released Biology main `80627914949666b93f90e0c0eb840dd25dacd658` has the authored preparation guide for `b11-a-e08`, but no interactive paper-development or band-distance notebook. The historical `practicals.json` label is not current guide coverage: the guide was released in PR41; the missing capability is an apparatus/measurement interaction.

This change adds only that interaction to the existing Class 11 practical route. Classes 9–12 objective-level curriculum audits and other practical families remain unfinished. Biology PR47 (curriculum workspace), PR52 (active UX), and Physics PR41/42 (circuits/guided senior practicals) are separate unfinished work, not included or represented as shipped here. The questionnaire and dissection are preserved. User-authorized coordination with the active UX chat identified the small builder/mount overlap; no work from its branch is copied.

## Scientific and interaction contract

The drawings are original synthetic endpoints for two fictional leaf extracts under one illustrative paper/solvent system. They are not measured plants, species-specific pigment profiles, chemical identification, a solvent recipe, a calibrated apparatus or a development-rate law. Selecting a front distance changes the teaching endpoint, not a prediction of elapsed time. Repeated endpoints are not independent experiments.

Prepare a compact dried spot, inspect the baseline/reservoir relationship, develop a strip, mark the solvent front, then use the ruler/cursor to measure from the baseline. Distinguish band centres from the edges of diffuse bands. Enter band and front distances in millimetres; calculate dimensionless `Rf = band distance / front distance`. Compare within the same stated conditions without assigning definitive identities from colour alone. Ink, submersion, overloading and an unmarked dried strip invalidate the measurement exercise and cannot produce checked notebook entries.

The new notebook key is separate from all notes, practice results and preferences. Repeated sample/front/band measurements replace a row rather than creating additional samples. Stored values are bounded and revalidated; export is a fixed-schema numeric CSV marked synthetic. No grades or practical completion are awarded. Physical solvent work is teacher-supervised in a suitably ventilated school laboratory; no flames or home mixing is instructed.

## Authoritative references

- [CBSE Biology 2026–27](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Biology_SecP2_2026-27.pdf#page=7), PDF page 7, Class XI experiment 8. Current official PDF opened and checked on 20 November; this is not a claim of full syllabus alignment or official endorsement.
- [Royal Botanic Gardens, Kew: separating leaf pigment using chromatography](https://endeavour.kew.org/sites/endeavour/files/documents/2023-05/Kew-KS5-PhotosynthesisPower-PracticalHowTo.pdf), pages 1–2, opened 20 November. Supports pencil origin, compact dried sample, keeping the spot above liquid, prompt front marking and distance-ratio reasoning. No prose or diagrams copied. Its specific solvent procedure and tentative colour associations are not universal model parameters here.

The RSC page returned an anti-bot interstitial, and full IUPAC term/PDF pages returned 403 during this audit; they are not claimed as freshly inspected full references. The synthetic values are author-designed arithmetic examples, not values extracted from those pages.

## Design review

| Before | After | Why |
| --- | --- | --- |
| Preparation text and blank observation headings only | Separate compact apparatus and measurement workflow inside the same guide | Make the missing practical reasoning actionable |
| No measurable chromatogram | Original numbered bands, zero-at-baseline ruler and movable cursor | Practise identifying the correct origin and band centre |
| Errors only described | Invalid setup states block checked results and explain why | Link method decisions to defensible evidence |
| No instrument notebook | Isolated validated rows and CSV | Preserve existing student work and prevent duplicate-sample claims |

The engineering skill constrains changes and release gates. The interface skill guides the familiar dark-green hierarchy, native controls, clear focus and immediate keyboard response; no ornamental animation or new runtime dependency is necessary.

## Preservation and release gates

Only new CBSE apparatus files/tests, two additive guide blocks, three builder filename entries and this ledger/document are in scope. Exact stripping of the new mount/cue and builder slots must recover the released source hashes; all original preservation fixtures continue unchanged. No authentication, billing, deployment configuration, shared assets, protected launcher or scientific/dissection engines change.

Required evidence: new independent arithmetic/state/storage tests; complete fast/source-sync checks; packaged four-width keyboard/reduced-motion and scoped accessibility checks; unchanged questionnaire/catalogue/learning workflows; offline single-file packaging; visual inspection; diff/review; green required CI; merge and Pages; exact public HTTPS parity against the actual deployed artifact; unchanged live behavior. Record initial failures separately from successful retries. Browser emulation does not certify physical devices, assistive technology, educator review or supervised school work. The release PR conversation is the production authority.

## Verified local checkpoint · 20 November 2026

- All 19 new model/UI/integration tests passed. Independent arithmetic and rendered geometry cover all 24 sample/front/band combinations; six explained reasoning questions have checked answers.
- All 14 fast groups passed, including original dissection boundaries, shared navigation and existing learning unit tests. Library, learning, learning-tool builder and source/runtime synchronization checks passed without changing those sources. Single-file rebuild and `--check` passed.
- Final new-bench browser suite passed 17 report entries at 1440, 768, 390 and 320 CSS pixels: eight scoped axe scans with zero violations, keyboard/reduced-motion operation, correct and incorrect measurements, preparation errors, front loss, checked persistence, CSV, unrelated-note preservation, and a copied single-file offline interaction. This is viewport emulation, not physical-device or assistive-technology certification.
- Unchanged questionnaire suite passed 10 groups. Unchanged catalogue suite passed 19 entries, including all 59 guides, four widths, 12 scoped axe scans with zero violations and offline operation. Existing pollen regression passed at 390 px plus storage/CSV and file-offline cases; it is not a new four-width pollen certification.
- Full application packaging passed 31 HTTP and 31 file-offline checks, with zero recorded runtime errors or camera requests. These include existing learning, saved notes, specimens and Universe routes; they do not validate real webcam tracking or change the dissection engine.
- Final local `dist/index.html`: 44,754,468 bytes; SHA256 `433c5e018dbca2f491d27f5f928632707696ee8d37a7029b40b91a0883d90b9b`. Deployment parity must use the actual Pages artifact because Python/runtime gzip bytes can vary; decoded payloads and remaining source must also match this tested build.
- Independent source review and desktop/mobile screenshot inspection found no release blocker. All 579 pre-existing untracked QA files were rehashed and remained unchanged. New QA outputs are isolated under `docs/cbse/chromatography-20261120/`; do not overwrite them or stage previous work.

Development evidence is not erased: an initial UI test expected formatted `0.90` CSV instead of the correct lossless raw `0.9`; it was corrected and strengthened with a raw `0.254` case. The initial browser suite passed its responsive/arithmetic cases but failed because the session-only storage warning was inside a collapsed notebook. The warning was moved outside that disclosure; the original visibility assertion then passed in a fresh final run. No assertion was weakened to hide the problem. Initial and final reports remain separate.

Local checkpoint only: required hosted CI, review/merge, Pages, public HTTPS parity and unchanged live behavior must be recorded in [release PR53](https://github.com/darshprasad-cmd/biology-entelloq/pull/53) before claiming a fully verified production release. No other open PR is included. The later production-verification comment on that PR is the status authority beyond this committed local checkpoint.
