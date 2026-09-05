# Usability follow-up

This follows the deployed learning-polish release, PR #6 (`50bcfb0`). The
original dark-green design and dissection experience remain the baseline.

## Changes

- Lessons remember the last lens and prediction independently for each lesson.
  Correct-answer text and feedback focus make the result understandable without
  relying on colour. An explicit retake resets only that lesson's prediction.
- Progress is local to this browser in the new, isolated `bioq_lessons_v1` key.
  Stored records validate the lesson, lens, answer and question signature.
  Invalid or stale answers are ignored. An unavailable store is labelled
  **This visit only**. No mastery, completion or simulation-state saving is
  implied. Existing activity and practice keys are not changed by this feature.
- Writes merge the current validated store by changed lesson/field. Regression
  tests cover different lessons in two tabs, same-lesson lens updates, stale
  answer attempts, deliberate retakes and recovery after a failed write.
- Ctrl/Command+K inside normal embedded sections opens the parent app search.
  Escape returns to the exact input or control, retaining its text.
- The landing page gains a keyboard skip link/main landmark and restores the
  intended spacing of its existing native FAQ disclosures. Its static dashboard
  is explicitly an example, with a link to real activity. Mobile app entry stays
  a single-line button. The hero, answers, demos and model code are unchanged.

## Verification and release boundary

`node scripts/check-learning.cjs` runs the eight parallel verification groups.
Focused browser evidence is produced by `scripts/check-usability-browser.cjs`:
landing keyboard/mobile checks, embedded search focus, progress/retake/reload,
invalid and blocked storage, plus a separate two-tab supplement. Evidence in
this directory is separate from the previous release's screenshots and reports.

The original-lab guard remains unchanged and passes. No lab, shared atmosphere,
shared switcher, tutorial, auth, infrastructure or deployment-setting changes
are included. Scientific lesson datasets and simulation-builder code are
hash-checked against their original content. No lab browser interaction or
camera permission is part of QA.

PR #6's actual HTTPS files were verified against the deployed Git blobs; its
lab file still matches the original. The successful built-in Pages deployment
and a separate pending custom deployment workflow are recorded separately in
`PRODUCTION_PR6.md`. Live-file verification, not a queued workflow alone, is the
criterion for calling a release live.

The user separately enabled a daily 10:00 AM local-time improvement-and-deploy
heartbeat in Codex, with tests before merge/deploy and the same lab/layout
boundaries. Its configuration is managed by Codex, not by this repository.
