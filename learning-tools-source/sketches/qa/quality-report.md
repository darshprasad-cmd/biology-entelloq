# Scientific sketch quality pass

Completed 26 October 2026 in the existing Physics/Biology sketch module. No engine, dependency, storage-key, scene schema, scientific starter, or host architecture changes.

| Before | After | Why |
| --- | --- | --- |
| Mobile canvas stayed 680px tall; controls and navigation fell below the viewport. | Responsive canvas plus a keyboard-accessible Focus canvas / Exit focus view within the current frame. | Gives the drawing more of the available screen without changing or remounting it. |
| Fit drawing was hidden inside the engine menu. Fitted diagrams could overlap floating controls. | Persistent Fit drawing action reserves space around the engine toolbars. | Makes a lost or zoomed drawing recoverable and keeps titles clear of controls. |
| Starter replacement and backup actions had equal emphasis. Restore previous appeared disabled before any replacement. | Separated starter/copy groups; Export scene is the primary action; recovery appears when a previous scene exists. | Makes the safe backup path clearer and reduces unused controls. |
| Dark Biology accents had low visual distinction; selected tools retained the engine's purple palette. | Subject-specific blue/green selected states, stronger dark-theme accent text/focus rings, and at least 44px wrapper controls. | Aligns the editor with each subject and improves keyboard/touch legibility. |
| Save warnings were plain text among surrounding controls. | A persistent status band uses text and a border for warnings, including in focused view. | Conflicting or unavailable saving stays visible while drawing. |
| Opening the native menu crashed into the error boundary. The wrapper referenced two DefaultItems components absent from pinned Excalidraw 0.18.1. | Supported MainMenu.Item controls call the documented state API for grid and canvas-control toggles. | Restores a usable native menu and its help entry without replacing the engine. |

## Verification

- Exact lockfile dependency install and build; original package/font inventory and redistribution notices remain unchanged.
- Six scene-validation tests passed, covering remote content rejection, size/element bounds, malformed data, safe fonts and original scientific assumptions.
- Eleven existing real Chrome browser checks passed: actual drawing, autosave/reload, cancelled replacement, restore, validated import, actual PNG/SVG export, subject isolation, stale-tab protection, synchronous host-destroy flush, invalid import preservation, and no external requests/page errors.
- Six additional quality browser groups passed: desktop 1280×1000; tablet 768×1024; mobile 390×844; small 320×640; reduced motion; wrapper touch targets; keyboard focus entry/return; unchanged stored scene bytes; retained canvas identity; menu/text/tool Escape priority; conflict warning while focused; same-origin parent theme; iframe containment; Escape does not invoke a cooperative host Back handler; host teardown releases scroll locking. Console errors are also collected because a React boundary can catch a failure without a `pageerror` event.
- An independent reviewer reproduced the original menu crash against both the previous production module and the pre-fix candidate, then verified the rebuilt Biology mobile and Physics desktop menus, grid and canvas-control toggles, keyboard Enter/Escape, retained canvas, and zero caught console errors.
- Inspected `quality-physics-desktop.png`, `quality-biology-tablet.png`, `quality-biology-mobile.png`, `quality-physics-small.png`, `quality-biology-focus.png` and `quality-embedded-focus.png`. The last is explicitly a minimal host fixture, not a production screenshot.
- `scene.js`, `package.json`, `package-lock.json`, `font-css.json`, `editor.css`, `build-manifest.json` and third-party notices are unchanged.

## Integration contract and limits

The host must ignore Escape when already prevented or while `.sketch-workspace.is-focused` exists. A first Escape closes the focused editor's menu or finishes active editing; an idle Escape exits focus and returns keyboard focus to the view button. The iframe does not seize browser fullscreen or cover its parent application navigation.

This is an isolated module verification. Actual Physics/Biology host packaging, full application regression checks, CI and live deployment remain the release owner's checks. A scientific drawing remains an illustration; it does not calculate forces or biochemical rates. Browser saving and conflict/recovery limits remain unchanged.

During setup a cross-worktree node_modules junction caused the esbuild path guard to miss the local-font adapter. Offline network tests rejected that build. A real local exact-lockfile installation corrected it; the final browser tests contain no external font requests. Do not reproduce builds through that junction.
