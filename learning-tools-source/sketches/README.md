# Scientific sketch for existing Entelloq applications

An actual Excalidraw 0.18.1 editor with original Physics and Biology starters, subject-specific browser saving, editable scene exchange and real engine PNG/SVG exports. It adds freeform visual explanations beside the existing numerical and learning tools. MathLive and JSXGraph cannot provide this freehand diagram editor.

## Host contract

- Entry: `index.html?subject=physics|biology&theme=light|dark`. Unknown subjects use Physics. An extra `panel` parameter is harmless.
- Root marker: `#sketch-app`; the loaded engine renders `.excalidraw canvas.interactive`.
- Parent themes: accepts `entelloq:theme`, `entelloq-learning:theme`, or `entelloq-sketch:theme`, with `theme` and optional `tokens` (`accent`, `surface`, `text`, `muted`, `border`, `background`). Only a message from this frame's parent with the same origin is accepted.
- Ready: posts `{type:'entelloq-sketch:ready',subject}` to the same-origin parent after the wrapper mounts. Engine readiness is the enabled **Export scene** button plus the canvas.
- **Before removing the iframe**, call `frame.contentWindow.EntelloqSketch?.destroy()`. It synchronously flushes pending valid edits, then unmounts React and releases owned listeners, timers and download object URLs. `flush()` is also available without unmounting. Full page departure flushes via `pagehide`/`beforeunload`; bfcache is preserved.
- **Focus canvas** expands only within this document or hosting iframe. It retains the mounted editor and saved scene, and teardown restores the document's prior overflow. Parent Back handlers must ignore Escape when `event.defaultPrevented` is true or `.sketch-workspace.is-focused` is present. Focus mode handles a canvas menu first, allows text/shape/popup editing to finish, and consumes idle Escape before restoring focus to the view button.
- Copy only the five `asset-manifest.json` assets for the runtime. CSS and classic IIFE JS contain all enabled local font data. No ESM loader, dynamic script, remote CDN, font URL rewrite, worker or companion service is needed. `index.html` loads the classic script at the end of the body for the Biology portable packager.
- Runtime is approximately 2.09 MB before transport compression. It should be loaded only when the user opens the sketch tool.

## Student behavior and boundaries

Physics starts with an original qualitative force diagram: no vertical acceleration, `N = mg`, and `F applied − f = ma`; arrow lengths are explicitly not a numeric force scale. Biology offers an animal-cell schematic and a simplified enzyme-binding/catalysis pathway. These drawings do not run the existing simulation engines or certify an answer.

Every subject keeps one browser copy under `entelloq:scientific-sketch:v1:<subject>`. It is separate from the Yjs named notebook and is not cloud classroom collaboration. Another tab's write pauses autosave, preserving this tab's draft; an explicit **Save this tab** confirmation can replace the stored copy. The code re-reads the current stored value before writing to also detect a missed or delayed storage event. Storage failure keeps the live editor usable and asks the student to export.

Replacing/importing a scene requires confirmation when a drawing exists. **Restore previous** keeps the immediately replaced drawing in memory during this visit, including an oversized draft that could not be saved. Cancelled or invalid imports leave the current scene unchanged. Native file drops use the same bounded importer. Clipboard scene insertion is disabled; users can type text directly and use the validated file importer.

Reloadable scenes are limited to 2 MB, 1,000 elements, 30,000 stroke points, bounded coordinates, text and depth. Shapes, lines, arrows, freehand, text and native frames are supported. Image attachments, web embeds and links are excluded. Every autosave and explicit overwrite passes the same validation used by reload/import. Unsupported edits pause saving with a persistent status; the previous stored scene is retained. Raw scene export remains possible for recovery in upstream Excalidraw even if a draft exceeds the module's import limits.

PNG exports use Excalidraw's `exportToBlob`, capped at 2,048 pixels on the long side. SVG exports use `exportToSvg` plus embedded local full-font CSS. They use a light canvas for portable legibility. Unsupported glyphs use system fonts, which may vary across devices and are not embedded. No third-party data or scientific artwork is bundled.

## Reproduce and verify

```powershell
npm ci --ignore-scripts
npm run build
npm test
node tests/browser.cjs
node tests/quality-browser.cjs
```

The browser harness uses the bundled Playwright runtime, or `CODEX_NODE_MODULES`. It draws a real rectangle through native toolbar and pointer events, verifies reload/export/import identity, cancelled replacement and recovery, engine PNG/SVG output, a separate Biology scene, mobile/dark layout, and zero external requests/page errors. It closes its browser and ephemeral HTTP server. Evidence is in `qa/`.

The source, exact npm lock, generated source/asset manifests, local fonts and redistribution notices are retained. `build-manifest.json` records actual bundled packages and font hashes. `asset-manifest.json` records runtime bytes, SHA-256 and MIME types.

The quality harness adds real desktop/tablet/mobile/320px layouts, 44px wrapper targets, reduced motion, keyboard focus/return, menu and text-edit Escape priority, parent theme messages, conflict visibility, and teardown inside a same-origin iframe fixture. Both harnesses accept `PLAYWRIGHT_CHANNEL=chrome` when using an installed Chrome. These isolated module checks are separate from host release and deployment checks. See `qa/quality-report.md` for the inspected improvements and evidence.

Use a real local `npm ci --ignore-scripts` installation for builds. A cross-worktree `node_modules` junction makes esbuild resolve different physical paths and bypasses the pinned font adapter; the zero-external-request browser check catches that invalid build.

## Upstream choices

Pinned npm package: [@excalidraw/excalidraw 0.18.1](https://www.npmjs.com/package/@excalidraw/excalidraw), verified on 24 October 2026. [Official integration documentation](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration) and [tagged source](https://github.com/excalidraw/excalidraw/tree/v0.18.1). Excalidraw and React are MIT. Individual dependency and font terms are retained in `THIRD-PARTY-NOTICES.md` and `licenses/`.

The build uses Excalidraw's published unminified package source and esbuild to produce a classic browser bundle. A version-guarded adapter embeds local font URLs as data, omits the unused 12.7 MB Xiaolai handwriting fallback and legacy font families, and excludes optional Mermaid conversion, non-English UI locales and glyph-subsetting worker/WASM. The actual editor, geometry, undo, rendering and import/export engine are upstream code. Four drawing font families (Excalifont, Nunito, Comic Shanns, Lilita) and Assistant UI fonts remain. Excalifont and SIL fonts preserve their upstream notices; Comic Shanns includes its MIT notice. Fonts are unmodified bytes from the pinned package.

Optional excluded modules throw if accidentally reached; this is not a substitute renderer. AI, cloud collaboration, third-party libraries, web embeds, image uploads and the extra-tools menu are disabled in this local product. Existing native drawing/keyboard/zoom/undo controls remain. Upgrade the pin only after reviewing the guarded adapter and repeating source plus portable host checks.

`audit-install.json` is a dependency-install snapshot, not a claim that every installed optional feature is shipped. The remaining npm advisory chain is in the excluded Mermaid parser and its nested nanoid; `build-manifest.json` proves these inputs are absent from the browser bundle. The editor's actual nanoid dependency is pinned to patched 3.3.20, with lodash-es and KaTeX transitive overrides also pinned. No protection or security scanner was bypassed.
