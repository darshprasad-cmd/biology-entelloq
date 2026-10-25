# Biology quality pass — 26 October 2026

| Before | After | Why |
| --- | --- | --- |
| Enzyme parameters offered sliders only. | Paired precise number fields, visible ranges/step sizes/units, accessible labels and error descriptions. | Exact experiments are easier to reproduce by keyboard or touch. |
| Numeric drafts had no independent feedback. | Invalid or off-step drafts remain visible and immediately disable the run; last valid parameters remain unchanged. | The request cannot silently use a different value from the learner's draft. |
| Parameters could change while a request was connecting. | Each run captures its parameters and disables edits until completion, cancellation or failure. | The plotted record corresponds to the selected experiment. |
| Microscopy controls appeared active before the renderer existed. | Controls start disabled with a clear opening instruction, loading button text and retry feedback; only controls relevant to the loaded view enable. | Every enabled control now has a useful effect. |
| Switching a panel did not establish keyboard focus and network errors exposed raw browser wording. | Focus moves to the workspace heading; unavailable companion and renderer errors explain the next action. | Keyboard orientation and recovery are clearer. |
| Precise controls needed room on smaller screens. | Two parameter columns on mobile, a wider desktop sidebar, 44 px controls, tabular values and reduced-motion-safe press feedback. | Preserves the teal/emerald identity while making the controls usable. |

Implementation: `src/main.js`, `src/style.css`, rebuilt `dist/main.js`, and documentation. No model/service, sampling, rate, units, dataset, persistence-key, volume-engine or permission-boundary changes. Exact lockfile `npm ci --ignore-scripts` was used before the final build; `dist/THIRD-PARTY.txt`, `dist/VTK-Copyright.txt` and `dist/volume.js` match the prior tracked content. A dependency junction was discarded after it made esbuild's license inventory incomplete; that incomplete output is not part of this handoff.

Verification completed:

- `npm run build` passed with pinned dependencies.
- `node tests/quality.mjs`: 11 passing browser groups: sequential decimal typing and caret correction, exact input and range/step feedback, invalid drafts before blur, persistence, pending/cancel/recovery, lazy loading, renderer failure/retry, real vtk rendering, relevant-control gating, keyboard slice navigation, themes, reduced motion and teardown.
- `CHECK_BROWSER=chrome npm run test:browser`: 23 passing groups using the actual Tellurium companion and vtk renderer, including computed curves, conservation, CSV/provenance exports, view persistence and independent cross-tab records. The runner now uses an explicit Playwright context, required for its existing peer-tab checks; its default CI browser behavior is preserved.
- Existing native `tests/test_science.py`: 5 tests passed, including independent ODE reference, null cases and units; `tests/test_service.py`: 4 tests passed, including actual computation, origins/tokens and private-path rejection. The unchanged pinned Python environment from `entelloq-next-biology` was used. The temporary companion was stopped afterwards.
- Desktop 1280 px, tablet 820 px, mobile 390 px fit without horizontal overflow. Light/dark screenshots inspected, including microscopy, focus indicators and precise controls. No page errors; `git diff --check` passed.

Screenshots and focused JSON are in `quality/`; full browser and native scientific evidence remains in `qa/`. Renderer checks use Chrome SwiftShader, not physical GPU or touch performance. The focused suite intercepts companion error/pending states and does not claim those as native computation; the separate full suite exercises the real companion. Production shell, portable packaging, CI and deployment verification remain host-release work.
