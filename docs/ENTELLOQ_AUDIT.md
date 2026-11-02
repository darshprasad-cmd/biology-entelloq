# Biology Entelloq product audit

Audit date: 2026-10-29. Baseline: `a8c303ca7d9f6a43598275708a4b7155664750c6`, current fetched main. Working branch: `codex/product-excellence-20261029`. Production deployment requires explicit user approval. Quant is outside scope.

This audit records source evidence and separately records browser evidence. It is not a claim of real-student, physical-device, camera or clinical validation.

## Repository and architecture

**Verified:** the production repository is a static HTML/JavaScript application, not the unrelated dirty Next.js scaffold at `C:\Users\darsh\biology-entelloq`. This checkout contains no AGENTS.md, ARCHITECTURE.md, CONTRIBUTING.md or CRITICAL_AREAS.md. README.md, docs/library/IMPLEMENTATION.md and docs/single-file/IMPLEMENTATION.md define the maintained build boundaries.

```text
index.html (landing) + app.html (shell/router/search)
  -> isolated iframe documents: learn, lessons, reason, labs, solve, explore, me, about
  -> immersive launcher: lab.html / universe.html
src/library, src/cbse, src/learning-tools -> narrow source-slot builders
src/lab -> guarded build-dissection.py -> lab.html
all authored/generated documents + local assets -> build-single-file.py -> dist/index.html
```

The distributable is one HTML file. `src/single-file/host.js` and `bridge.js` provide embedded-document resource and route adapters; the package defers large specimen payloads. The baseline build is 44,668,210 bytes. This is a transfer/memory risk, not measured evidence of poor device performance. There is no root package.json or framework migration requirement. Optional tool packages have their own pinned package files under `learning-tools-source`.

Auth is optional Google identity; the UI deliberately states that there is no server-backed progress synchronization. Notes, learning history and notebooks use existing localStorage keys. `src/ai/biology-ai.js` calls the shared public proxy with bounded question/context/history; the provider credential belongs to the remote service. No proxy, credential or production infrastructure changes are authorized by this local implementation.

## Feature and route inventory

| Surface | Existing capabilities | Routes / source |
| --- | --- | --- |
| Home | Featured/resume entry, Biology Map, section cards | `#home`; app.html |
| Learn | 109 canonical concepts in 13 categories, six lenses, authored sources, quick checks, depth investigations; 139 separate roadmap entries are not runnable finished lessons | `#learn`, `#learn/topic/<id>/<mode>`; src/library/topics.js, extended-core.js, extended-systems.js, learn.js |
| Lessons | Nine six-lens lessons: diffusion, enzyme, population, photosynthesis, respiration, replication, selection, actionpotential, cardiac | `#lessons/<id>`; src/_lessons.js |
| Reason | Concept reasoning plus altitude, resistance and glucose evidence cases | `#reason`, `#reason/<case>`, `#reason/learn/<id>/<mode>` |
| Labs | 23 working investigations, filters, guided/challenge/sandbox modes, trial notebooks | `#labs/<id>`; src/library/labs.js |
| Solve | Practice, timed and adaptive modes, authored exam feedback | `#solve`, `#solve/learn/<id>/<mode>` |
| Explore | Protein Atlas, body atlas, tree of life, disease library, evolution timeline | `#explore/<section>` |
| Me | Existing practice/history/topic map | `#me` |
| Immersive dissection | Frog, mammalian heart, fish, earthworm, cockroach; manual instruments, optional webcam hands; existing imaging, histology, pathology, tutor and physiology modules | `#lab`, lab.html, src/lab/* |
| Universe | Continuous scale exploration, selected molecular and anatomical structures | `#universe`; src/universe/* |
| CBSE workspace | Class 9–12 supporting resource maps, 44 standard and 15 accessible practical guides, potato osmosis and onion/cheek microscopy rehearsals | `#cbse:<year>/practicals/<id>`; src/cbse/* |
| Added tools | Kinetics, actual licensed microscopy volume, notebook, sketchbook, retrieval review, search, authored animation; local numerical companion is explicit | `#labs/learning-kinetics`, `#explore/learning-volume`, `#reason/learning-notebook`, `#solve/learning-review`, `#learn/learning-search` |
| About | Product information and optional AI explanation | `#about` |

All 23 lab IDs: microscope, osmosis, enzyme-kinetics, photosynthesis-rate, cellular-respiration, mitosis, mendelian-genetics, dna-protein, heart-physiology, heart-rate, gas-exchange, natural-selection, predator-prey, gel-electrophoresis, dna-extraction, pcr, plant-investigation, ecosystem-investigation, heart-dissection, frog-dissection, fish-dissection, earthworm-dissection, cockroach-dissection.

Legacy `.html`/hash destinations and existing keys must remain compatibility aliases. Counts should derive from registries: the current home advertises 73 concepts despite the verified canonical total of 109.

## Ranked Biology findings before major implementation

Impact is student reach/severity; risk is regression risk; effort is relative engineering scope. Ordering starts with navigation, discovery and workspaces as requested. Cross-product ranking is coordinated in the shared implementation report.

| Rank | Problem and source evidence | Impact | Risk | Effort | Improvement |
| --- | --- | --- | --- | --- | --- |
| 1 | Desktop exposes ten competing destinations; mobile `Lab` opens only dissection while ordinary Labs is absent from its five tabs (app.html navigation arrays). | High | Medium | Medium | Intent-based shared navigation, explicit Virtual Labs and preserved dissection access. |
| 2 | Shell and lab search require every raw query word to occur literally; natural questions fail; search is Biology-only (app.html matchCommands, src/library/labs.js paint). | High | Low | Medium | Shared deterministic ranked index, scientific aliases, stopwords, direct results and keyboard controls. |
| 3 | Scientific bench and notebook are vertically separated; notebook actions follow the entire model; saved trials do not restore configurations (src/library/labs.js renderLab; notebook.js). | High | Medium | Medium | Compact workspace actions and a capability-based configuration adapter with honest restore limits. |
| 4 | First visit opens a four-question study dialog before experimentation (src/cbse/entry.js initialization). It is skippable and registration is already optional. | High | Low | Small | Immediate guest featured experiment with contextual, optional preferences. |
| 5 | Notebook persists notes/trials but discards graph selection and lacks PDF; a caught persistence failure still returns true from persist(), though the visible status says unavailable (notebook.js). | High | Medium | Medium | Persist graph configuration, explicit local/session state, correct success signal, CSV and printable/PDF report. |
| 6 | Catalogue and source counts disagree; first home still says 73 concepts against 109 in the current registry (app.html buildHome; canonical content). | Medium | Low | Small | Derive discovery counts and connected resources from existing metadata. |
| 7 | Core Learn/Labs context bridge replaces shell route from a queued message without checking the active child's logical route (src/library/app-library.js). Separate unmerged-checkout regression tests expose stale-route restoration. Current-main browser reproduction is pending. | High | Medium | Small | Validate active sender and active logical route before updating resume state. |
| 8 | Models contain useful assumptions in individual benches but no common analytical/numerical/illustrative classification or consistent validation summary. | High | Low | Medium | Metadata registry linked to existing sources, units, limitations and established model tests. |
| 9 | Notebook graphs use hover titles; graph configuration and recorded evidence are disconnected from broader workspace discovery (notebook.js graph). | Medium | Low | Medium | Keyboard/touch-readable evidence and resumable notebook summaries; retain data table. |
| 10 | No classroom assignment/review implementation or permission backend is present; adding a cloud dashboard would invent unsupported persistence. | Medium | Medium | Medium | Feature-flagged local assignment/worksheet and import/export review workflow with explicit manual sharing and no fabricated cloud state. |

## Reuse and preservation strategy

Use the existing registry `LABS.register/get/all`, model handle `snapshot()/dispose()` and optional `capture()`, notebook `BioNotebook.mount/clean/csv`, route bridge, local save conflict handling and narrow builders. Add small adapters beside these sources; do not rewrite simulations or install a new rendering stack. Implement a shared serializable metadata/state contract suitable for web and an eventual iOS shell; browser-only APIs remain at the adapter boundary. Native iOS compilation and real-device camera tests require a suitable Apple environment and devices, which are not available in this Windows checkout.

`lab.html`, original shell fingerprints, prepared assets and webcam/dissection engines are protected. Keep `tests/fixtures/dissection-original.json` unchanged. `python -m unittest discover -s tests -p test_lab_unchanged.py` verifies those boundaries. Existing hands lifecycle tests cover model-load cancellation, late camera-permission success, restart and release; they do not certify real hardware tracking.

Other worktrees are evidence, not merge inputs: `codex/biology-polish-20261028` contains mobile search/questionnaire polish plus untracked user work. `codex/biology-curriculum-workspace-20261027` contains a different navigation/44-chapter expansion but diverged before merged microscopy. Do not replace current main wholesale with either branch.

## Security, reliability and scientific boundaries

- Preserve bounded local data sanitization, CSV formula escaping and stale-tab notebook protection. Do not silently migrate/delete older records.
- Never start webcam or paid AI automatically. Existing hands frames are processed locally and released by lifecycle controls; browser tests must assert no unsolicited permission requests.
- Existing synthetic process models and fictional investigations must remain labelled; real microscopy/protein assets retain provenance. Scientific validity is model-specific, not implied by passing UI tests.
- No school cloud submissions, identity-to-record linkage, public student publication or telemetry collection is supported by the present static architecture.
- Existing deployment runs on main push. Work stays on the dedicated branch and local staging until explicit production approval; do not merge as a proxy for approval.

## Baseline validation and reproducible commands

Run from the repository root:

```powershell
$env:BIOLOGY_PLAYWRIGHT_MODULES='C:\Users\darsh\biology-entelloq\node_modules'
python scripts/build-library.py --check
python scripts/sync-physics-shell.py --check
node scripts/check-learning.cjs
python scripts/build-single-file.py
python scripts/build-single-file.py --check
$env:BIOLOGY_SINGLE_OUTPUT='docs/product-excellence/before'
node scripts/check-single-file-browser.cjs
node scripts/check-opening-browser.cjs
node --test tests/library-models.test.cjs tests/library-notebook.test.cjs tests/hand-camera-lifecycle.test.cjs
python -m http.server 3013 --bind 127.0.0.1
```

Build/static/browser reports and actual desktop/mobile screenshots are collected under `docs/product-excellence/before`. Completion/results are recorded in those reports, not inferred here. Browser checks use Chromium with external services blocked; physical mobile hardware, VoiceOver, real students and webcam tracking remain untested. Student usability findings require actual participants and must not be substituted with automated interaction results.
