# Biology Entelloq agent instructions

## Scope and priorities
- Preserve the Living Field visual identity and the no-gamification product philosophy unless explicitly asked otherwise.
- Maintain offline operation for shipped experiences.
- Treat root HTML files as committed deployable artifacts and `src/` as their rebuildable authoring source.
- Make changes in the relevant source modules, then regenerate affected root artifacts. Do not hand-edit generated output without also updating its source.
- Avoid new runtime/network dependencies, especially in the immersive lab and universe.
- Never commit secrets or private credentials.
- Read `ARCHITECTURE.md` before changing assemblers, generated pages, routing, authentication injection, the lab, or the universe.

## Setup and build commands
No package installation is required. Use Python 3.

```bash
python src/lab/assemble.py
python src/universe/assemble.py
python src/inject_atmo.py --all
python src/build_site.py
```

`src/build_site.py` defaults to a sibling `site/` output and expects named source products in the user's Downloads directory. Pass an explicit output directory only after confirming it is safe. Never point it at a repository root without understanding its selective cleanup behavior.

Serve the built repository:
```bash
python -m http.server 8000
```

## Verification
There is no package-based lint/typecheck/test suite. Do not claim those checks ran.

Before completion:
- Run the relevant assembler(s) for changed sources.
- Run the site build when its required source products are available.
- Inspect generated diffs; generated HTML changes should match the source edit.
- Serve over HTTP and test the affected page, app-shell embedding, internal links, and browser console.
- Test narrow/mobile layout, keyboard use, and `prefers-reduced-motion` for visual changes.
- Preserve offline behavior where promised.
- Apply the same deploy sanity checks in `.github/workflows/deploy.yml`: required files/domain, reveal initialization, and no placeholder language.

## Fragile boundaries
- Root HTML is published directly by GitHub Pages.
- The app shell embeds pillar pages; link rewriting and embed guards must stay synchronized.
- Assemblers concatenate modules and guard against top-level name collisions. Avoid adding imports to concatenated modules.
- `src/_atmo.js` is shared across pages; changes have broad visual/performance impact.
- `src/lab/` and `src/universe/` are large interactive systems with vendored/offline dependencies.
- Do not remove `CNAME`, `.nojekyll`, or the ecosystem switcher.

## Completion
- Fix failures caused by the change.
- Report commands and manual checks performed, including unavailable build inputs.
- Summarize source files and regenerated artifacts separately.
