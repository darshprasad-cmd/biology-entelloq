# Entelloq shared learning tools

These three panels belong inside the existing Physics and Biology applications. They add review scheduling to Practice, an experiment notebook to Research/Lab, and concept retrieval to Tutor/Learn. They do not replace the host shell or change existing learning records.

## Entry and embedding contract

Copy every file listed in `asset-manifest.json`, preserving relative paths. Do not ship `node_modules`, tests, or source maps. The main and worker scripts are self-contained classic IIFE bundles with no bare imports.

```html
<iframe title="Physics review" src="assets/learning-tools/learning/index.html?subject=physics&panel=review&theme=light"></iframe>
```

- `subject`: `physics` or `biology`.
- `panel`: `review`, `notebook`, or `search`; the internal navigation lets learners switch tools.
- `theme`: `light` or `dark`. Defaults are blue Physics and green Biology.
- For a portable HTML app, rewrite the entry stylesheet and `main.js` to Blob URLs and inject `window.ENTELLOQ_LEARNING_ASSETS` **before** `main.js` runs. Supply `{ worker, mjs, wasm }` as absolute Blob/HTTP URLs for `semantic-worker.js`, `runtime/ort-wasm-simd-threaded.jsep.mjs`, and the adjacent `.wasm`. Keep those Blob URLs alive until the frame is removed. Runtime assets are fetched only when semantic search is enabled.
- To avoid decoding portable runtime assets when opening Review, inject `window.ENTELLOQ_LEARNING_PREPARE_ASSETS = async (signal) => ({ worker, mjs, wasm })` instead. It runs only after Enable. The optional AbortSignal is aborted on Cancel, tab switch or destroy; cancelled/stale results never start a worker. Direct mounts accept the same `prepareAssets` callback. The host owns revocation of Blob URLs it creates.
- Use a same-origin frame with a stable site origin if persistence is expected. A sandbox with an opaque origin may block local storage or workers; the UI falls back to session/export when storage is unavailable. `file://` is not a supported browser test environment.

Live parent theme updates are accepted only from the actual parent window:

```js
frame.contentWindow.postMessage({
  type: 'entelloq-learning:theme',
  theme: 'dark',
  tokens: { accent: '#88d8ba', surface: '#192536', background: '#111925',
    text: '#eef3fc', muted: '#b4c2d7', border: '#3a4a60' }
}, location.origin);
```

The equivalent panel message is `{ type: 'entelloq-learning:panel', panel: 'notebook' }`. No note contents, review histories or queries are sent to the host by these messages.

For direct DOM mounting, include `styles.css` and `main.js` without a `data-learning-entry` element, then:

```js
const app = EntelloqLearning.mount(container, {
  subject: 'biology', panel: 'search', theme: 'light',
  assets: { worker: '/.../semantic-worker.js', mjs: '/.../runtime/ort-wasm-simd-threaded.jsep.mjs', wasm: '/.../runtime/ort-wasm-simd-threaded.jsep.wasm' },
  onOpenLesson: ({ subject, id, title, query }) => { /* host-owned lesson navigation */ }
});
app.setTheme('dark', { accent: '#88d8ba' });
app.select('review');
// Before removing or remounting the host view:
app.destroy();
```

`onOpenLesson` is optional. An “Explore this concept” action is rendered only when a host provides a real destination callback; no invented host deep links are used. Iframe entries display the complete short explanation and its textbook source.

## Behaviour and boundaries

### Review — ts-fsrs 5.4.2 (MIT)

Eight Physics and eight Biology prompts ask for retrieval before revealing an explanation. A learner explicitly chooses Again/Hard/Good/Easy. This is the only action that schedules a review. The real FSRS algorithm uses 90% target retention, its packaged default parameters and disabled scheduling fuzz for deterministic replay. It is not calibrated to an individual student and does not establish mastery.

History lives at `entelloq.next.review.v1.<subject>` as versioned retrieval events. Dates and subjects are validated on import, histories merge by event ID, and invalid imports do not mutate an existing session. Clock times are absolute ISO timestamps, displayed in the learner’s locale. Keep the device clock accurate. Existing unreadable data is preserved; the session offers export instead of overwriting it. Concurrent review sessions are not a multi-device history service; export before switching browsers/devices.

### Notebook — Yjs 13.6.33 (MIT)

Notebook names are lowercase letters, numbers and hyphens. Text lives in a real `Y.Text` with incremental text edits, local undo/redo and Yjs binary state exports. State lives at `entelloq.next.notebook.v1.<subject>.<notebook-name>`. Imports validate the combined state in a disposable document before changing the live document, are idempotent, and merge concurrent edits.

BroadcastChannel sync is only between tabs on the same site, device and browser profile. There is **no online room, identity service, teacher invitation, internet relay or end-to-end encryption**. Cross-device exchange is explicitly user-mediated: export a JSON file, send it through the user’s chosen channel, then import it using the same subject/name. Exported Yjs updates can include editing history. This is stated beside the sharing controls. Notes are plain text and never interpreted as HTML. The panel caps visible text at 50,000 characters and import files at 2.8 MB.

### Concept search — Transformers.js 4.3.1 (Apache-2.0)

Keyword search is available immediately over the eight curated explanations for the selected subject. Semantic search is opt-in. A classic dedicated worker downloads the pinned q8 `Xenova/all-MiniLM-L6-v2` model, revision `751bff37182d3f1213fa05d7196b954e230abad9`, computes normalized mean-pooled embeddings, and ranks by cosine similarity. WASM runs on one CPU thread. No microphone, model API key, query upload or remote inference is used. Hugging Face/CDN still receives ordinary model-download requests and associated network metadata.

The ONNX runtime is local (about 28.4 MB WASM plus 47 KB module); model data downloads are about 23 MB. Completed files may be cached by the browser. Initial setup needs internet; cache availability/eviction is browser-controlled. Cancellation terminates the worker, stops pending worker work and releases its memory. Failures retain keyword search. The model is a general-purpose retrieval model; similarity is not factual confidence, grading, diagnostic advice or a guarantee of relevance. Search does not cover the full host lesson library until a separate corpus integration is implemented.

## Build, tests and evidence

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
npm run test:browser
$env:RUN_SEMANTIC = '1'
npm run test:browser
```

Browser tests use Playwright from `CODEX_NODE_MODULES` or the Codex bundled runtime path. They start an ephemeral loopback HTTP server, verify review scheduling/reload, Yjs tab sync and exports, subject isolation, safe literal notes, no model download before opt-in, cancellation, parent theme messages, mobile/tablet overflow and keyboard focus. `RUN_SEMANTIC=1` additionally requires actual model inference and checks a paraphrased Physics question. Evidence is written to `qa/browser-checks.json`; screenshot paths are local QA artefacts (ignored by Git).

The build writes SHA-256 hashes, asset sizes, pinned model revision, and exact bundled third-party notices. Dependencies are locked in `package-lock.json`. These module checks are not host integration, deployment or learning-outcome validation; those remain the host release owner’s responsibility.

## Sources and licences

- [FSRS usage](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md)
- [Yjs update semantics](https://docs.yjs.dev/api/document-updates) and [Y.Text](https://docs.yjs.dev/api/shared-types/y.text)
- [Transformers.js pipeline options](https://huggingface.co/docs/transformers.js/pipelines)
- [MiniLM model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2), Apache-2.0 model licence
- [OpenStax University Physics](https://openstax.org/details/books/university-physics-volume-1) and [Biology 2e](https://openstax.org/details/books/biology-2e), references for original short explanations

See `THIRD-PARTY-NOTICES.md` for full licence texts bundled with the exact browser dependencies. No OpenStax text or images are copied into the package.
