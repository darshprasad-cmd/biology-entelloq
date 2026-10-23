# CBSE entry release — Biology

Status: locally verified; PR checks, merge and live deployment verification are separate gates. Consult the pull request for the final release SHA and live evidence.

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
