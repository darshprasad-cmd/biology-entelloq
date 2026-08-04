/*
 * env.js — the operating theatre.
 *
 * The point of this file is PRESENCE. A generic HDRI rig makes a nice 3D model;
 * a theatre makes you feel you are standing over a specimen. The difference is
 * almost entirely in the light:
 *
 *   - one hard, warm, overhead surgical lamp that actually exists in the world
 *     (you can see the fixture) and casts a real shadow onto the table,
 *   - a cold, dim blue room around it, so shadows read clinical rather than grey,
 *   - a contact shadow hugging the specimen so it sits ON the table,
 *   - brushed steel underneath that catches a wet sheen.
 *
 * Warm key against cool ambient is the whole trick. Everything else recedes.
 *
 * Contract (main.js depends on it):
 *   setupEnvironment(THREE, deps, refs) -> { render, resize, setBloom, dispose }
 *   deps = { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } (any may be absent)
 *   refs = { scene, camera, renderer }
 * It MUST set scene.environment — the wet tissue materials use transmission and
 * need something to refract, or their subsurface goes dead.
 */

export function setupEnvironment(THREE, deps, refs) {
  const { scene, camera, renderer } = refs;
  deps = deps || {};

  const owned = [];
  const track = (x) => { owned.push(x); return x; };
  const added = [];
  const addTo = (o) => { scene.add(o); added.push(o); return o; };

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Real shadows do most of the grounding. ONE shadow-casting lamp only — a
  // second doubles the cost for almost no perceptual gain at this scale.
  let shadowsOn = true;
  try {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } catch (e) { shadowsOn = false; }

  const canvas2d = (w, h) => {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return { cv, ctx: cv.getContext('2d') };
  };
  const texFrom = (cv, srgb) => {
    const t = track(new THREE.CanvasTexture(cv));
    if (srgb && 'colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };

  /* ---- the room: a cold, almost-black shell ------------------------------ */
  const prevBackground = scene.background;
  const prevEnvironment = scene.environment;
  {
    const { cv, ctx } = canvas2d(512, 512);
    const g = ctx.createRadialGradient(256, 200, 0, 256, 200, 330);
    g.addColorStop(0.00, '#0b131b');
    g.addColorStop(0.45, '#070d14');
    g.addColorStop(0.78, '#04080d');
    g.addColorStop(1.00, '#020407');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
    scene.background = texFrom(cv, true);
  }

  /* ---- light rig --------------------------------------------------------- */
  // Cold room fill. Deliberately weak: it defines the dark, it does not light
  // the specimen.
  addTo(new THREE.HemisphereLight(0x33506b, 0x04070a, 0.42));
  const roomFill = addTo(new THREE.DirectionalLight(0x7fa8c8, 0.30));
  roomFill.position.set(-7, 5, -8);

  // THE surgical lamp. Warm-white, hard, from directly above and slightly front,
  // where a real theatre lamp hangs. This does nearly all the modelling.
  const lamp = addTo(new THREE.SpotLight(0xfff2e2, 210, 44, 0.40, 0.45, 1.7));
  lamp.position.set(0.6, 15.5, 4.2);
  lamp.target.position.set(0, 0, 0);
  addTo(lamp.target);
  if (shadowsOn) {
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.camera.near = 4;
    lamp.shadow.camera.far = 44;
    lamp.shadow.bias = -0.0018;
    lamp.shadow.normalBias = 0.022;
    lamp.shadow.radius = 3;
  }

  // A softer satellite head — real theatres run twin lamps to kill the shadow
  // the surgeon's own hands throw. No shadow map on this one.
  const lamp2 = addTo(new THREE.SpotLight(0xffe9d0, 42, 34, 0.46, 0.7, 1.7));
  lamp2.position.set(-6.5, 12.0, -3.0);
  lamp2.target.position.set(0, 0, 0);
  addTo(lamp2.target);

  // Dim cyan rim, to peel the specimen off the background.
  const rim = addTo(new THREE.DirectionalLight(0x38e0d8, 0.7));
  rim.position.set(-6, 3.5, -7);

  /* ---- the visible lamp fixture ------------------------------------------ */
  // Seeing the source of the light is a large part of believing the room.
  const fixture = new THREE.Group();
  fixture.add(new THREE.Mesh(
    track(new THREE.CylinderGeometry(2.5, 3.05, 0.5, 40)),
    track(new THREE.MeshStandardMaterial({ color: 0x11161b, roughness: 0.42, metalness: 0.85 }))));
  // The emitting face: unlit and bright, so bloom catches it.
  const face = new THREE.Mesh(
    track(new THREE.CircleGeometry(2.62, 40)),
    track(new THREE.MeshBasicMaterial({ color: 0xfff6ea, toneMapped: false })));
  face.rotation.x = Math.PI / 2;
  face.position.y = -0.27;
  fixture.add(face);
  // Concentric reflector rings — reads instantly as a surgical lamp head.
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.75 + i * 0.62, 0.055, 8, 36)),
      track(new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.3, metalness: 0.9 })));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.29;
    fixture.add(ring);
  }
  const stem = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.16, 0.16, 5.5, 12)),
    track(new THREE.MeshStandardMaterial({ color: 0x1a2026, roughness: 0.35, metalness: 0.9 })));
  stem.position.y = 2.9;
  fixture.add(stem);
  fixture.position.set(0.6, 15.5, 4.2);
  addTo(fixture);

  /* ---- the table --------------------------------------------------------- */
  const TABLE_Y = -1.7;

  // Brushed stainless: a fine horizontal grain in the roughness map is what makes
  // steel read as steel rather than grey plastic.
  const steelRough = (() => {
    const { cv, ctx } = canvas2d(256, 256);
    ctx.fillStyle = '#6a6a6a'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2400; i++) {
      const y = Math.random() * 256;
      const v = 90 + Math.random() * 90;
      ctx.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.30)';
      ctx.lineWidth = Math.random() * 1.5 + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256 - 40, y);
      ctx.lineTo(Math.random() * 256 + 40, y + (Math.random() - 0.5) * 1.5);
      ctx.stroke();
    }
    const t = texFrom(cv, false);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2.2, 2.2);
    return t;
  })();

  const table = new THREE.Mesh(
    track(new THREE.PlaneGeometry(70, 70)),
    track(new THREE.MeshPhysicalMaterial({
      color: 0x090d11, roughness: 0.55, metalness: 0.52,
      roughnessMap: steelRough,
      clearcoat: 0.22, clearcoatRoughness: 0.62,  // a faint wipe-down wet sheen
    })));
  table.rotation.x = -Math.PI / 2;
  table.position.y = TABLE_Y;
  if (shadowsOn) table.receiveShadow = true;
  table.renderOrder = -2;
  addTo(table);

  // The lamp's pool on the steel. Additive and restrained — the frog camera looks
  // almost straight down, so anything stronger becomes a wash across the frame.
  const poolMesh = new THREE.Mesh(
    track(new THREE.PlaneGeometry(26, 26)),
    track(new THREE.MeshBasicMaterial({
      map: (() => {
        const { cv, ctx } = canvas2d(256, 256);
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 122);
        g.addColorStop(0.00, 'rgba(255,244,228,0.15)');
        g.addColorStop(0.34, 'rgba(226,214,196,0.05)');
        g.addColorStop(1.00, 'rgba(200,200,200,0.0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
        return texFrom(cv, true);
      })(),
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false })));
  poolMesh.rotation.x = -Math.PI / 2;
  poolMesh.position.y = TABLE_Y + 0.02;
  poolMesh.renderOrder = -1;
  addTo(poolMesh);

  // Contact shadow: a darkening disc right under the specimen. It exists so the
  // specimen still reads as GROUNDED even when shadow maps are off on a weak GPU.
  // Grounding is what stops it looking like a floating model, so it must not
  // depend on a feature that might be disabled.
  const contactMesh = new THREE.Mesh(
    track(new THREE.PlaneGeometry(13, 13)),
    track(new THREE.MeshBasicMaterial({
      map: (() => {
        const { cv, ctx } = canvas2d(256, 256);
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 118);
        g.addColorStop(0.00, 'rgba(0,0,0,0.72)');
        g.addColorStop(0.42, 'rgba(0,0,0,0.34)');
        g.addColorStop(1.00, 'rgba(0,0,0,0.0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
        return texFrom(cv, false);
      })(),
      transparent: true, depthWrite: false, opacity: 0.85 })));
  contactMesh.rotation.x = -Math.PI / 2;
  contactMesh.position.y = TABLE_Y + 0.035;
  contactMesh.renderOrder = -1;
  addTo(contactMesh);

  /* ---- instrument tray, off to the side ---------------------------------- */
  const trayMat = track(new THREE.MeshPhysicalMaterial({
    color: 0x2c343b, roughness: 0.28, metalness: 0.92, clearcoat: 0.3 }));
  const tray = new THREE.Group();
  tray.add(new THREE.Mesh(track(new THREE.BoxGeometry(6.4, 0.16, 4.2)), trayMat));
  [[0, 2.02], [0, -2.02]].forEach(([x, z]) => {
    const w = new THREE.Mesh(track(new THREE.BoxGeometry(6.4, 0.5, 0.16)), trayMat);
    w.position.set(x, 0.2, z); tray.add(w);
  });
  [[3.12, 0], [-3.12, 0]].forEach(([x, z]) => {
    const w = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.5, 4.2)), trayMat);
    w.position.set(x, 0.2, z); tray.add(w);
  });
  const steel = track(new THREE.MeshStandardMaterial({
    color: 0xb8c2c9, roughness: 0.22, metalness: 0.96 }));
  for (let i = 0; i < 4; i++) {
    const inst = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.07, 2.4 + i * 0.25, 3, 8)), steel);
    inst.rotation.z = Math.PI / 2;
    inst.rotation.y = (i - 1.5) * 0.06;
    inst.position.set(0, 0.18, -1.35 + i * 0.9);
    tray.add(inst);
  }
  tray.position.set(9.6, TABLE_Y + 0.08, 5.6);
  tray.rotation.y = -0.34;
  if (shadowsOn) tray.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  addTo(tray);

  /* ---- studio environment for the wet materials -------------------------- */
  // MeshPhysicalMaterial transmission refracts scene.environment. Without this
  // the organs' subsurface goes dead, so it is guarded on its own.
  let envRT = null;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const { cv, ctx } = canvas2d(256, 128);
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.00, '#2a3a48');    // cool ceiling
    g.addColorStop(0.40, '#141c24');
    g.addColorStop(1.00, '#05080b');    // dark floor
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128);
    // A bright band where the lamp is, so speculars have a highlight to catch.
    const lg = ctx.createRadialGradient(128, 12, 0, 128, 12, 54);
    lg.addColorStop(0, 'rgba(255,246,232,1)');
    lg.addColorStop(1, 'rgba(255,246,232,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, 256, 60);
    const eqTex = new THREE.CanvasTexture(cv);
    eqTex.mapping = THREE.EquirectangularReflectionMapping;
    if ('colorSpace' in eqTex) eqTex.colorSpace = THREE.SRGBColorSpace;
    envRT = pmrem.fromEquirectangular(eqTex);
    scene.environment = envRT.texture;
    eqTex.dispose();
    pmrem.dispose();
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('env: PMREM unavailable', e);
  }

  /* ---- post ------------------------------------------------------------- */
  let composer = null, bloom = null;
  const EC = deps.EffectComposer, RP = deps.RenderPass;
  const UB = deps.UnrealBloomPass, OP = deps.OutputPass;
  if (EC && RP) {
    try {
      composer = new EC(renderer);
      composer.addPass(new RP(scene, camera));
      if (UB) {
        // High threshold: only the lamp face and wet speculars bloom. Lower and
        // the whole scene hazes over, which reads as cheap.
        bloom = new UB(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.62, 0.86);
        composer.addPass(bloom);
      }
      if (OP) composer.addPass(new OP());
    } catch (e) { composer = null; bloom = null; }
  }

  return {
    render() {
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    resize(w, h) {
      if (composer) composer.setSize(w, h);
      if (bloom && bloom.setSize) bloom.setSize(w, h);
    },
    setBloom(s) { if (bloom) bloom.strength = s; },
    // Exposed so postfx.js can splice its passes into the EXISTING chain (keeping
    // this bloom) rather than building a parallel composer and orphaning ours.
    // Undefined-safe: null when the addons failed to load, and postfx guards it.
    get composer() { return composer; },
    get bloom() { return bloom; },
    tableY: TABLE_Y,
    dispose() {
      added.forEach((o) => scene.remove(o));
      owned.forEach((o) => { try { o.dispose && o.dispose(); } catch (e) {} });
      scene.background = prevBackground || null;
      if (envRT) envRT.dispose();
      scene.environment = prevEnvironment || null;
      if (composer && composer.dispose) { try { composer.dispose(); } catch (e) {} }
    },
  };
}
