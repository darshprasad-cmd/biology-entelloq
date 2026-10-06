# Biology Entelloq

**One place to experience, practise, reason and explore all of life.**
The biological sibling of [Physics Entelloq](https://physics.entelloq.com).

Live at **[biology.entelloq.com](https://biology.entelloq.com)**

## One HTML application

The complete published product is now **one portable `index.html`**: the landing
page, workspace, eight learning sections, Dissection Lab and Biology Universe.
Navigation stays inside this file. Its scripts, styles, preview images, Three.js,
and prepared frog/cockroach models are embedded; no companion folder is needed.
The workspace starts before the large specimen payloads finish downloading.
Models remain inside the same file and are prepared when a specimen is opened.

```bash
python scripts/build-single-file.py
```

Open `dist/index.html`, or copy and rename that file anywhere. Current Chrome,
Edge, Firefox and Safari support the browser decompression used by the package.
The existing pages and modules remain editable source inputs, with separate
document scopes inside the bundle so their styles and simulations cannot collide.
Run the relevant source builder first after editing a generated source slot, then
rebuild the single-file application.

GitHub Pages publishes only `dist/`. Its `404.html` is a small compatibility
redirect for old links such as `/app.html#lab` or `/lessons.html#diffusion`;
it contains no additional application. `CNAME` and `.nojekyll` are hosting metadata.
The application itself can be shared using **only `dist/index.html`**.

Local lessons, experiments, notebooks, specimen models and Universe work without
network access. Live AI, Google sign-in, optional hand-tracking model downloads,
and web fonts still use their existing online services. Fonts have local system
fallbacks. Stored progress on the website keeps its existing storage keys and
origin; a separately opened file has its own browser storage and does not copy
website progress. Keep the same file path to retain that local-file storage.

Validate with:

```bash
node scripts/check-learning.cjs
python scripts/build-single-file.py --check
node scripts/check-single-file-browser.cjs
node scripts/check-opening-browser.cjs
node scripts/check-exam-answers-browser.cjs
node tests/check-ai-answer-formatting.cjs
```

The browser check uses Playwright (`BIOLOGY_PLAYWRIGHT_MODULES` can point to its
`node_modules` directory). It opens the real artifact with all network requests
blocked except its initial HTML, then tests a copy in an otherwise empty folder.

---

## What this is

Biology Entelloq is a learning product, not a course catalogue. Every part of it
is built on the same conviction: you do not understand biology by reading about
it, you understand it by *doing* something to it and watching what answers back.

So there is a dissection theatre you operate with your hands. There are lessons
where the simulation is the argument. There are benches where the reagents are
real variables. Nothing here is a video of someone else doing the experiment.

### The pillars

| | |
|---|---|
| **Learn** | Searchable biology concepts, six explanation modes, interactive models, prerequisites and quick checks |
| **Lessons** | Every concept through six lenses: story → prediction → picture → maths → frontier → the world |
| **Reason** | Think like a biologist — guided reasoning workouts, seven steps at a time |
| **Labs** | 23 investigations: simulations, microscopy, genetics, physiology, ecology and five dissections, with saved notebooks and trial graphs |
| **Solve** | Practice — NEET · CBSE · AP Biology · Olympiad |
| **Explore** | Atlases, the tree of life, diseases, discoveries |
| **Me** | Your journey, quietly tracked — no points, no streaks, no leaderboards |

### The two immersive worlds

- **The Dissection Lab** — a virtual dissection theatre with five specimens
  (frog, mammalian heart, earthworm, fish, cockroach). Scalpel, forceps, probe and
  pins, real tissue behaviour, and optional **webcam hand tracking**: your hands
  are the instruments, and a turn of the wrist changes tool.
- **Biology Universe** — a single continuous zoom from the observable universe
  down to a single atom, through thirteen scales of life without a cut.

---

## Design notes

**A shared Entelloq workspace.** The app follows Physics Entelloq's layout:
a 224px desktop sidebar, a 76px header, a featured experiment, three experiment
entries and a Biology Map. Space Grotesk headings, restrained cyan and green
accents, and solid reading surfaces continue through the eight pillars. Phones
use five bottom navigation tabs and an Explore sheet. The original Living Field
source remains available. The launch page’s DNA photograph now continues behind
the app and its eight reading sections as one shared backdrop, with the same
persistent motion preference and a reduced-motion fallback.

### Learn and Lab authoring

The expanded library lives in `src/library/`. Content is separate from rendering:
`topics.js` owns canonical concepts; `lab-metadata.js` owns laboratory discovery;
`experiments.js` owns the new quantitative models; `notebook.js` owns local
records, trial graphs, CSV export and observation capture. The original lessons,
catalog, cell, microscope and dissection theatre remain available.

Run `python scripts/build-library.py` and `python scripts/build-background.py`
after editing these sources. Both support `--check`, read only repository files,
and preserve existing page chrome. Root HTML is the deployable artifact.

Run `node scripts/check-learning.cjs` for the required static contracts. Browser
checks and the content/model assumptions are documented in
[`docs/library/IMPLEMENTATION.md`](docs/library/IMPLEMENTATION.md).

The learning guide uses the shared AI service for concept explanations and
experiment questions, retaining local contextual guidance while loading or
offline. Only the question, selected topic and authored reference material are
sent; saved hypotheses, trials and observations remain on-device. The
`bioq:context` and `bioq:ask` events remain available to local integrations.

**No gamification.** Deliberately. No XP, no badges, no streaks, no leaderboards.
Progress is shown because it is useful to you, never to make you come back.

**The learning workspace works offline.** The complete distributable embeds its
local dependencies, including Three.js and prepared specimen models. Copy just
`dist/index.html` to a USB stick and open it on a laptop without internet.

Live AI explanations need a connection. The app and standalone dissection lab
offer a contextual **Ask Entelloq AI** panel. The Learn/Lab learning guide,
Universe tutor questions and introductory questions on About use the same service, with clearly labeled
authored examples when it is unavailable. The deterministic dissection tutor
continues to ask, assess and grade locally; AI never changes its scorecard.

The public client is `src/ai/biology-ai.js`, inlined into the distributable.
It sends only the submitted question, bounded topic context and recent chat
turns to `https://groq-proxy.physicsedge.workers.dev/v1/chat/completions`.
Conversation stays in tab memory; profile, storage, camera frames and hidden
pathology findings are not included. The shared service holds `GROQ_API_KEY`
in its server environment and applies request limits. Never put provider keys
in this repository, HTML, browser storage or Pages build variables: Pages
publishes static files and does not keep an environment secret at runtime.

For AI changes, run `node --test tests/biology-ai.test.cjs` and the required
`node scripts/check-learning.cjs`. Sync changes in `src/universe/ui.js` with
`python scripts/build-universe.py`, and in `src/lab/main.js` with
`python scripts/build-dissection.py`. Both builders retain the original shell
fingerprints. A live response also depends on deployment of the shared proxy
and its server credential; browser regression checks can mock that boundary.

**Reduced motion is respected everywhere**, including by the shader, which drops
to a single still frame and repaints only when you change theme or section.

---

## Repository layout

```
dist/index.html         complete generated, portable application (deployment)
index.html              authored public landing page
app.html                authored app shell — sidebar, command palette, router
learn.html  …           authored pillar documents
lab.html                generated Dissection Lab input
universe.html           generated Biology Universe input
CNAME .nojekyll 404.html

src/
  single-file/         portable shell and embedded-document navigation bridge
  physics-layout/       shared app and pillar presentation layers
  _atmo.js              the Living Field shader, self-installing
  _lessons.js/.css      the six-lens lesson engine + every lesson
  _labs.js _lab_*.js    the bench registry and each working bench
  _reason.js/.css       the reasoning-workout engine
  _template.html        the shared product shell every pillar is built from
  build_page.py         compose a pillar page from the template
  inject_embed.py       make a page embeddable in the app shell
  inject_atmo.py        inline the Living Field into every page
  build_site.py         legacy import of the original standalone products
  lab/                  the Dissection Lab modules + assemble.py
  universe/             the Biology Universe modules + assemble.py
```

### Building

For learning-only changes, use the narrow workflow below. It preserves the
existing pages' shared shell and never rebuilds the dissection lab:

```bash
python scripts/build-learning.py        # sync only Lessons and Reason source slots
node scripts/check-learning.cjs         # parallel contracts, unit tests and syntax
```

Edit Lessons and Reason in `src/_lessons.js/.css` and `src/_reason.js/.css`;
their generated root HTML is committed for deployment. The learning builder has
a non-mutating `--check` mode and rejects missing or ambiguous source slots.
Home, Learn, Solve, Explore and Me are currently authored in their root HTML
files. Do not run a whole-site rebuild for changes to these pages.

For the Physics-matched presentation, edit `src/physics-layout/app.css` or
`src/physics-layout/pillars.css`, then sync only their generated style slots:

```bash
python scripts/sync-physics-shell.py     # app.html stylesheet only
python scripts/sync-physics-pillars.py   # eight pillar style/font blocks only
node scripts/check-learning.cjs         # includes both style drift checks
```

Both sync commands accept `--check` for verification without writes. They retain
existing lesson content, behavior, navigation and storage; neither targets
`lab.html`, `universe.html`, their sources, or the original shared template.
App markup and routing remain authored in `app.html`. The Biology Map reads the
existing versioned lesson journal and reports exploration, not mastery.

The launch page is authored directly in `index.html`. Its realistic artwork ships
as five optimized WebP files in `assets/`; generation prompts and bounded visual
verification are recorded in `docs/physics-layout/image-prompts.md` and
`docs/physics-layout/QA.md`. Background motion can be paused and follows reduced
motion preferences; the embedded enzyme preview remains independently controllable.

The original shared dependencies and app launcher are locked by
`tests/test_lab_unchanged.py`. The September 6 dissection-realism request explicitly
reopens only the source slots listed in `scripts/build-dissection.py`; all other
lab bytes remain protected by the original, unchanged fingerprint fixture.
Use `python scripts/build-dissection.py` for those slots and `--check` to verify
them. This preserves offline imports and shared chrome without a site rebuild.
Do not regenerate the fingerprint fixture to make a change pass.
See `docs/learning-polish/QA.md` for the bounded,
optional browser workflow, which does not enter or interact with the lab.

The full-product assemblers below are legacy authoring tools, not the deployment
workflow. Use `scripts/build-single-file.py` for the published application.

The products are **concatenated, not bundled** — each module is written with no
imports so the assembler only has to strip `export` keywords and check for
top-level name collisions.

```bash
python src/lab/assemble.py          # -> Dissection Lab, one HTML file
python src/universe/assemble.py     # -> Biology Universe, one HTML file
python src/inject_atmo.py --all     # inline the Living Field everywhere
python src/build_site.py            # -> the deployable site
```

---

## Tech

Vanilla JavaScript, three.js (vendored as a base64 data-URI import map so it
works from `file://`), MediaPipe HandLandmarker for the hand tracking, WebGL
shaders for the Living Field, and Canvas 2D for every simulation. No framework,
no build step for the pages themselves, no runtime dependencies.

---

Built by **Darsh Prasad**.
Part of the Entelloq family — Physics Entelloq · Quant Entelloq · Biology Entelloq.

### Shared Entelloq navigation

The founder details and cross-app launcher are authored in `src/_switcher.html`. After regenerating pages, run `node src/ecosystem/sync.cjs`, then `node scripts/check-network.cjs`. The launcher stays above mobile navigation and is available on all product pages.

### Flagship feature tutorial

The replayable guide lives in `assets/feature-tutorials.js` and `.css`. Launch it from the Entelloq menu → Feature tutorial, or the landing-page guide link. The guide navigates and highlights real controls; it never requests camera permission or resets the experiment. Run `node tests/check-feature-tutorials.cjs` when changing tutorial targets.
After rebuilding the dissection HTML, run `node src/tutorials/sync.cjs` to retain tutorial assets in both app and standalone lab pages.
