export const meta = {
  name: 'bioq-presence',
  description: 'Phase-1 presence pass: operating-theatre lighting, soft-body organ feel + idle life, 3D surgical instruments, AI voice narrator',
  phases: [{ title: 'Presence', detail: 'theatre · softbody · instruments · narrator' }],
}

const B = 'C:\\Users\\darsh\\biology-entelloq\\_build'

const SHARED = `
## The goal: PRESENCE, not more realism
A reviewer said the app already looks great but still feels like "manipulating a nice 3D model",
when it should feel like "I'm standing over an actual specimen." Your job is to close that gap.
Think Unreal-Engine medical simulation, not Three.js demo. Every choice should serve the feeling of
being in the room, over the table, with a real specimen.

## Build contract (this file concatenates into ONE module scope; no bundler)
- NO \`import\` statements. \`THREE\` is a function parameter. Addons arrive via a \`deps\` param when noted.
- Plain ES modules, three.js r0.160. \`Object3D.position\` is read-only — \`.position.set()\`.
- No top-level identifier may collide with another module's (a build guard rejects collisions) — so
  prefix your module-level constants/helpers uniquely (e.g. \`SB_\`, \`INST_\`, \`NAR_\`, \`OR_\`).
- Runs as-is: no TODOs, no placeholders, no external assets except an existing CDN.
- **Performance is presence too**: it must hold ~60fps on a mid laptop and degrade gracefully on a
  weak one. No per-frame allocation in hot paths; no per-frame full-geometry rebuilds unless gated.

## What already exists (read before you build)
- \`${B}\\anatomy.js\` — geometry+material toolkit (wet subsurface tissue: mat/organ/lobe/tube/vessel/
  childMesh/displace/seal, tissue classes, SPECIMENS, buildSpecimen). READ it.
- \`${B}\\frog.js\`, \`${B}\\heart.js\` — the specimens. Each part = one pickable Mesh (\`part.mesh\`,
  \`mesh.userData.partId\`), with decorative CHILD meshes that are NOT picked. Parts: {id,name,note,
  mesh,layer,system,cuttable,detachable,incision?}.
- \`${B}\\dissect.js\` — the engine. It raycasts \`parts.map(p=>p.mesh)\` NON-recursively. Anything you
  add to the scene that is NOT a registered part is automatically excluded from picking. It emits
  events via \`ctx.onEvent({kind, partId, text, meta})\`; kinds: hover, pin, incise, peel, retract,
  lift, replace, damage, discover.
- \`${B}\\env.js\` — current environment (\`setupEnvironment(THREE, deps, refs)\` -> {render,resize,
  setBloom,dispose}). refs = {scene,camera,renderer}.
- \`${B}\\main.js\` — the glue: creates everything, runs the loop, routes input (one abstract
  \`input={x,y,grip,gripping,span,source}\` drives dissect for BOTH hand and mouse). I will wire your
  module into main.js myself — just honour the export contract exactly.
`

phase('Presence')

const JOBS = [
  {
    file: 'env.js',
    label: 'operating theatre',
    schema: { type: 'object', required: ['file', 'summary', 'contractPreserved', 'perfNotes'],
      properties: { file: {type:'string'}, summary: {type:'string'}, contractPreserved: {type:'boolean'}, perfNotes: {type:'array', items:{type:'string'}} } },
    brief: `Rewrite \`${B}\\env.js\` to turn the scene into an OPERATING THEATRE. Keep the exact
contract: \`export function setupEnvironment(THREE, deps, refs)\` returning
\`{render(), resize(w,h), setBloom(s), dispose()}\`; deps may contain {EffectComposer, RenderPass,
UnrealBloomPass, OutputPass}; refs = {scene, camera, renderer}. It MUST still set \`scene.environment\`
(a dark PMREM studio) so the wet tissue's transmission refracts — do not remove that.

### The theatre (this is the #1 presence win — spend the effort)
- **Overhead surgical lamp.** A bright, slightly warm-white focused light directly above the
  specimen (use a shadow-casting \`SpotLight\` — no addon needed — with a realistic penumbra and a
  tight-ish cone). Add a VISIBLE fixture high above: a dark housing disc with a bright emissive
  centre, so the source of light is in the world. Optionally a second smaller fill lamp offset, as
  real theatres have twin lamps. The specimen should look SPOTLIT on a dark table.
- **Cool blue room ambient.** Low-intensity cool/blue ambient + hemisphere so shadows read cool and
  clinical while the lamp is warm — that warm-key / cool-shadow contrast is what sells "operating
  room". Keep overall levels dark; the specimen is the brightest thing by far.
- **Contact shadows.** Enable \`renderer.shadowMap\` (PCFSoftShadowMap) on the overhead lamp with a
  modest map (1024) so the specimen casts a soft grounded shadow on the table. ALSO add a cheap
  contact-shadow (a soft radial dark plane hugging just under the specimen) so grounding survives if
  shadow maps are disabled on a weak GPU.
- **The table + tray.** A large brushed-STAINLESS-STEEL operating table surface under the specimen
  (subtle anisotropic-ish reflection, dark, wet-looking), and a small instrument tray off to one
  side with a couple of dark metal instrument silhouettes on it (decorative). Optionally faint,
  very dark background suggestions of monitors / a room, kept far back and dim so they never compete
  with the specimen. Everything recedes; the specimen dominates.
- **Wet floor/table reflection.** The table should catch a soft, low reflection of the specimen's
  underside glow — even a cheap gradient sheen sells wetness.
- Keep bloom subtle (only speculars/emissive bloom). ACES tone mapping, exposure ~1.1-1.2.

### Robustness
Guard every fancy feature: if shadow maps or a class are unavailable, fall back gracefully (contact
plane instead of shadow map; no bloom if deps absent) — never a black screen. \`dispose()\` restores
prior background/environment and frees what you allocated. Return your perf notes (shadow map size,
light count, any fallback).`,
  },

  {
    file: 'softbody.js',
    label: 'soft-body + idle life',
    schema: { type: 'object', required: ['file', 'exports', 'summary', 'perfNotes'],
      properties: { file: {type:'string'}, exports: {type:'array',items:{type:'string'}}, summary: {type:'string'}, perfNotes: {type:'array',items:{type:'string'}} } },
    brief: `Write \`${B}\\softbody.js\` — a NEW module that makes organs feel SOFT and ALIVE. The
reviewer called this "probably the single biggest improvement". You are NOT integrating a physics
engine (no Ammo/Rapier) — you are faking soft-body convincingly with a spring-damper vertex model,
which is faster and controllable.

### Export exactly
\`\`\`js
export function createSoftBody(THREE, parts)
// returns {
//   press(partId, worldPoint, strength, radius),  // push tissue IN near a contact point
//   release(partId),                              // let it spring back
//   jiggle(partId, strength),                     // a quick wobble impulse (on grab/cut/lift)
//   setLife(on),                                  // idle physiology: breathing + heartbeat
//   update(dtMs),                                 // call every frame
//   dispose()
// }
\`\`\`

### How
- On \`createSoftBody\`, for each part with soft tissue (skip bone/vessel/pins — infer from
  part.system or a soft list: viscera, muscle, skin, lungs, liver, stomach, intestine, heart, fat),
  cache its ORIGINAL vertex positions (Float32Array copy) so every deformation is relative to rest.
- **Press/dent:** when \`press(partId, worldPoint, strength, radius)\` is called, transform the
  world point into the mesh's local space, and set a per-part target dent: vertices within \`radius\`
  move along the mesh normal at that point (inward), falling off smoothly with distance. Each part
  eases its current dent toward its target dent with a spring-damper each \`update\`. \`release\`
  sets target dent to 0 so it springs back. The mesh visibly compresses under the instrument and
  recovers — soft, not rigid.
- **Jiggle:** \`jiggle(partId, strength)\` injects a decaying oscillation (a damped sine over a
  low-frequency vertex wobble) so an organ wobbles when grabbed, cut, or dropped, then settles.
- **Idle life (\`setLife(true)\`):** a VERY SUBTLE, continuous motion so the specimen reads as alive
  rather than a prop — a slow breathing swell on the lungs/body wall (a few % scale on a ~0.25Hz
  sine), a faint rhythmic heartbeat pulse on the heart (~1Hz, a small quick contraction), and a
  barely-there drift on the gut. Keep amplitudes small and organic; this should whisper "alive", not
  wobble like jelly. Default OFF; main.js turns it on.
- After you mutate a part's geometry positions in a frame, call
  \`geometry.attributes.position.needsUpdate = true\`, recompute vertex normals, and — CRUCIAL for
  picking — recompute the bounding sphere/box for any part currently deforming (dissect.js's
  raycaster does a bounding-sphere reject; stale bounds make it unpickable). Only recompute bounds
  for parts that actually moved this frame, and you MAY throttle the bounds recompute to a few times
  per second (not every frame) to save cost — but the geometry itself updates every frame.

### Performance (this must stay smooth)
- Only deform parts that are actively pressed / jiggling / (if life on) breathing. Idle parts do
  ZERO work. Precompute per-part the small set of vertex indices within any plausible dent radius
  lazily. Cap the vertex count you touch; if a part is very high-poly, operate on a subset.
- No per-frame allocation. Reuse scratch vectors. This runs inside the render loop.
Return which parts you treat as soft, and your perf strategy.`,
  },

  {
    file: 'instruments.js',
    label: '3D surgical instruments',
    schema: { type: 'object', required: ['file', 'exports', 'summary', 'tools'],
      properties: { file: {type:'string'}, exports: {type:'array',items:{type:'string'}}, summary: {type:'string'}, tools: {type:'array',items:{type:'string'}} } },
    brief: `Write \`${B}\\instruments.js\` — a NEW module that replaces the floating cursor with an
ACTUAL surgical instrument in the scene that meets the tissue. "The tool becomes your hand."

### Export exactly
\`\`\`js
export function createInstruments(THREE, scene)
// returns {
//   setTool(name),   // 'probe'|'scalpel'|'forceps'|'pins'|'retractor'
//   update(state),   // state = { point:Vector3|null, normal:Vector3|null, grip:0..1,
//                    //           gripping:bool, active:bool, source:'hand'|'mouse' }
//   setVisible(on),
//   dispose()
// }
\`\`\`

### Build real instrument meshes (procedural, metal — no external assets)
- **scalpel**: a slim handle (dark knurled steel) + a bright angled blade. The blade tip touches
  the tissue; the handle angles up and back toward the "hand". Tilt to the cutting angle when
  \`gripping\`.
- **forceps / tweezers**: two fine prongs that OPEN and CLOSE with \`grip\` (grip 0 = open, 1 =
  pinched shut). Tips meet at the contact point.
- **probe / seeker**: a thin steel rod with a small ball tip; the ball rests on the tissue.
- **pins**: a pinning needle (or just show the probe form) — pins are also placed by dissect.js, so
  keep this minimal.
- **retractor**: a hooked/right-angle steel blade.
Give them believable stainless-steel PBR (metalness ~0.9, low roughness, subtle scratches ok).

### Placement (the presence trick)
Each frame, \`update(state)\`: if \`state.active\` and \`state.point\`, move the active tool so its
WORKING TIP sits exactly at \`state.point\`, and orient the instrument so it approaches ALONG the
surface normal at a natural, slightly oblique surgeon's angle (not dead perpendicular) — the shaft
leaning back toward the viewer/camera. Smoothly interpolate position/orientation (lerp/slerp) so it
glides rather than snaps. Hide the tool when \`!active\` or \`point\` is null (e.g. cursor off the
specimen). Only ONE tool visible at a time (the current one). A faint contact highlight / tiny
specular glint where the tip meets tissue is a nice touch.

### Contract
These meshes are added to \`scene\` (or a sub-group you add) but are NEVER registered as parts, so
dissect.js will not pick them — good, keep it that way. No per-frame allocation. Return the tool
list you built.`,
  },

  {
    file: 'narrator.js',
    label: 'AI voice narrator + OR ambience',
    schema: { type: 'object', required: ['file', 'exports', 'summary'],
      properties: { file: {type:'string'}, exports: {type:'array',items:{type:'string'}}, summary: {type:'string'} } },
    brief: `Write \`${B}\\narrator.js\` — a NEW module: an AI voice demonstrator that WATCHES and
SPEAKS contextually as the student works, plus subtle operating-room ambience. This is pure
browser (Web Speech + WebAudio), no network.

### Export exactly
\`\`\`js
export function createNarrator()
// returns {
//   observe(evt),          // evt = {kind, partId, text, meta} from dissect.js's event stream
//   setVoice(on),          // enable/disable spoken narration (default off until user opts in)
//   setAmbient(on),        // enable/disable OR ambient sound (default off)
//   speak(text),           // force a line
//   dispose()
// }
\`\`\`

### Voice (speechSynthesis)
- Pick a good available voice: prefer an en-GB/en-US, non-robotic one; fall back sensibly. Set a
  calm demonstrator rate (~0.95) and neutral pitch.
- Narrate CONTEXTUALLY and like a real demonstrator, not by reading UI text verbatim. Maintain a
  small curated library keyed by (kind, partId/system) so touching the liver says something like
  "There — the liver. The largest organ in the body; note the deep maroon and the way it fills the
  front of the cavity," rotating/examining the heart mentions the thicker left ventricular wall,
  revealing a layer comments on what's now exposed, and damage prompts a calm "careful — that vessel
  won't recover." Write natural lines for the key frog + heart structures and for each event kind.
- **Do not be annoying**: debounce (don't speak more than ~once per 2.5s), never repeat the same
  line twice in a row, vary phrasing when the same structure recurs, and stay quiet during rapid
  hover sweeps — only speak on meaningful events (probe/discover/reveal/lift/damage), and at most a
  brief acknowledgement on hover-settle. Cancel a pending utterance if a more important event fires.
- If \`speechSynthesis\` is unavailable, no-op cleanly.

### Ambience (WebAudio, very subtle, default off)
- A low room tone (filtered noise bed, barely audible) and a slow, soft heart-monitor beep (~1/sec,
  a short sine blip) — clinical, calm, low volume. Toggle with \`setAmbient\`. Build the AudioContext
  lazily on first enable (autoplay policy). Keep it tasteful — presence, not a hospital drama.

Return your exports and a note on the voice/ambient approach.`,
  },
]

const results = await parallel(JOBS.map((j) => () =>
  agent(
    `${SHARED}

## Your file
${j.brief}

Write the file with the Write tool, then RE-READ it: confirm it parses, exports match the contract,
no static imports, no top-level name collisions likely, and hot paths don't allocate. Return a
precise summary.`,
    { label: j.label, phase: 'Presence', effort: 'high', schema: j.schema }
  )
))

const ok = results.filter(Boolean)
log(`${ok.length}/${JOBS.length} presence modules written`)
return {
  written: ok.map((r) => ({ file: r.file, exports: r.exports || null, summary: String(r.summary).slice(0, 380) })),
  perf: ok.flatMap((r) => r.perfNotes || []),
  failed: JOBS.length - ok.length,
}
