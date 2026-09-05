# Biology Entelloq

**One place to experience, practise, reason and explore all of life.**
The biological sibling of [Physics Entelloq](https://physics.entelloq.com).

Live at **[biology.entelloq.com](https://biology.entelloq.com)**

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
| **Learn** | Experience biology — dissection, cells, anatomy, physiology |
| **Lessons** | Every concept through six lenses: story → prediction → picture → maths → frontier → the world |
| **Reason** | Think like a biologist — guided reasoning workouts, seven steps at a time |
| **Labs** | Working benches: microscope, gel electrophoresis, enzyme kinetics, predator–prey |
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

**The Living Field.** Every page sits on a slow shader of living tissue — a
Worley cell field with real membranes, drifting capillaries, and a breath at
about seven cycles a minute. The cursor is a nutrient source: cells near it swell
and the vasculature grows toward it. It restains as you move between sections, so
the whole product feels like one continuous space rather than a stack of pages.
Physics Entelloq bends spacetime around your cursor; biology reaches for it.

**No gamification.** Deliberately. No XP, no badges, no streaks, no leaderboards.
Progress is shown because it is useful to you, never to make you come back.

**Everything works offline.** Each page is a single self-contained HTML file with
its dependencies inlined, including three.js. Open one off a USB stick on a
laptop with no internet and the dissection theatre still runs.

**Reduced motion is respected everywhere**, including by the shader, which drops
to a single still frame and repaints only when you change theme or section.

---

## Repository layout

```
index.html              public landing page
app.html                the app shell — sidebar, command palette, section router
learn.html  …           the pillar pages, each a standalone single-file app
lab.html                the Dissection Lab
universe.html           Biology Universe
CNAME .nojekyll 404.html

src/
  _atmo.js              the Living Field shader, self-installing
  _lessons.js/.css      the six-lens lesson engine + every lesson
  _labs.js _lab_*.js    the bench registry and each working bench
  _reason.js/.css       the reasoning-workout engine
  _template.html        the shared product shell every pillar is built from
  build_page.py         compose a pillar page from the template
  inject_embed.py       make a page embeddable in the app shell
  inject_atmo.py        inline the Living Field into every page
  build_site.py         turn the shipped products into this website
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

The original dissection files, shared dependencies and app launcher are locked
by `tests/test_lab_unchanged.py`. Do not regenerate its fingerprint fixture to
make a non-lab change pass. See `docs/learning-polish/QA.md` for the bounded,
optional browser workflow, which does not enter or interact with the lab.

The full-product assemblers below are separate tools, not part of that workflow.

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
