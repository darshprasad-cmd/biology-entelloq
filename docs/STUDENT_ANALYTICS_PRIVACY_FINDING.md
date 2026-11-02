# Student analytics privacy finding

Reviewed 2026-10-29. Initial severity: release-blocking for a school/student-facing native bundle until fixed and verified by the source/native owners. This is a verified source/configuration finding plus current official service guidance, not a claim about observed production collection or a legal adjudication.

## Current local-source status

The Physics source owner has now replaced the tracking wrapper with inert methods while preserving its caller interface. Independently re-inspected `physics/index.html` at the `EXPERIENCE:PRIVACY-ANALYTICS` markers: `load`, `view`, `ev`, `tags`, `ident` and `upgrade` are no-ops, and both public enabled/loaded checks return false. This establishes the local-source remediation; it does not establish deployment or the contents/runtime behavior of a separately packaged native build. The original finding below is retained as baseline evidence. The native owner must package the corrected source and complete the network checks below.

## Official restriction

Microsoft's [Clarity setup documentation](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup) states: “Clarity shouldn't be used on any websites/apps targeting users under the age of 18 globally.” The [overview](https://learn.microsoft.com/en-us/clarity/setup-and-installation/about-clarity) and [FAQ](https://learn.microsoft.com/en-us/clarity/faq) repeat the audience restriction. This product explicitly includes school-age education, so the existing integration is unsuitable for the student-facing package without an eligibility resolution supported by the service owner. A cookie-consent banner or masked fields does not resolve the published audience restriction.

The general terms URL was opened but returned no readable body through the available web tool. The finding rests on the explicit official documentation above. Do not mislabel the excerpt as a legal quotation from the terms.

## Verified baseline code path

Inspected `physics/index.html`, marker `Pass 93 — Track: Microsoft Clarity, lazy + config-gated` (approximately lines 4150–4179 at inspection; lines may move during concurrent edits):

- A non-empty configured project identifier exists. It is intentionally not repeated here.
- `pid()` reads a localStorage override (`peq_clarity_id`) and otherwise uses the configured identifier.
- `enabled()` returns only whether that identifier exists. It does not check audience eligibility or native packaging mode.
- `load()` creates a script whose origin is `https://www.clarity.ms` and path begins `/tag/`, then calls identity and tag functions.
- `Track.load()` runs immediately after the module definition.
- `ident()` supplies the signed-in user's email and first name to Clarity when available; otherwise it uses a persistent generated anonymous identifier. No actual user's identity was retrieved by this audit.
- `tags()` includes learning style, profile level/goal and theme. Navigation and experiment events call the tracking wrapper later.
- No consent/under-18 eligibility gate was observed in the inspected block. The entire consent/auth system and external project configuration were not independently audited.

No project IDs, credentials or personal records belong in this report, screenshots or test output. The source code path makes collection possible; only a controlled network test can establish whether a specific built artifact actually calls the external service.

## Smallest reliable remediation

The Physics source owner should make this tracking wrapper inert for the student application while preserving its callable interface so existing experiment actions continue working. The native owner should independently assert the packaged student bundle cannot activate it, including through a stale localStorage project override. Do not replace it automatically with another third-party analytics service.

For the requested usability funnel, collect local ephemeral timings/counters or consented moderated study observations with a documented purpose and retention policy. Keep notebook content, camera frames, names, emails and school information out of analytics. A future remote analytics design needs its own product/privacy review and must fit the actual audience.

## Verification needed before release

1. Browser tests: fresh profile, profile with legacy tracking override and signed-in fixture; assert zero requests to Clarity tag/collect endpoints and no identity calls through discovery, lab launch, save, route changes and sign-in state changes. Fixtures must use invented non-personal values and must not send them to a real service.
2. Static assertion: no active script injection path in the student release; an empty default project identifier alone is insufficient because the storage override exists.
3. Native packaged build: repeat cold-launch/offline-to-online and navigation checks on actual WKWebView/Android WebView. Verify external frames cannot bypass the shell's bridge/network restrictions.
4. Release documentation: distinguish the fixed local source, tested packaged build and any authorized website deployment. No production website or Clarity dashboard settings were changed by this audit.

The baseline blocker was **automatic Clarity initialization in an app intended for school-age users**, with a configuration path that could transmit identity/profile information. That local source path is now inert. Remaining acceptance gates are the exact packaged build and its network behavior, plus any separately authorized deployment; those cannot be inferred from source review.
