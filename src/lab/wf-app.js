export const meta = {
  name: 'bioq-dissection-app',
  description: 'Build the hand-driven dissection app in four parallel modules against a fixed interface',
  phases: [{ title: 'Modules', detail: 'hands · anatomy · dissection · shell' }],
}

const OUT = 'C:\\Users\\darsh\\biology-entelloq\\_build'
const REFS = 'C:\\Users\\darsh\\AppData\\Local\\Temp\\claude\\C--Users-darsh\\0bb8c4f3-60ac-4aab-ac64-e6888406691d\\scratchpad\\refs'
const LIB = 'C:\\Users\\darsh\\biology-entelloq\\lib\\hands'

/* ---------------------------------------------------------------------------
 * THE CONTRACT. Every agent writes ONE ES module to _build/. I concatenate them
 * into one HTML file afterwards, so they must not import each other and must not
 * assume a bundler. They receive `THREE` as a parameter rather than importing it.
 * This is the whole integration risk, so it is stated once, identically, to all.
 * ------------------------------------------------------------------------- */
const CONTRACT = `
## What is being built
**A virtual dissection app.** A student picks a specimen, and dissects it *with their hands* in
front of a webcam — pin it out, cut the skin, peel back layers, lift organs out, look inside. The
point is learning to dissect and seeing biology, not reading about it. Mouse must work identically
for anyone without a camera.

## Hard integration contract — follow it exactly
- Write ONE file, an ES module, to the exact path you are given under \`${OUT}\`.
- **Do not import anything.** No \`import\` statements at all. three.js arrives as a function
  parameter named \`THREE\`. MediaPipe is loaded by your own dynamic \`import()\` at runtime only in
  the hands module. Everything else is plain JS.
- Export named functions with \`export\`. Another process concatenates these files into a single
  self-contained HTML, so top-level names must be unique-ish and prefixed where generic.
- No DOM assumptions outside your own remit. No CSS except in the shell module.
- Target three.js r0.160 API. \`Object3D.position\` is read-only — use \`.position.set()\`.
- Code must run as-is. No TODOs, no placeholders, no "implementation left as an exercise".

## The 2.5D law (non-negotiable, it is a physical fact not a preference)
Monocular hand depth is unusable. **No gesture may use hand-Z as its primary axis.** Build on
2D cursor position, pinch aperture, two-hand span, finger-extension pattern, and in-plane roll.
Depth comes from the SCENE — raycast from the 2D cursor and snap to the surface you hit. A student
reaches "into" the specimen because the ray hits a deeper layer, never because their hand moved
toward the camera.

## Style
Dark, precise, scientific. Emerald #34d399 / cyan #38e0d8 on near-black #04070a. The specimen
dominates; chrome floats and stays out of the way. Comment the non-obvious decisions only.
`

phase('Modules')

const JOBS = [
  {
    file: 'hands.js',
    label: 'module: hands (MediaPipe)',
    brief: `Write \`${OUT}\\hands.js\` — the hand-tracking pipeline. **This is the feature the whole
app exists for and it must genuinely work**, not be a stub.

### Port, don't reinvent
Working, correct code already exists — read it and port it to vanilla JS:
- \`${LIB}\\smoothing.ts\` — a textbook-correct One Euro filter (Casiez 2012). Port verbatim.
- \`${LIB}\\classifier.ts\` — pinch hysteresis (enter 0.42 / release 0.6 of hand size) and a
  continuous \`pinchStrength\`. Port verbatim; the hysteresis is what stops flicker.
- \`${LIB}\\landmarks.ts\` — handSize, pinchRatio, isFingerExtended, palmRoll, pinchPoint.
- \`${REFS}\\gesture_core.txt\` — a well-documented reference classifier; mine it for the
  open-hand/spread heuristics.
- \`${REFS}\\threejs-handtracking-101-main\\index.html\` — a WORKING MediaPipe + three.js demo.
  Read it for the exact loading and per-frame call pattern that is known to work.

### Load MediaPipe like this
Dynamic import from CDN inside \`start()\`, so nothing is fetched unless the student opts in:
\`const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14')\`
then \`FilesetResolver.forVisionTasks(...)\` and \`HandLandmarker.createFromOptions\` with
\`numHands: 2\`, \`runningMode: 'VIDEO'\`, GPU delegate with CPU fallback. The model URL is the
standard \`hand_landmarker.task\` on storage.googleapis.com. Call \`detectForVideo(video, ts)\`
once per animation frame, guarding against the same timestamp twice (it throws).

### Export exactly this
\`\`\`js
export function createHands() // returns the tracker
// tracker.start()  -> async, requests camera, resolves {ok:true} or {ok:false, reason}
// tracker.stop()   -> stops tracks so the OS camera light goes OUT
// tracker.update(nowMs) -> call once per frame; runs detection, returns nothing
// tracker.snapshot -> a LONG-LIVED MUTABLE object, never reallocated:
//   { active, health, hands:[ {present, handedness, gesture, pinchStrength, isPinching,
//                              cursor:{x,y}, indexTip:{x,y}, roll, span} ] }
//   cursor/indexTip are normalised 0..1, ALREADY One-Euro filtered, and ALREADY
//   x-mirrored so moving your hand right moves the cursor right.
// tracker.videoEl -> the <video> element, for an optional self-view
\`\`\`
\`gesture\` ∈ 'none'|'pinch'|'point'|'fist'|'open'. \`span\` is two-hand separation (0 if one hand).

### Also required
- **Health/degradation**: track detection continuity over a sliding window. Expose
  \`health\` 0..3 (0 healthy → 3 lost). On loss during a grip, FREEZE rather than teleport.
- **Never expose raw landmarks to the app.** The app must be structurally unable to draw a
  hand skeleton. Keep landmarks private inside the module.
- Camera OFF by default; only \`start()\` touches getUserMedia. Nothing is recorded or uploaded.
- Handle: permission denied, no camera, model fetch failure, tab backgrounded. Return clear reasons.`,
  },

  {
    file: 'anatomy.js',
    label: 'module: anatomy',
    brief: `Write \`${OUT}\\anatomy.js\` — the specimens, built to be *dissected*, i.e. LAYERED.

Build **two specimens**, both far better looking than lathes-and-cones. Use real modelling
technique: \`LatheGeometry\` with hand-tuned profiles, \`TubeGeometry\` along \`CatmullRomCurve3\`,
\`ExtrudeGeometry\` with bevels, \`SphereGeometry\` with per-vertex noise displacement for organic
irregularity, and merged/vertex-coloured geometry where it helps. Displace vertices with a cheap
value-noise so nothing reads as a primitive.

### 1. \`frog\` — the classic teaching dissection, ventral, pinned supine
Layers, outermost first: **skin** (mottled olive dorsal / pale ventral, with a mid-ventral line
where the first incision goes) → **abdominal muscle wall** (with the ventral abdominal vein
running in the midline — cutting it blind is the documented classic first-attempt failure) →
**viscera**: heart in pericardium, paired lungs, three-lobed liver (large, dominates the cavity),
gall bladder tucked under it, stomach, small intestine coiled, large intestine, cloaca, spleen,
paired kidneys with adrenal streaks on the dorsal wall, fat bodies (orange finger-like), gonads
(ovaries with eggs / testes), urinary bladder. Then **deep**: spinal column, dorsal aorta.

### 2. \`heart\` — mammalian, for the circulation
Pericardium → epicardial fat → myocardium (thick LV vs thin RV) → chambers, atria, auricles,
great vessels (aorta, pulmonary trunk, SVC, IVC), coronary tree (LAD, RCA, circumflex, posterior
interventricular), and internally: interventricular septum, mitral + tricuspid leaflets, chordae
tendineae in discrete groups, papillary muscles, semilunar cusps.

### Export exactly this
\`\`\`js
export const SPECIMENS = { frog:{id,name,blurb,camera:{pos:[x,y,z],target:[x,y,z]}}, heart:{...} }
export function buildSpecimen(THREE, id)
// returns { group, parts }
// parts: array of {
//   id, name, note,            // note = one line a demonstrator would say
//   mesh,                      // THREE.Mesh, added to group
//   layer,                     // 0 skin, 1 muscle, 2 viscera, 3 deep
//   system,                    // 'integument'|'muscular'|'digestive'|'circulatory'|
//                              // 'respiratory'|'urogenital'|'nervous'|'skeletal'
//   cuttable, detachable,      // booleans
//   incision                   // optional [[x,y,z],...] authored cut path in local space
// }
\`\`\`
Every part's mesh must carry \`mesh.userData.partId\`. Parts of layer > 0 start \`visible=false\`
if they are enclosed — the dissection module reveals them.

Anatomical relationships must be right: the liver really does dominate a frog's cavity and hide
the stomach; the heart sits anterior between the lungs; kidneys are dorsal and retroperitoneal.
This is a teaching tool and a biology teacher will look at it.`,
  },

  {
    file: 'dissect.js',
    label: 'module: dissection engine',
    brief: `Write \`${OUT}\\dissect.js\` — the dissection mechanics. Input-agnostic: it receives an
abstract pointer + grip, so the SAME code is driven by a hand or a mouse.

### Export exactly this
\`\`\`js
export function createDissection(THREE, ctx)
// ctx = { scene, camera, group, parts, onEvent(evt) }
// returns an engine with:
//   setTool(t)                     // 'probe'|'scalpel'|'forceps'|'pins'|'retractor'
//   update(input, dtMs)            // called every frame
//   state                          // {pinned, incisions, opened:Set, removed:Set, damage:[]}
//   hovered, grabbed               // partIds or null
//   dispose()
// input = { x, y,                  // cursor, normalised 0..1, ANY source
//           grip,                  // 0..1 continuous engagement (pinchStrength or mouse-down)
//           gripping,              // boolean, hysteresed by the caller
//           span,                  // two-hand separation 0..1, for retraction
//           source }               // 'hand'|'mouse' — for telemetry only, never behaviour
\`\`\`

### The mechanics that must actually work
1. **Raycast + surface snap.** Cursor → ray → topmost *visible, un-removed* part. That hit point
   IS the depth. Never read hand Z.
2. **Pinning.** With \`pins\`, tap the four limbs to pin the specimen out. Until pinned, the skin
   is under no tension and the scalpel refuses to start a cut — that is how a real bench works and
   it teaches why you pin.
3. **Incision.** With \`scalpel\` + grip held, dragging traces a cut. Sample the stroke: build a
   polyline in the part's local space and grow a visible cut line along it (a thin dark
   \`TubeGeometry\` regenerated as it grows, or a line whose geometry you extend). Two qualities
   matter and must be measured, not faked: **depth** from grip strength, and **smoothness** from
   speed variance. A sawing stroke (high variance) shreds; a plunging stroke (grip > 0.8 on the
   first sample) cuts through into whatever is underneath and damages it.
4. **Flaps.** When an incision on a layer-0/1 part is long enough, that part becomes peelable:
   with \`forceps\`, grip and drag a flap edge to fold it back — animate a rotation about the cut
   axis, and leave it folded. Reveal the layer beneath by making enclosed parts of layer+1 visible.
5. **Retraction.** \`retractor\` + two-hand \`span\` opens the body wall wider, proportionally.
6. **Lifting organs.** \`forceps\` grip on a \`detachable\` visceral part lifts it clear along the
   view axis and out; \`state.removed\` records it. Releasing over the cavity puts it back;
   releasing outside the cavity leaves it on the tray beside the specimen.
7. **Damage.** Cutting a part that is not the current target, cutting too deep, or cutting a
   vessel: record it in \`state.damage\` and change the part's material to read as damaged. Damage
   is IRREVERSIBLE within an attempt and must be visible.
8. **Events.** Emit through \`ctx.onEvent\` with \`{kind, partId, text, meta}\`;
   kind ∈ 'hover'|'pin'|'incise'|'peel'|'retract'|'lift'|'replace'|'damage'|'discover'.

Hover must feel instant and precise — that is most of the perceived quality. Use a subtle
emissive lift on hover, and a stronger one on grab.`,
  },

  {
    file: 'shell.js',
    label: 'module: shell + guidance',
    brief: `Write \`${OUT}\\shell.js\` — everything the student sees around the specimen, plus the
teaching layer.

### Export exactly this
\`\`\`js
export const SHELL_CSS = \\\`...\\\`          // a template-literal string of all CSS
export function buildShell(root)            // injects DOM into root, returns handles
// handles: { setSpecimen, setTool, setObjective, setHint, say, setStructure,
//            pushEvent, setHandState, setCameraPreview, showViva, on(name,fn) }
\`\`\`

### Screens and surfaces
- **Specimen picker** — full-bleed, dark, two big cards (Frog, Heart) with the blurb. This is the
  entry point, not a marketing page.
- **The workspace** — full-bleed 3D viewport with floating glass chrome: objective strip top-centre;
  vertical tool dock left (probe, scalpel, forceps, pins, retractor) with number keys 1–5; a
  structure readout right that appears on hover with name + the demonstrator's one-line note;
  hint line bottom-centre; demonstrator panel bottom-right.
- **Hand control** — a clearly labelled "Use my hands" control that starts the camera, plus live
  state: tracking healthy / degraded / lost, and a *small* self-view the student can toggle. NEVER
  draw a hand skeleton. Show a soft cursor dot in the viewport instead, whose radius grows with
  grip strength — that is the only visualisation of the hand the student ever gets.
- **Layer/system view** — a toggle strip to fade systems in and out (digestive, circulatory, …)
  for the *visualise biology* half of the product, independent of cutting.
- **Guidance** — an objective list per specimen that gates on real dissection events, never a
  Next button. For the frog: pin it out → midline skin incision → reflect the skin flaps →
  incise the muscle wall avoiding the ventral abdominal vein → retract → identify liver, heart,
  lungs, stomach, intestine, kidneys → lift the liver to expose the gall bladder and stomach.
- **Record + viva** — a running event record (press L) and, at the end, a short text viva whose
  questions are built from what the student actually did and damaged.

Keyboard must reach everything: tool keys, Tab to cycle structures, Enter to act, arrows to rotate.`,
  },
]

const results = await parallel(JOBS.map((j) => () =>
  agent(
    `${CONTRACT}

## Your file
${j.brief}

Write the file with the Write tool. Then RE-READ it and check it parses as valid JS and that every
export named in the contract exists with the right shape. Return a precise summary.`,
    { label: j.label, phase: 'Modules', schema: {
      type: 'object',
      required: ['file', 'exports', 'summary', 'assumptions'],
      properties: {
        file: { type: 'string' },
        exports: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
        assumptions: { type: 'array', items: { type: 'string' }, description: 'Anything you assumed about the other modules that integration must check' },
      },
    } }
  )
))

const ok = results.filter(Boolean)
log(`${ok.length}/${JOBS.length} modules written`)
return {
  written: ok.map(r => ({ file: r.file, exports: r.exports, summary: String(r.summary).slice(0, 400) })),
  assumptions: ok.flatMap(r => r.assumptions || []),
  failed: JOBS.length - ok.length,
}
