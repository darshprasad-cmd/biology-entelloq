/*
 * dust.js — ambient motes in the theatre air.
 *
 * The cold open's drifting dust, but living in the 3D scene: a sparse field of
 * tiny specks suspended in the volume between the table and the surgical lamp,
 * catching the light as they drift. It is the difference between "a specimen in a
 * void" and "a specimen in a room with air in it".
 *
 * Deliberately built to be SAFE WHEN UNSEEN. WebGL screenshots time out in this
 * project's tooling, so this effect ships without a human having looked at it — so
 * it is ADDITIVE only. Additive motes can add a faint glint of light and nothing
 * else; they can never render as dark dirt on the lens. The worst failure mode is
 * "too subtle to notice", never "ugly". Everything else — count, size, opacity —
 * is tuned conservatively for the same reason.
 *
 * Contract:
 *   createDust(THREE, scene, opts?) ->
 *     { update(dtMs), setVisible(on), setDensity(d), dispose() }
 */

export function createDust(THREE, scene, opts) {
  opts = opts || {};

  // The lit volume: a box sitting over the table, reaching up toward the lamp.
  // Biased AWAY from the camera's near space (it does not fill down to y=0 in a
  // thin sheet) so motes read as depth, not as smears across the lens.
  const BOX = opts.box || { x: 9.0, y0: 1.0, y1: 12.5, z: 7.0, zc: 0.5 };
  const FULL = Math.max(24, Math.min(320, opts.count || 150));

  const reduced =
    !!(typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ── a soft round sprite, drawn once. A hard square point reads as a pixel; a
  // gaussian dot reads as an out-of-focus speck catching the light.
  function sprite() {
    const s = 48;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rg.addColorStop(0.0, 'rgba(255,250,240,1)');
    rg.addColorStop(0.35, 'rgba(230,238,244,0.55)');
    rg.addColorStop(1.0, 'rgba(230,238,244,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const tex = sprite();
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(FULL * 3);
  // Per-mote drift velocity + a sway phase, kept in a plain array (not an
  // attribute — the GPU never needs them, only the CPU integrator does).
  const vel = new Float32Array(FULL * 3);
  const phase = new Float32Array(FULL);

  // Deterministic seeding — no Math.random (banned here, and a fixed field is
  // steadier anyway). A cheap integer hash scatters the motes and their speeds.
  function h(n, salt) {
    const x = Math.sin((n + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  for (let i = 0; i < FULL; i++) {
    pos[i * 3] = (h(i, 1) * 2 - 1) * BOX.x;
    pos[i * 3 + 1] = BOX.y0 + h(i, 2) * (BOX.y1 - BOX.y0);
    pos[i * 3 + 2] = BOX.zc + (h(i, 3) * 2 - 1) * BOX.z;
    // Mostly a slow upward thermal drift, with a tiny lateral wander.
    vel[i * 3] = (h(i, 4) * 2 - 1) * 0.06;
    vel[i * 3 + 1] = 0.10 + h(i, 5) * 0.16;
    vel[i * 3 + 2] = (h(i, 6) * 2 - 1) * 0.05;
    phase[i] = h(i, 7) * Math.PI * 2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.13,
    map: tex,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,          // never occlude the anatomy
    blending: THREE.AdditiveBlending,   // can only add light — safe unseen
    sizeAttenuation: true,
    color: 0xfff3e0,            // warm, as if lit by the theatre lamp
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;   // the box straddles the frustum edge; culling it whole flickers
  points.renderOrder = 3;         // after the opaque scene, with the other transparents
  // NOT a registered part and not in any pick list — dissect.js only raycasts the
  // parts array, so these can never intercept a cursor.
  points.userData.noPick = true;
  scene.add(points);

  let visible = true;
  let clock = 0;
  const attr = geo.attributes.position;

  function update(dtMs) {
    if (!visible) return;
    // Reduced motion: keep the motes present (atmosphere) but frozen.
    if (reduced) return;
    const dt = Math.min(0.05, dtMs / 1000);   // clamp: a long stall must not teleport them
    clock += dt;
    const arr = attr.array;
    for (let i = 0; i < FULL; i++) {
      const b = i * 3;
      // Lateral sway is a slow sine so the rise looks like drifting, not raining.
      arr[b] += (vel[b] + Math.sin(clock * 0.5 + phase[i]) * 0.03) * dt;
      arr[b + 1] += vel[b + 1] * dt;
      arr[b + 2] += (vel[b + 2] + Math.cos(clock * 0.4 + phase[i]) * 0.03) * dt;
      // Recycle: a mote that rises past the lamp re-enters at the bottom, kept in
      // the box on x/z so the field never thins out or wanders off.
      if (arr[b + 1] > BOX.y1) {
        arr[b + 1] = BOX.y0;
        arr[b] = (h(i + clock | 0, 1) * 2 - 1) * BOX.x;
        arr[b + 2] = BOX.zc + (h(i + clock | 0, 3) * 2 - 1) * BOX.z;
      }
    }
    attr.needsUpdate = true;
    // No bounding-sphere recompute needed — these are never raycast (noPick), and
    // frustumCulled is off, so a stale sphere costs nothing here.
  }

  function setVisible(on) {
    visible = !!on;
    points.visible = visible;
  }

  // 0 hides, 1 is full. Scales how many motes draw by moving the tail off-screen
  // is overkill; simplest honest lever is opacity + visibility for the low end.
  function setDensity(d) {
    const k = Math.max(0, Math.min(1.5, d));
    if (k <= 0.001) { setVisible(false); return; }
    setVisible(true);
    mat.opacity = 0.5 * Math.min(1, k);
  }

  function dispose() {
    scene.remove(points);
    geo.dispose();
    mat.dispose();
    tex.dispose();
  }

  return { update, setVisible, setDensity, dispose };
}
