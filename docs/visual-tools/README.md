# Sketches and authored explanations in Biology

The genuine Excalidraw sketchbook opens inside Solve, Reason and Labs (`#solve/learning-sketches`, `#reason/learning-sketches`, `#labs/learning-sketches`). Learn adds a Manim-authored enzyme explanation (`#learn/learning-animations`). Both inherit the Biology theme and preserve the existing section underneath.

Sketches have separate subject storage, original cell/enzyme starters, editable scene import/export and PNG/SVG export. Imports are bounded and validated; stale tabs retain an exportable draft instead of silently replacing saved work. Teardown synchronously saves pending edits. This is a drawing tool, not a numerical model or online collaboration room.

The original 22-second Manim film includes native controls, four captioned chapters, a transcript and still alternatives. Media loads only after Play or a chapter request; teardown aborts loading and releases temporary media URLs. Home pauses retained playback, including a pending Play request. The enzyme shapes and screen timing illustrate a generic mechanism, not molecular measurements or reaction rates. Editable rendering sources and licences accompany the media.

Every runtime asset is included in the portable application. Fonts are embedded locally; MP4 and VTT bytes use the existing deferred fetch bridge. No general browser bridge change is needed. Source manifests and notices are under `learning-tools-source/{sketches,animations}`.

This release also protects existing saved work: review ratings/imports use Web Locks to merge cross-tab history safely, and Biology experiment parameters and microscopy views use separate records with a read-only legacy fallback. If a safe review save is unavailable, the UI retains an exportable session and explains the limitation.

Run `node scripts/check-visual-tools-browser.cjs` and its `--portable` variant. The required CI also runs original site checks, 35 Python packaging/preservation contracts, 14 review/notebook tests and six scene-validation tests. Browser checks exercise actual drawing/export/reload, native MP4 playback and VTT parsing, host themes, mobile fit, keyboard return/focus, teardown and outer Home. Source and portable evidence are distinct from later public deployment evidence.

An independent upgrade review created old practical notes, a notebook and a review rating in the previous release, switched to this candidate on the same origin, imported a scene and immediately returned, and restored the original records byte-for-byte. Portable checks block all requests except the single application document. This does not establish learning outcomes, device GPU performance or a remote solver service.
