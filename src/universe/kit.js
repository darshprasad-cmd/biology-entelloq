/*
 * kit.js — the shared toolkit every scale is built from.
 *
 * There are no imports here: the modules are CONCATENATED into one ES-module by
 * assemble.py, and `THREE` is imported once at the top of that bundle, so every
 * file below can reference `THREE` directly. Keeping the toolkit in one place is
 * what lets thirteen very different scenes — a galaxy, a beating heart, a carbon
 * atom — still feel like one product: they draw from the same palette, the same
 * easings, the same procedural texture factory.
 *
 * PERFORMANCE CONTRACT. Everything expensive (sprite textures, gradient canvases,
 * shared geometries) is generated ONCE and cached on `KIT._cache`. update() paths
 * in the stages must never allocate. We target a steady 60fps on a laptop GPU, so
 * particle counts are bounded and materials are cheap (no transmission, no SSR).
 */

const KIT = (function () {
  // ── palette — the Biology Entelloq language (emerald life, cyan signal,
  //    indigo intelligence, amber energy, rose danger). Kept as both hex and
  //    THREE.Color so shaders and CSS can share one source of truth.
  const HEX = {
    bg: 0x04070a, em: 0x34d399, em2: 0x10b981, cy: 0x38e0d8, cy2: 0x22d3ee,
    indigo: 0x7c8cf8, violet: 0x8b5cf6, amber: 0xf6c667, rose: 0xfb7185,
    ink: 0xeaf2f5, dim: 0x9fb2bc, gold: 0xffd9a8, blood: 0xc0392b,
  };
  const COL = {};
  for (const k in HEX) COL[k] = new THREE.Color(HEX[k]);

  const TAU = Math.PI * 2;

  // ── math -------------------------------------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const smootherstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
  // Frame-rate-independent exponential approach ("damp"): move `cur` toward `to`
  // covering the same fraction per real second regardless of fps. The backbone of
  // every smooth motion in this app — the zoom, the camera, the UI fades.
  const damp = (cur, to, lambda, dt) => lerp(cur, to, 1 - Math.exp(-lambda * dt));
  // Deterministic hash noise — no allocations, good enough for placement jitter.
  const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  const hash3 = (x, y, z) => hash(x * 12.9898 + y * 78.233 + z * 37.719);

  // ── procedural sprite textures (cached) ------------------------------------
  const _cache = {};
  function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }

  // A soft radial dot — the universal building block for stars, particles, ATP,
  // electrons, pollen. One texture, tinted per-use via the material color.
  function glowSprite() {
    if (_cache.glow) return _cache.glow;
    const s = 128, c = canvas(s), x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,.85)');
    g.addColorStop(0.55, 'rgba(255,255,255,.25)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (_cache.glow = t);
  }

  // A crisp ring (halos, orbits, membranes seen edge-on).
  function ringSprite() {
    if (_cache.ring) return _cache.ring;
    const s = 128, c = canvas(s), x = c.getContext('2d');
    x.strokeStyle = 'rgba(255,255,255,1)'; x.lineWidth = 6;
    x.beginPath(); x.arc(s / 2, s / 2, s / 2 - 8, 0, TAU); x.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (_cache.ring = t);
  }

  // Fractional-Brownian value-noise texture — clouds, tissue mottle, nebula,
  // membrane grain. Seeded so a given (size,seed,octaves) is generated once.
  function noiseTex(size, seed, octaves, tint) {
    const key = 'n' + size + '_' + seed + '_' + (octaves || 4) + '_' + (tint || '');
    if (_cache[key]) return _cache[key];
    const c = canvas(size), x = c.getContext('2d');
    const img = x.createImageData(size, size), d = img.data;
    const oc = octaves || 4;
    const col = tint ? new THREE.Color(tint) : null;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      let amp = 0.5, freq = 1 / 16, sum = 0, norm = 0;
      for (let o = 0; o < oc; o++) {
        const xi = Math.floor(i * freq), yi = Math.floor(j * freq);
        const fx = i * freq - xi, fy = j * freq - yi;
        const a = hash3(xi + seed, yi, o), b = hash3(xi + 1 + seed, yi, o);
        const cc = hash3(xi + seed, yi + 1, o), dd = hash3(xi + 1 + seed, yi + 1, o);
        const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
        sum += amp * (lerp(lerp(a, b, u), lerp(cc, dd, u), v));
        norm += amp; amp *= 0.5; freq *= 2;
      }
      const n = sum / norm, k = (j * size + i) * 4;
      if (col) { d[k] = col.r * 255 * n; d[k + 1] = col.g * 255 * n; d[k + 2] = col.b * 255 * n; d[k + 3] = 255; }
      else { d[k] = d[k + 1] = d[k + 2] = n * 255; d[k + 3] = 255; }
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return (_cache[key] = t);
  }

  // ── material helpers -------------------------------------------------------
  // Every stage fades as the relay passes it. To fade a whole scene cleanly we
  // remember each material's intended opacity as `userData.baseOpacity` at build
  // time, then multiply by the stage's fade in setGroupFade(). Use these makers so
  // every material is fade-aware and disposal-tracked.
  function track(mat) { if (mat.userData.baseOpacity == null) mat.userData.baseOpacity = mat.opacity != null ? mat.opacity : 1; return mat; }

  function emissive(colorHex, opts) {
    opts = opts || {};
    return track(new THREE.MeshStandardMaterial({
      color: colorHex, emissive: colorHex,
      emissiveIntensity: opts.glow != null ? opts.glow : 0.6,
      roughness: opts.rough != null ? opts.rough : 0.55, metalness: 0,
      transparent: true, opacity: opts.opacity != null ? opts.opacity : 1,
    }));
  }
  function surface(colorHex, opts) {
    opts = opts || {};
    return track(new THREE.MeshStandardMaterial({
      color: colorHex, roughness: opts.rough != null ? opts.rough : 0.7,
      metalness: opts.metal != null ? opts.metal : 0.0,
      emissive: opts.emissive != null ? opts.emissive : 0x000000,
      emissiveIntensity: opts.glow != null ? opts.glow : 0,
      transparent: true, opacity: opts.opacity != null ? opts.opacity : 1,
      side: opts.side || THREE.FrontSide, flatShading: !!opts.flat,
    }));
  }
  function glassy(colorHex, opts) {
    opts = opts || {};
    return track(new THREE.MeshStandardMaterial({
      color: colorHex, roughness: 0.18, metalness: 0.0,
      transparent: true, opacity: opts.opacity != null ? opts.opacity : 0.28,
      emissive: colorHex, emissiveIntensity: opts.glow != null ? opts.glow : 0.12,
      side: THREE.DoubleSide, depthWrite: false,
    }));
  }
  function additive(colorHex, opacity) {
    return track(new THREE.MeshBasicMaterial({
      color: colorHex, transparent: true, opacity: opacity != null ? opacity : 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
  }
  // Sprite-based point cloud (stars, particles). `data` = Float32 xyz array.
  function points(positions, colorHex, size, opts) {
    opts = opts || {};
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const m = track(new THREE.PointsMaterial({
      size: size, map: glowSprite(), color: colorHex, transparent: true,
      opacity: opts.opacity != null ? opts.opacity : 0.9,
      blending: opts.blend === false ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false, sizeAttenuation: opts.attenuate !== false,
    }));
    return new THREE.Points(g, m);
  }

  // ── organic realism ────────────────────────────────────────────────────────
  // Living things are never perfect spheres and never matte. These two helpers do
  // most of the work of making a procedural model stop looking like programmer art:
  // `displace` breaks the mathematical symmetry of a primitive, and `wet` gives it
  // the layered, slightly translucent, faintly glossy surface real tissue has.

  /**
   * Push every vertex along its own normal by layered value-noise, so a sphere
   * becomes a lumpy organic body. Recomputes normals so lighting follows the new
   * shape. `amp` is in world units; `freq` sets how fine the lumps are.
   */
  function displace(geo, amp, freq, seed) {
    const p = geo.attributes.position, n = geo.attributes.normal;
    if (!p || !n) return geo;
    const s = seed || 0, f = freq || 2.2;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      // two octaves: broad lobes + finer surface texture
      const a = hash3(x * f + s, y * f, z * f) - 0.5;
      const b = (hash3(x * f * 2.7 + s, y * f * 2.7, z * f * 2.7) - 0.5) * 0.45;
      const d = (a + b) * amp;
      p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * A wet biological surface. MeshPhysical gives us a clearcoat — the thin specular
   * film that reads as "moist" and is the single biggest cue that something is
   * living tissue rather than plastic — plus a procedural bump so the surface has
   * grain under raking light.
   */
  function wet(colorHex, opts) {
    opts = opts || {};
    const m = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: opts.rough != null ? opts.rough : 0.52,
      metalness: 0,
      clearcoat: opts.clear != null ? opts.clear : 0.65,
      clearcoatRoughness: opts.clearRough != null ? opts.clearRough : 0.32,
      sheen: opts.sheen != null ? opts.sheen : 0.35,
      sheenColor: new THREE.Color(opts.sheenColor || 0xff9c86),
      emissive: opts.emissive != null ? opts.emissive : colorHex,
      emissiveIntensity: opts.glow != null ? opts.glow : 0.12,
      transparent: true,
      opacity: opts.opacity != null ? opts.opacity : 1,
      side: opts.side || THREE.FrontSide,
    });
    const bump = noiseTex(256, opts.seed || 5, 5);
    m.bumpMap = bump; m.bumpScale = opts.bump != null ? opts.bump : 0.015;
    m.roughnessMap = bump;
    if (opts.translucent) { m.transmission = opts.translucent; m.thickness = opts.thickness || 0.5; m.ior = 1.38; }
    return track(m);
  }

  /**
   * A tiny procedural studio environment. PBR materials look flat with no
   * reflections to sample; a soft bright-above/dark-below equirect gives every
   * wet surface a believable highlight roll-off for almost no cost.
   */
  function studioEnv(renderer) {
    if (_cache.env) return _cache.env;
    const c = canvas(128), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.00, '#dff2ff');   // cool sky
    g.addColorStop(0.42, '#7f96a8');
    g.addColorStop(0.55, '#33414d');
    g.addColorStop(1.00, '#080c11');   // dark floor
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    // a warm key blob so highlights have somewhere to come from
    const k = x.createRadialGradient(38, 26, 2, 38, 26, 44);
    k.addColorStop(0, 'rgba(255,244,224,.95)'); k.addColorStop(1, 'rgba(255,244,224,0)');
    x.fillStyle = k; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    try {
      const pm = new THREE.PMREMGenerator(renderer);
      _cache.env = pm.fromEquirectangular(t).texture;
      pm.dispose();
    } catch (e) { _cache.env = t; }
    return _cache.env;
  }

  // Set a whole stage's fade [0..1]. Multiplies every tracked material's base
  // opacity; also scales PointsMaterial. Skips when fully hidden for free frames.
  function setGroupFade(root, fade) {
    root.traverse((o) => {
      const m = o.material; if (!m) return;
      const mats = Array.isArray(m) ? m : [m];
      for (const mm of mats) { const b = mm.userData.baseOpacity != null ? mm.userData.baseOpacity : 1; mm.opacity = b * fade; }
    });
  }

  // Depth-dispose a subtree's geometries and materials (stage teardown).
  function dispose(root) {
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material; if (!m) return;
      (Array.isArray(m) ? m : [m]).forEach((mm) => { if (mm.map && mm.map.isTexture && !mm.map.userData.shared) {} mm.dispose(); });
    });
  }

  // Small helpers for building geometry quickly and consistently.
  function sphere(r, seg, mat) { return new THREE.Mesh(new THREE.SphereGeometry(r, seg || 32, (seg || 32) / 2 | 0 || 16), mat); }
  function mesh(geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); if (x != null) m.position.set(x, y || 0, z || 0); return m; }
  function group(x, y, z) { const g = new THREE.Group(); if (x != null) g.position.set(x, y || 0, z || 0); return g; }

  // Fibonacci-sphere point distribution — even scatter on a sphere (electrons,
  // surface receptors, dots on a globe). Returns Float32 xyz.
  function fibSphere(n, r) {
    const out = new Float32Array(n * 3), phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = phi * i;
      out[i * 3] = Math.cos(th) * rad * r; out[i * 3 + 1] = y * r; out[i * 3 + 2] = Math.sin(th) * rad * r;
    }
    return out;
  }

  return {
    HEX, COL, TAU, clamp, lerp, smoothstep, smootherstep, damp, hash, hash3,
    glowSprite, ringSprite, noiseTex, emissive, surface, glassy, additive, points,
    setGroupFade, dispose, sphere, mesh, group, fibSphere, track,
    displace, wet, studioEnv,
    _cache,
  };
})();
