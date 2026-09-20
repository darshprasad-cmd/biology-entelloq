# Discoverable lab study controls

Scope: expose existing examination and learning features without changing specimen geometry, the dissection layout, scientific generators, camera permissions, AI providers, or other app pages.

## UI review

| Before | After | Why |
| --- | --- | --- |
| Histology depended on hovering a structure and knowing Z | Persistent Histology button opens 23 named reference sections | Touch users can find and open the microscope without a hover or keyboard |
| Scale journey was an I shortcut/context action | Persistent Scale journey button | One visible entry point and a 44px close target |
| Secondary modes were spread across shortcuts and Console | More modes routes imaging, pathology, layers, physiology, tutor actions, attempt record, Viva and controls | Reuses existing features without filling the specimen viewport with every control |
| CT/MRI adjustments required W/R | Native Window preset and MRI weighting buttons, synchronized with keyboard changes | Buttons display the real renderer state |
| Context actions read whichever organ was hovered at click time | Actions carry the originating structure ID | Moving toward the control does not change the target |
| Live input could continue behind a study view | Chooser and microscope gate the frame's dissection and constraints; closing requires grip release | Study interactions cannot accidentally cut the underlying specimen |

## Scientific limits

The microscope is an illustrative reference library, not photographic microscopy or a tissue sample taken from the rendered specimen. Its existing 23 templates remain unchanged. Six have frog-specific organ renderers; other catalogue sections are explicitly labelled mammalian references. Fish, earthworm and cockroach use an explicitly labelled mammalian comparison library, not an invented species-specific slide. Unimplemented disease slide keys do not become disease-specific imagery. Scale journey and radiology remain the existing illustrative teaching models.

## Verification

- `node scripts/check-learning.cjs`: required 13-group source, unit, protected-boundary and build-drift checks.
- `node --test tests/lab-feature-buttons.test.cjs`: 11 new direct-routing, reference-catalogue, species, stale-selection, focus and missing-module regressions, with the real 23-item catalogue.
- `node tests/check-lab-feature-controls.cjs`: source-shell browser tests at 1440x1000, 768x1024, 390x844, 320x640 and 844x390; keyboard containment, focus return, title/control hit tests, empty/disabled states, scrolling and MRI adjustments.
- `node tests/check-lab-mobile-controls.cjs`: existing five-viewport and eight live-resize cases.
- `node scripts/check-lab-feature-buttons-browser.cjs`: real built lab, prepared frog, real microscope/objective changes, real frame-loop input isolation, scale journey, X-ray/MRI/window/weighting, record/Viva, 390/320/1440 layouts and exact served-artifact comparison. Screenshots and machine-readable report in `preview/`.

The release smoke is rerunnable against production using `BIOLOGY_PREVIEW_URL=https://biology.entelloq.com` and an independent `BIOLOGY_FEATURE_OUTPUT` directory. Browser testing uses software WebGL and emulated touch, not a physical phone. Camera and AI-provider requests are intentionally not exercised.
