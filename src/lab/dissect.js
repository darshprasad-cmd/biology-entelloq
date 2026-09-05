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
  let mode = 'guided';

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
  // Finished strokes stay visible until this attempt ends. Keep ownership even
  // after gesture bookkeeping is cleared so restart can release scene resources.
  const incisionMarks = new Set();

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
    if (pinState && !procedureReady()) return;
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
  pinMarks.name = 'dissection-pins';
  group.add(pinMarks);
  const pinConfig = ctx.pinning || null;
  let storage = ctx.pinStorage;
  if (storage === undefined) {
    try { storage = typeof localStorage === 'undefined' ? null : localStorage; }
    catch (error) { storage = null; }
  }
  const storageKey = ctx.pinStorageKey || 'bioq-frog-pins-v1';
  let saveAvailable = !!storage;
  let savedPins = null;
  if (pinConfig && storage) {
    try { savedPins = storage.getItem(storageKey); } catch (error) { saveAvailable = false; }
  }
  const pinState = pinConfig ? createPinState({
    specimenId: ctx.specimenId || 'frog', targets: pinConfig.targets, tray: pinConfig.tray,
  }, savedPins) : null;
  let selectedTargetId = pinConfig ? pinConfig.targets[0].id : null;
  let preview = null;
  let feedback = pinState && pinState.snapshot().restoreError || '';
  let previewKey = '';
  let keyboardPreview = false;
  let pointerPosition = null;
  const pinObjects = new Map();
  const targetObjects = new Map();
  const pinSteel = new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.23, metalness: 0.86 });
  const pinGeometry = new THREE.CylinderGeometry(0.022, 0.012, 0.72, 8);
  const pinHeadGeometry = new THREE.SphereGeometry(0.075, 12, 8);
  const projectionMaterial = new THREE.MeshBasicMaterial({ color: 0x96d6b2, transparent: true, opacity: 0.65, depthWrite: false });
  const projectedPin = new THREE.Mesh(pinGeometry, projectionMaterial);
  projectedPin.name = 'proposed-pin';
  projectedPin.visible = false;
  pinMarks.add(projectedPin);
  const localPinRay = new THREE.Ray();
  const inverseGroup = new THREE.Matrix4();
  const projectedPoint = new THREE.Vector3();
  const localTray = pinConfig ? new THREE.Plane(new THREE.Vector3(0, 1, 0), -pinConfig.tray.y) : null;
  if (pinConfig) {
    pinConfig.targets.forEach((target) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(target.radius * 0.88, target.radius, 40),
        new THREE.MeshBasicMaterial({ color: 0xb7d9bf, transparent: true, opacity: 0.65,
          depthWrite: false, side: THREE.DoubleSide }));
      ring.name = 'pin-target-' + target.id;
      ring.rotation.x = -Math.PI / 2;
      ring.position.fromArray(target.center); ring.position.y += 0.018;
      pinMarks.add(ring); targetObjects.set(target.id, ring);
    });
    syncPins(false);
  }

  function pinSnapshot() {
    if (!pinState) return { enabled: false, mode };
    return { ...pinState.snapshot(), mode, selectedTargetId,
      preview: preview ? { ...preview, position: preview.position.slice() } : null,
      feedback, saveAvailable };
  }
  function procedureReady() {
    return !pinState || (mode !== 'explore' && pinState.snapshot().confirmed);
  }
  function toolReason(t) {
    if (!pinState || t === 'probe' || t === 'swab') return '';
    if (mode === 'explore') return 'Explore anatomy is for inspection. Return to guided dissection or independent practical to use instruments.';
    if (t === 'pins') return pinEditReason();
    if (!procedureReady()) return 'Secure all four distal limbs, then choose Continue before cutting or lifting tissue.';
    return '';
  }
  function canUseTool(t) { return (TOOLS.includes(t) || t === 'swab') && !toolReason(t); }
  function pinEditReason() {
    if (mode === 'explore') return 'Return to a practical mode to place pins.';
    if (state.incisions.size || state.opened.size || state.removed.size) {
      return 'An incision has already been made. Restart the specimen before changing its support pins.';
    }
    return '';
  }
  function syncPins(persist = true) {
    const current = pinState.snapshot();
    state.pinned.clear();
    current.pinned.forEach((id) => state.pinned.add(id));
    pinObjects.forEach((object, id) => {
      if (!current.anchors[id]) { pinMarks.remove(object); pinObjects.delete(id); }
    });
    current.targets.forEach((target) => {
      const anchor = current.anchors[target.id] || null;
      if (anchor) {
        let object = pinObjects.get(target.id);
        if (!object) {
          object = new THREE.Group(); object.name = 'anchor-' + target.id;
          const shaft = new THREE.Mesh(pinGeometry, pinSteel);
          shaft.position.y = 0.29; shaft.castShadow = true;
          const head = new THREE.Mesh(pinHeadGeometry, pinSteel);
          head.position.y = 0.68; head.castShadow = true;
          object.add(shaft, head); pinMarks.add(object); pinObjects.set(target.id, object);
        }
        object.position.fromArray(anchor);
      }
      if (pinConfig.setAnchor) pinConfig.setAnchor(target.id, anchor);
      const ring = targetObjects.get(target.id);
      if (ring) {
        ring.visible = mode !== 'explore' && !current.confirmed;
        ring.material.opacity = target.pinned ? 0.2 : mode === 'independent' ? 0.3 : 0.65;
      }
    });
    if (persist && storage) {
      try { storage.setItem(storageKey, pinState.serialize()); saveAvailable = true; }
      catch (error) { saveAvailable = false; }
    }
    state.pinning = pinSnapshot();
  }
  function finishPinAction(result, kind = 'pin-state', id = null) {
    feedback = result.reason || '';
    if (result.ok) syncPins();
    else state.pinning = pinSnapshot();
    emit(result.ok ? kind : 'pin-rejected', id, feedback,
      { refused: !result.ok, code: result.code, pinning: pinSnapshot(), pinned: state.pinned.size });
    return { ...result, pinning: pinSnapshot() };
  }
  function pinCommand(action, id) {
    if (!pinState) return { ok: false, reason: 'This specimen has no authored pinning step.' };
    const blocked = pinEditReason();
    if (blocked) return finishPinAction({ ok: false, reason: blocked, code: 'locked' });
    const result = action();
    // An unfinished preview is not a saved incision. Changing its supporting
    // anchors cancels that preview instead of completing it after a pin reset.
    if (result.ok && result.changed) discardStroke();
    return finishPinAction(result, id ? 'pin' : 'pin-state', id);
  }
  function placePinAt(id, position) {
    return pinCommand(() => pinState.place(id, position), id);
  }
  function removePin(id) { return pinCommand(() => pinState.remove(id)); }
  function undoPin() { return pinCommand(() => pinState.undo()); }
  function resetPins() {
    preview = null; projectedPin.visible = false;
    return pinCommand(() => pinState.reset());
  }
  function continuePinning() {
    if (!pinState) return { ok: false, reason: 'This specimen has no pinning step.' };
    if (mode === 'explore') return finishPinAction({ ok: false, reason: 'Return to a practical mode before continuing.', code: 'mode' });
    preview = null; projectedPin.visible = false;
    return finishPinAction(pinState.continueStep());
  }
  function guidePin(id) {
    if (!pinState) return { ok: false };
    const current = pinState.snapshot();
    const target = current.targets.find((item) => id ? item.id === id : !item.pinned);
    if (!target) return finishPinAction({ ok: false, reason: 'All four limbs are pinned. Check their positions, then choose Continue.', code: 'complete' });
    selectPinTarget(target.id);
    return placePinAt(target.id, target.center);
  }

  // A ray intersects the authored tray in specimen-local coordinates. This is
  // also used over empty space: a missed torso mesh must still explain rejection.
  function projectPin(nx, ny) {
    if (!pinState || !Number.isFinite(nx) || !Number.isFinite(ny) || nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
    ndc.set(nx * 2 - 1, -(ny * 2 - 1));
    camera.updateMatrixWorld(); group.updateMatrixWorld(true);
    ray.setFromCamera(ndc, camera);
    inverseGroup.copy(group.matrixWorld).invert();
    localPinRay.copy(ray.ray).applyMatrix4(inverseGroup);
    if (!localPinRay.intersectPlane(localTray, projectedPoint)) return null;
    const position = [projectedPoint.x, pinConfig.tray.y, projectedPoint.z];
    let nearest = null, distance = Infinity;
    pinConfig.targets.forEach((target) => {
      const next = Math.hypot(position[0] - target.center[0], position[2] - target.center[2]);
      if (next < distance) { distance = next; nearest = target; }
    });
    const check = pinState.validate(nearest.id, position);
    return { position, targetId: nearest.id, valid: check.ok, reason: check.reason || '' };
  }
  function setPinPreview(value, announce = false) {
    preview = value;
    projectedPin.visible = !!value && tool === 'pins' && mode !== 'explore';
    if (value) {
      if (!keyboardPreview) selectedTargetId = value.targetId;
      projectedPin.position.fromArray(value.position); projectedPin.position.y += 0.34;
      projectionMaterial.color.setHex(value.valid ? 0x96d6b2 : 0xe1a892);
    }
    // Pointer coordinates remain render-local. Crossing a region boundary or
    // using keyboard controls is enough to update explanatory UI, not every RAF.
    const key = value ? value.targetId + ':' + value.valid + ':' + (announce ? value.position.join(',') : '') : '';
    if (key !== previewKey || announce) {
      previewKey = key;
      state.pinning = pinSnapshot();
      emit('pin-preview', value && value.targetId, '', { pinning: pinSnapshot() });
    }
  }
  function proposePin(id, position) {
    if (!pinState) return { ok: false };
    const result = pinState.validate(id, position);
    if (!pinConfig.targets.some((target) => target.id === id) || !Array.isArray(position)
        || position.length !== 3 || !position.every(Number.isFinite)) return finishPinAction(result);
    selectedTargetId = id; keyboardPreview = true;
    setPinPreview({ targetId: id, position: position.slice(), valid: result.ok, reason: result.reason || '' }, true);
    return result;
  }
  function selectPinTarget(id) {
    if (!pinState) return { ok: false };
    const target = pinState.snapshot().targets.find((item) => item.id === id);
    if (!target) return finishPinAction({ ok: false, reason: 'Choose one of the four limbs.', code: 'target' });
    return proposePin(id, target.anchor || target.center);
  }
  function movePinPreview(dx, dz) {
    if (!pinState || !Number.isFinite(dx) || !Number.isFinite(dz)) return { ok: false };
    if (!preview) selectPinTarget(selectedTargetId);
    return proposePin(selectedTargetId, [preview.position[0] + dx, pinConfig.tray.y, preview.position[2] + dz]);
  }
  function confirmPin(id, position) {
    if (!pinState) return { ok: false, reason: 'This specimen has no authored pinning step.' };
    if (id && position) return placePinAt(id, position);
    if (!preview) return finishPinAction({ ok: false, reason: 'Choose a limb and a proposed anchor first.', code: 'preview' });
    return placePinAt(preview.targetId, preview.position);
  }
  function setMode(next) {
    if (!['guided', 'independent', 'explore'].includes(next)) return false;
    discardStroke(); grabbed = null;
    if (lift) endLift();
    mode = next; tool = 'probe'; wasGripping = false;
    preview = null; projectedPin.visible = false;
    if (pinState) { syncPins(false); emit('pin-state', null, '', { pinning: pinSnapshot() }); }
    return true;
  }

  // Non-frog specimens retain their current pin behavior until they have their
  // own authored targets. Their old count is never used by the new frog gate.
  function placeLegacyPin(part, point) {
    if (state.pinned.has(part.id)) return;
    state.pinned.add(part.id);
    const g = new THREE.ConeGeometry(0.075, 0.55, 8);
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({
      color: 0xd8dde2, roughness: 0.25, metalness: 0.85 }));
    m.position.copy(group.worldToLocal(point.clone())); m.position.y += 0.28;
    m.rotation.x = Math.PI;
    pinMarks.add(m);
    emit('pin', part.id, 'Pinned ' + part.name + '.', { pinned: state.pinned.size });
    if (state.pinned.size >= 4) {
      emit('discover', null, 'The specimen is pinned out and the body wall is under tension. You can cut now.',
        { ready: true });
    }
  }

  /* ---- incision --------------------------------------------------------- */
  function disposeIncisionMark(mark) {
    if (!mark || !incisionMarks.delete(mark)) return;
    scene.remove(mark);
    mark.geometry.dispose();
    mark.material.dispose();
  }

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
      if (stroke.line) disposeIncisionMark(stroke.line);
      const curve = new THREE.CatmullRomCurve3(stroke.pts);
      const g = new THREE.TubeGeometry(curve, Math.max(8, stroke.pts.length * 3), 0.045, 6, false);
      stroke.line = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x2a0d10 }));
      stroke.line.name = 'incision-stroke';
      incisionMarks.add(stroke.line);
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
    if (stroke && stroke.line) disposeIncisionMark(stroke.line);
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

    if (pinState && tool === 'pins') {
      const moved = !pointerPosition || pointerPosition.x !== input.x || pointerPosition.y !== input.y;
      if (moved) { keyboardPreview = false; pointerPosition = { x: input.x, y: input.y }; }
      if (!keyboardPreview) setPinPreview(projectPin(input.x, input.y));
      if (preview) {
        _contact.point.fromArray(preview.position); group.localToWorld(_contact.point);
        _contact.normal.set(0, 1, 0).transformDirection(group.matrixWorld);
        _contact.partId = preview.valid ? preview.targetId : null;
        contact = _contact;
      }
    } else projectedPin.visible = false;

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

    if (down && tool === 'pins' && pinState) {
      if (preview) placePinAt(preview.targetId, preview.position);
      else finishPinAction({ ok: false, reason: 'Aim at the tray near a distal limb.', code: 'tray' });
    } else if (down && !canUseTool(tool)) {
      emit('tool-refused', part && part.id, toolReason(tool), { refused: true });
    } else if (down && part && hit) {
      if (tool === 'pins') {
        placeLegacyPin(part, hit.point);
      } else if (tool === 'scalpel') {
        if (!pinState && ctx.requiresPinning && state.pinned.size < 4 && part.layer <= 1) {
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

    if (tool === 'retractor' && canUseTool(tool) && input.span > 0.18) {
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
    if (pinConfig && pinConfig.update) pinConfig.update(dt);
  }

  function setTool(t) {
    if (!TOOLS.includes(t)) return false;
    if (!canUseTool(t)) {
      emit('tool-refused', null, toolReason(t), { refused: true });
      return false;
    }
    if (tool !== t) { discardStroke(); grabbed = null; if (lift) endLift(); }
    tool = t;
    return true;
  }

  function dispose() {
    discardStroke();
    incisionMarks.forEach(disposeIncisionMark);
    group.remove(pinMarks);
    const geometries = new Set([pinGeometry, pinHeadGeometry]);
    const materials = new Set([pinSteel, projectionMaterial]);
    pinMarks.traverse((o) => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    if (pinConfig && pinConfig.dispose) pinConfig.dispose();
  }

  return {
    // pick(nx, ny) is exposed for main.js's touch router, which has to know at
    // TOUCHDOWN whether a finger landed on the specimen or on empty space —
    // one gesture means the instrument, the other means orbit, and the two
    // answers must be the same one this engine will give on the next frame.
    // Re-deriving the visibility and reflected-flap rules over in main.js would
    // be a second source of truth that silently drifts from this one.
    setTool, update, dispose, state, pick, canUseTool, toolReason, setMode,
    projectPin, proposePin, selectPinTarget, movePinPreview, confirmPin, placePinAt,
    guidePin, undoPin, removePin, resetPins, continuePinning,
    get pinning() { return pinSnapshot(); },
    get mode() { return mode; },
    get tool() { return tool; },
    get hovered() { return hovered ? hovered.id : null; },
    get contact() { return contact; },
    get grabbed() { return grabbed; },
  };
}
