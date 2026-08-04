export const meta = {
  name: 'bioq-refine',
  description: 'Refine the dissection lab greatly: show the live hand, upgrade the anatomy, add a lit environment, and rework the gesture UI',
  phases: [{ title: 'Refine', detail: 'handviz · anatomy · environment · gesture-UI' }],
}

const B = 'C:\\Users\\darsh\\biology-entelloq\\_build'

const REFERENCE = `
## The look to hit (the user pointed at this image)
Physics Entelloq: a near-black spatial scene where the SPECIMEN dominates, with the student's
webcam feed subtly composited into the world, a live hand shown, thin glowing tracking lines from
the fingertips, and a radial gesture menu of labelled sectors the hand aims at. Emerald #34d399 and
cyan #38e0d8 accents on #04070a. Monospace uppercase micro-labels. A small "1 HAND" style indicator.
Premium, scientific, spatial — Apple Vision Pro / Arc / Linear, never a school portal or a game.

## The user's explicit instruction
"make it much better and show the actual hand thing as shown in the image."
So: the hand IS shown now — webcam feed + a live glowing hand skeleton + a gesture cursor. This
deliberately overrides the earlier hide-the-technology stance; do not re-hide it.

## Hard build contract (every file is concatenated into ONE html, no bundler)
- Read your target file first if it exists; preserve its EXACT exports and public shape.
- NO \`import\` statements. \`THREE\` is a function parameter. Addons arrive as a \`deps\` parameter.
- Plain ES modules, three.js r0.160. \`Object3D.position\` is read-only — use \`.position.set()\`.
- Runs as-is: no TODOs, no placeholders, no external assets except via an existing CDN.
- After vertex displacement you MUST call \`geometry.computeBoundingSphere()\` and
  \`computeBoundingBox()\` — the raycaster does a bounding-sphere reject first and stale bounds make
  picking silently fail. This already bit us once.
`

phase('Refine')

const JOBS = [
  {
    file: 'handviz.js',
    label: 'handviz (the live hand)',
    brief: `Write \`${B}\\handviz.js\` — a NEW module that renders the student's hand on screen, the
headline of this whole refinement. This is what the user asked to SEE.

It draws, into its own full-viewport \`<canvas>\` layered above the 3D scene but below the glass
chrome (z-index ~15, \`pointer-events:none\`):
1. **The mirrored webcam feed**, dimmed and desaturated so it reads as an ambient backdrop the
   specimen floats over — not a raw selfie. Draw it flipped horizontally (the tracker already
   mirrors landmark x, so the video must match). Keep it subtle: ~0.16–0.28 alpha, a dark
   multiply/vignette so the centre where the specimen sits stays clean.
2. **A live glowing hand skeleton** over the 21 landmarks: connect them with the standard MediaPipe
   bone topology (palm, thumb, and four fingers), stroke in emerald with an additive glow
   (shadowBlur), and draw a filled dot at each joint. Fingertips get a slightly larger, brighter
   node. Thin cyan "tracking lines" may extend from the fingertips toward screen-centre for the
   Physics-Entelloq feel, but keep them faint.
3. **The pinch/grip cursor**: at the pinch point (midpoint of thumb+index tips), a ring whose radius
   grows with \`pinchStrength\` and whose colour shifts emerald→cyan as it closes; a solid core when
   \`isPinching\`. This is the same cursor the dissection uses, so it must sit exactly at
   \`hand.cursor\` (already filtered) — draw the ring there, not at the raw midpoint.
4. A small monospace status chip top-left of the overlay: "● 1 HAND" / "2 HANDS" / "NO HAND",
   coloured by health (emerald healthy, amber degraded, red lost), plus the current gesture name.

### Data you get (from \`hands.js\`)
\`snapshot = { active, health(0..3), hands: [ hand, hand ] }\` where each hand is
\`{ present, handedness, gesture, pinchStrength, isPinching, cursor:{x,y}, indexTip:{x,y}, roll,
   span, landmarks:[{x,y} x21] }\`. All coords normalised 0..1 and already mirrored — multiply by
canvas width/height to draw. \`landmarks\` is the full 21-point set in MediaPipe index order
(0 wrist; 1–4 thumb; 5–8 index; 9–12 middle; 13–16 ring; 17–20 pinky).

### Export exactly
\`\`\`js
export function createHandViz(root)
// returns {
//   mount(videoEl),          // the <video> from tracker.videoEl, for the backdrop
//   update(snapshot),        // call every frame
//   setEnabled(bool),        // hide/show the whole layer (mouse mode hides it)
//   resize(),                // on window resize
//   dispose()
// }
\`\`\`

Make it genuinely beautiful and smooth — additive glow, subtle trails, 60fps. Comment the bone
topology array. This is the money shot.`,
  },

  {
    file: 'anatomy.js',
    label: 'anatomy (much better specimens)',
    brief: `Rewrite \`${B}\\anatomy.js\` to make the specimens MUCH better looking, while preserving its
exact export contract. **Read the current file first** — keep every export and field name.

### Preserve exactly (main.js and dissect.js depend on these)
\`export const SPECIMENS = { frog:{id,name,blurb,camera:{pos,target}}, heart:{...} }\`
\`export function buildSpecimen(THREE, id)\` returning \`{ group, parts }\`, each part:
\`{ id, name, note, mesh, layer(0..3), system, cuttable, detachable, incision? }\`, with
\`mesh.userData.partId\` set and layer>0 meshes starting \`visible=false\`. Same part IDs as now
(the objectives in shell.js reference them: skin, muscle-wall, ventral-abdominal-vein, the four
limbs, liver-left/right/median, gall-bladder, frog-heart, lung-left/right, stomach,
small-intestine, large-intestine, cloaca, spleen, fat-body-left/right, kidney-left/right,
dorsal-aorta, vertebral-column; and for the heart: pericardium, epicardial-fat, lv-free-wall,
rv-free-wall, aorta, pulmonary-trunk, svc, lad, rca, circumflex, septum, papillary-a,
chordae-1..5, mitral-leaflet, aortic-cusp-1..3). You MAY add new detail parts, but keep the
existing IDs so the guided steps still resolve.

### Make it much better
- The frog currently reads as a green blob. Give it a believably FLATTENED, tapered body (dorsal
  surface gently domed, ventral flat), a distinguishable head with a faint tympanum and eye bulges,
  and limbs with actual segments (thigh/shank/foot) rather than smooth tubes. Supine, pinned.
- Organs must be individually recognisable in silhouette, not interchangeable ovoids: the liver in
  distinct lobes with a glossy capsule, the coiled small intestine as a real coil, kidneys as
  flattened beans, lungs as translucent sacs, the heart small and anterior. Use hand-tuned Lathe
  profiles, Tube curves, Extrude where it helps, and per-vertex value-noise for organic surface.
- Materials: wet, subsurface-ish tissue — moderate clearcoat, gentle sheen in warm reds, subtle
  translucency on lungs/mesentery. Vary hue per organ so a student can tell them apart at a glance.
  Avoid plastic uniformity and avoid flat-shaded facets unless intentional.
- The heart should read as myocardium: thick firm LV vs thin RV, real coronary tree on the surface.

Keep polycount reasonable (school laptop) — a few hundred k triangles total at most. Recompute
bounding volumes after any vertex edit. This is a teaching tool; a biology teacher will look at it,
so keep the anatomy honest even as you make it prettier.`,
  },

  {
    file: 'env.js',
    label: 'environment + lighting + bloom',
    brief: `Write \`${B}\\env.js\` — a NEW module that makes the whole scene look premium: a proper
lit dissection environment and post-processing. It is a function main.js calls once.

### Export exactly
\`\`\`js
export function setupEnvironment(THREE, deps, refs)
// deps = { EffectComposer, RenderPass, UnrealBloomPass, OutputPass }  (three r0.160 addons)
// refs = { scene, camera, renderer }
// returns {
//   render(),                 // call INSTEAD of renderer.render() each frame
//   resize(w, h),             // on window resize
//   setBloom(strength),       // optional runtime tweak
//   dispose()
// }
\`\`\`

### Build
- **Lighting**: replace flat ambient with a considered rig — a warm key from upper-front, a cool
  cyan rim from behind for separation, a soft fill, and a low emerald bounce, tuned so tissue reads
  as wet and dimensional against the near-black. Add a subtle \`HemisphereLight\`. No harsh clipping.
- **A dissection surface**: a large, dark, softly-reflective tray/table plane beneath the specimen
  with a faint grid or brushed-metal normal feel, and a soft radial gradient pool of light on it so
  the specimen sits in a place rather than floating in void. Keep it dark and out of the way.
- **A gentle environment** for the physical materials: build a small procedural gradient
  \`PMREMGenerator\` environment (dark studio) so clearcoat/sheen have something to reflect. Do NOT
  fetch an external HDR.
- **Post-processing** via the provided EffectComposer classes: RenderPass → UnrealBloomPass (subtle,
  threshold high so only speculars/emissive bloom, strength ~0.35, radius ~0.5) → OutputPass. This
  is what makes emissive hovers and wet speculars glow like the reference. \`render()\` runs the
  composer; \`resize()\` updates composer + bloom resolution.
- Tone mapping ACES, exposure ~1.1–1.25. Everything must stay dark, elegant, spatial.

Guard for missing deps (if a class is undefined, fall back to \`renderer.render\` and no bloom) so
the app never hard-fails if an addon URL is unavailable.`,
  },

  {
    file: 'shell.js',
    label: 'gesture UI + polish',
    brief: `Rewrite \`${B}\\shell.js\` to make the chrome and the HAND experience much better, while
preserving its exact public contract. **Read the current file first.**

### Preserve exactly (main.js calls these)
\`export const SHELL_CSS\` (string) and \`export function buildShell(root)\` returning an object with
AT LEAST these handles, same names/signatures: \`on(name,fn)\`, \`setTool(t)\`, \`setStructure(s)\`,
\`setSpecimen(spec,parts)\`, \`setHandState(s)\`, \`showViva(state)\`, \`say(text,opts)\`,
\`pushEvent(evt)\`, \`checkObjectives(state)\`, \`setObjective\`, \`setHint\`, \`setCameraPreview\`,
\`mountCards(specs,cb)\`. The events fired via \`on\`: 'specimen', 'tool', 'viva', 'hands'. Keep the
frog + heart OBJECTIVES arrays and their gating logic intact (they reference part IDs).

### Make it much better
- **The tool dock**: turn the flat left rail into something that feels like instruments. Bigger,
  clearer icons (probe, scalpel, forceps, pins, retractor), a satisfying active state, the number
  key shown, and a tooltip naming the tool and what it does. Consider an arc/radial arrangement
  echoing the reference's gesture menu — but it MUST stay usable by mouse and keyboard 1–5.
- **The hand panel**: much richer. When hands are on, show a proper live status (tracking / degraded
  / lost with the coloured dot), the current gesture as a labelled chip, a grip meter that fills
  with pinchStrength, and a clear "Stop camera" control. When off, an inviting "Use my hands" call
  with one line on what it does and that nothing is recorded. Add \`setHandState\` fields you need
  (e.g. gesture, grip) — extend, don't rename.
- **Hand onboarding**: the first time hands turn on, a brief, dismissable coach overlay: "Pinch to
  grip. Move your hand to aim. Open your hand to let go." Auto-hide after a few seconds or on first
  pinch. Never blocks the mouse path.
- **General polish**: tighten spacing, typography and motion so it matches the premium reference —
  glass panels, emerald/cyan accents, monospace micro-labels, purposeful transitions. The specimen
  must still dominate; chrome floats and recedes.

Do not break objective gating or the viva. Test in your head that every handle main.js uses still
exists with the same shape.`,
  },
]

const results = await parallel(JOBS.map((j) => () =>
  agent(
    `${REFERENCE}

## Your file
${j.brief}

Write the file with the Write tool. Then RE-READ it, confirm it parses and that every export in the
contract exists with the right shape. Return a precise summary.`,
    { label: j.label, phase: 'Refine', schema: {
      type: 'object',
      required: ['file', 'exports', 'summary', 'contractPreserved', 'notes'],
      properties: {
        file: { type: 'string' },
        exports: { type: 'array', items: { type: 'string' } },
        contractPreserved: { type: 'boolean' },
        summary: { type: 'string' },
        notes: { type: 'array', items: { type: 'string' }, description: 'Anything integration must wire or check' },
      },
    } }
  )
))

const ok = results.filter(Boolean)
log(`${ok.length}/${JOBS.length} refinements written`)
return {
  written: ok.map((r) => ({ file: r.file, exports: r.exports, preserved: r.contractPreserved, summary: String(r.summary).slice(0, 360) })),
  notes: ok.flatMap((r) => r.notes || []),
  failed: JOBS.length - ok.length,
}
