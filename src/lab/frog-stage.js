/* Original, dimensionless teaching bench. The authored frog's dorsal surface
 * rests at y=-1.20; the silicone receives it at y=-1.22. Not a calibrated ruler.
 * Isolated from the environments of the other four specimens. */
function createFrogStage(THREE, scene, camera, renderer, controls) {
  const root = new THREE.Group();
  root.name = "frog-laboratory-bench";
  const owned = new Set();
  const keep = (value) => (owned.add(value), value);
  const mesh = (geometry, material, name) => {
    const m = new THREE.Mesh(keep(geometry), material);
    m.name = name;
    m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const steel = keep(
    new THREE.MeshStandardMaterial({
      color: 0x899b9b,
      metalness: 0.7,
      roughness: 0.4,
    }),
  );
  const wax = keep(
    new THREE.MeshStandardMaterial({
      color: 0x697d75,
      metalness: 0,
      roughness: 0.94,
    }),
  );
  const dark = keep(
    new THREE.MeshStandardMaterial({
      color: 0x172322,
      metalness: 0.08,
      roughness: 0.91,
    }),
  );
  function rounded(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2,
      y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slab(w, h, y, depth, material, name) {
    const g = new THREE.ExtrudeGeometry(rounded(w, h, 0.65), {
      depth,
      bevelEnabled: true,
      bevelSize: 0.09,
      bevelThickness: 0.07,
      bevelSegments: 2,
      curveSegments: 12,
    });
    g.rotateX(-Math.PI / 2);
    const m = mesh(g, material, name);
    m.position.y = y;
    m.castShadow = true;
    return m;
  }
  slab(12.6, 15.2, -1.85, 0.28, steel, "raised-stainless-dissection-tray");
  slab(11.65, 14.2, -1.49, 0.2, wax, "matte-silicone-pinning-surface");
  // A continuous raised rim, rather than four intersecting boxes.
  const rimShape = rounded(12.6, 15.2, 0.65);
  const rimHole = rounded(11.8, 14.4, 0.5);
  rimShape.holes.push(new THREE.Path(rimHole.getPoints(48).reverse()));
  const rg = new THREE.ExtrudeGeometry(rimShape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 2,
    curveSegments: 16,
  });
  rg.rotateX(-Math.PI / 2);
  const rim = mesh(rg, steel, "rolled-tray-rim");
  rim.position.y = -1.57;
  rim.castShadow = true;
  const bench = mesh(
    new THREE.PlaneGeometry(100, 100),
    dark,
    "matte-laboratory-worktop",
  );
  bench.rotation.x = -Math.PI / 2;
  bench.position.y = -1.96;
  // Shared deterministic micro-roughness, no downloaded textures or per-frame noise.
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const ctx = cv.getContext("2d");
  if (ctx) {
    const pixels = ctx.createImageData(128, 128);
    for (let i = 0; i < 128 * 128; i++) {
      const shade = 185 + ((i * 73 + (i >> 7) * 31) % 49);
      pixels.data.set([shade, shade, shade, 255], i * 4);
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = keep(new THREE.CanvasTexture(cv));
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 10);
    wax.roughnessMap = texture;
    wax.bumpMap = texture;
    wax.bumpScale = 0.018;
  }
  const hemi = new THREE.HemisphereLight(0xe3e9df, 0x3c4843, 0.78);
  root.add(hemi);
  const key = new THREE.DirectionalLight(0xfff8e9, 2.45);
  key.position.set(-8, 14, -3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 11;
  key.shadow.camera.bottom = -11;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 35;
  key.shadow.normalBias = 0.045;
  key.shadow.bias = -0.00015;
  key.shadow.radius = 3;
  root.add(key);
  const fill = new THREE.DirectionalLight(0xd4e1e2, 0.48);
  fill.position.set(7, 6, 5);
  root.add(fill);
  scene.add(root);
  root.visible = false;
  let active = false,
    transition = null,
    presetName = "ventral";
  const startPosition = new THREE.Vector3(),
    endPosition = new THREE.Vector3();
  const target = new THREE.Vector3(0, -0.35, -0.6);
  const background = new THREE.Color(0x101a18);
  const oldBackground = scene.background;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  function preset(name, instant = false) {
    presetName = name;
    const narrow = innerWidth < 760;
    // Frame the WHOLE specimen and tray on phones; never crop the distal targets.
    const usableWidth = narrow
      ? innerWidth - 24
      : innerWidth - (innerWidth <= 1050 ? 390 : 440);
    const usableHeight = narrow
      ? Math.max(230, innerHeight - 420)
      : innerHeight - 190;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distance = Math.max(
      22,
      (12.6 * innerHeight) / (2 * tan * usableWidth),
      (14.5 * innerHeight) / (2 * tan * usableHeight),
    );
    const centerX = narrow
      ? innerWidth / 2
      : (112 + innerWidth - (innerWidth <= 1050 ? 284 : 324)) / 2;
    const centerY = narrow
      ? (280 + innerHeight - 140) / 2
      : innerHeight / 2 + 5;
    camera.setViewOffset(
      innerWidth,
      innerHeight,
      innerWidth / 2 - centerX,
      innerHeight / 2 - centerY,
      innerWidth,
      innerHeight,
    );
    const views = {
      ventral: [0, distance * 0.81, -distance * 0.55],
      top: [0, distance, -0.015],
      left: [-distance * 0.68, distance * 0.65, -distance * 0.27],
      right: [distance * 0.68, distance * 0.65, -distance * 0.27],
    };
    endPosition.set(...(views[name] || views.ventral)).add(target);
    controls.target.copy(target);
    if (instant || reduced.matches) {
      camera.position.copy(endPosition);
      controls.update();
      transition = null;
    } else {
      startPosition.copy(camera.position);
      transition = { elapsed: 0 };
    }
  }
  const interrupt = () => {
    transition = null;
  };
  controls.addEventListener("start", interrupt);
  function update(dt) {
    if (!active || !transition) return;
    transition.elapsed += dt;
    const t = Math.min(1, transition.elapsed / 500),
      k = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(startPosition, endPosition, k);
    controls.update();
    if (t === 1) transition = null;
  }
  function setActive(on) {
    active = !!on;
    root.visible = active;
    transition = null;
    scene.background = active ? background : oldBackground;
    if (!active) camera.clearViewOffset();
    controls.minPolarAngle = active ? 0.001 : 0;
    controls.maxPolarAngle = active ? Math.PI * 0.46 : Math.PI;
    controls.minDistance = active ? 10 : 0;
    controls.maxDistance = active ? 80 : Infinity;
    controls.enablePan = false;
    if (active) {
      renderer.toneMappingExposure = 1.03;
      preset("ventral", true);
    }
  }
  return {
    setActive,
    preset,
    update,
    resize() {
      if (active) preset(presetName, true);
    },
    setQuality(q) {
      renderer.setPixelRatio(
        Math.min(devicePixelRatio || 1, [1, 1.35, 1.7][q] || 1),
      );
      renderer.setSize(innerWidth, innerHeight);
      // Even low-power mode retains contact: one small shadow map, no film FX.
      const size = q === 0 ? 512 : 1024;
      if (key.shadow.mapSize.x !== size) {
        key.shadow.mapSize.set(size, size);
        if (key.shadow.map) {
          key.shadow.map.dispose();
          key.shadow.map = null;
        }
      }
    },
    dispose() {
      controls.removeEventListener("start", interrupt);
      scene.remove(root);
      owned.forEach((o) => o.dispose());
    },
  };
}
