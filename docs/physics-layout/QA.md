# Biology launch and Physics layout review — 2026-09-06

## References and scope

The opening follows the supplied Biology image: full-bleed dark DNA scene, airy wordmark/navigation, left-aligned two-line headline, a four-step rail, glass actions and four image cards. Scroll sections carry its palette and photography into actual learning tools. Artwork and complete generation prompts are recorded in `image-prompts.md`.

The app shell follows the currently deployed Physics layout (verified against Physics origin/main bb3dfa7): 224px sidebar, 76px header, Explore overlay, central Home composition, and a 66px mobile header with bottom navigation. Biology keeps its own routes, learning content, progress and tools. Pillar styles are synchronized through two narrow style-slot scripts.

## Validation

- `node scripts/check-learning.cjs`: 10/10 groups passed, including Python contracts, original lab boundaries, ecosystem navigation, feature tutorial, non-lab script parsing, regression tests, diff hygiene and all three build/style drift checks.
- Independent source review: the eight pillar pages retain all non-layout content/scripts; protected immersive launcher regions and original lab files remain unchanged.
- Browser inspection used the Codex browser against the served local HTTP site. Desktop opening reviewed at 1536×1024; mobile at 390×844. The four WebP image cards and DNA hero load, and the mobile page has no horizontal overflow.
- Observed the hero transform changing over time. The background pause button freezes animation and retains the setting after navigation/reload. The model has its own working pause control. Reduced-motion and visibility behavior are covered by executable regression tests.
- Enzyme slider checked with keyboard: zero substrate → 0.0%, [S] = Km → 50.0%, [S] = 10 Km → 90.9% of Vmax. Canvas fallback is hidden correctly when canvas is available; the visible model names its simplifying assumptions.
- Mobile search returns the working benches for “enzyme”. The account control remains accessible and its popover fits inside the viewport. Mobile experiment captions are at least 9px.
- Founder sizing: desktop portrait reduced from 320px to 176px; phone portrait from 280px to 96px. Headline, quote, body text and section spacing are smaller. Verified at 1440×900 and 390×844 with no horizontal overflow.
- App checks: desktop/mobile Home, real lesson navigation, mobile Explore group filtering, Ctrl+K search, Escape/focus restoration, an enzyme-kinetics deep link, and exploration counts derived from a real visited lesson.

The optional standalone browser script is maintained for the new shell but was not executed in this session; the checks above used the Codex browser. Existing camera tracking, Google sign-in completion, external AI and every scientific model were not re-audited by this presentation change. Local preview is not a deployment.
