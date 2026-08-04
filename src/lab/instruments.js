/*
 * instruments.js — the cursor becomes a real instrument.
 *
 * A glowing dot says "I am using software". A scalpel whose blade tip rests on
 * the tissue at a surgeon's angle, with the handle leaning back toward you, says
 * "I am holding a scalpel". That swap is one of the cheapest presence wins there
 * is, and it costs a handful of primitives.
 *
 * Placement rule: the WORKING TIP goes exactly on the raycast hit point, and the
 * shaft approaches along the surface normal but tilted ~35 degrees toward the
 * camera — dead perpendicular looks like a machine, not a hand. Everything is
 * damped toward its target so the tool glides instead of snapping.
 *
 * These meshes are added to the scene but are NEVER registered as parts, and
 * dissect.js only raycasts parts, so they can never block picking.
 *
 * Contract:
 *   createInstruments(THREE, scene) ->
 *     { setTool(name), update(state), setVisible(on), dispose() }
 *   state = { point, normal, grip, gripping, active }
 */

export function createInstruments(THREE, scene) {
  const root = new THREE.Group();
  root.renderOrder = 2;
  scene.add(root);

  const owned = [];
  const track = (x) => { owned.push(x); return x; };

  // Surgical stainless. Low roughness + high metalness; the theatre lamp does the
  // rest. A darker grip material keeps the handle from blowing out under the lamp.
  const steel = track(new THREE.MeshPhysicalMaterial({
    color: 0xccd6dd, roughness: 0.17, metalness: 0.97, clearcoat: 0.4 }));
  const bladeMat = track(new THREE.MeshPhysicalMaterial({
    color: 0xeaf2f7, roughness: 0.08, metalness: 1.0, clearcoat: 0.6 }));
  const gripMat = track(new THREE.MeshPhysicalMaterial({
    color: 0x1b2126, roughness: 0.62, metalness: 0.35 }));

  // Each tool is built pointing DOWN -Y with its working tip at the origin, so
  // placement is just "put the origin on the hit point and orient -Y along the
  // approach vector". Keeps update() trivial.
  const tools = {};

  function mkScalpel() {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(track(new THREE.CylinderGeometry(0.012, 0.10, 0.62, 4)), bladeMat);
    blade.position.y = 0.31;
    blade.rotation.y = Math.PI / 4;
    blade.scale.z = 0.34;                       // flatten into a blade
    g.add(blade);
    const collar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.062, 0.062, 0.18, 12)), steel);
    collar.position.y = 0.7; g.add(collar);
    const handle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.055, 0.075, 2.5, 12)), gripMat);
    handle.position.y = 2.02; g.add(handle);
    const butt = new THREE.Mesh(track(new THREE.CylinderGeometry(0.078, 0.06, 0.2, 12)), steel);
    butt.position.y = 3.36; g.add(butt);
    return g;
  }

  function mkForceps() {
    const g = new THREE.Group();
    // Two prongs that pivot shut as grip rises — the animation is the whole point.
    const prongs = [];
    for (let s = -1; s <= 1; s += 2) {
      const prong = new THREE.Mesh(track(new THREE.CylinderGeometry(0.018, 0.05, 1.5, 8)), steel);
      prong.position.set(0, 0.75, 0);
      const pivot = new THREE.Group();
      pivot.add(prong);
      pivot.position.set(0, 0, 0);
      g.add(pivot);
      prongs.push({ pivot, s });
    }
    const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.062, 1.9, 10)), gripMat);
    shaft.position.y = 2.4; g.add(shaft);
    g.userData.prongs = prongs;
    return g;
  }

  function mkProbe() {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(track(new THREE.SphereGeometry(0.062, 14, 10)), steel);
    g.add(ball);
    const rod = new THREE.Mesh(track(new THREE.CylinderGeometry(0.032, 0.032, 2.1, 10)), steel);
    rod.position.y = 1.06; g.add(rod);
    const handle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.055, 0.07, 1.5, 12)), gripMat);
    handle.position.y = 2.85; g.add(handle);
    return g;
  }

  function mkPins() {
    const g = new THREE.Group();
    const needle = new THREE.Mesh(track(new THREE.ConeGeometry(0.045, 0.7, 10)), steel);
    needle.position.y = 0.35; needle.rotation.x = Math.PI; g.add(needle);
    const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8)), steel);
    shaft.position.y = 1.3; g.add(shaft);
    const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.11, 14, 10)), gripMat);
    head.position.y = 2.15; g.add(head);
    return g;
  }

  function mkRetractor() {
    const g = new THREE.Group();
    const hook = new THREE.Mesh(track(new THREE.TorusGeometry(0.3, 0.045, 8, 18, Math.PI * 0.95)), steel);
    hook.rotation.z = Math.PI * 0.5;
    hook.position.y = 0.3; g.add(hook);
    const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.045, 0.055, 2.3, 10)), steel);
    shaft.position.y = 1.6; g.add(shaft);
    const handle = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.9, 0.09)), gripMat);
    handle.position.y = 3.1; g.add(handle);
    return g;
  }

  tools.scalpel = mkScalpel();
  tools.forceps = mkForceps();
  tools.probe = mkProbe();
  tools.pins = mkPins();
  tools.retractor = mkRetractor();
  Object.values(tools).forEach((t) => { t.visible = false; root.add(t); });

  let current = 'probe';
  let visible = true;

  // Scratch — update() runs every frame and must not allocate.
  const _target = new THREE.Vector3();
  const _approach = new THREE.Vector3();
  const _camRight = new THREE.Vector3();
  const _camUp = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);
  const _q = new THREE.Quaternion();
  const _m = new THREE.Matrix4();
  const _pos = new THREE.Vector3();
  let started = false;

  function setTool(name) {
    if (!tools[name]) return;
    current = name;
    Object.keys(tools).forEach((k) => { tools[k].visible = visible && k === current && started; });
  }

  function setVisible(on) {
    visible = !!on;
    Object.keys(tools).forEach((k) => { tools[k].visible = visible && k === current && started; });
  }

  function update(state) {
    const tool = tools[current];
    if (!tool) return;
    const show = visible && state && state.active && state.point;
    if (!show) { tool.visible = false; started = false; return; }

    if (!started) {
      // First appearance: snap rather than sweep in from wherever it was left.
      started = true;
      tool.position.copy(state.point);
    }
    tool.visible = true;
    Object.keys(tools).forEach((k) => { if (k !== current) tools[k].visible = false; });

    // Approach direction. The obvious choice — lean the surface normal toward the
    // camera — is wrong: on a near-top-down view that aims the shaft straight at
    // the lens and the whole instrument foreshortens into a dot. Instead build the
    // approach in VIEW space, so the tool always lies across the screen on a
    // readable diagonal, entering from the upper right like a right hand would.
    _approach.copy(state.normal && state.normal.lengthSq() > 0 ? state.normal : _up).normalize();
    if (state.camera) {
      state.camera.updateMatrixWorld();
      const e = state.camera.matrixWorld.elements;
      _camRight.set(e[0], e[1], e[2]).normalize();     // camera +X
      _camUp.set(e[4], e[5], e[6]).normalize();        // camera +Y
      // A third normal, a bit more than half across-screen, and up-screen: the
      // shaft then runs off toward the top-right corner and stays fully visible.
      _approach.multiplyScalar(0.34)
        .addScaledVector(_camRight, 0.62)
        .addScaledVector(_camUp, 0.58)
        .normalize();
    }

    // Build an orientation whose -Y (the tool's own axis) lies along +approach.
    _m.lookAt(_target.set(0, 0, 0), _approach, _up);
    _q.setFromRotationMatrix(_m);
    // lookAt aims -Z; rotate so the tool's -Y (tip-down) aligns instead.
    _q.multiply(_tipFix);

    _pos.copy(state.point);
    // Damped follow, so the instrument glides.
    tool.position.lerp(_pos, 0.42);
    tool.quaternion.slerp(_q, 0.30);

    // Forceps close as the student grips.
    if (current === 'forceps' && tool.userData.prongs) {
      const g = Math.max(0, Math.min(1, state.grip || 0));
      tool.userData.prongs.forEach(({ pivot, s }) => {
        pivot.rotation.z = s * (0.26 - g * 0.245);   // open ~15deg -> shut
      });
    }
    // The scalpel rolls into its cut as pressure rises.
    if (current === 'scalpel') {
      tool.rotateOnAxis(_up, 0);
      tool.children[0].rotation.z = (state.gripping ? 0.22 : 0.06);
    }
  }

  // Constant: rotate -Z-forward into -Y-down (tools are modelled tip-at-origin,
  // body along +Y, so the axis we must align is -Y).
  const _tipFix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

  function dispose() {
    scene.remove(root);
    owned.forEach((o) => { try { o.dispose && o.dispose(); } catch (e) {} });
  }

  return { setTool, update, setVisible, dispose };
}
