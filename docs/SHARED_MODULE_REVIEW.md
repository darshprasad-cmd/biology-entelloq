# Independent shared-module review

Reviewed 2026-10-29. Scope: shared scientific notebook/search/export contracts and local classroom assignment/submission exchange. No executable source edits by the reviewer. Findings were reproduced, sent to the integration owner, fixed there, and independently rechecked.

## Resolved findings

| Finding | Evidence before fix | Recheck |
| --- | --- | --- |
| Aggregate notebook limit incorrectly used the per-record limit | Three 800 KB records saved, then list/export failed above 2 MB even though aggregate storage allowed 4.5 MB | Aggregate regression passes; separate limits used |
| Non-string ID poisoned persisted notebook | Numeric ID saved successfully, next read rejected notebook | ID validation occurs before write; regression passes |
| Generated metadata could report failure after persistence | 1,999,990-character input persisted then final cloning failed, returning Not saved | Final record size checked before persistence; regression passes |
| Nullable measurements crashed whole CSV export | A saved measurements array containing null caused m.name access failure | Null and primitive measurements remain exportable; regression passes |
| Unsaved report used a Saved label | Current experiment report lacked updatedAt | Report explicitly labels unsaved draft export |
| Teacher could not identify imported student code/time | Import rendering displayed only entry, excluding submission attribution | Actual browser import displays both; saved review preserves both |
| Exported classroom file could not be imported | Valid compact 400,378-character submission became 2,200,528 characters when pretty-printed and failed its own import limit | Compact serializer and UTF-8 byte limit match import; regression passes |

## Automated verification

Command: `node --test shared/entelloq-science.test.cjs shared/entelloq-classroom.test.cjs`. Observed **21 passed, zero failed/skipped**, exit code 0. Tested with bundled Node.js v24.19.0.

## Browser verification

An isolated Playwright harness loaded the actual shared modules, an actual Biology catalogue item, a deliberately synthetic assignment/submission fixture and an in-memory storage adapter. Bundled Chromium headless shell was used. Confirmed:

- Imported anonymous student code and submittedAt are visible.
- Saving a teacher review retains matching assignment, scientific entry, code, timestamp and notes; status accurately describes local storage with no feedback sent.
- Escape closes/removes the modal and restores focus to the original trigger.
- No page errors occurred in this interaction.

This verifies module interactions, not the full Physics/Biology integration, visual screenshot quality, assistive-technology behavior, real students or native device behavior. Full Chromium executable launch returned spawn UNKNOWN in this session; using the separately bundled headless-shell executable succeeded. No installation or browser security bypass was used.

## Reviewed snapshot

- `shared/entelloq-science.js`: `c69379131eb4a4fa38a1351b6d7769152fbe52e7eb5da9f823eba19c33f8fbab`
- `shared/entelloq-classroom.js`: `1ef072462b46561d9513e8186f28e75517d83046e42ec6e30e42c4bd6414a903`

Further source changes require a relevant recheck. No unresolved concrete shared-module defect remained from this review pass. Keep the classroom pilot feature-flagged pending real-student/teacher validation and the separate native persistence/device gates.
