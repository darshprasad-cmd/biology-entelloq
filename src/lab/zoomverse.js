/*
 * zoomverse.js — an inspectable scale journey from tissue to a carbon atom.
 *
 * The "Powers of Ten" moment. Point at a structure, press I, and the view dives
 * through representative scales — from a tissue
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
 *   one, the way a nucleus sits inside its cell. Camera framing interpolates to
 *   fit the available inspection area; stage scaling supplies the journey.
 *
 * Self-contained: its own THREE.Scene + camera + lights, rendered with the shared
 * renderer while open (main.js renders it instead of the specimen). Its only
 * top-level name is the factory `createZoomverse`; every helper is inside it.
 *
 * Contract:
 *   createZoomverse(THREE, renderer) ->
 *     { open(spec), close(), isOpen(), setZoom(t), zoomBy(dt), update(dtMs),
 *       render(dtMs), resize(w,h), onClose(cb), dispose() }
 *   spec = { name, system, tissue, partId }  (origin label; models are references)
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
  // Representative spans, NOT a calibrated field of view or a species-specific
  // measurement. Different stages independently fit the camera for inspection.
  const STAGE_SCALE_M = [3e-4, 2e-5, 5e-6, 1e-7, 1.1e-8, 4.1e-9, 2e-9, 1.5e-10];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

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
    m.userData.baseDepthWrite = m.depthWrite;
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
    const cells = new THREE.Group(), nuclei = new THREE.Group();
    g.add(cells, nuclei);
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
      n.position.add(cell.position);
      cells.add(cell); nuclei.add(n);
    }
    const matrix = new THREE.Mesh(track(new THREE.CircleGeometry(1.9, 64)),
      stageMat(0x71424d, { rough: .9, opacity: .22, side: THREE.DoubleSide }));
    matrix.position.z = -.18; g.add(matrix);
    g.userData.parts = [
      { id:'cells', label:'Cells', note:'An illustrative tissue field. Cell shape, packing and matrix vary between organs; this is not a scanned section of the specimen.', object:cells },
      { id:'nuclei', label:'Cell nuclei', note:'Dark nuclei stand out in this stain-inspired palette. Staining colours are display choices, not the natural colours of living tissue.', object:nuclei },
      { id:'matrix', label:'Extracellular space', note:'Cells are surrounded by extracellular material. Its amount and composition differ greatly between tissue types.', object:matrix },
    ];
    g.userData.spin = 0.05;
    return g;
  }

  /* -- CELL: one animal cell with organelles -------------------------------- */
  function buildCell(spec) {
    const g = new THREE.Group();
    // Composite animal cell; opened membranes and enlarged machinery are
    // teaching conventions, not measured organelle sizes or microscopy colours.
    const parts = g.userData.parts = [];
    const part = (id, label, note, object) => { object.name = id; parts.push({ id, label, note, object }); return object; };
    const vec = p => new THREE.Vector3(...p);
    const tube = (points, radius, mat) => new THREE.Mesh(track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(vec)), Math.max(24, points.length * 7), radius, 6, false)), mat);
    const mat = (color, opacity = 1) => stageMat(color, { rough: 0.65, opacity, emissive: color, emissiveIntensity: 0.07, side: THREE.DoubleSide });
    const membrane = new THREE.Group(); g.add(membrane);
    const shellMat = mat(0x4e9a7a, 0.13), rimMat = mat(0x90c7af, 0.9);
    for (const r of [1.68, 1.65]) {
      const shell = new THREE.Mesh(track(new THREE.SphereGeometry(r, 48, 28, Math.PI, Math.PI)), shellMat);
      shell.scale.set(1, 0.91, 0.83); membrane.add(shell);
      const rim = new THREE.Mesh(track(new THREE.TorusGeometry(r, 0.009, 6, 64)), rimMat); rim.scale.y = 0.91; membrane.add(rim);
    }
    part('cell-membrane', 'Plasma membrane', 'An opened phospholipid-bilayer boundary regulates exchange. The enlarged separation of its surfaces makes the cutaway legible.', membrane);
    const nucleus = buildNucleus(spec); nucleus.scale.setScalar(0.37); nucleus.position.set(-0.27, 0.24, 0.02); g.add(nucleus);
    part('cell-nucleus', 'Nucleus', 'The nucleus houses chromatin and the nucleolus inside a double envelope. This animal cell is shown in interphase, not mitosis.', nucleus);

    const er = new THREE.Group(); er.position.set(-0.63, -0.74, -0.04); g.add(er);
    const erMat = mat(0x628b93), ribMat = mat(0xc8c1a4), ribGeo = track(new THREE.SphereGeometry(0.018, 7, 5));
    function sac(width, thickness, depth, bend, material) {
      const geo = track(new THREE.SphereGeometry(1, 28, 12)), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, width * x, thickness * y + bend * x * x, depth * z); }
      geo.computeVertexNormals(); return new THREE.Mesh(geo, material);
    }
    for (let i = 0; i < 4; i++) {
      const sheet = sac(0.43 - i * 0.023, 0.023, 0.22, 0.045, erMat); sheet.position.set(i * 0.012, i * 0.077, -i * 0.024); er.add(sheet);
      for (let k = 0; k < 16; k++) {
        const a = k * 2.4, r = Math.sqrt((k + 0.5) / 17), x = Math.cos(a) * r * (0.4 - i * 0.023), z = Math.sin(a) * r * 0.19;
        const rib = new THREE.Mesh(ribGeo, ribMat); rib.position.set(x + sheet.position.x, sheet.position.y + 0.029 + 0.045 * (x / 0.43) ** 2, z + sheet.position.z); er.add(rib);
      }
    }
    er.add(tube([[-0.28,0.04,0],[-0.27,0.15,-0.04],[-0.25,0.27,-0.08]], 0.048, erMat));
    const neck = tube([[-0.88,-0.47,-0.12],[-0.83,-0.31,-0.15],[-0.74,-0.10,-0.14]], 0.034, erMat); g.add(neck);
    part('cell-rer', 'Rough ER', 'Flattened connected cisternae carry ribosomes on their cytoplasmic surface. A narrow neck joins the nuclear envelope; the sheets remain outside the nucleus.', er);
    const smooth = new THREE.Group(); g.add(smooth);
    const smoothMat = mat(0x6d9b82);
    [[[-0.20,-0.60,-0.02],[0.03,-0.64,0.04],[0.29,-0.77,0.02],[0.48,-0.91,-0.02]],[[0.03,-0.64,0.04],[0.15,-0.91,-0.06],[0.26,-1.1,0]],[[0.29,-0.77,0.02],[0.48,-0.66,-0.03],[0.65,-0.71,-0.03]]].forEach(p=>smooth.add(tube(p,0.027,smoothMat)));
    part('cell-ser', 'Smooth ER', 'An interconnected membrane-tubule network participates in lipid synthesis and calcium storage. It is continuous with rough ER and lacks attached ribosomes.', smooth);

    const golgi = new THREE.Group(); golgi.position.set(0.69, 0.63, 0.04); golgi.rotation.z = -0.24; g.add(golgi);
    const golgiMat = mat(0xb5a272);
    for (let i = 0; i < 5; i++) { const sheet = sac(0.34 - i * 0.018, 0.024, 0.19, 0.10, golgiMat); sheet.position.y = (i - 2) * 0.083; golgi.add(sheet); }
    part('cell-golgi', 'Golgi apparatus', 'Five flattened cisternae illustrate a Golgi stack, where proteins and lipids are modified and sorted for delivery.', golgi);
    const vesicles = new THREE.Group(); vesicles.position.copy(golgi.position); g.add(vesicles);
    const vesGeo = track(new THREE.SphereGeometry(0.046, 12, 8));
    for (let i = 0; i < 6; i++) { const ves = new THREE.Mesh(vesGeo, golgiMat); ves.position.set(0.32 + (i % 2) * 0.075, -0.15 + i * 0.07, 0.03); vesicles.add(ves); }
    part('cell-vesicles', 'Transport vesicles', 'Small membrane-bound carriers transfer selected cargo between the ER, Golgi and other cellular destinations.', vesicles);

    // Both boundaries are opened. The inner membrane is a single indexed sheet
    // with five radial invaginations; cristae never become disconnected rings.
    const mitoOuterMat = mat(0x83535a), mitoInnerMat = mat(0xc1848b);
    function mitoSurface(a, b, c, folded) {
      const vertices = [], indices = [], nx = 72, np = 24;
      for (let i = 0; i <= nx; i++) for (let j = 0; j <= np; j++) {
        const t = i / nx * Math.PI, p = Math.PI * 0.22 + j / np * Math.PI * 1.56, x = a * Math.cos(t); let fold = 0;
        if (folded) for (let f = 0; f < 5; f++) { const q = Math.abs(x - (-a * 0.62 + f * a * 0.31)) / (a * 0.11); if (q < 1) fold = Math.max(fold, Math.cos(q * Math.PI / 2) ** 2); }
        const radial = Math.sin(t) * (1 - fold * 0.87 * Math.max(0, -Math.sin(p)) ** 3);
        vertices.push(x, b * radial * Math.sin(p), c * radial * Math.cos(p));
      }
      for (let i = 0; i < nx; i++) for (let j = 0; j < np; j++) { const k = i * (np + 1) + j; indices.push(k,k+1,k+np+1,k+1,k+np+2,k+np+1); }
      const geo = track(new THREE.BufferGeometry()); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices,3)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
    }
    const mitoOuter = mitoSurface(0.43,0.19,0.17,false), mitoInner = mitoSurface(0.39,0.155,0.135,true), mitos = new THREE.Group(); g.add(mitos);
    for (const [x,y,z,angle] of [[1.03,-0.04,0.16,0.75],[-1.04,0.68,0.08,-0.45],[0.65,-1.00,0.14,-0.25]]) {
      const m = new THREE.Group(); m.position.set(x,y,z); m.rotation.z = angle; m.add(new THREE.Mesh(mitoOuter,mitoOuterMat),new THREE.Mesh(mitoInner,mitoInnerMat)); mitos.add(m);
    }
    part('cell-mito', 'Mitochondria and cristae', 'Opened outer membranes reveal connected folds of the inner membrane. Respiratory machinery in this membrane couples electron transport to ATP synthesis.', mitos);
    const lysosome = new THREE.Group(); lysosome.position.set(0.65,-0.46,0.24); g.add(lysosome);
    lysosome.add(new THREE.Mesh(track(new THREE.SphereGeometry(0.17,24,16,Math.PI,Math.PI)),mat(0x9b7896)));
    const cargoGeo = track(new THREE.SphereGeometry(0.025,8,6)), cargoMat = mat(0xc4b5b8);
    for (let i=0;i<7;i++) { const cargo=new THREE.Mesh(cargoGeo,cargoMat);cargo.position.set((rnd(i+71)-0.5)*0.17,(rnd(i+91)-0.5)*0.17,-0.02);lysosome.add(cargo); }
    part('cell-lysosome', 'Lysosome', 'This opened acidic compartment contains enzymes that digest and recycle material. The visible cargo is schematic.', lysosome);
    const ribosomes = new THREE.Group(); g.add(ribosomes);
    for (let i=0;i<22;i++) { const a=i*2.39996,r=0.9+rnd(i+107)*0.37;const rib=new THREE.Mesh(ribGeo,ribMat);rib.position.set(Math.cos(a)*r,Math.sin(a)*r*0.88,0.14+rnd(i+129)*0.14);const offset=rib.position.clone().sub(nucleus.position);if(offset.length()<0.68)rib.position.copy(nucleus.position).add(offset.setLength(0.68));ribosomes.add(rib); }
    part('cell-ribosomes', 'Free ribosomes', 'Ribosomes read mRNA and assemble proteins. These enlarged particles represent selected free ribosomes, not their actual number or molecular architecture.', ribosomes);
    const cytoskeleton = new THREE.Group(); g.add(cytoskeleton);const filamentMat=mat(0x5d9078,0.72);
    for(let i=0;i<9;i++){const a=i/9*Math.PI*2;cytoskeleton.add(tube([[0.36,0.14,-0.45],[Math.cos(a)*0.92,Math.sin(a)*0.8,-0.55],[Math.cos(a)*1.4,Math.sin(a)*1.22,-0.16]],0.009,filamentMat));}
    part('cell-cytoskeleton', 'Cytoskeleton', 'Selected fibres illustrate support and intracellular organization. Living cells contain multiple filament systems that continually reorganize.', cytoskeleton);
    // Geometry may be shared freely, but emissive selection must affect only
    // the chosen part. Preserve material reuse within each selectable group.
    const materialOwners = new Map();
    for (const entry of parts) entry.object.traverse(object => {
      for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
        if (!materialOwners.has(material)) materialOwners.set(material, new Set());
        materialOwners.get(material).add(entry.id);
      }
    });
    for (const entry of parts) {
      const isolated = new Map();
      const isolate = material => {
        if (materialOwners.get(material).size < 2) return material;
        if (!isolated.has(material)) isolated.set(material, track(material.clone()));
        return isolated.get(material);
      };
      entry.object.traverse(object => {
        if (object.material) object.material = Array.isArray(object.material) ? object.material.map(isolate) : isolate(object.material);
      });
    }
    g.userData.spin = 0.04;
    g.userData.model = 'Illustrative animal-cell cutaway; colours, counts and dimensions are not microscopy measurements.';
    return g;
  }

  /* -- NUCLEUS: the nuclear envelope full of condensed chromosomes ---------- */
  function buildNucleus(spec) {
    const g = new THREE.Group();
    const parts = g.userData.parts = [], envelope = new THREE.Group(), pores = new THREE.Group(); g.add(envelope,pores);
    const part = (id,label,note,object) => {object.name=id;parts.push({id,label,note,object});};
    // Interphase architecture: two opened membranes, real openings at enlarged
    // pore complexes, diffuse chromatin; no condensed mitotic X chromosomes.
    const poreDirections = [[-0.51,0.68,-0.53],[0.65,0.43,-0.62],[0.42,-0.77,-0.48],[-0.74,-0.41,-0.53]].map(p=>new THREE.Vector3(...p).normalize());
    const outerMat = stageMat(0x527c70,{rough:0.72,side:THREE.DoubleSide}), innerMat = stageMat(0x365e59,{rough:0.7,side:THREE.DoubleSide});
    for (const [radius,material] of [[1.6,outerMat],[1.52,innerMat]]) {
      const geo=track(new THREE.SphereGeometry(radius,48,32,Math.PI,Math.PI)),position=geo.attributes.position,indices=geo.index.array,kept=[],center=new THREE.Vector3(),v=new THREE.Vector3();
      for(let i=0;i<indices.length;i+=3){center.set(0,0,0);for(let j=0;j<3;j++)center.add(v.fromBufferAttribute(position,indices[i+j]));center.normalize();if(!poreDirections.some(p=>center.distanceToSquared(p)<0.0144))kept.push(indices[i],indices[i+1],indices[i+2]);}
      geo.setIndex(kept);geo.computeVertexNormals();envelope.add(new THREE.Mesh(geo,material));
      const rim=new THREE.Mesh(track(new THREE.TorusGeometry(radius,0.018,6,80)),material);envelope.add(rim);
    }
    part('nucleus-envelope','Double nuclear envelope','Two membranes separate the nucleus from the cytoplasm. The outer membrane is continuous with ER; the front opening exposes the interior for inspection.',envelope);
    const poreGeo=track(new THREE.TorusGeometry(0.15,0.034,8,18)),poreMat=stageMat(0xa0bdab,{rough:0.64}),zAxis=new THREE.Vector3(0,0,1);
    for(const direction of poreDirections){const pore=new THREE.Mesh(poreGeo,poreMat);pore.position.copy(direction).multiplyScalar(1.56);pore.quaternion.setFromUnitVectors(zAxis,direction);pores.add(pore);}
    part('nucleus-pores','Nuclear pore complexes','Protein-lined openings regulate molecular exchange between nucleus and cytoplasm. Four representative complexes are greatly enlarged; they are not a cell-specific pore count.',pores);
    const chromatin=new THREE.Group(),compact=new THREE.Group();g.add(chromatin,compact);
    const chromatinMat=stageMat(0x89bfc2,{rough:0.74,emissive:0x173e40,emissiveIntensity:0.15}),compactMat=stageMat(0x698c91,{rough:0.78});
    for(let strand=0;strand<18;strand++){
      const points=[];
      for(let k=0;k<=22;k++){
        const u=k/22,a=strand*2.39996+u*5.2,base=0.56+0.25*rnd(strand+57),r=base+0.13*Math.sin(u*13+strand),y=(u-0.5)*1.8;
        points.push(new THREE.Vector3(Math.cos(a)*r,y+0.08*Math.sin(a*2),Math.sin(a)*r*0.72));
      }
      const fiber=new THREE.Mesh(track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),88,0.018,5,false)),chromatinMat);chromatin.add(fiber);
    }
    part('nucleus-chromatin','Interphase chromatin','DNA and associated proteins occupy chromosome territories as folded chromatin. These illustrative paths are not a sequenced genome or condensed dividing chromosomes.',chromatin);
    // Peripheral, locally denser chromatin remains continuous material; these
    // coils illustrate packing variation, not a universal chromatin fibre size.
    for(let strand=0;strand<5;strand++){
      const a=strand/5*Math.PI*2,points=[];
      for(let k=0;k<=36;k++){const u=k/36,th=u*Math.PI*5;points.push(new THREE.Vector3(Math.cos(a)*1.15+Math.cos(th)*0.105,Math.sin(a)*1.15+(u-0.5)*0.21,-0.45+Math.sin(th)*0.08));}
      compact.add(new THREE.Mesh(track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),72,0.026,5,false)),compactMat));
    }
    part('nucleus-packed','More compact chromatin','Some chromatin is more densely packed, often near the nuclear periphery. Packing and gene activity vary; these short coils are schematic examples.',compact);
    const nucleolus=new THREE.Group();nucleolus.position.set(0.30,-0.04,0.38);g.add(nucleolus);
    const body=new THREE.Mesh(track(new THREE.SphereGeometry(0.34,28,20)),stageMat(0xb3a276,{rough:0.8}));body.scale.set(1,0.93,0.9);nucleolus.add(body);
    const grainGeo=track(new THREE.SphereGeometry(0.037,8,6)),grainMat=stageMat(0xcbb992,{rough:0.8});
    for(let i=0;i<18;i++){const y=1-2*(i+0.5)/18,a=i*2.39996,r=Math.sqrt(1-y*y);const grain=new THREE.Mesh(grainGeo,grainMat);grain.position.set(Math.cos(a)*r*.318,y*.298,Math.sin(a)*r*.282);nucleolus.add(grain);}
    part('nucleus-nucleolus','Nucleolus','A membrane-free nuclear region makes ribosomal RNA and assembles ribosomal subunits. Its visible granular texture is illustrative.',nucleolus);
    g.userData.spin = 0.045;
    g.userData.model = 'Schematic interphase nucleus; pore sizes, chromatin paths and colours are illustrative.';
    return g;
  }

  /* -- DNA: the B-form double helix, base pairs coloured -------------------- */
  function buildDNA(spec) {
    const g = buildZoomDna(false);
    g.rotation.set(0, -0.25, 0.08);
    g.userData.spin = 0.18;
    g.userData.spinAxis = 'y';
    return g;
  }

  function buildBasePair(spec) {
    const g = buildZoomDna(true);
    g.rotation.x = 0.10;
    g.userData.spin = 0.04;
    g.userData.spinAxis = 'y';
    return g;
  }

  // Coordinate provenance: https://www.rcsb.org/structure/1BNA (Drew et al., 1981).
  // DNA heavy atoms only; 80 waters and all hydrogens are omitted.
  // Original PDB SHA-256: df42f1506792f191b957227b061360652adcf6f813eb69d9ec553067ea584670
  // Copied exactly from src/universe/stage_molecular.js, not a synthetic helix.
  // This crystal's local twist varies; 10.5 bp/turn is not imposed on its geometry.
  function zoomDnaSource() {
    if (!zoomDnaSource.value) zoomDnaSource.value = {"pdb":"1BNA","sha256":"df42f1506792f191b957227b061360652adcf6f813eb69d9ec553067ea584670","atoms":[
      ["A",1,"DC","O5'","O",18.935,34.195,25.617],
      ["A",1,"DC","C5'","C",19.13,33.921,24.219],
      ["A",1,"DC","C4'","C",19.961,32.668,24.1],
      ["A",1,"DC","O4'","O",19.36,31.583,24.852],
      ["A",1,"DC","C3'","C",20.172,32.122,22.694],
      ["A",1,"DC","O3'","O",21.35,31.325,22.681],
      ["A",1,"DC","C2'","C",18.948,31.223,22.647],
      ["A",1,"DC","C1'","C",19.231,30.482,23.944],
      ["A",1,"DC","N1","N",18.07,29.661,24.38],
      ["A",1,"DC","C2","C",18.224,28.454,25.015],
      ["A",1,"DC","O2","O",19.36,28.014,25.214],
      ["A",1,"DC","N3","N",17.143,27.761,25.377],
      ["A",1,"DC","C4","C",15.917,28.226,25.12],
      ["A",1,"DC","N4","N",14.828,27.477,25.444],
      ["A",1,"DC","C5","C",15.719,29.442,24.471],
      ["A",1,"DC","C6","C",16.843,30.171,24.101],
      ["A",2,"DG","P","P",22.409,31.286,21.483],
      ["A",2,"DG","OP1","O",23.536,32.157,21.851],
      ["A",2,"DG","OP2","O",21.822,31.459,20.139],
      ["A",2,"DG","O5'","O",22.84,29.751,21.498],
      ["A",2,"DG","C5'","C",23.543,29.175,22.594],
      ["A",2,"DG","C4'","C",23.494,27.709,22.279],
      ["A",2,"DG","O4'","O",22.193,27.252,22.674],
      ["A",2,"DG","C3'","C",23.693,27.325,20.807],
      ["A",2,"DG","O3'","O",24.723,26.32,20.653],
      ["A",2,"DG","C2'","C",22.273,26.885,20.416],
      ["A",2,"DG","C1'","C",21.721,26.304,21.716],
      ["A",2,"DG","N9","N",20.237,26.47,21.78],
      ["A",2,"DG","C8","C",19.526,27.584,21.429],
      ["A",2,"DG","N7","N",18.207,27.455,21.636],
      ["A",2,"DG","C5","C",18.083,26.212,22.142],
      ["A",2,"DG","C6","C",16.904,25.525,22.545],
      ["A",2,"DG","O6","O",15.739,25.916,22.518],
      ["A",2,"DG","N1","N",17.197,24.279,23.037],
      ["A",2,"DG","C2","C",18.434,23.717,23.155],
      ["A",2,"DG","N2","N",18.508,22.456,23.668],
      ["A",2,"DG","N3","N",19.537,24.36,22.77],
      ["A",2,"DG","C4","C",19.29,25.594,22.274],
      ["A",3,"DC","P","P",25.064,25.621,19.252],
      ["A",3,"DC","OP1","O",26.506,25.316,19.22],
      ["A",3,"DC","OP2","O",24.559,26.412,18.115],
      ["A",3,"DC","O5'","O",24.26,24.246,19.327],
      ["A",3,"DC","C5'","C",24.584,23.285,20.335],
      ["A",3,"DC","C4'","C",23.523,22.233,20.245],
      ["A",3,"DC","O4'","O",22.256,22.844,20.453],
      ["A",3,"DC","C3'","C",23.424,21.557,18.903],
      ["A",3,"DC","O3'","O",24.121,20.309,18.928],
      ["A",3,"DC","C2'","C",21.93,21.406,18.661],
      ["A",3,"DC","C1'","C",21.278,21.966,19.909],
      ["A",3,"DC","N1","N",20.196,22.889,19.521],
      ["A",3,"DC","C2","C",18.909,22.584,19.816],
      ["A",3,"DC","O2","O",18.685,21.512,20.382],
      ["A",3,"DC","N3","N",17.935,23.447,19.502],
      ["A",3,"DC","C4","C",18.217,24.603,18.897],
      ["A",3,"DC","N4","N",17.221,25.499,18.629],
      ["A",3,"DC","C5","C",19.526,24.945,18.571],
      ["A",3,"DC","C6","C",20.537,24.048,18.899],
      ["A",4,"DG","P","P",24.249,19.412,17.617],
      ["A",4,"DG","OP1","O",25.42,18.535,17.765],
      ["A",4,"DG","OP2","O",24.208,20.296,16.44],
      ["A",4,"DG","O5'","O",22.931,18.537,17.67],
      ["A",4,"DG","C5'","C",22.714,17.625,18.753],
      ["A",4,"DG","C4'","C",21.393,16.96,18.505],
      ["A",4,"DG","O4'","O",20.353,17.952,18.496],
      ["A",4,"DG","C3'","C",21.264,16.229,17.176],
      ["A",4,"DG","O3'","O",20.284,15.214,17.238],
      ["A",4,"DG","C2'","C",20.793,17.368,16.288],
      ["A",4,"DG","C1'","C",19.716,17.901,17.218],
      ["A",4,"DG","N9","N",19.305,19.281,16.869],
      ["A",4,"DG","C8","C",20.017,20.263,16.232],
      ["A",4,"DG","N7","N",19.313,21.394,16.077],
      ["A",4,"DG","C5","C",18.121,21.1,16.635],
      ["A",4,"DG","C6","C",16.952,21.904,16.749],
      ["A",4,"DG","O6","O",16.769,23.057,16.368],
      ["A",4,"DG","N1","N",15.933,21.214,17.352],
      ["A",4,"DG","C2","C",15.972,19.93,17.816],
      ["A",4,"DG","N2","N",14.831,19.416,18.353],
      ["A",4,"DG","N3","N",17.068,19.179,17.717],
      ["A",4,"DG","C4","C",18.084,19.825,17.121],
      ["A",5,"DA","P","P",20.356,13.969,16.245],
      ["A",5,"DA","OP1","O",21.116,12.891,16.892],
      ["A",5,"DA","OP2","O",20.837,14.423,14.91],
      ["A",5,"DA","O5'","O",18.81,13.581,16.161],
      ["A",5,"DA","C5'","C",18.015,13.569,17.362],
      ["A",5,"DA","C4'","C",16.672,14.088,16.957],
      ["A",5,"DA","O4'","O",16.842,15.447,16.561],
      ["A",5,"DA","C3'","C",16.019,13.393,15.764],
      ["A",5,"DA","O3'","O",14.762,12.796,16.12],
      ["A",5,"DA","C2'","C",15.952,14.498,14.696],
      ["A",5,"DA","C1'","C",15.851,15.732,15.569],
      ["A",5,"DA","N9","N",16.391,16.916,14.867],
      ["A",5,"DA","C8","C",17.658,17.103,14.382],
      ["A",5,"DA","N7","N",17.863,18.346,13.913],
      ["A",5,"DA","C5","C",16.673,18.953,14.098],
      ["A",5,"DA","C6","C",16.23,20.279,13.819],
      ["A",5,"DA","N6","N",17.045,21.222,13.268],
      ["A",5,"DA","N1","N",14.966,20.578,14.118],
      ["A",5,"DA","C2","C",14.178,19.652,14.669],
      ["A",5,"DA","N3","N",14.463,18.392,14.984],
      ["A",5,"DA","C4","C",15.75,18.11,14.661],
      ["A",6,"DA","P","P",13.866,12.006,15.063],
      ["A",6,"DA","OP1","O",13.028,11.039,15.8],
      ["A",6,"DA","OP2","O",14.715,11.499,13.968],
      ["A",6,"DA","O5'","O",12.879,13.111,14.48],
      ["A",6,"DA","C5'","C",11.802,13.597,15.29],
      ["A",6,"DA","C4'","C",11.111,14.603,14.435],
      ["A",6,"DA","O4'","O",12.152,15.46,13.962],
      ["A",6,"DA","C3'","C",10.417,14.07,13.187],
      ["A",6,"DA","O3'","O",9.007,14.369,13.181],
      ["A",6,"DA","C2'","C",11.24,14.692,12.061],
      ["A",6,"DA","C1'","C",11.699,15.974,12.719],
      ["A",6,"DA","N9","N",12.918,16.526,12.078],
      ["A",6,"DA","C8","C",14.115,15.899,11.868],
      ["A",6,"DA","N7","N",15.049,16.714,11.356],
      ["A",6,"DA","C5","C",14.416,17.901,11.246],
      ["A",6,"DA","C6","C",14.873,19.187,10.815],
      ["A",6,"DA","N6","N",16.161,19.418,10.427],
      ["A",6,"DA","N1","N",13.999,20.191,10.852],
      ["A",6,"DA","C2","C",12.753,19.962,11.272],
      ["A",6,"DA","N3","N",12.21,18.824,11.698],
      ["A",6,"DA","C4","C",13.116,17.823,11.657],
      ["A",7,"DT","P","P",8.081,14.05,11.915],
      ["A",7,"DT","OP1","O",6.668,13.96,12.342],
      ["A",7,"DT","OP2","O",8.6,12.894,11.137],
      ["A",7,"DT","O5'","O",8.239,15.387,11.076],
      ["A",7,"DT","C5'","C",7.907,16.635,11.686],
      ["A",7,"DT","C4'","C",8.162,17.628,10.598],
      ["A",7,"DT","O4'","O",9.543,17.58,10.279],
      ["A",7,"DT","C3'","C",7.461,17.284,9.296],
      ["A",7,"DT","O3'","O",6.251,18.034,9.162],
      ["A",7,"DT","C2'","C",8.532,17.527,8.223],
      ["A",7,"DT","C1'","C",9.644,18.209,9.019],
      ["A",7,"DT","N1","N",11.021,17.903,8.565],
      ["A",7,"DT","C2","C",11.822,18.923,8.176],
      ["A",7,"DT","O2","O",11.383,20.077,8.143],
      ["A",7,"DT","N3","N",13.119,18.641,7.852],
      ["A",7,"DT","C4","C",13.633,17.372,7.882],
      ["A",7,"DT","O4","O",14.83,17.222,7.619],
      ["A",7,"DT","C5","C",12.781,16.325,8.235],
      ["A",7,"DT","C7","C",13.269,14.902,8.236],
      ["A",7,"DT","C6","C",11.465,16.616,8.594],
      ["A",8,"DT","P","P",5.384,17.99,7.824],
      ["A",8,"DT","OP1","O",4.025,18.444,8.18],
      ["A",8,"DT","OP2","O",5.458,16.668,7.16],
      ["A",8,"DT","O5'","O",6.086,19.118,6.927],
      ["A",8,"DT","C5'","C",6.146,20.478,7.418],
      ["A",8,"DT","C4'","C",6.995,21.229,6.438],
      ["A",8,"DT","O4'","O",8.188,20.458,6.284],
      ["A",8,"DT","C3'","C",6.418,21.332,5.029],
      ["A",8,"DT","O3'","O",5.967,22.667,4.696],
      ["A",8,"DT","C2'","C",7.513,20.718,4.139],
      ["A",8,"DT","C1'","C",8.736,20.855,5.034],
      ["A",8,"DT","N1","N",9.823,19.876,4.759],
      ["A",8,"DT","C2","C",11.086,20.316,4.494],
      ["A",8,"DT","O2","O",11.324,21.516,4.389],
      ["A",8,"DT","N3","N",12.094,19.403,4.412],
      ["A",8,"DT","C4","C",11.876,18.06,4.551],
      ["A",8,"DT","O4","O",12.858,17.317,4.503],
      ["A",8,"DT","C5","C",10.569,17.611,4.765],
      ["A",8,"DT","C7","C",10.261,16.14,4.896],
      ["A",8,"DT","C6","C",9.545,18.548,4.904],
      ["A",9,"DC","P","P",5.531,23.071,3.209],
      ["A",9,"DC","OP1","O",4.648,24.244,3.269],
      ["A",9,"DC","OP2","O",5.01,21.905,2.47],
      ["A",9,"DC","O5'","O",6.926,23.547,2.611],
      ["A",9,"DC","C5'","C",7.636,24.627,3.249],
      ["A",9,"DC","C4'","C",8.897,24.853,2.457],
      ["A",9,"DC","O4'","O",9.638,23.627,2.448],
      ["A",9,"DC","C3'","C",8.717,25.24,0.998],
      ["A",9,"DC","O3'","O",9.47,26.414,0.667],
      ["A",9,"DC","C2'","C",9.126,23.965,0.253],
      ["A",9,"DC","C1'","C",10.241,23.483,1.157],
      ["A",9,"DC","N1","N",10.524,22.022,1.015],
      ["A",9,"DC","C2","C",11.814,21.603,0.84],
      ["A",9,"DC","O2","O",12.691,22.447,0.67],
      ["A",9,"DC","N3","N",12.106,20.297,0.873],
      ["A",9,"DC","C4","C",11.141,19.395,1.046],
      ["A",9,"DC","N4","N",11.461,18.075,1.089],
      ["A",9,"DC","C5","C",9.803,19.775,1.177],
      ["A",9,"DC","C6","C",9.499,21.133,1.167],
      ["A",10,"DG","P","P",9.055,27.333,-0.581],
      ["A",10,"DG","OP1","O",9.496,28.717,-0.258],
      ["A",10,"DG","OP2","O",7.632,27.106,-0.947],
      ["A",10,"DG","O5'","O",9.954,26.765,-1.771],
      ["A",10,"DG","C5'","C",11.382,26.94,-1.72],
      ["A",10,"DG","C4'","C",11.972,26.09,-2.802],
      ["A",10,"DG","O4'","O",11.802,24.724,-2.404],
      ["A",10,"DG","C3'","C",11.327,26.178,-4.188],
      ["A",10,"DG","O3'","O",12.311,26.096,-5.214],
      ["A",10,"DG","C2'","C",10.414,24.962,-4.186],
      ["A",10,"DG","C1'","C",11.429,24.028,-3.587],
      ["A",10,"DG","N9","N",10.89,22.713,-3.2],
      ["A",10,"DG","C8","C",9.616,22.315,-2.91],
      ["A",10,"DG","N7","N",9.541,21.009,-2.613],
      ["A",10,"DG","C5","C",10.818,20.588,-2.718],
      ["A",10,"DG","C6","C",11.376,19.292,-2.511],
      ["A",10,"DG","O6","O",10.813,18.252,-2.179],
      ["A",10,"DG","N1","N",12.729,19.299,-2.72],
      ["A",10,"DG","C2","C",13.498,20.365,-3.082],
      ["A",10,"DG","N2","N",14.834,20.169,-3.237],
      ["A",10,"DG","N3","N",12.982,21.573,-3.267],
      ["A",10,"DG","C4","C",11.656,21.601,-3.061],
      ["A",11,"DC","P","P",12.763,27.421,-5.98],
      ["A",11,"DC","OP1","O",12.796,28.572,-5.049],
      ["A",11,"DC","OP2","O",11.886,27.542,-7.164],
      ["A",11,"DC","O5'","O",14.272,27.086,-6.366],
      ["A",11,"DC","C5'","C",15.275,27.108,-5.318],
      ["A",11,"DC","C4'","C",16.222,25.946,-5.51],
      ["A",11,"DC","O4'","O",15.443,24.754,-5.397],
      ["A",11,"DC","C3'","C",16.942,25.827,-6.848],
      ["A",11,"DC","O3'","O",18.34,25.511,-6.701],
      ["A",11,"DC","C2'","C",16.118,24.767,-7.578],
      ["A",11,"DC","C1'","C",15.856,23.836,-6.414],
      ["A",11,"DC","N1","N",14.672,22.975,-6.637],
      ["A",11,"DC","C2","C",14.802,21.628,-6.529],
      ["A",11,"DC","O2","O",15.924,21.178,-6.314],
      ["A",11,"DC","N3","N",13.723,20.842,-6.627],
      ["A",11,"DC","C4","C",12.515,21.373,-6.836],
      ["A",11,"DC","N4","N",11.41,20.574,-6.872],
      ["A",11,"DC","C5","C",12.348,22.744,-6.978],
      ["A",11,"DC","C6","C",13.47,23.558,-6.869],
      ["A",12,"DG","P","P",19.331,25.774,-7.925],
      ["A",12,"DG","OP1","O",20.704,25.976,-7.408],
      ["A",12,"DG","OP2","O",18.763,26.851,-8.758],
      ["A",12,"DG","O5'","O",19.302,24.412,-8.763],
      ["A",12,"DG","C5'","C",20.109,23.284,-8.359],
      ["A",12,"DG","C4'","C",19.748,22.167,-9.299],
      ["A",12,"DG","O4'","O",18.35,21.969,-9.139],
      ["A",12,"DG","C3'","C",19.921,22.404,-10.815],
      ["A",12,"DG","O3'","O",20.985,21.635,-11.401],
      ["A",12,"DG","C2'","C",18.535,22.062,-11.381],
      ["A",12,"DG","C1'","C",17.965,21.2,-10.269],
      ["A",12,"DG","N9","N",16.493,21.22,-10.265],
      ["A",12,"DG","C8","C",15.663,22.289,-10.478],
      ["A",12,"DG","N7","N",14.368,21.958,-10.39],
      ["A",12,"DG","C5","C",14.388,20.64,-10.102],
      ["A",12,"DG","C6","C",13.301,19.742,-9.856],
      ["A",12,"DG","O6","O",12.091,19.967,-9.857],
      ["A",12,"DG","N1","N",13.75,18.466,-9.625],
      ["A",12,"DG","C2","C",15.042,18.043,-9.605],
      ["A",12,"DG","N2","N",15.259,16.717,-9.406],
      ["A",12,"DG","N3","N",16.061,18.885,-9.792],
      ["A",12,"DG","C4","C",15.66,20.156,-10.027],
      ["B",13,"DC","O5'","O",7.458,11.884,-9.07],
      ["B",13,"DC","C5'","C",8.252,10.968,-9.854],
      ["B",13,"DC","C4'","C",9.714,11.141,-9.512],
      ["B",13,"DC","O4'","O",10.144,12.455,-9.908],
      ["B",13,"DC","C3'","C",10.103,10.989,-8.055],
      ["B",13,"DC","O3'","O",11.293,10.221,-7.904],
      ["B",13,"DC","C2'","C",10.254,12.437,-7.607],
      ["B",13,"DC","C1'","C",10.896,13.044,-8.837],
      ["B",13,"DC","N1","N",10.575,14.487,-8.944],
      ["B",13,"DC","C2","C",11.559,15.43,-9.006],
      ["B",13,"DC","O2","O",12.725,15.066,-8.932],
      ["B",13,"DC","N3","N",11.246,16.714,-9.193],
      ["B",13,"DC","C4","C",9.98,17.088,-9.334],
      ["B",13,"DC","N4","N",9.698,18.395,-9.589],
      ["B",13,"DC","C5","C",8.939,16.162,-9.274],
      ["B",13,"DC","C6","C",9.265,14.824,-9.08],
      ["B",14,"DG","P","P",11.602,9.51,-6.502],
      ["B",14,"DG","OP1","O",11.666,8.032,-6.664],
      ["B",14,"DG","OP2","O",10.644,10.01,-5.494],
      ["B",14,"DG","O5'","O",13.051,10.094,-6.177],
      ["B",14,"DG","C5'","C",14.1,10.021,-7.156],
      ["B",14,"DG","C4'","C",15.113,10.992,-6.657],
      ["B",14,"DG","O4'","O",14.556,12.3,-6.755],
      ["B",14,"DG","C3'","C",15.445,10.806,-5.189],
      ["B",14,"DG","O3'","O",16.836,10.56,-5.013],
      ["B",14,"DG","C2'","C",14.937,12.1,-4.529],
      ["B",14,"DG","C1'","C",15.058,13.086,-5.671],
      ["B",14,"DG","N9","N",14.036,14.14,-5.536],
      ["B",14,"DG","C8","C",12.71,13.957,-5.259],
      ["B",14,"DG","N7","N",12.016,15.103,-5.269],
      ["B",14,"DG","C5","C",12.937,16.041,-5.558],
      ["B",14,"DG","C6","C",12.761,17.451,-5.71],
      ["B",14,"DG","O6","O",11.723,18.111,-5.63],
      ["B",14,"DG","N1","N",13.952,18.079,-5.973],
      ["B",14,"DG","C2","C",15.171,17.485,-6.107],
      ["B",14,"DG","N2","N",16.244,18.292,-6.325],
      ["B",14,"DG","N3","N",15.329,16.161,-5.986],
      ["B",14,"DG","C4","C",14.179,15.499,-5.721],
      ["B",15,"DC","P","P",17.478,10.38,-3.569],
      ["B",15,"DC","OP1","O",18.665,9.516,-3.729],
      ["B",15,"DC","OP2","O",16.427,9.94,-2.633],
      ["B",15,"DC","O5'","O",17.957,11.865,-3.208],
      ["B",15,"DC","C5'","C",18.963,12.531,-3.996],
      ["B",15,"DC","C4'","C",18.936,13.958,-3.536],
      ["B",15,"DC","O4'","O",17.592,14.409,-3.622],
      ["B",15,"DC","C3'","C",19.253,14.139,-2.066],
      ["B",15,"DC","O3'","O",20.659,14.219,-1.858],
      ["B",15,"DC","C2'","C",18.52,15.417,-1.728],
      ["B",15,"DC","C1'","C",17.545,15.602,-2.872],
      ["B",15,"DC","N1","N",16.145,15.696,-2.428],
      ["B",15,"DC","C2","C",15.507,16.886,-2.558],
      ["B",15,"DC","O2","O",16.162,17.846,-2.957],
      ["B",15,"DC","N3","N",14.209,16.983,-2.264],
      ["B",15,"DC","C4","C",13.536,15.919,-1.825],
      ["B",15,"DC","N4","N",12.205,16.017,-1.553],
      ["B",15,"DC","C5","C",14.164,14.689,-1.652],
      ["B",15,"DC","C6","C",15.509,14.584,-1.979],
      ["B",16,"DG","P","P",21.304,14.529,-0.436],
      ["B",16,"DG","OP1","O",22.696,14.087,-0.524],
      ["B",16,"DG","OP2","O",20.488,13.954,0.65],
      ["B",16,"DG","O5'","O",21.306,16.117,-0.363],
      ["B",16,"DG","C5'","C",22.177,16.876,-1.212],
      ["B",16,"DG","C4'","C",21.739,18.292,-1.021],
      ["B",16,"DG","O4'","O",20.305,18.225,-1.048],
      ["B",16,"DG","C3'","C",22.101,18.959,0.293],
      ["B",16,"DG","O3'","O",22.592,20.293,0.097],
      ["B",16,"DG","C2'","C",20.82,18.829,1.121],
      ["B",16,"DG","C1'","C",19.765,18.985,0.046],
      ["B",16,"DG","N9","N",18.513,18.299,0.468],
      ["B",16,"DG","C8","C",18.363,17.062,1.039],
      ["B",16,"DG","N7","N",17.08,16.744,1.281],
      ["B",16,"DG","C5","C",16.4,17.832,0.868],
      ["B",16,"DG","C6","C",14.996,18.09,0.882],
      ["B",16,"DG","O6","O",14.082,17.378,1.28],
      ["B",16,"DG","N1","N",14.712,19.349,0.418],
      ["B",16,"DG","C2","C",15.606,20.268,-0.027],
      ["B",16,"DG","N2","N",15.134,21.493,-0.382],
      ["B",16,"DG","N3","N",16.912,20.017,-0.072],
      ["B",16,"DG","C4","C",17.236,18.794,0.384],
      ["B",17,"DA","P","P",22.904,21.238,1.339],
      ["B",17,"DA","OP1","O",23.994,22.183,1.025],
      ["B",17,"DA","OP2","O",23.104,20.39,2.538],
      ["B",17,"DA","O5'","O",21.577,22.107,1.39],
      ["B",17,"DA","C5'","C",21.216,22.833,0.2],
      ["B",17,"DA","C4'","C",20.101,23.788,0.484],
      ["B",17,"DA","O4'","O",18.913,23.054,0.816],
      ["B",17,"DA","C3'","C",20.347,24.743,1.633],
      ["B",17,"DA","O3'","O",19.732,26.01,1.411],
      ["B",17,"DA","C2'","C",19.752,23.945,2.791],
      ["B",17,"DA","C1'","C",18.497,23.393,2.145],
      ["B",17,"DA","N9","N",18.079,22.095,2.758],
      ["B",17,"DA","C8","C",18.847,21.02,3.133],
      ["B",17,"DA","N7","N",18.114,19.984,3.584],
      ["B",17,"DA","C5","C",16.842,20.424,3.488],
      ["B",17,"DA","C6","C",15.577,19.817,3.786],
      ["B",17,"DA","N6","N",15.448,18.537,4.242],
      ["B",17,"DA","N1","N",14.482,20.557,3.593],
      ["B",17,"DA","C2","C",14.597,21.801,3.118],
      ["B",17,"DA","N3","N",15.7,22.472,2.783],
      ["B",17,"DA","C4","C",16.791,21.706,3.002],
      ["B",18,"DA","P","P",19.803,27.141,2.526],
      ["B",18,"DA","OP1","O",19.796,28.478,1.888],
      ["B",18,"DA","OP2","O",20.953,26.858,3.426],
      ["B",18,"DA","O5'","O",18.396,26.939,3.241],
      ["B",18,"DA","C5'","C",17.203,27.028,2.452],
      ["B",18,"DA","C4'","C",16.035,26.958,3.388],
      ["B",18,"DA","O4'","O",15.856,25.612,3.85],
      ["B",18,"DA","C3'","C",16.101,27.861,4.615],
      ["B",18,"DA","O3'","O",14.89,28.608,4.757],
      ["B",18,"DA","C2'","C",16.368,26.844,5.724],
      ["B",18,"DA","C1'","C",15.561,25.655,5.243],
      ["B",18,"DA","N9","N",16.104,24.373,5.755],
      ["B",18,"DA","C8","C",17.411,23.967,5.83],
      ["B",18,"DA","N7","N",17.539,22.706,6.276],
      ["B",18,"DA","C5","C",16.266,22.309,6.48],
      ["B",18,"DA","C6","C",15.715,21.073,6.933],
      ["B",18,"DA","N6","N",16.483,19.994,7.243],
      ["B",18,"DA","N1","N",14.389,20.994,7.036],
      ["B",18,"DA","C2","C",13.636,22.041,6.708],
      ["B",18,"DA","N3","N",14.019,23.234,6.265],
      ["B",18,"DA","C4","C",15.367,23.291,6.174],
      ["B",19,"DT","P","P",14.604,29.545,6.02],
      ["B",19,"DT","OP1","O",13.792,30.696,5.582],
      ["B",19,"DT","OP2","O",15.852,29.836,6.749],
      ["B",19,"DT","O5'","O",13.633,28.628,6.885],
      ["B",19,"DT","C5'","C",12.398,28.171,6.303],
      ["B",19,"DT","C4'","C",11.809,27.217,7.302],
      ["B",19,"DT","O4'","O",12.767,26.184,7.534],
      ["B",19,"DT","C3'","C",11.515,27.822,8.669],
      ["B",19,"DT","O3'","O",10.103,27.952,8.891],
      ["B",19,"DT","C2'","C",12.267,26.906,9.63],
      ["B",19,"DT","C1'","C",12.426,25.645,8.799],
      ["B",19,"DT","N1","N",13.609,24.85,9.205],
      ["B",19,"DT","C2","C",13.442,23.575,9.656],
      ["B",19,"DT","O2","O",12.311,23.101,9.802],
      ["B",19,"DT","N3","N",14.551,22.825,9.913],
      ["B",19,"DT","C4","C",15.815,23.321,9.777],
      ["B",19,"DT","O4","O",16.755,22.57,10.029],
      ["B",19,"DT","C5","C",15.972,24.647,9.362],
      ["B",19,"DT","C7","C",17.345,25.239,9.234],
      ["B",19,"DT","C6","C",14.844,25.405,9.048],
      ["B",20,"DT","P","P",9.513,28.533,10.26],
      ["B",20,"DT","OP1","O",8.145,29.007,9.998],
      ["B",20,"DT","OP2","O",10.455,29.513,10.841],
      ["B",20,"DT","O5'","O",9.395,27.223,11.153],
      ["B",20,"DT","C5'","C",8.576,26.148,10.664],
      ["B",20,"DT","C4'","C",8.655,25.06,11.678],
      ["B",20,"DT","O4'","O",10.003,24.615,11.764],
      ["B",20,"DT","C3'","C",8.272,25.471,13.087],
      ["B",20,"DT","O3'","O",7.199,24.657,13.553],
      ["B",20,"DT","C2'","C",9.586,25.307,13.86],
      ["B",20,"DT","C1'","C",10.19,24.148,13.089],
      ["B",20,"DT","N1","N",11.66,24.07,13.205],
      ["B",20,"DT","C2","C",12.257,22.88,13.486],
      ["B",20,"DT","O2","O",11.583,21.866,13.691],
      ["B",20,"DT","N3","N",13.62,22.829,13.497],
      ["B",20,"DT","C4","C",14.402,23.914,13.225],
      ["B",20,"DT","O4","O",15.625,23.764,13.252],
      ["B",20,"DT","C5","C",13.774,25.126,12.933],
      ["B",20,"DT","C7","C",14.563,26.358,12.612],
      ["B",20,"DT","C6","C",12.385,25.187,12.926],
      ["B",21,"DC","P","P",6.594,24.823,15.016],
      ["B",21,"DC","OP1","O",5.169,24.424,14.987],
      ["B",21,"DC","OP2","O",6.87,26.189,15.511],
      ["B",21,"DC","O5'","O",7.409,23.731,15.839],
      ["B",21,"DC","C5'","C",7.331,22.352,15.433],
      ["B",21,"DC","C4'","C",8.1,21.598,16.461],
      ["B",21,"DC","O4'","O",9.478,21.902,16.263],
      ["B",21,"DC","C3'","C",7.766,22.045,17.879],
      ["B",21,"DC","O3'","O",7.036,21.041,18.611],
      ["B",21,"DC","C2'","C",9.123,22.414,18.469],
      ["B",21,"DC","C1'","C",10.107,21.743,17.523],
      ["B",21,"DC","N1","N",11.328,22.556,17.331],
      ["B",21,"DC","C2","C",12.534,21.939,17.329],
      ["B",21,"DC","O2","O",12.56,20.731,17.579],
      ["B",21,"DC","N3","N",13.639,22.639,17.035],
      ["B",21,"DC","C4","C",13.56,23.938,16.739],
      ["B",21,"DC","N4","N",14.685,24.628,16.404],
      ["B",21,"DC","C5","C",12.338,24.609,16.736],
      ["B",21,"DC","C6","C",11.193,23.878,17.035],
      ["B",22,"DG","P","P",6.509,21.324,20.099],
      ["B",22,"DG","OP1","O",5.387,20.397,20.396],
      ["B",22,"DG","OP2","O",6.235,22.774,20.306],
      ["B",22,"DG","O5'","O",7.767,20.924,20.993],
      ["B",22,"DG","C5'","C",8.216,19.559,21.073],
      ["B",22,"DG","C4'","C",9.422,19.557,21.977],
      ["B",22,"DG","O4'","O",10.493,20.26,21.319],
      ["B",22,"DG","C3'","C",9.267,20.267,23.325],
      ["B",22,"DG","O3'","O",10.088,19.657,24.293],
      ["B",22,"DG","C2'","C",9.751,21.67,22.99],
      ["B",22,"DG","C1'","C",10.988,21.226,22.256],
      ["B",22,"DG","N9","N",11.599,22.357,21.543],
      ["B",22,"DG","C8","C",11.037,23.545,21.159],
      ["B",22,"DG","N7","N",11.921,24.362,20.566],
      ["B",22,"DG","C5","C",13.072,23.653,20.58],
      ["B",22,"DG","C6","C",14.37,24.003,20.102],
      ["B",22,"DG","O6","O",14.747,25.057,19.585],
      ["B",22,"DG","N1","N",15.268,22.983,20.308],
      ["B",22,"DG","C2","C",15.023,21.776,20.891],
      ["B",22,"DG","N2","N",16.066,20.914,21.038],
      ["B",22,"DG","N3","N",13.815,21.452,21.35],
      ["B",22,"DG","C4","C",12.902,22.429,21.151],
      ["B",23,"DC","P","P",9.477,18.627,25.34],
      ["B",23,"DC","OP1","O",8.767,17.534,24.627],
      ["B",23,"DC","OP2","O",8.67,19.409,26.312],
      ["B",23,"DC","O5'","O",10.807,18.067,26.034],
      ["B",23,"DC","C5'","C",11.688,17.17,25.31],
      ["B",23,"DC","C4'","C",13.115,17.573,25.593],
      ["B",23,"DC","O4'","O",13.284,18.804,24.893],
      ["B",23,"DC","C3'","C",13.441,17.879,27.059],
      ["B",23,"DC","O3'","O",14.341,16.938,27.677],
      ["B",23,"DC","C2'","C",13.928,19.322,27.025],
      ["B",23,"DC","C1'","C",14.312,19.508,25.568],
      ["B",23,"DC","N1","N",14.144,20.932,25.17],
      ["B",23,"DC","C2","C",15.199,21.595,24.63],
      ["B",23,"DC","O2","O",16.257,20.984,24.504],
      ["B",23,"DC","N3","N",15.067,22.877,24.257],
      ["B",23,"DC","C4","C",13.898,23.51,24.404],
      ["B",23,"DC","N4","N",13.771,24.813,24.018],
      ["B",23,"DC","C5","C",12.795,22.866,24.967],
      ["B",23,"DC","C6","C",12.935,21.54,25.359],
      ["B",24,"DG","P","P",14.658,17.064,29.247],
      ["B",24,"DG","OP1","O",14.863,15.717,29.825],
      ["B",24,"DG","OP2","O",13.633,17.912,29.92],
      ["B",24,"DG","O5'","O",16.033,17.88,29.284],
      ["B",24,"DG","C5'","C",17.243,17.32,28.742],
      ["B",24,"DG","C4'","C",18.208,18.464,28.758],
      ["B",24,"DG","O4'","O",17.716,19.428,27.829],
      ["B",24,"DG","C3'","C",18.23,19.236,30.058],
      ["B",24,"DG","O3'","O",18.978,18.583,31.084],
      ["B",24,"DG","C2'","C",18.885,20.519,29.578],
      ["B",24,"DG","C1'","C",18.276,20.693,28.188],
      ["B",24,"DG","N9","N",17.164,21.659,28.139],
      ["B",24,"DG","C8","C",15.874,21.536,28.58],
      ["B",24,"DG","N7","N",15.129,22.614,28.308],
      ["B",24,"DG","C5","C",15.99,23.436,27.673],
      ["B",24,"DG","C6","C",15.765,24.729,27.117],
      ["B",24,"DG","O6","O",14.719,25.373,27.067],
      ["B",24,"DG","N1","N",16.926,25.257,26.604],
      ["B",24,"DG","C2","C",18.157,24.666,26.579],
      ["B",24,"DG","N2","N",19.208,25.386,26.096],
      ["B",24,"DG","N3","N",18.35,23.438,27.053],
      ["B",24,"DG","C4","C",17.231,22.893,27.57]
    ]};
    return zoomDnaSource.value;
  }

  function zoomDnaGraph(rows) {
    const residues = new Map(), bonds = [], hbonds = [];
    rows.forEach((r, i) => { const key = r[0] + ':' + r[1]; if (!residues.has(key)) residues.set(key, { chain: r[0], number: r[1], type: r[2], atoms: {} }); residues.get(key).atoms[r[3]] = i; });
    const sugar = [["P", "OP1"], ["P", "OP2"], ["P", "O5'"], ["O5'", "C5'"], ["C5'", "C4'"], ["C4'", "O4'"], ["O4'", "C1'"], ["C1'", "C2'"], ["C2'", "C3'"], ["C3'", "C4'"], ["C3'", "O3'"]];
    const purine = [['N9','C8'],['C8','N7'],['N7','C5'],['C5','C6'],['C6','N1'],['N1','C2'],['C2','N3'],['N3','C4'],['C4','C5'],['C4','N9']];
    const pyrimidine = [['N1','C2'],['C2','N3'],['N3','C4'],['C4','C5'],['C5','C6'],['C6','N1'],['C2','O2']];
    for (const r of residues.values()) {
      const isPurine = r.type === 'DA' || r.type === 'DG';
      const edges = [...sugar, ...(isPurine ? purine : pyrimidine), ["C1'", isPurine ? 'N9' : 'N1']];
      if (r.type === 'DA') edges.push(['C6','N6']);
      if (r.type === 'DG') edges.push(['C6','O6'],['C2','N2']);
      if (r.type === 'DT') edges.push(['C4','O4'],['C5','C7']);
      if (r.type === 'DC') edges.push(['C4','N4']);
      for (const [a, b] of edges) if (r.atoms[a] !== undefined && r.atoms[b] !== undefined) bonds.push([r.atoms[a], r.atoms[b]]);
      const next = residues.get(r.chain + ':' + (r.number + 1));
      if (next && r.atoms["O3'"] !== undefined && next.atoms.P !== undefined) bonds.push([r.atoms["O3'"], next.atoms.P]);
    }
    // The Dickerson dodecamer is antiparallel: A1 pairs with B24, A6 with B19.
    for (const r of residues.values()) if (r.chain === 'A') {
      const other = residues.get('B:' + (25 - r.number)); if (!other) continue;
      let p = r, q = other;
      if (p.type === 'DT' || p.type === 'DC') [p, q] = [q, p];
      const links = p.type === 'DA' ? [['N6','O4'],['N1','N3']] : [['O6','N4'],['N1','N3'],['N2','O2']];
      links.forEach(([a,b]) => hbonds.push([p.atoms[a], q.atoms[b]]));
    }
    return { residues, bonds, hbonds };
  }

  function buildZoomDna(basePair) {
    const source = zoomDnaSource();
    const rows = basePair ? source.atoms.filter(r => (r[0] === 'A' && r[1] === 6) || (r[0] === 'B' && r[1] === 19)) : source.atoms;
    const graph = zoomDnaGraph(rows), g = new THREE.Group();
    const raw = rows.map(r => new THREE.Vector3(...r.slice(5)));
    let orient;
    if (basePair) {
      const a = graph.residues.get('A:6'), t = graph.residues.get('B:19');
      const x = raw[t.atoms["C1'"]].clone().sub(raw[a.atoms["C1'"]]).normalize();
      const z = raw[a.atoms.C6].clone().sub(raw[a.atoms.N1]).cross(raw[a.atoms.C2].clone().sub(raw[a.atoms.N1])).normalize();
      const y = z.clone().cross(x).normalize(); z.copy(x).cross(y).normalize();
      orient = new THREE.Matrix4().makeBasis(x, y, z).transpose();
    } else {
      const midpoint = n => raw[graph.residues.get('A:' + n).atoms["C1'"]].clone().add(raw[graph.residues.get('B:' + (25 - n)).atoms["C1'"]]).multiplyScalar(0.5);
      const axis = midpoint(12).sub(midpoint(1)).normalize();
      orient = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(0, 1, 0)));
    }
    const rotated = raw.map(p => p.clone().applyMatrix4(orient));
    const box = new THREE.Box3().setFromPoints(rotated), center = box.getCenter(new THREE.Vector3());
    const factor = (basePair ? 3.4 : 3.5) / Math.max(...box.getSize(new THREE.Vector3()).toArray());
    const atoms = rows.map((r, i) => ({ el: r[4], p: rotated[i].sub(center).multiplyScalar(factor) }));
    const definitions = basePair ? [
      ['adenine', 'Adenine · A6', 'Adenine is a purine with two fused rings. This deposited base pairs with thymine, not another adenine.'],
      ['thymine', 'Thymine · B19', 'Thymine has one six-membered ring. These are the exact A6/B19 coordinates from the DNA fragment.'],
      ['sugars', 'Deoxyribose sugars', 'Each five-membered sugar ring contains four carbon atoms and one oxygen; its fifth carbon lies outside the ring.'],
      ['phosphates', 'Phosphate groups', 'Phosphate links adjacent sugars along a DNA strand. The neighbouring nucleotides are outside this isolated pair, so these are backbone fragments.'],
      ['hydrogen-bonds', 'Two hydrogen bonds', 'Dashed guides connect the two A–T donor/acceptor pairs. Hydrogen atoms are omitted; these are not covalent crosslinks.'],
    ] : [
      ['backbone-a', 'Sugar–phosphate strand A', 'One continuous covalent strand, with all deposited deoxyribose rings and phosphate groups. Its partner runs antiparallel.'],
      ['backbone-b', 'Sugar–phosphate strand B', 'The complementary covalent strand runs in the opposite 5′ to 3′ direction. No covalent bonds join the two strands.'],
      ['at-bases', 'Adenine–thymine bases', 'Four A–T pairs in this 12-base-pair sequence. Each pair has two hydrogen-bond guides between the bases.'],
      ['gc-bases', 'Guanine–cytosine bases', 'Eight G–C pairs in this 12-base-pair sequence. Each pair has three hydrogen-bond guides between the bases.'],
      ['hydrogen-bonds', 'Base-pair hydrogen bonds', 'Thirty-two dashed donor/acceptor guides connect complementary bases. Hydrogen atoms and bond order are omitted.'],
    ];
    const groups = new Map();
    g.userData.parts = definitions.map(([id, label, note]) => {
      const object = new THREE.Group(); object.name = 'dna-' + id; g.add(object);
      groups.set(id, object);
      return { id, label, note, object };
    });
    const isPhosphate = r => r[3] === 'P' || r[3] === 'OP1' || r[3] === 'OP2';
    const isSugar = r => r[3].includes("'");
    const classify = r => basePair
      ? (isPhosphate(r) ? 'phosphates' : isSugar(r) ? 'sugars' : r[2] === 'DA' ? 'adenine' : 'thymine')
      : (isPhosphate(r) || isSugar(r) ? 'backbone-' + r[0].toLowerCase() : r[2] === 'DA' || r[2] === 'DT' ? 'at-bases' : 'gc-bases');
    const indices = new Map(definitions.map(([id]) => [id, []]));
    rows.forEach((r, i) => indices.get(classify(r)).push(i));
    const groupBonds = new Map(definitions.map(([id]) => [id, []]));
    for (const edge of graph.bonds) {
      const a = classify(rows[edge[0]]), b = classify(rows[edge[1]]);
      // Boundary bonds remain actual covalent links. Assign sugar-base links to
      // the base and sugar-phosphate links to the phosphate inspection group.
      const owner = a === b ? a : (a === 'phosphates' || b === 'phosphates') ? 'phosphates'
        : isSugar(rows[edge[0]]) || isPhosphate(rows[edge[0]]) ? b : a;
      groupBonds.get(owner).push(edge);
    }
    const sphere = track(new THREE.SphereGeometry(1, 12, 8));
    const cylinder = track(new THREE.CylinderGeometry(1, 1, 1, 7));
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
    const colors = { C: 0x8bb7ab, N: 0x7894df, O: 0xde8b7d, P: 0xd5ad71 };
    const atomRadius = factor * (basePair ? 0.52 : 0.46);
    const bondRadius = factor * (basePair ? 0.19 : 0.17);
    const batchSegments = (parent, segments, radius, color, kind) => {
      if (!segments.length) return;
      const mesh = track(new THREE.InstancedMesh(cylinder, stageMat(color, { rough: 0.52 }), segments.length));
      segments.forEach(([a, b], i) => {
        dummy.position.copy(a).add(b).multiplyScalar(0.5);
        dummy.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
        dummy.scale.set(radius, a.distanceTo(b), radius); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.userData.molecularKind = kind;
      parent.add(mesh);
    };
    for (const [id, group] of groups) {
      const selected = indices.get(id), byElement = new Map();
      selected.forEach(i => { const element = atoms[i].el; if (!byElement.has(element)) byElement.set(element, []); byElement.get(element).push(i); });
      for (const [element, ids] of byElement) {
        const carbon = id === 'backbone-b' || id === 'thymine' ? 0xbba382 : colors.C;
        const mesh = track(new THREE.InstancedMesh(sphere, stageMat(element === 'C' ? carbon : colors[element], { rough: 0.4 }), ids.length));
        ids.forEach((index, i) => {
          dummy.position.copy(atoms[index].p); dummy.quaternion.identity();
          dummy.scale.setScalar(atomRadius * (element === 'P' ? 1.12 : 1)); dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.userData.molecularKind = 'atoms'; mesh.userData.atomIndices = ids;
        group.add(mesh);
      }
      batchSegments(group, groupBonds.get(id).map(([a, b]) => [atoms[a].p, atoms[b].p]), bondRadius, id === 'backbone-b' ? 0xb89a75 : 0x88a9a4, 'covalent-bonds');
    }
    const dashes = [];
    for (const [a, b] of graph.hbonds) for (let i = 0; i < 5; i++) {
      dashes.push([atoms[a].p.clone().lerp(atoms[b].p, (i + 0.1) / 5), atoms[a].p.clone().lerp(atoms[b].p, (i + 0.6) / 5)]);
    }
    batchSegments(groups.get('hydrogen-bonds'), dashes, factor * 0.085, 0x7ed3bb, 'hydrogen-bond-guides');
    g.userData.structure = {
      pdb: '1BNA', sourceUrl: 'https://www.rcsb.org/structure/1BNA', sourceSha256: source.sha256,
      coordinateUnit: 'angstrom', sceneUnitsPerAngstrom: factor,
      residues: basePair ? ['DA A6', 'DT B19'] : 24, basePairs: basePair ? 1 : 12,
      atoms: rows.length, bonds: graph.bonds.length, hydrogenBonds: graph.hbonds.length,
      hydrogensOmitted: true, watersOmitted: true, bondOrdersOmitted: true,
      representation: 'Coordinate-derived heavy-atom ball-and-stick; atom radii illustrative; dashed hydrogen-bond guides',
    };
    return g;
  }

  /* -- ATOM: a single carbon atom, nucleus + electron shells ---------------- */
  function buildAtom(spec) {
    const g = new THREE.Group();
    const parts=g.userData.parts=[],nucleus=new THREE.Group();g.add(nucleus);
    const nucleonGeo=track(new THREE.SphereGeometry(0.072,16,10));
    const protonMat=stageMat(0xcb806f,{rough:0.65}),neutronMat=stageMat(0x7699b5,{rough:0.65});
    // Carbon-12: six protons and six neutrons. Nucleon arrangement is schematic,
    // and the entire nucleus is enormously enlarged relative to the cloud.
    for(let i=0;i<12;i++){
      const y=1-2*(i+0.5)/12,a=i*2.39996,r=Math.sqrt(1-y*y),proton=i%2===0;
      const mesh=new THREE.Mesh(nucleonGeo,proton?protonMat:neutronMat);mesh.position.set(Math.cos(a)*r*.13,y*.13,Math.sin(a)*r*.13);mesh.userData.nucleon=proton?'proton':'neutron';nucleus.add(mesh);
    }
    nucleus.name='carbon12-nucleus';
    parts.push({id:'atom-nucleus',label:'Carbon-12 nucleus · enlarged',note:'Six protons and six neutrons define this carbon-12 isotope. This cluster is enormously enlarged relative to the electron cloud; nucleons are not arranged as rigid balls.',object:nucleus});
    // Carbon ground configuration: 1s2 2s2 2p2 (NIST). Sample simple hydrogenic
    // probability shapes with arbitrary effective radial scales. These are NOT
    // a solved carbon many-electron wavefunction or measured orbital sizes.
    // Dots are probability samples, never individual electrons or trajectories.
    const dotGeo=track(new THREE.IcosahedronGeometry(0.016,0)),matrix=new THREE.Matrix4();
    const cloudConfigs=[{kind:'1s',count:420,color:0x8ecfbe,extent:0.85,scale:0.13},{kind:'2s',count:560,color:0x52b896,extent:1.85,scale:0.24},{kind:'2p',count:720,color:0x78b9d3,extent:1.9,scale:0.30}];
    for(let orbit=0;orbit<cloudConfigs.length;orbit++){
      const cfg=cloudConfigs[orbit],cloud=track(new THREE.InstancedMesh(dotGeo,stageMat(cfg.color,{rough:0.8,opacity:0.58,emissive:cfg.color,emissiveIntensity:0.3,depthWrite:false}),cfg.count));
      let accepted=0,attempt=0;
      // Bounded rejection sampling includes radial volume weighting. The 2s
      // radial node and p angular nodes are features of the teaching basis.
      while(accepted<cfg.count&&attempt<cfg.count*100){
        const seed=orbit*300001+attempt++*13+701,r=rnd(seed)*cfg.extent,u=r/cfg.scale;
        const density=orbit===0?(u*u*Math.exp(-2*u)/Math.exp(-2)):orbit===1?(u*u*(2-u)**2*Math.exp(-u)/2.0):(u**4*Math.exp(-u)/(256*Math.exp(-4)));
        if(rnd(seed+1)>density)continue;
        const y=1-2*rnd(seed+2),phi=rnd(seed+3)*Math.PI*2,s=Math.sqrt(1-y*y),x=s*Math.cos(phi),z=s*Math.sin(phi);
        if(orbit===2&&rnd(seed+4)>(accepted%2===0?x*x:y*y))continue;
        matrix.makeTranslation(x*r,y*r,z*r);cloud.setMatrixAt(accepted++,matrix);
      }
      cloud.count=accepted;cloud.instanceMatrix.needsUpdate=true;cloud.computeBoundingSphere();cloud.name='probability-'+cfg.kind;cloud.userData.probabilitySamples=accepted;g.add(cloud);
      const labels=['1s probability cloud · 2 electrons','2s probability cloud · 2 electrons','2p probability clouds · 2 electrons'];
      const notes=['The compact spherical 1s orbital holds two electrons. Hundreds of stationary dots sample a schematic probability distribution; they are not hundreds of electrons.','The 2s orbital holds two electrons. A spherical radial node separates inner and outer probability regions in this illustrative hydrogen-like basis.','Two perpendicular p-orbital shapes illustrate the two 2p electrons. Their orientation is conventional, with nodal planes through the nucleus; this is not the exact density of a free carbon atom.'];
      parts.push({id:'atom-'+cfg.kind,label:labels[orbit],note:notes[orbit],object:cloud});
    }
    g.userData.configuration='1s2 2s2 2p2';g.userData.nucleus=nucleus;
    g.userData.spin=0;
    g.userData.model='Schematic stationary probability samples, not classical orbits or a computed carbon wavefunction. Nucleus greatly enlarged; radial scales arbitrary.';
    return g;
  }

  /* DNA packaging is irregular in an interphase nucleus: do not present a
     universal rigid 30-nm fibre. Shapes here explain organisation, not atomic
     coordinates. Core DNA wraps about 1.65 turns around an eight-histone core. */
  function buildChromatin() {
    const g = new THREE.Group(), cores = new THREE.Group(), wraps = new THREE.Group(), linker = new THREE.Group();
    g.add(cores, wraps, linker);
    const curve = new THREE.CatmullRomCurve3(Array.from({ length:9 }, (_,i) =>
      new THREE.Vector3((i/8-.5)*3.8, Math.sin(i*1.7)*.7, Math.cos(i*1.2)*.55)));
    let previousEnd = null, previousTangent = null;
    for(let i=0;i<11;i++) {
      const u=(i+.5)/11, position=curve.getPoint(u), core=new THREE.Group();
      const bead=new THREE.Mesh(track(new THREE.SphereGeometry(.19,16,12)), stageMat(0x688e9a,{rough:.48}));
      bead.scale.set(1,.75,1); core.add(bead); core.position.copy(position);
      core.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangent(u)); cores.add(core);
      const points=Array.from({length:65},(_,k)=>{const a=k/64*Math.PI*3.3;return new THREE.Vector3(Math.cos(a)*.23,(k/64-.5)*.16,Math.sin(a)*.23);});
      const wrap=new THREE.Mesh(track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.025,6,false)),stageMat(0xe5b895,{rough:.4}));
      wrap.position.copy(position);wrap.quaternion.copy(core.quaternion);wraps.add(wrap);
      // Join actual wrap endpoints, never run a central tube through the cores.
      const start=points[0].clone().applyQuaternion(core.quaternion).add(position);
      const end=points[64].clone().applyQuaternion(core.quaternion).add(position);
      const startTangent=points[1].clone().sub(points[0]).normalize().applyQuaternion(core.quaternion);
      const endTangent=points[64].clone().sub(points[63]).normalize().applyQuaternion(core.quaternion);
      if(previousEnd){
        const reach=Math.min(.18,previousEnd.distanceTo(start)*.3);
        const join=new THREE.CubicBezierCurve3(previousEnd,previousEnd.clone().addScaledVector(previousTangent,reach),start.clone().addScaledVector(startTangent,-reach),start);
        linker.add(new THREE.Mesh(track(new THREE.TubeGeometry(join,24,.025,6,false)),stageMat(0xe5b895,{rough:.4})));
      }
      previousEnd=end;previousTangent=endTangent;
    }
    g.userData.parts=[
      {id:'cores',label:'Nucleosome cores',note:'Histone proteins organise DNA into nucleosomes. Spacing and folding are irregular and change with cellular activity.',object:cores},
      {id:'wrapped-dna',label:'Wrapped DNA',note:'About 147 base pairs wrap around each core particle. This field is a schematic of packing, not a universal chromatin fibre.',object:wraps},
      {id:'linker',label:'Linker DNA',note:'DNA between adjacent core particles connects nucleosomes. Linker length is variable; the continuous path here is simplified.',object:linker},
    ];
    g.userData.spin=.035;return g;
  }

  function buildNucleosome() {
    const g=new THREE.Group(), histones=new THREE.Group(), dna=new THREE.Group();g.add(histones,dna);
    const names=['H2A','H2B','H3','H4'], colours=[0x6ca49b,0x548294,0xb990b7,0x9784b6];
    const parts=[];
    for(let kind=0;kind<4;kind++) {
      const pair=new THREE.Group(); histones.add(pair);
      for(let copy=0;copy<2;copy++) {
        const angle=(kind+copy*4)/8*Math.PI*2;
        const core=new THREE.Mesh(track(new THREE.SphereGeometry(.43,24,16)),stageMat(colours[kind],{rough:.48}));
        core.position.set(Math.cos(angle)*.48,copy?.23:-.23,Math.sin(angle)*.48);core.scale.set(1,.8,1);pair.add(core);
      }
      parts.push({id:'histone-'+names[kind].toLowerCase(),label:names[kind]+' histones',note:'Two '+names[kind]+' histones contribute to the octamer. Globules simplify the folded proteins; no atomic surface is claimed.',object:pair});
    }
    for(let strand=0;strand<2;strand++) {
      const pts=Array.from({length:221},(_,i)=>{
        const u=i/220,a=u*Math.PI*3.3,twist=u*14*Math.PI*2+strand*Math.PI;
        const r=1.02+Math.cos(twist)*.05;
        return new THREE.Vector3(Math.cos(a)*r,(u-.5)*1.0+Math.sin(twist)*.05,Math.sin(a)*r);
      });
      dna.add(new THREE.Mesh(track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),220,.027,8,false)),stageMat(strand?0xe4c89c:0xcb916d,{rough:.4})));
    }
    parts.push({id:'core-dna',label:'147 base-pair DNA wrap',note:'Approximately 1.65 superhelical turns of DNA surround the histone octamer. The particle is about 11 nm across; this geometry is schematic.',object:dna});
    g.rotation.x=.35;g.userData.parts=parts;g.userData.spin=.06;return g;
  }

  /* ==========================================================================
   *  build the stack
   * ======================================================================== */
  const STAGES = [];
  const CENTERS = STAGE_SCALE_M.map((_,i)=>.04+i*.92/(STAGE_SCALE_M.length-1));
  const BAND = .12;
  const NAMES = ['Tissue', 'Cell', 'Nucleus', 'Chromatin', 'Nucleosome', 'DNA', 'Base pair', 'Carbon atom'];
  const CAPTIONS = [
    'A stain-inspired tissue field. Explore its cells, nuclei and extracellular space.',
    'Inspect an animal cell in cutaway: membranes, organelles and supporting structures.',
    'An interphase nucleus contains chromatin, a nucleolus and a pore-studded double envelope.',
    'Irregular nucleosome packing and linker DNA, not a universal rigid 30-nm fibre.',
    'Eight histones organise roughly 147 DNA base pairs into a core particle about 11 nm wide.',
    'A 12-base-pair B-DNA duplex. The duplex is about 2 nm wide; this segment is about 4 nm long.',
    'An adenine–thymine base pair, with its sugar and phosphate groups shown in molecular detail.',
    'Carbon-12 has six protons, six neutrons and six electrons. Clouds indicate probability, not orbits.',
  ];
  const LIMITS = [
    'Generic teaching field, not a section sampled from your specimen. Cells and colours are illustrative.',
    'A composite animal-cell model. Organelle number, shape and proportions vary by cell type; cutaways expose interiors.',
    'Interphase organisation is illustrated. Condensed mitotic X-shaped chromosomes are not normal interphase contents.',
    'A schematic region, not a measured 3D chromatin map. Packing and linker lengths are variable.',
    'Protein lobes and DNA path are schematic, not crystallographic coordinates.',
    'Heavy-atom coordinates from PDB 1BNA. Hydrogens and water are omitted; colours, atom radii and sticks aid interpretation.',
    'PDB 1BNA residues A6 and B19. Dotted contacts are hydrogen bonds; hydrogens and bond orders are omitted.',
    'A qualitative orbital-probability illustration, not a computed many-electron wavefunction. The nucleus is greatly enlarged.',
  ];
  let built = false;

  function buildAll(spec) {
    if (built) return;
    built = true;
    const builders = [buildTissue, buildCell, buildNucleus, buildChromatin, buildNucleosome, buildDNA, buildBasePair, buildAtom];
    builders.forEach((b, i) => {
      const grp = b(spec || {});
      grp.visible = false;
      // cache the meshes + their base opacities for the fade
      const meshes = [];
      grp.traverse((o) => { if (o.isMesh && o.material) meshes.push(o); });
      for (const part of grp.userData.parts || []) part.object.traverse(object => { if (object.isMesh) object.userData.zvPart = part.id; });
      grp.userData.meshes = meshes;
      grp.userData.homeRotation = grp.rotation.clone();
      grp.userData.inspectionRadius = new THREE.Box3().setFromObject(grp).getBoundingSphere(new THREE.Sphere()).radius;
      scene.add(grp);
      STAGES.push({ group: grp, center: CENTERS[i], name: NAMES[i], caption: CAPTIONS[i], parts:grp.userData.parts || [] });
    });
  }

  /* ---- DOM overlay: HUD (scale readout, name, caption, hint, close) ------- */
  const el = document.createElement('div');
  el.id = 'zoomverse';
  el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Scale journey');
  el.innerHTML =
    '<div class="zv-vig"></div>'
    + '<header class="zv-top"><div><span class="zv-kick">Scale journey</span><span class="zv-context"></span></div>'
    + '<button class="zv-x" type="button" aria-label="Return to dissection lab">× Back to lab</button></header>'
    + '<nav class="zv-nav" aria-label="Scale stages"></nav>'
    + '<aside class="zv-info"><header class="zv-info-head"><span class="zv-name">Tissue</span><button type="button" class="zv-inspect-toggle" aria-expanded="false" aria-controls="zv-info-body">Inspect parts</button></header><div id="zv-info-body" class="zv-info-body"><p class="zv-cap"></p>'
    + '<div class="zv-parts" role="group" aria-label="Inspect subparts"></div><p class="zv-part-note" aria-live="polite">Choose a part to highlight it.</p>'
    + '<details><summary>Model notes &amp; sources</summary><p class="zv-limit"></p><a class="zv-source" target="_blank" rel="noopener">Reference source ↗</a></details></div></aside>'
    + '<footer class="zv-controls"><div class="zv-read"><span>Representative span ≈ </span><b class="zv-scale">300 µm</b></div>'
    + '<label class="zv-slider-label">Scale depth<input class="zv-slider" type="range" min="0" max="1000" value="40" aria-label="Scale journey depth"></label>'
    + '<div class="zv-buttons"><button type="button" class="zv-prev">← Previous</button><button type="button" class="zv-rotate" aria-pressed="false">Rotate</button><button type="button" class="zv-motion" aria-pressed="false">Play motion</button>'
    + '<button type="button" class="zv-next">Next →</button></div></footer>';
  const style = document.createElement('style');
  style.textContent = `
    #zoomverse{position:fixed;inset:0;z-index:100010;display:none;pointer-events:auto;touch-action:none;
      font-family:var(--sans,-apple-system,"Segoe UI",sans-serif);color:#dce8ea;cursor:ns-resize;opacity:0}
    #zoomverse.on{display:block}
    #zoomverse.vis{opacity:1}
    body:has(#zoomverse.on) :is(#topright,#rail,#dock,#hand,#obj,#systems,#hint,#say,#eqx-fab,#bioq-ai){visibility:hidden}
    #zoomverse .zv-vig{position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(62% 62% at 50% 46%,transparent 40%,rgba(4,7,10,.5) 82%,rgba(4,7,10,.85) 100%)}
    #zoomverse .zv-top{position:absolute;left:16px;right:16px;top:calc(12px + env(safe-area-inset-top,0px));display:flex;
      justify-content:space-between;align-items:center;pointer-events:none}
    #zoomverse .zv-kick{font:600 9px/1 var(--mono,monospace);letter-spacing:.42em;
      text-transform:uppercase;color:#38e0d8}
    #zoomverse button,#zoomverse summary{min-height:44px;min-width:44px;cursor:pointer;touch-action:manipulation;
      color:#dce8ea;background:#0b1719eb;border:1px solid #36534c;border-radius:9px;padding:9px 12px;font:500 12px/1.3 var(--sans)}
    #zoomverse button:focus-visible,#zoomverse input:focus-visible,#zoomverse summary:focus-visible,#zoomverse a:focus-visible{outline:2px solid #62ddba;outline-offset:2px}
    #zoomverse button:active{transform:scale(.97)}
    #zoomverse button[aria-current="step"],#zoomverse button[aria-pressed="true"]{color:#99f3d1;border-color:#5fbc99;background:#183d32}
    #zoomverse button:disabled{opacity:.38;cursor:default}
    #zoomverse .zv-x{pointer-events:auto;white-space:nowrap}
    #zoomverse .zv-context{display:block;font-size:11px;color:#91a9a0;margin-top:7px;max-width:40vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #zoomverse .zv-nav{position:absolute;left:16px;right:16px;top:calc(72px + env(safe-area-inset-top,0px));display:flex;gap:6px;overflow-x:auto;touch-action:pan-x;scrollbar-width:thin}
    #zoomverse .zv-nav button{flex:none}
    #zoomverse .zv-info{position:absolute;right:16px;top:132px;width:290px;max-height:calc(100% - 156px - var(--zv-controls-height,148px));overflow:auto;
      box-sizing:border-box;padding:16px;border:1px solid #2c463e;background:#071411ed;border-radius:14px;cursor:auto;touch-action:pan-y;overscroll-behavior:contain}
    #zoomverse .zv-name{display:block;color:#99f3d1;font-size:20px;font-weight:600}
    #zoomverse .zv-info-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
    #zoomverse .zv-inspect-toggle{display:none}
    #zoomverse p{font-size:12px;line-height:1.6;color:#b2c3bf;margin:10px 0}
    #zoomverse .zv-parts{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    #zoomverse .zv-parts button{text-align:left;min-width:0;overflow-wrap:anywhere}
    #zoomverse .zv-part-note{border-left:2px solid #64b79b;padding-left:10px;min-height:36px}
    #zoomverse summary{display:flex;align-items:center;margin-top:12px}
    #zoomverse .zv-source{display:block;min-height:44px;color:#94d9cd;font-size:12px;padding-top:10px;box-sizing:border-box}
    #zoomverse .zv-controls{position:absolute;bottom:calc(12px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);
      width:min(600px,calc(100% - 32px));padding:10px 12px;box-sizing:border-box;border:1px solid #2c463e;border-radius:12px;background:#06110feF;cursor:auto}
    #zoomverse .zv-read{text-align:center;font-size:11px;color:#a9bcb6}
    #zoomverse .zv-scale{font-size:18px;color:#c4f6df;font-variant-numeric:tabular-nums}
    #zoomverse .zv-slider-label{display:flex;align-items:center;gap:10px;font-size:10px;color:#9cb7ad}
    #zoomverse .zv-slider{height:44px;min-width:0;flex:1;accent-color:#62ddba;touch-action:pan-x}
    #zoomverse .zv-buttons{display:flex;gap:6px;justify-content:center}
    #zoomverse .zv-buttons button{flex:1;max-width:160px}
    @media(max-width:900px) and (min-height:521px),(max-width:599px){
      #zoomverse .zv-info{left:16px;right:16px;width:auto;top:auto;bottom:calc(24px + env(safe-area-inset-bottom,0px) + var(--zv-controls-height,148px));max-height:27vh;padding:12px}
      #zoomverse .zv-inspect-toggle{display:block}
      #zoomverse .zv-info:not(.expanded) .zv-info-body{display:none}
      #zoomverse .zv-info-head{position:sticky;top:-12px;background:#071411;z-index:1}
      #zoomverse .zv-parts{grid-template-columns:repeat(2,minmax(0,1fr))}
      #zoomverse .zv-name{font-size:17px}
    }
    @media(max-height:520px) and (min-width:600px){
      #zoomverse .zv-top{top:8px}#zoomverse .zv-nav{top:60px;right:280px}
      #zoomverse .zv-info{top:64px;bottom:12px;right:12px;width:250px;max-height:none;padding:12px}
      #zoomverse .zv-controls{left:12px;right:280px;transform:none;width:auto;bottom:8px;padding:6px 8px;display:flex;align-items:center;gap:8px}
      #zoomverse .zv-read{max-width:116px}#zoomverse .zv-buttons{flex:1}
      #zoomverse .zv-slider-label{display:none}
      #zoomverse .zv-context{display:none}#zoomverse .zv-kick{letter-spacing:.12em}
    }
    @media(max-width:360px){#zoomverse .zv-kick{letter-spacing:.12em}#zoomverse .zv-context{font-size:10px}}
    @media(prefers-reduced-motion:reduce){#zoomverse button:active{transform:none}}
  `;

  const $ = (s) => el.querySelector(s);
  let scaleEl, nameEl, capEl, sliderEl;

  /* ---- state -------------------------------------------------------------- */
  let opened = false, t = 0, tTarget = 0;
  let onCloseCb = null;
  let layoutObserver = null;
  let inspectionAngle = null;
  let currentStage = -1, selectedPart = null, motion = !reducedMotion.matches, disposed = false;
  let rotateMode = false;
  const highlights = [];
  const SOURCES = ['https://www.ncbi.nlm.nih.gov/books/NBK26880/','https://www.ncbi.nlm.nih.gov/books/NBK26880/',
    'https://www.ncbi.nlm.nih.gov/books/NBK26932/','https://pubmed.ncbi.nlm.nih.gov/28751582/',
    'https://www.alcf.anl.gov/science/projects/computational-studies-nucleosome-stability',
    'https://www.rcsb.org/structure/1BNA','https://www.rcsb.org/structure/1BNA',
    'https://goldbook.iupac.org/terms/view/O04317'];

  function clearSelection() {
    for(const item of highlights) { item.material.emissive.copy(item.colour);item.material.emissiveIntensity=item.intensity; }
    highlights.length=0;selectedPart=null;
  }
  function selectPart(id) {
    const stage=STAGES[currentStage],part=stage?.parts.find(item=>item.id===id);
    if(!part) return false;
    clearSelection();selectedPart=id;
    const seen=new Set();
    part.object.traverse(object=>{
      const material=object.material;
      if(!material?.emissive||seen.has(material))return;seen.add(material);
      highlights.push({material,colour:material.emissive.clone(),intensity:material.emissiveIntensity});
      material.emissive.setHex(0x53bba2);material.emissiveIntensity=.42;
    });
    $('.zv-part-note').textContent=part.note;
    $('.zv-parts').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.part===id)));
    return true;
  }
  function showStage(index) {
    if(index===currentStage)return;clearSelection();currentStage=index;
    const stage=STAGES[index];nameEl.textContent=stage.name;capEl.textContent=stage.caption;
    $('.zv-limit').textContent=LIMITS[index];$('.zv-source').href=SOURCES[index];
    $('.zv-parts').replaceChildren();
    for(const part of stage.parts){
      const button=document.createElement('button');button.type='button';button.dataset.part=part.id;
      button.textContent=part.label;button.setAttribute('aria-pressed','false');button.onclick=()=>selectPart(part.id);$('.zv-parts').appendChild(button);
    }
    $('.zv-part-note').textContent='Choose a subpart to highlight its geometry and read its function.';
    $('.zv-inspect-toggle').textContent=$('.zv-info').classList.contains('expanded')?'Hide details':'Inspect '+stage.parts.length+' parts';
    $('.zv-nav').querySelectorAll('button').forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    $('.zv-prev').disabled=index===0;$('.zv-next').disabled=index===STAGES.length-1;
    fitCamera();
  }
  function goToStage(index){
    index=Math.max(0,Math.min(STAGES.length-1,index|0));tTarget=t=CENTERS[index];applyStages(t);
    $('.zv-nav').querySelectorAll('button')[index]?.scrollIntoView({block:'nearest',inline:'nearest'});
  }

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
  function overControls(e){return !!e.target?.closest?.('button,input,a,summary,.zv-info,.zv-nav,.zv-controls');}
  function onWheel(e) { if (!opened || overControls(e)) return; e.preventDefault(); tTarget = clamp01(tTarget + e.deltaY * 0.0005); }
  let drag = null;
  function onDown(e) {
    if(!opened || overControls(e) || drag || e.button>0)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};
    el.setPointerCapture?.(e.pointerId);
  }
  function onMove(e) {
    if(!opened || !drag || drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5;
    if(rotateMode){const stage=STAGES[currentStage];if(stage){stage.group.rotation.y+=dx*.008;stage.group.rotation.x+=dy*.008;}}
    else tTarget=clamp01(tTarget+dy*.001);
    drag.x=e.clientX;drag.y=e.clientY;
  }
  function onUp(e) {
    if(!drag || (e && e.pointerId!==drag.id))return;
    if(e?.type!=='pointercancel' && !drag.moved) {
      scene.updateMatrixWorld(true);const ray=new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(drag.x/innerWidth*2-1,1-drag.y/innerHeight*2),camera);
      const stage=STAGES[currentStage];
      const hit=stage && ray.intersectObjects(stage.group.children,true).find(h=>h.object.userData.zvPart);
      if(hit)selectPart(hit.object.userData.zvPart);
    }
    const id=drag.id;drag=null;if(el.hasPointerCapture?.(id))el.releasePointerCapture(id);
  }
  function clamp01(v) { return Number.isFinite(v) ? Math.max(0,Math.min(1,v)) : 0; }
  function syncMotion(){const button=$('.zv-motion');button.textContent=motion?'Pause motion':'Play motion';button.setAttribute('aria-pressed',String(motion));}
  function onMotionPreference(){if(reducedMotion.matches){motion=false;if(nameEl)syncMotion();}}
  reducedMotion.addEventListener?.('change',onMotionPreference);
  function onKey(e){
    if(!opened || e.ctrlKey || e.metaKey || e.altKey || e.target?.tagName==='INPUT')return;
    if(e.key==='ArrowRight'){e.preventDefault();goToStage(currentStage+1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();goToStage(currentStage-1);}
    else if(e.key==='Home'){e.preventDefault();goToStage(0);}
    else if(e.key==='End'){e.preventDefault();goToStage(STAGES.length-1);}
    else if(e.key==='Escape'){e.preventDefault();close();}
  }

  /* ---- lifecycle ---------------------------------------------------------- */
  let prevExposure = null;

  function open(spec) {
    if (opened || disposed) return;
    buildAll(spec);
    if (nameEl == null) {
      document.head.appendChild(style);
      document.body.appendChild(el);
      scaleEl = $('.zv-scale'); nameEl = $('.zv-name'); capEl = $('.zv-cap'); sliderEl = $('.zv-slider');
      $('.zv-x').addEventListener('click', close);
      NAMES.forEach((name,index)=>{const button=document.createElement('button');button.type='button';button.textContent=name;button.dataset.stage=String(index);button.onclick=()=>goToStage(index);$('.zv-nav').appendChild(button);});
      $('.zv-prev').onclick=()=>goToStage(currentStage-1);$('.zv-next').onclick=()=>goToStage(currentStage+1);
      $('.zv-motion').onclick=()=>{motion=!motion;syncMotion();};
      $('.zv-inspect-toggle').onclick=()=>{
        const expanded=$('.zv-info').classList.toggle('expanded');
        $('.zv-inspect-toggle').setAttribute('aria-expanded',String(expanded));
        $('.zv-inspect-toggle').textContent=expanded?'Hide details':'Inspect '+STAGES[currentStage].parts.length+' parts';
        fitCamera();
      };
      $('.zv-rotate').onclick=()=>{rotateMode=!rotateMode;$('.zv-rotate').setAttribute('aria-pressed',String(rotateMode));$('.zv-rotate').textContent=rotateMode?'Drag to rotate':'Rotate';};
      sliderEl.oninput=()=>{tTarget=t=Number(sliderEl.value)/1000;applyStages(t);};
      el.addEventListener('wheel', onWheel, { passive: false });
      el.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      window.addEventListener('keydown', onKey, true);
      layoutObserver = new ResizeObserver(()=>{
        el.style.setProperty('--zv-controls-height',$('.zv-controls').getBoundingClientRect().height+'px');
        fitCamera();
      });
      layoutObserver.observe($('.zv-controls'));layoutObserver.observe($('.zv-info'));
    }
    opened = true;
    t = CENTERS[0]; tTarget = t;currentStage=-1;
    $('.zv-context').textContent=spec?.name ? 'From '+spec.name+' · reference anatomy' : 'Reference anatomy · eight scales';
    syncMotion();resize(innerWidth,innerHeight);
    prevExposure = renderer.toneMappingExposure;
    renderer.toneMappingExposure = 1.15;
    el.classList.add('on');
    el.classList.add('vis');
    applyStages(t);
  }

  function close() {
    if (!opened) return;
    opened = false;
    if(drag && el.hasPointerCapture?.(drag.id))el.releasePointerCapture(drag.id);
    drag=null;clearSelection();
    el.classList.remove('vis','on');
    if (prevExposure != null) renderer.toneMappingExposure = prevExposure;
    prevExposure=null;
    if (onCloseCb) { try { onCloseCb(); } catch (e) {} }
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
        mat.depthWrite = op > .98 && mat.userData.baseDepthWrite !== false;
      }
    }
    // HUD
    if (scaleEl) {
      scaleEl.textContent = scaleLabel(tt);
      // nearest stage names the panel + caption
      let near = 0, best = 9; for (let i = 0; i < STAGES.length; i++) { const dd = Math.abs(tt - STAGES[i].center); if (dd < best) { best = dd; near = i; } }
      showStage(near);
      if(document.activeElement!==sliderEl)sliderEl.value=String(Math.round(tt*1000));
      sliderEl.setAttribute('aria-valuetext',NAMES[near]+', approximately '+scaleLabel(tt));
      updateCamera(tt);
    }
  }

  function update(dtMs) {
    if (!opened) return;
    const dt = Math.min(0.05, (dtMs || 16) / 1000);
    // ease the zoom toward its target so scroll feels inertial, not steppy
    t += (tTarget - t) * (reducedMotion.matches ? 1 : Math.min(1, dt * 6));
    applyStages(t);
    // Optional slow model rotation. Electron samples remain stationary.
    for (let i = 0; i < STAGES.length; i++) {
      const grp = STAGES[i].group; if (!grp.visible) continue;
      const spin = grp.userData.spin || 0;
      if (spin && motion && !selectedPart && !drag) {
        if (grp.userData.spinAxis === 'y') grp.rotation.y += dt * spin; else grp.rotation.z += dt * spin * 0.5, grp.rotation.y += dt * spin;
      }
    }
  }

  function render() {
    if (!opened) return;
    renderer.render(scene, camera);
  }

  function fitCamera(){
    if(!opened || currentStage<0)return;
    const w=innerWidth||1,h=innerHeight||1;
    const nav=$('.zv-nav').getBoundingClientRect(), info=$('.zv-info').getBoundingClientRect(), foot=$('.zv-controls').getBoundingClientRect();
    const portrait=w<600||(w<=900&&h>520);
    const left=16,right=portrait?w-16:info.left-16,top=nav.bottom+12,bottom=(portrait?info.top:foot.top)-12;
    const width=Math.max(80,right-left),height=Math.max(80,bottom-top);
    inspectionAngle=Math.atan(Math.min(width,height)/h*Math.tan(camera.fov*Math.PI/360));
    camera.aspect=w/h;
    camera.setViewOffset(w,h,w/2-(left+right)/2,h/2-(top+bottom)/2,w,h);
    updateCamera(t);
  }
  function updateCamera(tt){
    if(!inspectionAngle || !STAGES.length)return;
    let lo=0;while(lo<CENTERS.length-1 && tt>CENTERS[lo+1])lo++;
    const hi=Math.min(lo+1,CENTERS.length-1),u=clamp01((tt-CENTERS[lo])/(CENTERS[hi]-CENTERS[lo]||1));
    const radius=STAGES[lo].group.userData.inspectionRadius*(1-u)+STAGES[hi].group.userData.inspectionRadius*u;
    camera.position.z=radius/Math.sin(inspectionAngle)*1.04;
    camera.far=Math.max(100,camera.position.z+radius*10);
    camera.updateProjectionMatrix();
  }
  function resize(w, h) {camera.aspect=(w||1)/(h||1);camera.updateProjectionMatrix();fitCamera();}

  function dispose() {
    if(disposed)return;
    close();
    disposed=true;
    owned.forEach((o) => { try { o.dispose && o.dispose(); } catch (e) {} });
    if (el.parentNode) el.parentNode.removeChild(el);
    if (style.parentNode) style.parentNode.removeChild(style);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    window.removeEventListener('keydown', onKey, true);
    reducedMotion.removeEventListener?.('change',onMotionPreference);
    layoutObserver?.disconnect();
  }

  return {
    open, close, isOpen: () => opened, setZoom, zoomBy, update, render, resize,
    goToStage,selectPart,
    catalogue:()=>NAMES.map((name,index)=>({name,spanMetres:STAGE_SCALE_M[index],limit:LIMITS[index],source:SOURCES[index]})),
    parts:()=>STAGES[currentStage]?.parts.map(({id,label,note})=>({id,label,note}))||[],
    get currentStage(){return currentStage;},
    get selectedPart(){return selectedPart;},
    onClose: (cb) => { onCloseCb = cb; }, dispose,
    get zoom() { return t; },
    // Introspection for verification: the visible stages and their fade/scale at the
    // current zoom, so the seamless cross-dissolve can be confirmed, not assumed.
    stageStates() {
      return STAGES.map((st) => ({
        name: st.name, visible: st.group.visible,
        scale: +st.group.scale.x.toFixed(3),
        rotation: [st.group.rotation.x,st.group.rotation.y,st.group.rotation.z],
        opacity: st.group.userData.meshes.length
          ? +(st.group.userData.meshes[0].material.opacity).toFixed(3) : 0,
      })).filter((s) => s.visible);
    },
  };
}
