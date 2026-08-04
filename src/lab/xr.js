/*
 * xr.js — WebXR: stand over the specimen.
 *
 * The whole app is built on one law: `dissect.js` consumes an abstract
 * `{x, y, grip, gripping, span}` and has no idea what produced it. A mouse, a
 * webcam hand and — now — a headset all funnel into the same six numbers. This
 * module does NOT get to be the exception. Everything below exists to turn a
 * controller pose or a 25-joint hand into those six numbers and nothing else.
 *
 * ── The scale problem, and why it is the crux ────────────────────────────────
 * The scene is authored in arbitrary world units: the frog is 9.1 units long,
 * env.js's steel table is a 70×70 plane, the desktop camera sits at y = 13.5.
 * A headset reports poses in METRES. Rendering that scene straight into VR would
 * put a 70-metre table in front of a 1.7-metre student.
 *
 * The fix is a rig: a Group that parents the camera and carries a uniform scale
 * of XR_UNITS_PER_M. three.js derives the XR camera's world matrix as
 * `parent.matrixWorld * viewMatrix` (WebXRManager.updateCamera), so a scaled
 * parent scales the *interpupillary distance* along with everything else — which
 * is exactly right. Stereo disparity then says "this is a small real animal at
 * arm's length", not "this is a big model far away". That perceptual difference
 * is the entire deliverable.
 *
 * ── Why 85 units per metre ───────────────────────────────────────────────────
 * Not a taste call, and NOT derived from the table — the table is scenery, the
 * organ is the anchor. Every figure below is measured out of the specimen source
 * rather than eyeballed, because a number that is merely plausible produces a
 * specimen that is merely plausibly sized, which is the failure this module
 * exists to avoid.
 *
 *   frog.js:77   frogBody(2.34, 1.42, 4.55) — the sphere's unit z spans -1..+1
 *                and only x/y are tapered, so snout-to-vent is 2 * 4.55 = 9.10 u
 *                9.10 u / 85  =  0.107 m
 *                Rana pipiens sold for dissection grades at 8-11 cm SVL, so a
 *                10.7 cm specimen is a large adult female — correct for the grade
 *                a school actually receives, if at the top of the range.
 *
 *   heart.js:106 pericardial sac: SphereGeometry(4.0) scaled y by 1.22
 *                => 2 * 4.0 * 1.22 = 9.76 u  /85  =  0.115 m
 *                A sheep heart in its pericardium is ~11 cm base-to-apex. Correct.
 *
 *   heart.js:110 left ventricle profile runs y = +3.10 down to -3.45
 *                => 6.55 u  /85  =  0.077 m
 *                Sheep LV apex-to-base is ~7-8 cm. Correct, and it is the tighter
 *                of the two heart checks, so it is the one that pins the scale.
 *
 * What FALLS OUT of that (do not read these backwards as inputs):
 *   env.js:160   table plane 70 u  ->  0.82 m square. A dissection station, not a
 *                full bench. Fine — it is a plane with a steel material on it.
 *
 * NOTE ON THE PREVIOUS VALUE. This was 70 u/m, justified by a comment block that
 * asserted an 8 u frog and a "sheep/ox" heart. Neither survives contact with the
 * source: frog.js builds 9.10 u, and "sheep/ox" is not one measurement — a sheep
 * heart is ~11 cm but a bovine heart is 20-25 cm, so the two cannot share a
 * scale and the ox is simply not this specimen. At 70 u/m the frog rendered at
 * 13.0 cm and the sheep heart at 13.9 cm: both roughly 20% oversized, which in
 * stereo is exactly the cue that says "model", not "animal".
 *
 * Change this number and the specimen stops being life-size. Do not tune it by
 * eye; re-derive it from an organ you can measure, and cite the line you got it
 * from as above.
 *
 * ── What this module deliberately does not do ────────────────────────────────
 * Nothing, when there is no headset. `navigator.xr` absent is the NORMAL case
 * and must cost the app exactly zero: no renderer flags flipped, no objects
 * added to the scene, no per-frame work. Everything is built inside enter().
 */

/* Real units per metre. See the calibration table above before touching this. */
const XR_UNITS_PER_M = 85;

/* World-space y of env.js's table plane. Must track env.js's TABLE_Y — if that
 * moves and this does not, the specimen floats above or sinks into the bench. */
const XR_TABLE_WORLD_Y = -1.7;

/* Real height of the bench top above the floor. 0.95 m is a standing-work
 * surface: the elbow drops ~10 cm below the shoulder, which is where a
 * dissection is actually done. Sitting height (0.74 m) makes you stoop. */
const XR_TABLE_M = 0.95;

/* How far the student's feet start back from the specimen's centre. At 85 u/m
 * the table is 0.82 m square, so its near edge is 0.41 m from centre and 0.46 m
 * puts the feet just OUTSIDE that edge — which is how you stand at a bench: toes
 * to the edge, leaning over it. Standing inside the table footprint would read
 * as standing on the bench. */
const XR_STAND_BACK_M = 0.46;

/* Fallback eye height used only when the runtime cannot give us 'local-floor'
 * and we are reduced to 'local' (origin at the headset, not the floor). */
const XR_ASSUMED_EYE_M = 1.6;

/* Pinch thresholds — COPIED VERBATIM from hands.js (HND_PINCH_*). They are
 * intentionally the same numbers: the ratio is dimensionless (aperture over
 * hand size), so it transfers unchanged from MediaPipe's 2D image plane to
 * WebXR's 3D metres, and a student who learns the pinch on a webcam finds their
 * pinch behaves identically in the headset. Divergent constants here would be a
 * silent second personality for the same gesture. */
const XR_PINCH_ENTER = 0.42;
const XR_PINCH_RELEASE = 0.60;
const XR_PINCH_CLOSED = 0.12;

/* A trigger held past this counts as gripping even if the runtime never reports
 * a squeeze button. The spec maps squeeze->gripping, but plenty of controllers
 * (and every emulator) expose only a trigger; without this OR they would be able
 * to hover and never cut. */
const XR_TRIGGER_AS_GRIP = 0.55;

/* Span smoothing. hands.js runs the two-cursor separation through an EMA
 * (`spanF = new HndEMA(0.3)`, hands.js:536/943) before publishing it, so the same
 * alpha has to be used here or the two input paths do NOT feel the same however
 * identical the formula looks. It matters more in the headset than on the webcam,
 * not less: the XR cursors are head-projected, so every small head rotation moves
 * both of them and an unsmoothed span dithers across dissect.js's 0.18 retractor
 * threshold, opening and shutting the body wall while the student holds still. */
const XR_SPAN_EMA = 0.3;

/* Pointer ray reach, in metres. Past ~2.5 m you are not dissecting, you are
 * pointing at scenery. */
const XR_RAY_REACH_M = 2.5;

/* Fingertip-to-tissue distance that counts as touching, in metres. ~8 mm is
 * about the thickness of a glove plus the slop in a bounding-sphere test. */
const XR_TOUCH_M = 0.008;

/* Minimum gap between haptic pulses on one hand. The contact test runs every
 * frame; without this the actuator would be driven at 90 Hz and either buzz
 * continuously or be rate-limited into silence by the runtime. */
const XR_PULSE_GAP_MS = 45;

/* The 25 XRHand joints, in the canonical WebXR order. Index arithmetic below
 * depends on this exact ordering: wrist 0, thumb 1-4, then four fingers of five
 * joints each (metacarpal, proximal, intermediate, distal, tip). */
const XR_JOINTS = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal', 'pinky-finger-tip',
];

const XR_J_WRIST = 0;
const XR_J_THUMB_TIP = 4;
const XR_J_INDEX_TIP = 9;
/* MediaPipe's "MIDDLE_MCP" landmark sits at the KNUCKLE — the distal end of the
 * metacarpal. WebXR's `middle-finger-metacarpal` sits at the other end, near the
 * wrist, so using it would collapse the hand-size denominator and make every
 * pinch read as wide open. The knuckle is `middle-finger-phalanx-proximal`. This
 * single index is the difference between the pinch working and never firing. */
const XR_J_MIDDLE_KNUCKLE = 11;

/* Bone pairs for the skeleton. The last three are the transverse metacarpal
 * arch — without it a rendered hand reads as five loose sticks rather than a
 * palm, and the student cannot tell where their own hand actually is. */
const XR_BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8], [8, 9],
  [0, 10], [10, 11], [11, 12], [12, 13], [13, 14],
  [0, 15], [15, 16], [16, 17], [17, 18], [18, 19],
  [0, 20], [20, 21], [21, 22], [22, 23], [23, 24],
  [5, 10], [10, 15], [15, 20],
];

function XR_clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/* Stamped onto every object this module puts in the scene.
 *
 * dissect.js raycasts an explicit `candidates` list non-recursively, so today
 * nothing here can be picked and this is redundant. It is here because "today"
 * is doing a lot of work in that sentence: the rig and its beams, reticles,
 * joint spheres and pinch beads are added to the SAME scene every other module
 * traverses, and a single future `intersectObjects(scene.children, true)`
 * anywhere in the app would silently start returning a laser beam as the thing
 * the student is trying to cut. An empty raycast() makes that impossible by
 * construction rather than by everyone else's continued good behaviour. */
function XR_noRaycast() {}

function XR_mapRange(v, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/* ========================================================================== */
export function createXR(THREE, renderer, scene, camera) {
  /* Scratch objects. The house rule is "hoist to module scope" — impossible
   * here, because THREE is a function parameter and its constructors do not
   * exist until this factory runs. Allocating them once in the closure buys the
   * identical guarantee: nothing below allocates inside a frame. */
  const _v1 = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _v3 = new THREE.Vector3();
  const _v4 = new THREE.Vector3();
  const _scl = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _m1 = new THREE.Matrix4();
  const _nm = new THREE.Matrix3();
  const _ray = new THREE.Raycaster();
  const _hits = [];                 // reused: intersectObjects appends into it
  const _up = new THREE.Vector3(0, 1, 0);
  const _zero = new THREE.Vector3(0, 0, 0);
  const rigQuat = new THREE.Quaternion();

  /* ---- support probe --------------------------------------------------- */
  // isSessionSupported is async but supported() must answer synchronously (the
  // shell asks it while laying out a button). So: probe once at construction,
  // cache, and announce the answer through onSession so the UI can reveal
  // itself late rather than showing a button that does nothing.
  let supportedFlag = false;
  let probeDone = false;
  let lastReason = 'WebXR has not been checked yet.';

  const listeners = [];
  function fire(evt) {
    for (let i = 0; i < listeners.length; i++) {
      try { listeners[i](evt); } catch (e) { console.warn('xr listener threw', e); }
    }
  }

  // Single-flight. enter() may be called while the construction-time probe is
  // still in the air; starting a second one would announce the verdict twice and
  // a shell that toggles a button on that event would flicker.
  let probing = null;
  function probe() {
    if (!probing) {
      probing = runProbe().then(
        (v) => { probing = null; return v; },
        // runProbe catches everything it can foresee, but if it ever does reject
        // a null `probing` is the difference between "answer unknown, ask again"
        // and a permanently wedged promise that makes enter() hang forever on
        // `await probe()`. Settle the state and let the next call retry.
        (e) => {
          probing = null; probeDone = true; supportedFlag = false;
          lastReason = 'WebXR could not be checked (' + ((e && e.message) || e) + ').';
          return false;
        });
    }
    return probing;
  }

  async function runProbe() {
    if (typeof navigator === 'undefined' || !navigator.xr || !navigator.xr.isSessionSupported) {
      supportedFlag = false;
      lastReason = 'This browser has no WebXR. Chrome, Edge or the Quest browser over HTTPS will.';
    } else {
      try {
        supportedFlag = !!(await navigator.xr.isSessionSupported('immersive-vr'));
        if (!supportedFlag) lastReason = 'No VR headset is connected to this machine.';
      } catch (e) {
        // Some browsers throw here behind a permissions policy rather than
        // resolving false. Treat it as "no", not as a crash.
        supportedFlag = false;
        lastReason = 'WebXR is blocked on this page (' + ((e && e.message) || e) + ').';
      }
    }
    probeDone = true;
    fire({ kind: 'support', supported: supportedFlag, reason: supportedFlag ? null : lastReason });
    return supportedFlag;
  }
  probe();
  // A headset plugged in after load should light the button up.
  if (typeof navigator !== 'undefined' && navigator.xr && navigator.xr.addEventListener) {
    try { navigator.xr.addEventListener('devicechange', probe); } catch (e) { /* optional event */ }
  }

  /* ---- the rig ---------------------------------------------------------- */
  const rig = new THREE.Group();
  rig.name = 'xr-rig';

  let tableM = XR_TABLE_M;         // real bench height above the floor
  let tableWorldY = XR_TABLE_WORLD_Y;
  let originEyeM = 0;              // >0 only when we fell back to 'local'
  const focus = new THREE.Vector3(0, 0, -0.4);   // specimen centre, world units

  function applyRig() {
    rig.scale.setScalar(XR_UNITS_PER_M);
    rig.position.set(
      focus.x,
      // Floor plane -> world y. With 'local-floor' the reference origin IS the
      // floor; with the 'local' fallback it is roughly the eye, so we lift the
      // rig by the assumed eye height to put the bench back at the right place.
      tableWorldY - (tableM - originEyeM) * XR_UNITS_PER_M,
      focus.z + XR_STAND_BACK_M * XR_UNITS_PER_M,
    );
    rig.updateMatrixWorld(true);
    // The camera's world matrix is only recomputed when this flag is set (we
    // turn its matrixAutoUpdate off while presenting — see enter()). Without
    // this, moving the rig mid-session leaves picking a frame behind.
    camera.matrixWorldNeedsUpdate = true;
  }

  /* ---- materials & geometry (built lazily, on first session) ------------ */
  let built = false;
  const owned = [];                 // everything we must dispose
  const track = (o) => { owned.push(o); return o; };

  let beamGeo = null, beamMatA = null, beamMatB = null;
  let jointGeo = null, jointMat = null, boneMat = null, beadGeo = null, beadMat = null;
  let ringGeo = null, ringMat = null;

  function rampTexture() {
    // Opacity ramp along the beam: solid where it leaves the hand, gone at the
    // far tip. A uniform-brightness stick reads as a prop; a fade reads as light.
    const cv = document.createElement('canvas');
    cv.width = 4; cv.height = 64;
    // getContext can return null (a browser that has run out of 2D contexts, or
    // a hardened environment). The beam is nicer with a fade and perfectly usable
    // without one, so fall back to no alphaMap rather than taking the session down.
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0.00, 'rgba(255,255,255,0.00)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.30)');
    g.addColorStop(1.00, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 64);
    const t = track(new THREE.CanvasTexture(cv));
    return t;
  }

  function buildAssets() {
    if (built) return;
    built = true;

    // Beam: a tapered cylinder, authored to run from the origin along -Z with a
    // length of exactly 1 so a single scale.z sets its reach in metres.
    beamGeo = track(new THREE.CylinderGeometry(0.0055, 0.0011, 1, 6, 1, true));
    beamGeo.translate(0, -0.5, 0);
    beamGeo.rotateX(Math.PI / 2);   // +Y -> -Z; see the derivation in the notes
    const ramp = rampTexture();
    const beamBase = {
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      toneMapped: false, side: THREE.DoubleSide,
    };
    // Passing alphaMap: null is not the same as omitting it in every three
    // version, and it is free to just not mention it.
    if (ramp) beamBase.alphaMap = ramp;
    beamMatA = track(new THREE.MeshBasicMaterial(Object.assign({ color: 0x34d399, opacity: 0.55 }, beamBase)));
    beamMatB = track(new THREE.MeshBasicMaterial(Object.assign({ color: 0x38e0d8, opacity: 0.95 }, beamBase)));

    // Reticle: a thin ring laid ON the tissue, oriented to the surface normal.
    // Physical size, not screen size — a cursor that keeps a constant angular
    // size is a UI widget; one that keeps a constant 12 mm is an instrument.
    ringGeo = track(new THREE.RingGeometry(0.0088, 0.0122, 28));
    ringMat = track(new THREE.MeshBasicMaterial({
      color: 0x34d399, transparent: true, opacity: 0.9, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    }));

    // Joints: one unit sphere instanced 25 times. Radii come from the runtime
    // (XRJointPose.radius), so a child's hand renders as a child's hand.
    jointGeo = track(new THREE.SphereGeometry(1, 10, 8));
    jointMat = track(new THREE.MeshStandardMaterial({
      color: 0x9fb4bf, roughness: 0.42, metalness: 0.04,
      emissive: 0x0b3129, emissiveIntensity: 0.75,
    }));
    boneMat = track(new THREE.LineBasicMaterial({
      color: 0x4fd6bd, transparent: true, opacity: 0.5, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    }));

    // The pinch bead: the single most important object in the headset. It marks
    // where the grip will actually close, which is the one thing a student
    // cannot infer from looking at their own fingers.
    beadGeo = track(new THREE.SphereGeometry(0.0052, 12, 10));
    beadMat = track(new THREE.MeshBasicMaterial({
      color: 0x34d399, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
  }

  /* ---- per-hand slots --------------------------------------------------- */
  function makeSlot(index) {
    return {
      index,
      source: null,                 // XRInputSource
      handed: 'none',
      rayObj: null,                 // three's target-ray space object
      gripObj: null,                // three's grip space object
      handObj: null,                // three's XRHandSpace (joints live here)
      present: false,
      isHand: false,
      // published, in the same units main.js's router already speaks
      cursor: { x: 0.5, y: 0.5 },
      grip: 0,
      gripping: false,
      pinching: false,              // hysteresis latch, mirrors hands.js
      // internals
      hitPartId: null,
      hitDist: 0,
      activity: 0,
      lastPulse: 0,
      squeeze: false,
      vis: null, beam: null, reticle: null, joints: null, bones: null, bead: null,
      prevPos: new THREE.Vector3(),
      pinchWorld: new THREE.Vector3(),
      onConnected: null, onDisconnected: null, onSqueezeStart: null, onSqueezeEnd: null,
    };
  }
  const slots = [makeSlot(0), makeSlot(1)];
  let primary = 0;

  function buildSlotVisuals(s) {
    if (s.vis) return;
    const vis = new THREE.Group();
    vis.matrixAutoUpdate = true;

    s.beam = new THREE.Mesh(beamGeo, beamMatA);
    s.beam.frustumCulled = false;   // it is one unit long until scaled; culling lies
    vis.add(s.beam);

    s.reticle = new THREE.Mesh(ringGeo, track(ringMat.clone()));
    s.reticle.frustumCulled = false;
    s.reticle.visible = false;
    // The reticle lives on the RIG, not on the controller: it sits on the
    // tissue, and parenting it to a moving hand would drag it off the surface.
    rig.add(s.reticle);

    // 25 instanced joints. An InstancedMesh computes its bounding sphere from
    // the base geometry at the origin, so an unculled flag is mandatory —
    // otherwise the whole hand vanishes the moment you look slightly away.
    s.joints = new THREE.InstancedMesh(jointGeo, jointMat, XR_JOINTS.length);
    s.joints.frustumCulled = false;
    s.joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    s.joints.visible = false;
    rig.add(s.joints);

    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(XR_BONES.length * 6), 3));
    owned.push(bg);
    s.bones = new THREE.LineSegments(bg, boneMat);
    s.bones.frustumCulled = false;
    s.bones.visible = false;
    rig.add(s.bones);

    s.bead = new THREE.Mesh(beadGeo, track(beadMat.clone()));
    s.bead.frustumCulled = false;
    s.bead.visible = false;
    rig.add(s.bead);

    s.vis = vis;
    rig.add(vis);

    // Nothing this module draws is ever a legitimate hit. See XR_noRaycast.
    s.beam.raycast = XR_noRaycast;
    s.reticle.raycast = XR_noRaycast;
    s.joints.raycast = XR_noRaycast;
    s.bones.raycast = XR_noRaycast;
    s.bead.raycast = XR_noRaycast;
  }

  /* ---- pickable tissue -------------------------------------------------- */
  // Rebuilt periodically rather than every frame: the specimen only changes on a
  // swap, and traversing the scene at 90 Hz for a list that almost never changes
  // is exactly the sort of waste that costs frames on standalone hardware.
  const pickables = [];
  let pickAge = 1e9;
  function refreshPickables() {
    pickables.length = 0;
    scene.traverse((o) => {
      if (o.isMesh && o.visible && o.userData && o.userData.partId) pickables.push(o);
    });
    pickAge = 0;
  }

  /* ---- projection: the bridge to the 2D input contract ------------------ */
  /*
   * dissect.js re-raycasts from the camera through whatever {x, y} we publish.
   * So the honest translation of a 3D act into that contract is: take the world
   * point the student is acting on, and PROJECT IT INTO THE CAMERA. The engine
   * then casts eye -> that point and lands on the first tissue along the line.
   *
   * This is not a fudge — it is the correct reading of the gesture. You look at
   * what you touch, so the eye->fingertip line and the fingertip agree; if a
   * body wall is between your eye and your finger, the wall IS what you can act
   * on. The 2.5D law ("depth is the depth of what the ray hits") is preserved
   * intact, and dissect.js still cannot tell a headset from a mouse.
   *
   * The trap: project with the SAME camera object dissect will unproject with.
   * renderer.xr.getCamera() is a frame fresher, but using it here would make the
   * cursor swim across the tissue with every head movement, because the two
   * transforms would disagree. We refresh the user camera instead (see update).
   */
  function projectToCursor(worldPt, out) {
    _v4.copy(worldPt).applyMatrix4(camera.matrixWorldInverse);
    // Behind the eye: Vector3.project would happily return a sign-flipped point
    // and the cursor would jump to the opposite corner. Reject it instead.
    if (_v4.z > -0.001) return false;
    _v4.applyMatrix4(camera.projectionMatrix);   // includes the perspective divide
    out.x = XR_clamp(_v4.x * 0.5 + 0.5, 0, 1);
    out.y = XR_clamp(-_v4.y * 0.5 + 0.5, 0, 1);
    return true;
  }

  /* ---- haptics ---------------------------------------------------------- */
  /*
   * Every level of this chain is optional in the wild: an input source may have
   * no gamepad, a gamepad may have no hapticActuators, the array may be empty,
   * the actuator may expose playEffect but not pulse (or the reverse), and pulse
   * may return a promise that rejects asynchronously. Guard all of it — a
   * missing rumble must never surface as an unhandled rejection in the console.
   */
  function actuatorFor(s) {
    const src = s.source;
    if (!src) return null;
    const gp = src.gamepad;
    if (!gp) return null;
    const list = gp.hapticActuators;
    if (list && list.length && list[0]) return list[0];
    // The Gamepad Extensions spec moved from a hapticActuators ARRAY to a single
    // `vibrationActuator`, and shipping runtimes are split across the two: some
    // Quest builds expose only the array, desktop Chrome exposes only the
    // singular. Checking one and declaring "no haptics" silently loses rumble on
    // half the hardware this is meant to run on.
    if (gp.vibrationActuator) return gp.vibrationActuator;
    return null;
  }

  // Hoisted: playEffect takes an options object, and rebuilding it per pulse
  // allocates inside the frame on any runtime that lacks pulse().
  const _fx = { duration: 20, startDelay: 0, strongMagnitude: 0.5, weakMagnitude: 0.3 };

  function pulseSlot(s, strength, ms, force) {
    const now = performance.now();
    if (!force && now - s.lastPulse < XR_PULSE_GAP_MS) return false;
    const a = actuatorFor(s);
    if (!a) return false;
    s.lastPulse = now;
    const v = XR_clamp(strength, 0, 1);
    const d = XR_clamp(Math.round(ms) || 20, 1, 500);
    try {
      if (typeof a.pulse === 'function') {
        const p = a.pulse(v, d);
        if (p && typeof p.catch === 'function') p.catch(() => {});
        return true;
      }
      if (typeof a.playEffect === 'function') {
        _fx.duration = d; _fx.strongMagnitude = v; _fx.weakMagnitude = v * 0.6;
        const p = a.playEffect('dual-rumble', _fx);
        if (p && typeof p.catch === 'function') p.catch(() => {});
        return true;
      }
    } catch (e) {
      // Some runtimes throw synchronously on an unsupported effect type.
    }
    return false;
  }

  function haptic(hand, strength, ms) {
    if (!presenting) return false;
    let hit = false;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s.present) continue;
      const match = hand === undefined || hand === null || hand === -1 || hand === 'both'
        || hand === i || hand === s.handed;
      if (match) hit = pulseSlot(s, strength === undefined ? 0.5 : strength, ms === undefined ? 25 : ms, true) || hit;
    }
    return hit;
  }

  /* ---- session ---------------------------------------------------------- */
  let session = null;
  let sessionEndHandler = null;     // removed on exit; see enter()
  let disposed = false;
  let presenting = false;
  // Latched by update() when a frame throws; see the note there. Declared up here
  // beside the other session state rather than next to update(), because
  // onSessionStart() clears it and a `let` declared further down the factory body
  // is a temporal-dead-zone trap waiting for someone to reorder a call.
  let frameBroken = false;
  let saved = null;                 // desktop camera state, restored on exit
  let prevXrEnabled = false;
  let boundManagerEvents = false;

  const out = { x: 0.5, y: 0.5, grip: 0, gripping: false, span: 0, source: 'xr' };
  let spanEma = -1;                 // <0 means "unseeded"; mirrors HndEMA's null

  function bindSlot(s) {
    // three's controller objects are driven from the XRFrame regardless of where
    // (or whether) they sit in the scene graph, so we never add them: we read
    // their metre-space transforms and drive our OWN visuals under the rig. That
    // keeps exactly one place where metres become world units.
    s.rayObj = renderer.xr.getController(s.index);
    s.gripObj = renderer.xr.getControllerGrip(s.index);
    s.handObj = renderer.xr.getHand(s.index);

    s.onConnected = (e) => {
      s.source = e.data || null;
      s.handed = (s.source && s.source.handedness) || 'none';
      s.isHand = !!(s.source && s.source.hand);
      fire({ kind: 'input', index: s.index, handed: s.handed, hand: s.isHand });
    };
    s.onDisconnected = () => {
      s.source = null; s.present = false; s.isHand = false;
      s.grip = 0; s.gripping = false; s.pinching = false;
      hideSlot(s);
    };
    s.rayObj.addEventListener('connected', s.onConnected);
    s.rayObj.addEventListener('disconnected', s.onDisconnected);
    // squeeze -> gripping, exactly as specified. The trigger OR below is the
    // safety net for controllers that never report a squeeze at all.
    s.onSqueezeStart = () => { s.squeeze = true; };
    s.onSqueezeEnd = () => { s.squeeze = false; };
    s.rayObj.addEventListener('squeezestart', s.onSqueezeStart);
    s.rayObj.addEventListener('squeezeend', s.onSqueezeEnd);
  }

  function hideSlot(s) {
    if (!s.vis) return;
    s.vis.visible = false;
    s.reticle.visible = false;
    s.joints.visible = false;
    s.bones.visible = false;
    s.bead.visible = false;
  }

  function onSessionStart() {
    presenting = true;
    frameBroken = false;

    // Save every camera property three.js is about to overwrite. fov and zoom
    // are the ones that get forgotten: WebXRManager writes the union-frustum fov
    // straight onto the user camera, so a desktop that started at 38° comes back
    // at ~100° and the specimen looks like it was shot on a fisheye.
    saved = {
      parent: camera.parent,
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      matrixAutoUpdate: camera.matrixAutoUpdate,
      near: camera.near, far: camera.far,
      fov: camera.fov, zoom: camera.zoom, aspect: camera.aspect,
    };

    // near/far are handed to the runtime as depthNear/depthFar in METRES, not in
    // world units — view space is metres because the projection matrix comes
    // from the XR view. 2 cm lets you put your eye right down on the cavity.
    camera.near = 0.02;
    camera.far = 100;

    // Asset construction touches a 2D canvas and half a dozen GL resources. If
    // any of it fails we must NOT proceed: updateController() dereferences
    // s.vis/s.beam unconditionally, so a half-built session would throw on every
    // frame from inside the headset. Report and back out to the desktop instead.
    try {
      buildAssets();
    } catch (e) {
      console.error('xr: could not build session assets; leaving VR', e);
      fire({ kind: 'error', reason: 'VR assets could not be created: ' + ((e && e.message) || e) });
      presenting = false;
      if (session) { try { session.end(); } catch (e2) {} }
      return;
    }

    applyRig();
    if (!rig.parent) scene.add(rig);
    if (saved.parent) saved.parent.remove(camera);
    rig.add(camera);

    /*
     * THE camera trap. three.js decomposes the head pose RELATIVE TO THE RIG
     * into camera.position — i.e. metres. But dissect.js reads camera.position
     * as a WORLD point (updateLift), so left alone the forceps would release
     * organs at a nonsense depth. We cannot simply overwrite it either, because
     * Object3D.updateMatrixWorld() would recompose matrixWorld from the fake
     * value and every raycast in the app would fly off into the dark.
     *
     * So: turn matrixAutoUpdate off for the session. three still writes
     * camera.matrix itself; updateMatrixWorld then only propagates
     * rig.matrixWorld * camera.matrix, which is correct — and camera.position is
     * left free for us to publish the true world position into each frame.
     */
    camera.matrixAutoUpdate = false;

    for (let i = 0; i < slots.length; i++) {
      bindSlot(slots[i]);
      buildSlotVisuals(slots[i]);
      hideSlot(slots[i]);
    }
    refreshPickables();

    // Edge foveation costs nothing where the student is not looking.
    try { if (renderer.xr.setFoveation) renderer.xr.setFoveation(0.3); } catch (e) {}

    fire({ kind: 'start', session });
  }

  function onSessionEnd() {
    presenting = false;
    // Drop our own belt-and-braces 'end' listener before losing the reference,
    // otherwise every session entered in the lifetime of the page leaves one
    // closure pinned to a dead XRSession.
    if (session && sessionEndHandler) {
      try { session.removeEventListener('end', sessionEndHandler); } catch (e) {}
    }
    sessionEndHandler = null;
    session = null;

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      hideSlot(s);
      if (s.rayObj) {
        if (s.onConnected) s.rayObj.removeEventListener('connected', s.onConnected);
        if (s.onDisconnected) s.rayObj.removeEventListener('disconnected', s.onDisconnected);
        if (s.onSqueezeStart) s.rayObj.removeEventListener('squeezestart', s.onSqueezeStart);
        if (s.onSqueezeEnd) s.rayObj.removeEventListener('squeezeend', s.onSqueezeEnd);
      }
      s.source = null; s.present = false; s.grip = 0; s.gripping = false;
      s.pinching = false; s.squeeze = false; s.hitPartId = null;
    }

    if (rig.parent) rig.parent.remove(rig);

    // Put the desktop camera back EXACTLY as it was, projection included.
    if (saved) {
      rig.remove(camera);
      if (saved.parent) saved.parent.add(camera);
      camera.matrixAutoUpdate = saved.matrixAutoUpdate;
      camera.position.copy(saved.position);
      camera.quaternion.copy(saved.quaternion);
      camera.scale.set(1, 1, 1);
      camera.near = saved.near; camera.far = saved.far;
      camera.fov = saved.fov; camera.zoom = saved.zoom; camera.aspect = saved.aspect;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      saved = null;
    }

    renderer.xr.enabled = prevXrEnabled;
    // The canvas keeps the XR framebuffer's size until something resets it, so
    // the desktop comes back letterboxed or cropped without this.
    try { renderer.setSize(innerWidth, innerHeight); } catch (e) {}
    // ...and setSize alone is not enough. env.js's EffectComposer owns its OWN
    // render targets, sized when it was last told to resize; unless it is told
    // again it keeps compositing the desktop through XR-sized buffers and the
    // scene returns soft and mis-scaled. handViz's overlay canvas has the same
    // problem. Rather than reach into modules this one has no handle on, poke
    // the resize listener main.js already installed — it does the camera aspect,
    // the renderer, env.resize() and handViz.resize() in the one place that is
    // supposed to own them.
    try { dispatchEvent(new Event('resize')); } catch (e) { /* no window */ }

    out.x = 0.5; out.y = 0.5; out.grip = 0; out.gripping = false; out.span = 0;
    spanEma = -1;

    fire({ kind: 'end' });
  }

  async function enter() {
    if (presenting) return { ok: true, already: true };
    // dispose() frees the geometries and materials every session rebinds to. A
    // post-dispose enter() would bind meshes to deleted GL resources and either
    // render nothing or throw; refuse it in words instead.
    if (disposed) return { ok: false, reason: 'This VR session controller has been disposed.' };
    if (typeof navigator === 'undefined' || !navigator.xr) {
      return { ok: false, reason: 'This browser has no WebXR support. Chrome, Edge or the Quest '
        + 'browser over HTTPS will. Everything here works with a mouse.' };
    }
    if (!probeDone) await probe();
    if (!supportedFlag) return { ok: false, reason: lastReason };

    prevXrEnabled = renderer.xr.enabled;
    renderer.xr.enabled = true;

    if (!boundManagerEvents) {
      boundManagerEvents = true;
      renderer.xr.addEventListener('sessionstart', onSessionStart);
      renderer.xr.addEventListener('sessionend', onSessionEnd);
    }

    let s;
    try {
      // Nothing is REQUIRED: a missing optional feature degrades one capability,
      // a missing required feature refuses the session outright. hand-tracking in
      // particular is absent on most PC headsets and must never be a blocker.
      s = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
      });
    } catch (e) {
      renderer.xr.enabled = prevXrEnabled;
      const msg = (e && e.message) || String(e);
      return { ok: false, reason: /gesture|user activation/i.test(msg)
        ? 'The headset can only be entered from a direct click — press the button again.'
        : 'The headset refused the session: ' + msg };
    }

    session = s;
    // Belt and braces: the runtime can end a session without three noticing.
    sessionEndHandler = () => { if (presenting) onSessionEnd(); };
    s.addEventListener('end', sessionEndHandler);

    /*
     * Decide the reference space BEFORE handing the session to three.
     *
     * The obvious shape — setReferenceSpaceType('local-floor'), setSession,
     * catch, setReferenceSpaceType('local'), setSession AGAIN on the same
     * session — looks equivalent and is not. WebXRManager.setSession() attaches
     * its own listeners to the session ('end', 'inputsourceschange', 'select*',
     * 'squeeze*') BEFORE it awaits requestReferenceSpace, so a rejection leaves
     * that first set attached and the retry adds a second complete set. From
     * then on every controller event is delivered twice and three's internal
     * session-end handler runs twice on exit. Asking the session ourselves costs
     * one promise and keeps setSession a single call, which is what it expects.
     */
    originEyeM = 0;
    let spaceType = 'local-floor';
    try {
      await s.requestReferenceSpace('local-floor');
    } catch (e) {
      // 'local-floor' is only an OPTIONAL feature, so a runtime is entitled to
      // refuse it. 'local' puts the origin at the headset instead of the floor,
      // which we compensate for with an assumed eye height — the bench still
      // lands under the student's hands, just less precisely.
      console.warn('xr: local-floor unavailable; using local + assumed eye height', e);
      spaceType = 'local';
      originEyeM = XR_ASSUMED_EYE_M;
    }
    renderer.xr.setReferenceSpaceType(spaceType);
    try {
      await renderer.xr.setSession(s);
    } catch (e) {
      try { s.end(); } catch (e2) {}
      session = null;
      renderer.xr.enabled = prevXrEnabled;
      return { ok: false, reason: 'No usable reference space: ' + ((e && e.message) || e) };
    }
    applyRig();
    return { ok: true, mode: spaceType };
  }

  async function exit() {
    if (!session) return { ok: true, already: true };
    try { await session.end(); } catch (e) { /* already ending */ }
    return { ok: true };
  }

  /* ---- per-frame: hands -------------------------------------------------- */
  const _bonePos = [];    // reused Vector3s, filled from joint positions
  for (let i = 0; i < XR_JOINTS.length; i++) _bonePos.push(new THREE.Vector3());

  function updateHand(s) {
    const h = s.handObj;
    const joints = h && h.joints;
    if (!joints || !s.vis) return false;   // see the note in updateController

    const wrist = joints[XR_JOINTS[XR_J_WRIST]];
    const knuck = joints[XR_JOINTS[XR_J_MIDDLE_KNUCKLE]];
    const thumb = joints[XR_JOINTS[XR_J_THUMB_TIP]];
    const index = joints[XR_JOINTS[XR_J_INDEX_TIP]];
    if (!wrist || !knuck || !thumb || !index) return false;
    if (!wrist.visible || !index.visible || !thumb.visible) return false;

    // Copy every joint position (rig-local metres — three writes the pose into
    // joint.position directly, and the hand space itself is identity).
    let n = 0;
    for (let i = 0; i < XR_JOINTS.length; i++) {
      const j = joints[XR_JOINTS[i]];
      if (j && j.visible) { _bonePos[i].copy(j.position); n++; }
      else _bonePos[i].copy(_bonePos[XR_J_WRIST]);
    }
    if (n < 8) return false;

    // ── the pinch, computed exactly as the MediaPipe path computes it ───────
    // Aperture over hand size. Dividing by hand size is what makes the threshold
    // hold for a small hand and a large one alike; it is the same reason the
    // webcam path divides by apparent hand size instead of consulting z.
    const handSize = _bonePos[XR_J_WRIST].distanceTo(_bonePos[XR_J_MIDDLE_KNUCKLE]);
    if (handSize < 1e-4) return false;
    const ratio = _bonePos[XR_J_THUMB_TIP].distanceTo(_bonePos[XR_J_INDEX_TIP]) / handSize;

    // Hysteresis: a looser bar to STAY pinched than to become pinched. Without
    // it an incision stroke breaks into a dotted line as the ratio hovers.
    if (s.pinching) s.pinching = ratio < XR_PINCH_RELEASE;
    else s.pinching = ratio < XR_PINCH_ENTER;

    s.grip = XR_clamp(XR_mapRange(ratio, XR_PINCH_RELEASE, XR_PINCH_CLOSED, 0, 1), 0, 1);
    s.gripping = s.pinching;

    // The cursor is the thumb/index midpoint: it is where a real pinch closes,
    // so it is where the student expects the grab to happen. hands.js makes the
    // identical choice and the two must not disagree.
    s.pinchWorld.copy(_bonePos[XR_J_THUMB_TIP]).add(_bonePos[XR_J_INDEX_TIP]).multiplyScalar(0.5);
    _v1.copy(s.pinchWorld).applyMatrix4(rig.matrixWorld);
    // If the pinch is behind the eye the cursor simply holds its last value —
    // the hand is still tracked and still drawn, it just is not pointing at
    // anything. Dropping the whole hand because you lowered it would be worse.
    projectToCursor(_v1, s.cursor);

    // ── render the hand ────────────────────────────────────────────────────
    for (let i = 0; i < XR_JOINTS.length; i++) {
      const j = joints[XR_JOINTS[i]];
      const r = (j && j.jointRadius) || 0.007;
      _m1.makeScale(r, r, r);
      _m1.setPosition(_bonePos[i].x, _bonePos[i].y, _bonePos[i].z);
      s.joints.setMatrixAt(i, _m1);
    }
    s.joints.instanceMatrix.needsUpdate = true;
    s.joints.visible = true;

    const arr = s.bones.geometry.attributes.position.array;
    for (let b = 0; b < XR_BONES.length; b++) {
      const a = _bonePos[XR_BONES[b][0]], c = _bonePos[XR_BONES[b][1]];
      const o = b * 6;
      arr[o] = a.x; arr[o + 1] = a.y; arr[o + 2] = a.z;
      arr[o + 3] = c.x; arr[o + 4] = c.y; arr[o + 5] = c.z;
    }
    s.bones.geometry.attributes.position.needsUpdate = true;
    // needsUpdate alone re-uploads the buffer but leaves the CACHED bounds at
    // whatever the hand looked like on the first frame. frustumCulled is false so
    // this cannot currently blank the hand, but a null/stale boundingSphere is
    // also what Line.raycast rejects against, and one future `frustumCulled` left
    // at its default would turn that into an invisible hand nobody could explain.
    // 54 vertices; the cost is noise.
    s.bones.geometry.computeBoundingSphere();
    s.bones.geometry.computeBoundingBox();
    s.bones.visible = true;

    s.bead.position.copy(s.pinchWorld);
    s.bead.scale.setScalar(1 + s.grip * 0.9);
    s.bead.material.color.setHex(s.gripping ? 0x38e0d8 : 0x34d399);
    s.bead.material.opacity = 0.35 + s.grip * 0.55;
    s.bead.visible = true;

    // A bare hand does not emit a laser. The beam is a controller affordance;
    // with hands the fingers ARE the pointer and a ray would be noise.
    s.vis.visible = false;
    s.reticle.visible = false;

    // Contact haptics from proximity rather than from a ray: with hands there is
    // no ray to cast, and the fingertip's distance to the tissue is the honest
    // measure anyway. Bounding spheres are coarse, which is fine for a 12 ms tap.
    _v2.copy(_bonePos[XR_J_INDEX_TIP]).applyMatrix4(rig.matrixWorld);
    let touching = null;
    const reach = XR_TOUCH_M * XR_UNITS_PER_M;
    for (let i = 0; i < pickables.length; i++) {
      const m = pickables[i];
      // softbody.js mutates vertices, and a stale bounding sphere is the classic
      // silent failure here (see the raycast note in the house rules). It calls
      // computeBoundingSphere after every press, but a null sphere on a mesh
      // that has never been rendered is still possible — skip, do not crash.
      const bs = m.geometry && m.geometry.boundingSphere;
      if (!bs) continue;
      _v3.copy(bs.center).applyMatrix4(m.matrixWorld);
      // World scale, not local: these meshes hang off the specimen group.
      // NOT getWorldScale() — that calls updateWorldMatrix(true, false), which
      // walks and recomputes every ancestor. Once per pickable per hand per frame
      // at 90 Hz that is a few thousand needless matrix multiplies a second on
      // exactly the hardware that cannot afford them. matrixWorld is already
      // correct here (the renderer updated it); read the scale straight out of it.
      _scl.setFromMatrixScale(m.matrixWorld);
      const sc = Math.max(_scl.x, _scl.y, _scl.z);
      if (_v2.distanceTo(_v3) - bs.radius * sc < reach) { touching = m.userData.partId; break; }
    }
    if (touching && touching !== s.hitPartId) pulseSlot(s, 0.18, 12);
    s.hitPartId = touching;

    return true;
  }

  /* ---- per-frame: controllers -------------------------------------------- */
  function updateController(s) {
    const r = s.rayObj;
    // s.vis is checked too: everything below dereferences it, and a slot whose
    // visuals failed to build must report "not present" rather than throw.
    if (!r || !r.visible || !s.vis) return false;

    s.vis.visible = true;
    s.vis.position.copy(r.position);
    s.vis.quaternion.copy(r.quaternion);

    // Analog trigger -> the same 0..1 `grip` the mouse produces as 0 or 1, so
    // pressure-sensitive acts (a scalpel plunging on the first stroke) behave
    // identically. buttons[0] is the trigger on every WebXR mapping in the wild.
    let trigger = 0;
    const gp = s.source && s.source.gamepad;
    if (gp && gp.buttons && gp.buttons[0]) trigger = XR_clamp(gp.buttons[0].value || 0, 0, 1);
    // Squeeze -> gripping, per spec. Some runtimes report it only as a button.
    let squeeze = s.squeeze;
    if (!squeeze && gp && gp.buttons && gp.buttons[1] && gp.buttons[1].pressed) squeeze = true;

    s.grip = trigger;
    s.gripping = squeeze || trigger > XR_TRIGGER_AS_GRIP;

    // The controller's own ray, in world space. This is the one extra raycast
    // this module is entitled to: it is a genuinely different ray from the
    // camera ray dissect.js casts, and without it there is nowhere to put the
    // reticle and no way to know what a distant point is aimed at.
    _v1.copy(r.position).applyMatrix4(rig.matrixWorld);
    _dir.set(0, 0, -1).applyQuaternion(r.quaternion).applyQuaternion(rigQuat).normalize();
    _ray.set(_v1, _dir);
    _ray.near = 0;
    _ray.far = XR_RAY_REACH_M * XR_UNITS_PER_M;
    // intersectObjects APPENDS to the target array and never clears it. Reusing
    // the array without emptying it first is a slow leak that eventually returns
    // a stale hit from three frames ago as the nearest one.
    _hits.length = 0;
    _ray.intersectObjects(pickables, false, _hits);
    const hit = _hits.length ? _hits[0] : null;

    let reachM = XR_RAY_REACH_M;
    if (hit) {
      reachM = hit.distance / XR_UNITS_PER_M;
      projectToCursor(hit.point, s.cursor);

      s.reticle.visible = true;
      // Sit the ring ON the surface, tilted into the surface normal, lifted by
      // 1 mm of real distance so it does not z-fight with the tissue under it.
      _v2.copy(hit.point);
      if (hit.face) {
        _v3.copy(hit.face.normal)
          .applyNormalMatrix(_nm.getNormalMatrix(hit.object.matrixWorld)).normalize();
      } else _v3.copy(_up);
      _v2.addScaledVector(_v3, 0.001 * XR_UNITS_PER_M);
      rig.worldToLocal(_v2);
      s.reticle.position.copy(_v2);
      // NOT Object3D.lookAt: that resolves its target in WORLD space, and the
      // reticle's position is rig-local — the ring would face somewhere out in
      // the room. Build the rotation from the normal directly. Matrix4.lookAt
      // puts +Z along (eye - target), and RingGeometry faces +Z, so eye = normal.
      // (The frog view is near top-down, so the normal is usually parallel to
      // `up`; three's lookAt detects that degenerate case and nudges it.)
      _m1.lookAt(_v3, _zero, _up);
      s.reticle.quaternion.setFromRotationMatrix(_m1);
      s.reticle.material.color.setHex(s.gripping ? 0x38e0d8 : 0x34d399);
      s.reticle.material.opacity = 0.55 + s.grip * 0.4;

      const pid = hit.object.userData.partId;
      if (pid && pid !== s.hitPartId) pulseSlot(s, 0.16, 10);
      s.hitPartId = pid;
    } else {
      s.reticle.visible = false;
      s.hitPartId = null;
      // No tissue under the ray: publish where the ray would land anyway, so the
      // cursor keeps moving and the engine simply reports a miss. A frozen
      // cursor reads as a crash; a moving cursor over nothing reads as a miss.
      _v2.copy(_v1).addScaledVector(_dir, XR_RAY_REACH_M * XR_UNITS_PER_M * 0.6);
      projectToCursor(_v2, s.cursor);
    }

    s.beam.scale.set(1, 1, reachM);
    const wantMat = s.gripping ? beamMatB : beamMatA;
    if (s.beam.material !== wantMat) s.beam.material = wantMat;   // avoid needless state churn

    s.joints.visible = false;
    s.bones.visible = false;
    s.bead.visible = false;
    return true;
  }

  /* ---- per-frame --------------------------------------------------------- */
  /*
   * main.js wraps CONSTRUCTION in try/catch, but not the frame — and the wiring
   * puts `xr.update(dt)` on the FIRST line of tick(), which is now the renderer's
   * animation loop. So anything that throws in here does not degrade VR, it stops
   * the entire app rendering, in a headset, mid-incision, with no way out but
   * removing the device.
   *
   * The frame body is therefore guarded, and a failure disables THIS MODULE
   * rather than the app: we report once (a console.error repeating at 90 Hz is
   * its own denial of service), drop every slot, and stop publishing input — at
   * which point input() returns null and main.js's router falls straight back to
   * the mouse, which is the same graceful path a missing headset already takes.
   */
  function update(dt) {
    if (!presenting || frameBroken) return;
    try {
      updateFrame(dt);
    } catch (e) {
      frameBroken = true;
      console.error('xr: per-frame update failed; XR input disabled for this session', e);
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        s.present = false; s.grip = 0; s.gripping = false;
        try { hideSlot(s); } catch (e2) { /* visuals may be half-built */ }
      }
      fire({ kind: 'error', reason: (e && e.message) || String(e) });
    }
  }

  function updateFrame(dt) {
    // The normal case is "no headset". Cost it nothing.
    if (!presenting) return;

    // Refresh the user camera NOW, before dissect.js reads it. three would do it
    // during render() — a frame later than the logic that depends on it — and a
    // head that is always moving would leave the cursor trailing the gaze. This
    // is idempotent; render() calling it again is harmless.
    try { if (renderer.xr.updateCamera) renderer.xr.updateCamera(camera); } catch (e) {}

    // With matrixAutoUpdate off (see onSessionStart) camera.position is ours to
    // publish into. dissect.js's updateLift() reads it as a world point.
    camera.position.setFromMatrixPosition(camera.matrixWorld);

    rig.getWorldQuaternion(rigQuat);

    pickAge += 1;
    if (pickAge > 12) refreshPickables();

    let anyPresent = false;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s.source) { s.present = false; hideSlot(s); continue; }
      s.isHand = !!s.source.hand;
      const ok = s.isHand ? updateHand(s) : updateController(s);
      s.present = ok;
      if (!ok) { hideSlot(s); s.grip = 0; s.gripping = false; continue; }
      anyPresent = true;

      // Movement, for the primary-hand vote. An EMA so a twitch cannot steal the
      // cursor from the hand that is mid-incision.
      const src = s.isHand ? s.pinchWorld : s.rayObj.position;
      const moved = s.prevPos.distanceTo(src);
      s.prevPos.copy(src);
      s.activity += (Math.min(moved * 60, 1) - s.activity) * Math.min(1, (dt || 16) / 220);
    }

    if (!anyPresent) return;

    // ── which hand drives ───────────────────────────────────────────────────
    // A hand that is gripping always wins; otherwise the busier one, and only
    // by a clear margin. Flicking the cursor between hands mid-cut would ruin a
    // stroke, so the incumbent gets a handicap.
    let best = primary, bestScore = -1;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s.present) continue;
      let score = s.activity * 0.5 + (s.gripping ? 4 : 0) + s.grip;
      if (i === primary) score += 0.35;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    primary = best;

    const p = slots[primary];
    out.x = p.cursor.x;
    out.y = p.cursor.y;
    out.grip = p.grip;
    out.gripping = p.gripping;
    out.source = 'xr';

    // ── span: the two-handed retractor ─────────────────────────────────────
    // hands.js defines span as the separation of the two cursors in normalised
    // screen units, and dissect.js thresholds it at 0.18. Both cursors here are
    // already in that space, so the same formula plus the same EMA (see
    // XR_SPAN_EMA) gives the same feel — pull your hands apart, the body wall
    // opens. Seeded on the first frame both hands are up and reset when either
    // drops, exactly as HndEMA.reset() does, so a hand re-entering view does not
    // drag the span up from wherever it was left.
    const a = slots[0], b = slots[1];
    if (a.present && b.present) {
      const raw = Math.hypot(a.cursor.x - b.cursor.x, a.cursor.y - b.cursor.y);
      spanEma = spanEma < 0 ? raw : XR_SPAN_EMA * raw + (1 - XR_SPAN_EMA) * spanEma;
      out.span = spanEma;
    } else {
      spanEma = -1;
      out.span = 0;
    }
  }

  /* ---- api --------------------------------------------------------------- */
  function setTableHeight(m, worldY) {
    // `m` is the REAL bench height in metres — the thing that decides whether
    // you are standing over a specimen or crouching under one.
    if (typeof m === 'number' && isFinite(m)) tableM = XR_clamp(m, 0.45, 1.45);
    if (typeof worldY === 'number' && isFinite(worldY)) tableWorldY = worldY;
    if (presenting) applyRig();
    return tableM;
  }

  function setFocus(x, y, z) {
    // Where the student stands relative to the specimen. Call it on a specimen
    // swap if a future specimen is not centred near the origin. The wiring passes
    // the specimen's orbit target straight through (`setFocus(...spec.camera.target)`).
    //
    // `y` is stored but DELIBERATELY not used by applyRig. It is an orbit target,
    // not a bench height: the heart's target is y = 0.7 because that is a nice
    // place to look at, while the heart still SITS on the same table at
    // tableWorldY. Feeding it into the rig height would sink the student 0.7
    // units into the floor every time they picked the heart.
    focus.set(x || 0, y || 0, z === undefined ? -0.4 : z);
    if (presenting) applyRig();
  }

  function onSession(cb) {
    if (typeof cb !== 'function') return () => {};
    listeners.push(cb);
    // Late subscribers still need the support verdict they missed.
    if (probeDone) {
      try { cb({ kind: 'support', supported: supportedFlag, reason: supportedFlag ? null : lastReason }); }
      catch (e) {}
    }
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (session) { try { session.end(); } catch (e) {} }
    if (presenting) onSessionEnd();
    if (boundManagerEvents) {
      renderer.xr.removeEventListener('sessionstart', onSessionStart);
      renderer.xr.removeEventListener('sessionend', onSessionEnd);
      boundManagerEvents = false;
    }
    if (typeof navigator !== 'undefined' && navigator.xr && navigator.xr.removeEventListener) {
      try { navigator.xr.removeEventListener('devicechange', probe); } catch (e) {}
    }
    if (rig.parent) rig.parent.remove(rig);
    rig.traverse((o) => {
      if (o.isInstancedMesh && o.dispose) o.dispose();
    });
    owned.forEach((o) => { try { o.dispose && o.dispose(); } catch (e) {} });
    owned.length = 0;

    // Detach the visuals and drop every reference to them. Without this the rig
    // still holds a live graph of meshes bound to geometries and materials we
    // have just deleted — the exact state that renders as a black screen or a GL
    // error storm if anything ever hands the rig back to the renderer. onSessionEnd
    // has already re-parented the camera out of the rig, so clear() is safe here.
    rig.clear();
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      s.vis = null; s.beam = null; s.reticle = null;
      s.joints = null; s.bones = null; s.bead = null;
      s.rayObj = null; s.gripObj = null; s.handObj = null;
      s.source = null; s.present = false;
    }
    built = false;
    beamGeo = null; beamMatA = null; beamMatB = null;
    jointGeo = null; jointMat = null; boneMat = null; beadGeo = null; beadMat = null;
    ringGeo = null; ringMat = null;

    listeners.length = 0;
    pickables.length = 0;
  }

  return {
    supported: () => supportedFlag,
    enter,
    exit,
    isPresenting: () => presenting,
    // null when nothing is tracked, so main.js's router falls straight back to
    // the mouse — a headset on the desk with no hands in view must not freeze
    // the desktop cursor for whoever is watching the mirror.
    input: () => (presenting && (slots[0].present || slots[1].present) ? out : null),
    haptic,
    setTableHeight,
    setFocus,
    onSession,
    update,
    dispose,
    // Introspection for the verifier; getters, never a frozen snapshot.
    get session() { return session; },
    get rig() { return rig; },
    get unitsPerMetre() { return XR_UNITS_PER_M; },
  };
}
