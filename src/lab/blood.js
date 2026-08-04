/*
 * blood.js — cut tissue bleeds, blood runs downhill, it pools, it clots, and you
 * wipe it away with gauze.
 *
 * This is a presence module, not a gore module. The thing that makes a dissection
 * feel real is not quantity of red — it is that the fluid OBEYS THE ANATOMY. Blood
 * that tracks the contour of a liver lobe, gathers in the low point of the cavity,
 * goes tacky and brown-black over a minute, and leaves the serosa glossy under the
 * theatre lamp reads as a specimen. Blood that sprays as a screen-space particle
 * effect reads as a video game. Everything here is built around that one idea.
 *
 * THREE BLEEDING REGISTERS, deliberately distinguishable at a glance. A student
 * should be able to name the vessel they have opened from the behaviour alone,
 * which is a genuine clinical skill:
 *
 *   capillary — dark, slow, low-pressure. Wells up and BEADS along the cut edge,
 *     surface tension holding each drop until it is heavy enough to creep. Stops
 *     on its own inside ~13 s: that is haemostasis, the platelet plug forming.
 *   venous    — dark red-purple (deoxygenated haemoglobin), steady, non-pulsatile,
 *     under low pressure so it does not throw. It just RUNS, and where it runs is
 *     decided entirely by the shape of the organ under it.
 *   arterial  — bright scarlet (~98% saturated), and PULSATILE. It is ejected in
 *     time with systole, so it arcs, lands away from the wound, and the volume
 *     visibly rises and falls with the beat. Synchronised to physio.js's cardiac
 *     phase when one is supplied; falls back to a plausible ~1.1 Hz otherwise.
 *
 * HOW BLOOD STICKS TO THE ANATOMY. A running droplet does not integrate against a
 * collision mesh — far too expensive for 400 of them. Instead each droplet knows
 * the surface normal it is sitting on, walks along the DOWNHILL TANGENT of that
 * plane, and then re-snaps itself to the specimen with one very short ray fired
 * into the surface. Snapping (rather than colliding) is what makes it track the
 * contours of a lobe instead of tunnelling through it, and it costs one ray per
 * droplet per re-snap instead of per frame.
 *
 * PERFORMANCE CONTRACT, because this runs on a school laptop next to hand tracking:
 *   - Everything is pooled and pre-allocated. update() allocates NOTHING.
 *   - Hard cap of 400 droplets and 384 stains (4 instance pools of 96: two blob
 *     shapes x glossy/matte). Full pools recycle the oldest mark.
 *   - Hard cap of BLD_RAY_BUDGET raycasts per frame, spent round-robin. Stationary
 *     droplets never cast at all. A hundred droplets running at once degrades to
 *     slightly laggier surface tracking, never to a frame-rate collapse.
 *   - Two draw calls for every stain in the scene, one for every droplet.
 *
 * DEFEATABLE BY DESIGN. A squeamish fourteen-year-old and a medical student are
 * both users of this program. setIntensity(0) retires everything already on the
 * specimen and stops new bleeding; setEnabled(false) hides it outright and gives
 * every borrowed material property back. Default intensity is 0.55 — enough that a
 * cut obviously bleeds, nowhere near a horror film.
 *
 * PHYSIOLOGICAL COUPLING. physio.js exposes setBloodVolume(fraction) and drives it
 * through Starling -> stroke volume -> pulse pressure -> baroreflex, exactly as
 * haemorrhage does in an animal. Nothing was calling it, so a specimen could be
 * bled white while the monitor showed an untroubled 48 bpm — the one thing a
 * physiology lesson about haemorrhage must not do. setVolumeSink(physio.setBloodVolume)
 * closes that loop; see the BLD_TOTAL_ML note for how the millilitres are counted.
 *
 * Contract:
 *   createBlood(THREE, scene) -> {
 *     bleed(o), stain(point, normal, radius, darkness, partId[, kind]),
 *     swab(point, radius) -> count, wetness(partId) -> 0..1,
 *     setEnabled(on), setIntensity(k), setPhaseSource(fn), setVolumeSink(fn),
 *     setSpecimen(parts), update(dtMsOrSec), clear(), dispose(),
 *     get enabled, get intensity, get bloodLostML, get bloodFraction, get stats }
 *   o = { point:Vector3, normal:Vector3, partId, severity:0..1,
 *         kind:'capillary'|'venous'|'arterial' }
 *
 * Every public method sanitises its own arguments and none of them throws; a
 * plain {x,y,z} or an unnormalised normal is accepted. update() additionally
 * catches, because it is called from a render loop this module does not own and a
 * throw from here would freeze the whole lab over a cosmetic subsystem.
 *
 * WIRING. This module is optional and, as of this writing, main.js does not
 * construct it — see the note at the bottom of the file for the three lines that
 * do, and for why they are not written here.
 */

const BLD_MAX_DROPLETS = 400;   // hard cap, per the module brief
const BLD_STAIN_CAP = 96;       // per pool; 2 shapes x (wet|clotted) = 4 pools = 384
                                // stain RECORDS are BLD_STAIN_CAP * 4 = 384 to match
const BLD_MAX_SOURCES = 20;     // a specimen can only be bleeding from so many cuts
const BLD_RAY_BUDGET = 22;      // surface-snap raycasts allowed per frame, total
// How far a droplet runs before it leaves a mark, as a MULTIPLE OF ITS OWN SIZE.
// This has to stay below the merge reach in BLD_MERGE or a run deposits a fresh
// stain every step instead of growing the one behind it, and the stain pool is
// exhausted inside ten seconds — which silently evicts the older, darker,
// clotted marks that are the entire point of the sixty-second oxidation clock.
const BLD_TRAIL_STEP = 1.4;
// Merge radius as a fraction of the two stains' summed radii. MUST stay above
// BLD_TRAIL_STEP / 2.1 or consecutive trail marks land just outside each other's
// reach and never coalesce — the failure is invisible in a screenshot and only
// shows up as the pool exhausting itself under sustained bleeding.
const BLD_MERGE = 0.9;
// ...but merging is also capped in ABSOLUTE world units, and that cap is what
// separates the two things blood does. A droplet running past deposits each mark
// somewhere new, outruns the reach after a few, and leaves a chain of overlapping
// blobs — a streak. Droplets that keep dying in the same low point deposit inside
// the reach over and over and grow one mark into a genuine pool. Without this cap
// a long trickle merges into a single circular lake, which is the wrong shape for
// running blood no matter how good it looks standing still.
const BLD_MERGE_MAX = 0.24;
const BLD_CLOT_SECONDS = 60;    // fresh -> fully oxidised and clotted
const BLD_DULL_SECONDS = 34;    // when a stain migrates from the glossy to the matte pool
const BLD_STAIN_R_MAX = 0.52;   // a pool in the cavity, not a lake
const BLD_G = 14;               // gravity, units/s^2 — see BLD_note_gravity below
// The dissection tray. env.js builds its table at exactly this height and exports
// it as env.tableY; the table is NOT a registered part, so it is not in the
// raycast target list and a droplet would otherwise sail straight through it and
// be deleted in mid-air. Blood that misses the specimen has to land ON THE TRAY —
// a spurt that vanishes where the bench is reads as a rendering bug, and blood
// pooling around the specimen is a real and immediately readable thing.
const BLD_TABLE_Y = -1.7;

/* Blood volume, and why this module is allowed to have an opinion about it.
 *
 * physio.js exposes setBloodVolume(fraction) and drives it through Starling ->
 * stroke volume -> pulse pressure -> baroreflex, exactly as haemorrhage does in
 * an animal. Nothing was calling it, so a specimen could be bled for two minutes
 * with the monitor showing an untroubled 48 bpm — the one thing a physiology
 * lesson about haemorrhage must not do.
 *
 * The numbers: Rana pipiens carries roughly 5-6 % of body mass as blood, so a
 * 30 g frog holds about 1.7 mL. One world unit is a centimetre (see the gravity
 * note), so a droplet of diameter d units has volume (pi/6)d^3 cm^3 — a 0.05-unit
 * bead is about 0.065 uL.
 *
 * The sampling factor is the honest part, it lives PER REGISTER (see `sample` in
 * BLD_REGISTER), and it is bounded by physiology rather than chosen for feel.
 *
 * Why per register and not one global number. What is drawn is a SAMPLE of the
 * flow, and the three registers are sampled at wildly different fidelity because
 * they are drawn to look like themselves. An arterial jet ATOMISES — it is drawn
 * as many small fast droplets, so droplet volume badly under-represents the real
 * flow. A venous runnel is a coherent stream and the drawn droplets are close to
 * life size. Capillary blood wells as discrete beads and is very nearly 1:1.
 *
 * With one global factor the arithmetic came out backwards: arterial lost 16 uL/s
 * against venous at 27, because arterial droplets are drawn smaller and volume
 * goes as the cube of diameter. That inverts the single most important fact about
 * bleeding — arterial haemorrhage is the emergency, which is WHY it is taught
 * first — so the drawn droplets are not the accounting unit. Per-register factors
 * are, and they are calibrated against measured droplet throughput.
 *
 * The ceiling is real physiology: BLOOD CANNOT LEAVE FASTER THAN THE HEART
 * DELIVERS IT. A frog's cardiac output is on the order of 5-10 mL/min, i.e.
 * 80-170 uL/s, and no single wound may exceed it. Calibrated worst case, wound
 * held open at severity 1 and intensity 1:
 *
 *   arterial  ~70 uL/s  -> exsanguinated in ~25 s   (a large fraction of output)
 *   venous    ~28 uL/s  -> ~60 s
 *   capillary  ~3 uL/s  -> self-limiting; a single nick costs ~15 uL, under 1 %
 *
 * An earlier draft used a flat 60, which emptied a frog in ten seconds at five to
 * nine times its cardiac output. It looked dramatic and it was nonsense.
 */
const BLD_TOTAL_ML = 1.7;

/*
 * Why gravity is 14 and not 9.81. The frog is about 8 world units long and stands
 * in for roughly 8 cm, so one unit is a centimetre and true gravity would be ~980
 * units/s^2. At that acceleration an arterial arc crosses the whole specimen in
 * three frames and reads as a red flicker. The teaching content of a spurt is
 * WHERE it lands and that it is periodic, not its muzzle velocity, so the arc is
 * slowed to something the eye can actually follow. This is the one place in the
 * module where we knowingly trade physics for legibility, and it is deliberate.
 */

/* Per-register physiology. These numbers are the whole personality of each kind of
 * bleeding, so they live in one table where they can be read side by side. */
const BLD_REGISTER = {
  capillary: {
    fresh: 0x7c1216,      // dark: capillary blood is a mix, and it is thin and slow
    rate: 8,              // droplets/s at severity 1, intensity 1
    ttl: 13,              // seconds before the source dries up (platelet plug)
    speed: [0.05, 0.15],  // creep, not run
    size: [0.030, 0.058],
    jet: 0,               // it wells; it is not under enough pressure to throw
    slopeGate: 0.26,      // surface tension: needs a real gradient before it moves
    spread: 0.17,         // beads scattered ALONG the cut edge
    stainR: [0.050, 0.095],
    life: [3.5, 7],
    pulse: false,
    sample: 3,            // welling beads are drawn near life size
  },
  venous: {
    fresh: 0x6b0f1c,      // dark red-purple — deoxygenated haemoglobin
    rate: 15, ttl: 26,
    speed: [0.30, 0.55],
    size: [0.045, 0.088],
    jet: 0.14,            // barely lifts off the surface; venous pressure is low
    slopeGate: 0.06,
    spread: 0.10,
    stainR: [0.085, 0.155],
    life: [6, 11],
    pulse: false,
    sample: 5,            // a coherent runnel; drawn droplets are close to real
  },
  arterial: {
    fresh: 0xb81d20,      // bright scarlet — oxyhaemoglobin, ~98% saturated
    rate: 28, ttl: 34,
    speed: [0.55, 1.00],
    size: [0.032, 0.072],
    jet: 1.0,             // ejected: this is the one that arcs
    slopeGate: 0.04,
    spread: 0.07,
    stainR: [0.070, 0.140],
    life: [4, 8],
    pulse: true,
    sample: 22,           // a jet ATOMISES: many small drawn droplets, huge flow
  },
};

// Where every stain ends up: oxidised, denatured, brown-black clot. Real dried
// blood is emphatically NOT red, and getting this wrong is the single most common
// tell of a fake. A five-minute-old cut must be almost the colour of the shadow.
const BLD_CLOT_HEX = 0x2a0c0a;
// Venous blood BRIGHTENS for the first few seconds out of the wound, because it
// meets air and picks up oxygen, before clotting takes it the other way. It is a
// real, observable, teachable phenomenon and it costs four lines.
const BLD_OXID_HEX = 0x8f1a18;

const BLD_clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const BLD_rand = (a, b) => a + Math.random() * (b - a);
// Every number that crosses the module boundary goes through this. A single NaN
// in a droplet position propagates into its stain, into the stain's host-local
// transform, and into an instance matrix — at which point the InstancedMesh's
// bounding sphere is NaN and the pool silently stops drawing ANY of its
// instances. That failure looks exactly like "the blood module does nothing",
// which is the most expensive kind of bug to chase.
const BLD_num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const BLD_smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Byte-wise sRGB blend. Colours here are authored as sRGB hex literals (the space
// the eye reads), so they must be mixed in that space; lerping in the linear
// working space washes dark maroons out toward pink at the midpoint.
function BLD_mix(a, b, t) {
  t = BLD_clamp(t, 0, 1);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((ar + (br - ar) * t) & 255) << 16
       | ((ag + (bg - ag) * t) & 255) << 8
       | ((ab + (bb - ab) * t) & 255);
}

/* A single blood mark, painted as an alpha mask on a canvas. RGB is left pure
 * white so the per-instance colour has complete control of the hue — the texture
 * carries SHAPE only.
 *
 * Two details do most of the work here. The outline is perturbed by three
 * summed harmonics so no two rotations of it read as the same blob, and the rim is
 * slightly MORE opaque than the middle: liquid that has spread and started to dry
 * concentrates pigment at its edge (the coffee-ring effect), and that dark contour
 * line around a pool is most of what makes it look like a fluid rather than a
 * decal someone pasted on. */
function BLD_blobCanvas(size, seed) {
  if (typeof document === 'undefined') return null;   // headless: caller degrades
  let cv, ctx, img;
  try {
    cv = document.createElement('canvas');
    cv.width = cv.height = size;
    ctx = cv.getContext('2d');
    // A 2D context is not guaranteed: it is refused under some privacy/canvas-
    // fingerprinting blockers and when the GPU process has fallen over. Returning
    // null degrades to untextured marks, which is ugly; THROWING here would take
    // the whole module out, and construction happens once at startup where a
    // throw is silently swallowed by main.js's try/catch. Report and continue.
    if (!ctx) return null;
    img = ctx.createImageData(size, size);
  } catch (e) {
    console.warn('blood: canvas unavailable; stains will render untextured', e);
    return null;
  }
  const d = img.data;
  const cx = size / 2, cy = size / 2;
  const p1 = seed * 1.7, p2 = seed * 3.1 + 1.2, p3 = seed * 0.9 + 2.4;
  const a1 = 0.20 + (seed % 3) * 0.045, a2 = 0.13, a3 = 0.075;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - cx) / cx, dy = (y + 0.5 - cy) / cy;
      const r = Math.hypot(dx, dy);
      const th = Math.atan2(dy, dx);
      // Irregular outline: three harmonics, so the silhouette never looks stamped.
      const edge = 0.80 * (1 + a1 * Math.sin(3 * th + p1)
                             + a2 * Math.sin(7 * th + p2)
                             + a3 * Math.sin(11 * th + p3));
      let a = 0;
      if (r < edge) {
        a = BLD_smooth((edge - r) / 0.22);          // soft feather at the boundary
        a = 0.62 + a * 0.30;                        // body of the mark
        const rim = 1 - BLD_clamp(Math.abs(r - edge * 0.90) / (edge * 0.16), 0, 1);
        a += rim * rim * 0.16;                      // coffee-ring: darker at the edge
        a = BLD_clamp(a, 0, 1);
      }
      // A few satellites, so a mark reads as splashed rather than poured.
      for (let k = 0; k < 5; k++) {
        const sa = seed * 2.3 + k * 2.399963;       // golden-angle scatter
        const sr = 0.62 + ((k * 7 + seed * 13) % 10) / 26;
        const sx = Math.cos(sa) * sr, sy = Math.sin(sa) * sr;
        const srad = 0.055 + ((k * 3 + seed) % 5) * 0.013;
        const sd = Math.hypot(dx - sx, dy - sy);
        if (sd < srad) a = Math.max(a, BLD_smooth((srad - sd) / srad) * 0.88);
      }
      const o = (y * size + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = 255;
      d[o + 3] = (a * 255) | 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export function createBlood(THREE, scene) {
  /* ---- scratch ----------------------------------------------------------- *
   * THREE arrives as a parameter, so these cannot live at module top level the
   * way plain constants do — the closure is the equivalent. Nothing below this
   * line may allocate inside update(); every vector in the hot path is one of
   * these, reused. 400 droplets at 60 fps is exactly where per-frame garbage
   * turns into visible stutter on the machines this has to run on. */
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
  const _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3();
  const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _q = new THREE.Quaternion();
  const _scale = new THREE.Vector3();
  const _m4 = new THREE.Matrix4(), _inv = new THREE.Matrix4();
  const _nm = new THREE.Matrix3();
  const _col = new THREE.Color();
  const _ray = new THREE.Raycaster();
  const _UP = new THREE.Vector3(0, 1, 0);
  const _FWD = new THREE.Vector3(0, 0, 1);
  const _DOWN = new THREE.Vector3(0, -1, 0);
  const _ZERO = new THREE.Vector3(0, 0, 0);

  // Dedicated scratch for the two public entry points, which must not borrow _v1
  // — bleed() calls stain() while still holding a value in it.
  const _pt = new THREE.Vector3();
  const _nr = new THREE.Vector3();
  const _ps = new THREE.Vector3();
  const _ns = new THREE.Vector3();
  const _sw = new THREE.Vector3();

  /* Normals and points arrive from callers this module does not control: cutting.js
   * face normals, hand-authored bleed() calls, plain {x,y,z} literals from the
   * verification harness. Two things go wrong and neither announces itself.
   *   - A plain object has no .lengthSq(), so the old guard `normal.lengthSq() > 0`
   *     threw straight out of a public method and, from bleed(), out of the middle
   *     of dissect.js's event dispatch.
   *   - A non-unit normal reaches THREE.Raycaster.set(), which DOCUMENTS that the
   *     direction must be normalised and does not check. The ray is then scaled,
   *     `far` no longer means what it says, and surface snapping quietly stops
   *     finding the organ the droplet is sitting on.
   * Both are cheap to make impossible. */
  function vecTo(v, out, fallback) {
    if (v) { out.set(BLD_num(v.x), BLD_num(v.y), BLD_num(v.z)); return out; }
    return out.copy(fallback || _ZERO);
  }
  function normalTo(n, out) {
    vecTo(n, out, _UP);
    const l = out.length();
    if (l > 1e-6) out.multiplyScalar(1 / l); else out.copy(_UP);
    return out;
  }

  const owned = [];
  const track = (x) => { owned.push(x); return x; };

  const root = new THREE.Group();
  root.name = 'blood';
  // Blood is never a raycast target for dissect.js — but dissect.js only ever
  // casts against registered part meshes, so this group cannot shadow picking no
  // matter where it sits. It still gets renderOrder so it composites after tissue.
  root.renderOrder = 3;
  scene.add(root);

  let enabled = true;
  let intensity = 0.55;         // moderate by default; see the header
  let phaseSrc = null;          // physio.js injects a cardiac phase getter here
  let clock = 0;
  let frame = 0;
  let disposed = false;
  let lostML = 0;               // cumulative blood lost, millilitres
  let volSink = null;           // physio.js's setBloodVolume, if wired
  let volAt = -1;

  /* ---- geometry shared by every instance --------------------------------- */
  // TRAP, and it is a silent one: `instanceColor` never reaches the fragment
  // shader on its own. three.js's color_fragment chunk applies vColor only under
  // USE_COLOR / USE_COLOR_ALPHA, both of which come from material.vertexColors —
  // USE_INSTANCING_COLOR merely multiplies vColor in the VERTEX stage. So per-
  // instance colour requires vertexColors = true. And the moment vertexColors is
  // true the vertex shader declares `attribute vec3 color`; a geometry without
  // that attribute leaves it unbound, WebGL feeds the generic default of black,
  // and every instance renders pure black with no warning anywhere. Hence: set
  // vertexColors AND give both geometries an all-ones colour attribute.
  const unitColors = (geo) => {
    const n = geo.attributes.position.count;
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    return geo;
  };

  const stainGeo = track(unitColors(new THREE.PlaneGeometry(1, 1)));
  // Radius 0.5 so the instance scale reads directly as a droplet DIAMETER.
  const dropGeo = track(unitColors(new THREE.SphereGeometry(0.5, 8, 6)));

  const blobTex = [0, 1].map((i) => {
    const cv = BLD_blobCanvas(128, i * 5 + 3);
    if (!cv) return null;
    const t = track(new THREE.CanvasTexture(cv));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });

  /* Two stain materials, and the difference between them is the whole point of
   * the sixty-second clock. Fresh blood is a wet film with a specular sheen that
   * catches the theatre lamp; clotted blood is a matte, tacky crust that eats
   * light. Same geometry, same instancing, different roughness — and a stain
   * physically migrates from one pool to the other as it ages, which is the only
   * way to vary roughness per instance without writing a custom shader. */
  const mkStainMat = (wet) => track(new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,                        // required — see the trap note above
    roughness: wet ? 0.16 : 0.78,
    metalness: 0,
    clearcoat: wet ? 0.9 : 0.05,
    clearcoatRoughness: wet ? 0.08 : 0.55,
    transparent: true,
    opacity: 1,
    depthWrite: false,                         // a film on tissue, not a solid
    // Stains sit microscopically above the surface they belong to. Depth bias is
    // cheaper and far more reliable than trying to pick a normal offset that
    // works for both a 0.05-unit bead and a 0.5-unit pool.
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    side: THREE.DoubleSide,                    // organs get lifted and turned over
  }));
  const stainMatWet = mkStainMat(true);
  const stainMatDry = mkStainMat(false);

  const dropMat = track(new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.12, metalness: 0,
    clearcoat: 1.0, clearcoatRoughness: 0.04,  // a bead of liquid is a tiny mirror
    sheen: 0.4, sheenColor: new THREE.Color(0xff8a72),
  }));

  /* ---- instanced pools ---------------------------------------------------- */
  function mkPool(geo, material, cap) {
    const im = new THREE.InstancedMesh(geo, material, cap);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    im.instanceColor.setUsage(THREE.DynamicDrawUsage);
    // TRAP: an InstancedMesh is frustum-tested against its GEOMETRY's bounding
    // sphere unless you maintain object.boundingSphere yourself. Ours is a
    // half-unit quad at the origin while its instances are scattered over the
    // whole specimen, so the renderer would cull the entire pool the moment the
    // origin left the frustum — blood vanishing when you orbit. Opt out.
    im.frustumCulled = false;
    im.castShadow = false;
    im.receiveShadow = false;
    im.renderOrder = 3;
    im.count = 0;                              // high-water mark, grown on demand
    const _m = new THREE.Matrix4();
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < cap; i++) im.setMatrixAt(i, _m);
    root.add(im);
    // Free list seeded descending so pop() hands out low indices first and the
    // high-water mark stays tight when only a few instances are live.
    const free = new Int32Array(cap);
    for (let i = 0; i < cap; i++) free[i] = cap - 1 - i;
    return { im, cap, free, nfree: cap, high: 0, dirty: false, cdirty: false };
  }
  const poolAlloc = (p) => {
    if (p.nfree === 0) return -1;
    const i = p.free[--p.nfree];
    if (i + 1 > p.high) { p.high = i + 1; p.im.count = p.high; }
    return i;
  };
  const poolFree = (p, i) => {
    if (i < 0) return;
    _m4.makeScale(0, 0, 0);
    p.im.setMatrixAt(i, _m4);
    p.dirty = true;
    p.free[p.nfree++] = i;
    if (p.nfree === p.cap) { p.high = 0; p.im.count = 0; }   // fully idle: draw nothing
  };

  // Index as pools[state * 2 + variant]; state 0 = wet/glossy, 1 = clotted/matte.
  const pools = [
    mkPool(stainGeo, stainMatWet, BLD_STAIN_CAP), mkPool(stainGeo, stainMatWet, BLD_STAIN_CAP),
    mkPool(stainGeo, stainMatDry, BLD_STAIN_CAP), mkPool(stainGeo, stainMatDry, BLD_STAIN_CAP),
  ];
  if (blobTex[0]) { stainMatWet.map = blobTex[0]; stainMatDry.map = blobTex[0]; }
  // The two shape variants need different maps, which means different materials.
  // Cloning is cheaper in code than an atlas + a shader patch, and four draw calls
  // for every stain on the specimen is not a budget anyone needs to defend.
  if (blobTex[1]) {
    const wet2 = track(stainMatWet.clone()); wet2.map = blobTex[1];
    const dry2 = track(stainMatDry.clone()); dry2.map = blobTex[1];
    pools[1].im.material = wet2;
    pools[3].im.material = dry2;
  }
  const dropPool = mkPool(dropGeo, dropMat, BLD_MAX_DROPLETS);

  /* ---- records ------------------------------------------------------------ */
  // Every record below is created once, here, and then reused forever. `alive`
  // is the only thing that ever changes about a slot's existence.
  const drops = [];
  for (let i = 0; i < BLD_MAX_DROPLETS; i++) {
    drops.push({
      alive: false, idx: -1, kind: 'venous', partId: null,
      pos: new THREE.Vector3(), nrm: new THREE.Vector3(0, 1, 0),
      vel: new THREE.Vector3(), flow: new THREE.Vector3(1, 0, 0),
      flying: false, onTable: false, speed: 0, size: 0.05, age: 0, life: 6,
      trail: 0, hex: 0, held: false, born: 0, cfresh: false,
    });
  }
  let dropsLive = 0;

  const stains = [];
  for (let i = 0; i < BLD_STAIN_CAP * 4; i++) {
    stains.push({
      alive: false, pool: -1, idx: -1, variant: 0, state: 0,
      pos: new THREE.Vector3(), nrm: new THREE.Vector3(0, 1, 0),
      local: new THREE.Vector3(), localN: new THREE.Vector3(0, 1, 0),
      host: null, partId: null, spin: 0, aspect: 1,
      r: 0.05, rTarget: 0.05, born: 0, kind: 'venous', darkness: 0,
      dying: 0, smear: new THREE.Vector3(), bead: -1, dirty: true, seq: 0,
      cfresh: true,
    });
  }
  let stainSeq = 0;

  const sources = [];
  for (let i = 0; i < BLD_MAX_SOURCES; i++) {
    sources.push({
      alive: false, kind: 'venous', partId: null, severity: 0.5,
      pos: new THREE.Vector3(), nrm: new THREE.Vector3(0, 1, 0),
      edge: new THREE.Vector3(1, 0, 0), hasEdge: false,
      age: 0, ttl: 10, acc: 0, seq: 0,
    });
  }
  let srcSeq = 0;
  const lastCut = new Map();      // partId -> last bleed point, to infer the cut edge

  /* ---- specimen registry -------------------------------------------------- */
  const meshById = new Map();
  const targets = [];             // raycast candidates, refreshed lazily
  let targetsAt = -1;
  let explicit = false;

  function setSpecimen(parts) {
    clear();
    meshById.clear();
    explicit = false;
    if (parts && parts.length) {
      explicit = true;
      for (const p of parts) if (p && p.mesh) meshById.set(p.id, p.mesh);
    }
    targetsAt = -1;
  }

  // If nobody called setSpecimen, discover the specimen from the scene: every part
  // mesh carries userData.partId by the app's own data contract. This is what lets
  // the module be wired with two lines in main.js and still work after a specimen
  // swap, rather than silently bleeding onto nothing.
  // Hoisted out of refreshTargets. These ran every 0.4 s, which is not the hot
  // path, but the module's stated contract is that the update loop allocates
  // NOTHING and a closure literal inside a function body is an allocation every
  // time that body runs. Declaring them once costs nothing and makes the claim
  // in the header true rather than nearly true.
  const _collectPart = (o) => {
    if (o.isMesh && o.userData && o.userData.partId) meshById.set(o.userData.partId, o);
  };
  const _collectTarget = (m) => {
    // A hidden part is a part the student has not reached yet. Blood must not
    // snap to the deep layer through the body wall that is still covering it.
    if (m.visible && m.parent) targets.push(m);
    // Every material still on the specimen, so the sweep below can tell which
    // borrowed materials belong to meshes that have gone away.
    if (m.material) {
      if (Array.isArray(m.material)) { for (let i = 0; i < m.material.length; i++) _live.add(m.material[i]); }
      else _live.add(m.material);
    }
  };
  const _live = new Set();
  const _orphans = [];

  function refreshTargets() {
    if (clock - targetsAt < 0.4 && targetsAt >= 0) return;
    targetsAt = clock;
    targets.length = 0;
    if (!explicit || meshById.size === 0) {
      meshById.clear();
      scene.traverse(_collectPart);
    }
    _live.clear();
    meshById.forEach(_collectTarget);

    /* LEAK, and a visible one. applyWetness() borrows roughness/clearcoat off a
     * part's material and only ever gives them back through restore(), which it
     * reaches by iterating the CURRENT meshById. When a specimen is swapped or a
     * part is removed from the scene, the implicit rebuild above drops that mesh
     * from meshById — and its material, if it is shared with anything still on
     * screen or reused by the next specimen, is left permanently at bled-on
     * roughness with clearcoat raised. The organ stays wet-looking forever and
     * no amount of swabbing touches it, because nothing owns it any more.
     *
     * setSpecimen() is safe (it calls clear() -> restoreAll() first); this is the
     * path where nobody told us anything changed. Sweep the borrow ledger against
     * what is actually still on the specimen and hand back the difference. */
    if (matOrig.size) {
      _orphans.length = 0;
      matOrig.forEach((_, m) => { if (!_live.has(m)) _orphans.push(m); });
      for (let i = 0; i < _orphans.length; i++) restore(_orphans[i]);
      _orphans.length = 0;
    }
  }

  /* ---- cardiac phase ------------------------------------------------------ */
  // physio.js owns the real heartbeat if it is present. Without it we run our own
  // clock at 0.8 Hz so arterial bleeding is pulsatile in every build, and merely
  // UNSYNCHRONISED rather than absent when physio is missing. Degrading to "not
  // pulsatile at all" would lose the diagnostic point entirely.
  //
  // 0.8 Hz is 48 bpm, which is physio.js's own Rana profile at 20 C — not the
  // 66 bpm of a resting human. An ectotherm's heart rate is temperature-bound and
  // an amphibian at bench temperature is genuinely this slow; borrowing a
  // mammalian figure for a frog would teach the wrong thing in the one build
  // where there is no physiology model to correct it.
  function phase() {
    if (phaseSrc) {
      try {
        const p = phaseSrc();
        if (typeof p === 'number' && isFinite(p)) return ((p % 1) + 1) % 1;
      } catch (e) { phaseSrc = null; }   // a throwing source is worse than none
    }
    return (clock * 0.8) % 1;
  }
  // Systolic ejection profile. Sharp upstroke, quicker decay, and a floor that
  // never reaches zero: arterial pressure falls in diastole, it does not stop.
  function systole() {
    const p = phase();
    if (p < 0.22) {
      const s = p / 0.22;
      return 0.06 + Math.pow(Math.sin(s * Math.PI), 1.6) * 0.94;
    }
    return 0.06;
  }

  /* ---- surface maths ------------------------------------------------------ */
  // Downhill tangent: gravity with its normal component removed. Length is the
  // sine of the slope, i.e. 0 on a level surface and 1 on a vertical wall — which
  // is exactly the number surface tension has to overcome, so it doubles as the
  // gate that decides whether a bead creeps or just sits there and swells.
  function downhill(nrm, out) {
    out.copy(_DOWN).addScaledVector(nrm, -_DOWN.dot(nrm));
    return out.length();
  }

  // Compose a rotation that lays `local` onto the surface normal and then spins it
  // about that normal so its local +X points along `along`. Two quaternions, no
  // allocation, and it is what makes a running droplet elongate in the direction
  // of travel instead of staying a sphere.
  function orient(localAxis, nrm, along, spin, out) {
    _qa.setFromUnitVectors(localAxis, nrm);
    if (along) {
      _v5.set(1, 0, 0).applyQuaternion(_qa);
      const c = _v5.dot(along);
      const s = _v4.crossVectors(_v5, along).dot(nrm);
      _qb.setFromAxisAngle(nrm, Math.atan2(s, c) + spin);
    } else {
      _qb.setFromAxisAngle(nrm, spin);
    }
    return out.multiplyQuaternions(_qb, _qa);
  }

  /* ---- raycast budget ----------------------------------------------------- */
  let rayBudget = 0;
  function castSurface(origin, dir, far) {
    if (rayBudget <= 0 || targets.length === 0) return null;
    rayBudget--;
    _ray.set(origin, dir);
    _ray.near = 0;
    _ray.far = far;
    const hits = _ray.intersectObjects(targets, false);
    return hits.length ? hits[0] : null;
  }
  function hitNormal(hit, out) {
    if (hit.face) {
      out.copy(hit.face.normal)
        .applyNormalMatrix(_nm.getNormalMatrix(hit.object.matrixWorld)).normalize();
    } else out.set(0, 1, 0);
    // Faces can be wound away from us on a double-sided or lifted organ. Blood
    // sits on the side the ray arrived from, so flip toward the incoming ray.
    if (out.dot(_ray.ray.direction) > 0) out.negate();
    return out;
  }

  /* ---- droplets ----------------------------------------------------------- */
  function spawnDroplet(src, reg, pulse) {
    if (dropsLive >= BLD_MAX_DROPLETS) return null;
    let d = null;
    for (let i = 0; i < drops.length; i++) if (!drops[i].alive) { d = drops[i]; break; }
    if (!d) return null;
    const idx = poolAlloc(dropPool);
    if (idx < 0) return null;

    d.alive = true; d.idx = idx; d.kind = src.kind; d.partId = src.partId;
    d.age = 0; d.trail = 0; d.held = false; d.born = clock; d.cfresh = true;
    d.onTable = false;
    d.life = BLD_rand(reg.life[0], reg.life[1]);
    d.size = BLD_rand(reg.size[0], reg.size[1]) * (0.7 + intensity * 0.6);
    d.hex = reg.fresh;
    d.nrm.copy(src.nrm);

    // Beading along the cut edge is what capillary bleeding LOOKS like, and the
    // edge direction is free: it is the line between consecutive bleed() calls on
    // the same part, i.e. the path the scalpel actually took. Without a second
    // call yet, scatter isotropically in the tangent plane instead.
    d.pos.copy(src.pos);
    if (src.hasEdge) {
      d.pos.addScaledVector(src.edge, BLD_rand(-1, 1) * reg.spread * 3.2);
      _v1.crossVectors(src.nrm, src.edge).normalize();
      d.pos.addScaledVector(_v1, BLD_rand(-1, 1) * reg.spread * 0.5);
    } else {
      _v1.set(BLD_rand(-1, 1), BLD_rand(-1, 1), BLD_rand(-1, 1));
      _v1.addScaledVector(src.nrm, -_v1.dot(src.nrm)).normalize();
      d.pos.addScaledVector(_v1, BLD_rand(0, 1) * reg.spread);
    }
    d.pos.addScaledVector(src.nrm, d.size * 0.35);

    downhill(d.nrm, d.flow);
    if (d.flow.lengthSq() < 1e-6) d.flow.set(1, 0, 0); else d.flow.normalize();

    const v0 = BLD_rand(reg.speed[0], reg.speed[1]);
    if (reg.jet > 0.2) {
      // Arterial: a genuine ejection along the wound normal, scaled by where we
      // are in the cardiac cycle. This is the pulsatility, and it is why arterial
      // blood lands somewhere other than the cut it came from.
      d.flying = true;
      d.vel.copy(src.nrm).multiplyScalar(v0 * reg.jet * (0.35 + pulse * 3.4));
      d.vel.addScaledVector(d.flow, v0 * 0.5);
      _v1.set(BLD_rand(-1, 1), BLD_rand(-1, 1), BLD_rand(-1, 1)).multiplyScalar(v0 * 0.18);
      d.vel.add(_v1);
      d.speed = v0;
    } else if (reg.jet > 0) {
      d.flying = true;
      d.vel.copy(src.nrm).multiplyScalar(v0 * reg.jet);
      d.vel.addScaledVector(d.flow, v0 * 0.7);
      d.speed = v0;
    } else {
      d.flying = false;
      d.speed = 0;                     // capillary: it wells in place and waits
    }
    /* Haemorrhage accounting. Charged at SPAWN, not at death: an arterial droplet
     * ejected across the bench has left the animal whether or not it ever lands on
     * anything, and a droplet swabbed up has still been lost. Volume of a sphere
     * of diameter d, times the sampling factor that turns the 400 drawn droplets
     * back into the flow they represent. */
    lostML += (Math.PI / 6) * d.size * d.size * d.size * (reg.sample || 5);
    dropsLive++;
    return d;
  }

  /* Tell physio.js how much blood is left. This is the coupling that makes a
   * haemorrhage a physiology lesson rather than a decal: physio runs the fraction
   * through Starling -> stroke volume -> pulse pressure -> baroreflex, so a
   * student who opens a major vessel and does not clamp it watches the pressure
   * fall and the rate climb on the monitor, which is the actual teaching point.
   * Throttled to 4 Hz — the baroreflex has a time constant of seconds and does
   * not care about frames. */
  function pushVolume() {
    if (!volSink || clock - volAt < 0.25) return;
    volAt = clock;
    try { volSink(BLD_clamp(1 - lostML / BLD_TOTAL_ML, 0, 1)); }
    catch (e) { volSink = null; }        // a throwing sink is worse than no sink
  }

  function killDroplet(d, deposit) {
    if (!d.alive) return;
    if (deposit) {
      const reg = BLD_REGISTER[d.kind] || BLD_REGISTER.venous;
      stain(d.pos, d.nrm, BLD_rand(reg.stainR[0], reg.stainR[1]) * (0.55 + intensity * 0.75),
        0, d.partId, d.kind);
    }
    d.alive = false;
    poolFree(dropPool, d.idx);
    d.idx = -1;
    dropsLive--;
  }

  function stepDroplet(d, dt) {
    d.age += dt;
    const reg = BLD_REGISTER[d.kind] || BLD_REGISTER.venous;

    if (d.held) {
      // A pool bead: parked in the middle of a stain, doing nothing but catching
      // the lamp. Its owning stain moves and frees it.
      return;
    }

    if (d.flying) {
      d.vel.y -= BLD_G * dt;
      _v1.copy(d.vel).multiplyScalar(dt);
      const step = _v1.length();
      if (step > 1e-6) {
        _v2.copy(_v1).normalize();
        // Flying droplets get first call on the ray budget: an arterial arc that
        // sails through the liver is far more damaging to belief than a running
        // trickle that lags a frame behind the contour.
        const hit = castSurface(d.pos, _v2, step * 1.7);
        if (hit) {
          d.pos.copy(hit.point);
          hitNormal(hit, d.nrm);
          d.partId = hit.object.userData.partId || d.partId;
          d.pos.addScaledVector(d.nrm, d.size * 0.3);
          d.flying = false;
          d.onTable = false;
          // Impact splash: a small mark right where it landed, then it runs.
          stain(d.pos, d.nrm, d.size * 1.5, 0, d.partId, d.kind);
          downhill(d.nrm, d.flow);
          d.speed = d.flow.length() > 0.02 ? d.vel.length() * 0.28 : 0;
          if (d.flow.lengthSq() > 1e-6) d.flow.normalize(); else d.flow.set(1, 0, 0);
          return;
        }
      }
      d.pos.add(_v1);

      /* The tray. env.js builds the table at BLD_TABLE_Y but it carries no
       * userData.partId, so it is deliberately not in the raycast target list —
       * spending rays on a plane whose height is a known constant would be
       * absurd. That left an arterial arc that overshot the specimen simply
       * winking out in mid-air, which is the single most obviously fake thing
       * blood can do. It lands, and it pools on the tray, exactly as it does on
       * a real bench: a specimen sitting in its own blood is most of what tells
       * a student the dissection has been going on for a while.
       *
       * Landing is a plane test, not a ray: no budget spent, and it cannot miss. */
      if (d.pos.y <= BLD_TABLE_Y) {
        d.pos.y = BLD_TABLE_Y;
        d.nrm.copy(_UP);
        d.flying = false;
        d.onTable = true;
        d.partId = null;                 // the tray is not a part; it never gets wet
        // Splash scaled by impact speed. A droplet that has fallen from a
        // reflected flap makes a small round mark; one ejected from an artery
        // arrives fast and spreads.
        const impact = BLD_clamp(d.vel.length() * 0.5, 0.6, 2.4);
        stain(d.pos, _UP, d.size * 1.6 * impact, 0.05, null, d.kind);
        // Flat surface: it has nowhere to run. It spreads where it fell.
        d.speed = 0;
        d.flow.set(1, 0, 0);
        return;
      }
      if (d.age > d.life) killDroplet(d, false);
      return;
    }

    /* --- crawling on the surface ------------------------------------------ */
    const slope = downhill(d.nrm, _v1);
    if (slope > 1e-5) _v1.multiplyScalar(1 / slope);
    else _v1.copy(d.flow);

    if (slope < reg.slopeGate) {
      // Not enough gradient to beat surface tension. The droplet SWELLS instead of
      // running — which is exactly what capillary blood does on a flat cut face,
      // and it is why capillary bleeding beads rather than streams.
      d.speed *= Math.exp(-dt * 6);
      d.size = Math.min(d.size * (1 + dt * 0.28), reg.size[1] * 1.9);
      if (d.age > 1.1 + reg.slopeGate * 2) { killDroplet(d, true); return; }
    } else {
      // Direction eases toward the new downhill so the path curves around a lobe
      // rather than snapping between facets.
      d.flow.lerp(_v1, Math.min(1, dt * 7)).normalize();
      const drive = (slope - reg.slopeGate) * BLD_G * 0.22;
      d.speed += (drive - d.speed * 2.6) * dt;      // viscous terminal velocity
      d.speed = Math.max(0, Math.min(d.speed, 2.4));
    }

    const move = d.speed * dt;
    if (move > 1e-6) {
      d.pos.addScaledVector(d.flow, move);
      d.trail += move;
      // The trail IS pooling: each mark it leaves is a real stain that merges with
      // its neighbours, so a long run resolves into one continuous streak rather
      // than a string of beads, and the streak is what the student wipes away.
      if (d.trail > d.size * BLD_TRAIL_STEP) {
        d.trail = 0;
        stain(d.pos, d.nrm, d.size * 1.05, 0.06, d.partId, d.kind);
        d.size *= 0.965;                            // it leaves some of itself behind
      }
    }

    if (d.age > d.life || d.size < 0.012) { killDroplet(d, true); return; }
    if (d.speed < 0.012 && d.age > 1.2) { killDroplet(d, true); return; }
  }

  // Re-snap a crawling droplet to the specimen. Fired from just above the surface
  // straight into it: if the anatomy curved away beneath the step we just took,
  // the hit is further down and the droplet follows the contour; if the anatomy
  // rose, the hit is nearer and it climbs. This tiny ray is the entire reason
  // blood tracks the organ instead of sliding through it.
  function snapDroplet(d) {
    if (!d.alive || d.flying || d.held) return;
    // On the tray there is nothing to snap TO — the table is not a raycast target.
    // Without this early-out the ray below finds nothing, the fallback downward
    // ray finds nothing either, and the droplet is put back into free flight one
    // frame after it landed: it re-lands, deposits another stain, and repeats,
    // draining the stain pool of exactly the older marks the oxidation clock is
    // there to show. Clamp it to the plane and leave it alone.
    if (d.onTable) { d.pos.y = BLD_TABLE_Y; d.nrm.copy(_UP); return; }
    const lift = Math.max(0.09, d.size * 2.2);
    _v1.copy(d.pos).addScaledVector(d.nrm, lift);
    _v2.copy(d.nrm).negate();
    const hit = castSurface(_v1, _v2, lift * 2.6);
    if (hit) {
      // Read the new normal FIRST, then lift along it. Lifting along the stale
      // normal is how a droplet ends up buried inside a curved organ one frame
      // and popping back out the next.
      hitNormal(hit, d.nrm);
      d.pos.copy(hit.point).addScaledVector(d.nrm, d.size * 0.3);
      d.partId = hit.object.userData.partId || d.partId;
      return;
    }
    // Nothing under us: the droplet ran off an edge. Look straight down for the
    // next surface (blood dripping from a reflected flap onto the viscera below),
    // and if there is nothing there either, let it fall.
    const drop = castSurface(_v1, _DOWN, 1.6);
    if (drop) {
      d.pos.copy(drop.point);
      hitNormal(drop, d.nrm);
      d.partId = drop.object.userData.partId || d.partId;
      d.speed *= 0.5;
    } else {
      d.flying = true;
      d.vel.copy(d.flow).multiplyScalar(d.speed * 0.6);
    }
  }

  /* ---- stains ------------------------------------------------------------- */
  function findStainSlot() {
    for (let i = 0; i < stains.length; i++) if (!stains[i].alive) return stains[i];
    // Pool exhausted: retire the oldest non-dying stain. Recycling the oldest
    // rather than refusing means a long dissection keeps depositing fresh blood
    // where the student is working, and the history quietly fades from the back.
    let oldest = null;
    for (let i = 0; i < stains.length; i++) {
      const s = stains[i];
      if (s.dying) continue;
      if (!oldest || s.seq < oldest.seq) oldest = s;
    }
    if (oldest) releaseStain(oldest);
    return oldest;
  }

  function releaseStain(s) {
    if (s.bead >= 0) { const b = drops[s.bead]; if (b) { b.held = false; killDroplet(b, false); } s.bead = -1; }
    if (s.pool >= 0) poolFree(pools[s.pool], s.idx);
    s.alive = false; s.pool = -1; s.idx = -1; s.host = null; s.dying = 0;
  }

  /* Move a live stain between the glossy and matte instance pools, keeping its
   * old instance until the new one is secured. Written as one function because
   * the ordering is the whole trick: allocate first, and only free the old slot
   * once the new one exists. Freeing first and failing to reallocate loses the
   * stain outright, and doing both against a full destination pool leaves s.pool
   * dangling at an index somebody else now owns. */
  function migrateStain(s, state) {
    const old = s.pool, oldIdx = s.idx;
    s.pool = -1;
    if (attachStain(s, state)) { if (old >= 0) poolFree(pools[old], oldIdx); return true; }
    s.pool = old; s.idx = oldIdx;    // destination full: stay where we are
    return false;
  }

  function attachStain(s, state) {
    const want = state * 2 + s.variant;
    const idx = poolAlloc(pools[want]);
    if (idx < 0) return false;
    s.pool = want; s.idx = idx; s.state = state; s.dirty = true;
    // Colour is normally restaged for one stain in eight per frame, which is
    // ample for a sixty-second oxidation clock. But a freshly allocated instance
    // is a RECYCLED slot: until the rotation reaches it, it renders in whatever
    // colour the stain that used to live there had. A new bright arterial mark
    // flashing rust-brown for seven frames — or, worse, a stain migrating to the
    // clotted pool flashing bright red — is small, ugly and entirely avoidable.
    s.cfresh = true;
    return true;
  }

  /* PUBLIC. Paint a mark at a point on the anatomy, or grow the mark that is
   * already there. The merge is what turns a run of droplets into a puddle:
   * areas ADD and the radius therefore grows as a square root, so a pool spreads
   * quickly at first and then creeps — which is how a real one behaves, and it
   * also means it cannot run away and swallow the specimen. */
  function stain(point, normal, radius, darkness, partId, kind) {
    if (!enabled || intensity <= 0 || !point) return null;
    // Public entry point: sanitise. Internal callers already hand us unit normals
    // and finite points, so this costs two vector copies on a path that runs a few
    // times a second, not per droplet per frame.
    const pos = vecTo(point, _ps, _ZERO);
    const nrm = normalTo(normal, _ns);
    const r = BLD_clamp(BLD_num(radius) || 0.08, 0.02, BLD_STAIN_R_MAX);

    // Merge into a neighbour if there is one facing roughly the same way. The
    // normal test matters: the top of the liver and the underside of the flap
    // above it can be a millimetre apart and must never merge into one blob.
    for (let i = 0; i < stains.length; i++) {
      const s = stains[i];
      if (!s.alive || s.dying) continue;
      if (s.nrm.dot(nrm) < 0.55) continue;
      const d2 = s.pos.distanceToSquared(pos);
      const reach = Math.min((s.r + r) * BLD_MERGE, BLD_MERGE_MAX);
      if (d2 < reach * reach) {
        // Area-additive growth.
        s.rTarget = Math.min(BLD_STAIN_R_MAX, Math.sqrt(s.r * s.r + r * r * 0.8));
        // Fresh blood arriving on an old stain partially rejuvenates it — the
        // centre of a re-bleeding pool really is redder than its rim.
        s.born += (clock - s.born) * 0.4;
        s.seq = ++stainSeq;
        s.dirty = true;
        return s;
      }
    }

    const s = findStainSlot();
    if (!s) return null;
    s.variant = (Math.random() * 2) | 0;
    if (!attachStain(s, 0)) {
      // Wet pool is full; go straight into the clotted pool rather than dropping
      // the mark. A stain that exists and looks slightly too old beats no stain.
      if (!attachStain(s, 1)) return null;
    }
    s.alive = true;
    s.pos.copy(pos);
    s.nrm.copy(nrm);
    s.partId = partId || null;
    s.kind = BLD_REGISTER[kind] ? kind : 'venous';
    s.darkness = BLD_clamp(BLD_num(darkness), 0, 1);
    s.r = r * 0.35;                      // spreads out from a point, never pops in
    s.rTarget = r;
    s.born = clock - s.darkness * BLD_CLOT_SECONDS * 0.9;   // caller-supplied age
    s.spin = Math.random() * Math.PI * 2;
    s.aspect = BLD_rand(0.78, 1.28);
    s.dying = 0;
    s.bead = -1;
    s.seq = ++stainSeq;
    s.dirty = true;

    // Bind to the host mesh so the mark travels with the organ. Blood painted on
    // a flap that is then reflected, or on a liver that is then lifted onto the
    // tray, has to go with it — blood left hanging in mid-air where the organ used
    // to be is the fastest way to break the illusion this whole module exists for.
    const host = s.partId ? meshById.get(s.partId) : null;
    if (host) {
      s.host = host;
      host.updateMatrixWorld();
      _inv.copy(host.matrixWorld).invert();
      s.local.copy(pos).applyMatrix4(_inv);
      s.localN.copy(nrm).applyMatrix3(_nm.getNormalMatrix(_inv)).normalize();
    } else s.host = null;
    return s;
  }

  // Colour of a stain at its current age: the sixty-second clock made visible.
  function stainHex(s) {
    const reg = BLD_REGISTER[s.kind] || BLD_REGISTER.venous;
    const age = clock - s.born;
    let hex = reg.fresh;
    if (!reg.pulse) {
      // Dark venous/capillary blood oxygenates on contact with air and brightens
      // for a few seconds. Arterial blood is already saturated and skips this.
      hex = BLD_mix(hex, BLD_OXID_HEX, BLD_smooth(age / 6) * 0.38);
    }
    // Clotting and oxidation to brown-black. Eased, because the visible change is
    // fast in the first fifteen seconds and then very slow, exactly as it looks
    // on a bench: a cut you made a minute ago is already the colour of rust.
    const clot = BLD_smooth(BLD_clamp((age - 3) / BLD_CLOT_SECONDS, 0, 1));
    hex = BLD_mix(hex, BLD_CLOT_HEX, Math.pow(clot, 0.72));
    // Thickness darkens too: a deep pool transmits less light than a smear.
    hex = BLD_mix(hex, BLD_CLOT_HEX, BLD_clamp(s.r / BLD_STAIN_R_MAX, 0, 1) * 0.26);
    return hex;
  }

  function stepStain(s, dt) {
    if (!s.alive) return;
    const age = clock - s.born;

    if (s.dying > 0) {
      s.dying -= dt;
      s.dirty = true;
      if (s.dying <= 0) { releaseStain(s); return; }
    } else {
      if (s.r !== s.rTarget) {
        s.r += (s.rTarget - s.r) * Math.min(1, dt * 5.5);
        if (Math.abs(s.rTarget - s.r) < 1e-4) s.r = s.rTarget;
        s.dirty = true;
      }
      // Migrate glossy -> matte as it clots, and BACK when fresh blood arrives on
      // it. This is the only way to change roughness per instance without a custom
      // shader, and the difference between a wet film and a tacky crust under a
      // hard lamp is enormous.
      //
      // The return leg is not decoration. stain() rejuvenates s.born when a mark
      // is bled onto again, so a pool that has been re-opened is genuinely young
      // again — and a re-bleeding wound that stayed matte would read as a dry old
      // clot sitting exactly where the student can see fresh blood arriving. The
      // two thresholds are deliberately far apart (34 s out, 20 s back): a single
      // threshold makes a stain hovering at the boundary trade instances between
      // two pools every frame, and every one of those trades burns a free-list
      // entry in one pool and returns one to the other.
      if (s.state === 0 && age > BLD_DULL_SECONDS) migrateStain(s, 1);
      else if (s.state === 1 && age < BLD_DULL_SECONDS * 0.6) migrateStain(s, 0);
      // Once a pool has clotted it is a crust, not a liquid, so it loses its
      // meniscus. Retiring the bead here is the difference between "an old pool of
      // dried blood" and "a suspiciously fresh-looking puddle that never dries",
      // and it hands the droplet slot back to blood that is actually flowing.
      if (s.bead >= 0 && s.state === 1) {
        // `b.held` is the ownership proof, not a nicety. If a bead's slot were
        // ever recycled for a flowing droplet while s.bead still pointed at it,
        // this line would kill an innocent droplet and the block below would
        // teleport it into the middle of the stain. Checking held costs nothing
        // and makes that class of bug unrepresentable.
        const b = drops[s.bead];
        if (b && b.held) killDroplet(b, false);
        s.bead = -1;
      }
      // A big enough pool of FRESH blood earns a physical bead of liquid sitting in
      // it, so it has a highlight with real curvature instead of reading as a decal.
      if (s.bead < 0 && s.state === 0 && s.r > 0.21 && dropsLive < BLD_MAX_DROPLETS - 24) {
        for (let i = 0; i < drops.length; i++) {
          if (drops[i].alive) continue;
          const idx = poolAlloc(dropPool);
          if (idx < 0) break;
          const b = drops[i];
          b.alive = true; b.held = true; b.idx = idx; b.kind = s.kind;
          b.partId = s.partId; b.age = 0; b.life = 1e9; b.flying = false;
          b.speed = 0; b.trail = 0; b.born = clock; b.cfresh = true;
          b.hex = stainHex(s);
          b.size = s.r * 0.72;
          b.vel.set(0, 0, 0);
          b.pos.copy(s.pos); b.nrm.copy(s.nrm); b.flow.set(1, 0, 0);
          dropsLive++;
          s.bead = i;
          break;
        }
      }
    }

    if (s.bead >= 0) {
      const b = drops[s.bead];
      if (b && b.alive && b.held) {
        b.pos.copy(s.pos).addScaledVector(s.nrm, s.r * 0.06);
        b.nrm.copy(s.nrm);
        b.hex = stainHex(s);
        b.size = s.r * 0.72;
      } else s.bead = -1;
    }
  }

  /* Follow the host mesh. Staggered across 8 frames: at 384 stain records that is
   * 48 matrix applies a frame, which is nothing, and a stain being one frame
   * behind an organ that is being lifted is invisible. */
  function followHosts() {
    const step = 8, off = frame % step;
    for (let i = off; i < stains.length; i += step) {
      const s = stains[i];
      if (!s.alive || !s.host) continue;
      if (!s.host.parent) { s.host = null; continue; }   // part disposed under us
      s.host.updateMatrixWorld();
      _v1.copy(s.local).applyMatrix4(s.host.matrixWorld);
      if (_v1.distanceToSquared(s.pos) > 1e-8) {
        s.pos.copy(_v1);
        s.nrm.copy(s.localN).applyMatrix3(_nm.getNormalMatrix(s.host.matrixWorld)).normalize();
        s.dirty = true;
      }
    }
  }

  /* ---- wetness ------------------------------------------------------------ */
  /* Wetness is DERIVED from the blood actually present, never stored independently.
   * That one decision is what makes swab() feel right: wiping stains away drops
   * the gloss automatically and exactly, with no second bookkeeping system to fall
   * out of sync with what the student can see. */
  const partWet = new Map();      // partId -> 0..1
  const bwCover = new Map();      // partId -> summed stain area, for the mean below
  const matOrig = new Map();      // material -> the properties we borrowed
  const matAgg = new Map();       // material -> max wetness of any part using it
  let wetAt = -1;

  function borrow(m) {
    if (matOrig.has(m)) return matOrig.get(m);
    const o = {
      roughness: m.roughness != null ? m.roughness : 0.5,
      clearcoat: m.clearcoat != null ? m.clearcoat : 0,
      clearcoatRoughness: m.clearcoatRoughness != null ? m.clearcoatRoughness : 0.3,
      hadClearcoat: (m.clearcoat || 0) > 0,
    };
    matOrig.set(m, o);
    return o;
  }

  function restore(m) {
    const o = matOrig.get(m);
    if (!o) return;
    m.roughness = o.roughness;
    if ('clearcoat' in m) {
      const was = m.clearcoat > 0;
      m.clearcoat = o.clearcoat;
      m.clearcoatRoughness = o.clearcoatRoughness;
      // TRAP: USE_CLEARCOAT is a compile-time define keyed on clearcoat > 0. Going
      // from a positive value back to zero (or the reverse) changes the program,
      // and without needsUpdate the material keeps running the old shader — a
      // permanently glossy organ that no amount of swabbing will dry.
      if (was !== (o.clearcoat > 0)) m.needsUpdate = true;
    }
    matOrig.delete(m);
  }

  function applyWetness() {
    if (clock - wetAt < 0.12 && wetAt >= 0) return;
    wetAt = clock;

    /* Gloss is COVERAGE times FRESHNESS, and separating those two factors matters.
     * Summing freshness-weighted areas instead would let a dozen old, dry, clotted
     * pools add up past saturation and leave an organ permanently glossy an hour
     * after it stopped bleeding — visibly wrong, since a clot is tacky and matte.
     * Coverage saturates (an organ can only be so covered); freshness is the
     * area-weighted MEAN, so it falls as the blood on it ages no matter how much
     * of it there is. */
    partWet.clear();
    bwCover.clear();
    for (let i = 0; i < stains.length; i++) {
      const s = stains[i];
      if (!s.alive || !s.partId || s.dying) continue;
      // A fresh film is wet; a clot is tacky. The floor is not zero, because dried
      // blood still leaves the serosa looking different from clean.
      const fresh = BLD_clamp(1 - (clock - s.born) / 48, 0.11, 1);
      // Scaled so ONE proper pool saturates coverage but a few trail marks read as
      // merely damp. If this saturates too easily the gloss stops responding to
      // swabbing until the very last stain is gone, and the gauze feels broken.
      const area = s.r * s.r * 9;
      bwCover.set(s.partId, (bwCover.get(s.partId) || 0) + area);
      partWet.set(s.partId, (partWet.get(s.partId) || 0) + area * fresh);
    }
    partWet.forEach(_meanWet);
    // An open wound is wet regardless of how much has pooled yet.
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      if (!src.alive || !src.partId) continue;
      partWet.set(src.partId, Math.max(partWet.get(src.partId) || 0, 0.62));
    }
    partWet.forEach(_clampWet);

    // Aggregate per MATERIAL, not per part: anatomy.js can hand the same material
    // to more than one mesh, and writing per part would let a dry neighbour undo
    // the gloss on a bloody one. Max wins.
    matAgg.clear();
    meshById.forEach(_aggWet);
    matAgg.forEach(_applyMat);
  }

  // Hoisted out of applyWetness for the same reason as refreshTargets': four
  // closure literals per call, eight times a second, against a module whose
  // stated contract is that the loop allocates nothing.
  const _meanWet = (wsum, id) => {
    const cover = bwCover.get(id) || 1;
    partWet.set(id, BLD_clamp(cover, 0, 1) * (wsum / cover));
  };
  const _clampWet = (v, k) => partWet.set(k, BLD_clamp(v, 0, 1));
  const _aggWet = (mesh, id) => {
    const m = mesh.material;
    if (!m || m.isMaterial !== true) return;
    const w = (partWet.get(id) || 0) * (enabled ? BLD_clamp(intensity * 1.5, 0, 1) : 0);
    const prev = matAgg.get(m);
    if (prev === undefined || w > prev) matAgg.set(m, w);
  };
  const _applyMat = (w, m) => {
      if (w <= 0.001) { if (matOrig.has(m)) restore(m); return; }
      const o = borrow(m);
      // Wet tissue is not just shinier, it is SMOOTHER — a film of fluid fills in
      // the micro-relief that makes dry serosa scatter. Dropping roughness and
      // raising clearcoat together is what makes it catch the theatre lamp, and
      // that specular streak is most of what sells "this is a real, moist organ".
      m.roughness = Math.max(0.045, o.roughness * (1 - 0.62 * w));
      if ('clearcoat' in m) {
        const was = m.clearcoat > 0;
        m.clearcoat = o.clearcoat + (1 - o.clearcoat) * 0.88 * w;
        m.clearcoatRoughness = o.clearcoatRoughness + (0.06 - o.clearcoatRoughness) * w;
        if (!was && m.clearcoat > 0) m.needsUpdate = true;   // see the trap in restore()
      }
  };

  const _pushOrphan = (_, m) => _orphans.push(m);
  function restoreAll() {
    // Snapshot before restoring: restore() deletes from matOrig, and mutating a
    // Map by deletion while forEach is walking it is how entries get skipped.
    _orphans.length = 0;
    matOrig.forEach(_pushOrphan);
    for (let i = 0; i < _orphans.length; i++) restore(_orphans[i]);
    _orphans.length = 0;
    partWet.clear();
    bwCover.clear();
    matAgg.clear();
  }

  /* ---- writing the instance buffers --------------------------------------- */
  function writeStains() {
    for (let i = 0; i < stains.length; i++) {
      const s = stains[i];
      if (!s.alive || s.pool < 0) continue;
      const p = pools[s.pool];
      if (s.dirty || s.dying > 0) {
        const shrink = s.dying > 0 ? BLD_smooth(s.dying / 0.24) : 1;
        orient(_FWD, s.nrm, null, s.spin, _q);
        _scale.set(s.r * 2 * s.aspect * shrink, s.r * 2 / s.aspect * shrink, 1);
        // Lift off the surface by a whisker as well as using polygon offset —
        // belt and braces against z-fighting on a heavily displaced organ.
        _v1.copy(s.pos).addScaledVector(s.nrm, 0.004 + s.r * 0.012);
        if (s.dying > 0) _v1.addScaledVector(s.smear, (1 - shrink) * 0.06);
        _m4.compose(_v1, _q, _scale);
        p.im.setMatrixAt(s.idx, _m4);
        p.dirty = true;
        s.dirty = false;
      }
      // Colour is restaged for an eighth of the stains each frame. Oxidation runs
      // over a minute; nothing about it needs sixty updates a second.
      if (s.cfresh || (i & 7) === (frame & 7)) {
        s.cfresh = false;
        _col.setHex(stainHex(s));
        p.im.setColorAt(s.idx, _col);
        p.cdirty = true;
      }
    }
  }

  function writeDroplets() {
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (!d.alive || d.idx < 0) continue;
      if (d.flying) {
        // In flight a droplet is stretched along its velocity — motion blur you
        // can afford, and the thing that makes an arterial spurt read as a jet.
        const sp = d.vel.length();
        if (sp > 1e-5) _v2.copy(d.vel).multiplyScalar(1 / sp); else _v2.set(1, 0, 0);
        orient(_UP, _v2, null, 0, _q);
        const st = 1 + Math.min(1.6, sp * 0.7);
        _scale.set(d.size, d.size * st, d.size);
      } else {
        // On the surface: squashed flat against it, elongated along the run.
        orient(_UP, d.nrm, d.held ? null : d.flow, 0, _q);
        const st = d.held ? 1 : 1 + Math.min(1.1, d.speed * 0.8);
        _scale.set(d.size * st, d.size * (d.held ? 0.34 : 0.46), d.size * 0.88);
      }
      _v1.copy(d.pos).addScaledVector(d.nrm, d.held ? d.size * 0.1 : d.size * 0.18);
      _m4.compose(_v1, _q, _scale);
      dropPool.im.setMatrixAt(d.idx, _m4);
      dropPool.dirty = true;
      if (d.cfresh || (i & 3) === (frame & 3)) {
        d.cfresh = false;
        // A droplet in the air is brighter than one that has sat: it is a thin
        // film with light behind it, not a thick pool absorbing it.
        _col.setHex(d.flying ? BLD_mix(d.hex, 0xd8483c, 0.3) : d.hex);
        dropPool.im.setColorAt(d.idx, _col);
        dropPool.cdirty = true;
      }
    }
  }

  function flush() {
    for (let i = 0; i < pools.length; i++) {
      const p = pools[i];
      if (p.dirty) { p.im.instanceMatrix.needsUpdate = true; p.dirty = false; }
      if (p.cdirty) { p.im.instanceColor.needsUpdate = true; p.cdirty = false; }
    }
    if (dropPool.dirty) { dropPool.im.instanceMatrix.needsUpdate = true; dropPool.dirty = false; }
    if (dropPool.cdirty) { dropPool.im.instanceColor.needsUpdate = true; dropPool.cdirty = false; }
  }

  /* ---- public: bleed ------------------------------------------------------ */
  function bleed(o) {
    if (!enabled || intensity <= 0 || !o || !o.point) return null;
    const kind = BLD_REGISTER[o.kind] ? o.kind : 'venous';
    const reg = BLD_REGISTER[kind];
    const severity = BLD_clamp(BLD_num(o.severity == null ? 0.5 : o.severity), 0, 1);

    // Sanitise the geometry FIRST, into scratch, so every comparison and every
    // record write below works off a known-good unit normal and a finite point.
    vecTo(o.point, _pt, _ZERO);
    normalTo(o.normal, _nr);

    // Reuse the source already sitting on this wound rather than stacking two on
    // top of each other, or a scalpel dragged along a cut edge would multiply the
    // bleeding rate by the number of frames the stroke happened to take.
    let src = null;
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      if (s.alive && s.partId === (o.partId || null) && s.kind === kind
          && s.pos.distanceToSquared(_pt) < 0.42 * 0.42) { src = s; break; }
    }
    if (!src) {
      for (let i = 0; i < sources.length; i++) if (!sources[i].alive) { src = sources[i]; break; }
      if (!src) {   // all bleeding: the oldest wound has had its turn
        let oldest = sources[0];
        for (let i = 1; i < sources.length; i++) if (sources[i].seq < oldest.seq) oldest = sources[i];
        src = oldest;
      }
      src.alive = true;
      src.acc = 0;
      src.hasEdge = false;
      src.age = 0;
      // A recycled slot still carries the last wound's severity. Reset it, or a
      // gentle nick inherits the arterial gusher that used to live in this slot.
      src.severity = severity;
    } else {
      src.age *= 0.4;                 // re-cutting a wound makes it bleed afresh
      src.severity = Math.max(src.severity * 0.6, severity);
    }

    src.kind = kind;
    src.partId = o.partId || null;
    src.ttl = reg.ttl * (0.55 + severity * 0.75);
    src.seq = ++srcSeq;
    src.pos.copy(_pt);
    src.nrm.copy(_nr);

    // The cut edge, inferred from where the previous bleed on this part was. This
    // is the scalpel's own path, so capillary beads line up along the incision
    // instead of scattering in a disc — which is precisely how a fresh cut looks.
    if (o.partId) {
      const prev = lastCut.get(o.partId);
      if (prev) {
        _v1.subVectors(src.pos, prev);
        if (_v1.lengthSq() > 1e-4) {
          _v1.addScaledVector(src.nrm, -_v1.dot(src.nrm));
          if (_v1.lengthSq() > 1e-6) { src.edge.copy(_v1).normalize(); src.hasEdge = true; }
        }
        prev.copy(src.pos);
      } else lastCut.set(o.partId, src.pos.clone());
    }

    // A cut is wet the instant it is made — before a single droplet has run.
    stain(src.pos, src.nrm, reg.stainR[0] * (0.6 + severity * 0.9), 0, src.partId, kind);
    return src;
  }

  function stepSources(dt) {
    const pulse = systole();
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      if (!src.alive) continue;
      src.age += dt;
      if (src.age > src.ttl) { src.alive = false; continue; }
      const reg = BLD_REGISTER[src.kind];

      // Haemostasis. A wound does not bleed at a constant rate until someone turns
      // it off; flow falls away as the platelet plug forms and the vessel
      // constricts. The tail is quadratic so it is obviously slowing near the end.
      const remaining = 1 - src.age / src.ttl;
      let rate = reg.rate * src.severity * intensity * remaining * remaining;
      if (reg.pulse) rate *= 0.22 + pulse * 2.3;

      src.acc += rate * dt;
      // Cap the burst so a stalled frame cannot dump fifty droplets at once.
      let n = Math.min(9, Math.floor(src.acc));
      src.acc -= n;
      while (n-- > 0) spawnDroplet(src, reg, pulse);
    }
  }

  /* ---- public: swab ------------------------------------------------------- */
  const lastSwab = new THREE.Vector3();
  let hasSwabbed = false;

  function swab(point, radius) {
    if (!point) return 0;
    const p = vecTo(point, _sw, _ZERO);      // public entry point: sanitise
    const r = BLD_clamp(BLD_num(radius) || 0.9, 0.02, 8);
    const r2 = r * r;
    let n = 0;

    // Direction of the wipe, so blood drags before it lifts. Gauze does not make
    // blood vanish, it smears it a little and then takes it — and that half-beat
    // of smear is most of why wiping something clean is satisfying.
    if (hasSwabbed) {
      _v3.subVectors(p, lastSwab);
      if (_v3.lengthSq() < 1e-6) _v3.set(0, 0, 0); else _v3.normalize();
    } else _v3.set(0, 0, 0);
    lastSwab.copy(p); hasSwabbed = true;

    for (let i = 0; i < stains.length; i++) {
      const s = stains[i];
      if (!s.alive || s.dying > 0) continue;
      if (s.pos.distanceToSquared(p) > r2) continue;
      s.dying = 0.24;
      s.smear.copy(_v3);
      s.dirty = true;
      n++;
    }
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (!d.alive || d.held) continue;
      if (d.pos.distanceToSquared(p) > r2) continue;
      killDroplet(d, false);          // wiped up, not smeared onward
      n++;
    }

    // Note what we deliberately do NOT do: swabbing does not close a wound. A
    // vessel that is bleeding goes on bleeding through the gauze, and the student
    // has to see the field fill again to understand why haemostasis matters.
    wetAt = -1;                       // recompute gloss immediately, not in 120ms
    return n;
  }

  /* ---- public: the rest --------------------------------------------------- */
  function wetness(partId) {
    if (!enabled) return 0;
    return partId ? (partWet.get(partId) || 0) : 0;
  }

  function setEnabled(on) {
    enabled = !!on;
    root.visible = enabled;
    if (!enabled) {
      for (let i = 0; i < sources.length; i++) sources[i].alive = false;
      restoreAll();                   // give every borrowed property straight back
    } else wetAt = -1;
  }

  function setIntensity(k) {
    intensity = BLD_clamp(typeof k === 'number' ? k : 0.55, 0, 1.4);
    // Zero means zero: retire what is already on the specimen rather than merely
    // refusing to add more. Someone who turns this off part-way through a
    // dissection wants the blood gone, not frozen in place.
    if (intensity <= 0) {
      for (let i = 0; i < sources.length; i++) sources[i].alive = false;
      for (let i = 0; i < stains.length; i++) if (stains[i].alive && !stains[i].dying) stains[i].dying = 0.3;
      for (let i = 0; i < drops.length; i++) if (drops[i].alive && !drops[i].held) killDroplet(drops[i], false);
      restoreAll();
    }
    // Fresh blood is a film you can partly see through; a heavy setting lays it
    // on thicker. One shared uniform, no per-instance cost.
    const a = BLD_clamp(0.45 + intensity * 0.5, 0, 1);
    pools.forEach((p) => { p.im.material.opacity = a; });
  }

  function setPhaseSource(fn) { phaseSrc = typeof fn === 'function' ? fn : null; }

  // Wire straight to physio.setBloodVolume. Separate from setPhaseSource because
  // the two are independently optional: a build with no physiology model still
  // wants pulsatile arterial bleeding, and a caller may want the volume signal
  // without giving us its cardiac clock.
  function setVolumeSink(fn) {
    volSink = typeof fn === 'function' ? fn : null;
    volAt = -1;
    pushVolume();
  }

  /* ---- frame -------------------------------------------------------------- */
  /* main.js wraps CONSTRUCTION in try/catch, but nothing wraps the frame. An
   * exception thrown from here propagates out of tick(), the requestAnimationFrame
   * chain is never re-armed, and the entire application freezes — camera, hand
   * tracking, dissection, all of it — because an optional cosmetic subsystem hit a
   * bad normal. That is a catastrophically disproportionate failure mode.
   *
   * So: one guard at the boundary. The first fault is reported in full, the module
   * retires itself and gives every borrowed material back, and the lab carries on
   * without blood. Silence would be worse than a freeze (nobody would ever fix it)
   * and a per-frame console flood would be worse than silence, hence the once-only
   * report. */
  let faulted = false;
  function update(dtIn) {
    if (faulted || disposed) return;
    try {
      stepFrame(dtIn);
    } catch (e) {
      faulted = true;
      console.error('blood: retiring after an error in update(); the lab continues '
        + 'without bleeding. Please report this.', e);
      try { setEnabled(false); } catch (e2) { /* nothing left worth doing */ }
    }
  }

  function stepFrame(dtIn) {
    if (!enabled) return;
    // The app talks in milliseconds (dissect.js and softbody.js both do), but a
    // caller passing seconds should not silently get a frozen simulation: a real
    // frame is never under 1 ms and a real seconds-delta is never over 1.
    // BLD_num first: a NaN dt survives both comparisons below (NaN > 1 is false,
    // Math.min/max of NaN is NaN), reaches clock, and from there poisons every
    // age, every colour and every instance matrix in the module.
    const raw = dtIn == null ? 0.016 : BLD_num(dtIn);
    let dt = raw > 1 ? raw / 1000 : raw;
    dt = Math.min(0.05, Math.max(0, dt));    // a stall must not teleport droplets
    if (dt === 0) return;
    clock += dt;
    frame++;

    refreshTargets();
    rayBudget = BLD_RAY_BUDGET;

    if (intensity > 0) stepSources(dt);

    // Two passes over the droplets. The first moves everything (cheap, no rays);
    // the second spends the ray budget round-robin so no droplet is starved of
    // surface tracking for long, and a hundred simultaneous runners degrade to
    // slightly coarser contour following rather than to a dropped frame.
    for (let i = 0; i < drops.length; i++) if (drops[i].alive) stepDroplet(drops[i], dt);

    if (dropsLive > 0 && rayBudget > 0) {
      const start = frame * 7 % drops.length;   // co-prime-ish stride, no bias
      for (let k = 0; k < drops.length && rayBudget > 0; k++) {
        const d = drops[(start + k) % drops.length];
        if (!d.alive || d.flying || d.held) continue;
        if (d.speed < 0.02 && d.age > 0.4) continue;   // parked: nothing to re-snap
        snapDroplet(d);
      }
    }

    for (let i = 0; i < stains.length; i++) if (stains[i].alive) stepStain(stains[i], dt);
    followHosts();
    applyWetness();
    pushVolume();
    writeStains();
    writeDroplets();
    flush();
  }

  function clear() {
    for (let i = 0; i < drops.length; i++) if (drops[i].alive) { drops[i].held = false; killDroplet(drops[i], false); }
    for (let i = 0; i < stains.length; i++) if (stains[i].alive) releaseStain(stains[i]);
    for (let i = 0; i < sources.length; i++) sources[i].alive = false;
    lastCut.clear();
    hasSwabbed = false;
    // A cleared field is a fresh specimen, so the ledger resets with it — and
    // physio is told immediately, or it would go on modelling a haemorrhage that
    // has been wiped off the screen.
    lostML = 0;
    volAt = -1;
    pushVolume();
    restoreAll();
  }

  function dispose() {
    if (disposed) return;
    // Order matters: stop accepting frames BEFORE tearing anything down. update()
    // is driven from a rAF loop this module does not own, so a frame can and does
    // arrive between dispose() being called and the caller dropping its reference
    // — and that frame would write instance matrices into disposed buffers.
    disposed = true;
    enabled = false;
    clear();
    // Materials borrowed from the specimen MUST go back exactly as they were —
    // this module is optional, and a lab that has had blood switched on and off
    // has to be pixel-identical to one that never had it.
    restoreAll();
    scene.remove(root);
    root.traverse((o) => { if (o.isInstancedMesh) { o.dispose && o.dispose(); } });
    owned.forEach((o) => { try { o.dispose && o.dispose(); } catch (e) {} });
    owned.length = 0;
    meshById.clear();
    targets.length = 0;
    _live.clear();
    _orphans.length = 0;
    // Drop every reference into other modules. Holding physio's phase getter or
    // its setBloodVolume after teardown pins that whole closure — and its canvas
    // monitor — alive for as long as anything still points at this object.
    phaseSrc = null;
    volSink = null;
    lastCut.clear();
  }

  setIntensity(intensity);

  return {
    bleed, stain, swab, wetness,
    setEnabled, setIntensity, setPhaseSource, setVolumeSink, setSpecimen,
    update, clear, dispose,
    get enabled() { return enabled; },
    get intensity() { return intensity; },
    // Millilitres lost, and the fraction remaining. Exposed so the shell can put
    // an estimated blood loss on screen, which is a real number a surgeon tracks.
    get bloodLostML() { return lostML; },
    get bloodFraction() { return BLD_clamp(1 - lostML / BLD_TOTAL_ML, 0, 1); },
    // For scripted verification and for anyone poking at it from the console.
    get stats() {
      let ns = 0;
      for (let i = 0; i < stains.length; i++) if (stains[i].alive) ns++;
      let nb = 0;
      for (let i = 0; i < sources.length; i++) if (sources[i].alive) nb++;
      return { droplets: dropsLive, stains: ns, sources: nb, phase: phase(),
        targets: targets.length, lostML, faulted, disposed };
    },
  };
}

/*
 * NOT YET WIRED — read this before assuming blood is live.
 *
 * assemble.py lists blood.js and concatenates it, and everything above is
 * complete and exercised. But main.js never calls createBlood(), so in the built
 * page this module is inert: no bleeding, no gloss, no haemorrhage signal to
 * physio. That is a wiring gap in main.js, not a defect in this file, and it is
 * left to main.js's own author rather than fixed by reaching across module
 * boundaries from here.
 *
 * The wiring is four lines, in the places main.js already has for the other
 * optional subsystems:
 *
 *   // alongside `let env = null, handViz = null, soft = null, ...`
 *   let blood = null;
 *
 *   // in loadSpecimen(), after `dissection = createDissection(...)`
 *   if (blood) { blood.dispose(); blood = null; }
 *   if (typeof createBlood === 'function') {
 *     try {
 *       blood = createBlood(THREE, scene);
 *       blood.setSpecimen(parts);
 *       if (physio) { blood.setPhaseSource(physio.phase); blood.setVolumeSink(physio.setBloodVolume); }
 *     } catch (e) { console.warn('blood failed', e); blood = null; }
 *   }
 *
 *   // in onEvent(), where soft.jiggle() is already dispatched off evt.kind
 *   if (blood && evt.partId && /incise|damage/.test(evt.kind) && evt.meta && evt.meta.point) {
 *     blood.bleed({ point: evt.meta.point, normal: evt.meta.normal, partId: evt.partId,
 *                   severity: evt.kind === 'damage' ? 0.9 : 0.4,
 *                   kind: (evt.meta.vessel || 'capillary') });
 *   }
 *
 *   // in tick(), next to `soft.update(dt)`
 *   if (blood) blood.update(dt);
 *
 * Two things that block the middle step and are worth flagging plainly:
 *   - dissect.js's emit() sends `meta` but does not currently put the contact
 *     point or normal in it for incise/damage events. Without those, bleed() has
 *     no geometry and the blood appears at the origin. dissect.js has the hit in
 *     hand at that moment (it is the same hit main.js reads as dissection.contact),
 *     so it is a one-line addition there.
 *   - Nothing classifies a cut as capillary/venous/arterial. constraints.js knows
 *     which structures are vessels (it has damageText for a torn renal vessel at
 *     the aorta) and physio.js has a full vessel table with kinds; either could
 *     supply `meta.vessel`. Until one does, every cut reads as capillary, which is
 *     safe and correct for a scalpel through body wall but wastes the whole
 *     three-register distinction the moment a real vessel is opened.
 */
