# Biology learning-tool host quality

The host keeps the existing Biology sections, routes and saved work. It gives each section a specific introduction, makes the notebook's browser/file sharing boundary explicit, and moves the full tool explanation into a named **About this tool** disclosure while retaining a short visible boundary.

An open tool has one compact Back/title/action bar. Its frame follows the available viewport instead of imposing a 620–660 px minimum. Sources and Reload retain 44 px touch targets. Ready status remains announced without taking up screen space; delayed or missing documents show a busy or recoverable error state.

Opening a tool focuses its heading. Sources returns focus to its trigger. Alt+Escape returns to the original card from host controls or the child tool; the earlier Alt+Shift+Left shortcut remains supported. Plain Escape is reserved for the child tool. Existing pause/destroy hooks and local saved-work storage remain unchanged.

## Verification

Run `node scripts/check-learning-host-quality.cjs`, then run the same command with `--portable` after building the portable app. The harness uses real tool documents, reduced motion, local-only requests, desktop/tablet/mobile layouts, the actual Appearance control, keyboard focus, complete scientific context, notebook sharing copy and a deliberately delayed/missing source document followed by successful Reload. Portable mode allows only the single HTML document to load over HTTP.

The final run on 26 October 2026 passed eight source checks and seven portable checks, with zero page errors. The harness checks actual image decoding for the poster and all four still alternatives; a ready frame or an image element's dimensions alone do not prove that an image loaded. JSON reports and inspected screenshots in this directory record source and portable runs separately. The source-only recovery check injects a delayed HTTP 404 and verifies successful Reload; portable documents come from the embedded package.

| Outer viewport | Tool frame height | Tool top within its Biology section |
| --- | ---: | ---: |
| 1440 × 1000 | 731 px | 130 px |
| 768 × 1024 | 756 px | 132 px |
| 390 × 844 | 498 px | 153 px |

Both versions have no horizontal overflow at these sizes. Child tools retain their own scrollable content; the host does not rewrite it. Every mobile toolbar button is at least 44 × 44 px, and the host title remains 17 px despite the shell's broader heading rules. The frame ends above both visible floating app controls, and the initial mobile Play button fits entirely within the frame.

Static host syntax and six-section source-slot checks passed. The initial Windows `check-learning.cjs` run passed 10 of 14 groups; library/background/preview generated-page checks found CRLF/LF representation differences in unchanged files. Read-only comparison confirmed every affected generated output is identical after newline normalization. The integration owner then normalized the checkout and reported all 14 groups passing with bundled Python 3.12. Release-wide checks remain separate from this host harness.

This host work does not change scientific engines, authored media, auth, providers, deployment, or the portable bridge. Companion permissions, optional downloads, module source parity and saved-work upgrade checks are verified separately during integration.
