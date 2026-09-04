# Contributing to Biology Entelloq

## Workflow
1. Read `AGENTS.md`, `ARCHITECTURE.md`, and `CRITICAL_AREAS.md`.
2. Use one focused branch: `feat/<topic>`, `fix/<topic>`, `refactor/<topic>`, `docs/<topic>`, or `chore/<topic>`.
3. Trace generated root HTML back to its source under `src/`; edit source first.
4. Explain scientific and interaction behavior before changing it.
5. Regenerate the affected artifacts, run checks, and inspect generated diffs for unexpected breadth.
6. Open a PR; do not push directly to `main`.

Use Conventional Commit subjects, for example `fix(dissection): stabilize fast hand movement`.

## Checks
```bash
python -m unittest discover -s tests
python src/lab/assemble.py
python src/universe/assemble.py
python src/inject_atmo.py --all
python src/build_site.py
python -m http.server 8000
```

Run only the relevant assemblers for a narrow change. `build_site.py` needs the named authoring products documented in `AGENTS.md`; report unavailable inputs honestly. There is no package-based lint or typecheck command.

## Pull requests and done
PRs must separate source edits from regenerated artifacts and include the problem, root cause or scientific intent, checks run, affected pages, screenshots for UI work, offline/accessibility/responsive review, unexpected side effects, and remaining risks.

Work is done when source and generated output agree, CI and relevant assemblers pass, affected pages work standalone and in the app shell, offline and reduced-motion promises remain intact, and high-risk changes have explicit review.
