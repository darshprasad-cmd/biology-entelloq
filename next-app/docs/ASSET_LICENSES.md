# Asset and source register

## Product assets

| Asset | Origin | Licence / terms | Use |
| --- | --- | --- | --- |
| Heart and atlas geometry | Generated in Biology Entelloq source | Project source-code licence | Procedural 3D specimen and CSS 2D atlas; no external model or texture file |
| Interface icons | Lucide | ISC | Navigation, tools, and learning controls |
| Geist Sans and Geist Mono | Vercel | SIL Open Font License 1.1 | Interface typography through `next/font` |
| Grain texture | Generated inline SVG | Project source-code licence | Subtle surface texture; contains no external image |
| Landing anatomy illustration | Authored in `components/landing/HeartIllustration.tsx` | Project source-code licence | Decorative SVG surface, flow, and interior views; an educational illustration, not a clinical reference model |
| Sculptural hero artwork | Original built-in image generation for this project | Generated output; prompt and provenance in `HERO_ARTWORK.md` | `public/images/biology-heart-hero.webp`; explicitly conceptual marketing art, not a clinical diagram or app screenshot |
| Laboratory workspace preview | Screenshot captured from this application | Project interface and procedural assets | `public/images/lab-workspace.webp`; optimized from `docs/screenshots/lab-3d-desktop.png`, no fabricated UI |
| Collection specimen sketches | Original inline SVG in `components/landing/Landing.tsx` | Project source-code licence | Decorative flower and cell silhouettes; Lucide microscope icon retains ISC attribution above |
| MediaPipe Tasks Vision runtime and hand model | Google MediaPipe | Apache License 2.0 | Optional, on-device hand tracking loaded only when requested |

No stock photography, video, audio, paid model, or remotely hosted texture was added in this overhaul.

## Educational grounding

The practical links learners to the following reviewed references. They are citations, not copied product assets.

- OpenStax, *Anatomy & Physiology 2e*, “Heart Anatomy”.
- NCBI Bookshelf, *Anatomy, Thorax, Heart*.

When adding a new asset, record its author, exact licence, source URL or repository path, and any required attribution in both the practical's `assets` field and this register.
