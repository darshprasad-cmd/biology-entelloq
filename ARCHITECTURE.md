# Biology Entelloq architecture

## System overview
Biology Entelloq is both an authoring repository and the directly published GitHub Pages site. Python scripts assemble modular source into self-contained HTML experiences; the generated root files are committed and deployed as-is.

```text
src/ authoring modules
  |-- page builders/injectors ------> root pillar HTML
  |-- lab/assemble.py --------------> lab.html
  `-- universe/assemble.py --------> universe.html
                                        |
                                        v
                             GitHub Actions checks
                                        |
                                        v
                                  GitHub Pages
```

## Published application
- `index.html`: public launch page.
- `app.html`: application shell and section router.
- `learn.html`, `lessons.html`, `reason.html`, `labs.html`, `solve.html`, `explore.html`, `me.html`, `about.html`: standalone pillar experiences.
- `lab.html`: assembled Dissection Lab.
- `universe.html`: assembled continuous-scale Biology Universe.
- `404.html`, `CNAME`, and `.nojekyll`: GitHub Pages support.
- Social and favicon images are the only intentionally external binary assets; most runtime dependencies are inlined.

## Shared page sources and builders
- `src/_template.html`: shared page shell.
- `src/_atmo.js`: Living Field shader used across the product.
- `src/_auth.js`: authentication integration inserted into pages.
- `src/_switcher.html`: cross-product Entelloq switcher.
- `src/_lessons.*`, `_reason.*`, and `_labs*`: pillar engines, styles, and content registries.
- `src/build_page.py` and `src/build_labs.py`: compose individual products.
- `src/inject_*.py`: inject shared atmosphere, auth, embedding, and switcher behavior.
- `src/build_site.py`: maps human-readable source product names to web slugs, rewrites links/embed guards, and writes the deployable site.
- `src/build_repo.py`: higher-level publishing utility that copies authoring sources and rebuilds repository furniture. It is intended for the original authoring workspace, not ordinary in-place edits.

## Immersive systems
### Dissection Lab
`src/lab/assemble.py` concatenates the lab modules. Major responsibilities include:

- specimen/anatomy definitions;
- cutting, dissection, constraints, and soft-body behavior;
- instruments, hands/hand visualization, and optional XR;
- environment, surface, lighting/post-processing, sound, narration, and tutoring;
- physiology, pathology, histology, imaging, and experiment content;
- offline Three.js/OrbitControls support under `src/lab/vendor/`.

### Biology Universe
`src/universe/assemble.py` combines the scale-journey runtime:

- `core.js` and `kit.js`: shared runtime utilities;
- `data.js`: scale/content data;
- `main.js` and `ui.js`: orchestration and interface;
- `stage_*.js`: cosmic, body, cellular, and molecular stages;
- `_textures.js`: generated/inlined visual data.

These modules are intentionally concatenation-friendly rather than import-based.

## Navigation and data flow
The app shell embeds standalone pages and intercepts internal Biology Entelloq links so navigation remains inside the shell. `build_site.py` rewrites filenames to production slugs and updates the embed guard. Those two mappings must evolve together.

Most behavior is client-side. Progress and preferences should remain local and quiet, consistent with the no-points/no-streaks philosophy. Webcam hand tracking is optional and must degrade gracefully.

## Deployment and safeguards
`.github/workflows/deploy.yml` publishes the repository root on pushes to `main`. Its pre-deploy checks protect against missing domain files, invisible reveal content, and placeholder language. Because root HTML is already built, the workflow intentionally has no build step.

## Main risks
- Editing generated root HTML without updating source creates irreversible drift.
- Shared injection/shader changes can regress every page.
- Concatenated modules can collide at top-level names.
- Link-slug and iframe-guard mismatches can break in-shell navigation.
- Removing inlined/vendor assets can break the offline guarantee.
- Large canvas/WebGL experiences require careful resource cleanup and reduced-motion handling.
