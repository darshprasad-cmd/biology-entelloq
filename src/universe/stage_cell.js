/* Educational cutaways, not microscopy. Units are normalized display units.
 * Shared topology keeps small and enlarged mitochondria consistent. Colour,
 * dimensions, protein counts and motion are illustrative (see CELL.md).
 */
function uniCellTube(THREE, points, radius, material, closed = false) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed, 'centripetal'), Math.max(24, points.length * 6), radius, 6, closed), material);
}

// One indexed membrane surface; the front sector is opened for inspection.
// Cristae are smooth invaginations of THIS surface, never disconnected rings.
function uniCellMembrane(THREE, { a, b, c, folds = 0, poreDirections = [], cut = 0.28 }) {
  const nx = folds ? 176 : 48, np = 48, start = Math.PI * cut, span = Math.PI * (2 - cut * 2), vertices = [], indices = [];
  function point(t, p, target = new THREE.Vector3()) {
    const x = a * Math.cos(t), rr = Math.sin(t); let pleat = 0;
    if (folds) for (let f = 0; f < folds; f++) {
      const center = -a * 0.66 + f * a * 1.32 / (folds - 1), q = Math.abs(x - center) / (a * 0.083);
      if (q < 1) pleat = Math.max(pleat, Math.pow(Math.cos(q * Math.PI / 2), 2));
    }
    const inward = 1 - 0.91 * pleat * Math.pow(Math.max(0, -Math.sin(p)), 3);
    return target.set(x, b * rr * Math.sin(p) * inward, c * rr * Math.cos(p) * inward);
  }
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= np; j++) { const v = point(i / nx * Math.PI, start + j / np * span); vertices.push(v.x, v.y, v.z); }
  const center = new THREE.Vector3();
  for (let i = 0; i < nx; i++) for (let j = 0; j < np; j++) {
    point((i + 0.5) / nx * Math.PI, start + (j + 0.5) / np * span, center); center.set(center.x / a, center.y / b, center.z / c);
    if (poreDirections.some(p => center.distanceToSquared(p) < 0.015)) continue;
    const k = i * (np + 1) + j; indices.push(k, k + 1, k + np + 1, k + 1, k + np + 2, k + np + 1);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.userData.continuousMembrane = true;
  return { geometry, point, start, span };
}

function uniCellSac(THREE, w, h, depth, material, bend = 0.1) {
  const geometry = new THREE.SphereGeometry(1, 32, 12), p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x * w, y * h + bend * x * x + 0.018 * Math.sin(z * 3), z * depth); }
  geometry.computeVertexNormals(); const mesh = new THREE.Mesh(geometry, material); mesh.userData.flattenedCisterna = true; return mesh;
}

function uniCellMitochondrion(THREE, KIT, detail = true) {
  const group = KIT.group(), H = KIT.HEX, parts = {}, folds = detail ? 8 : 6;
  const outerSurface = uniCellMembrane(THREE, { a: 1.37, b: 0.64, c: 0.56 });
  const innerSurface = uniCellMembrane(THREE, { a: 1.25, b: 0.52, c: 0.45, folds });
  const outerMat = KIT.surface(0x784754, { rough: 0.57, emissive: 0x492731, glow: 0.12, side: THREE.DoubleSide }), innerMat = KIT.surface(0xba6b79, { rough: 0.58, emissive: 0x713647, glow: 0.19, side: THREE.DoubleSide });
  parts.outer = new THREE.Mesh(outerSurface.geometry, outerMat); parts.outer.name = 'mitochondrial-outer-membrane'; group.add(parts.outer);
  parts.inner = new THREE.Mesh(innerSurface.geometry, innerMat); parts.inner.name = 'continuous-inner-membrane-and-cristae'; group.add(parts.inner);
  for (const [surface, color, radius] of [[outerSurface, 0xc9909a, 0.012], [innerSurface, H.rose, 0.009]]) {
    const mat = KIT.emissive(color, { glow: 0.18 });
    for (const p of [surface.start, surface.start + surface.span]) { const pts = []; for (let k = 0; k <= 80; k++) pts.push(surface.point(k / 80 * Math.PI, p)); group.add(uniCellTube(THREE, pts, radius, mat)); }
  }
  const anchor = (key, v) => { const o = KIT.group(); o.name = key; o.position.copy(v); group.add(o); parts[key] = o; return o; };
  anchor('outerAnchor', outerSurface.point(Math.PI * 0.28, outerSurface.start)); anchor('innerAnchor', innerSurface.point(Math.PI * 0.75, innerSurface.start));
  anchor('cristae', innerSurface.point(Math.acos(0.118 / 1.25), Math.PI * 1.5));
  const interspace = uniCellTube(THREE, [outerSurface.point(0.8, outerSurface.start), innerSurface.point(0.8, innerSurface.start)], 0.01, KIT.emissive(H.gold, { glow: 0.2 })); interspace.name = 'intermembrane-space-cut-edge'; group.add(interspace);
  anchor('interspace', new THREE.Vector3().addVectors(outerSurface.point(0.8, outerSurface.start), innerSurface.point(0.8, innerSurface.start)).multiplyScalar(0.5));
  const matrix = KIT.sphere(1, 24, KIT.glassy(0x738b77, { opacity: 0.035, glow: 0 })); matrix.scale.set(1.13, 0.43, 0.36); matrix.name = 'matrix-compartment'; group.add(matrix); parts.matrix = matrix;
  const synthases = [], baseMat = KIT.surface(0xd8a850, { rough: 0.55 }), headMat = KIT.surface(H.gold, { rough: 0.5, emissive: 0x655025, glow: 0.18 });
  const baseGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.035, 10), stemGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.067, 8), headGeo = new THREE.SphereGeometry(0.043, 12, 8);
  const sampleA = new THREE.Vector3(), sampleB = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let f = 0; f < folds; f++) {
    const x = -1.25 * 0.66 + f * 1.25 * 1.32 / (folds - 1), t = Math.acos(x / 1.25);
    for (let j = 0; j < (detail ? 3 : 1); j++) {
      const p = Math.PI * (1.37 + j * 0.09), pos = innerSurface.point(t, p);
      innerSurface.point(t - 0.0001, p, sampleA).sub(innerSurface.point(t + 0.0001, p, sampleB)); const dx = sampleA.clone();
      innerSurface.point(t, p + 0.0001, sampleA).sub(innerSurface.point(t, p - 0.0001, sampleB));
      const normal = dx.cross(sampleA).normalize().negate();
      const enzyme = KIT.group(); enzyme.position.copy(pos); enzyme.quaternion.setFromUnitVectors(up, normal); enzyme.name = 'matrix-facing-atp-synthase';
      const base = new THREE.Mesh(baseGeo, baseMat), stem = new THREE.Mesh(stemGeo, headMat), head = new THREE.Mesh(headGeo, headMat); stem.position.y = 0.039; head.position.y = 0.09; head.scale.set(1, 0.8, 1); enzyme.add(base, stem, head); group.add(enzyme);
      enzyme.userData.matrixNormal = normal.toArray(); enzyme.userData.membranePoint = pos.toArray(); synthases.push(enzyme);
    }
  }
  parts.atpsynthase = synthases[Math.floor(synthases.length / 2)].children[2];
  const dnaPts = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; dnaPts.push(new THREE.Vector3(Math.cos(a) * 0.22 - 0.35, 0.19 + Math.sin(a) * 0.095, 0.2 + Math.sin(a * 2) * 0.022)); }
  const dna = uniCellTube(THREE, dnaPts, 0.012, KIT.emissive(H.cy, { glow: 0.28 }), true); dna.name = 'circular-mitochondrial-dna'; group.add(dna); parts.mtdna = dna; anchor('dnaAnchor', dnaPts[0]);
  const riboMat = KIT.surface(0xc4ac92, { rough: 0.8 }), riboGeo = new THREE.SphereGeometry(0.035, 10, 7);
  for (let i = 0; i < (detail ? 14 : 3); i++) {
    const rib = KIT.group(-0.79 + (i % 5) * 0.34, 0.08 + Math.floor(i / 5) * 0.11, 0.2 + Math.sin(i * 2) * 0.07); rib.name = 'mitochondrial-ribosome';
    const large = new THREE.Mesh(riboGeo, riboMat), small = new THREE.Mesh(riboGeo, riboMat); large.scale.set(1.2, 0.85, 1); small.scale.setScalar(0.65); small.position.y = -0.034; rib.add(large, small); group.add(rib); if (i === 3 || (!detail && i === 0)) parts.ribosome = rib;
  }
  group.userData.structure = { model: 'mitochondrion-cutaway', folds, continuousInnerMembrane: true, synthases: synthases.length, circularGenome: true };
  return { group, parts, synthases, innerSurface };
}

UNI.register('cell', ({ THREE, KIT, meta }) => {
  const root = KIT.group(), spin = KIT.group(), H = KIT.HEX, parts = {}; root.add(spin);
  const material = (color, glow = 0.12) => KIT.surface(color, { rough: 0.62, emissive: color, glow, side: THREE.DoubleSide });
  const shell = uniCellMembrane(THREE, { a: 1.5, b: 1.43, c: 1.32, cut: 0.3 });
  const membrane = new THREE.Mesh(shell.geometry, KIT.glassy(0x379875, { opacity: 0.13, glow: 0.05 })); membrane.name = 'opened-cell-membrane'; spin.add(membrane);
  const innerShell = uniCellMembrane(THREE, { a: 1.475, b: 1.405, c: 1.295, cut: 0.3 }); spin.add(new THREE.Mesh(innerShell.geometry, KIT.glassy(H.em, { opacity: 0.055, glow: 0 })));
  const edgeMat = material(0x8bcbac, 0.08);
  for (const p of [shell.start, shell.start + shell.span]) { const pts = []; for (let i = 0; i <= 64; i++) pts.push(shell.point(i / 64 * Math.PI, p)); spin.add(uniCellTube(THREE, pts, 0.013, edgeMat)); }
  function anchor(key, owner, point) { const o = KIT.group(); o.position.copy(point); o.name = 'anchor-' + key; owner.add(o); parts[key] = o; return o; }
  anchor('membrane', spin, shell.point(0.85, shell.start));
  const nucleus = KIT.group(-0.25, 0.18, 0.03); nucleus.name = 'opened-nucleus'; spin.add(nucleus); parts.nucleus = nucleus;
  const poreDirs = [new THREE.Vector3(0.45, 0.8, 0.39).normalize(), new THREE.Vector3(-0.55, 0.77, 0.32).normalize(), new THREE.Vector3(0.83, -0.42, 0.19).normalize(), new THREE.Vector3(-0.75, -0.22, -0.62).normalize()];
  for (const radius of [0.61, 0.645]) { const env = uniCellMembrane(THREE, { a: radius, b: radius, c: radius, poreDirections: poreDirs, cut: 0.32 }); const mesh = new THREE.Mesh(env.geometry, material(radius === 0.61 ? 0x437d71 : 0x6ca995)); mesh.name = 'porous-nuclear-envelope'; nucleus.add(mesh); }
  const poreMat = material(0xb0d7c3), poreGeo = new THREE.TorusGeometry(0.071, 0.015, 8, 16), zaxis = new THREE.Vector3(0, 0, 1);
  poreDirs.forEach((dir, i) => { const pore = new THREE.Mesh(poreGeo, poreMat); pore.position.copy(dir).multiplyScalar(0.635); pore.quaternion.setFromUnitVectors(zaxis, dir); pore.name = 'nuclear-pore-complex'; nucleus.add(pore); if (i === 0) parts.pores = pore; });
  const chromatin = KIT.group(); chromatin.name = 'interphase-chromatin'; nucleus.add(chromatin); const chrMat = material(0x8dc2d0, 0.15);
  for (let s = 0; s < 8; s++) { const pts = []; for (let i = 0; i <= 18; i++) { const t = i / 18, a = s * 1.8 + t * 6.8, r = 0.29 + 0.095 * Math.sin(t * 8 + s); pts.push(new THREE.Vector3(Math.cos(a) * r, -0.37 + t * 0.74, Math.sin(a) * r)); } chromatin.add(uniCellTube(THREE, pts, 0.011, chrMat)); }
  parts.chromatin = chromatin.children[2]; anchor('chromatinAnchor', nucleus, parts.chromatin.geometry.parameters.path.getPoint(0.6));
  const nucleolus = KIT.sphere(0.145, 24, material(0xb7a07b, 0.08)); nucleolus.position.set(0.1, 0.04, 0.22); nucleolus.name = 'nucleolus'; nucleus.add(nucleolus); parts.nucleolus = nucleolus;
  anchor('envelope', nucleus, new THREE.Vector3(0.4, 0.3, -0.39));
  const mitos = [];
  for (const [x, y, z, r] of [[0.83, -0.02, 0.25, 0.85], [0.68, -0.91, 0.16, -0.35], [0.12, 1.02, -0.15, 0.25]]) { const m = uniCellMitochondrion(THREE, KIT, false); m.group.position.set(x, y, z); m.group.rotation.z = r; m.group.scale.setScalar(0.25); spin.add(m.group); mitos.push(m); }
  parts.mito = mitos[0].parts.innerAnchor;
  const er = KIT.group(-0.60, -0.81, -0.08); er.rotation.y = -0.2; er.name = 'rough-er-cisternae'; spin.add(er);
  const erMat = material(0x5f8295), riboMat = material(0xddd1b3), riboGeo = new THREE.SphereGeometry(0.016, 7, 5), sacs = [];
  for (let s = 0; s < 4; s++) {
    const sac = uniCellSac(THREE, 0.43 - s * 0.022, 0.024, 0.20, erMat, 0.06); sac.position.set(s * 0.015, s * 0.075, -s * 0.025); er.add(sac); sacs.push(sac);
    for (let i = 0; i < 17; i++) { const a = i * 2.4, r = Math.sqrt((i + 0.5) / 18), x = Math.cos(a) * r * (0.40 - s * 0.022), z = Math.sin(a) * r * 0.175; const rib = new THREE.Mesh(riboGeo, riboMat); rib.position.set(x + sac.position.x, sac.position.y + 0.034 + 0.06 * Math.pow(x / 0.43, 2), z + sac.position.z); er.add(rib); }
  }
  const erSpine = uniCellTube(THREE, [new THREE.Vector3(-0.29, 0.055, 0), new THREE.Vector3(-0.28, 0.15, -0.04), new THREE.Vector3(-0.27, 0.26, -0.08)], 0.05, erMat); erSpine.name = 'er-cisternal-connections'; er.add(erSpine);
  const envelopeConnection = uniCellTube(THREE, [new THREE.Vector3(-0.85, -0.55, -0.10), new THREE.Vector3(-0.84, -0.38, -0.13), new THREE.Vector3(-0.75, -0.19, -0.13)], 0.035, erMat); envelopeConnection.name = 'nuclear-envelope-er-continuity'; spin.add(envelopeConnection); parts.er = sacs[2];
  const ser = KIT.group(); ser.name = 'smooth-er-network'; spin.add(ser);
  const smoothMat = material(0x678f86), branches = [[[-0.19,-0.675,-0.02],[0.01,-0.59,0.11],[0.29,-0.62,0.11],[0.49,-0.83,0.12]],[[0.01,-0.59,0.11],[0.16,-0.75,-0.08],[0.37,-0.92,-0.04]],[[0.29,-0.62,0.11],[0.53,-0.60,-0.05],[0.7,-0.78,-0.1]],[[0.16,-0.75,-0.08],[0.1,-0.96,0.1],[0.32,-1.03,0.13]]];
  branches.forEach(row => ser.add(uniCellTube(THREE, row.map(v => new THREE.Vector3(...v)), 0.031, smoothMat))); parts.ser = ser.children[1]; anchor('serAnchor', spin, new THREE.Vector3(0.16, -0.75, -0.08));
  const golgi = KIT.group(0.64, 0.6, 0.1); golgi.rotation.z = -0.25; golgi.name = 'golgi-stack'; spin.add(golgi); parts.golgi = golgi; const golgiMat = material(0xb59b65);
  for (let s = 0; s < 5; s++) { const sac = uniCellSac(THREE, 0.31 - s * 0.018, 0.022, 0.18 - s * 0.009, golgiMat, 0.10); sac.position.y = (s - 2) * 0.078; golgi.add(sac); }
  const vesicles = []; for (let i = 0; i < 6; i++) { const ves = KIT.sphere(0.035 + i % 2 * 0.012, 12, golgiMat); ves.position.set(0.28 + 0.045 * (i % 2), -0.16 + i * 0.07, 0.015); golgi.add(ves); vesicles.push(ves); } parts.vesicle = vesicles[3];
  const mrnaPoints = [[-0.40,-0.99,0.42],[-0.17,-0.94,0.5],[0.1,-0.98,0.43],[0.36,-0.91,0.40]].map(p => new THREE.Vector3(...p));
  const mrnaCurve = new THREE.CatmullRomCurve3(mrnaPoints), mrna = uniCellTube(THREE, mrnaPoints, 0.009, material(H.cy)); spin.add(mrna); mrna.name = 'messenger-rna';
  const ribosome = KIT.group(); ribosome.name = 'cytoplasmic-ribosome'; spin.add(ribosome); parts.ribosome = ribosome;
  const large = KIT.sphere(0.065, 16, riboMat), small = KIT.sphere(0.044, 14, riboMat); large.scale.set(1.2, 0.8, 1); large.position.y = 0.025; small.position.y = -0.044; ribosome.add(large, small); ribosome.position.copy(mrnaCurve.getPoint(0.4));
  ribosome.add(uniCellTube(THREE, [[0,0.04,0],[0.035,0.12,0.01],[-0.01,0.18,0.05],[0.04,0.23,0.04]].map(p=>new THREE.Vector3(...p)),0.009,material(0xb8c795)));
  const lyso = KIT.group(0.56, -0.5, 0.46); lyso.name = 'lysosome-cutaway'; spin.add(lyso); parts.lyso = lyso;
  const lysoShell = uniCellMembrane(THREE, { a: 0.16, b: 0.15, c: 0.15, cut: 0.35 }); lyso.add(new THREE.Mesh(lysoShell.geometry, material(0x947494)));
  const cargoMat = material(0xc1a0b2); for (let i = 0; i < 7; i++) { const cargo = KIT.sphere(0.017 + i % 2 * 0.01, 8, cargoMat); cargo.position.set(Math.sin(i * 2) * 0.07, Math.cos(i * 3) * 0.065, 0.02 + Math.sin(i) * 0.04); lyso.add(cargo); }
  const cytoskeleton = KIT.group(); cytoskeleton.name = 'cytoskeletal-filaments'; spin.add(cytoskeleton);
  const fiberMat = KIT.surface(0x58977c, { rough: 0.7, opacity: 0.66, emissive: 0x153d2b, glow: 0.12 });
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const points = [new THREE.Vector3(0.4,0.12,-0.49),new THREE.Vector3(Math.cos(a)*0.76,Math.sin(a)*0.76,-0.56),new THREE.Vector3(Math.cos(a)*1.2,Math.sin(a)*1.15,-0.21)]; cytoskeleton.add(uniCellTube(THREE, points, 0.008, fiberMat)); }
  anchor('cytoskeleton', spin, cytoskeleton.children[1].geometry.parameters.path.getPoint(0.8));
  const cent = KIT.group(0.4,0.12,-0.49); cent.name = 'centrosome'; spin.add(cent); parts.centrosome = cent;
  const centMat = material(0xbbbea2), centGeo = new THREE.CylinderGeometry(0.008,0.008,0.13,6);
  for(let c=0;c<2;c++){const unit=KIT.group(c*0.085,0,0);unit.rotation.z=c*Math.PI/2;cent.add(unit);for(let i=0;i<9;i++){const a=i/9*Math.PI*2,rod=new THREE.Mesh(centGeo,centMat);rod.position.set(Math.cos(a)*0.026,0,Math.sin(a)*0.026);unit.add(rod);}}
  const mapping = { membrane:parts.membrane,nucleus,mito:parts.mito,er:parts.er,golgi,ribosome,nucleolus,pores:parts.pores,lyso,cytoskeleton:parts.cytoskeleton,ser:parts.serAnchor,chromatin:parts.chromatinAnchor,envelope:parts.envelope,vesicle:parts.vesicle,centrosome:cent };
  const hotspots = Object.entries(meta.hotspots || {}).map(([key, info]) => { const object = mapping[key]; if (!object) throw new Error('Missing cell anchor: ' + key); return { id:'cell-'+key, meta:info, object, get:v=>object.getWorldPosition(v) }; });
  let clock = 0;
  function update(dt) { if (!(dt > 0)) return; clock += dt; spin.rotation.y = Math.sin(clock * 0.08) * 0.10; spin.rotation.x = Math.sin(clock * 0.11) * 0.025; }
  root.userData.structure = { model:'animal-cell-cutaway', roughERCisternae:4, golgiCisternae:5, nuclearPores:poreDirs.length, mitochondria:3, erContinuousWithEnvelope:true };
  return { root, update, hotspots, dispose:()=>KIT.dispose(root) };
});

UNI.register('organelle', ({ THREE, KIT, meta }) => {
  const root = KIT.group(), model = uniCellMitochondrion(THREE, KIT), spin = model.group; root.add(spin);
  const p = model.parts, mapping = { cristae:p.cristae,matrix:p.matrix,atpsynthase:p.atpsynthase,mtdna:p.dnaAnchor,outer:p.outerAnchor,inner:p.innerAnchor,interspace:p.interspace,ribosome:p.ribosome }, oldIDs = { atpsynthase:'synthase' };
  const hotspots = Object.entries(meta.hotspots || {}).map(([key, info]) => { const object = mapping[key]; if (!object) throw new Error('Missing mitochondrial anchor: '+key); return { id:'org-'+(oldIDs[key] || key),meta:info,object,get:v=>object.getWorldPosition(v) }; });
  let clock = 0; function update(dt) { if (!(dt > 0)) return; clock += dt; spin.rotation.y = Math.sin(clock * 0.1) * 0.12; spin.rotation.x = Math.sin(clock * 0.12) * 0.055; }
  root.userData.structure = model.group.userData.structure;
  return { root,update,hotspots,dispose:()=>KIT.dispose(root) };
});
