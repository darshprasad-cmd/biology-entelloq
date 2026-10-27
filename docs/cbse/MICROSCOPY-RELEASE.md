# Paired onion and cheek microscopy rehearsal

Source checkpoint: implementation and local release checks passed. PR checks, merge and live deployment are separate gates. Subsequent production evidence is recorded in [PR #48's release conversation](https://github.com/darshprasad-cmd/biology-entelloq/pull/48). This is not a live status feed.

## Bounded gap

Class 9 standard Science practical 4 (`s9-e04`) already had a guide. The legacy microscope has onion, blood, stomata and bacteria, but no cheek specimen or paired mount-preparation notebook. This release adds one interaction inside the existing guide at `#cbse:9/practicals/s9-e04`; it does not replace the legacy microscope or touch dissection. Guide totals stay 44 standard and 15 accessible alternatives. The historical `practicals.json` audit remains historical rather than falsely counting listed guides as interactive apparatus.

## Learning activity

- Prepare either a virtual onion epidermal peel or a cheek-cell smear. The physical preparation methods differ and remain teacher-supervised; no actual sample collection or camera is involved.
- Compare unstained/stained contrast and thin, bubbled or folded/crowded mounts. A poor mount cannot be repaired by increased magnification.
- Use 4x, 10x and 40x objectives, a fixed 10x eyepiece, arbitrary fine-focus and illumination controls, and two physical-stage coordinates. Image motion is opposite slide motion.
- Record descriptive observations only from a usable illustrative field. Settings are checked, but free-text scientific correctness is not automatically graded. Saving never changes mastery or school-practical completion.
- Compare the two cell types and answer six explained retrieval/application questions about magnification, field diameter, tissue-specific chloroplasts, walls, artefacts and resolution.
- Retain up to 40 versioned local observation snapshots separately from existing notes. Reset changes the current mount, not the notebook. Export quoted, formula-protected CSV with explicit simulated provenance. Storage failure keeps session data and warns the learner to download it.

## Primary references and model limitations

- [CBSE Class 9 standard Science 2026–27, PDF p.19 item 4](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/ScienceSt_SecP1_2026-27.pdf#page=19): onion peel or Rhoeo, plus human cheek cells. This bench chooses onion and cheek; it is not a Rhoeo interaction.
- [NCERT Class IX Science laboratory manual, experiments 18–19, printed pp.69–74 / PDF pp.1–6](https://www.ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classIX/science/ielm103.pdf#page=1): distinct preparation, low then high power, avoidance of bubbles and the limits of seeing small organelles in a temporary mount. Original prose and SVG geometry only; no copied microscopy image. The independent reference pass read the actual manual; the web reader rejected its large file on a repeat fetch.
- [Nikon MicroscopyU: Field of View](https://www.microscopyu.com/microscopy-basics/field-of-view): field number divided by objective magnification. The selected FN18 mm instrument gives specimen fields 4500, 1800 and 450 micrometres. This is an instrument assumption, not measured cell sizes.
- [Nikon MicroscopyU: Resolution](https://www.microscopyu.com/microscopy-basics/resolution): magnification alone does not establish resolution. No numerical-aperture or diffraction calculation is claimed.

The cells, dimensions, stain appearance, focus tolerances and illumination response are original illustrative choices. Onion cells have adjoining elongated outlines, peripheral nuclei and a pale vacuolar region; no chloroplasts are drawn for the ordinary bulb epidermis. Cheek cells have irregular flattened contours and nuclei, not walls, plant vacuoles or visible mitochondria/ER. The contour is not a resolved membrane bilayer. The scale bar matches the declared model field but cannot be used to measure a real specimen. Real slide preparation, optical aberrations, tissue variation and manual skills are not simulated or certified. No educator, clinical, physical-microscope or webcam validation is claimed.

## Interface review

| Before | After | Why |
| --- | --- | --- |
| Guide points at a generic microscope without cheek cells | Dedicated paired-specimen rehearsal within the existing guide | Cover the prescribed comparison without disturbing legacy models |
| Preparation errors only described | Bubbles, overlapping material, contrast and focus visibly affect the field | Separate observation quality from magnification |
| No paired microscopy record | Local raw-state snapshots and explanatory practice | Preserve evidence and interpretation without awarding mastery |
| Generic controls | Native keyboard controls, 44px targets, stacked mobile layout and text equivalents | Keep the activity accessible without gesture-only input |

The engineering skill keeps source scope and preservation checks narrow; the design skill guides readable control grouping and immediate keyboard behavior, with no animation loop. The PDF skill was used only for read-only reference review.

## Scope and release gates

New `src/cbse/microscopy-{model,ui}.js`, `microscopy-ui.css`, model/UI unit tests and a dedicated browser checker. The existing single-file builder adds only these CBSE sources. `src/cbse/practicals-ui.js` adds one guide mount and catalogue cue. Original fixtures, launcher, auth, infrastructure, shared assets and existing scientific models are unchanged. No new runtime dependency.

Fast checks, narrow source synchronization, content/answer/reference checks, responsive keyboard/reduced-motion/axe and storage workflows, questionnaire/class-path/learning regression, portable/offline behavior and packaged-source parity must pass. Review and required CI precede merge. Pages success, exact HTTPS bytes and changed live behavior precede a shipped claim. Browser emulation is not physical-phone or screen-reader certification.

## Local evidence · 27 October 2026

- `node scripts/check-learning.cjs`: **14/14 groups passed**, including Python contracts, all Node unit files, original dissection boundaries, source drift, navigation and syntax. The new model/UI subset passes **16/16 tests** independently. No preservation fixture changed.
- `build-library.py --check`, `build-learning.py --check`, `build-dissection.py --check` and the fast checker verify narrow source parity. The original fresh Windows checkout produced CRLF-only background/preview drift; the existing builders normalized it. Git's semantic diff contains no generated authoring-page content changes.
- `check-microscopy-browser.cjs`: all 1440/768/390/360 px cases, **8 scoped axe scans with zero violations**, first-screen questionnaire skip/complete and deep-link preservation, keyboard stage controls and exit focus, actual SVG blur/stain/illumination, literal magnification and field values, inverse stage motion, bubbles sharing stage and magnification, both cell types, faulty-preparation rejection, reasoning feedback, notebook/CSV/reload, old notes, corrupt/injected/blocked storage and file-offline interaction. Zero camera calls, bench network requests or page errors. Report and screenshots: `docs/cbse/microscopy-browser/` (local QA evidence, not shipped runtime assets).
- Independent review caught bubbles initially fixed in field coordinates. They now share specimen translation and objective scaling; dedicated browser assertions and a full rerun passed. Desktop and mobile screenshots were visually inspected after the correction.
- Existing `check-cbse-entry-browser.cjs` passed all four widths, classes, profile edits/reset, deep links, blocked storage, pre-manifest questionnaire and offline use. Existing `check-cbse-practicals-browser.cjs` passed all **59 guides**, catalogue/class/search, notes/viva, keyboard/close, support route and offline guide; **12 scoped axe scans** passed.
- Existing `check-exam-answers-browser.cjs` passed all Solve formats and Reason workflows at 1280/320 px, including saved scoring and drafts. Four-width answer-format checks reported no unsafe nodes, external requests or errors. Existing potato-osmometer suite also passed all four widths, fault/gradient reasoning, local storage and offline use.
- `check-single-file-browser.cjs`: **20 HTTP + 20 file-offline checks**, including unchanged prepared frog/cockroach rendering, exit controls and Universe paths. Final `build-single-file.py --check` passed at **44,668,040 bytes**, SHA256 **b22564f3428706ada151d1ea15c3ab9cd4b04cc3364892b63714791ab1c6d350**. None of this validates real webcam tracking or physical laboratory skill.

The ledger reconciles Biology potato PR #45 and Physics lamina PR #40 with their already-verified production evidence. This microscopy checkpoint is deliberately local until its own release conversation confirms CI, deployment and live parity.
