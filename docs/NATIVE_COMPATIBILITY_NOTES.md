# Native compatibility boundary

The native app is owned by the separate “Prepare Entelloq app store launch” chat at `C:\Users\darsh\Documents\Codex\2026-10-29\entelloq-mobile`. This UX workstream does not create a second native shell. The versioned cross-chat handoff is `C:\Users\darsh\Documents\Codex\2026-10-29\ENTELLOQ-MOBILE-UX-HANDOFF.md`.

## Verified web-to-native risks

- Biology `src/single-file/host.js:localPath` filters out Capacitor's default `capacitor:` scheme. Adapt only trusted bundled resolution after reviewing `bridge.js`; record any build transformation and both original/adapted hashes. Never allow arbitrary schemes or bridge remote frames.
- Biology depends on gzip `DecompressionStream`, import maps, deferred embedded specimens and multiple same-origin document scopes. Test the complete generated artifact in WKWebView, not just a standalone widget. iOS 17+ is a conservative candidate minimum, not a tested promise.
- Physics contains continuous camera flows through `getUserMedia`; a photo-picker plugin cannot supply the stream used by the engine. Preserve video-only permission scope, meaningful status and alternate controls.
- The shared notebook's current `createNotebook(storage)` contract is synchronous and confirms set/read-back. Native Filesystem calls are asynchronous. A native mirror must report pending until persistence succeeds, preserve drafts on error, and reconcile on startup; do not pass unresolved Promises into this contract or show “saved” before durable completion.
- Web localStorage and native origin storage are different. Existing website records require explicit backup/import if migration is offered. No cloud sync is implemented by Capacitor Preferences or Filesystem.
- Current optional provider integrations, fonts and hand-tracking assets may still request the network. Inventory each request and document offline support per capability. Local packaging does not prove provider availability or eliminate analytics.
- **Student-privacy gate:** the baseline Physics Clarity integration could auto-initialize and pass identity/profile tags despite Microsoft's under-18 audience restriction. The source owner has now made its wrapper inert, independently re-inspected in the local source. Package that corrected source and test zero requests in the native bundle; source review alone does not certify packaged runtime behavior. See `STUDENT_ANALYTICS_PRIVACY_FINDING.md`.
- Native API requests may have `capacitor://localhost` origin. Audit service allowlists without treating CORS as authentication or disabling restrictions globally. Keep API keys outside browser/native bundles.
- Deep links must validate host, subject and route. Universal Links need real Team ID and domain association deployment; cold-launch and warm-app events are separate. Do not publish association files before the native owner confirms identities and release authorization.

## Required handoff evidence

Record exact subject commits/content hashes, dirty-state policy, compatibility transformation version, bundle size, resource/licence inventory and offline classification. Package the final reviewed generated Biology artifact and Physics runtime assets. Rebuild when source changes; integrity hashes only verify a local package snapshot and do not replace native signing.

For notebook interoperability preserve ID, subject, experiment, route, title, schema/model versions, config, measurements with units, graph data, observations and provenance. Identify adapters that can restore an actual experiment and label observation-only records accurately. CSV export should neutralize formula-like text; report export should create a usable file and retain scientific limitations. Native share cancellation is not successful delivery.

## Device acceptance checklist

Run on physical iPhone, iPad and Android using a recorded signed/test build: fresh offline launch; existing notebook upgrade/reload; native file export/share/cancel/error; disk-full/save failure; keyboard and touch; screen reader/reduced motion/text zoom; portrait/landscape; iPad resizing/split view; safe-area insets; WebGL/context loss; app background/foreground; memory pressure; cold/warm links; camera denied/unavailable/granted/interrupted; switching subjects with camera active. Ensure cameras stop and do not silently restart. Pencil pressure/tilt capability needs an explicit implementation and physical evidence; generic pointer support is insufficient to claim it.

The user reports Mac/iPhone/Android availability in the coordination note, but none was connected or inspected in this Windows workstream. Xcode build/signing, WKWebView tests, hardware camera tracking, native file/share behavior, actual Pencil support and store acceptance are all unverified here.

## Official references checked 2026-10-29

[Capacitor iOS](https://capacitorjs.com/docs/ios), [configuration](https://capacitorjs.com/docs/config), [Preferences](https://capacitorjs.com/docs/apis/preferences), [Filesystem](https://capacitorjs.com/docs/apis/filesystem), [Share](https://capacitorjs.com/docs/apis/share), [App lifecycle](https://capacitorjs.com/docs/apis/app), [deep links](https://capacitorjs.com/docs/guides/deep-links), [Camera](https://capacitorjs.com/docs/apis/camera), [Apple review](https://developer.apple.com/app-store/review/guidelines/), [Apple age ratings](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions).
