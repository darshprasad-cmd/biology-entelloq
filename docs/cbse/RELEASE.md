# CBSE entry release — Biology

Status: released and live-verified through PR40, merged commitaa8cb045b2cae6d1786d547d2bd9675a7d6a7258. Required PR CI and Pages deployment passed. Downloaded Pages artifact12526356256 for deployment run40010533649 contains a27,213,581-byte index.html with SHA-25631728a69e77ca31b99de6bc28c8c8a0e2410739fdb284d6583a34b50def0becd; production HTTPS matched exactly. The local Windows package below differs in source line endings, so it was not used as deployment proof. Live first-screen/class-path/browser tests passed at320/390/768/1440, including saved preferences, skip/reset, explicit deep links, sibling class links and real lesson navigation. Evidence: docs/cbse/live-entry/.

Generated artifact dist/index.html: 27,231,621 bytes; SHA-256 4883fd0c5fda7387050afa187d6b8238849b1e38af59ccec9bce3009e67e9a53.

All 13 fast-check groups passed, including content/reference/unit checks and unchanged dissection boundaries. Full portable browser suite passed 20 HTTP and 20 file checks, including real-render prepared specimens and Universe navigation. Opening/failure recovery, exam-answer workflows and safe answer-formatting checks passed. Dedicated CBSE suite passed at 320/390/768/1440, all class routes, stored/blocked/failed-write preferences, keyboard containment, deep links, pre-manifest entry and offline file.

## Reproduction

```
node scripts/check-learning.cjs
python scripts/build-single-file.py --check
node scripts/check-single-file-browser.cjs
node scripts/check-opening-browser.cjs
node scripts/check-exam-answers-browser.cjs
node tests/check-ai-answer-formatting.cjs
node scripts/check-cbse-entry-browser.cjs
node scripts/check-cbse-accessibility.cjs
```

## Boundaries

This release implements first-visit setup and supporting class pathways, not complete CBSE lessons or practicals. It does not add tracking, request a camera, change authentication or infer mastery from preferences. Curriculum assessment ambiguities remain visible. Automated/browser checks are not qualified educator review or physical-device certification.

Physics and Biology are separate origins; preferences are local per site. Existing notes and progress retain their storage keys. The Biology release was isolated from another active dissection task; none of that task's lab changes are included.
