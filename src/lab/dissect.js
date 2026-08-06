/*
 * dissect.js — the dissection mechanics.
 *
 * Input-agnostic by construction: it receives {x, y, grip, gripping, span} and has
 * no idea whether a hand or a mouse produced them. That is what makes the mouse
 * path genuinely equal rather than a degraded fallback, and it is why hand
 * tracking can drop out mid-incision without losing the attempt.
 *
 * Depth NEVER comes from the input. The cursor is a 2D ray; the depth of an act
 * is the depth of whatever surface that ray hits. This is the 2.5D law and it is
 * the reason the interaction feels solid instead of mushy.
 */

const TOOLS = ['probe', 'scalpel', 'forceps', 'pins', 'retractor'];

export function createDissection(THREE, ctx) {
  const { scene, camera, group, parts, onEvent } = ctx;
  const byId = new Map(parts.map((p) => [p.id, p]));
  const meshes = parts.map((p) => p.mesh);

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const _nm = new THREE.Matrix3();
  const _contact = { point: new THREE.Vector3(), normal: new THREE.Vector3(0, 1, 0), partId: null };
  let contact = null;

  let tool = 'probe';
  let hovered = null;
  let grabbed = null;
  let wasGripping = false;

  const state = {
    pinned: new Set(),
    incisions: new Map(),   // partId -> {points:[Vector3], length, opened}
    opened: new Set(),      // partIds whose layer has been reflected
    removed: new Set(),
    damage: [],
    maxLayerRevealed: 0,
  };

  // Live stroke bookkeeping. Kept out of `state` because it is per-gesture, not
  // per-attempt, and mixing the two is how undo semantics get confusing later.
  let stroke = null;

  const emit = (kind, partId, text, meta) => onEvent && onEvent({ kind, partId, text, meta: meta || {} });

  /* ---- picking --------------------------------------------------------- */
  function pick(nx, ny) {
    ndc.x = nx * 2 - 1;
    ndc.y = -(ny * 2 - 1);
    // setFromCamera reads camera.matrixWorld. If a frame has not rendered since
    // the camera last moved (tab backgrounded, rAF throttled, a programmatic
    // camera move) that matrix is stale and every ray points the wrong way --
    // which looks exactly like "picking is broken". Cheap to make certain.
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    const candidates = meshes.filter((m) => {
      const id = m.userData.partId;
      // A reflected flap is still rendered (faded) but must no longer be
      // pickable, or it shields the layer it was just peeled off.
      return m.visible && !state.removed.has(id) && !state.opened.has(id);
    });
    const hits = ray.intersectObjects(candidates, false);
    return hits.length ? hits[0] : null;
  }

  function setEmissive(part, hex) {
    if (part && part.mesh.material.emissive) part.mesh.material.emissive.setHex(hex);
  }

  /* ---- revealing a layer ------------------------------------------------ */
  function revealLayer(n) {
    if (n <= state.maxLayerRevealed) return;
    state.maxLayerRevealed = n;
    let count = 0;
    parts.forEach((p) => {
      if (p.layer === n && !p.mesh.visible) { p.mesh.visible = true; count++; }
    });
    if (count) emit('discover', null, 'The layer beneath is exposed — ' + count + ' structures now visible.',
      { layer: n, count });
  }

  /* ---- pinning ---------------------------------------------------------- */
  const pinMarks = new THREE.Group();
  scene.add(pinMarks);
  function placePin(part, point) {
    if (state.pinned.has(part.id)) return;
    state.pinned.add(part.id);
    const g = new THREE.ConeGeometry(0.075, 0.55, 8);
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({
      color: 0xd8dde2, roughness: 0.25, metalness: 0.85 }));
    m.position.copy(point); m.position.y += 0.28;
    m.rotation.x = Math.PI;
    pinMarks.add(m);
    emit('pin', part.id, 'Pinned ' + part.name + '.', { pinned: state.pinned.size });
    if (state.pinned.size >= 4) {
      emit('discover', null, 'The specimen is pinned out and the body wall is under tension. You can cut now.',
        { ready: true });
    }
  }

  /* ---- incision --------------------------------------------------------- */
  function beginStroke(part, point, grip) {
    stroke = {
      partId: part.id,
      pts: [point.clone()],
      speeds: [],
      lastT: performance.now(),
      lastP: point.clone(),
      maxGrip: grip,
      firstGrip: grip,
      line: null,
    };
  }

  function growStroke(point, grip) {
    if (!stroke) return;
    const now = performance.now();
    const dt = Math.max(1, now - stroke.lastT);
    const d = point.distanceTo(stroke.lastP);
    if (d < 0.045) return;                       // ignore jitter
    stroke.speeds.push(d / dt * 16);
    stroke.pts.push(point.clone());
    stroke.lastP.copy(point);
    stroke.lastT = now;
    stroke.maxGrip = Math.max(stroke.maxGrip, grip);

    if (stroke.pts.length >= 2) {
      if (stroke.line) { scene.remove(stroke.line); stroke.line.geometry.dispose(); }
      const curve = new THREE.CatmullRomCurve3(stroke.pts);
      const g = new THREE.TubeGeometry(curve, Math.max(8, stroke.pts.length * 3), 0.045, 6, false);
      stroke.line = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x2a0d10 }));
      scene.add(stroke.line);
    }
  }

  function endStroke() {
    if (!stroke) return;
    const part = byId.get(stroke.partId);
    const pts = stroke.pts;
    if (!part || pts.length < 3) { discardStroke(); return; }

    let length = 0;
    for (let i = 1; i < pts.length; i++) length += pts[i].distanceTo(pts[i - 1]);

    // Two independently measured qualities, not one fudge factor.
    const mean = stroke.speeds.reduce((a, b) => a + b, 0) / (stroke.speeds.length || 1);
    const variance = stroke.speeds.reduce((a, b) => a + Math.abs(b - mean), 0) / (stroke.speeds.length || 1);
    const sawing = variance > 6.5 && stroke.speeds.length > 4;
    const plunged = stroke.firstGrip > 0.8;

    state.incisions.set(part.id, { points: pts, length, opened: false });

    if (sawing) {
      damage(part, 'sawn', part.name + ' was cut with a sawing stroke — the cut face is ragged.');
    }

    // A plunging first stroke goes through the layer into whatever is beneath it.
    if (plunged) {
      // Nearest cuttable structure the blade would actually reach: same layer
      // first (a vessel running within the wall), then the layer below.
      const cutMid = pts[Math.floor(pts.length / 2)];
      const reach = (p) => {
        const b = new THREE.Box3().setFromObject(p.mesh);
        return b.distanceToPoint(cutMid);
      };
      const sameLayer = parts.filter((p) => p.layer === part.layer && p.id !== part.id && p.cuttable);
      const below = parts.filter((p) => p.layer === part.layer + 1 && p.cuttable);
      const pool = sameLayer.length ? sameLayer : below;
      const victim = pool.length
        ? pool.reduce((best, p) => (reach(p) < reach(best) ? p : best))
        : null;
      if (victim) {
        damage(victim, 'perforated',
          'The blade went in too deep on the first stroke and caught the ' + victim.name + '.');
      }
    }

    if (length > 1.1) {
      emit('incise', part.id,
        'Incision made in ' + part.name + (sawing ? ' — but the stroke was uneven.' : '.'),
        { length: +length.toFixed(2), sawing, plunged });
      // Long enough to reflect: the part becomes peelable with forceps.
      part.mesh.userData.peelable = true;
    } else {
      emit('incise', part.id, 'A short nick in ' + part.name + ' — not long enough to open it.',
        { length: +length.toFixed(2) });
    }
    stroke = null;
  }

  function discardStroke() {
    if (stroke && stroke.line) { scene.remove(stroke.line); stroke.line.geometry.dispose(); }
    stroke = null;
  }

  /* ---- damage ----------------------------------------------------------- */
  function damage(part, kind, text) {
    if (state.damage.some((d) => d.partId === part.id && d.kind === kind)) return;
    state.damage.push({ partId: part.id, kind, text });
    part.mesh.material.color.setHex(0x6b4a44);
    if (part.mesh.material.emissive) part.mesh.material.emissive.setHex(0x1a0505);
    emit('damage', part.id, text, { kind, irreversible: true });
  }

  /* ---- peeling a flap --------------------------------------------------- */
  const peeling = new Map();   // partId -> {t, axis, pivot}
  function beginPeel(part) {
    if (peeling.has(part.id) || !part.mesh.userData.peelable) return false;
    const inc = state.incisions.get(part.id);
    if (!inc) return false;
    const a = inc.points[0], b = inc.points[inc.points.length - 1];
    const axis = new THREE.Vector3().subVectors(b, a).normalize();
    peeling.set(part.id, { t: 0, axis, pivot: a.clone(), target: 0 });
    return true;
  }
  function updatePeel(part, amount) {
    const st = peeling.get(part.id);
    if (!st) return;
    st.target = Math.max(0, Math.min(1, amount));
  }
  function stepPeels(dt) {
    peeling.forEach((st, pid) => {
      const part = byId.get(pid);
      if (!part) return;
      const k = Math.min(1, dt / 140);
      // Once the flap has been drawn far enough to count as reflected, drive it
      // fully open on its own — for a flat specimen viewed from above, a
      // half-lifted flap still hides the cavity, and the teaching payoff is
      // seeing the organs. So `opened` parts ease to a hard target of 1.
      const target = state.opened.has(pid) ? 1 : st.target;
      st.t += (target - st.t) * k;
      // Reflect the flap by folding it back about the incision axis (so it lifts
      // to the side rather than straight up) and fading it to near-transparent so
      // the layer beneath reads clearly. A true mesh split is a geometry-authoring
      // problem; for teaching, a convincing reveal is what matters.
      part.mesh.material.transparent = true;
      part.mesh.material.opacity = 1 - st.t * 0.9;      // -> 0.10 fully open
      part.mesh.material.depthWrite = st.t < 0.5;        // stop it occluding once faded
      part.mesh.position.y = st.t * 0.9;                 // lift clear of the cavity
      part.mesh.scale.setScalar(1 + st.t * 0.06);        // slight fold-back swell
      if (st.t > 0.5 && !state.opened.has(pid)) {
        state.opened.add(pid);
        emit('peel', pid, part.name + ' reflected. What is underneath is now exposed.', {});
        revealLayer(part.layer + 1);
      }
    });
  }

  /* ---- lifting an organ -------------------------------------------------- */
  let lift = null;
  function beginLift(part, point) {
    if (!part.detachable) return false;
    lift = {
      partId: part.id,
      home: part.mesh.position.clone(),
      grabOffset: new THREE.Vector3().subVectors(part.mesh.position, point),
    };
    return true;
  }
  function updateLift(nx, ny) {
    if (!lift) return;
    const part = byId.get(lift.partId);
    // Move in the camera plane through the organ's own depth: the ray gives
    // direction, the organ's existing distance gives the depth. Never hand-Z.
    ndc.x = nx * 2 - 1; ndc.y = -(ny * 2 - 1);
    ray.setFromCamera(ndc, camera);
    const dist = camera.position.distanceTo(lift.home);
    const p = new THREE.Vector3().copy(ray.ray.direction).multiplyScalar(dist).add(camera.position);
    part.mesh.position.copy(group.worldToLocal(p.clone()));
  }
  function endLift() {
    if (!lift) return;
    const part = byId.get(lift.partId);
    const moved = part.mesh.position.distanceTo(lift.home);
    if (moved > 2.6) {
      state.removed.add(part.id);
      part.mesh.position.set(4.6, lift.home.y, -1.2 + state.removed.size * 0.9);
      emit('lift', part.id, part.name + ' removed and set on the tray.', { removed: state.removed.size });
      revealLayer(part.layer + 1);
    } else {
      part.mesh.position.copy(lift.home);
      emit('replace', part.id, part.name + ' returned to the cavity.', {});
    }
    lift = null;
  }

  /* ---- frame ------------------------------------------------------------- */
  function update(input, dt) {
    const hit = pick(input.x, input.y);
    const part = hit ? byId.get(hit.object.userData.partId) : null;

    // Publish this frame's contact. instruments.js puts its working tip here and
    // softbody.js dents here, so the tool visibly meets the tissue it deforms.
    if (hit) {
      _contact.point.copy(hit.point);
      if (hit.face) {
        _contact.normal.copy(hit.face.normal)
          .applyNormalMatrix(_nm.getNormalMatrix(hit.object.matrixWorld)).normalize();
      } else _contact.normal.set(0, 1, 0);
      _contact.partId = part ? part.id : null;
      contact = _contact;
    } else contact = null;

    // hover
    if (part !== hovered) {
      if (hovered) setEmissive(hovered, 0x000000);
      hovered = part;
      if (hovered) {
        setEmissive(hovered, 0x0c3226);
        emit('hover', hovered.id, hovered.name, { note: hovered.note, system: hovered.system });
      } else {
        emit('hover', null, '', {});
      }
    }

    const down = input.gripping && !wasGripping;
    const up = !input.gripping && wasGripping;
    wasGripping = input.gripping;

    if (down && part && hit) {
      if (tool === 'pins') {
        placePin(part, hit.point);
      } else if (tool === 'scalpel') {
        if (ctx.requiresPinning && state.pinned.size < 4 && part.layer <= 1) {
          emit('incise', part.id,
            'The specimen is not pinned out — the wall slides away from the blade.', { refused: true });
        } else if (!part.cuttable) {
          emit('incise', part.id, part.name + ' will not take a blade.', { refused: true });
        } else {
          beginStroke(part, hit.point, input.grip);
        }
      } else if (tool === 'forceps') {
        if (part.mesh.userData.peelable && !state.opened.has(part.id)) {
          if (beginPeel(part)) grabbed = part.id;
        } else if (beginLift(part, hit.point)) {
          grabbed = part.id;
        }
      } else if (tool === 'probe') {
        emit('discover', part.id, part.note || part.name, { system: part.system });
      }
    }

    if (input.gripping) {
      if (stroke && hit) growStroke(hit.point, input.grip);
      if (grabbed && peeling.has(grabbed)) {
        // Drag distance from the incision drives how far the flap folds back.
        const st = peeling.get(grabbed);
        const p = byId.get(grabbed);
        if (hit) updatePeel(p, Math.min(1, hit.point.distanceTo(st.pivot) / 2.2));
      }
      if (lift) updateLift(input.x, input.y);
    }

    if (tool === 'retractor' && input.span > 0.18) {
      const open = Math.min(1, (input.span - 0.18) / 0.42);
      peeling.forEach((st) => { st.target = Math.max(st.target, open); });
      if (open > 0.5) emit('retract', null, 'Body wall retracted.', { open: +open.toFixed(2) });
    }

    if (up) {
      if (stroke) endStroke();
      if (lift) endLift();
      grabbed = null;
    }

    stepPeels(dt);
  }

  function setTool(t) { if (TOOLS.includes(t)) tool = t; }

  function dispose() {
    discardStroke();
    scene.remove(pinMarks);
    pinMarks.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  return {
    // pick(nx, ny) is exposed for main.js's touch router, which has to know at
    // TOUCHDOWN whether a finger landed on the specimen or on empty space —
    // one gesture means the instrument, the other means orbit, and the two
    // answers must be the same one this engine will give on the next frame.
    // Re-deriving the visibility and reflected-flap rules over in main.js would
    // be a second source of truth that silently drifts from this one.
    setTool, update, dispose, state, pick,
    get tool() { return tool; },
    get hovered() { return hovered ? hovered.id : null; },
    get contact() { return contact; },
    get grabbed() { return grabbed; },
  };
}
