/*
 * zoomverse.js — the seamless scale journey: organ → tissue → cell → DNA → atom.
 *
 * The "Powers of Ten" moment. Point at a structure, press I, and the view dives
 * continuously down ten orders of magnitude — from the millimetre scale of a tissue
 * section, through a single cell and its nucleus, to the DNA double helix, to a
 * single carbon atom — with a live physical-scale readout counting down beside you.
 *
 * How the SEAMLESS transition works (this is the whole trick):
 *   One master value `t` in [0,1] drives everything. Every stage sits centred at the
 *   world origin and owns a band of `t`. As `t` crosses a stage's centre the stage is
 *   at readable size (scale 1); as you keep zooming IN past it, that stage scales UP
 *   and fades OUT (it blows past the camera), while the NEXT stage — which was tiny —
 *   scales up from the centre and sharpens. Two neighbours always overlap, so there
 *   is never a cut: the next scale literally emerges from the middle of the current
 *   one, the way a nucleus sits inside its cell. The camera never moves; the scaling
 *   is the flight. No clipping, no load screens.
 *
 * Self-contained: its own THREE.Scene + camera + lights, rendered with the shared
 * renderer while open (main.js renders it instead of the specimen). Its only
 * top-level name is the factory `createZoomverse`; every helper is inside it.
 *
 * Contract:
 *   createZoomverse(THREE, renderer) ->
 *     { open(spec), close(), isOpen(), setZoom(t), zoomBy(dt), update(dtMs),
 *       render(dtMs), resize(w,h), onClose(cb), dispose() }
 *   spec = { name, system, tissue, partId }  (context for the cell archetype/colour)
 */

export function createZoomverse(THREE, renderer) {
  if (!THREE || !renderer) return null;

  /* ---- the dedicated scene ------------------------------------------------ */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04070a);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0, 0, 6.2);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(3, 4, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.8); fill.position.set(-5, -2, 3); scene.add(fill);
  const rim = new THREE.PointLight(0x38e0d8, 0.9, 40); rim.position.set(0, 0, -6); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x223344, 0.9));

  const owned = [];                       // everything to dispose
  const track = (x) => { owned.push(x); return x; };

  /* ---- the physical scale of each stage (metres), for the readout --------- */
  // Real biology: tissue field ~1 mm, an animal cell ~15 µm, its nucleus ~5 µm,
  // the DNA helix ~2.5 nm wide, a carbon atom ~0.15 nm. Logged so the counter
  // sweeps smoothly through the intermediate values as you scroll.
  const STAGE_SCALE_M = [1e-3, 1.5e-5, 5e-6, 2.5e-9, 1.5e-10];

  /* ==========================================================================
   *  STAGE BUILDERS — each returns a THREE.Group centred at the origin, sized so
   *  it comfortably fills the view at scale 1. Materials are transparent and carry
   *  userData.baseOpacity so the fade multiplies their intended opacity.
   * ======================================================================== */

  const _tmpC = new THREE.Color();
  function tint(hex, dl) {
    _tmpC.setHex(hex); const h = {}; _tmpC.getHSL(h);
    const l = Math.max(0, Math.min(1, h.l + (dl || 0)));
    return _tmpC.setHSL(h.h, h.s, l).getHex();
  }

  function stageMat(color, o) {
    o = o || {};
    const m = track(new THREE.MeshStandardMaterial({
      color, roughness: o.rough != null ? o.rough : 0.55, metalness: o.metal || 0,
      transparent: true, opacity: o.opacity != null ? o.opacity : 1,
      emissive: new THREE.Color(o.emissive || 0x000000), emissiveIntensity: o.emissiveIntensity || 0,
      side: o.side || THREE.FrontSide, depthWrite: o.depthWrite != null ? o.depthWrite : true,
    }));
    m.userData.baseOpacity = m.opacity;
    return m;
  }

  // Deterministic pseudo-random (no Math.random at build — a fixed field is stable
  // and reproducible). Cheap hash on an integer seed.
  function rnd(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

  /* -- TISSUE: a packed field of cells (H&E palette) ------------------------- */
  function buildTissue(spec) {
    const g = new THREE.Group();
    const cyto = 0xdb9fc0;   // eosin pink cytoplasm
    const nuc = 0x5b2f7a;    // haematoxylin purple nuclei
    // A jostled grid of rounded polygonal cells, each with a nucleus.
    const N = 46;
    for (let i = 0; i < N; i++) {
      const ang = i * 2.399963;                    // golden-angle spiral packing
      const rad = 0.24 * Math.sqrt(i);
      const cx = Math.cos(ang) * rad, cy = Math.sin(ang) * rad;
      const s = 0.16 + rnd(i) * 0.05;
      const cell = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1),
        stageMat(tint(cyto, (rnd(i + 9) - 0.5) * 0.08), { rough: 0.65, opacity: 0.96 }));
      cell.geometry = track(cell.geometry);
      cell.position.set(cx, cy, (rnd(i + 3) - 0.5) * 0.18);
      cell.scale.set(1, 0.9 + rnd(i + 1) * 0.3, 0.7);
      const n = new THREE.Mesh(new THREE.SphereGeometry(s * 0.42, 12, 10),
        stageMat(nuc, { rough: 0.5, opacity: 1, emissive: 0x1a0a2a, emissiveIntensity: 0.3 }));
      n.geometry = track(n.geometry);
      n.position.set((rnd(i + 5) - 0.5) * s * 0.5, (rnd(i + 7) - 0.5) * s * 0.5, s * 0.4);
      cell.add(n);
      g.add(cell);
    }
    g.userData.spin = 0.05;
    return g;
  }

  /* -- CELL: one animal cell with organelles -------------------------------- */
  function buildCell(spec) {
    const g = new THREE.Group();
    // membrane (translucent), cytoplasm implied by the fill
    const mem = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 3),
      stageMat(0xdcb6c8, { rough: 0.35, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    mem.geometry = track(mem.geometry);
    g.add(mem);
    // nucleus with a nucleolus
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 22),
      stageMat(0x7a4a94, { rough: 0.45, opacity: 0.9, emissive: 0x2a1440, emissiveIntensity: 0.35 }));
    nuc.geometry = track(nuc.geometry);
    nuc.position.set(-0.2, 0.15, 0);
    const nucleolus = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12),
      stageMat(0x5a2c78, { rough: 0.5, opacity: 1 }));
    nucleolus.geometry = track(nucleolus.geometry);
    nucleolus.position.set(0.15, -0.1, 0.1); nuc.add(nucleolus);
    g.add(nuc);
    // mitochondria — bean shapes with a hint of cristae colour
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + 0.4;
      const mito = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 4, 8),
        stageMat(0xc76b4a, { rough: 0.5, opacity: 0.95, emissive: 0x3a1608, emissiveIntensity: 0.25 }));
      mito.geometry = track(mito.geometry);
      const rr = 1.05 + rnd(i) * 0.35;
      mito.position.set(Math.cos(a) * rr, Math.sin(a) * rr * 0.85, (rnd(i + 2) - 0.5) * 0.9);
      mito.rotation.set(rnd(i) * 3, rnd(i + 1) * 3, rnd(i + 2) * 3);
      g.add(mito);
    }
    // endoplasmic reticulum — a couple of wavy translucent sheets near the nucleus
    for (let s = 0; s < 2; s++) {
      const pts = [];
      for (let k = 0; k <= 20; k++) {
        const u = k / 20;
        pts.push(new THREE.Vector3(-0.9 + u * 1.8, Math.sin(u * 9 + s * 2) * 0.28 + (s ? 0.5 : -0.5), Math.cos(u * 7) * 0.2));
      }
      const er = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.04, 6, false),
        stageMat(0xd8a06a, { rough: 0.5, opacity: 0.8 }));
      er.geometry = track(er.geometry);
      g.add(er);
    }
    // ribosomes — a scatter of tiny dots
    for (let i = 0; i < 60; i++) {
      const rib = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), stageMat(0x8899aa, { rough: 0.6, opacity: 0.9 }));
      rib.geometry = track(rib.geometry);
      rib.position.set((rnd(i) - 0.5) * 2.6, (rnd(i + 30) - 0.5) * 2.6, (rnd(i + 60) - 0.5) * 2.2);
      g.add(rib);
    }
    g.userData.spin = 0.08;
    return g;
  }

  /* -- NUCLEUS: the nuclear envelope full of condensed chromosomes ---------- */
  function buildNucleus(spec) {
    const g = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(1.7, 32, 24),
      stageMat(0x6a4088, { rough: 0.4, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    env.geometry = track(env.geometry);
    g.add(env);
    // a handful of X-shaped condensed chromosomes
    const chromColors = [0xe86b8a, 0x6bb0e8, 0x8ae86b, 0xe8c86b, 0xc86be8];
    for (let i = 0; i < 8; i++) {
      const chrom = new THREE.Group();
      const col = chromColors[i % chromColors.length];
      for (let arm = 0; arm < 4; arm++) {
        const rodGeo = track(new THREE.CapsuleGeometry(0.09, 0.55, 4, 8));
        const rod = new THREE.Mesh(rodGeo, stageMat(col, { rough: 0.5, opacity: 0.95, emissive: col, emissiveIntensity: 0.12 }));
        rod.position.set(0, (arm < 2 ? 0.32 : -0.32), 0);
        rod.rotation.z = (arm % 2 ? 0.4 : -0.4) * (arm < 2 ? 1 : -1);
        chrom.add(rod);
      }
      const a = i / 8 * Math.PI * 2;
      const rr = 0.55 + rnd(i) * 0.6;
      chrom.position.set(Math.cos(a) * rr, Math.sin(a) * rr, (rnd(i + 4) - 0.5) * 1.0);
      chrom.rotation.set(rnd(i) * 3, rnd(i + 1) * 3, rnd(i + 2) * 3);
      chrom.scale.setScalar(0.8 + rnd(i + 8) * 0.4);
      g.add(chrom);
    }
    g.userData.spin = 0.1;
    return g;
  }

  /* -- DNA: the B-form double helix, base pairs coloured -------------------- */
  function buildDNA(spec) {
    const g = new THREE.Group();
    const TURNS = 3.2, RISE = 3.6, RADIUS = 0.62, STEPS = 220;
    const strandA = [], strandB = [];
    for (let i = 0; i <= STEPS; i++) {
      const u = i / STEPS;
      const ang = u * Math.PI * 2 * TURNS;
      const y = (u - 0.5) * RISE;
      strandA.push(new THREE.Vector3(Math.cos(ang) * RADIUS, y, Math.sin(ang) * RADIUS));
      strandB.push(new THREE.Vector3(Math.cos(ang + Math.PI) * RADIUS, y, Math.sin(ang + Math.PI) * RADIUS));
    }
    const backMat = stageMat(0x9fb8d8, { rough: 0.3, metal: 0.1, opacity: 1, emissive: 0x1a2740, emissiveIntensity: 0.2 });
    [strandA, strandB].forEach((s) => {
      const geo = track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s), STEPS, 0.09, 8, false));
      g.add(new THREE.Mesh(geo, backMat));
    });
    // base-pair rungs — 10.5 bp per turn is real B-DNA; colour by base pair
    const pairCols = [[0xff5b6e, 0x5bb0ff], [0x6bff8a, 0xffd15b]]; // A-T (red-blue), G-C (green-yellow)
    const nBases = Math.round(TURNS * 10.5);
    for (let i = 0; i < nBases; i++) {
      const u = (i + 0.5) / nBases;
      const idx = Math.round(u * STEPS);
      const a = strandA[idx], b = strandB[idx];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const dir = b.clone().sub(a);
      const len = dir.length();
      const pc = pairCols[i % 2];
      for (let h = 0; h < 2; h++) {
        const half = track(new THREE.CylinderGeometry(0.05, 0.05, len * 0.48, 6));
        const m = new THREE.Mesh(half, stageMat(pc[h], { rough: 0.4, opacity: 0.98, emissive: pc[h], emissiveIntensity: 0.18 }));
        m.position.copy(mid).addScaledVector(dir.clone().normalize(), (h ? 1 : -1) * len * 0.25);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        g.add(m);
      }
    }
    g.rotation.z = 0.12;
    g.userData.spin = 0.35;               // the helix turns as you watch
    g.userData.spinAxis = 'y';
    return g;
  }

  /* -- ATOM: a single carbon atom, nucleus + electron shells ---------------- */
  function buildAtom(spec) {
    const g = new THREE.Group();
    // nucleus: 6 protons (red) + 6 neutrons (blue) clustered
    const nucleus = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const isP = i < 6;
      const nm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12),
        stageMat(isP ? 0xe0503a : 0x4a78c0, { rough: 0.35, opacity: 1, emissive: isP ? 0x3a0e06 : 0x0a1a3a, emissiveIntensity: 0.35 }));
      nm.geometry = track(nm.geometry);
      const a = i / 12 * Math.PI * 2, r = 0.14 + (i % 3) * 0.05;
      nm.position.set(Math.cos(a) * r, Math.sin(a) * r, (rnd(i) - 0.5) * 0.28);
      nucleus.add(nm);
    }
    g.add(nucleus);
    g.userData.nucleus = nucleus;
    // two electron shells (K:2, L:4) as faint rings + orbiting electron dots
    const shells = [{ r: 1.1, n: 2 }, { r: 1.9, n: 4 }];
    const electrons = [];
    shells.forEach((sh, si) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(sh.r, 0.006, 6, 80),
        stageMat(0x38e0d8, { rough: 0.4, opacity: 0.28, emissive: 0x0a3a38, emissiveIntensity: 0.5 }));
      ring.geometry = track(ring.geometry);
      ring.rotation.x = Math.PI / 2 + si * 0.5;
      ring.rotation.z = si * 0.7;
      g.add(ring);
      for (let e = 0; e < sh.n; e++) {
        const el = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10),
          stageMat(0x7ef9f2, { rough: 0.2, opacity: 1, emissive: 0x38e0d8, emissiveIntensity: 0.9 }));
        el.geometry = track(el.geometry);
        g.add(el);
        electrons.push({ mesh: el, r: sh.r, tilt: ring.rotation, phase: e / sh.n * Math.PI * 2, speed: 1.6 - si * 0.6, si });
      }
    });
    g.userData.electrons = electrons;
    g.userData.spin = 0;                  // electrons animate instead of a bulk spin
    return g;
  }

  /* ==========================================================================
   *  build the stack
   * ======================================================================== */
  const STAGES = [];
  const CENTERS = [0.08, 0.30, 0.52, 0.74, 0.94];   // where each stage is "the focus" in t
  const BAND = 0.27;                                 // how wide a stage's visible window is
  const NAMES = ['Tissue', 'Cell', 'Nucleus', 'DNA', 'Atom'];
  const CAPTIONS = [
    'A section through the tissue — cells packed in their matrix, nuclei stained dark.',
    'A single cell: the nucleus, mitochondria that power it, and the endoplasmic reticulum.',
    'Inside the nucleus — condensed chromosomes, each a tightly wound package of DNA.',
    'The DNA double helix. The rungs are base pairs; their order is the genetic code.',
    'A single carbon atom: six protons and six neutrons, wrapped in two electron shells.',
  ];
  let built = false;

  function buildAll(spec) {
    if (built) return;
    built = true;
    const builders = [buildTissue, buildCell, buildNucleus, buildDNA, buildAtom];
    builders.forEach((b, i) => {
      const grp = b(spec || {});
      grp.visible = false;
      // cache the meshes + their base opacities for the fade
      const meshes = [];
      grp.traverse((o) => { if (o.isMesh && o.material) meshes.push(o); });
      grp.userData.meshes = meshes;
      scene.add(grp);
      STAGES.push({ group: grp, center: CENTERS[i], name: NAMES[i], caption: CAPTIONS[i] });
    });
  }

  /* ---- DOM overlay: HUD (scale readout, name, caption, hint, close) ------- */
  const el = document.createElement('div');
  el.id = 'zoomverse';
  el.innerHTML =
    '<div class="zv-vig"></div>'
    + '<div class="zv-top"><span class="zv-kick">Scale journey</span>'
    + '<button class="zv-x" title="Close (Esc)">Esc &nbsp;✕</button></div>'
    + '<div class="zv-scalebar"><div class="zv-bar"></div><div class="zv-ticks"></div></div>'
    + '<div class="zv-read"><b class="zv-scale">1 mm</b><span class="zv-name">Tissue</span></div>'
    + '<div class="zv-cap">—</div>'
    + '<div class="zv-hint">Scroll or drag to dive ↓&nbsp;&nbsp; · &nbsp;&nbsp;Esc to surface</div>';
  const style = document.createElement('style');
  style.textContent = `
    #zoomverse{position:fixed;inset:0;z-index:118;display:none;pointer-events:auto;
      font-family:var(--sans,-apple-system,"Segoe UI",sans-serif);color:#dce8ea;cursor:ns-resize;
      opacity:0;transition:opacity .5s ease}
    #zoomverse.on{display:block}
    #zoomverse.vis{opacity:1}
    #zoomverse .zv-vig{position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(62% 62% at 50% 46%,transparent 40%,rgba(4,7,10,.5) 82%,rgba(4,7,10,.85) 100%)}
    #zoomverse .zv-top{position:absolute;left:24px;right:24px;top:22px;display:flex;
      justify-content:space-between;align-items:center;pointer-events:none}
    #zoomverse .zv-kick{font:600 9px/1 var(--mono,monospace);letter-spacing:.42em;
      text-transform:uppercase;color:#38e0d8}
    #zoomverse .zv-x{pointer-events:auto;cursor:pointer;font:600 10px/1 var(--mono,monospace);
      letter-spacing:.14em;color:#8fa3ad;background:rgba(8,13,18,.6);border:1px solid rgba(255,255,255,.12);
      border-radius:8px;padding:8px 11px;backdrop-filter:blur(12px);transition:.15s}
    #zoomverse .zv-x:hover{color:#e6f0f2;border-color:rgba(56,224,216,.5)}
    #zoomverse .zv-scalebar{position:absolute;left:50%;transform:translateX(-50%);bottom:118px;
      width:min(520px,64vw);height:3px;border-radius:2px;background:rgba(255,255,255,.1);overflow:visible}
    #zoomverse .zv-bar{position:absolute;left:0;top:0;height:100%;border-radius:2px;
      background:linear-gradient(90deg,#34d399,#38e0d8);box-shadow:0 0 14px rgba(56,224,216,.6);width:2%}
    #zoomverse .zv-read{position:absolute;left:0;right:0;bottom:150px;text-align:center;pointer-events:none}
    #zoomverse .zv-scale{display:block;font:300 40px/1 var(--sans);letter-spacing:.01em;
      color:#eaf6f7;text-shadow:0 0 40px rgba(56,224,216,.35)}
    #zoomverse .zv-name{display:block;margin-top:8px;font:600 10px/1 var(--mono,monospace);
      letter-spacing:.36em;text-transform:uppercase;color:#7fdad4}
    #zoomverse .zv-cap{position:absolute;left:50%;transform:translateX(-50%);bottom:74px;
      width:min(600px,80vw);text-align:center;font-size:13px;line-height:1.6;color:#aebfc6;pointer-events:none}
    #zoomverse .zv-hint{position:absolute;left:50%;transform:translateX(-50%);bottom:30px;
      font:500 11px/1 var(--mono,monospace);letter-spacing:.1em;color:#5c6d76;pointer-events:none}
  `;

  const $ = (s) => el.querySelector(s);
  let scaleEl, nameEl, capEl, barEl;

  /* ---- state -------------------------------------------------------------- */
  let opened = false, t = 0, tTarget = 0, closing = false;
  let onCloseCb = null;
  const _q = new THREE.Quaternion();

  function smooth(a, b, x) { if (x <= a) return 0; if (x >= b) return 1; const u = (x - a) / (b - a); return u * u * (3 - 2 * u); }

  // Physical-scale readout: interpolate log10(metres) across the stage centres so
  // the number sweeps continuously, then format with the right SI unit.
  function scaleLabel(tt) {
    const logs = STAGE_SCALE_M.map((m) => Math.log10(m));
    let lo = 0, hi = CENTERS.length - 1;
    for (let i = 0; i < CENTERS.length - 1; i++) { if (tt >= CENTERS[i] && tt <= CENTERS[i + 1]) { lo = i; hi = i + 1; break; } if (tt > CENTERS[CENTERS.length - 1]) { lo = hi = CENTERS.length - 1; } if (tt < CENTERS[0]) { lo = hi = 0; } }
    const span = (CENTERS[hi] - CENTERS[lo]) || 1;
    const u = lo === hi ? 0 : (tt - CENTERS[lo]) / span;
    const lg = logs[lo] + (logs[hi] - logs[lo]) * u;
    const m = Math.pow(10, lg);
    return fmtMetres(m);
  }
  function fmtMetres(m) {
    const units = [[1, 'm'], [1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm'], [1e-12, 'pm']];
    for (const [f, u] of units) {
      if (m >= f * 0.999) { const v = m / f; return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(0) : v.toFixed(1)) + ' ' + u; }
    }
    const v = m / 1e-12; return v.toFixed(1) + ' pm';
  }

  /* ---- input -------------------------------------------------------------- */
  function onWheel(e) { if (!opened) return; e.preventDefault(); tTarget = clamp01(tTarget + e.deltaY * 0.0011); }
  let dragY = null;
  function onDown(e) { if (!opened) return; dragY = e.clientY; }
  function onMove(e) { if (!opened || dragY == null) return; tTarget = clamp01(tTarget + (e.clientY - dragY) * 0.0016); dragY = e.clientY; }
  function onUp() { dragY = null; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---- lifecycle ---------------------------------------------------------- */
  let prevExposure = null;

  function open(spec) {
    if (opened) return;
    buildAll(spec);
    if (nameEl == null) {
      document.head.appendChild(style);
      document.body.appendChild(el);
      scaleEl = $('.zv-scale'); nameEl = $('.zv-name'); capEl = $('.zv-cap'); barEl = $('.zv-bar');
      $('.zv-x').addEventListener('click', close);
      el.addEventListener('wheel', onWheel, { passive: false });
      el.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }
    opened = true; closing = false;
    t = 0; tTarget = 0;
    prevExposure = renderer.toneMappingExposure;
    renderer.toneMappingExposure = 1.15;
    el.classList.add('on');
    // fade in next frame
    requestAnimationFrame(() => el.classList.add('vis'));
    applyStages(0);
  }

  function close() {
    if (!opened || closing) return;
    closing = true;
    el.classList.remove('vis');
    setTimeout(() => {
      opened = false; closing = false;
      el.classList.remove('on');
      if (prevExposure != null) renderer.toneMappingExposure = prevExposure;
      if (onCloseCb) { try { onCloseCb(); } catch (e) {} }
    }, 500);
  }

  function setZoom(v) { tTarget = clamp01(v); }
  function zoomBy(dv) { tTarget = clamp01(tTarget + dv); }

  /* ---- the seamless transition -------------------------------------------- */
  function applyStages(tt) {
    for (let i = 0; i < STAGES.length; i++) {
      const st = STAGES[i];
      const d = tt - st.center;              // <0 approaching, >0 blowing past
      const vis = Math.abs(d) < BAND;
      if (!vis) { if (st.group.visible) st.group.visible = false; continue; }
      st.group.visible = true;
      // opacity peaks at the centre, fades to the band edge
      const op = 1 - smooth(0, BAND, Math.abs(d));
      // scale grows as you zoom in past it (d>0) and is tiny as you approach (d<0):
      // pow(7, d/BAND) gives ~1/7 at the far edge, 1 at centre, ~7 at the near edge.
      const sc = Math.pow(7, d / BAND);
      st.group.scale.setScalar(sc);
      // the passing (bigger, d>0) stage renders in front of the emerging one
      st.group.renderOrder = Math.round(d * 100);
      const meshes = st.group.userData.meshes;
      for (let m = 0; m < meshes.length; m++) {
        const mat = meshes[m].material;
        mat.opacity = (mat.userData.baseOpacity != null ? mat.userData.baseOpacity : 1) * op;
      }
    }
    // HUD
    if (scaleEl) {
      scaleEl.textContent = scaleLabel(tt);
      // nearest stage names the panel + caption
      let near = 0, best = 9; for (let i = 0; i < STAGES.length; i++) { const dd = Math.abs(tt - STAGES[i].center); if (dd < best) { best = dd; near = i; } }
      nameEl.textContent = STAGES[near].name;
      capEl.textContent = STAGES[near].caption;
      barEl.style.width = (2 + tt * 98).toFixed(1) + '%';
    }
  }

  let clock = 0;
  function update(dtMs) {
    if (!opened) return;
    const dt = Math.min(0.05, (dtMs || 16) / 1000);
    clock += dt;
    // ease the zoom toward its target so scroll feels inertial, not steppy
    t += (tTarget - t) * Math.min(1, dt * 6);
    applyStages(t);
    // per-stage idle life: slow spin, electrons orbiting on the atom
    for (let i = 0; i < STAGES.length; i++) {
      const grp = STAGES[i].group; if (!grp.visible) continue;
      const spin = grp.userData.spin || 0;
      if (spin) {
        if (grp.userData.spinAxis === 'y') grp.rotation.y += dt * spin; else grp.rotation.z += dt * spin * 0.5, grp.rotation.y += dt * spin;
      }
      const electrons = grp.userData.electrons;
      if (electrons) {
        for (let e = 0; e < electrons.length; e++) {
          const el2 = electrons[e];
          const a = clock * el2.speed + el2.phase;
          // orbit in the ring's plane by rotating a base circle by the ring's tilt
          const x = Math.cos(a) * el2.r, z = Math.sin(a) * el2.r;
          el2.mesh.position.set(x, 0, z).applyEuler(el2.tilt);
        }
        const nuc = grp.userData.nucleus; if (nuc) nuc.rotation.y += dt * 0.6;
      }
    }
  }

  function render() {
    if (!opened) return;
    renderer.render(scene, camera);
  }

  function resize(w, h) {
    camera.aspect = (w || 1) / (h || 1);
    camera.updateProjectionMatrix();
  }

  function dispose() {
    close();
    owned.forEach((o) => { try { o.dispose && o.dispose(); } catch (e) {} });
    if (el.parentNode) el.parentNode.removeChild(el);
    if (style.parentNode) style.parentNode.removeChild(style);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }

  return {
    open, close, isOpen: () => opened, setZoom, zoomBy, update, render, resize,
    onClose: (cb) => { onCloseCb = cb; }, dispose,
    get zoom() { return t; },
    // Introspection for verification: the visible stages and their fade/scale at the
    // current zoom, so the seamless cross-dissolve can be confirmed, not assumed.
    stageStates() {
      return STAGES.map((st) => ({
        name: st.name, visible: st.group.visible,
        scale: +st.group.scale.x.toFixed(3),
        opacity: st.group.userData.meshes.length
          ? +(st.group.userData.meshes[0].material.opacity).toFixed(3) : 0,
      })).filter((s) => s.visible);
    },
  };
}
