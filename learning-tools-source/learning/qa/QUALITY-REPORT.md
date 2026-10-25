# Shared learning quality pass

Verified 26 October 2026 in an isolated Chrome browser. Scope: the shared Review, Notebook and Concept search panels used by Physics and Biology.

| Before | After | Why |
| --- | --- | --- |
| Review explained recall in prose, then presented four equally dense buttons. Revealing moved focus directly to the first rating. | A visible recall/check sequence, separate rating names and meanings, explanation focus after reveal, and next-prompt focus after a saved attempt. | Learners can read the explanation before rating; keyboard users retain their place. Revealing still does not record an attempt. |
| The notebook name could be edited while the editor continued saving to the previous name, with no persistent active-name indicator. | An active-notebook badge, clear name-switch guidance, Enter to open, and invalid-name feedback that preserves the current notes. | The destination of edits stays visible and switching remains deliberate. |
| Notebook undo/redo looked active with no available history, and an empty notebook gave only placeholder headings. | Undo/redo follow the actual Yjs stacks. An explicit empty-only experiment outline is undoable, and a character counter reflects the editor limit. | Useful actions have understandable states; no existing notes are replaced or automatically seeded. |
| Search started with a blank result area and gave no submitted-query summary. | Subject-specific starting queries, an explanation count tied to the submitted query, a helpful no-match state, and clear reset behavior. Changed queries invalidate old pending responses. | Learners can begin immediately and understand which question produced the displayed explanations. |
| Three separate outlined navigation buttons and dense utility controls competed for attention. | A compact grouped navigation, clearer card hierarchy, restrained subject colours, readable status panels, and responsive rating/action layouts. | Physics stays blue and Biology stays green; controls retain keyboard focus visibility and 44px mobile touch targets. |

## Validation

- Exact locked local dependency installation, followed by a successful production build.
- All 14 core and review-concurrency tests passed: explicit rating, saved-history merge, stale ratings, unavailable locks, corrupt storage, quotas, Yjs merge/import/undo, subject isolation and keyword search.
- All 8 existing browser groups passed: real review scheduling/reload, Yjs tab sync and exports, literal note rendering, keyword-only network behaviour, semantic setup cancellation, parent theme updates, responsive layouts and lazy portable assets.
- All 8 additional quality groups passed in `quality/report.json`: keyboard focus, no scheduling on reveal, explicit outline/undo/redo/count, active notebook identity and invalid-name recovery, maximum-length notebook names, starters and empty results, mobile touch targets/reduced motion, and corrupt saved-record preservation.
- Screenshot inspection covered desktop 1280px, tablet 768px and mobile 390px; Physics and Biology; light and dark themes; revealed review, focused controls, empty notebooks, long notebook names, and search/no-match states. No horizontal overflow or browser exceptions were observed.
- Before images are in `quality-before/`; after images are in `quality/`.
- `git diff --check` passed.

The review scheduler, Web Locks implementation, Yjs storage and validation, catalogue, semantic-worker source, dependencies and lockfile are unchanged. A temporary dependency junction produced duplicate package paths during an early build; replacing it with `npm ci` restored `semantic-worker.js` and `THIRD-PARTY-NOTICES.md` exactly to the committed baseline. The manifest contains the newly built UI and CSS hashes.

This pass did not download a semantic model or rerun full model inference. The optional network activation and cancellation paths were tested; the fixed worker/model contract is unchanged. These are standalone module checks; host integration, protected CI, deployment and live verification belong to the release owner.

## Handoff

Runtime files changed: `main.js`, `styles.css`, `asset-manifest.json`. Source changes: `src/main.js`. Test support: `tests/browser.mjs` accepts an optional `PLAYWRIGHT_CHANNEL`; `tests/quality-browser.mjs` and the `test:quality` script run the new checks. `qa/browser-checks.json` records this run accurately with `inference.attempted: false`.

The module is ready to synchronize into both hosts using their existing source/build pipeline. No engine or storage migration is required.
