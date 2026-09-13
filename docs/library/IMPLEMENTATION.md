# Learn and Lab expansion

The existing static application is extended in place. No framework or runtime
dependency was added. The original Learn experience catalog, cell model,
microscope, nine Lessons, reasoning workflows and immersive dissection code remain.

## Architecture

| Source | Responsibility |
| --- | --- |
| `src/library/topics.js` | Canonical biology content, six modes, prerequisites, aliases, assessments and sources |
| `src/library/learn.js`, `visuals.js`, `learn.css` | Search, curriculum filters, nested routes, interactive diagrams and progressive depth |
| `src/library/labs.js` | Extended existing first-registration-wins lab registry and searchable catalog |
| `src/library/lab-metadata.js` | Learning questions, modes, filters, theory links and wrappers for the five existing dissections |
| `src/library/experiments.js` | Eight new experiments and pure inspectable scientific models |
| `src/_lab_bench.js` | Four maintained original benches with observations, controls and snapshots |
| `src/library/investigations.js` | Two fictional scenarios requiring evidence before explanation |
| `src/library/notebook.js` | Local hypotheses, variables, method, observations, trial data, conclusions, limitations, graphs and exports |
| `src/library/context.js` | On-device learning guide and provider-neutral context events |
| `src/library/backdrop.js` | Launch photograph shared through app/section navigation, motion preference and light theme |

`scripts/build-library.py` injects bounded source slots into Learn, Labs and the
app. `scripts/build-background.py` replaces only the atmosphere script in the
app and eight section pages. Neither build invokes the older Downloads-based
whole-site assembly. Both are idempotent and have read-only drift checks.

The September 14 background request explicitly supersedes the prior freeze on
the app's atmosphere slot. All other original dissection/launcher boundaries
remain protected by their existing fixtures; the new atmosphere is checked
against its source. The landing page and 3D dissection artifact are unchanged.

## Experience and limits

The 18 requested priority Learn subjects have six distinct explanation modes.
Additional completed subtopics use the same schema. The remaining broad topic
map is explicit editorial metadata and is not advertised as finished content.
Curriculum tags describe suitable depth, not a claim of exhaustive board mapping.

All 18 requested priority labs are reachable: 13 experimental benches plus the
five existing dissections. Three additional existing benches and two new evidence
investigations bring the working catalog to 23. Unbuilt specialty labs are not
displayed as runnable cards.

Each notebook saves locally and retains at most 80 trials. There is no cloud
sync. If storage fails, students can continue and export within the session.
Each trial captures current model conditions and measurements; reopening a bench
restores its notebook, while the simulation starts with its normal initial state.
Model outputs are student-generated simulation data, not empirical biological
measurements. Graphs label selected axes, distinguish measured values from
observations, and support line, scatter and bar representations.

The guide uses the active concept, subtopic, mode, hypothesis and recent trials.
It teaches fair comparisons locally; it is not represented as a connected LLM.
`bioq:context` and `bioq:ask` are integration events for a future approved provider.
No student record is transmitted to a remote service.

The five theatre wrappers select the existing specimen and expose observations
to the notebook. They preserve the original gesture/manual interaction system.
Physical camera tracking requires device testing; browser smoke tests do not
constitute camera validation.

## Scientific assumptions

Each new quantitative experiment displays its assumptions and source link.
Osmosis conserves impermeant cellular solute in an infinite external bath;
wall stiffness and lysis thresholds are illustrative. Photosynthesis includes
saturating responses and respiration, so net oxygen may be negative in darkness.
Respiration distinguishes oxygen consumption, yeast-like fermentation and
lactate-forming muscle-like cells, using an illustrative 30 versus 2 ATP yield.
Cardiac output uses heart rate × stroke volume with explicit unit conversion;
vessel resistance uses an idealized fourth-power radius/diameter relation and
does not predict clinical physiology. Gas exchange separates diffusion from
ventilation supply. Genetics assumes the stated inheritance model; independent
assortment in dihybrid crosses requires unlinked loci. The standard genetic code
is applied to a short fictional coding strand without introns or folding claims.

The original enzyme model has a simplified irreversible-denaturation threshold,
qualitative pH/temperature effects and idealized inhibition. The gel model uses
illustrative size-dependent mobility with time-integrated electric field; it is
not a laboratory protocol or an empirical agarose calibration. Population models
use declared simplified dynamics and stochastic inheritance where indicated.

The two investigation datasets are fictional and do not diagnose real plants
or environments. The greenhouse scenario combines older-leaf symptoms with
controlled evidence rather than treating leaf colour as diagnostic. The pond
scenario distinguishes nutrient enrichment, biomass, nighttime respiration and
oxygen depletion. Mechanism references: [University of Minnesota Extension](https://blog-crop-news.extension.umn.edu/2017/05/4-key-nutrient-deficiencies-to-scout.html),
[US EPA nutrient pollution](https://www.epa.gov/nutrientpollution/basic-information-nutrient-pollution),
[US EPA dissolved oxygen](https://www.epa.gov/caddis/dissolved-oxygen).

## Verification commands

```powershell
python scripts/build-library.py --check
python scripts/build-background.py --check
node scripts/check-learning.cjs
node --test tests/library-models.test.cjs tests/library-notebook.test.cjs
python -m http.server 3013 --bind 127.0.0.1
```

For browser verification, set `BIOLOGY_PLAYWRIGHT_MODULES` to an installed
Playwright node_modules directory and `BIOLOGY_PREVIEW_URL` to the served root:

```powershell
node tests/library-learn-browser.cjs
node scripts/check-lab-experiments-browser.cjs
node scripts/check-library-workflow-browser.cjs
```

The tests cover model invariants, browser interactions, structured content,
source build drift, responsive layouts, denied storage, history, observation
exports and preservation of the existing application. They do not constitute
independent expert review of every content sentence or physical camera testing.
