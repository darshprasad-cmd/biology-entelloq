# Non-lab polish verification

The dissection lab is out of scope. No lab navigation, tools, specimen selection,
camera permission, or lab browser interaction is part of this verification.

## Baseline

Captured before any generated-page updates, from commit
`4dcb67d2b1654d74d065b588acbde7831e6f5737`.

- Home, Learn, Lessons, Reason, Solve, Explore and Me all rendered without
  uncaught errors or horizontal overflow at a 1440 × 1000 desktop viewport.
- Home also fit a 390 × 844 mobile viewport.
- Existing dark/green styling, sidebar, greeting, resume card and route cards
  already form a coherent layout and are retained as the visual baseline.
- The lesson and reasoning catalogues had no search or topic-filter controls.
- Mobile stacked the daily thread above all main section cards, making the
  catalogue less immediately discoverable.

Baseline evidence: `before-browser.json`, `before-home-desktop.png`,
`before-lessons-desktop.png`, `before-home-mobile.png`.
The mobile screenshot follows visits to all sections in an isolated test context;
its resume card therefore says “Me”. No real user storage is used or cleared.

## Fast checks

Run `node scripts/check-learning.cjs` from any directory. Independent checks run
in parallel: static site contracts, original-lab guard, shared navigation,
tutorial contract, non-lab inline-script syntax, diff hygiene, learning unit
tests, and targeted build drift once the targeted builder is present.

The lab guard uses the committed `tests/fixtures/dissection-original.json`:
40 original canonical Git blob hashes and five SHA-256 hashes of protected
app-shell regions. It covers `lab.html`, every original `src/lab/**` file,
the shared atmosphere and switcher sources, tutorial CSS/JS, and the app's
launcher CSS, HTML, JavaScript, inline atmosphere and switcher.
It also checks the original lab route entry. Windows line-ending conversion is
handled through Git's canonical hash operation. No remote fetch is required.
The fixture must not be regenerated to make a non-lab change pass.

## Browser checks

Serve this repository locally, then run:

```powershell
$env:BIOLOGY_PREVIEW_URL = 'http://127.0.0.1:3002'
$env:BIOLOGY_PLAYWRIGHT_MODULES = 'C:/path/to/existing/node_modules'
node scripts/check-learning-browser.cjs
```

The optional modules setting points to an existing Playwright installation.
Without it, the script reuses the existing sibling Biology prototype's test
runtime. There is no new application dependency or automatic installation.

The script uses one isolated headless Chromium browser, reduced motion, desktop,
tablet and mobile viewports, and a 15-second per-action timeout. It blocks only
`lab.html` requests inside the test so the shell's unchanged hidden prefetch
cannot execute the lab. This is a test-only interception; the product's prefetch
code is unchanged. Software rendering and viewport emulation do not constitute
physical-device, assistive-technology or cross-browser validation.

Focused interactions cover lesson search/filter intersection, empty-state
recovery, keyboard lens tabs, reasoning search and initial step progression,
keyboard multi-select, textual answer labels, shell-search keyboard links and
focus restoration, Home grouping/jump links and malformed local storage, real
Learn destinations, Explore filter recovery, and Solve topic links, keyboard
configuration and session progression. `after-browser.json` records actual
completed checks; an assertion failure exits nonzero and does not count as a pass.

## Verified result — 5 September 2026

- All eight fast check groups passed; the latest measured parallel run took
  approximately 7.5 seconds on this Windows host.
- The fast workflow includes all 28 Node unit tests and all 10 Python tests,
  including the targeted builder's boundary, no-op and failure-before-write tests.
- The focused browser run completed successfully: 17 layout observations,
  nine completed check entries, zero uncaught errors, and no horizontal overflow.
- Desktop/mobile sections: Home, Learn, Lessons, Reason, Solve, Explore and Me.
  Tablet: Home, Lessons and Reason.
- The original lab boundary passed: all 40 canonical file hashes, all five
  protected shell-region hashes, and its original route entry match the baseline.
- Two test-only blocked hidden lab prefetch requests were recorded. The lab
  itself was neither opened nor interacted with.
- Screenshots were personally inspected after the fixes. The original dark/green
  layout remains recognizable. The sidebar Search button is no longer obscured
  by the ecosystem launcher; embedded pages no longer duplicate that launcher.
  Mobile lesson counts and filters are readable and within the viewport.

Final screenshots: `after-home-desktop.png`, `after-home-mobile.png`,
`after-lessons-desktop.png`, `after-lessons-mobile.png`, and
`after-reason-mobile.png`. Machine-readable results are in `after-browser.json`.

Not claimed: physical-device or screen-reader testing, a full scientific-content
audit, authenticated flows, complete quiz-format coverage, or runtime validation
of the deliberately untouched dissection lab.
