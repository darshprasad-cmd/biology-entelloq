/*
 * imaging.js — the radiology suite.
 *
 * The point of this module is NOT "four nice greyscale filters". It is that all
 * four modalities are driven from ONE table of physical tissue properties, so a
 * structure that is bright on X-ray is bright on the CT bone window, invisible on
 * T1, and casts an acoustic shadow on ultrasound — *because it is dense*, not
 * because four separate shaders were hand-tuned to agree. Coherence across
 * modalities is the entire teaching payload: it is how a student learns that
 * "bright" means something different in every room of a radiology department.
 *
 * Per tissue we store:
 *   hu    Hounsfield units      (CT greyscale, and — via mu = mu_water*(1+HU/1000) —
 *                                the X-ray linear attenuation coefficient)
 *   t1    T1-weighted signal    (0..1; fat brightest, fluid dark, cortical bone void)
 *   t2    T2-weighted signal    (0..1; fluid brightest — the "water sequence")
 *   z     acoustic impedance    (MRayl; interface echo = |z1-z2|/(z1+z2))
 *   att   acoustic attenuation  (dB/cm/MHz; drives shadowing and enhancement)
 *   echo  parenchymal echogenicity (speckle mean brightness)
 *
 * THE MOST DANGEROUS THING IN THIS FILE is the material swap. Every mesh whose
 * material we replace is recorded in a Map, and setMode('off') puts the ORIGINAL
 * object reference back. We never mutate a property on an original material —
 * dissect.js drives .emissive/.opacity/.color on those and would silently inherit
 * whatever we left behind. Swap the reference, never the contents.
 *
 * Contract (main.js depends on it):
 *   createImaging(THREE, scene, camera, renderer, parts)
 *     -> { setMode, mode, setSlice, setWindow, update, resize, dispose, ... }
 *
 * WHILE ANY MODE IS ON, main.js MUST NOT CALL dissection.update(). Imaging forces
 * every part mesh visible (that is the whole point — you see what you have not cut
 * down to yet), and dissect.js picks against mesh.visible, so leaving it running
 * would let a probe hover organs three layers deep. dissect.js's damage() also
 * writes material.color unguarded, which our shader materials do not have. The
 * wiring note spells this out.
 */

/* ---- physical tissue table ------------------------------------------------ */
/* Values are the textbook ones, not invented. HU: air -1000, fat -90, water 0,
 * muscle +45, liver +60, cortical bone +900 (a small animal's bone is far less
 * dense than a human femur, so +900 rather than +1800). MR signal is expressed
 * 0..1 as displayed brightness on a routine spin-echo; the two facts a student
 * must leave with are encoded here: liver > spleen on T1 and spleen > liver on
 * T2, and fluid is dark on T1 / brilliant on T2. */
const IMG_TIS = {
  air:        { hu: -1000, t1: 0.01, t2: 0.01, z: 0.0004, att: 12.0, echo: 0.95 },
  lung:       { hu:  -740, t1: 0.06, t2: 0.10, z: 0.10,   att:  8.0, echo: 0.88 },
  fat:        { hu:   -95, t1: 0.95, t2: 0.62, z: 1.38,   att:  0.63, echo: 0.50 },
  fluid:      { hu:     4, t1: 0.06, t2: 0.98, z: 1.48,   att:  0.02, echo: 0.02 },
  blood:      { hu:    50, t1: 0.28, t2: 0.55, z: 1.66,   att:  0.18, echo: 0.05 },
  // Vessel WALL rather than lumen: on spin-echo MR flowing blood is a signal
  // void, which is why the great vessels read dark on both weightings here.
  vessel:     { hu:    45, t1: 0.20, t2: 0.22, z: 1.72,   att:  0.90, echo: 0.62 },
  muscle:     { hu:    45, t1: 0.42, t2: 0.26, z: 1.70,   att:  1.09, echo: 0.34 },
  myocardium: { hu:    45, t1: 0.44, t2: 0.30, z: 1.70,   att:  1.00, echo: 0.40 },
  liver:      { hu:    60, t1: 0.58, t2: 0.34, z: 1.65,   att:  0.94, echo: 0.46 },
  spleen:     { hu:    47, t1: 0.36, t2: 0.60, z: 1.65,   att:  0.90, echo: 0.42 },
  kidney:     { hu:    32, t1: 0.38, t2: 0.48, z: 1.62,   att:  0.90, echo: 0.30 },
  // Gut is a mixture: a thin soft-tissue wall around lumenal gas and chyme. Its
  // acoustic attenuation is high and its impedance jump enormous, which is
  // exactly why bowel gas ruins an abdominal ultrasound.
  gut:        { hu:    18, t1: 0.34, t2: 0.42, z: 1.20,   att:  2.60, echo: 0.55 },
  skin:       { hu:    45, t1: 0.48, t2: 0.32, z: 1.62,   att:  1.60, echo: 0.72 },
  fibrous:    { hu:    75, t1: 0.22, t2: 0.14, z: 1.75,   att:  2.20, echo: 0.78 },
  valve:      { hu:    58, t1: 0.26, t2: 0.20, z: 1.76,   att:  1.80, echo: 0.85 },
  tendon:     { hu:    95, t1: 0.14, t2: 0.08, z: 1.80,   att:  4.70, echo: 0.90 },
  bone:       { hu:   900, t1: 0.10, t2: 0.06, z: 7.80,   att:  6.50, echo: 0.95 },
  marrow:     { hu:   180, t1: 0.88, t2: 0.55, z: 1.55,   att:  0.80, echo: 0.45 },
  // The coupling medium. You cannot scan a specimen sitting in air — the skin/air
  // interface reflects ~99.9% of the beam. Real superficial scanning is done in a
  // water bath, so that is what the ultrasound mode says it is doing.
  water:      { hu:     0, t1: 0.05, t2: 0.96, z: 1.48,   att:  0.002, echo: 0.004 },
};

/* Explicit per-part overrides where the general keyword rules would be wrong.
 * Keyed on part.id, so a new specimen simply falls through to the keyword pass. */
const IMG_BY_ID = {
  'skin': 'skin',
  'muscle-wall': 'muscle',
  'ventral-abdominal-vein': 'blood',
  'gall-bladder': 'fluid',            // bile is water-density: dark T1, bright T2
  'urinary-bladder': 'fluid',
  'frog-heart': 'myocardium',
  'spleen': 'spleen',
  'oesophagus': 'gut',
  'stomach': 'gut',
  'small-intestine': 'gut',
  'large-intestine': 'gut',
  'cloaca': 'gut',
  'dorsal-aorta': 'vessel',
  'vertebral-column': 'bone',
  'pericardium': 'fibrous',
  'epicardial-fat': 'fat',
  'septum': 'myocardium',
  'moderator-band': 'myocardium',
  'coronary-sinus': 'blood',
  'aorta': 'vessel',
  'pulmonary-trunk': 'vessel',
  'svc': 'vessel',
  'ivc': 'vessel',
  'pulmonary-veins': 'vessel',
};

/* Keyword fallbacks, checked in order — first match wins, so put the specific
 * terms above the general ones (a "papillary muscle" must not be caught by the
 * word "muscle" before the myocardial rule fires). */
const IMG_KEYS = [
  [/liver|hepat/i, 'liver'],
  [/kidney|renal|nephr/i, 'kidney'],
  [/spleen|splen/i, 'spleen'],
  [/lung|pulmonary sac|alveol/i, 'lung'],
  [/fat body|adipose|\bfat\b/i, 'fat'],
  [/chordae|tendine|tendon/i, 'tendon'],
  [/valve|cusp|leaflet/i, 'valve'],
  [/pericard|linea|fasci/i, 'fibrous'],
  [/bone|vertebr|skelet|urostyle|femur|sternum/i, 'bone'],
  [/aorta|vena cava|\bveins?\b|arteri|\bartery\b|\btrunk\b|vessel|\bsinus\b/i, 'vessel'],
  [/ventricle|atrium|auricle|myocard|papillary|septum|band/i, 'myocardium'],
  [/bladder|gall|bile|urine|cyst/i, 'fluid'],
  [/stomach|intestine|oesoph|esoph|duoden|colon|rect|cloaca|gut|bowel/i, 'gut'],
  [/skin|integu|epiderm/i, 'skin'],
  [/muscle|limb|wall/i, 'muscle'],
];

const IMG_MODES = ['off', 'xray', 'ct', 'mri', 'ultrasound'];

/* Window presets. Choosing a window is a real radiological skill: the same scan
 * shows lung OR mediastinum OR bone depending only on these two numbers, and a
 * student who has never scrubbed a window does not understand what a CT is. */
const IMG_PRESETS = {
  ct: [
    { id: 'soft',  name: 'SOFT TISSUE', l: 40,   w: 400 },
    { id: 'liver', name: 'LIVER',       l: 80,   w: 150 },
    { id: 'lung',  name: 'LUNG',        l: -600, w: 1500 },
    { id: 'bone',  name: 'BONE',        l: 400,  w: 1800 },
  ],
  // MR window values are in arbitrary signal-intensity units, exactly as on a
  // real console — there is no Hounsfield equivalent in MR. Signal 0..1 -> 0..1000.
  mri: [
    { id: 'std',    name: 'STANDARD', l: 500, w: 1000 },
    { id: 'narrow', name: 'NARROW',   l: 480, w: 520 },
    { id: 'wide',   name: 'WIDE',     l: 560, w: 1500 },
  ],
};

/* Scan-plane naming. See IMG_pickAxes for why the longest / shortest bounding
 * extents identify the transverse and coronal planes. */
const IMG_PLANE_NAMES = ['TRANSVERSE', 'SAGITTAL', 'CORONAL'];

/* ---- shaders -------------------------------------------------------------- */
/* X-ray. The physics that matters: for a CONVEX body the chord a ray cuts is
 * proportional to |N·V| at the entry point — longest through the middle, zero at
 * the silhouette. Drawing FRONT AND BACK faces with additive blending sums the
 * two halves into the full chord, which is why overlapping structures genuinely
 * get brighter instead of the newest one winning. depthWrite AND depthTest are
 * both off: a radiograph has no occlusion, only summation. Anyone who "fixes"
 * this into a single-sided fresnel rim has thrown away the whole effect. */
const IMG_XRAY_VS = `
varying vec3 vNrm;
varying vec3 vVdir;
void main() {
  vNrm = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vVdir = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const IMG_XRAY_FS = `
uniform float uMu;      // linear attenuation coefficient, per world unit
uniform float uThick;   // ellipsoid radius along the view axis, world units
uniform float uGain;
uniform float uTime;
uniform vec2  uRes;
varying vec3 vNrm;
varying vec3 vVdir;

float imgHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float cosI = abs(dot(normalize(vNrm), normalize(vVdir)));
  float a = uMu * uThick * cosI * uGain;

  // Grain and vignette are applied MULTIPLICATIVELY on every term, which is the
  // only way they survive additive blending — an added constant would stack once
  // per overlapping organ and turn the film into fog.
  float g = imgHash(gl_FragCoord.xy + vec2(uTime, uTime * 1.7)) - 0.5;
  a *= 1.0 + g * 0.11;

  vec2 q = gl_FragCoord.xy / uRes - 0.5;
  a *= 1.0 - dot(q, q) * 0.62;

  // Faintly cool: CR plates are not neutral grey, and the tint is what stops it
  // reading as a generic "hologram" shader.
  gl_FragColor = vec4(max(a, 0.0) * vec3(0.955, 0.978, 1.0), 1.0);
  #include <colorspace_fragment>
}`;

/* CT / MR sectional slab. Deliberately UNLIT. A tomographic image has no light
 * source and no specular — every pixel is a physical measurement mapped through
 * a window, and the instant you add a highlight it stops reading as a scan and
 * starts reading as a 3D model in greyscale. The only shading term is the
 * partial-volume edge, which is a real artefact, not decoration. */
const IMG_SLICE_VS = `
#include <common>
#include <clipping_planes_pars_vertex>
varying vec3 vNrm;
varying vec3 vVdir;
void main() {
  vNrm = normalize(normalMatrix * normal);
  #include <begin_vertex>
  #include <project_vertex>
  vVdir = -mvPosition.xyz;
  #include <clipping_planes_vertex>
}`;

const IMG_SLICE_FS = `
#include <common>
#include <clipping_planes_pars_fragment>
uniform float uHu;        // Hounsfield units
uniform float uT1;        // 0..1 T1 signal
uniform float uT2;        // 0..1 T2 signal
uniform float uWeight;    // 0 = T1, 1 = T2
uniform float uModality;  // 0 = CT, 1 = MR
uniform float uLevel;
uniform float uWidth;
uniform float uNoise;
uniform float uSeed;
varying vec3 vNrm;
varying vec3 vVdir;

void main() {
  #include <clipping_planes_fragment>

  float raw = mix(uHu, mix(uT1, uT2, uWeight) * 1000.0, uModality);
  float v = clamp((raw - (uLevel - uWidth * 0.5)) / max(uWidth, 1.0), 0.0, 1.0);

  // Partial-volume averaging: where the surface grazes the slice, one voxel holds
  // both this tissue and the next, so its value drifts toward the mean. This is
  // why small or obliquely-cut structures look washed out on a thick-slice study
  // — a real limitation students should meet, not a bug to polish away.
  float cosI = abs(dot(normalize(vNrm), normalize(vVdir)));
  v = mix(v * 0.70 + 0.11, v, smoothstep(0.0, 0.42, cosI));

  // Quantum mottle. Locked to pixel position and a per-slice seed so it behaves
  // like image noise (frozen within one image, different on the next) rather
  // than like a crawling film grain.
  float n = fract(sin(dot(gl_FragCoord.xy + vec2(uSeed), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  v = clamp(v + n * uNoise, 0.0, 1.0);

  // v is a DISPLAY grey (that is what a window/level mapping produces). Undo the
  // display transfer here so the pipeline's own linear->sRGB step puts it back
  // exactly — this is what keeps the image identical with and without the bloom
  // composer, whose render target is linear.
  gl_FragColor = vec4(pow(vec3(v), vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}`;

/* Ultrasound sector. The beam physics is computed on the CPU (see IMG_scan) and
 * arrives as a small polar texture: R = interface echo, G = parenchymal
 * echogenicity, B = cumulative attenuation along the beam. The shader's job is
 * the DISPLAY chain a real machine applies — time-gain compensation, speckle,
 * and logarithmic compression — plus the sector mask. */
const IMG_US_VS = `
varying vec2 vUvp;
void main() {
  vUvp = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const IMG_US_FS = `
uniform sampler2D uScan;
uniform float uHalf;     // sector half-angle, radians
uniform float uDepth;    // world units from apex to far field
uniform float uWidth;    // quad width in world units
uniform float uNear;     // skin-line standoff
uniform float uTgc;      // assumed average soft-tissue attenuation, dB per unit
uniform float uAttMax;   // dB encoded by B = 1.0
uniform float uGain;
uniform float uComp;     // log-compression (dynamic range) knob
uniform float uTime;
varying vec2 vUvp;

float imgHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float imgNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = imgHash(i), b = imgHash(i + vec2(1.0, 0.0));
  float c = imgHash(i + vec2(0.0, 1.0)), d = imgHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  // Quad space -> probe polar space. The apex sits at the top edge centre.
  vec2 p = vec2((vUvp.x - 0.5) * uWidth, (1.0 - vUvp.y) * uDepth);
  float r = length(p);
  float th = atan(p.x, max(p.y, 1e-4));
  if (r > uDepth || abs(th) > uHalf) discard;

  vec4 s = texture2D(uScan, vec2(th / (2.0 * uHalf) + 0.5, r / uDepth));

  // Speckle is NOT film grain. It is coherent interference within the resolution
  // cell, so it lives in beam coordinates (angle, range) — which is why holding
  // a constant angular frequency automatically makes the speckle cells fan out
  // and coarsen with depth, exactly as they do on a real machine.
  float sp = imgNoise(vec2(th * 340.0, r * 150.0)) * 0.62
           + imgNoise(vec2(th * 120.0, r * 52.0)) * 0.38;
  // A slow decorrelation so a still probe still looks LIVE rather than frozen.
  sp = mix(sp, imgNoise(vec2(th * 340.0 + uTime * 0.6, r * 150.0 - uTime * 0.4)), 0.35);

  // Time-gain compensation: the machine amplifies with depth to cancel the
  // AVERAGE soft-tissue loss. Everything interesting is the residual — bone
  // over-attenuates and leaves a shadow, fluid under-attenuates and leaves
  // posterior enhancement. Both fall out of this one line.
  float dB = s.b * uAttMax - uTgc * r;
  float gain = exp(-dB * 0.1151);            // dB -> amplitude
  gain = clamp(gain, 0.0, 6.0);

  float tissue = s.g * (0.28 + 1.05 * sp);
  float spec   = s.r * (0.65 + 0.55 * sp);
  float v = (tissue + spec * 2.4) * gain * uGain;

  // Logarithmic compression — the display transform every scanner applies so a
  // 60 dB echo range fits an 8-bit screen.
  v = log(1.0 + v * uComp) / log(1.0 + uComp);

  // Near-field clutter and the sector edges.
  v *= smoothstep(0.0, uNear, r);
  v *= smoothstep(uHalf, uHalf * 0.86, abs(th));
  v = clamp(v, 0.0, 1.0);

  // Monochrome amber. Scanner phosphor was warm and the convention stuck.
  vec3 col = vec3(v) * vec3(1.0, 0.815, 0.545) + vec3(v * v) * vec3(0.0, 0.10, 0.24);
  gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}`;

/* ---- readout stylesheet --------------------------------------------------- */
/* Injected once. Everything is class-prefixed imgx- and pointer-events:none, so
 * it can never eat a click meant for the shell or the specimen. */
const IMG_CSS = `
/* z-index 19 puts the readout UNDER the shell chrome (which starts at 20), so a
   docked panel covers a corner of it exactly as it would in a DICOM viewer,
   rather than the readout scribbling over the app's own UI. */
.imgx-hud{position:fixed;inset:0;z-index:19;pointer-events:none;display:none;
  font:11px/1.5 var(--mono,ui-monospace,Menlo,Consolas,monospace);
  letter-spacing:.09em;color:#7ee6c4;text-transform:uppercase;
  text-shadow:0 0 14px rgba(0,0,0,.9)}
.imgx-hud[data-on="1"]{display:block}
.imgx-hud[data-mod="ultrasound"]{color:#f0c489}
.imgx-hud[data-mod="xray"]{color:#c3d6e4}
.imgx-c{position:absolute;padding:14px 18px;white-space:pre;opacity:.86}
.imgx-tl{left:0;top:0}
.imgx-tr{right:0;top:0;text-align:right}
.imgx-bl{left:0;bottom:0}
.imgx-br{right:0;bottom:0;text-align:right}
.imgx-k{opacity:.5}
.imgx-v{color:#eaf6f1;opacity:.95}
.imgx-hud[data-mod="ultrasound"] .imgx-v{color:#ffe9c8}
.imgx-hud[data-mod="xray"] .imgx-v{color:#f2f7fb}
.imgx-side{position:absolute;top:50%;transform:translateY(-50%);
  font-size:15px;opacity:.42;padding:0 14px}
.imgx-l{left:0}.imgx-r{right:0}
.imgx-wedge{display:flex;gap:0;margin-top:8px;justify-content:flex-end}
.imgx-wedge i{width:13px;height:9px;display:block}
.imgx-ruler{position:absolute;right:34px;top:0;bottom:0;width:52px;display:none}
.imgx-hud[data-mod="ultrasound"] .imgx-ruler{display:block}
.imgx-ruler b{position:absolute;right:0;font-weight:400;font-size:10px;opacity:.6;
  padding-right:11px}
.imgx-ruler b::after{content:"";position:absolute;right:0;top:50%;width:7px;
  height:1px;background:currentColor;opacity:.75}
.imgx-vig{position:absolute;inset:0;
  background:radial-gradient(72% 76% at 50% 50%,transparent 40%,rgba(0,0,0,.55) 100%)}
/* An instrument takes the room. The shell's own panels recede while a study is
   up — dimmed, not disabled, so the tool rail still works and nothing about the
   app becomes unreachable. Override this rule in shell.js if it disagrees. */
body[data-imaging="1"] .chrome{opacity:.38;transition:opacity .35s ease}
`;

/* Module-scope scratch. Allocating any of these inside update() is how a 60 fps
 * school laptop turns into a 40 fps one with a sawtooth GC trace. */
const IMG_S = {
  v0: null, v1: null, v2: null, v3: null,
  box: null, nm3: null, ray: null, dim: null, quat: null,
  // intersectObjects() APPENDS into an optional target array and never clears it,
  // so one array reused across all 72 beam rays replaces 72 fresh arrays per scan.
  hits: [],
};
let IMG_cssDone = false;

function IMG_initScratch(THREE) {
  if (IMG_S.v0) return;
  IMG_S.v0 = new THREE.Vector3();
  IMG_S.v1 = new THREE.Vector3();
  IMG_S.v2 = new THREE.Vector3();
  IMG_S.v3 = new THREE.Vector3();
  IMG_S.box = new THREE.Box3();
  IMG_S.nm3 = new THREE.Matrix3();
  IMG_S.ray = new THREE.Raycaster();
  IMG_S.dim = new THREE.Vector2();
  IMG_S.quat = new THREE.Quaternion();
}

/* Classify a part into a tissue row. Explicit id first, then keywords over the
 * name, then the system, then a soft-tissue default — so an unrecognised organ
 * lands on "muscle-density soft tissue", which is the correct radiological
 * assumption for an unknown structure rather than a visible failure. */
function IMG_classify(part) {
  if (!part) return 'muscle';
  if (IMG_BY_ID[part.id]) return IMG_BY_ID[part.id];
  const hay = (part.name || '') + ' ' + (part.id || '');
  for (let i = 0; i < IMG_KEYS.length; i++) {
    if (IMG_KEYS[i][0].test(hay)) return IMG_KEYS[i][1];
  }
  const sys = part.system || '';
  if (sys === 'skeletal') return 'bone';
  if (sys === 'respiratory') return 'lung';
  if (sys === 'integument') return 'skin';
  if (sys === 'muscular') return 'muscle';
  if (sys === 'digestive') return 'gut';
  return 'muscle';
}

/* HU -> linear attenuation coefficient. mu = mu_water * (1 + HU/1000), and
 * mu_water at diagnostic energies is ~0.19 per cm. World units are converted to
 * cm by the caller's mm-per-unit scale, so this returns "per cm". Air clamps to
 * zero: negative attenuation would make lung SUBTRACT from the film. */
function IMG_mu(hu) {
  return Math.max(0, 0.19 * (1 + hu / 1000));
}

/* Windowing, the one operation every radiology workstation is built around. */
function IMG_win(raw, level, width) {
  const lo = level - width * 0.5;
  const v = (raw - lo) / Math.max(1, width);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function IMG_fmt(n, d) {
  const s = (Math.abs(n) < 0.0005 ? 0 : n).toFixed(d == null ? 0 : d);
  return s === '-0' ? '0' : s;
}

/* Three does NOT throw on a shader compile failure — WebGLProgram logs to
 * console.error and hands back a dead program, which renders as pure black and
 * looks exactly like "the mode did nothing". So we watch the console across a
 * forced compile. Ugly, but it is the only reliable detection point, and the
 * alternative is shipping a mode that silently blacks out the specimen. */
function IMG_compileGuard(renderer, scene, camera) {
  let bad = null;
  const prev = console.error;
  console.error = function () {
    try {
      const s = Array.prototype.join.call(arguments, ' ');
      if (/shader error|webglprogram|glsl/i.test(s)) bad = s.slice(0, 400);
    } catch (e) { /* never let the hook itself break logging */ }
    prev.apply(console, arguments);
  };
  try {
    renderer.compile(scene, camera);
  } catch (e) {
    bad = (e && e.message) || String(e);
  } finally {
    console.error = prev;
  }
  return bad;
}

/* ========================================================================== */
export function createImaging(THREE, scene, camera, renderer, parts, opts) {
  IMG_initScratch(THREE);
  opts = opts || {};
  parts = parts || [];

  const S = IMG_S;
  let mode = 'off';
  let disposed = false;
  let failed = false;

  /* ---- part inventory --------------------------------------------------- */
  // One record per PART, but materials are swapped on the part mesh AND every
  // decorative child under it. A child left wet and red inside an X-ray is the
  // single most obvious way this module looks broken.
  const recs = [];
  const meshes = [];
  const meshInfo = new Map();          // mesh -> record (for the ultrasound walk)
  const origMat = new Map();           // mesh -> original material  (THE restore map)
  const origVis = new Map();           // part mesh -> original .visible
  const chromeVis = new Map();         // scene child -> original .visible

  parts.forEach((p) => {
    if (!p || !p.mesh) return;
    const cls = IMG_classify(p);
    const tis = IMG_TIS[cls] || IMG_TIS.muscle;
    const rec = {
      part: p, mesh: p.mesh, cls, tis,
      layer: p.layer || 0,
      subs: [],                        // every mesh under this part, incl. the part itself
      half: new THREE.Vector3(1, 1, 1),
      // Geometry centre in LOCAL space. Organs are modelled off-origin (a liver
      // lobe's mesh origin sits at the specimen midline, not in the lobe), so the
      // ellipsoid chord must be measured from the bounding-box centre. Using the
      // mesh origin instead makes off-centre organs attenuate along the wrong
      // radius and they read as uniformly thick slabs.
      mid: new THREE.Vector3(),
      scale: 1,
      matXray: null, matSlice: null,
    };
    p.mesh.traverse((o) => {
      if (o.isMesh && o.material) { rec.subs.push(o); meshInfo.set(o, rec); }
    });
    // Local half-extents, used to get a real path length through the organ (see
    // the X-ray update). seal() in anatomy.js has already computed these.
    const geo = p.mesh.geometry;
    if (geo) {
      if (!geo.boundingBox) geo.computeBoundingBox();
      if (geo.boundingBox) {
        geo.boundingBox.getSize(S.v0);
        rec.half.set(Math.max(0.02, S.v0.x * 0.5), Math.max(0.02, S.v0.y * 0.5), Math.max(0.02, S.v0.z * 0.5));
        geo.boundingBox.getCenter(rec.mid);
      }
    }
    recs.push(rec);
    meshes.push(p.mesh);
  });

  /* ---- specimen frame ---------------------------------------------------- */
  // Everything is built under one group whose world rotation lays the specimen
  // out on the table, so world X/Y/Z are NOT anatomical axes. Slicing has to
  // happen in the specimen's own frame or the planes cut diagonally through it.
  let root = meshes.length ? meshes[0] : null;
  while (root && root.parent && root.parent !== scene) root = root.parent;
  const specGroup = (root && root.parent === scene) ? root : null;

  // The three specimen-local axis directions, expressed in WORLD space (clipping
  // planes are world-space), plus the specimen's extent along each.
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  const axMin = [0, 0, 0], axMax = [0, 0, 0];
  const centre = new THREE.Vector3();
  let radius = 5, mmPerUnit = 14;

  function IMG_measure() {
    if (specGroup) {
      specGroup.updateMatrixWorld(true);
      const m = specGroup.matrixWorld.elements;
      axes[0].set(m[0], m[1], m[2]).normalize();
      axes[1].set(m[4], m[5], m[6]).normalize();
      axes[2].set(m[8], m[9], m[10]).normalize();
    }
    // World bounding box over EVERY part mesh, including the ones still hidden —
    // a scan must frame the whole specimen, not just the layers already cut down to.
    const box = S.box.makeEmpty();
    recs.forEach((r) => {
      const g = r.mesh.geometry;
      if (!g) return;
      if (!g.boundingBox) g.computeBoundingBox();
      if (!g.boundingBox) return;
      r.mesh.updateMatrixWorld();
      S.v1.copy(g.boundingBox.min).applyMatrix4(r.mesh.matrixWorld);
      S.v2.copy(g.boundingBox.max).applyMatrix4(r.mesh.matrixWorld);
      box.expandByPoint(S.v1); box.expandByPoint(S.v2);
      // The transformed corners of a rotated box are not min/max, so expand by
      // the other six corners too rather than under-sizing the field of view.
      for (let i = 0; i < 8; i++) {
        S.v3.set(i & 1 ? g.boundingBox.max.x : g.boundingBox.min.x,
                 i & 2 ? g.boundingBox.max.y : g.boundingBox.min.y,
                 i & 4 ? g.boundingBox.max.z : g.boundingBox.min.z)
          .applyMatrix4(r.mesh.matrixWorld);
        box.expandByPoint(S.v3);
      }
    });
    if (box.isEmpty()) { box.set(new THREE.Vector3(-3, -3, -3), new THREE.Vector3(3, 3, 3)); }
    box.getCenter(centre);
    box.getSize(S.v0);
    radius = Math.max(1, S.v0.length() * 0.5);

    // Extent along each specimen axis, by projecting the eight world corners.
    for (let a = 0; a < 3; a++) {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < 8; i++) {
        S.v1.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        const d = S.v1.dot(axes[a]);
        if (d < lo) lo = d;
        if (d > hi) hi = d;
      }
      axMin[a] = lo; axMax[a] = hi;
    }
    // A hand-sized teaching specimen: assume its longest dimension is ~120 mm.
    // Everything the readout reports in mm hangs off this one honest assumption,
    // and setSpecimenLength() lets a caller state the real figure instead.
    let longest = 0;
    for (let a = 0; a < 3; a++) longest = Math.max(longest, axMax[a] - axMin[a]);
    mmPerUnit = (opts.specimenLengthMm || 120) / Math.max(0.001, longest);
  }
  IMG_measure();

  /* Which specimen axis is which anatomical plane. A dissection specimen is
   * longest head-to-tail, so the plane cutting ACROSS the long axis is the
   * transverse one; it is thinnest back-to-belly, so the plane whose normal is
   * that shortest axis is the coronal (frontal) one; what is left is sagittal.
   * True for the frog laid supine and for a heart standing on its base. */
  const planeOf = [0, 0, 0];
  function IMG_pickAxes() {
    const ext = [axMax[0] - axMin[0], axMax[1] - axMin[1], axMax[2] - axMin[2]];
    let lo = 0, hi = 0;
    for (let a = 1; a < 3; a++) { if (ext[a] > ext[hi]) hi = a; if (ext[a] < ext[lo]) lo = a; }
    if (lo === hi) lo = (hi + 1) % 3;
    planeOf[hi] = 0;                     // normal = long axis  -> TRANSVERSE
    planeOf[lo] = 2;                     // normal = short axis -> CORONAL
    planeOf[3 - hi - lo] = 1;            // the remaining one   -> SAGITTAL
  }
  IMG_pickAxes();

  /* ---- shared uniforms --------------------------------------------------- */
  // The SAME uniform objects are handed to every material, so changing a window
  // or a weighting is one assignment rather than a walk over forty materials.
  const uShared = {
    uGain:    { value: 0.95 },
    uTime:    { value: 0 },
    uRes:     { value: new THREE.Vector2(1, 1) },
    uLevel:   { value: 40 },
    uWidth:   { value: 400 },
    uWeight:  { value: 0 },
    uModality:{ value: 0 },
    uNoise:   { value: 0.035 },
    uSeed:    { value: 17 },
  };

  const win = {
    ct:  { l: 40, w: 400, preset: 0 },
    mri: { l: 500, w: 1000, preset: 0 },
  };
  let weighting = 't1';
  let contrast = false;                  // IV contrast: vessels light up like a CTA

  /* ---- material construction -------------------------------------------- */
  const owned = [];
  function IMG_track(x) { owned.push(x); return x; }

  function IMG_hu(rec) {
    // Contrast-enhanced study: iodine in the lumen drives vessels to ~+300 HU and
    // makes the vascular tree the brightest soft-tissue thing in the field. It is
    // the single most useful button in a real CT suite, so it exists here.
    if (contrast && (rec.cls === 'vessel' || rec.cls === 'blood')) return 300;
    return rec.tis.hu;
  }

  function IMG_buildXray(rec) {
    if (rec.matXray) return rec.matXray;
    const m = IMG_track(new THREE.ShaderMaterial({
      uniforms: {
        uMu:    { value: IMG_mu(IMG_hu(rec)) },
        uThick: { value: 1 },
        uGain:  uShared.uGain,
        uTime:  uShared.uTime,
        uRes:   uShared.uRes,
      },
      vertexShader: IMG_XRAY_VS,
      fragmentShader: IMG_XRAY_FS,
      side: THREE.DoubleSide,            // front + back faces = the full chord
      blending: THREE.AdditiveBlending,  // summation, the defining radiograph look
      transparent: true,
      depthWrite: false,
      depthTest: false,                  // a radiograph has no occlusion
      toneMapped: false,
    }));
    rec.matXray = m;
    return m;
  }

  function IMG_buildSlice(rec) {
    if (rec.matSlice) return rec.matSlice;
    const m = IMG_track(new THREE.ShaderMaterial({
      uniforms: {
        uHu:      { value: IMG_hu(rec) },
        uT1:      { value: rec.tis.t1 },
        uT2:      { value: rec.tis.t2 },
        uWeight:  uShared.uWeight,
        uModality:uShared.uModality,
        uLevel:   uShared.uLevel,
        uWidth:   uShared.uWidth,
        uNoise:   uShared.uNoise,
        uSeed:    uShared.uSeed,
      },
      vertexShader: IMG_SLICE_VS,
      fragmentShader: IMG_SLICE_FS,
      side: THREE.DoubleSide,   // back faces fill the cut so the section reads solid
      clipping: true,           // WITHOUT THIS three ignores clippingPlanes entirely
      clippingPlanes: slab,     // handed in at build time, so no program rebuild later
      toneMapped: false,
    }));
    rec.matSlice = m;
    return m;
  }

  // Ultrasound draws the MACHINE'S IMAGE, not the tissue — so the specimen must
  // stop rendering while still being raycastable for the beam walk. Hiding the
  // MATERIAL rather than the mesh is what keeps those two facts compatible;
  // mesh.visible = false would risk the raycaster skipping it entirely.
  let hiddenMat = null;
  function IMG_buildHidden() {
    if (!hiddenMat) {
      hiddenMat = IMG_track(new THREE.MeshBasicMaterial());
      hiddenMat.visible = false;
    }
    return hiddenMat;
  }

  function IMG_refreshValues() {
    recs.forEach((r) => {
      const hu = IMG_hu(r);
      if (r.matXray) r.matXray.uniforms.uMu.value = IMG_mu(hu);
      if (r.matSlice) r.matSlice.uniforms.uHu.value = hu;
    });
  }

  /* ---- clipping slab ----------------------------------------------------- */
  const planeA = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const planeB = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const slab = [planeA, planeB];
  let axis = 1;                 // which specimen axis the slab normal follows
  let autoAxis = true;
  let slice = 0.5;              // 0..1 across the specimen's extent on that axis
  let thickness = 0.06;         // slab half-thickness as a fraction of extent
  let prevLocalClip = renderer.localClippingEnabled;

  function IMG_applySlab() {
    const n = axes[axis];
    const lo = axMin[axis], hi = axMax[axis];
    const span = Math.max(0.001, hi - lo);
    const d = lo + slice * span;
    const h = Math.max(0.004, thickness * span * 0.5);
    // THREE keeps the half-space the normal POINTS INTO: a fragment survives where
    // normal·p + constant >= 0 (clipping_planes_fragment discards when
    // dot(-p_view, n) > constant). So to bracket the slab d-h <= n·p <= d+h:
    //   A must keep n·p <= d+h  ->  normal = -n, constant =  (d + h)
    //   B must keep n·p >= d-h  ->  normal =  n, constant = -(d - h)
    // Getting these the other way round yields an EMPTY intersection, which does
    // not error and does not warn — it renders a perfectly black frame that looks
    // exactly like "CT is not implemented". Do not "simplify" the signs.
    planeA.normal.copy(n).multiplyScalar(-1); planeA.constant = (d + h);
    planeB.normal.copy(n); planeB.constant = -(d - h);
  }
  IMG_applySlab();

  function IMG_sliceMm() {
    // Zero at the middle of the specimen, positive toward +axis, in millimetres —
    // the same convention a table position takes on a real scanner.
    const lo = axMin[axis], hi = axMax[axis];
    return (lo + slice * (hi - lo) - (lo + hi) * 0.5) * mmPerUnit;
  }

  /* Pick the slab orientation from the viewpoint, so orbiting the specimen
   * reformats the study instead of leaving you staring at a slab edge-on. This
   * is also the fix for the top-down frog camera: anything oriented "toward the
   * camera" the naive way collapses to a line from up there. */
  /* Which specimen axis the camera is looking most nearly ALONG. Shared by the
   * auto-reformat and by the X-ray projection label, so the film cannot claim to
   * be an AP while you are looking at the specimen end-on. */
  function IMG_viewAxis() {
    camera.getWorldDirection(S.v0);
    let best = 0, bestD = -1;
    for (let a = 0; a < 3; a++) {
      const d = Math.abs(S.v0.dot(axes[a]));
      if (d > bestD) { bestD = d; best = a; }
    }
    return best;
  }

  function IMG_autoAxis() {
    if (!autoAxis) return;
    const best = IMG_viewAxis();
    if (best !== axis) { axis = best; IMG_applySlab(); }
  }

  /* ---- ultrasound -------------------------------------------------------- */
  const US = {
    NA: 72, ND: 96,
    half: 0.55,                 // sector half-angle (~31 deg), a curvilinear probe
    freq: 7.5,                  // MHz
    lateral: 0,                 // probe sweep across the specimen
    depth: 1, apexOff: 1,
    data: null, tex: null, quad: null, mat: null, geo: null,
    lastBuild: -1e9, dirty: true,
    apex: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(),
    inside: new Set(),
    camKey: 0,
  };
  US.data = new Uint8Array(US.NA * US.ND * 4);

  // The sector is sized to the VIEWPORT, not to the specimen. A scanner's sector
  // fills its screen; sizing it from the specimen's bounding sphere instead
  // pushes the far field off the bottom of the frame on the frog's close camera,
  // and you end up looking at the middle third of an image. A happy consequence:
  // zooming genuinely behaves like the machine's depth control, and the cm
  // readout moves with it.
  function IMG_usGeometry() {
    let vh = radius * 2.4;
    if (camera.isPerspectiveCamera) {
      const dist = Math.max(0.5, camera.position.distanceTo(centre));
      vh = 2 * dist * Math.tan(camera.fov * Math.PI / 360);
    } else if (camera.isOrthographicCamera) {
      vh = Math.abs(camera.top - camera.bottom) / (camera.zoom || 1);
    }
    US.depth = Math.max(0.5, vh * 0.88);
    US.apexOff = US.depth * 0.46;      // apex high on screen, specimen mid-field
  }
  IMG_usGeometry();

  function IMG_buildUS() {
    if (US.quad) return US.quad;
    US.tex = IMG_track(new THREE.DataTexture(US.data, US.NA, US.ND, THREE.RGBAFormat));
    US.tex.minFilter = US.tex.magFilter = THREE.LinearFilter;
    US.tex.wrapS = US.tex.wrapT = THREE.ClampToEdgeWrapping;
    US.tex.generateMipmaps = false;
    if ('colorSpace' in US.tex) US.tex.colorSpace = THREE.NoColorSpace;
    US.tex.needsUpdate = true;

    US.geo = IMG_track(new THREE.PlaneGeometry(1, 1));
    US.mat = IMG_track(new THREE.ShaderMaterial({
      uniforms: {
        uScan:   { value: US.tex },
        uHalf:   { value: US.half },
        uDepth:  { value: US.depth },
        uWidth:  { value: 1 },
        uNear:   { value: 0.18 },
        uTgc:    { value: 0.9 },
        uAttMax: { value: 90 },
        uGain:   { value: 1.25 },
        uComp:   { value: 9.0 },
        uTime:   uShared.uTime,
      },
      vertexShader: IMG_US_VS,
      fragmentShader: IMG_US_FS,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }));
    US.quad = new THREE.Mesh(US.geo, US.mat);
    US.quad.renderOrder = 9000;
    US.quad.frustumCulled = false;
    US.quad.visible = false;
    scene.add(US.quad);
    return US.quad;
  }

  /* Place the scan plane. It is built from the CAMERA'S right/up basis, never
   * from its forward vector — the frog camera looks almost straight down, and a
   * sector oriented "toward the camera" any other way foreshortens into a line.
   * Built this way the probe always enters from the top of the screen and the
   * plane it scans is the plane you are already looking at, which is honest as
   * well as legible. */
  function IMG_usPlace() {
    camera.updateMatrixWorld();
    const e = camera.matrixWorld.elements;
    US.right.set(e[0], e[1], e[2]).normalize();
    US.up.set(e[4], e[5], e[6]).normalize();
    IMG_usGeometry();
    US.apex.copy(centre)
      .addScaledVector(US.up, US.apexOff)
      .addScaledVector(US.right, US.lateral);

    const w = 2 * US.depth * Math.sin(US.half) * 1.02;
    const quad = US.quad;
    // WORLD quaternion, not camera.quaternion. The quad is parented to the scene,
    // so its .quaternion is a world rotation; camera.quaternion is only the same
    // thing while the camera has no parent. The moment anything rigs the camera
    // (an XR rig, a dolly group) the sector would tilt away from the view plane,
    // and US.right/US.up above are already read out of camera.matrixWorld.
    camera.getWorldQuaternion(S.quat);
    quad.quaternion.copy(S.quat);
    quad.scale.set(w, US.depth, 1);
    quad.position.copy(US.apex).addScaledVector(US.up, -US.depth * 0.5);
    US.mat.uniforms.uWidth.value = w;
    US.mat.uniforms.uDepth.value = US.depth;
    US.mat.uniforms.uHalf.value = US.half;
    US.mat.uniforms.uNear.value = US.depth * 0.06;
    // TGC assumes average soft tissue: 0.7 dB/cm/MHz over the round trip.
    US.mat.uniforms.uTgc.value = 0.7 * US.freq * 2 * (mmPerUnit / 10);
  }

  function IMG_usInnermost() {
    // The medium the beam is currently travelling in is the DEEPEST structure it
    // is inside — a probe inside the body wall inside the skin is in the organ,
    // not in the skin. Layer index is exactly that ordering, already maintained
    // by the dissection model.
    let best = null, bl = -1;
    US.inside.forEach((o) => {
      const r = meshInfo.get(o);
      if (r && r.layer >= bl) { bl = r.layer; best = r; }
    });
    return best ? best.tis : IMG_TIS.water;
  }

  /* Cast the sector on the CPU and bake it into the polar texture. Doing the beam
   * walk here rather than in the shader is what buys REAL shadowing (an actual
   * integral of attenuation along an actual ray through actual geometry) instead
   * of a screen-space darkening trick that falls apart the moment you orbit. */
  function IMG_scan() {
    const NA = US.NA, ND = US.ND, data = US.data;
    const depth = US.depth;
    const cmPerUnit = mmPerUnit / 10;
    const ray = S.ray;
    ray.near = 0;
    ray.far = depth;
    // Attenuation is a round trip (out and back), hence the factor of two.
    const attK = US.freq * cmPerUnit * 2;

    for (let ai = 0; ai < NA; ai++) {
      const th = -US.half + (NA > 1 ? (ai / (NA - 1)) * 2 * US.half : 0);
      S.v0.copy(US.up).multiplyScalar(-Math.cos(th)).addScaledVector(US.right, Math.sin(th)).normalize();
      ray.set(US.apex, S.v0);
      // Reused target array — see IMG_S.hits. It must be emptied by hand because
      // intersectObjects appends rather than replaces.
      const hits = S.hits;
      hits.length = 0;
      try { ray.intersectObjects(meshes, false, hits); } catch (e) { hits.length = 0; }

      US.inside.clear();
      let med = IMG_TIS.water;
      let d0 = 0, accum = 0, bin = 0;

      for (let h = 0; h <= hits.length; h++) {
        const d1 = h < hits.length ? hits[h].distance : depth;
        // Fill every depth bin between the last interface and this one with the
        // current medium, integrating its attenuation as we go. floor()+1 (not
        // ceil) so the bin CONTAINING this interface is filled before the echo is
        // written into it — with ceil, an interface landing exactly on a bin
        // boundary would have its echo wiped by the next segment's fill.
        const endBin = Math.min(ND, Math.floor(d1 / depth * ND) + 1);
        while (bin < endBin) {
          const binEnd = (bin + 1) / ND * depth;
          const step = Math.max(0, Math.min(binEnd, d1) - Math.max(d0, bin / ND * depth));
          accum += med.att * step * attK;
          const o = (bin * NA + ai) * 4;
          data[o] = 0;
          data[o + 1] = Math.min(255, med.echo * 255) | 0;
          data[o + 2] = Math.min(255, accum / 90 * 255) | 0;
          data[o + 3] = 255;
          bin++;
        }
        if (h >= hits.length) break;

        const hit = hits[h];
        const obj = hit.object;
        if (US.inside.has(obj)) US.inside.delete(obj); else US.inside.add(obj);
        const next = IMG_usInnermost();

        // Specular interface echo. Reflection coefficient from the impedance
        // mismatch, times an obliquity term — a surface square to the beam blazes
        // and one edge-on to it vanishes. That single fact is why sonographers
        // rock the probe, and it is the most recognisable thing about the image.
        const z1 = med.z, z2 = next.z;
        const R = Math.abs(z1 - z2) / Math.max(1e-4, z1 + z2);
        let cosI = 0.55;
        if (hit.face) {
          S.nm3.getNormalMatrix(obj.matrixWorld);
          S.v1.copy(hit.face.normal).applyNormalMatrix(S.nm3).normalize();
          cosI = Math.abs(S.v1.dot(S.v0));
        }
        const ib = Math.min(ND - 1, Math.floor(hit.distance / depth * ND));
        const oi = (ib * NA + ai) * 4;
        const e = Math.min(255, (R * Math.pow(cosI, 2.2) * 900) | 0);
        if (e > data[oi]) data[oi] = e;

        med = next;
        d0 = d1;
      }
      // Anything past the last interface is coupling medium again.
      while (bin < ND) {
        const o = (bin * NA + ai) * 4;
        data[o] = 0;
        data[o + 1] = 1;
        data[o + 2] = Math.min(255, accum / 90 * 255) | 0;
        data[o + 3] = 255;
        bin++;
      }
    }
    US.tex.needsUpdate = true;
  }

  /* ---- scene masking ----------------------------------------------------- */
  /* A radiograph of the operating table is not a radiograph. Everything in the
   * scene that is not part of the specimen is hidden for the duration, and every
   * part mesh is forced visible — including the layers not yet dissected down to,
   * because seeing what is underneath BEFORE you cut is the entire clinical point
   * of the module. Both are recorded and restored exactly. */
  function IMG_mask(on) {
    if (on) {
      if (chromeVis.size) return;
      const keep = new Set();
      if (specGroup) keep.add(specGroup);
      if (US.quad) keep.add(US.quad);
      scene.children.forEach((c) => {
        if (keep.has(c)) return;
        // A part mesh may hang directly off the scene on some specimens.
        let hasPart = false;
        c.traverse((o) => { if (meshInfo.has(o)) hasPart = true; });
        if (hasPart) return;
        chromeVis.set(c, c.visible);
        c.visible = false;
      });
      recs.forEach((r) => { origVis.set(r.mesh, r.mesh.visible); r.mesh.visible = true; });
    } else {
      chromeVis.forEach((v, c) => { c.visible = v; });
      chromeVis.clear();
      origVis.forEach((v, m) => { m.visible = v; });
      origVis.clear();
    }
  }

  /* THE restore path. Reference swap only — we never write a property onto an
   * original material, because dissect.js owns .emissive / .opacity / .color on
   * those and would inherit whatever we left behind. */
  function IMG_swap(kind) {
    recs.forEach((r) => {
      const m = kind === 'xray' ? IMG_buildXray(r)
              : kind === 'hidden' ? IMG_buildHidden()
              : IMG_buildSlice(r);
      r.subs.forEach((o) => {
        if (!origMat.has(o)) origMat.set(o, o.material);
        o.material = m;
      });
    });
  }

  function IMG_restore() {
    origMat.forEach((mtl, obj) => { obj.material = mtl; });
    origMat.clear();
  }

  /* ---- readout ----------------------------------------------------------- */
  let hud = null, cells = null, lastText = '';

  function IMG_hudBuild() {
    if (typeof document === 'undefined' || hud) return;
    if (!IMG_cssDone) {
      const st = document.createElement('style');
      st.id = 'imgx-css';
      st.textContent = IMG_CSS;
      document.head.appendChild(st);
      IMG_cssDone = true;
    }
    hud = document.createElement('div');
    hud.className = 'imgx-hud';
    hud.dataset.on = '0';
    hud.innerHTML =
      '<div class="imgx-vig"></div>' +
      '<div class="imgx-c imgx-tl"></div>' +
      '<div class="imgx-c imgx-tr"></div>' +
      '<div class="imgx-c imgx-bl"></div>' +
      '<div class="imgx-c imgx-br"></div>' +
      '<div class="imgx-side imgx-l">R</div>' +
      '<div class="imgx-side imgx-r">L</div>' +
      '<div class="imgx-ruler"></div>';
    document.body.appendChild(hud);
    cells = {
      tl: hud.querySelector('.imgx-tl'),
      tr: hud.querySelector('.imgx-tr'),
      bl: hud.querySelector('.imgx-bl'),
      br: hud.querySelector('.imgx-br'),
      sideL: hud.querySelector('.imgx-l'),
      sideR: hud.querySelector('.imgx-r'),
      ruler: hud.querySelector('.imgx-ruler'),
    };
    // An 11-step greyscale wedge, the calibration strip printed on real film.
    // It is also genuinely useful: it tells you at a glance whether the window
    // you have chosen is using the whole dynamic range or crushing it.
    let wedge = '<div class="imgx-wedge">';
    for (let i = 0; i < 11; i++) {
      const v = Math.round(i / 10 * 255);
      wedge += '<i style="background:rgb(' + v + ',' + v + ',' + v + ')"></i>';
    }
    cells.br.dataset.wedge = wedge + '</div>';
  }

  let lastRulerCm = -1;
  function IMG_ruler() {
    if (!cells || !cells.ruler) return;
    const cm = US.depth * mmPerUnit / 10;
    if (Math.abs(cm - lastRulerCm) < 0.15) return;   // the DOM is not a per-frame target
    lastRulerCm = cm;
    let html = '';
    const step = cm > 12 ? 2 : 1;
    for (let d = step; d <= cm; d += step) {
      html += '<b style="top:' + (d / cm * 100).toFixed(2) + '%">' + d + '</b>';
    }
    cells.ruler.innerHTML = html;
  }

  const K = (k, v) => '<span class="imgx-k">' + k + '</span> <span class="imgx-v">' + v + '</span>';

  /* Laterality markers. These are not decoration — a side marker is a MEDICO-LEGAL
   * requirement on a real study, and the convention is specific: transverse and
   * coronal images are viewed as if from the patient's feet / front, so the
   * subject's RIGHT is on the VIEWER'S LEFT. A sagittal image has no left and
   * right at all, and is marked anterior / posterior instead, anterior to the
   * viewer's left. Printing a fixed "R | L" on a sagittal reformat is simply
   * wrong, and it is exactly the habit this module exists to break. */
  let lastSide = '';
  function IMG_sides(planeIdx) {
    if (!cells || !cells.sideL) return;
    const sag = planeIdx === 1;
    const sig = sag ? 'AP' : 'RL';
    if (sig === lastSide) return;
    lastSide = sig;
    cells.sideL.textContent = sag ? 'A' : 'R';
    cells.sideR.textContent = sag ? 'P' : 'L';
  }

  /* The projection an X-ray is actually taken in follows the beam, so it must be
   * derived from where the camera is, not asserted. Viewing along the specimen's
   * dorsoventral (shortest) axis is an AP; along its left-right axis a LATERAL;
   * down its long axis an axial/craniocaudal projection. */
  function IMG_projection(planeIdx) {
    if (planeIdx === 1) return 'LATERAL · DECUBITUS';
    if (planeIdx === 0) return 'AXIAL · CRANIOCAUDAL';
    return 'AP · SUPINE';
  }

  function IMG_hudPaint() {
    if (!hud) return;
    hud.dataset.on = mode === 'off' ? '0' : '1';
    hud.dataset.mod = mode;
    if (typeof document !== 'undefined' && document.body) {
      document.body.dataset.imaging = mode === 'off' ? '0' : '1';
    }
    if (mode === 'off') { lastText = ''; return; }

    const name = opts.label || (specGroup && specGroup.name) || 'SPECIMEN';
    const plane = IMG_PLANE_NAMES[planeOf[axis]] || 'OBLIQUE';
    let tl, tr, bl, br;

    if (mode === 'xray') {
      // The film has no slab, so its geometry is the VIEW axis, not `axis`.
      const vp = planeOf[IMG_viewAxis()];
      IMG_sides(vp);
      tl = K('MOD', 'CR / DIGITAL RADIOGRAPHY') + '\n' + K('SPEC', name) + '\n' +
        K('PROJ', IMG_projection(vp));
      tr = K('kVp', '66') + '\n' + K('mAs', '4.0') + '\n' + K('SID', '100 cm');
      bl = K('SUMMATION', 'FULL VOLUME') + '\n' + K('GRID', 'NONE') + '\n' +
           K('FILTER', 'NO POST-PROCESSING');
      br = K('SERIES', '1 / 1') + '\n' + K('IMG', '1');
    } else if (mode === 'ct') {
      IMG_sides(planeOf[axis]);
      const p = IMG_PRESETS.ct[win.ct.preset];
      tl = K('MOD', 'CT · HELICAL') + '\n' + K('SPEC', name) + '\n' + K('PLANE', plane +
        (autoAxis ? ' · AUTO' : ''));
      tr = K('kVp', '120') + '\n' + K('SLICE', IMG_fmt(thickness * (axMax[axis] - axMin[axis]) * mmPerUnit, 1) + ' mm') +
        '\n' + K('POS', (IMG_sliceMm() >= 0 ? '+' : '') + IMG_fmt(IMG_sliceMm(), 1) + ' mm');
      bl = K('WL', IMG_fmt(win.ct.l)) + '  ' + K('WW', IMG_fmt(win.ct.w)) + '\n' +
           K('WINDOW', p ? p.name : 'CUSTOM') + '\n' + K('CONTRAST', contrast ? 'IV · ARTERIAL' : 'NON-ENHANCED');
      br = K('SERIES', '2 / 4') + '\n' + K('IMG', String(1 + Math.round(slice * 120)) + ' / 121');
    } else if (mode === 'mri') {
      IMG_sides(planeOf[axis]);
      const p = IMG_PRESETS.mri[win.mri.preset];
      const t1 = weighting === 't1';
      tl = K('MOD', 'MR · 1.5 T') + '\n' + K('SPEC', name) + '\n' + K('PLANE', plane +
        (autoAxis ? ' · AUTO' : ''));
      tr = K('SEQ', t1 ? 'T1 SE' : 'T2 FSE') + '\n' +
           K('TR/TE', t1 ? '500 / 14 ms' : '4000 / 92 ms') + '\n' +
           K('POS', (IMG_sliceMm() >= 0 ? '+' : '') + IMG_fmt(IMG_sliceMm(), 1) + ' mm');
      bl = K('WL', IMG_fmt(win.mri.l)) + '  ' + K('WW', IMG_fmt(win.mri.w)) + '\n' +
           K('WINDOW', p ? p.name : 'CUSTOM') + '\n' +
           K('READS', t1 ? 'FAT BRIGHT · FLUID DARK' : 'FLUID BRIGHT · FAT MID');
      br = K('SERIES', t1 ? '3 / 6' : '4 / 6') + '\n' + K('IMG', String(1 + Math.round(slice * 40)) + ' / 41');
    } else {
      // The probe's orientation notch is displayed at screen left, so the same
      // "viewer's left is the subject's right" convention holds.
      IMG_sides(planeOf[IMG_viewAxis()]);
      const cm = US.depth * mmPerUnit / 10;
      // A 7.5 MHz sector is a MICROCONVEX probe, not a curvilinear one — a
      // curvilinear abdominal probe runs 2-5 MHz and could not resolve a specimen
      // this small. The frequency and the probe name have to agree.
      tl = K('MOD', 'US · B-MODE') + '\n' + K('SPEC', name) + '\n' + K('PROBE', 'MICROCONVEX · WATER BATH');
      tr = K('FREQ', IMG_fmt(US.freq, 1) + ' MHz') + '\n' + K('DEPTH', IMG_fmt(cm, 1) + ' cm') + '\n' +
           K('SWEEP', (US.lateral >= 0 ? '+' : '') + IMG_fmt(US.lateral * mmPerUnit, 1) + ' mm');
      bl = K('GAIN', '62 dB') + '  ' + K('DR', '60 dB') + '\n' + K('TGC', 'AUTO') + '\n' +
           K('MI', '0.8') + '  ' + K('TIS', '0.3');
      br = K('SERIES', '5 / 6') + '\n' + K('FRAME', 'LIVE');
    }

    const sig = tl + tr + bl + br;
    if (sig === lastText) return;         // the DOM is not a per-frame target
    lastText = sig;
    cells.tl.innerHTML = tl;
    cells.tr.innerHTML = tr;
    cells.bl.innerHTML = bl;
    cells.br.innerHTML = br + (cells.br.dataset.wedge || '');
  }

  /* ---- mode switching ---------------------------------------------------- */
  let prevBg = null;
  let bgSaved = false;
  const black = new THREE.Color(0x000000);

  function IMG_enter(m) {
    IMG_measure();
    IMG_pickAxes();
    if (!bgSaved) { prevBg = scene.background; bgSaved = true; }
    scene.background = black;
    IMG_mask(true);

    if (m === 'xray') {
      IMG_swap('xray');
    } else if (m === 'ct' || m === 'mri') {
      prevLocalClip = renderer.localClippingEnabled;
      renderer.localClippingEnabled = true;
      uShared.uModality.value = (m === 'ct') ? 0 : 1;
      if (m === 'ct') {
        uShared.uLevel.value = win.ct.l;
        uShared.uWidth.value = win.ct.w;
        uShared.uNoise.value = 0.038;
      } else {
        uShared.uLevel.value = win.mri.l;
        uShared.uWidth.value = win.mri.w;
        uShared.uNoise.value = 0.022;
        uShared.uWeight.value = weighting === 't2' ? 1 : 0;
      }
      IMG_autoAxis();
      IMG_applySlab();
      IMG_swap('slice');
    } else if (m === 'ultrasound') {
      IMG_buildUS();
      IMG_swap('hidden');
      US.quad.visible = true;
      US.dirty = true;
      IMG_usPlace();
      IMG_scan();
      IMG_ruler();
    }
  }

  function IMG_leave() {
    IMG_restore();
    renderer.localClippingEnabled = prevLocalClip;
    // Mask restore LAST: it replays the recorded .visible for the sector quad
    // too, so hiding the quad before it would just be undone.
    IMG_mask(false);
    if (US.quad) US.quad.visible = false;
    if (bgSaved) { scene.background = prevBg || null; bgSaved = false; }
  }

  function setMode(m) {
    if (disposed) return mode;
    if (IMG_MODES.indexOf(m) < 0) m = 'off';
    if (m === mode) return mode;
    const from = mode;
    // Fenced: IMG_leave is the restore path, and if it half-fails we still have to
    // reach a defined state rather than propagating out of a keypress handler.
    try { IMG_leave(); } catch (e0) {
      if (typeof console !== 'undefined') console.warn('imaging: restore failed', e0);
    }
    mode = 'off';
    if (m === 'off') { IMG_hudPaint(); return mode; }

    try {
      IMG_enter(m);
      mode = m;
      // Force the compile NOW rather than discovering a dead program as a black
      // frame. If it fails we unwind completely — a leaked shader material over
      // the real anatomy is the single worst outcome this module can produce.
      const bad = IMG_compileGuard(renderer, scene, camera);
      if (bad) throw new Error(bad);
      // A mode that came up cleanly clears the flag. Latching `failed` forever
      // after one transient failure would leave the shell reporting a broken
      // suite while a study is visibly on screen.
      failed = false;
    } catch (e) {
      failed = true;
      mode = 'off';
      try { IMG_leave(); } catch (e2) { /* restore is best-effort but must not rethrow */ }
      if (typeof console !== 'undefined') {
        console.warn('imaging: ' + m + ' unavailable, falling back to off (was ' + from + ')', e);
      }
    }
    IMG_hudPaint();
    return mode;
  }

  /* ---- public controls --------------------------------------------------- */
  function setSlice(t) {
    slice = Math.max(0, Math.min(1, typeof t === 'number' ? t : 0.5));
    if (mode === 'ultrasound') {
      // In ultrasound the "slice" control is the probe, swept laterally across
      // the specimen in the scan plane — that is the physical equivalent.
      US.lateral = (slice - 0.5) * radius * 1.25;
      US.dirty = true;
    } else {
      IMG_applySlab();
      uShared.uSeed.value = 3 + Math.floor(slice * 977);   // fresh noise per image
    }
    IMG_hudPaint();
    return slice;
  }

  function setWindow(level, width) {
    // Accepts a preset id/name as the first argument, or explicit numbers, or
    // 't1'/'t2' to change MR weighting — one entry point for "change how this is
    // being read", because that is how it feels at the console.
    if (typeof level === 'string') {
      const key = level.toLowerCase();
      if (key === 't1' || key === 't2') return setWeighting(key);
      const list = IMG_PRESETS[mode === 'mri' ? 'mri' : 'ct'];
      const i = list.findIndex((p) => p.id === key || p.name.toLowerCase() === key);
      if (i >= 0) {
        const p = list[i];
        if (mode === 'mri') { win.mri.l = p.l; win.mri.w = p.w; win.mri.preset = i; }
        else { win.ct.l = p.l; win.ct.w = p.w; win.ct.preset = i; }
        uShared.uLevel.value = p.l;
        uShared.uWidth.value = p.w;
        IMG_hudPaint();
      }
      return { level: uShared.uLevel.value, width: uShared.uWidth.value };
    }
    if (typeof level === 'number') uShared.uLevel.value = level;
    if (typeof width === 'number') uShared.uWidth.value = Math.max(1, width);
    const tgt = mode === 'mri' ? win.mri : win.ct;
    tgt.l = uShared.uLevel.value;
    tgt.w = uShared.uWidth.value;
    tgt.preset = -1;
    IMG_hudPaint();
    return { level: tgt.l, width: tgt.w };
  }

  function setWeighting(w) {
    weighting = (w === 't2') ? 't2' : 't1';
    uShared.uWeight.value = weighting === 't2' ? 1 : 0;
    IMG_hudPaint();
    return weighting;
  }

  function cycleWindow() {
    const list = IMG_PRESETS[mode === 'mri' ? 'mri' : 'ct'];
    const cur = mode === 'mri' ? win.mri : win.ct;
    const next = ((cur.preset < 0 ? -1 : cur.preset) + 1) % list.length;
    return setWindow(list[next].id);
  }

  function cycleMode(dir) {
    const i = IMG_MODES.indexOf(mode);
    const n = IMG_MODES.length;
    return setMode(IMG_MODES[(i + (dir === -1 ? n - 1 : 1)) % n]);
  }

  function setContrast(on) {
    contrast = !!on;
    IMG_refreshValues();
    IMG_hudPaint();
    return contrast;
  }

  function setAxis(a) {
    if (a === 'auto' || a == null) { autoAxis = true; IMG_autoAxis(); }
    else { autoAxis = false; axis = Math.max(0, Math.min(2, a | 0)); IMG_applySlab(); }
    IMG_hudPaint();
    return axis;
  }

  function setThickness(f) {
    thickness = Math.max(0.004, Math.min(0.5, f));
    IMG_applySlab();
    IMG_hudPaint();
    return thickness;
  }

  function setSpecimenLength(mm) {
    opts.specimenLengthMm = Math.max(1, mm);
    IMG_measure();
    IMG_ruler();
    IMG_hudPaint();
    return mmPerUnit;
  }

  /* ---- frame ------------------------------------------------------------- */
  /* main.js calls this from inside requestAnimationFrame. An exception escaping
   * here does not "break imaging" — it kills the whole render loop and freezes the
   * app on its last frame, with the specimen still wearing our shader materials.
   * So the frame body is fenced: any failure retires the module to 'off', restores
   * the real anatomy, and lets the lab carry on without a radiology suite. */
  function update(dt) {
    if (disposed || mode === 'off') return;
    try {
      IMG_frame(dt);
    } catch (e) {
      failed = true;
      if (typeof console !== 'undefined') console.warn('imaging: frame failed, retiring to off', e);
      try { setMode('off'); } catch (e2) { /* best effort; must not rethrow into rAF */ }
    }
  }

  function IMG_frame(dt) {
    const s = dt == null ? 0.016 : (dt > 1 ? dt / 1000 : dt);
    uShared.uTime.value += s;

    if (mode === 'xray') {
      // Per-part path length along the CURRENT view axis. Treating the organ as
      // an ellipsoid gives r = 1/sqrt((dx/a)^2+(dy/b)^2+(dz/c)^2), which is exact
      // for a sphere and close enough for tissue. Without this a flat liver lobe
      // seen face-on would attenuate as if it were as thick as it is wide — the
      // difference between a radiograph and a glowing blob.
      camera.updateMatrixWorld();
      // ONE recursive update of the specimen instead of one call per part: every
      // part hangs off this group, and worldToLocal below reads matrixWorld
      // without refreshing it, so the whole subtree must be current first.
      if (specGroup) specGroup.updateMatrixWorld();
      for (let i = 0; i < recs.length; i++) {
        const r = recs[i];
        if (!r.matXray) continue;
        if (!specGroup) r.mesh.updateMatrixWorld();
        S.v0.copy(camera.position);
        r.mesh.worldToLocal(S.v0);
        // Measure the chord from the organ's own centre, not the mesh origin.
        S.v0.sub(r.mid);
        S.v0.normalize();
        const h = r.half;
        const dx = S.v0.x / h.x, dy = S.v0.y / h.y, dz = S.v0.z / h.z;
        const rad = 1 / Math.sqrt(Math.max(1e-6, dx * dx + dy * dy + dz * dz));
        r.mesh.getWorldScale(S.v1);
        const sc = (Math.abs(S.v1.x) + Math.abs(S.v1.y) + Math.abs(S.v1.z)) / 3;
        // mu is per centimetre, so the path must be too.
        r.matXray.uniforms.uThick.value = rad * sc * (mmPerUnit / 10);
      }
    } else if (mode === 'ct' || mode === 'mri') {
      const before = axis;
      IMG_autoAxis();
      if (before !== axis) IMG_hudPaint();
    } else if (mode === 'ultrasound') {
      // The sector follows the camera, so a rotation invalidates the beam walk.
      // Rebuild on movement or on a slow heartbeat — 72 rays against the whole
      // specimen is affordable at ~11 Hz and ruinous at 60.
      const k = camera.quaternion;
      // Distance is in the key as well as orientation: dollying is the depth
      // control here, and a zoom that did not rebuild would leave the baked beam
      // profile describing a sector that no longer exists.
      const key = k.x * 7.1 + k.y * 13.3 + k.z * 29.7 + k.w * 3.9
                + camera.position.distanceTo(centre) * 0.37;
      const now = uShared.uTime.value;
      // Motion rebuilds are throttled too. Without a floor, a continuous orbit
      // satisfies the key test on EVERY frame, which is precisely the 60 Hz beam
      // walk the 0.09 s heartbeat below exists to avoid — the throttle has to
      // cover the common case (the camera is moving), not just the idle one.
      const moved = Math.abs(key - US.camKey) > 1e-4 && now - US.lastBuild > 0.045;
      if (moved || US.dirty || now - US.lastBuild > 0.09) {
        US.camKey = key;
        US.dirty = false;
        US.lastBuild = now;
        IMG_usPlace();
        IMG_scan();
        IMG_ruler();
        IMG_hudPaint();
      }
    }
  }

  function resize(w, h) {
    // gl_FragCoord is in DRAWING-BUFFER pixels, not CSS pixels. Passing
    // innerWidth on a 2x display would put the X-ray vignette twice as far out
    // as the frame, which reads as "the vignette is broken" rather than as a
    // units mistake — so ask the renderer and only fall back to the arguments.
    let dw = w, dh = h;
    try {
      renderer.getDrawingBufferSize(S.dim);
      if (S.dim.x > 0 && S.dim.y > 0) { dw = S.dim.x; dh = S.dim.y; }
    } catch (e) { /* headless / stubbed renderer */ }
    uShared.uRes.value.set(Math.max(1, dw || 1), Math.max(1, dh || 1));
  }
  resize(typeof innerWidth === 'number' ? innerWidth : 1920,
         typeof innerHeight === 'number' ? innerHeight : 1080);

  IMG_hudBuild();
  IMG_ruler();
  IMG_hudPaint();

  function dispose() {
    if (disposed) return;
    try { setMode('off'); } catch (e) { /* still tear the rest down */ }
    disposed = true;
    if (US.quad) { scene.remove(US.quad); US.quad = null; }
    owned.forEach((o) => { try { o.dispose && o.dispose(); } catch (e) {} });
    owned.length = 0;
    recs.forEach((r) => { r.matXray = null; r.matSlice = null; });
    if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
    hud = null; cells = null;
    if (typeof document !== 'undefined' && document.body) document.body.dataset.imaging = '0';
    renderer.localClippingEnabled = prevLocalClip;
  }

  /* Live getters, never Object.assign — assign INVOKES a getter and freezes the
   * value it happened to hold at wiring time. */
  const api = {
    setMode, setSlice, setWindow, update, resize, dispose,
    setWeighting, cycleWindow, cycleMode, setContrast, setAxis,
    setThickness, setSpecimenLength,
    mode() { return mode; },
    presets(kind) { return IMG_PRESETS[kind === 'mri' ? 'mri' : 'ct'].map((p) => p.id); },
    // The teaching hook: ask what any structure IS radiologically, and what the
    // current window is actually doing to it. `grey` near 0 or 1 means the window
    // has clipped that tissue away — which is the lesson.
    tissueOf(partId) {
      const r = recs.find((x) => x.part.id === partId);
      if (!r) return null;
      const hu = IMG_hu(r);
      const raw = (mode === 'mri') ? (weighting === 't2' ? r.tis.t2 : r.tis.t1) * 1000 : hu;
      return {
        cls: r.cls, hu, t1: r.tis.t1, t2: r.tis.t2,
        z: r.tis.z, att: r.tis.att, echo: r.tis.echo,
        grey: +IMG_win(raw, uShared.uLevel.value, uShared.uWidth.value).toFixed(3),
      };
    },
  };
  Object.defineProperties(api, {
    slice:   { get: () => slice, configurable: true },
    sliceMm: { get: () => IMG_sliceMm(), configurable: true },
    window:  { get: () => ({ level: uShared.uLevel.value, width: uShared.uWidth.value }), configurable: true },
    plane:   { get: () => IMG_PLANE_NAMES[planeOf[axis]], configurable: true },
    weighting: { get: () => weighting, configurable: true },
    failed:  { get: () => failed, configurable: true },
  });
  return api;
}
