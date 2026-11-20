# Biology CI and navigation follow-up — 20 November 2026

This continues the branch integration at `c95528f`. The runtime correction is committed at `33f6f3c6572479c4418122c50babd26522932bd1`; it changes only the shell refresh, packaged navigation ownership and their regression tests. Production deployment and PR merge are outside this evidence.

## Failures and corrections

The hosted opening check exposed a real recovery bug. Relabelling the product navigation called `BioShell.refresh`, which reran the current route, cleared its 15-second deadline and returned early for the already-mounted page. A deliberately held reading document could then remain loading without recovery. Refresh now updates the active navigation and breadcrumb text without starting navigation or cancelling its deadline. The test still waits for the visible recovery overlay at the original deadline, releases the genuinely held script, and verifies working answers and retries.

A separate native integration trace showed a queued callback from the outgoing About document overwriting a newer Labs route. Packaged navigation now rejects superseded documents and checks the selected child route and ancestor ownership before accepting a history or navigation write. This also covers a retained About frame after returning Home, while allowing initialization writes before readiness and allowing that retained frame to work again when selected. Regression coverage includes Home, replacement with kinetics, hidden immersive routes, disconnected frames and superseded parent workspaces. An independent browser reviewer also repeated the real About-to-Home callback three times successfully on the corrected artifact.

No experiment equations, serialization, notebook persistence, dissection source, specimen assets, camera code or shared scientific/classroom modules changed in this follow-up.

## Final runtime and catalogue

The runtime and catalogue are frozen at `8a765df09f986b9690a9208d1e9de93be1dc1c1e`. The additional commit copies the newly released Physics lever catalogue entry and regenerates the embedded catalogue in `app.html`, `labs.html` and `me.html`. Biology remains at 221 catalogue entries; Physics now has 343. Searches for mechanical advantage, fulcrum, first class lever, torque and lever resolve the canonical lever route in all three decoded packaged pages. The actual Physics engine remains owned by Physics.

The final Windows distributable is 44,990,635 bytes, SHA256 `69a5bbefe8d12eeff7e535385b3248504f9ea0995324487fb7846a98895f3a6f`, built with CPython 3.14.5 and zlib 1.3.1.zlib-ng. `final-artifact.json` records both catalogue hashes and unchanged protected Git objects. `final-embedded-catalog.json` verifies the actual packaged catalogue rather than only the source JSON. Documentation-only follow-up commits do not change this runtime pin or artifact.

## Sequential checks and evidence boundaries

`checks.json` records the sequential run on the corrected runtime before the final Physics catalogue update. Opening, exam answers, AI formatting, learning tools (source and portable), visual tools (source and portable), learning host quality (source and portable), protein and model resume all passed. Their reports, screenshots and command logs are retained here; historical evidence directories were restored.

The next product run stopped on its first reload with Chromium `net::ERR_NETWORK_IO_SUSPENDED`. The observed machine-clock jump of roughly 35 minutes is consistent with a host interruption, but it does not prove the cause. No application assertion failed in that run, and no application change was made for it. The affected checks are rerun fresh on the final artifact.

One earlier uninstrumented opening rerun also timed out waiting for the overlay. A passive timer trace subsequently observed the unchanged timer firing, the visible-overlay class and the held reading document still loading; the exact test then passed in the sequential run. Failure diagnostics now retain overlay computed styles, dimensions, frame state and readiness if this recurs. The visible recovery assertion and timeout remain unchanged.

The final fresh run in `final-checks.json` passed all five groups: static checks (14/14), product portable, product copied-alone file, complete single-file (31 HTTP and 31 standalone-file checks), and opening recovery/navigation (10 checks). The final opening run took 73.61 seconds and retained the real 15-second deadline assertion. Both product modes cover 1440, 768, 390 and 320 CSS-pixel widths, save/resume/reload, live-draft rescue on failed legacy persistence, classroom assignment/submission/review, explicit local-only state, flag-off behavior and scoped accessibility. They reported zero uncaught application errors or automatic camera requests. Screenshots of the final mobile workspace were visually inspected: record/save controls remain unobstructed, and the light-theme Photosynthesis diagram and text remain readable.

`final-cross-subject-lever.json` and its two screenshots additionally prove actual navigation at 390 CSS pixels: all five lever queries found the resource in packaged Biology, clicking its result opened the staged Physics artifact at `#science:bench:lever`, and changing its load to 6 N updated the real lever apparatus description. Neither app reported an uncaught error. The test used the exact final Biology artifact and Physics runtime `176b1c35` artifact SHA256 `50506b95debb9fbb531d42687d2d1fd3243f5960a30a536cf500bc6bc0061bc4`. The local reproduction script is `check-cross-subject-lever.cjs`, run from the Biology repository root with the sibling Physics checkout and existing browser runtime.

The browser uses the existing `BIOLOGY_PLAYWRIGHT_MODULES=C:/Users/darsh/biology-entelloq/node_modules`; no dependency was added. Chromium evidence does not establish physical-device camera behavior, real-student usability or production release.

## Compressed artifact reproducibility

The historical `c95528f` hosted artifact was 44,920,068 bytes, SHA256 `86876591375ba9110bbe4ed4f18aba13a8a833c2eaf6d86ab299c78571f78ee5`; its Windows artifact was 44,988,000 bytes, SHA256 `e8bf0a8e9da95eaef7459de726f544daa26a41d1a938319d19b096a9a72e644e`. A separate exact-source audit reproduced both using different compression backends. All 17 decoded pages, 140 decoded assets, outer HTML, bridge and manifest metadata matched. The standard-zlib reproduction used CPython 3.12.14/zlib 1.3.2; the local reproduction used CPython 3.14.5/zlib 1.3.1.zlib-ng. CI did not print its compressor version, so that backend is inferred from exact reproduction. Checkout line endings were not the cause.

That audit applies to `c95528f` only. Final compressed hashes must be interpreted with their build runtime; decoded parity does not imply identical compressed bytes across operating systems or compression backends. The historical audit, comparison script and per-payload hashes are preserved in [compression-parity-c955](compression-parity-c955/README.md).
