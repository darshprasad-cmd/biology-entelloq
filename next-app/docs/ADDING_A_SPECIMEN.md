# Adding a specimen

Biology Entelloq practicals are data-driven. A new specimen supplies one `Practical` record and one renderer; the workspace, learning modes, tutor, progress, controls, and viva reuse that definition.

## 1. Define the lesson data

Create a file under `lib/practicals/`. Use `lib/practicals/heart-data.tsx` as the complete reference and satisfy the `Practical` contract in `lib/engine/types.ts`.

At minimum, provide:

- a stable `id`, title, subject, difficulty, duration, and short learning promise;
- measurable objectives and concise grounding context for the tutor;
- structures with unique IDs, label positions, explanations, and groups;
- guided steps, ordered assessment tasks, and viva questions;
- an orientation note, ethical or safety guidance, an accessible description, and citations;
- an asset record for every model, texture, photograph, font, sound, or dataset.

Structure IDs are the connection between the renderer and the curriculum. Reuse the same ID in mesh hit targets, guided steps, assessment requirements, layers, and viva context.

## 2. Build the renderer

The renderer receives `ModelProps` from the engine. Register every selectable object with `registerHit(mesh, structureId)`. Honour `dissection` and `exploded`; the engine applies selection, transparency, isolation, hide/fade, and cross-section state universally.

Complex WebGL specimens should follow the heart split:

1. Keep lesson data in a light `*-data.tsx` module.
2. Keep Three.js geometry in a separate renderer module.
3. Load the renderer with `React.lazy` so the 2D atlas and onboarding do not pay the WebGL cost.

Prefer generated geometry or small, compressed permissively licensed assets. Provide a meaningful 2D route; the generic atlas remains usable even if WebGL or the model fails.

## 3. Register it

Import the practical in `lib/engine/registry.ts` and add it to `PRACTICALS`. `validatePractical()` rejects duplicate IDs and missing structure references. Invalid or unknown routes fall back safely to the heart practical.

## 4. Verify it

Run:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Add unit coverage for its data and assessment sequence, then extend `tests/e2e/journeys.spec.ts` with one keyboard-accessible learner journey. Check both desktop and phone layouts, the 2D route, reduced motion, and an automated accessibility scan.
