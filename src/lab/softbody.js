/*
 * softbody.js — organs that are soft, and a specimen that is alive.
 *
 * Two effects, both spring-damper on cached rest vertices. NOT a physics engine:
 * Ammo/Rapier soft bodies would cost more than the whole rest of the frame and
 * are hard to keep stable on a school laptop. A localised vertex spring gets you
 * ~90% of the perceived softness for ~2% of the cost, and it is controllable.
 *
 *   press(id, worldPoint, strength, radius) — tissue dents IN under the tool and
 *     springs back on release, so an instrument visibly compresses the organ.
 *   jiggle(id, strength) — a decaying wobble when something is grabbed, cut or
 *     dropped, so mass reads as mass.
 *   setLife(true) — the idle physiology that makes it feel ALIVE rather than a
 *     prop: lungs breathe, the heart pulses, the gut drifts. Kept deliberately
 *     tiny; it should whisper, not wobble like jelly.
 *
 * PERFORMANCE CONTRACT. Idle parts do zero work — a part is only touched while it
 * is pressed, ringing, or (with life on) breathing. Rest positions are cached
 * once. Nothing allocates in update(). The bounding sphere is refreshed while a
 * part is deforming, because dissect.js's raycaster does a bounding-sphere reject
 * first and a stale sphere silently makes an organ unpickable — but it is
 * throttled, since it is the expensive half.
 */

const SB_SOFT_SYSTEMS = ['digestive', 'respiratory', 'circulatory', 'urogenital', 'muscular', 'integument'];
const SB_RIGID_HINT = /vertebral|spine|column|pin|bone|cartilage/i;

// Which parts get idle physiology, and how. The breathe set MUST include every
// specimen's visible OUTER surface (skin, body-wall, exoskeleton, pericardium) —
// that is the only life you can see before the first cut, and a static outer wall
// is what makes a specimen read as a prop. Without body-wall/exoskeleton here the
// fish, earthworm and cockroach sat dead-still on load.
const SB_LIFE = {
  breathe: /lung|muscle.?wall|body.?wall|skin|pericardium|exoskeleton|terga|tegmen/i, // slow swell
  // Must catch the heart's actual part names: the pumping chambers are lv-free-wall
  // / rv-free-wall, which none of heart/ventricl/atrium matched — so the biggest
  // cardiac muscle was sitting dead. free-wall + septum fix that; both are
  // heart-specific ids here.
  beat: /heart|ventricl|atrium|auricle|myocard|free.?wall|interventric|septum/i, // rhythmic contraction
  drift: /intestine|stomach|liver|spleen|cloaca|crop|gizzard|fat.?body|midgut|hindgut/i, // barely-there settle
};

export function createSoftBody(THREE, parts) {
  const items = new Map();          // partId -> state

  // Scratch objects reused every frame — update() must not allocate.
  const _v = new THREE.Vector3();
  const _local = new THREE.Vector3();
  const _inv = new THREE.Matrix4();

  for (const p of parts) {
    if (!p || !p.mesh || !p.mesh.geometry) continue;
    if (SB_RIGID_HINT.test(p.id)) continue;
    if (p.system && !SB_SOFT_SYSTEMS.includes(p.system)) continue;
    const pos = p.mesh.geometry.attributes && p.mesh.geometry.attributes.position;
    if (!pos || pos.count > 9000) continue;   // skip anything pathologically dense

    items.set(p.id, {
      part: p,
      pos,
      rest: new Float32Array(pos.array),      // the shape everything springs back to
      // press
      dent: 0, dentTarget: 0, dentVel: 0,
      cx: 0, cy: 0, cz: 0, nx: 0, ny: 1, nz: 0, radius: 1,
      // jiggle
      ring: 0, ringPhase: 0,
      // life
      life: SB_LIFE.beat.test(p.id) ? 'beat'
          : SB_LIFE.breathe.test(p.id) ? 'breathe'
          : SB_LIFE.drift.test(p.id) ? 'drift' : null,
      lifePhase: Math.random() * Math.PI * 2,  // desync so organs don't pulse in lockstep
      dirty: false,
      boundsAt: 0,
    });
  }

  let lifeOn = false;
  let clock = 0;

  function press(partId, worldPoint, strength, radius) {
    const it = items.get(partId);
    if (!it || !worldPoint) return;
    // World -> the mesh's own space, because we displace raw vertex data.
    it.part.mesh.updateMatrixWorld();
    _inv.copy(it.part.mesh.matrixWorld).invert();
    _local.copy(worldPoint).applyMatrix4(_inv);
    it.cx = _local.x; it.cy = _local.y; it.cz = _local.z;
    // Push along the local direction from the mesh centre out to the contact —
    // a good stand-in for the surface normal without a normal lookup.
    const len = Math.hypot(it.cx, it.cy, it.cz) || 1;
    it.nx = it.cx / len; it.ny = it.cy / len; it.nz = it.cz / len;
    it.radius = radius || 0.9;
    it.dentTarget = Math.max(0, Math.min(1, strength == null ? 1 : strength));
  }

  function release(partId) {
    const it = items.get(partId);
    if (it) it.dentTarget = 0;
  }

  function jiggle(partId, strength) {
    const it = items.get(partId);
    if (!it) return;
    it.ring = Math.max(it.ring, Math.min(1, strength == null ? 0.5 : strength));
    it.ringPhase = 0;
  }

  function setLife(on) {
    lifeOn = !!on;
    if (!on) items.forEach((it) => { if (it.life) it.dirty = true; });  // settle to rest
  }

  function update(dtMs) {
    const dt = Math.min(0.05, (dtMs || 16) / 1000);   // clamp: a stall must not explode the spring
    clock += dt;

    items.forEach((it) => {
      // --- integrate the press spring (critically damped-ish) ---------------
      const k = 26, damp = 9;
      const a = (it.dentTarget - it.dent) * k - it.dentVel * damp;
      it.dentVel += a * dt;
      it.dent += it.dentVel * dt;
      if (Math.abs(it.dent) < 1e-4 && Math.abs(it.dentVel) < 1e-3) { it.dent = 0; it.dentVel = 0; }

      // --- decay the jiggle -------------------------------------------------
      if (it.ring > 0.0005) {
        it.ringPhase += dt * 15;              // ~2.4Hz wobble
        it.ring *= Math.exp(-dt * 3.4);       // settles in about a second
      } else it.ring = 0;

      // Only VISIBLE parts breathe/beat: there is no point animating an organ still
      // buried under three layers, and with every specimen's outer wall now breathing
      // that would be real wasted work each frame. A hidden organ settles to rest and
      // costs nothing; it comes alive the instant a cut exposes it.
      const living = lifeOn && it.life && it.part.mesh.visible;
      const active = it.dent !== 0 || it.dentVel !== 0 || it.ring > 0 || living;
      if (!active) {
        // Idle parts cost nothing. Write rest once if we were dirty.
        if (it.dirty) { it.pos.array.set(it.rest); it.pos.needsUpdate = true; it.dirty = false; refreshBounds(it, true); }
        return;
      }

      // --- life amplitude ----------------------------------------------------
      let lifeAmp = 0, lifeK = 0;
      if (living) {
        it.lifePhase += dt;
        if (it.life === 'breathe') {
          // ~0.24Hz swell, amplitude ~10% of the local vertex radius (≈4.5-5% of
          // body span) — a deep, pronounced breath, the strongest "this is alive"
          // signal without the body ballooning. Still a slow soft sine so it reads
          // as respiration; push much past this and it becomes a pulsing balloon.
          lifeAmp = 0.100 * (0.5 + 0.5 * Math.sin(it.lifePhase * 1.5));
          lifeK = 1;
        } else if (it.life === 'beat') {
          // A quick systolic squeeze with a long diastolic rest, not a sine. Raised
          // so the exposed heart's pulse reads clearly.
          const t = (it.lifePhase * 1.05) % 1;
          const squeeze = t < 0.18 ? Math.sin((t / 0.18) * Math.PI) : 0;
          lifeAmp = -0.044 * squeeze;                                          // contract inward
          lifeK = 1;
        } else {
          lifeAmp = 0.010 * Math.sin(it.lifePhase * 0.7);                      // gut drift, gentle
          lifeK = 1;
        }
      }

      // --- write vertices ----------------------------------------------------
      const arr = it.pos.array, rest = it.rest, n = it.pos.count;
      const dent = it.dent, r2 = it.radius * it.radius;
      const ringAmp = it.ring * 0.05;
      const rp = it.ringPhase;

      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const rx = rest[i3], ry = rest[i3 + 1], rz = rest[i3 + 2];
        let ox = 0, oy = 0, oz = 0;

        if (dent !== 0) {
          const dx = rx - it.cx, dy = ry - it.cy, dz = rz - it.cz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < r2) {
            // Smooth falloff from the contact point; deepest right under the tip.
            const f = 1 - d2 / r2;
            const w = f * f * dent * it.radius * 0.55;
            ox -= it.nx * w; oy -= it.ny * w; oz -= it.nz * w;
          }
        }
        if (ringAmp !== 0) {
          // A standing wobble keyed to position, so the whole body ripples.
          const s = Math.sin(rp + rx * 2.3 + ry * 1.7 + rz * 2.1);
          ox += rx * s * ringAmp; oy += ry * s * ringAmp; oz += rz * s * ringAmp;
        }
        if (lifeK !== 0) {
          ox += rx * lifeAmp; oy += ry * lifeAmp; oz += rz * lifeAmp;
        }

        arr[i3] = rx + ox; arr[i3 + 1] = ry + oy; arr[i3 + 2] = rz + oz;
      }

      it.pos.needsUpdate = true;
      it.dirty = true;
      const geo = it.part.mesh.geometry;
      geo.computeVertexNormals();
      refreshBounds(it, false);
    });
  }

  // Picking depends on this. Throttled to ~6Hz while deforming: the sphere only
  // has to be approximately right for the raycaster's reject test, and it is the
  // expensive half of the update.
  function refreshBounds(it, force) {
    const now = clock;
    if (!force && now - it.boundsAt < 0.16) return;
    it.boundsAt = now;
    const geo = it.part.mesh.geometry;
    geo.computeBoundingSphere();
    if (geo.boundingSphere) geo.boundingSphere.radius *= 1.06;   // slack for the dent
  }

  function dispose() {
    items.forEach((it) => {
      it.pos.array.set(it.rest);
      it.pos.needsUpdate = true;
      it.part.mesh.geometry.computeVertexNormals();
      it.part.mesh.geometry.computeBoundingSphere();
    });
    items.clear();
  }

  return { press, release, jiggle, setLife, update, dispose, get count() { return items.size; } };
}
