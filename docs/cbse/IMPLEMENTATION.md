# CBSE study entry: Biology

## Delivered scope

The first visible interactive screen of the portable site is a four-question
setup. Its controller executes before the embedded manifest and specimen bytes.
A native modal dialog isolates background interaction; explicit Tab boundaries
retain keyboard focus. Skip, Escape and later editing are supported. No camera,
account or personal identifier is requested.

The separate CBSE workspace contains four class views. Classes 9–10 are
explicitly the biology strands of integrated Science, not whole Science courses.
Class 9 uses the 2026–27 Standard syllabus, not the older curriculum or Advanced
course. All twenty unit rows map existing completed concept lessons and show
specific remaining gaps. No chapter, practical or syllabus is marked complete.

## Personalisation and privacy

- Class and chosen focus select the starting unit and a real canonical lesson.
- Foundations opens plain-language explanation, revision opens the visual mode,
  and retrieval practice opens the corresponding Solve route.
- The 10-, 20- or 30-minute preference changes the read/recall/reflection plan.
  These are adjustable estimates, not measurements of ability or mastery.
- Only version, class, goal, minutes and focus are accepted in the separate
  local-storage key bioq.cbse.profile.v1. The skip choice uses bioq.cbse.skip.v1.
  No name, birthday, school, contact information or learning-style label is used.
- Corrupt, unknown-version or blocked storage cannot prevent session use.
  Reset removes only preference keys, never notes, answers or laboratory records.
- Fresh lesson links show setup first, then resume that exact destination after
  submission or skipping. Returning profiles open their dashboard from the root,
  without hijacking explicitly requested lesson or lab routes.
- Routes #cbse:9 through #cbse:12 work on both subject sites. Sibling links share
  only a class in the URL, not the private profile; each site saves independently.

## Preservation and design review

| Before | After | Why |
| --- | --- | --- |
| Immediate landing scene | Setup before manifest parsing | Honour the first-screen request on slow connections |
| Broad library filters | Separate class/unit resource map | Keep curriculum work distinct from free exploration |
| Generic starting point | Class, focus, goal and time choices | Change actual study actions without inferring mastery |
| Implicit coverage | Supporting-resource status and named gaps | Do not represent chapter headings as completed curriculum |
| No profile controls | Skip, edit and profile-only reset | Keep students in control and preserve their work |

The authored landing page, lab source, protected launcher regions, original
fingerprint fixtures and scientific models are untouched. The app receives
additive desktop/sidebar and mobile/Explore entries through the narrow library
builder. The portable shell receives isolated onboarding style and script slots.
There are no new dependencies, animated keyboard transitions or tracking events.

## Verification

    python scripts/build-library.py
    python scripts/build-single-file.py
    node --test tests/cbse-entry.test.cjs
    node scripts/check-cbse-entry-browser.cjs
    node scripts/check-learning.cjs
    python scripts/build-single-file.py --check
    node scripts/check-single-file-browser.cjs
    node scripts/check-opening-browser.cjs
    node scripts/check-exam-answers-browser.cjs

The dedicated CBSE runner covers 1440/768/390/320 CSS-pixel viewports, real
onboarding controls, keyboard focus, all class routes, profile edit/reset,
existing lesson navigation, blocked storage, a held manifest and offline file
use. Set BIOLOGY_CBSE_URL to a deployed HTTPS root for live behaviour checks.
Existing packaged-workflow tests explicitly choose the actual Skip for now
control; no testing bypass was introduced into the product.

Chromium emulation is not a physical-device accessibility certification or
qualified educator review. These existing concepts are supporting material,
not complete CBSE coverage. Official source links and class-specific assessment
limitations remain visible in the product.
