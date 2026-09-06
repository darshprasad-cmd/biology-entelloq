# Grounded dissection release

Scope: the user's September 6 instruction explicitly reopens the lab for realistic
placement, organ relationships and prominent hand controls. The surrounding app,
launcher, authentication, tracking engine and shared dependencies stay unchanged.

## Reproduce

```text
python scripts/build-dissection.py
node scripts/check-learning.cjs
node scripts/check-dissection-browser.cjs
node scripts/check-hand-layout-browser.cjs
```

The browser scripts reuse an existing Playwright installation. Set
`BIOLOGY_PLAYWRIGHT_MODULES` to its node_modules directory if necessary; no new
runtime dependency is added to the product. The real-render test expects the
preview at port 3002, overridable with `BIOLOGY_PREVIEW_URL`.

## Coverage and evidence

- Fast checks cover the normal app, 87 Node tests, 12 Python tests, generated
  source synchronization, complete lab-module parsing and diff hygiene.
- `browser.json` and five `*-bench.png` files exercise the real vendored Three.js
  scene: every specimen's exterior contacts the pad and its dissection surface
  faces upward. Resting tissue is stationary. Optional CDN postprocessing is
  deliberately unavailable to check offline fallback; software-GPU performance
  warnings are not a hardware performance benchmark.
- `hand-layout.json` and `hand-*.png` cover six viewport families and 36 shell
  states, including camera-off, denied permission text, live, coaching, preview,
  console and pointer/keyboard events. This harness uses the actual shell and
  shared CSS but no renderer or camera. Empty previews in these screenshots are
  test states, not evidence of successful camera tracking.
- Coordinate tests use real transformed Three.js meshes to check off-centre
  grips, unchanged placement on a small drag, grounded removal and world-up
  reflected layers for flat, fish and heart coordinate frames.
- Anatomy tests check specific corrected directions and selected connections.
  They do not certify the entire anatomy; see [ANATOMY.md](ANATOMY.md).

## Preservation and known limits

The original `dissection-original.json` remains unchanged. Every unapproved
source file still matches its original Git blob. The separate
`dissection-shell.sha256` is derived from the original lab artifact with only the
explicitly approved module slots replaced by sentinels; it protects all remaining
bytes even in shallow CI checkouts. No whole-site assembler runs.

Real webcam tracking, mobile GPU performance, browser-specific camera permissions,
complete dissection sequences and qualified educator review remain manual gates.
Fish and earthworm species mixtures are unresolved; no claim of full species
accuracy, scanned assets, realistic continuous lumens or clinical validation is
made. Default tissue is still; optional physiology intentionally animates it.
