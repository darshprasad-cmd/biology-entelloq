# Pollen field-counting rehearsal

Bounded objective: Class 12 Biology `b12-a-e01`, temporary mount for pollen germination. This adds an interaction to the existing preparation guide, not another guide, a real viability assay, or the separate stigma-spotting objective `b12-b-s02`. Guide totals remain 44 standard and 15 accessible alternatives. The historical `practicals.json` audit remains unchanged; the effective release ledger is `CHECKPOINTS.json` plus production evidence.

## Source and scientific boundary

- [CBSE Biology 2026–27, PDF p.12](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Biology_SecP2_2026-27.pdf#page=12) lists the mount in A1, separately from stigma spotting in B2.
- [NCERT Class XII laboratory manual, Exercise 2, printed pp.12–13 / PDF pp.1–2](https://www.ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classXII/biology/lelm202.pdf#page=1) includes lily among possible specimens, observation across 3–5 fields, and germinated/total × 100. Timing and success vary by species. Its text does not impose a tube-length threshold or silently exclude damaged grains. Official indexed text was readable; direct PDF fetches were intermittently unavailable during research.
- [Sawidis et al. (2021), Acta Agrobotanica 74:746, p.3 §2.2](https://www.journalssystem.com/agb/pdf-159845-86184?filename=Impact+of+Manganese+on.pdf#page=3) provides a strict tube-length-greater-than-grain-diameter criterion for its *Lilium longiflorum* culture assay. Here this is a declared teaching rule, not a universal definition or the NCERT scoring rule. The study's treatments and experimental conditions are not a school protocol.

The original circular grain diagrams are not photomicrographs or species-accurate lily morphology. Drawing dimensions are arbitrary, not calibrated micrometres. The 0/10/20-minute snapshots are authored examples, not growth predictions, real incubation or reproduced experimental data. No universal medium recipe or temperature is invented. Physical mount preparation remains teacher-supervised. No educator review, viability certification, clinical validation or practical-completion claim.

## Implemented interaction

Prepare a sparse virtual mount, compare clear/crowded/dried preparation, move between three distinct fields and three authored times, inspect numbered grain diameters and connected tube centrelines, and enter total/qualifying counts and a percentage. The table is a text equivalent of the visible geometry, not a separate dataset. No continuous animation, timer dependency, camera or network is needed.

All recognizable grains stay in total N, including ruptured and short/unextended grains. Rupture is described separately, not assumed to prove a grain's prior history. At 20 minutes, A is 6/9, B is 7/11 and C is 8/14. Pooling gives 21/34 = 61.7647%, not the mean of three percentages. Equal tube length does not pass the strict greater-than rule. Nonqualification is not proof of permanent nonviability or failure of fertilisation.

Validated raw observations are stored under `bioq.cbse.pollen.v1`, separate from all existing records. A repeated field/time replaces that row; different times remain separate and are never counted as independent specimens. At most nine distinct field/time records exist. Reset preserves the notebook. Unavailable storage retains the current session and advises CSV export. Public reads return defensive validated copies; forged values and arbitrary strings are rejected. Six explained questions cover retrieval and evidence reasoning. Saving never awards mastery or marks the school practical complete.

## Design and preservation

| Before | After | Why |
| --- | --- | --- |
| Read-only pollen guide | Integrated three-field observation bench | Practise counting from visible evidence |
| No count/time record | Separate raw notebook and weighted, time-specific summaries | Avoid duplicate samples and incorrect percentage averaging |
| Described preparation problems | Clearly invalid crowded/dried views with blocked recording | Connect preparation quality to justified observation |
| No accessible equivalent field | Native inspector, dimension table and labelled keyboard controls | Support narrow screens and non-visual reasoning |

The engineering skill constrained scope and release checks; the design skill guided dark-green grouping, clear focus and instant keyboard response without ornamental motion. Only new CBSE pollen source/test files, guide mounting/catalogue cue, the builder's CBSE filename lists and this release ledger change. No dependencies, protected launcher/auth/infrastructure/configuration, shared assets, questionnaire, original fixtures, old scientific engines or dissection changes.

The active product-excellence candidate was inspected read-only. It edits a prefix on the same single-file builder line; its files were not copied. This branch starts from released PR50 and preserves that questionnaire and route guard. Any later integration must reconcile the small builder-list overlap normally.

## Release gates

Local source/unit checks, generated parity, questionnaire/class-path and existing guide workflows, responsive keyboard/reduced-motion/axe, source geometry versus rendered geometry, storage/export, and HTTP/file-offline packaging must pass. Required PR and post-merge CI, Pages, exact public HTTPS artifact parity and changed live behavior are separate gates. Browser emulation is not physical phone, assistive-technology certification, laboratory validation or webcam testing. Production status is not implied by this source document.

## Verified local checkpoint · 3 November 2026

- All 14 fast-check groups passed, including content/answer/reference contracts, original dissection boundaries, all existing Node tests and narrow source-sync checks. Pollen model and notebook tests pass 18/18 independently. The first fast run exposed the old potato module-adjacency contract; the new pollen modules were moved ahead of that existing pair, preserving the original assertion without weakening it. A later complete fast run passed.
- Final single-file build: 44,717,230 bytes, SHA256 `03ec93be4667c84b123d9b56a9d0e058a271dc948611226e64a777275afda589`. `build-single-file.py --check` passed. `check-single-file-browser.cjs` passed **31 HTTP + 31 file-offline cases**, including existing learning navigation, notes, prepared specimens and Universe; no dissection source changed.
- `check-pollen-browser.cjs` passed all 1440/768/390/320px cases and offline interaction. Counts were independently derived from rendered circle radii and tube polylines for all nine snapshots, not trusted from the model answer function. Wrong N/n/percentage, faults, exact-equality, repeated/time-separated records, weighted pooling, practice feedback, reload, CSV, existing notes, corrupt/forged/unavailable storage, keyboard, reduced motion and scoped axe checks passed. No camera or bench network calls. First-pass evidence is retained separately from the final-artifact rerun.
- Existing practical catalogue passed all 59 guides and four widths, including search, empty recovery, guide notes/viva, class routes, close focus, supporting microscopy and offline preparation. The full questionnaire passed all four widths and ten groups including class paths, unchanged saved preferences, explicit deep links, blocked storage and pre-manifest/offline first-screen behavior.
- Existing microscopy passed a 390px regression plus its corrupt-data, storage, CSV and offline cases. This is a bounded regression, not a new four-width microscopy certification.
- Independent engineering review found and fixed mutable public notebook reads; defensive copying is now regression-tested. Independent source review confirmed denominator, time grouping, strict boundary and arithmetic. Desktop/mobile screenshots were inspected; this is not qualified educator review.

Final local reports are under `docs/cbse/pollen-20261103/`. The release PR conversation is the subsequent authority for required hosted checks, merge/deployment and exact public verification; this committed checkpoint deliberately remains `verified-local` until that evidence exists. Prior microscopy PR48 and Physics pulse PR45 production evidence have been reconciled in the ledger, not reimplemented.
