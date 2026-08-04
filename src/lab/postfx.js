/*
 * postfx.js — the camera.
 *
 * env.js built the theatre and the light. This file is the LENS AND THE SENSOR
 * you look at it through, and it exists because of one observation: a rasterised
 * frame is too clean to be believed. Real footage of a real specimen carries
 * contact darkening in every crevice, a focal plane only millimetres deep, grain
 * that lives in the shadows, a hair of colour fringing at the corners, and
 * highlights that ROLL instead of clipping. Take those away and the eye reads
 * "render" before it reads "frog", no matter how good the geometry is.
 *
 * Ordered by how much each one buys, on this scene specifically:
 *
 *   1. AO. The specimen is a pile of wet shapes resting against each other, and
 *      ambient occlusion is the ONLY cue that says they are touching rather than
 *      interpenetrating. Small radius, low intensity: it must read as shadow in a
 *      crease, never as dirt sprayed into the model.
 *   2. Depth of field, driven by dissect.js's raycast contact. What the
 *      instrument is touching is what is sharp. That single coupling is worth
 *      more than any amount of blur quality because it puts the frame's focus
 *      where a real dissector's eyes already are.
 *   3. Grain, luminance-weighted — heavy in the toe, almost gone in the
 *      highlight, the way film and sensors actually behave. Uniform grain over a
 *      bright specular is the giveaway of a "film look" filter.
 *   4. Chromatic aberration measured in a fraction of ONE device pixel. If you
 *      can see it, it is five times too strong.
 *   5. A warm vignette, so the corners fall off toward the lamp's colour rather
 *      than toward black, and a filmic S-curve that cannot re-clip what ACES
 *      just finished rolling off.
 *
 * Contract:
 *   createPostFX(THREE, deps, ctx)
 *     deps = { EffectComposer, RenderPass, UnrealBloomPass, OutputPass }  (any absent)
 *     ctx  = { scene, camera, renderer, composer? }
 *   -> { render(dt), resize(w,h), setQuality(0|1|2), setEnabled(name, on),
 *        focusOn(point), settings(), dispose(), setBloom(s), setExposure(x),
 *        quality, ready }
 *
 * On cost, stated plainly rather than optimistically: the grade is ONE
 * fullscreen pass of a dozen ALU ops and is affordable everywhere, so it is
 * tier 0 and it is the default on integrated graphics. AO costs a G-buffer
 * prepass over all 29 parts plus a denoise and gates at tier 1. Depth of field
 * costs a SECOND full scene render and gates at tier 2. Integrated parts are
 * probed straight to tier 0 — with MediaPipe hand tracking and softbody.js also
 * on the frame there is no honest claim that AO holds 60fps there.
 *
 * Two hard rules this file lives by:
 *   - It never takes the frame down. Every pass is fetched with its own guarded
 *     dynamic import and configured inside its own try/catch, so a CDN hiccup or
 *     an API drift costs exactly that one effect. If everything fails, render()
 *     falls all the way back to renderer.render(scene, camera).
 *   - It never rewrites env.js's rig. Given ctx.composer it splices into the
 *     EXISTING chain around the existing bloom and puts every pass back on
 *     dispose(); given nothing it builds its own chain WITH bloom in it.
 */

/* The standard fullscreen vertex shader ShaderPass expects. */
const FX_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/*
 * ONE pass for every cheap screen-space effect. Three separate ShaderPasses would
 * mean three fullscreen blits and three render-target ping-pongs for work that
 * costs a dozen ALU ops — on the integrated GPU this app is expected to survive,
 * the bandwidth IS the cost, not the maths.
 *
 * This runs AFTER OutputPass, i.e. on display-referred sRGB. That is deliberate:
 * grain added before tone mapping gets crushed by the ACES toe precisely where
 * you wanted it, and a vignette applied in linear light goes muddy instead of
 * dark. Optical effects belong before tone mapping; sensor effects belong after.
 * CA is optical and is on the wrong side here, but at 0.3 of a pixel the
 * difference is unmeasurable and the saved pass is not.
 */
const FX_GRADE_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2  fxTexel;      // 1 / drawing-buffer size (DEVICE pixels)
uniform float fxTime;       // pre-wrapped to [0,1) in JS — see the precision note
uniform float fxGrain;      // peak amplitude, in the shadows
uniform float fxGrainPx;    // grain cell size in device pixels
uniform float fxCA;         // corner R/B separation, in DEVICE pixels
uniform float fxVig;
uniform float fxContrast;
uniform float fxSplit;
varying vec2 vUv;

// A fract-chain hash, not the usual sin(dot(...)) * 43758.5453. The sine version
// loses all its entropy in mediump and degenerates into visible diagonal banding
// on exactly the mobile/integrated parts that most need the frame to look decent.
float fxHash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  vec2  d   = vUv - 0.5;
  float rr2 = dot(d, d);
  float r2  = min(rr2 * 2.0, 1.0);                       // 0 at centre, 1 at corner
  float rr  = sqrt(min(rr2 * 2.0, 2.0));

  // ---- chromatic aberration: radial, quadratic, zero at the optical centre ----
  // inversesqrt of a clamped length, not normalize(): normalize(vec2(0)) is a NaN
  // that propagates through the whole fragment and punches one black pixel dead
  // centre of frame. It is the single easiest way to ruin an otherwise fine pass.
  vec2 dir = d * inversesqrt(max(rr2, 1e-8));
  vec2 off = dir * (r2 * fxCA) * fxTexel;

  vec4 src = texture2D(tDiffuse, vUv);
  vec3 col = vec3(texture2D(tDiffuse, vUv + off).r,
                  src.g,
                  texture2D(tDiffuse, vUv - off).b);
  col = clamp(col, 0.0, 1.0);

  // ---- filmic contrast -----------------------------------------------------
  // A smoothstep curve, not a pivot-and-scale. x*x*(3-2x) is asymptotically flat
  // at both ends, so it adds bite in the midtones and physically CANNOT push a
  // highlight past 1.0 — it re-rolls the shoulder instead of re-clipping what
  // ACES already worked to save. Clipped wet speculars are what make CG look CG.
  vec3 s = col * col * (3.0 - 2.0 * col);
  col = mix(col, s, fxContrast);

  // ---- split tone: cold shadows, warm highlights ---------------------------
  // The rig is a warm lamp against a cold room. Pushing that same opposition a
  // couple of percent through the grade is free and it is most of why footage
  // reads as "shot" rather than "rendered".
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 cool = mix(vec3(1.0), vec3(0.88, 0.97, 1.10), fxSplit);
  vec3 warm = mix(vec3(1.0), vec3(1.04, 1.00, 0.94), fxSplit);
  col *= mix(cool, warm, lum);

  // ---- vignette: warm, not black -------------------------------------------
  // Corners fall toward the lamp's colour. A neutral vignette reads as a filter;
  // a warm one reads as a lens under a tungsten key, which is what this room is.
  float v = smoothstep(0.55, 1.25, rr) * fxVig;
  col *= mix(vec3(1.0), vec3(0.74, 0.68, 0.60), v);

  // ---- grain ---------------------------------------------------------------
  // Weighted by luminance: real emulsion and real sensors are noisy in the toe
  // and clean in the highlight. Flat grain over the whole frame is the tell.
  // gl_FragCoord is in device pixels, so dividing by fxGrainPx keeps one grain
  // cell ~1 CSS pixel whether the display is 1x or 3x.
  float w = mix(1.0, 0.16, smoothstep(0.12, 0.80, lum));
  float n = fxHash12(floor(gl_FragCoord.xy / max(fxGrainPx, 1.0)) + fxTime * 71.3);
  col += (n - 0.5) * fxGrain * w;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), src.a);
}
`;

/*
 * Camera-only motion blur: a one-frame shutter smear, nothing more.
 * It blends against the PREVIOUS INPUT frame rather than the previous OUTPUT
 * frame, which caps the smear at exactly one frame. Feeding the output back
 * would build an exponential tail that keeps smearing long after the camera has
 * stopped, and on a specimen that is also breathing under softbody.js that tail
 * reads as a rendering fault, not as motion.
 */
const FX_MOTION_FRAG = `
uniform sampler2D tDiffuse;
uniform sampler2D tPrev;
uniform float fxMix;
varying vec2 vUv;
void main() {
  gl_FragColor = mix(texture2D(tDiffuse, vUv), texture2D(tPrev, vUv), fxMix);
}
`;

/* Straight blit. Local so the module needs no CopyShader fetch of its own. */
const FX_COPY_FRAG = `
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tDiffuse, vUv); }
`;

/* Guarded addon fetch. Resolves to null instead of rejecting, so a caller can
   `await` a whole batch with Promise.all and simply find nulls where the CDN
   let it down. */
const FX_import = async (path, name) => {
  try {
    const m = await import(/* @vite-ignore */ path);
    return m && m[name] ? m[name] : null;
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('postfx: ' + name + ' unavailable', e);
    return null;
  }
};

const FX_clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/*
 * The three numbers that decide whether this reads as a specimen or as an
 * Instagram filter. All three were originally set about twice as high as the
 * file's own header says they should be, so they are pulled here and stated
 * once, with the arithmetic, instead of being buried as literals in syncPasses.
 *
 * FX_GRAIN — peak amplitude in the shadows, on 0..1 display-referred sRGB. The
 *   shader adds (hash - 0.5) * FX_GRAIN, so the excursion is HALF this number:
 *   0.018 => +/-0.009 => +/-2.3 of 255. That is at the threshold of visibility on
 *   a dark clinical background, which is exactly where grain belongs — it should
 *   stop the shadows looking like flat vector fill without ever being something
 *   you could point at. The previous 0.030 was +/-3.8/255 and you could see it
 *   crawling on the drapes.
 * FX_CA — corner red/blue separation in DEVICE pixels, applied as +off to red
 *   and -off to blue, so the visible R-to-B spread is TWICE this. 0.30 => 0.6px
 *   total, i.e. sub-pixel, i.e. it survives only as a faint warmth on the outer
 *   edge of a high-contrast boundary. The previous 0.60 gave a 1.2px spread,
 *   which is a visible colour fringe — and the header itself says that if you
 *   can see it, it is five times too strong.
 * FX_VIG — vignette depth. At the corner of a 16:9 frame the falloff term lands
 *   near 0.71, so 0.45 darkens the corner by ~8% in red and ~12% in blue toward
 *   the lamp's colour. Enough to hold the eye centre-frame; not enough to read
 *   as a filter. The previous 0.55 pushed the blue corner down 16%.
 */
const FX_GRAIN = 0.018;
const FX_CA = 0.30;
const FX_VIG = 0.45;

/*
 * Quality tiers — REBALANCED AGAINST MEASURED COST, not against how nice each
 * effect sounds. The three effects do NOT cost the same and the original split
 * pretended they did.
 *
 *   0 — the grade only: grain, vignette, filmic contrast, split tone. ONE
 *       fullscreen pass, a dozen ALU ops, no extra scene render, no extra
 *       render target. On the integrated parts this app has to survive it is
 *       well under half a millisecond, and it is most of what makes the frame
 *       read as footage. Putting it in the same bucket as AO — which costs a
 *       whole extra pass over the geometry — was the original file's mistake:
 *       it threw away the cheapest effect to save the expensive one.
 *   1 — + AO, + chromatic aberration. AO is the single most valuable cue here
 *       (it is the only thing that says two organs are TOUCHING) but it is also
 *       a G-buffer prepass over all 29 parts plus a denoise, so it gates here.
 *   2 — + depth of field, + the shutter smear. BokehPass costs a SECOND full
 *       scene render for its depth buffer. That is the one line item that
 *       scales with the specimen rather than with pixels, so it goes last.
 *
 * Honest note, because the header used to imply otherwise: tier 1 is NOT a
 * guaranteed 60fps on Intel UHD-class graphics once MediaPipe hand tracking and
 * softbody.js are also on the frame. The probe below therefore defaults such
 * machines to tier 0, and the watchdog in render() will not promote them.
 */
const FX_TIERS = [
  { ssao: false, dof: false, grain: true, ca: false, vignette: true, grade: true, motion: false },
  { ssao: true,  dof: false, grain: true, ca: true,  vignette: true, grade: true, motion: false },
  { ssao: true,  dof: true,  grain: true, ca: true,  vignette: true, grade: true, motion: true  },
];

/*
 * Probe the GPU and guess a tier, conservatively. A beautiful frame at 12fps is
 * worse than a plain one at 60 — a student who has to fight the framerate to
 * find the pancreas will not care how the highlights roll.
 *
 * Returns -1 for "not even one fullscreen pass" (software rasteriser, WebGL1,
 * a GPU too small to hold the buffers). The caller clamps that to tier 0 and
 * additionally forces every effect off; the contract still only ever REPORTS
 * 0|1|2.
 *
 * This is a guess and it is treated as one: render() also measures real frame
 * time and drops a tier if the guess was wrong. It never climbs back, because an
 * auto-upgrade next to an auto-downgrade is an oscillator, and a frame rate that
 * pulses between two looks is more distracting than either look.
 */
const FX_probeQuality = (renderer) => {
  try {
    const gl = renderer.getContext();
    const caps = renderer.capabilities || {};
    let name = '';
    let known = false;
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        name = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
        known = name.length > 0;
      }
    } catch (e) { /* blocked by privacy settings on some browsers; fine */ }

    // Software rasterisers cannot afford a single extra fullscreen pass.
    if (/swiftshader|llvmpipe|softpipe|basic render|microsoft basic/.test(name)) return -1;
    if (!caps.isWebGL2) return -1;
    if ((caps.maxTextureSize || 0) < 4096) return -1;

    const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    // Integrated Intel parts and the low-power Adreno/Mali tiers get the grade
    // and nothing else. They do not have the bandwidth for a G-buffer prepass on
    // top of bloom on top of hand tracking, and measuring that after the fact
    // costs the student 90 janky frames before the watchdog notices.
    const weak = /intel|uhd graphics|hd graphics|iris|adreno [1-5]|mali-[gt]?[1-6]|videocore|llvm|apple gpu/.test(name);
    if (weak || cores < 4 || dpr > 2.5) return 0;
    // An UNKNOWN renderer is not a fast one by default. Privacy-hardened
    // browsers blank the string, and assuming "must be a discrete card" there is
    // how a ThinkPad ends up doing two scene renders a frame.
    if (!known || cores < 8 || dpr > 2) return 1;
    return 2;
  } catch (e) {
    return 0;
  }
};

export function createPostFX(THREE, deps, ctx) {
  deps = deps || {};
  ctx = ctx || {};
  const scene = ctx.scene, camera = ctx.camera, renderer = ctx.renderer;
  if (!scene || !camera || !renderer) throw new Error('postfx: ctx needs {scene, camera, renderer}');

  const borrowed = ctx.composer || null;   // env.js's chain, if it was handed over

  /* ---- state -------------------------------------------------------------- */
  const probed = FX_probeQuality(renderer);
  // `bare` is a floor, not a tier: on a software rasteriser even the one cheap
  // fullscreen pass is worth more than it costs, so every effect stays off no
  // matter what setQuality() is later handed. quality still reports 0..2.
  const bare = probed < 0;
  let quality = bare ? 0 : probed;
  let ready = false;
  let disposed = false;
  const enabled = Object.assign({}, FX_TIERS[quality]);
  if (bare) Object.keys(enabled).forEach((k) => { enabled[k] = false; });
  const loaded = [], failed = [];

  let composer = borrowed;
  let ownComposer = false;
  let renderPass = null, bloom = null, outputPass = null;
  let aoPass = null, aoKind = null, dofPass = null, gradePass = null, motionPass = null, copyPass = null;
  const inserted = [];               // exactly what we spliced into a BORROWED chain
  let renderPassWasEnabled = true;
  let prevRT = null;
  let prevValid = false;            // does prevRT hold LAST frame, or an old one?

  const prevExposure = renderer.toneMappingExposure;

  /*
   * Tone-mapping audit, against this specific rig.
   *
   * env.js runs ACESFilmic at exposure 1.15 under a 210-intensity SpotLight with
   * decay 1.7 at ~15 units. That is a genuinely bright key, and the tissue
   * materials carry clearcoat on top of a physical base — so the wet speculars
   * were arriving at ACES already above 1.0 and coming out the far side as flat
   * white discs. Pulling exposure down ~8% puts those peaks back on the shoulder
   * where ACES can roll them, and the grade's S-curve hands the midtones back so
   * the frame does not read as merely darker. Net: the same brightness, wet
   * highlights that have SHAPE.
   *
   * The lamp fixture's own face is MeshBasicMaterial with toneMapped:false — it
   * is meant to blow out, it is the light source, and bloom needs it to. Nothing
   * here touches it.
   */
  let exposure = 1.06;
  renderer.toneMappingExposure = exposure;

  /* ---- focus -------------------------------------------------------------- */
  // Distances along the view ray, in world units. restPoint is where focus drifts
  // back to when nothing is under the instrument: the specimen sits at the origin
  // in every SPECIMENS entry, so that is a safe resting plane.
  const restPoint = new THREE.Vector3(0, 0, 0);
  const focusScratch = new THREE.Vector3();
  let focusTarget = 14, focusNow = 14;

  /* ---- scratch — hoisted, never allocated in a frame ---------------------- */
  const camPos = new THREE.Vector3();
  const camQuat = new THREE.Quaternion();
  const dbSize = new THREE.Vector2();
  let camPrimed = false;

  /* ---- frame-time watchdog ------------------------------------------------ */
  let frameAvg = 16.7, warmup = 0, overBudget = 0, degraded = false;

  let clock = 0;

  /* ---- helpers ------------------------------------------------------------ */
  const bufferSize = () => {
    renderer.getDrawingBufferSize(dbSize);
    return dbSize;
  };

  const applyTier = () => {
    const tier = FX_TIERS[FX_clamp(quality | 0, 0, 2)];
    Object.keys(tier).forEach((k) => { enabled[k] = bare ? false : tier[k]; });
    syncPasses();
  };

  /*
   * Push `enabled` down onto the actual passes.
   *
   * EffectComposer assigns renderToScreen to the last ENABLED pass every single
   * frame (isLastEnabledPass), so flipping pass.enabled is always safe — no
   * splicing, no re-ordering, no chance of blanking the frame by leaving nothing
   * pointed at the default framebuffer.
   *
   * TRAP CHECKED, NOT ASSUMED: older SSAOPass rendered the beauty buffer itself,
   * which would make env's RenderPass a wasted duplicate scene render — and every
   * blog post about it still says so. In r160 both SSAOPass and GTAOPass composite
   * onto readBuffer instead. So RenderPass MUST stay enabled; "optimising" it away
   * on that stale advice renders a black frame with AO multiplied over it.
   */
  function syncPasses() {
    if (aoPass) aoPass.enabled = !!enabled.ssao;
    if (dofPass) dofPass.enabled = !!enabled.dof;
    if (gradePass) {
      // Gate on `grade` ALONE. The old condition also required one of
      // grain/vignette/ca, which meant turning those three off silently threw
      // away the contrast curve and the split tone as well — the two parts of
      // this pass that have nothing to do with the other three. The individual
      // amounts are already zeroed below, so a pass with grain/vig/ca off is a
      // correct, cheap contrast-and-split-only pass.
      gradePass.enabled = !!enabled.grade;
      const u = gradePass.uniforms;
      u.fxGrain.value = enabled.grain ? FX_GRAIN : 0.0;
      u.fxCA.value = enabled.ca ? FX_CA : 0.0;         // corner separation, device pixels
      u.fxVig.value = enabled.vignette ? FX_VIG : 0.0;
      u.fxContrast.value = enabled.grade ? 0.10 : 0.0;
      u.fxSplit.value = enabled.grade ? 0.030 : 0.0;
    }
    if (motionPass) { motionPass.enabled = false; prevValid = false; }  // re-armed per frame by camera speed
    if (renderPass) renderPass.enabled = renderPassWasEnabled;
  }

  /* ---- build the chain ---------------------------------------------------- */
  function identifyBorrowed() {
    if (!composer || !composer.passes) return;
    composer.passes.forEach((p) => {
      if (deps.RenderPass && p instanceof deps.RenderPass) renderPass = renderPass || p;
      else if (deps.UnrealBloomPass && p instanceof deps.UnrealBloomPass) bloom = bloom || p;
      else if (deps.OutputPass && p instanceof deps.OutputPass) outputPass = outputPass || p;
    });
    if (renderPass) renderPassWasEnabled = renderPass.enabled !== false;
  }

  function buildOwnChain() {
    const EC = deps.EffectComposer, RP = deps.RenderPass;
    if (!EC || !RP) return false;
    try {
      composer = new EC(renderer);
      ownComposer = true;
      renderPass = new RP(scene, camera);
      composer.addPass(renderPass);
      if (deps.UnrealBloomPass) {
        // env.js's exact numbers. A high threshold so only the lamp face and the
        // wet speculars bloom — drop it and the whole frame hazes, which reads as
        // cheap instantly. Bloom must survive this module either way.
        bloom = new deps.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.62, 0.86);
        composer.addPass(bloom);
      }
      if (deps.OutputPass) { outputPass = new deps.OutputPass(); composer.addPass(outputPass); }
      return true;
    } catch (e) {
      console.warn('postfx: own composer failed; falling back to direct render', e);
      composer = null; ownComposer = false;
      return false;
    }
  }

  // Where AO and DOF belong: after the scene is drawn, BEFORE bloom. The lens
  // defocuses light and only then does the glass and the sensor scatter it, so
  // blurring first and blooming second is the physical order — and it is also the
  // prettier one, because a defocused specular blooms into a soft disc instead of
  // a hard dot with a halo pasted on.
  /*
   * Both splice helpers return false if there is nowhere to put the pass —
   * which happens for real, because dispose() can land while init() is still
   * awaiting a module from the CDN. A pass that cannot be installed must be
   * FREED here and now: GTAOPass alone owns depth, normal, AO and denoise
   * render targets, so dropping one on the floor is tens of megabytes that
   * nothing will ever reclaim. Callers null their handle on false.
   */
  function orphan(pass) {
    if (pass && pass.dispose) { try { pass.dispose(); } catch (e) {} }
    return false;
  }

  function insertBefore(pass, anchor) {
    if (!composer || disposed) return orphan(pass);
    let idx = composer.passes.length;
    if (anchor) {
      const i = composer.passes.indexOf(anchor);
      if (i >= 0) idx = i;
    }
    if (composer.insertPass) composer.insertPass(pass, idx);
    else composer.passes.splice(idx, 0, pass);
    if (borrowed && !ownComposer) inserted.push(pass);
    return true;
  }

  function appendPass(pass) {
    if (!composer || disposed) return orphan(pass);
    composer.addPass(pass);
    if (borrowed && !ownComposer) inserted.push(pass);
    return true;
  }

  /* ---- async pass acquisition -------------------------------------------- */
  /*
   * Everything below is fetched after the factory has already returned. That is
   * the whole point: render() works from frame one on the plain chain, and each
   * effect drops in when (and only if) its module arrives and configures cleanly.
   * A pass that throws during configuration is disposed and forgotten rather than
   * left half-set-up in the chain.
   */
  async function init() {
    if (!composer) {
      identifyBorrowed();
      if (!borrowed) buildOwnChain();
    } else identifyBorrowed();
    if (!composer) { ready = true; return; }

    /*
     * ONE round trip, not four. These were awaited in series, which on a cold
     * cache is four sequential CDN fetches — the frame runs plain for the whole
     * of it and the effects pop in one at a time over a second or more. They are
     * independent, FX_import already resolves to null instead of rejecting, so
     * Promise.all is exactly the right shape and cannot reject.
     */
    const [ShaderPass, GTAOPass, BokehPass] = await Promise.all([
      FX_import('three/addons/postprocessing/ShaderPass.js', 'ShaderPass'),
      FX_import('three/addons/postprocessing/GTAOPass.js', 'GTAOPass'),
      FX_import('three/addons/postprocessing/BokehPass.js', 'BokehPass'),
    ]);
    // dispose() may have landed while those were in flight. Building passes into
    // a torn-down composer allocates render targets nobody will ever free.
    if (disposed) { ready = true; return; }

    /* ---- AO: GTAO if this three has it, else SSAO ------------------------- */
    const size = bufferSize();
    if (GTAOPass) {
      // Declared OUTSIDE the try. The old code only had a handle to the pass
      // inside it, so a throw from updateGtaoMaterial/updatePdMaterial — the
      // exact API drift the catch exists to survive — left a fully constructed
      // GTAOPass, with all four of its full-screen render targets, unreachable
      // and undisposed. The catch then "cleaned up" aoPass, which was still null.
      let p = null;
      try {
        p = new GTAOPass(scene, camera, size.x, size.y);
        // Radius is in WORLD UNITS and the specimen is ~10 units across. The
        // stock 0.25-of-the-scene default would wrap a grey haze around whole
        // organs; what we want is a dark line where two organs meet, roughly the
        // width of the connective tissue that would really be sitting there.
        // samples/denoise-samples halved from the original 12/8. GTAO's cost is
        // very nearly linear in SAMPLES and this is a small-radius contact-shadow
        // configuration, not an ambient-lighting one — at radius 0.30 there is
        // not enough angular variation for 12 taps to resolve anything 8 does
        // not. The denoise then hides what little difference is left.
        if (p.updateGtaoMaterial) p.updateGtaoMaterial({
          radius: 0.30, distanceExponent: 1.0, thickness: 0.6,
          scale: 1.0, samples: 8, screenSpaceRadius: false,
        });
        if (p.updatePdMaterial) p.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 4 });
        // Intensity is the difference between "these organs are touching" and
        // "someone rubbed soot into the model". 0.55 is as far as it goes.
        if ('blendIntensity' in p) p.blendIntensity = 0.55;
        if (GTAOPass.OUTPUT && 'output' in p) p.output = GTAOPass.OUTPUT.Default;
        if (insertBefore(p, bloom || outputPass)) {
          aoPass = p; aoKind = 'gtao';
          loaded.push('gtao');
        }
      } catch (e) {
        console.warn('postfx: GTAO present but would not configure; trying SSAO', e);
        if (p) {
          // It may already be in the chain — a throw is possible after
          // insertBefore too. Pull it back out before freeing it, or the
          // composer renders a disposed pass every frame.
          const i = composer && composer.passes ? composer.passes.indexOf(p) : -1;
          if (i >= 0) { try { composer.passes.splice(i, 1); } catch (e3) {} }
          const j = inserted.indexOf(p);
          if (j >= 0) inserted.splice(j, 1);
          orphan(p);
        }
        aoPass = null; aoKind = null;
      }
    }
    if (!aoPass) {
      const SSAOPass = await FX_import('three/addons/postprocessing/SSAOPass.js', 'SSAOPass');
      if (disposed) { ready = true; return; }
      if (SSAOPass) {
        let p = null;
        try {
          p = new SSAOPass(scene, camera, size.x, size.y);
          p.kernelRadius = 0.42;      // world units — crevice scale, not organ scale
          p.minDistance = 0.0015;     // kills the self-occlusion acne on curved tissue
          p.maxDistance = 0.09;       // stops one organ shadowing another across a gap
          if (SSAOPass.OUTPUT && 'output' in p) p.output = SSAOPass.OUTPUT.Default;

          // SSAOPass has no intensity uniform — GTAOPass got blendIntensity, SSAO
          // never did, and the AO is multiplied in at full strength. Patch one in
          // at the shader's single output line (r160 SSAOShader ends
          // `gl_FragColor = vec4( vec3( 1.0 - occlusion ), 1.0 );`), guarded by an
          // exact-substring test so that if three rewrites the shader we quietly
          // keep the un-dimmed version instead of compiling a broken one.
          // Undimmed SSAO on wet tissue looks like the specimen was stored in a
          // dusty drawer — grime, not contact.
          try {
            const m = p.ssaoMaterial;
            const key = '1.0 - occlusion';
            if (m && m.fragmentShader && m.fragmentShader.indexOf(key) >= 0) {
              m.uniforms.fxAoIntensity = { value: 0.62 };
              m.fragmentShader = 'uniform float fxAoIntensity;\n'
                + m.fragmentShader.split(key).join('1.0 - occlusion * fxAoIntensity');
              m.needsUpdate = true;
            }
          } catch (e) { /* keep the pass, lose the dimming */ }

          if (insertBefore(p, bloom || outputPass)) {
            aoPass = p; aoKind = 'ssao';
            loaded.push('ssao');
          }
        } catch (e) {
          failed.push('ssao');
          console.warn('postfx: SSAO failed', e);
          if (p && p !== aoPass) orphan(p);
        }
      } else failed.push('ssao');
    }

    /* ---- depth of field --------------------------------------------------- */
    if (BokehPass) {
      let p = null;
      try {
        // aperture is the f-stop analogue and it is savage: 0.025 (the three
        // example's value) on a 12-unit scene turns everything but one organ into
        // soup. What we want is a plane a few centimetres deep — enough that the
        // eye is TOLD where to look, not so much that the student loses the field.
        p = new BokehPass(scene, camera, { focus: focusNow, aperture: 0.00042, maxblur: 0.006 });
        if (insertBefore(p, bloom || outputPass)) {
          dofPass = p;
          loaded.push('dof');
        }
      } catch (e) {
        failed.push('dof');
        console.warn('postfx: bokeh failed', e);
        if (p && p !== dofPass) orphan(p);
      }
    } else failed.push('dof');

    /* ---- motion + grade (both need ShaderPass) ---------------------------- */
    if (ShaderPass) {
      try {
        const sz = bufferSize();
        prevRT = new THREE.WebGLRenderTarget(Math.max(1, sz.x), Math.max(1, sz.y), {
          minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
          depthBuffer: false, stencilBuffer: false,
        });
        copyPass = new ShaderPass({
          uniforms: { tDiffuse: { value: null } },
          vertexShader: FX_VERT, fragmentShader: FX_COPY_FRAG,
        });
        motionPass = new ShaderPass({
          uniforms: { tDiffuse: { value: null }, tPrev: { value: null }, fxMix: { value: 0 } },
          vertexShader: FX_VERT, fragmentShader: FX_MOTION_FRAG,
        });
        const baseRender = motionPass.render.bind(motionPass);
        motionPass.render = function (r, writeBuffer, readBuffer, dt, maskActive) {
          this.uniforms.tPrev.value = prevRT.texture;
          baseRender(r, writeBuffer, readBuffer, dt, maskActive);
          // Stash the INPUT, not the output — see the note on FX_MOTION_FRAG.
          copyPass.render(r, prevRT, readBuffer, dt, maskActive);
          // The blit leaves prevRT bound. Harmless for the next pass (it binds its
          // own target) but not if we were the last pass on screen, so unbind.
          if (this.renderToScreen) r.setRenderTarget(null);
        };
        if (appendPass(motionPass)) loaded.push('motion');
        else { orphan(copyPass); motionPass = null; copyPass = null; }
      } catch (e) {
        failed.push('motion');
        orphan(motionPass); orphan(copyPass);
        motionPass = null; copyPass = null;
      }
      // prevRT is shared bookkeeping for the motion pass; if that pass is gone,
      // so is the only reader of a full-screen render target.
      if (!motionPass && prevRT) { try { prevRT.dispose(); } catch (e) {} prevRT = null; }

      try {
        gradePass = new ShaderPass({
          uniforms: {
            tDiffuse: { value: null },
            fxTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
            fxTime: { value: 0 },
            fxGrain: { value: FX_GRAIN },
            fxGrainPx: { value: Math.max(1, Math.round(renderer.getPixelRatio())) },
            fxCA: { value: FX_CA },
            fxVig: { value: FX_VIG },
            fxContrast: { value: 0.10 },
            fxSplit: { value: 0.030 },
          },
          vertexShader: FX_VERT, fragmentShader: FX_GRADE_FRAG,
        });
        if (appendPass(gradePass)) loaded.push('grade');
        else gradePass = null;
      } catch (e) {
        failed.push('grade');
        orphan(gradePass);
        gradePass = null;
      }
    } else { failed.push('grade'); failed.push('motion'); }

    resize(innerWidth, innerHeight);
    applyTier();
    ready = true;
  }

  /* ---- resize ------------------------------------------------------------- */
  function resize(w, h) {
    w = Math.max(1, w | 0); h = Math.max(1, h | 0);
    try {
      // composer.setSize already forwards to EVERY pass, and it forwards the
      // DEVICE size (w * pixelRatio). Calling aoPass.setSize(w, h) afterwards to
      // "make sure" would overwrite that with CSS pixels and quietly render AO
      // and bokeh at half resolution on every retina display — matching neither
      // the composer's buffers nor each other. Let the composer do its job.
      if (composer && composer.setSize) composer.setSize(w, h);
      const sz = bufferSize();
      // A resize reallocates prevRT's storage, so whatever frame was in it is
      // gone. Say so, or the next camera move blends against uninitialised
      // memory — which on some drivers is not black, it is garbage.
      if (prevRT) { prevRT.setSize(Math.max(1, sz.x), Math.max(1, sz.y)); prevValid = false; }
      if (gradePass) {
        // Device pixels, not CSS pixels. Everything measured in this shader — the
        // CA offset, the grain cell — is a number of real pixels, and on a 2x
        // display CSS units would silently double both of them.
        gradePass.uniforms.fxTexel.value.set(1 / Math.max(1, sz.x), 1 / Math.max(1, sz.y));
        gradePass.uniforms.fxGrainPx.value = Math.max(1, Math.round(renderer.getPixelRatio()));
      }
    } catch (e) { /* a resize must never be able to kill the loop */ }
  }

  /* ---- focus -------------------------------------------------------------- */
  /*
   * focusOn(point) — main.js feeds this dissect.js's raycast contact, so the
   * sharp plane sits on whatever the instrument is touching. Pass null to release
   * it and let focus drift back to the specimen.
   *
   * Two deliberate behaviours. The DEADZONE exists because the contact point sits
   * on a surface that softbody.js is re-writing every frame for breathing — the
   * raw distance jitters by a millimetre or two at 60Hz and a focus that chases
   * it hunts visibly. The DAMPING is a real focus pull, ~150ms, because an
   * instant snap looks like a bug and a slow rack looks like a camera.
   */
  function focusOn(point) {
    let d;
    if (point && typeof point.x === 'number') {
      focusScratch.set(point.x, point.y, point.z);
      d = camera.position.distanceTo(focusScratch);
    } else {
      d = camera.position.distanceTo(restPoint);
    }
    if (!isFinite(d) || d <= 0) return;
    if (Math.abs(d - focusTarget) > 0.03) focusTarget = d;
  }

  /* ---- frame -------------------------------------------------------------- */
  function render(dt) {
    // main.js's tick() already has dt in milliseconds. Anything under 1 would be
    // >1000fps, so a small number can only mean somebody passed seconds.
    let ms = typeof dt === 'number' && isFinite(dt) && dt > 0 ? dt : 16.7;
    if (ms < 1) ms *= 1000;
    ms = Math.min(ms, 100);
    clock = (clock + ms * 0.001) % 1.0;   // wrapped: an ever-growing float loses
                                          // its low bits and the grain freezes

    if (gradePass) gradePass.uniforms.fxTime.value = clock;

    // Focus pull. 1 - exp(-dt/tau) rather than a fixed lerp factor: a constant
    // alpha means the pull is twice as fast at 120fps as at 60, which is exactly
    // the sort of thing that feels fine on the machine it was tuned on.
    focusNow += (focusTarget - focusNow) * (1 - Math.exp(-ms / 150));
    if (dofPass && dofPass.uniforms && dofPass.uniforms.focus) dofPass.uniforms.focus.value = focusNow;

    // Camera-only shutter smear. Gated hard: when the camera is still — which is
    // most of a dissection — the pass switches off entirely and costs nothing.
    if (motionPass) {
      let mix = 0;
      if (enabled.motion && camPrimed) {
        const dp = camPos.distanceTo(camera.position);
        const dq = 1 - Math.abs(camQuat.dot(camera.quaternion));
        const m = dp * 2.2 + dq * 55;
        mix = 0.16 * (m <= 0.06 ? 0 : Math.min(1, (m - 0.06) / 0.84));
      }
      const want = mix > 0.004;
      /*
       * prevRT is only written by copyPass, and copyPass only runs when this
       * pass runs. So while the camera is still — which is most of a dissection
       * — prevRT holds whatever was on screen the last time the camera moved,
       * which can be seconds and a whole organ removal ago. Blending straight
       * into that on the first frame of the next move paints a ghost of the old
       * scene over the new one. It reads as a rendering fault, which is exactly
       * what this pass was written to avoid.
       *
       * So the first frame back is a PRIMING frame: the pass runs (which is what
       * refills prevRT) but contributes nothing. One wasted blit, once per camera
       * move, in exchange for never showing a stale frame.
       */
      motionPass.enabled = want;
      motionPass.uniforms.fxMix.value = (want && prevValid) ? mix : 0;
      prevValid = want;
    }
    camPos.copy(camera.position);
    camQuat.copy(camera.quaternion);
    camPrimed = true;

    /*
     * The chain is assembled at runtime out of parts fetched from a CDN, so a
     * pass can construct cleanly and still throw on its FIRST render — a missing
     * extension, an MRT the driver refuses. A throw here is thrown every frame,
     * which is a permanently black screen. So: strip back to quality 0, and if it
     * still throws, abandon post entirely and render the scene straight. A plain
     * frog beats no frog.
     */
    if (composer) {
      try {
        composer.render(ms * 0.001);
      } catch (e) {
        /*
         * GTAOPass, SSAOPass and BokehPass all render their G-buffer by setting
         * scene.overrideMaterial, rendering, then setting it back to null —
         * with NOTHING in between to survive a throw. If one of them dies
         * mid-pass the scene is left permanently overridden with a depth or
         * normal material, and every frame after that, including the plain
         * renderer.render() fallback below, draws a flat white or rainbow frog.
         * The fallback path is the one place that must not inherit the damage.
         */
        scene.overrideMaterial = null;
        prevValid = false;
        if (quality > 0) {
          console.warn('postfx: a pass threw during render; stripping to quality 0', e);
          setQuality(0);
          try { composer.render(ms * 0.001); } catch (e2) { scene.overrideMaterial = null; composer = null; }
        } else { console.warn('postfx: post-processing abandoned', e); composer = null; }
        if (!composer) {
          renderer.setRenderTarget(null);   // a pass may have died mid-target
          renderer.render(scene, camera);
        }
      }
    } else renderer.render(scene, camera);

    /* ---- watchdog -------------------------------------------------------- */
    // The first second is shader compilation and render-target allocation, and it
    // is always slow. Degrading on those frames would knock every machine down a
    // tier for a stall that was never going to repeat.
    if (typeof document !== 'undefined' && document.hidden) return;
    if (warmup < 70) { warmup++; return; }
    frameAvg += (ms - frameAvg) * 0.06;
    if (frameAvg > 26 && quality > 0) {
      if (++overBudget > 90) {
        overBudget = 0; degraded = true;
        console.warn('postfx: frame budget missed (' + frameAvg.toFixed(1) + 'ms); dropping a tier');
        setQuality(quality - 1);
        // Re-arm the measurement. Without this the moving average still carries
        // the OLD tier's frame times, so the next demotion fires on inertia 90
        // frames later and a machine that would have been perfectly happy at
        // tier 1 free-falls to tier 0 before the new tier has been measured once.
        frameAvg = 16.7; warmup = 0;
      }
    } else overBudget = 0;
  }

  /* ---- controls ----------------------------------------------------------- */
  function setQuality(q) {
    quality = FX_clamp(q | 0, 0, 2);
    applyTier();
    return quality;
  }

  function setEnabled(name, on) {
    if (!(name in enabled)) return false;
    // `bare` is a hardware floor. A UI toggle must not be able to put a
    // fullscreen pass onto a software rasteriser.
    enabled[name] = bare ? false : !!on;
    syncPasses();
    return true;
  }

  function setBloom(s) { if (bloom) bloom.strength = s; }

  function setExposure(x) {
    exposure = FX_clamp(x, 0.2, 3);
    renderer.toneMappingExposure = exposure;
  }

  function settings() {
    return {
      quality, ready, degraded, exposure, bare,
      ao: aoKind, loaded: loaded.slice(), failed: failed.slice(),
      enabled: Object.assign({}, enabled),
      focus: focusNow, focusTarget,
      frameMs: Math.round(frameAvg * 10) / 10,
      ownComposer, borrowedComposer: !!borrowed,
    };
  }

  /*
   * dispose() — render targets here are full-screen and there are a lot of them
   * (AO alone owns beauty + depth + normal + blur), so leaking one costs tens of
   * megabytes. It also has to leave env.js's chain EXACTLY as it was handed over:
   * every pass we spliced in comes back out, and RenderPass gets its enabled flag
   * back, or the next composer.render() draws a black frame from an SSAO pass
   * that no longer exists.
   */
  function dispose() {
    // Set FIRST, and before any await can resume: init() checks this at every
    // resumption point, and the splice helpers check it too. Without it a
    // dispose() during the CDN fetch is followed, moments later, by init()
    // happily constructing a GTAOPass and a Bokeh pass into the torn-down
    // composer — which is the largest single leak this file can produce.
    disposed = true;
    try {
      if (composer && borrowed && !ownComposer) {
        inserted.forEach((p) => {
          if (composer.removePass) composer.removePass(p);
          else {
            const i = composer.passes.indexOf(p);
            if (i >= 0) composer.passes.splice(i, 1);
          }
        });
        if (renderPass) renderPass.enabled = renderPassWasEnabled;
      }
    } catch (e) { /* keep going: the frees below matter more */ }

    [aoPass, dofPass, gradePass, motionPass, copyPass].forEach((p) => {
      if (p && p.dispose) { try { p.dispose(); } catch (e) {} }
    });
    if (prevRT) { try { prevRT.dispose(); } catch (e) {} }
    if (ownComposer && composer && composer.dispose) { try { composer.dispose(); } catch (e) {} }
    // Our own chain's bloom AND output pass. UnrealBloomPass owns five pairs of
    // mip render targets and OutputPass owns a material and a fullscreen quad;
    // the original only freed the first of the two. Never touch these when the
    // composer was BORROWED — they are env.js's and env.js disposes them.
    if (ownComposer) {
      if (bloom && bloom.dispose) { try { bloom.dispose(); } catch (e) {} }
      if (outputPass && outputPass.dispose) { try { outputPass.dispose(); } catch (e) {} }
    }

    aoPass = dofPass = gradePass = motionPass = copyPass = prevRT = null;
    bloom = renderPass = outputPass = null;
    aoKind = null;
    prevValid = false;
    inserted.length = 0;
    renderer.toneMappingExposure = prevExposure;
    composer = null;
  }

  // Kick the async build off, but never let a rejection escape into an unhandled
  // promise — the frame loop is already running by then and must not care.
  init().catch((e) => { ready = true; console.warn('postfx: init failed; plain chain', e); });

  return {
    render, resize, setQuality, setEnabled, focusOn, settings, dispose,
    setBloom, setExposure,
    get quality() { return quality; },
    get ready() { return ready; },
  };
}
