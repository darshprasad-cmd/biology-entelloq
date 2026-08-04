/*
 * anatomy.js — specimens built to be dissected, which means built in LAYERS.
 *
 * Layer 0 skin · 1 muscle wall · 2 viscera · 3 deep (dorsal structures)
 * Anything enclosed starts invisible; dissect.js reveals it when the layer above
 * is opened. Relationships are the teaching content and are kept right: in a frog
 * the liver really does dominate the cavity and hide the stomach, the heart sits
 * anterior between the lungs, and the kidneys are dorsal and retroperitoneal.
 *
 * Geometry is procedural but deliberately not primitive-looking. Every organ is
 * a single Mesh (the raycaster in dissect.js picks non-recursively, so a part is
 * one pickable body; purely decorative detail hangs off it as non-picked
 * children). Silhouettes are hand-tuned: liver in pointed lobes, the small
 * intestine an actual coil, kidneys as flattened beans, lungs as translucent
 * sacs. Surfaces are perturbed with smooth (interpolated) value noise rather than
 * per-vertex hash, so tissue looks wet and lumpy instead of spiky and faceted.
 *
 * WET-TISSUE UPGRADE (the biggest realism lever). Every material now flows through
 * a `tissue` model in mat(): a MeshPhysicalMaterial with clearcoat (the wet
 * glisten), subsurface transmission + attenuation (light passing THROUGH thin
 * tissue and glowing red inside thick tissue), and a shared set of procedural
 * canvas normal/roughness maps that give each tissue class its own micro-relief
 * (liver granular capsule, myocardial striations, glossy gut serosa, pebbled
 * skin, waxy fat). The maps are generated ONCE per tissue class and reused across
 * every organ — a handful of small (256²) textures, not one per mesh. Call sites
 * that never pass `tissue` still look good: the type is inferred from colour and
 * translucency hints, so frog.js and heart.js lift for free.
 *
 * Tissue classes: parenchyma · muscle · hollow · serous · valve · fat · vessel · skin.
 *
 * INVARIANTS this file must never break (main.js / dissect.js / shell.js rely on
 * them): the exact SPECIMENS shape; buildSpecimen(THREE,id) -> {group, parts};
 * every part {id,name,note,mesh,layer,system,cuttable,detachable,incision?} with
 * mesh.userData.partId set and layer>0 meshes visible=false; the part IDs the
 * guided objectives resolve against; a BLACK base emissive on every material
 * (dissect.js drives emissive directly for hover, and resets it to 0x000000).
 */

/* ---- smooth value noise, for organic (non-spiky) irregularity ------------- */
function vhash(i, j, k) {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function smooth(t) { return t * t * (3 - 2 * t); }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = smooth(xf), v = smooth(yf), w = smooth(zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c000 = vhash(xi, yi, zi),     c100 = vhash(xi + 1, yi, zi);
  const c010 = vhash(xi, yi + 1, zi), c110 = vhash(xi + 1, yi + 1, zi);
  const c001 = vhash(xi, yi, zi + 1), c101 = vhash(xi + 1, yi, zi + 1);
  const c011 = vhash(xi, yi + 1, zi + 1), c111 = vhash(xi + 1, yi + 1, zi + 1);
  const x00 = l(c000, c100, u), x10 = l(c010, c110, u);
  const x01 = l(c001, c101, u), x11 = l(c011, c111, u);
  return l(l(x00, x10, v), l(x01, x11, v), w);       // 0..1, C1-continuous
}
function fbm(x, y, z) {
  return vnoise(x, y, z) * 0.62
       + vnoise(x * 2.1 + 11.3, y * 2.1 + 7.7, z * 2.1 + 3.1) * 0.28
       + vnoise(x * 4.4 + 23.1, y * 4.4 + 1.9, z * 4.4 + 17.3) * 0.10;
}

/* ---- tissue system: wet, subsurface, procedurally-detailed materials ------ */
/* Per-class defaults. mat() applies these, then any explicit opts win over them,
 * so the exact call sites in frog.js / heart.js keep the numbers they pass. */
const TIS_TISSUE = {
  // Dense glandular organ (liver, kidney, spleen): low transmission, but a deep
  // red attenuation so the thick body glows internally at its thin edges.
  parenchyma: { rough: 0.42, clear: 0.72, clearRough: 0.28, sheenColor: 0x9a4b45, sheenAmt: 0.55, sheenRough: 0.5,
    ior: 1.38, transmission: 0.12, thickness: 1.5, attenDist: 0.55, atten: 0x4a1210, normalScale: 0.55, map: 'granular' },
  // Cardiac / body-wall muscle: fibrous striations, slight translucency.
  muscle: { rough: 0.52, clear: 0.5, clearRough: 0.34, sheenColor: 0xd05a50, sheenAmt: 0.5, sheenRough: 0.55,
    ior: 1.37, transmission: 0.08, thickness: 1.7, attenDist: 0.7, atten: 0x5a1714, normalScale: 0.8, map: 'striated' },
  // Hollow viscus wall (stomach, gut): thin glossy serosa, moderate translucency.
  hollow: { rough: 0.44, clear: 0.6, clearRough: 0.28, sheenColor: 0xe8c8a8, sheenAmt: 0.5, sheenRough: 0.5,
    ior: 1.36, transmission: 0.5, thickness: 0.4, attenDist: 1.1, atten: 0x7a5236, normalScale: 0.5, map: 'serosa' },
  // Serous membrane / air-filled sac (lung, mesentery, pericardium): very thin,
  // highly translucent — light passes right through.
  serous: { rough: 0.32, clear: 0.45, clearRough: 0.28, sheenColor: 0xffb0a0, sheenAmt: 0.5, sheenRough: 0.5,
    ior: 1.35, transmission: 0.72, thickness: 0.28, attenDist: 1.5, atten: null, normalScale: 0.3, map: 'fine' },
  // Valve leaflet / semilunar cusp: thin, pale, satiny, translucent.
  valve: { rough: 0.36, clear: 0.55, clearRough: 0.26, sheenColor: 0xfff2e6, sheenAmt: 0.5, sheenRough: 0.5,
    ior: 1.37, transmission: 0.5, thickness: 0.3, attenDist: 1.4, atten: null, normalScale: 0.25, map: 'satin' },
  // Adipose (fat bodies, epicardial fat): soft waxy subsurface, warm.
  fat: { rough: 0.56, clear: 0.32, clearRough: 0.5, sheenColor: 0xffd77a, sheenAmt: 0.45, sheenRough: 0.6,
    ior: 1.44, transmission: 0.38, thickness: 0.7, attenDist: 0.9, atten: 0x6a4a1e, normalScale: 0.65, map: 'lobular' },
  // Great vessel wall (aorta, veins): elastic sheen, faint longitudinal grain.
  vessel: { rough: 0.46, clear: 0.5, clearRough: 0.38, sheenColor: 0xd85a48, sheenAmt: 0.5, sheenRough: 0.5,
    ior: 1.38, transmission: 0.2, thickness: 0.8, attenDist: 1.1, atten: 0x3a1420, normalScale: 0.5, map: 'elastic' },
  // Moist mottled integument (frog skin).
  skin: { rough: 0.5, clear: 0.55, clearRough: 0.4, sheenColor: 0xaec07a, sheenAmt: 0.6, sheenRough: 0.5,
    ior: 1.36, transmission: 0.12, thickness: 0.8, attenDist: 1.0, atten: null, normalScale: 0.75, map: 'pebbled' },
};

// Colour helpers. Inference thresholds are tuned in *sRGB* (the space the hex
// literals are authored in); THREE.Color.getHSL would instead report HSL in the
// linear working space under r160 colour management, which shifts pale pastels
// into high saturation and breaks the thresholds. So read the sRGB bytes directly.
function tisSRGB(THREE, color) {
  const hex = (typeof color === 'number') ? ((color >>> 0) & 0xffffff) : new THREE.Color(color).getHex();
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}
function tisHSL(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  let h = 0;
  if (d > 1e-6) {
    if (mx === r) h = (((g - b) / d) % 6 + 6) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l, c: d };                         // c = chroma (max-min)
}
function tisHue2rgb(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

// Infer a tissue class from colour + translucency hints, so call sites that never
// pass `tissue` still get a sensible wet-organ material. Deliberately coarse — the
// exact class barely matters versus the shared wet coat, but liver-ish darks land
// on parenchyma, orange lands on fat, greens on gut, blues on vessels, etc. A
// low-chroma test catches pale near-neutrals (bone, valve leaflets, tendon) that
// HSL saturation would wrongly flag as strongly coloured.
function tisInfer(THREE, color, o) {
  if (o.vcol) return 'skin';                       // the frog skin carries a vertex tint
  const [r, g, b] = tisSRGB(THREE, color);
  const { h, l, c } = tisHSL(r, g, b);
  const translucent = o.transmission != null || typeof o.trans === 'number';
  if (translucent && c < 0.5) return 'serous';     // lung / gall / bladder / mesentery
  if (c < 0.16) return 'valve';                    // pale near-neutral: leaflets, bone, tendon, linea
  if (h >= 0.05 && h <= 0.16 && c > 0.35) return 'fat';   // strong orange / yellow
  if (h > 0.18 && h < 0.47 && c > 0.1) return 'hollow';   // green
  if (h >= 0.5 && h <= 0.82) return 'vessel';      // blue / purple veins
  if (l < 0.32) return 'parenchyma';               // dark red-brown: liver, kidney, myocardium
  return 'muscle';                                 // mid reds / tans
}

function tisSpec(THREE, color, o) {
  const type = (o.tissue && TIS_TISSUE[o.tissue]) ? o.tissue : tisInfer(THREE, color, o);
  return TIS_TISSUE[type] || TIS_TISSUE.parenchyma;
}

// Gently pull candy colours toward fixed-specimen tones: slightly desaturate and
// deepen. Worked in sRGB (see tisSRGB) so the nudge is predictable. Skipped for
// vertex-coloured meshes (their tint lives in the geometry) and for near-neutral /
// pale colours (bone, valves). Toggle off with tone:false.
function tisTone(THREE, color, o) {
  if (o.vcol || o.tone === false) return new THREE.Color(color);
  const [r, g, b] = tisSRGB(THREE, color);
  const hsl = tisHSL(r, g, b);
  if (hsl.c < 0.12) return new THREE.Color(color); // leave neutrals (bone, cream) alone
  let s = hsl.s * 0.9;
  let l = hsl.l > 0.42 ? hsl.l * 0.95 : hsl.l;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const rr = tisHue2rgb(p, q, hsl.h + 1 / 3), gg = tisHue2rgb(p, q, hsl.h), bb = tisHue2rgb(p, q, hsl.h - 1 / 3);
  return new THREE.Color().setRGB(rr, gg, bb, THREE.SRGBColorSpace);
}

/* --- shared procedural micro-relief maps (generated once per class) --------- */
/* Seamless (tileable) value noise: lattice coordinates wrap modulo `period`, so
 * the left/top edge of the canvas meets the right/bottom without a visible seam
 * when the texture repeats over a sphere's wrapping UVs. */
function tisNoise(u, v, period, seed) {
  const fx = u * period, fy = v * period;
  const xi = Math.floor(fx), yi = Math.floor(fy);
  const sx = smooth(fx - xi), sy = smooth(fy - yi);
  const wr = (a) => ((a % period) + period) % period;
  const x0 = wr(xi), x1 = wr(xi + 1), y0 = wr(yi), y1 = wr(yi + 1);
  const c00 = vhash(x0, y0, seed), c10 = vhash(x1, y0, seed);
  const c01 = vhash(x0, y1, seed), c11 = vhash(x1, y1, seed);
  const a = c00 + (c10 - c00) * sx, b = c01 + (c11 - c01) * sx;
  return a + (b - a) * sy;                          // 0..1
}
function tisFbm(u, v, seed) {
  return tisNoise(u, v, 4, seed) * 0.55
       + tisNoise(u, v, 8, seed + 31) * 0.3
       + tisNoise(u, v, 16, seed + 63) * 0.15;
}

// Per-class height field + roughness recipe. `height` returns 0..1; `bump`
// scales the derived normal relief; rBase/rAmp shape the roughness (which only
// ever REDUCES material.roughness, carving in wet, glossy patches).
const TIS_MAP_CFG = {
  granular: { repeat: [2, 2], bump: 1.0, rBase: 0.9, rAmp: 0.38, rSeed: 12,
    height: (u, v) => tisFbm(u, v, 1) * 0.7 + tisNoise(u, v, 3, 7) * 0.3 },
  striated: { repeat: [3, 1.4], bump: 1.1, rBase: 0.88, rAmp: 0.3, rSeed: 13,
    height: (u, v) => (0.5 + 0.5 * Math.sin((v * 15 + tisNoise(u, v, 4, 3) * 1.6) * Math.PI * 2)) * 0.55
                    + tisFbm(u, v, 5) * 0.45 },
  serosa: { repeat: [2, 2], bump: 0.5, rBase: 0.68, rAmp: 0.42, rSeed: 14,
    height: (u, v) => tisNoise(u, v, 4, 2) * 0.5 + (0.5 + 0.5 * Math.sin(u * 5 * Math.PI * 2)) * 0.12 + 0.3 },
  fine: { repeat: [3, 3], bump: 0.35, rBase: 0.72, rAmp: 0.4, rSeed: 15,
    height: (u, v) => tisFbm(u, v, 9) * 0.6 + 0.2 },
  satin: { repeat: [2, 2], bump: 0.3, rBase: 0.7, rAmp: 0.34, rSeed: 16,
    height: (u, v) => tisNoise(u, v, 10, 4) * 0.28 + 0.4 },
  lobular: { repeat: [2, 2], bump: 0.95, rBase: 0.94, rAmp: 0.26, rSeed: 17,
    height: (u, v) => Math.pow(tisNoise(u, v, 5, 6), 1.5) * 0.62 + tisNoise(u, v, 10, 9) * 0.28 },
  elastic: { repeat: [2, 3], bump: 0.5, rBase: 0.82, rAmp: 0.3, rSeed: 18,
    height: (u, v) => (0.5 + 0.5 * Math.sin(u * 18 * Math.PI * 2)) * 0.12 + tisNoise(u, v, 6, 5) * 0.3 + 0.28 },
  pebbled: { repeat: [3, 3], bump: 1.1, rBase: 0.9, rAmp: 0.42, rSeed: 19,
    height: (u, v) => { const p = tisNoise(u, v, 6, 8); const wart = p > 0.6 ? (p - 0.6) * 2.5 : 0;
                        return tisFbm(u, v, 4) * 0.42 + wart * 0.5; } },
};

const tisMapCache = {};
// Build (and cache) the shared normal + roughness textures for one tissue map
// class. Returns null in a non-DOM (headless) context so the material simply
// carries no maps rather than throwing.
function tisMaps(THREE, key) {
  if (!key) return null;
  if (tisMapCache[key]) return tisMapCache[key];
  if (typeof document === 'undefined') { tisMapCache[key] = null; return null; }
  const cfg = TIS_MAP_CFG[key];
  if (!cfg) { tisMapCache[key] = null; return null; }

  const S = 256, N = S * S;
  const H = new Float32Array(N);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) H[y * S + x] = cfg.height((x + 0.5) / S, (y + 0.5) / S);
  }

  const normCanvas = document.createElement('canvas'); normCanvas.width = normCanvas.height = S;
  const roughCanvas = document.createElement('canvas'); roughCanvas.width = roughCanvas.height = S;
  const nctx = normCanvas.getContext('2d'), rctx = roughCanvas.getContext('2d');
  const nImg = nctx.createImageData(S, S), rImg = rctx.createImageData(S, S);
  const strength = cfg.bump * 2.2;
  const wp = (a) => (a + S) % S;                    // wrap for seamless gradients
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const hl = H[y * S + wp(x - 1)], hr = H[y * S + wp(x + 1)];
      const hu = H[wp(y - 1) * S + x], hd = H[wp(y + 1) * S + x];
      let nx = -(hr - hl) * strength, ny = -(hd - hu) * strength, nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz); nx *= inv; ny *= inv; nz *= inv;
      const o4 = i * 4;
      nImg.data[o4] = (nx * 0.5 + 0.5) * 255;
      nImg.data[o4 + 1] = (ny * 0.5 + 0.5) * 255;
      nImg.data[o4 + 2] = (nz * 0.5 + 0.5) * 255;
      nImg.data[o4 + 3] = 255;
      // roughness: base, carved down in the wet valleys of a second noise field
      const wet = tisNoise((x + 0.5) / S, (y + 0.5) / S, 6, cfg.rSeed);
      let r = cfg.rBase - wet * cfg.rAmp - H[i] * 0.12;
      r = Math.max(0.28, Math.min(1, r)) * 255;
      rImg.data[o4] = rImg.data[o4 + 1] = rImg.data[o4 + 2] = r;
      rImg.data[o4 + 3] = 255;
    }
  }
  nctx.putImageData(nImg, 0, 0);
  rctx.putImageData(rImg, 0, 0);

  const mk = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(cfg.repeat[0], cfg.repeat[1]);
    t.colorSpace = THREE.NoColorSpace;             // data, not colour
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  };
  const res = { normal: mk(normCanvas), rough: mk(roughCanvas) };
  tisMapCache[key] = res;
  return res;
}

/* Radially displace a (roughly unit-radius, origin-centred) geometry. Call this
 * BEFORE any non-uniform scale so the lumps get squashed with the organ. */
function displace(THREE, geo, amp, freq, seed = 0) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * freq + seed, v.y * freq + seed * 1.7, v.z * freq + seed * 0.3) - 0.5;
    const d = 1 + n * amp;
    p.setXYZ(i, v.x * d, v.y * d, v.z * d);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  // MUST recompute: Raycaster does a bounding-SPHERE rejection test before it
  // touches a triangle. Displacing vertices without this leaves the sphere at
  // its pre-displacement radius, and every ray is silently discarded.
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/* Finalise a geometry after the LAST vertex edit (scale/bend/deform). */
function seal(geo) {
  geo.attributes.position.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/* Circular bend of the z-axis in the z-x plane (neutral fibre at x=0). Used to
 * curl kidneys into beans and the stomach into a J. */
function bendZX(THREE, geo, k) {
  if (!k) return geo;
  const R = 1 / k;
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = v.z * k, rr = R - v.x;
    p.setXYZ(i, R - rr * Math.cos(a), v.y, rr * Math.sin(a));
  }
  return geo;
}

/* ---- materials: wet, subsurface tissue ------------------------------------ */
function mat(THREE, color, o = {}) {
  const spec = tisSpec(THREE, color, o);
  const m = new THREE.MeshPhysicalMaterial({
    color: tisTone(THREE, color, o),
    roughness: o.rough != null ? o.rough : spec.rough,
    metalness: 0,
    clearcoat: o.clear != null ? o.clear : spec.clear,
    clearcoatRoughness: o.clearRough != null ? o.clearRough : spec.clearRough,
    sheen: o.sheenAmt != null ? o.sheenAmt : spec.sheenAmt,
    sheenRoughness: o.sheenRough != null ? o.sheenRough : spec.sheenRough,
    sheenColor: new THREE.Color(o.sheen || spec.sheenColor),
    transparent: !!o.trans,
    opacity: o.opacity != null ? o.opacity : 1,
    side: o.side || THREE.FrontSide,
    flatShading: !!o.flat,
    vertexColors: !!o.vcol,
  });
  // Physically-based translucency: light passing THROUGH thin tissue (lung,
  // mesentery, valve, gall) and glowing inside thick tissue (liver, myocardium).
  // Explicit transmission wins; a numeric `trans` (the old translucency hint used
  // by lungs/gall/bladder) is honoured as a transmission amount; otherwise the
  // tissue-class default applies. Works off the framebuffer — no env map needed.
  const tm = o.transmission != null ? o.transmission
           : (typeof o.trans === 'number' ? o.trans : spec.transmission);
  if (tm) {
    m.transmission = tm;
    m.thickness = o.thickness != null ? o.thickness : spec.thickness;
    m.ior = o.ior != null ? o.ior : spec.ior;
    m.attenuationColor = new THREE.Color(o.atten || spec.atten || color);
    m.attenuationDistance = o.attenDist != null ? o.attenDist : spec.attenDist;
  } else if (o.ior != null) {
    m.ior = o.ior;
  }
  if (o.specular != null) m.specularIntensity = o.specular;
  // Procedural micro-relief. Shared per tissue class (never one canvas per organ),
  // so highlights break up and surfaces carry capsule/striation/serosa/pebble
  // detail. Skipped for flat-shaded meshes and when explicitly opted out (noTex).
  if (!o.flat && !o.noTex) {
    const maps = tisMaps(THREE, spec.map);
    if (maps) {
      m.roughnessMap = maps.rough;
      m.normalMap = maps.normal;
      m.normalScale = new THREE.Vector2(spec.normalScale, spec.normalScale);
      if (m.clearcoat > 0) m.clearcoatRoughnessMap = maps.rough;
    }
  }
  // emissive stays black: dissect.js owns it for hover highlighting.
  return m;
}

/* ---- primitive organ bodies ----------------------------------------------- */
// A noise-lumped ellipsoid. The workhorse for beads, sacs and glands.
function organ(THREE, color, rx, ry, rz, o = {}) {
  const g = new THREE.SphereGeometry(1, o.seg || 36, o.seg2 || 26);
  displace(THREE, g, o.amp != null ? o.amp : 0.12, o.freq || 2.6, o.seed || 0);
  g.scale(rx, ry, rz);
  seal(g);
  return new THREE.Mesh(g, mat(THREE, color, o));
}

// A flattened, pointed lobe — a leaf profile in silhouette. Long axis is z, the
// free tip at +z; flattened along y so it reads as a hepatic lobe with an edge.
function lobe(THREE, color, len, wide, thick, o = {}) {
  const g = new THREE.SphereGeometry(1, o.seg || 36, o.seg2 || 28);
  displace(THREE, g, o.amp != null ? o.amp : 0.07, o.freq || 2.4, o.seed || 0);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // Clamp: displacement can push v.z just past +/-1, and a fractional power of
    // a negative sine would be NaN (which then poisons the bounding volumes).
    const t = Math.max(0, Math.min(1, (v.z + 1) / 2)); // 0 base(-z) .. 1 tip(+z)
    const belly = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.7); // 0 at both ends
    const base = 0.55 + 0.55 * (0.5 + 0.5 * Math.cos(t * Math.PI)); // fat base
    const r = belly * base;
    p.setXYZ(i, v.x * r, v.y * r, v.z);
  }
  g.scale(wide, thick, len);                        // thick << wide,len -> flat
  seal(g);
  return new THREE.Mesh(g, mat(THREE, color, o));
}

// A flattened, curled kidney bean with a medial hilar dent.
function bean(THREE, color, len, rad, thick, o = {}) {
  const g = new THREE.SphereGeometry(1, o.seg || 34, o.seg2 || 24);
  displace(THREE, g, o.amp != null ? o.amp : 0.05, o.freq || 2.6, o.seed || 0);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = Math.max(0, Math.min(1, (v.z + 1) / 2));
    const hilum = Math.exp(-Math.pow((t - 0.5) / 0.17, 2)); // dent at mid-length
    const x = v.x - hilum * 0.6 * Math.max(0, v.x);         // push +x side in
    p.setXYZ(i, x, v.y, v.z);
  }
  g.scale(rad, thick, len);
  bendZX(THREE, g, o.bend != null ? o.bend : 0.18);
  seal(g);
  return new THREE.Mesh(g, mat(THREE, color, o));
}

// A tapered, curved bag — fundus fat at -z, pylorus narrow at +z, bent into a J.
function bag(THREE, color, len, rad, o = {}) {
  const g = new THREE.SphereGeometry(1, o.seg || 34, o.seg2 || 24);
  displace(THREE, g, o.amp != null ? o.amp : 0.06, o.freq || 2.4, o.seed || 0);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = Math.max(0, Math.min(1, (v.z + 1) / 2));
    const r = 0.5 + 0.8 * Math.sin(t * Math.PI * 0.82 + 0.18) * (1 - t * 0.55);
    p.setXYZ(i, v.x * r, v.y * r, v.z);
  }
  g.scale(rad, rad * 0.86, len);
  bendZX(THREE, g, o.bend != null ? o.bend : 0.55);
  seal(g);
  return new THREE.Mesh(g, mat(THREE, color, o));
}

// An elongated, gently lobed translucent sac (a frog lung).
function sac(THREE, color, len, rad, o = {}) {
  const g = new THREE.SphereGeometry(1, o.seg || 34, o.seg2 || 26);
  displace(THREE, g, o.amp != null ? o.amp : 0.13, o.freq || 3.6, o.seed || 0);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = Math.max(0, Math.min(1, (v.z + 1) / 2));
    const taper = Math.sin(t * Math.PI * 0.9 + 0.1);
    p.setXYZ(i, v.x * (0.4 + taper * 0.72), v.y * (0.4 + taper * 0.72), v.z);
  }
  g.scale(rad, rad, len);
  seal(g);
  return new THREE.Mesh(g, mat(THREE, color, o));
}

// Constant-radius tube along a Catmull-Rom path (intestines, coronaries, vein).
function tube(THREE, color, pts, r, o = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const g = new THREE.TubeGeometry(curve, o.seg || 44, r, o.rad || 10, false);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return new THREE.Mesh(g, mat(THREE, color, o));
}

// A curved tube that tapers from r0 at the start to r1 at the end (great vessels).
function vessel(THREE, color, pts, r0, r1, o = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const tub = o.seg || 40, rad = o.rad || 10;
  const g = new THREE.TubeGeometry(curve, tub, r0, rad, false);
  if (r1 != null && r1 !== r0) {
    const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const ring = Math.floor(i / (rad + 1));       // TubeGeometry is ring-major
      const t = tub ? ring / tub : 0;
      curve.getPoint(t, c);
      v.fromBufferAttribute(p, i);
      const s = (r0 + (r1 - r0) * t) / r0;
      v.sub(c).multiplyScalar(s).add(c);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    seal(g);
  } else {
    g.computeBoundingSphere();
    g.computeBoundingBox();
  }
  return new THREE.Mesh(g, mat(THREE, color, o));
}

function childMesh(parent, mesh, x, y, z, rx, ry, rz) {
  mesh.position.set(x, y, z);
  if (rx || ry || rz) mesh.rotation.set(rx || 0, ry || 0, rz || 0);
  parent.add(mesh);
  return mesh;
}

/* ========================================================================== */
export const SPECIMENS = {
  frog: {
    id: 'frog',
    name: 'Frog',
    blurb: 'The classic teaching dissection. Pin it out, open the body wall, and find every organ system in one cavity.',
    camera: { pos: [0, 13.5, 11.5], target: [0, 0, -0.4] },
    // The body wall slides away from the blade until the specimen is pinned out,
    // so the scalpel is gated on pinning. The heart has nothing to pin.
    requiresPinning: true,
  },
  heart: {
    id: 'heart',
    name: 'Mammalian heart',
    blurb: 'Trace the circulation. Open the left ventricle, meet the chordae tendineae, and test the valves.',
    camera: { pos: [0.4, 1.8, 15.5], target: [0, 0.7, 0] },
    requiresPinning: false,
  },
};

/* ========================================================================== */
// Registries new specimens self-register into (fish.js, earthworm.js, …). frog and
// heart stay hardcoded below so their verified builders are never touched; anything
// else looks itself up here. A builder module, at eval time, does:
//   SPECIMEN_BUILDERS.fish = buildFish;
//   SPECIMENS.fish = { id:'fish', name:'…', blurb:'…', camera:{…}, requiresPinning };
//   SPECIMEN_OBJECTIVES.fish = [ {id,text,hint,done}, … ];
// The shell's card list iterates SPECIMENS, so the card appears for free; its
// objective panel falls back to SPECIMEN_OBJECTIVES when a specimen is not in its
// own built-in OBJECTIVES table.
const SPECIMEN_BUILDERS = {};
const SPECIMEN_OBJECTIVES = {};

export function buildSpecimen(THREE, id) {
  if (SPECIMEN_BUILDERS[id]) return SPECIMEN_BUILDERS[id](THREE);
  return id === 'heart' ? buildHeart(THREE) : buildFrog(THREE);
}
