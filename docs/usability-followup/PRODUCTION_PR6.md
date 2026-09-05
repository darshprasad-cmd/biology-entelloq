# PR6 deployment verification

Verified 5 September 2026 at approximately 16:15 UTC against
`50bcfb0ea089199f74a51472105e6c3f16d557d4`.

The live HTTPS site is serving PR6. HTTP responses for `app.html`, `lessons.html`
and `solve.html` return 200 and have exact canonical Git blob hashes matching
that commit. `lab.html` also returns 200 and still matches the original lab blob
`e336a89fafc95b041b5ec1531db13f2ea9a39b45`.
The lab was fetched as bytes only: it was not opened, rendered or interacted with.

The built-in [Pages build and deployment](https://github.com/darshprasad-cmd/biology-entelloq/actions/runs/33977064918)
and [CI](https://github.com/darshprasad-cmd/biology-entelloq/actions/runs/33977065433)
completed successfully. At verification time a separate custom
[Deploy to GitHub Pages run](https://github.com/darshprasad-cmd/biology-entelloq/actions/runs/33977065416)
was pending with no jobs. This is reported separately rather than treating all
deployment workflows as finished. The successful built-in deployment and exact
live-byte comparisons establish that the requested content is already live.
No deployment or repository settings were changed during verification.

## Production browser smoke

One isolated Chromium browser was used with reduced motion and lab requests
blocked. No real user's storage, account or camera was accessed.

- Home loaded all eight non-immersive section cards.
- Keyboard search opened Enzyme Action.
- Lessons search recovered from an empty result to all nine original lessons.
- Solve accepted the Cell Biology deep link; arrow keys selected another topic.
- A practice session started by keyboard, showed its explanation after Skip,
  and advanced to the next question by keyboard.
- Mobile Home fit a 390 × 844 viewport without horizontal overflow.
- No uncaught browser errors occurred.

Evidence: `production-pr6.json`, `production-pr6-home-desktop.png`,
`production-pr6-lessons-desktop.png`, and `production-pr6-home-mobile.png`.
The smoke runner is `scripts/check-usability-browser.cjs`; it writes only test
reports/screenshots and performs no product, Git, or deployment mutations.

This is bounded release verification, not a full content, scientific, physical-
device, screen-reader or cross-browser audit. The untouched dissection lab is
deliberately outside browser-test coverage.
