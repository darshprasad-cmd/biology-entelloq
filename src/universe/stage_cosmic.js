/*
 * stage_cosmic.js — the five largest scales: UNIVERSE → EARTH → BIOME →
 * ECOSYSTEM → ORGANISM.
 *
 * The top two scales are built on REAL public-domain photography (see
 * _textures.js): the universe is the Hubble eXtreme Deep Field — every smudge in
 * it is an actual galaxy — and Earth is the NASA Blue Marble wrapped on a true 3D
 * sphere, with the Earth-at-Night city lights glowing on its dark side. Below the
 * biome, photographs stop being the honest medium and the scenes are modelled in
 * 3D instead, which is what scientific visualisation does.
 */

UNI.register('universe', ({ THREE, KIT, meta }) => {
  const root = KIT.group(); const H = KIT.HEX;
  // alphaMap reads the green channel, not a sprite's alpha: an opaque grayscale
  // mask is required to feather the photograph without hard rectangular edges.
  const maskCanvas=document.createElement('canvas');maskCanvas.width=maskCanvas.height=128;
  const maskContext=maskCanvas.getContext('2d'),gradient=maskContext.createRadialGradient(64,64,4,64,64,64);
  gradient.addColorStop(0,'#ffffff');gradient.addColorStop(0.45,'#808080');gradient.addColorStop(1,'#000000');
  maskContext.fillStyle=gradient;maskContext.fillRect(0,0,128,128);
  const nebulaMask=new THREE.CanvasTexture(maskCanvas);

  // ── the sky IS the real deep field. A large inward-facing sphere puts the
  //    camera inside the actual Hubble XDF rather than in front of a picture.
  const skyMat = KIT.track(new THREE.MeshBasicMaterial({
    map: texLoad(THREE, 'deepField'), side: THREE.BackSide,
    transparent: true, opacity: 0.34, depthWrite: false,
  }));
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5.2, 48, 32), skyMat);
  root.add(sky);

  // a second, counter-rotating copy adds real parallax depth to the field
  const sky2Mat = KIT.track(new THREE.MeshBasicMaterial({
    map: texLoad(THREE, 'deepField'), side: THREE.BackSide, transparent: true,
    opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const sky2 = new THREE.Mesh(new THREE.SphereGeometry(3.6, 32, 24), sky2Mat);
  sky2.rotation.set(1.1, 2.2, 0.4); root.add(sky2);

  // A Hubble spiral photograph, not an exterior photograph of our Milky Way.
  const galMat = KIT.track(new THREE.MeshBasicMaterial({
    map: texLoad(THREE, 'galaxy'), transparent: true, opacity: 0.74,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const milky = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.2), galMat);
  milky.rotation.set(-0.5, 0.2, 0.3);
  root.add(milky);
  // Keep the photographed nucleus: an added opaque glow sphere erased its detail.

  // ── a real nebula (Carina pillars), off to one side and slowly drifting
  const nebMat = KIT.track(new THREE.MeshBasicMaterial({
    map: texLoad(THREE, 'nebula'), alphaMap: nebulaMask, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const neb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.4), nebMat);
  neb.position.set(-2.1, 1.2, -2.4); neb.rotation.z = 0.5; root.add(neb);
  const neb2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.9), nebMat.clone());
  KIT.track(neb2.material); neb2.material.userData.baseOpacity = 0.12;
  neb2.position.set(2.4, -1.4, -2.0); neb2.rotation.z = -1.1; root.add(neb2);

  // ── foreground stars, so moving through the field has real depth
  const N = 900, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = KIT.hash(i + 101) * KIT.TAU, y = KIT.hash(i + 211) * 2 - 1;
    const r = 1.6 + KIT.hash(i + 313) * 2.6, radial = Math.sqrt(1 - y * y);
    const v = new THREE.Vector3(Math.cos(a) * radial, y, Math.sin(a) * radial).multiplyScalar(r);
    sp[i * 3] = v.x; sp[i * 3 + 1] = v.y; sp[i * 3 + 2] = v.z;
  }
  const stars = KIT.points(sp, H.ink, 0.009, { opacity: 0.52 });
  root.add(stars);

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'uni-milkyway', get: (v) => milky.getWorldPosition(v), meta: HS.milkyway },
    { id: 'uni-elements', get: (v) => neb.getWorldPosition(v), meta: HS.elements },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt, d, camera) {
    clock += dt;
    // billboard the flat plates so they never reveal themselves as planes
    milky.quaternion.copy(camera.quaternion); milky.rotateZ(clock * 0.02);
    neb.quaternion.copy(camera.quaternion); neb2.quaternion.copy(camera.quaternion);
    sky.rotation.y += dt * 0.004; sky2.rotation.y -= dt * 0.010;
    stars.rotation.y += dt * 0.006;
  }
  return { root, update, hotspots, dispose: () => { nebulaMask.dispose(); KIT.dispose(root); } };
});


UNI.register('earth', ({ THREE, KIT, meta }) => {
  const root = KIT.group(); const H = KIT.HEX;
  const globe = KIT.group(); root.add(globe);

  // ── the planet: real Blue Marble colour + real city lights as the emissive
  //    map, so the night side lights up exactly where humans actually live.
  const earthMat = KIT.track(new THREE.MeshStandardMaterial({
    map: texLoad(THREE, 'earthDay'),
    emissiveMap: texLoad(THREE, 'earthNight'),
    emissive: 0xffd9a0, emissiveIntensity: 0.22,
    roughness: 0.82, metalness: 0.0, transparent: true,
  }));
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.35, 96, 64), earthMat);
  earth.rotation.y = -1.2;   // start on Africa/Europe, the classic framing
  globe.add(earth);

  // ── atmosphere: a rim-lit shell. Backside + additive gives the blue limb glow
  //    you see from orbit without needing a custom shader.
  const atmoMat = KIT.track(new THREE.MeshBasicMaterial({
    color: 0x5fa8e8, transparent: true, opacity: 0.12,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.38, 48, 32), atmoMat));
  const haloMat = KIT.track(new THREE.MeshBasicMaterial({
    color: 0x2f7fd0, transparent: true, opacity: 0.025,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.42, 32, 24), haloMat));

  // ── cloud deck: a thin procedural shell that drifts against the surface
  const cloudTex = KIT.noiseTex(256, 11, 5);
  const cloudMat = KIT.track(new THREE.MeshStandardMaterial({
    map: cloudTex, alphaMap: cloudTex, transparent: true, opacity: 0.16,
    roughness: 1, metalness: 0, depthWrite: false, color: 0xffffff,
  }));
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.375, 64, 40), cloudMat);
  globe.add(clouds);

  // the deep field stays faintly behind the planet — we are still in space
  const bgMat = KIT.track(new THREE.MeshBasicMaterial({
    map: texLoad(THREE, 'deepField'), side: THREE.BackSide,
    transparent: true, opacity: 0.12, depthWrite: false,
  }));
  root.add(new THREE.Mesh(new THREE.SphereGeometry(6, 32, 24), bgMat));

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'earth-atmo', get: (v) => v.set(0, 1.5, 0.35).applyMatrix4(globe.matrixWorld), meta: HS.atmosphere },
    { id: 'earth-ocean', get: (v) => v.set(1.05, -0.45, 0.6).applyMatrix4(globe.matrixWorld), meta: HS.oceans },
    { id: 'earth-land', get: (v) => v.set(-0.55, 0.45, 1.1).applyMatrix4(globe.matrixWorld), meta: HS.land },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt) {
    clock += dt;
    earth.rotation.y += dt * 0.035;          // a real, unhurried rotation
    clouds.rotation.y += dt * 0.048;         // weather outruns the ground
    clouds.rotation.x = Math.sin(clock * 0.05) * 0.01;
  }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});


// Curved broadleaf shared by canopy and understory. No faceted foliage blobs.
function cosmicLeafGeometry(THREE) {
  const p=[], indices=[];
  for(let j=0;j<=8;j++) {
    const t=j/8, w=Math.sin(Math.PI*t)*0.038;
    for(let side=-1;side<=1;side++) p.push(side*w,(t-0.5)*0.14,Math.sin(t*Math.PI)*0.009-Math.abs(side)*0.007);
  }
  for(let j=0;j<8;j++) for(let k=0;k<2;k++) { const a=j*3+k; indices.push(a,a+1,a+3,a+1,a+4,a+3); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

UNI.register('biome', ({ THREE, KIT, meta }) => {
  const root=KIT.group(), world=KIT.group(0,0.06,0); root.add(world); world.rotation.x=0.42; world.scale.setScalar(0.77);
  const bark=KIT.surface(0x43372b,{rough:0.95}), soil=KIT.surface(0x302b21,{rough:1});
  soil.map=KIT.noiseTex(128,81,5); bark.bumpMap=KIT.noiseTex(128,47,4); bark.bumpScale=0.006;
  const ground=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.49,0.14,64),soil);ground.position.y=-0.54;world.add(ground);
  const path=(points,r,mat)=>new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,r,5,false),mat);
  const leafTransforms=[], trees=[];
  function leaf(pos,rotation,scale,color,origin) { leafTransforms.push({pos,rotation,scale,color,origin}); }
  for(let i=0;i<30;i++) {
    const theta=i*2.399963, radius=0.4+Math.sqrt(KIT.hash(i+121))*0.95;
    const x=Math.cos(theta)*radius,z=Math.sin(theta)*radius;
    const tree=KIT.group(x,-0.47,z),h=0.65+KIT.hash(i+7)*0.55,lean=(KIT.hash(i+13)-0.5)*0.1;
    tree.add(path([[0,0,0],[lean*0.3,h*0.4,0],[lean,h,0]],0.018+KIT.hash(i+19)*0.011,bark));
    for(let k=0;k<5;k++) {
      const a=k*2.399963+i,extent=0.16+KIT.hash(k*31+i+9)*0.13,by=h*(0.53+k*0.055);
      const end=[lean+Math.cos(a)*extent,by+0.20,Math.sin(a)*extent];
      tree.add(path([[lean*by/h,by,0],[end[0]*0.75,by+0.09,end[2]*0.75],end],0.006,bark));
      for(let n=0;n<25;n++) {
        const q=i*500+k*31+n,aa=KIT.hash(q+61)*KIT.TAU,rr=Math.sqrt(KIT.hash(q+83))*0.17;
        leaf([x+end[0]+Math.cos(aa)*rr,-0.47+end[1]+(KIT.hash(q+91)-0.5)*0.12,z+end[2]+Math.sin(aa)*rr],
          [1.0+KIT.hash(q+151)*0.75,KIT.hash(q+17)*KIT.TAU,KIT.hash(q+191)*KIT.TAU],0.7+KIT.hash(q+211)*0.7,
          new THREE.Color().setHSL(0.23+KIT.hash(q+231)*0.08,0.35+KIT.hash(q+251)*0.15,0.07+KIT.hash(q+271)*0.07),[x+end[0],-0.47+end[1],z+end[2]]);
      }
    }
    for(let k=0;k<4;k++){const a=k*1.57+i;tree.add(path([[0,0.12,0],[Math.cos(a)*0.09,0.02,Math.sin(a)*0.09],[Math.cos(a)*0.17,0,Math.sin(a)*0.17]],0.013,bark));}
    world.add(tree);trees.push(tree);
  }
  // Visible understory, root flares and leaf litter complete the forest floor.
  for(let i=0;i<16;i++) {
    const a=i*2.399963,r=0.32+KIT.hash(i+531)*1.05,x=Math.cos(a)*r,z=Math.sin(a)*r;
    for(let k=0;k<5;k++) {
      const angle=k*KIT.TAU/5+a,end=[x+Math.cos(angle)*0.20,-0.30,z+Math.sin(angle)*0.20];
      world.add(path([[x,-0.47,z],[x,-0.28,z],end],0.003,KIT.surface(0x456a35,{rough:0.9})));
      for(let n=1;n<=6;n++) for(const side of [-1,1]) {
        const t=n/7; leaf([x+(end[0]-x)*t+Math.sin(angle)*side*0.025,-0.47+Math.sin(t*Math.PI)*0.16,z+(end[2]-z)*t-Math.cos(angle)*side*0.025],
          [1.1,0,-angle+side*0.7],0.42,new THREE.Color(0x496f37));
      }
    }
  }
  for(let i=0;i<210;i++) {
    const a=KIT.hash(i+1231)*KIT.TAU,r=Math.sqrt(KIT.hash(i+1313))*1.45;
    leaf([Math.cos(a)*r,-0.46+KIT.hash(i+1471)*0.012,Math.sin(a)*r],[Math.PI/2,0,a],0.55,new THREE.Color().setHSL(0.10,0.3,0.14+KIT.hash(i+145)*0.12));
  }
  const leaves=new THREE.InstancedMesh(cosmicLeafGeometry(THREE),KIT.surface(0xaabfa0,{rough:0.89,side:THREE.DoubleSide}),leafTransforms.length);
  const dummy=new THREE.Object3D();
  leafTransforms.forEach((l,i)=>{dummy.position.set(...l.pos);dummy.rotation.set(...l.rotation);dummy.scale.setScalar(l.scale);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,l.color);});
  world.add(leaves);
  const twigs=[];
  for(const l of leafTransforms)if(l.origin){const end=new THREE.Vector3(0,-0.07*l.scale,0).applyEuler(new THREE.Euler(...l.rotation)).add(new THREE.Vector3(...l.pos));twigs.push(...l.origin,...end.toArray());}
  const twigGeo=new THREE.BufferGeometry();twigGeo.setAttribute('position',new THREE.Float32BufferAttribute(twigs,3));
  world.add(new THREE.LineSegments(twigGeo,KIT.track(new THREE.LineBasicMaterial({color:0x4a4932,transparent:true,opacity:0.8}))));
  const water=new THREE.Mesh(new THREE.CircleGeometry(0.30,48),KIT.surface(0x324a42,{rough:0.3,metal:0.06}));water.rotation.x=-Math.PI/2;water.scale.set(1,0.7,1);water.position.set(0.25,-0.455,0.8);world.add(water);
  root.userData.structure={representation:'illustrative forest diorama',trees:30,individualLeaves:leafTransforms.length,rooted:true};
  const HS=meta.hotspots||{};
  const hotspots=[
    {id:'biome-canopy',get:v=>v.set(-0.2,0.55,0.2).applyMatrix4(world.matrixWorld),meta:HS.canopy},
    {id:'biome-soil',get:v=>v.set(-0.75,-0.47,0.95).applyMatrix4(world.matrixWorld),meta:HS.soil},
    {id:'biome-water',get:v=>water.getWorldPosition(v),meta:HS.water},
    {id:'biome-roots',get:v=>v.set(0,0.06,0).applyMatrix4(trees[0].matrixWorld),meta:HS.roots},
    {id:'biome-understory',get:v=>v.set(0.32+KIT.hash(531)*1.05,-0.30,0).applyMatrix4(world.matrixWorld),meta:HS.understory},
    {id:'biome-litter',get:v=>{const leaf=leafTransforms[leafTransforms.length-1];v.set(...leaf.pos).applyMatrix4(world.matrixWorld);},meta:HS.litter},
  ].filter(h=>h.meta);
  let clock=0;
  function update(dt){clock+=dt;world.rotation.y=Math.sin(clock*0.06)*0.12;}
  return {root,update,hotspots,dispose:()=>KIT.dispose(root)};
});


UNI.register('ecosystem', ({ THREE, KIT, meta }) => {
  const root=KIT.group(), spin=KIT.group();root.add(spin);
  const NODES=[
    {id:'producer',pos:[-0.1,-0.83,0]}, {id:'herbivore',pos:[-1.08,0.15,0.05]},
    {id:'predator',pos:[0.53,0.91,0]}, {id:'decomposer',pos:[1.0,-0.57,0.06]},
  ], nodeObjs={};
  const branch=(g,points,r,mat)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,16,r,6,false),mat);g.add(m);return m;};
  const brown=KIT.surface(0x544034,{rough:0.92}),green=KIT.surface(0x64834a,{rough:0.84}),dark=KIT.surface(0x403c30,{rough:0.74});
  const ball=(g,pos,scale,mat)=>{const m=KIT.sphere(1,20,mat);m.position.set(...pos);m.scale.set(...scale);g.add(m);return m;};
  NODES.forEach(n=>{const g=KIT.group(...n.pos);spin.add(g);nodeObjs[n.id]=g;});
  const plant=nodeObjs.producer;
  branch(plant,[[0,-0.32,0],[-0.03,0,0],[0.03,0.38,0]],0.016,green);
  const leafGeo=cosmicLeafGeometry(THREE),leafMat=KIT.surface(0x557f46,{rough:0.85,side:THREE.DoubleSide});
  for(let i=0;i<7;i++){
    const side=i%2?-1:1,y=-0.2+i*0.075;
    branch(plant,[[0,y,0],[side*0.09,y+0.06,0],[side*0.19,y+0.1,0]],0.006,green);
    const l=new THREE.Mesh(leafGeo,leafMat);l.scale.set(3,2.7,3);l.rotation.z=-side*0.8;l.position.set(side*0.2,y+0.18,0);plant.add(l);
  }
  // A connected larva: six thoracic legs and five pairs of abdominal prolegs.
  const larva=nodeObjs.herbivore,parts=[];
  for(let i=0;i<12;i++){
    const x=-0.34+i*0.06,y=Math.sin(i*0.34)*0.08;
    parts.push(ball(larva,[x,y,0],[0.052,0.082-i*0.002,0.063],i===0?brown:green));
    if([1,2,3,6,7,8,9,11].includes(i)) for(const s of [-1,1]) branch(larva,[[x,y-0.035,s*0.03],[x+0.008,y-0.085,s*0.07],[x+0.02,y-0.10,s*0.07]],i<4?0.007:0.014,brown);
    if(i>0){const stripe=new THREE.Mesh(new THREE.TorusGeometry(0.067-i*0.001,0.003,4,16),brown);stripe.rotation.y=Math.PI/2;stripe.position.set(x,y,0);larva.add(stripe);}
  }
  const spider=nodeObjs.predator;
  ball(spider,[0.10,0.04,0],[0.16,0.21,0.10],brown);ball(spider,[-0.05,-0.13,0.02],[0.10,0.11,0.07],dark);
  for(let i=0;i<4;i++)for(const s of [-1,1]){
    const y=-0.16+i*0.055;
    branch(spider,[[s*0.065,y,0],[s*(0.18+i*0.015),y+0.16-i*0.07,0.025],[s*(0.34-i*0.02),y+0.22-i*0.12,-0.01],[s*(0.38-i*0.025),y+0.1-i*0.09,-0.02]],0.012,dark);
  }
  for(const s of [-1,1])ball(spider,[s*0.032,-0.205,0.08],[0.008,0.008,0.008],KIT.surface(0x171a16,{rough:0.4}));
  const fungi=nodeObjs.decomposer;
  const log=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,0.68,16),brown);log.rotation.z=Math.PI/2;log.position.y=-0.12;fungi.add(log);
  const cream=KIT.surface(0xc6b795,{rough:0.89}),capMat=KIT.surface(0x98765b,{rough:0.76});
  for(let i=0;i<5;i++){
    const x=(i-2)*0.12,h=0.15+KIT.hash(i+91)*0.16;
    branch(fungi,[[x,-0.12,0],[x+0.02,h*0.5,0],[x,h,0]],0.018,cream);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.10,24,12,0,KIT.TAU,0,Math.PI/2),capMat);cap.position.set(x,h,0);cap.scale.y=0.5;fungi.add(cap);
    const underside=new THREE.Mesh(new THREE.CircleGeometry(0.097,24),cream);underside.rotation.x=Math.PI/2;underside.position.set(x,h,0);fungi.add(underside);
    for(let k=0;k<7;k++){const a=k*KIT.TAU/7;branch(fungi,[[x,-0.15,0],[x+Math.cos(a)*0.14,-0.23,Math.sin(a)*0.07],[x+Math.cos(a)*0.21,-0.26,Math.sin(a)*0.1]],0.003,cream);}
  }
  // Trophic energy paths and one separately coloured nutrient-return path.
  const edges=[['producer','herbivore'],['herbivore','predator'],['producer','decomposer'],['herbivore','decomposer'],['predator','decomposer'],['decomposer','producer']];
  const flows=[];
  edges.forEach(([a,b],n)=>{
    const pa=nodeObjs[a].position.clone(),pb=nodeObjs[b].position.clone();
    pa.z=pb.z=-0.22;
    const color=n===5?0xb09a6b:0x698f7c;
    const lineMat=KIT.track(new THREE.LineBasicMaterial({color,transparent:true,opacity:0.38}));
    spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([pa,pb]),lineMat));
    const dots=KIT.points(new Float32Array(5*3),color,0.018,{opacity:0.55});spin.add(dots);flows.push({pa,pb,dots,offset:KIT.hash(n+901)});
  });
  const HS=meta.hotspots||{},hotspots=NODES.map(n=>({id:'eco-'+n.id,get:v=>nodeObjs[n.id].getWorldPosition(v),meta:HS[n.id]})).filter(h=>h.meta);
  root.userData.structure={representation:'illustrative food web; organisms not to scale',organisms:['plant','caterpillar','spider','fungi'],energyLinks:5,nutrientLinks:1};
  let clock=0;
  function update(dt){
    clock+=dt;spin.rotation.y=Math.sin(clock*0.05)*0.08;
    for(const f of flows){const p=f.dots.geometry.attributes.position;for(let i=0;i<5;i++){const t=(clock*0.12+f.offset+i/5)%1;p.setXYZ(i,KIT.lerp(f.pa.x,f.pb.x,t),KIT.lerp(f.pa.y,f.pb.y,t),-0.22);}p.needsUpdate=true;}
  }
  return {root,update,hotspots,dispose:()=>KIT.dispose(root)};
});


UNI.register('organism', ({ THREE, KIT, meta }) => {
  const root=KIT.group(),body=KIT.group();root.add(body);
  const skin=KIT.surface(0x83998f,{rough:0.88,opacity:0.13,side:THREE.DoubleSide});skin.depthWrite=false;skin.userData.baseDepthWrite=false;
  const bone=KIT.surface(0xb6b39c,{rough:0.86}),nerve=KIT.surface(0xa6b39b,{rough:0.82}),artery=KIT.surface(0xa6655d,{rough:0.75}),vein=KIT.surface(0x687f94,{rough:0.75});
  function part(pos,scale,mat){const m=KIT.sphere(1,28,mat);m.position.set(...pos);m.scale.set(...scale);body.add(m);return m;}
  function tube(points,r,mat,name='',steps=48){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(c,steps,r,8,false),mat);m.name=name;m.userData.curve=c;body.add(m);return m;}
  function segment(a,b,r1,r2,mat){
    const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,aa.distanceTo(bb),16),mat);
    m.position.copy(aa).add(bb).multiplyScalar(0.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bb.sub(aa).normalize());body.add(m);
    part(a,[r1,r1,r1],mat);part(b,[r2,r2,r2],mat);
  }
  // A profiled thorax/waist/pelvis rather than one capsule. Connected neck, limbs,
  // hands, fingers and feet retain a complete silhouette in every rotation.
  const profile=[[-0.38,0.20,0.14],[-0.28,0.28,0.16],[-0.1,0.23,0.14],[0.12,0.23,0.15],[0.4,0.31,0.18],[0.65,0.34,0.17],[0.76,0.23,0.13],[0.81,0.10,0.10]];
  const p=[],ind=[],N=40;
  profile.forEach(([y,rx,rz])=>{for(let i=0;i<=N;i++){const a=i/N*KIT.TAU;p.push(Math.cos(a)*rx,y,Math.sin(a)*rz);}});
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i;ind.push(a,a+N+1,a+1,a+1,a+N+1,a+N+2);}
  const torsoGeo=new THREE.BufferGeometry();torsoGeo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));torsoGeo.setIndex(ind);torsoGeo.computeVertexNormals();body.add(new THREE.Mesh(torsoGeo,skin));
  segment([0,0.75,0],[0,0.91,0],0.095,0.09,skin);
  part([0,1.06,0],[0.165,0.225,0.155],skin);
  part([0,1.025,0.145],[0.045,0.08,0.035],skin);
  // Two coherent hemispheres with shallow surface folds and a longitudinal
  // fissure. The folds are illustrative, not patient-specific cortical anatomy.
  const brain=KIT.group(0,1.115,0);brain.name='org-brain';body.add(brain);
  const cortexMat=KIT.surface(0xb3a692,{rough:0.92}),sulcusMat=KIT.surface(0x716e61,{rough:0.98});
  for(const side of [-1,1]){
    const geo=new THREE.SphereGeometry(1,48,40),bp=geo.attributes.position;
    for(let i=0;i<bp.count;i++){
      const x=bp.getX(i),y=bp.getY(i),z=bp.getZ(i);
      const groove=Math.pow(0.5+0.5*Math.sin(y*24+Math.sin(z*17)*1.8+side*x*8),8);
      const d=1-0.055*groove;
      bp.setXYZ(i,x*0.067*d,y*0.127*d,z*0.108*d);
    }
    geo.computeVertexNormals();
    const hemi=new THREE.Mesh(geo,cortexMat);hemi.position.x=side*0.068;hemi.name=side<0?'org-cerebrum-right':'org-cerebrum-left';brain.add(hemi);
    for(let row=0;row<7;row++){
      const pts=[];
      for(let k=0;k<=24;k++){
        const u=-0.75+k/24*1.5,v=-0.70+row*0.23+Math.sin(k/24*Math.PI*2+row)*0.035;
        const z=Math.sqrt(Math.max(0.02,1-u*u-v*v));
        pts.push(new THREE.Vector3(side*0.068+u*0.067,v*0.127,z*0.108));
      }
      brain.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),30,0.0016,4,false),sulcusMat));
    }
  }
  const cerebellum=part([0,1.025,-0.064],[0.085,0.047,0.063],cortexMat);cerebellum.name='org-cerebellum';
  tube([[0,1.025,-0.045],[0,0.96,-0.055],[0,0.89,-0.095]],0.025,nerve,'org-brainstem');
  const joints=[];
  for(const s of [-1,1]){
    const shoulder=[s*0.31,0.68,0],elbow=[s*0.50,0.2,0.015],wrist=[s*0.58,-0.20,0.04],palm=[s*0.60,-0.30,0.04];
    const hip=[s*0.16,-0.31,0],knee=[s*0.19,-0.78,0.025],ankle=[s*0.19,-1.24,0];
    for(const [a,b,r1,r2]of[[shoulder,elbow,0.105,0.075],[elbow,wrist,0.077,0.045],[hip,knee,0.145,0.085],[knee,ankle,0.089,0.047]]){
      segment(a,b,r1,r2,skin);segment(a,b,0.023,0.019,bone);joints.push(a,b);
    }
    part(palm,[0.07,0.09,0.035],skin);part(palm,[0.04,0.055,0.016],bone);
    for(let k=0;k<4;k++){
      const a=[palm[0]+(k-1.5)*0.032,-0.34,0.045],b=[a[0]+s*0.007,-0.47+Math.abs(k-1.5)*0.018,0.048];
      segment(a,b,0.016,0.011,skin);segment(a,b,0.007,0.005,bone);
    }
    segment([palm[0]-s*0.05,-0.29,0.045],[palm[0]-s*0.105,-0.37,0.075],0.02,0.013,skin);
    part([s*0.19,-1.31,0.073],[0.074,0.068,0.16],skin);part([s*0.19,-1.31,0.07],[0.036,0.03,0.1],bone);
    // Continuous axial branches down each limb, not radial spokes.
    tube([[0,0.59,0.05],shoulder,[s*0.50,0.20,0.065],[s*0.58,-0.22,0.085]],0.009,artery);
    tube([[0,-0.15,0.03],hip,[s*0.19,-0.78,0.065],[s*0.19,-1.22,0.045]],0.012,artery);
    tube([[s*0.03,0.64,0.04],[s*0.06,0.91,0.04],[s*0.075,1.07,0.04]],0.01,artery);
    tube([[s*0.035,-0.15,-0.015],[s*0.15,-0.32,-0.015],[s*0.165,-0.78,0],[s*0.165,-1.20,0]],0.011,vein);
  }
  for(let i=0;i<24;i++){const y=0.79-i*0.041;part([0,y,-0.105],[0.042,0.017,0.034],bone);}
  tube([[0,0.89,-0.095],[0,0.5,-0.12],[0,-0.16,-0.08]],0.012,nerve);
  const cartilage=KIT.surface(0x83908a,{rough:0.90}),ribAnchors=[];
  for(let i=0;i<12;i++)for(const s of [-1,1]){
    const y=0.66-i*0.042,w=0.16+Math.sin(i/13*Math.PI)*0.12;
    const end=i>9?s*w*0.75:s*0.07,endY=y-0.075;
    const rib=tube([[s*0.023,y,-0.11],[s*w,y-0.014,-0.065],[s*w,y-0.058,0.066],[end,endY,0.15]],0.010,bone,'org-rib-'+(i+1)+(s<0?'-right':'-left'));
    // Flatten the rib's cross-section about its centreline: a curved band, not
    // a collection of equally round hoses. The final two pairs have free ends.
    const rp=rib.geometry.attributes.position;
    for(let j=0;j<rp.count;j++){const centre=rib.userData.curve.getPointAt(Math.floor(j/9)/48);rp.setY(j,centre.y+(rp.getY(j)-centre.y)*0.48);}
    rib.geometry.computeVertexNormals();
    if(i<7)tube([[end,endY,0.15],[s*0.046,endY+0.008,0.174],[s*0.018,endY+0.017,0.18]],0.007,cartilage,'org-costal-cartilage-'+i+'-'+s);
    else if(i<10)tube([[end,endY,0.15],[s*0.055,endY+0.040,0.166],[s*0.025,0.315,0.18]],0.006,cartilage,'org-costal-arch-'+i+'-'+s);
    if(i===5&&s===1)ribAnchors.push(rib.userData.curve.getPoint(0.67));
  }
  segment([0,0.62,0.18],[0,0.22,0.18],0.023,0.018,bone);
  tube([[-0.28,0.67,0.02],[-0.15,0.72,0.11],[0,0.67,0.17],[0.15,0.72,0.11],[0.28,0.67,0.02]],0.018,bone);
  for(const s of [-1,1])tube([[0,-0.2,-0.10],[s*0.24,-0.20,0],[s*0.24,-0.38,0.08],[s*0.06,-0.39,0.12],[0,-0.29,0.06]],0.034,bone);
  const lungMat=KIT.surface(0xa8867d,{rough:0.91}),fissureMat=KIT.surface(0x775e59,{rough:0.95}),lungs=[];
  for(const s of [-1,1]){
    const geo=new THREE.SphereGeometry(1,40,32),lp=geo.attributes.position;
    for(let i=0;i<lp.count;i++){
      const x=lp.getX(i),y=lp.getY(i),z=lp.getZ(i),width=0.118*(0.85-0.18*y);
      // The subject's left lung (viewer right) leaves a cardiac notch medially.
      const notch=s===1&&x<0?Math.exp(-(((y+0.3)/0.4)**2))*0.035*(-x):0;
      lp.setXYZ(i,x*width+notch,y*0.216,z*0.092);
    }
    geo.computeVertexNormals();const lung=new THREE.Mesh(geo,lungMat);lung.position.set(s*0.163,0.445,0.027);lung.name=s<0?'org-lung-right':'org-lung-left';body.add(lung);lungs.push(lung);
    const seam=(coords,name)=>{const pts=coords.map(([x,y])=>{const z=Math.sqrt(Math.max(0.05,1-(x/0.118)**2-(y/0.216)**2))*0.092+0.029;return [s*0.163+x,0.445+y,z];});tube(pts,0.0024,fissureMat,name);};
    seam([[-0.079,-0.13],[-0.03,-0.08],[0.025,-0.005],[0.08,0.065]],'org-oblique-fissure-'+s);
    if(s<0)seam([[-0.091,0.03],[-0.03,0.035],[0.031,0.023],[0.075,0.019]],'org-horizontal-fissure');
  }
  tube([[0,0.81,0.035],[0,0.62,0.035],[-0.12,0.5,0.047]],0.020,cartilage,'org-trachea');tube([[0,0.62,0.035],[0.12,0.5,0.047]],0.016,cartilage,'org-bronchus-left');
  for(let i=0;i<8;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(0.021,0.0024,4,16),bone);ring.rotation.x=Math.PI/2;ring.position.set(0,0.66+i*0.018,0.035);body.add(ring);}
  const heart=part([0.075,0.34,0.128],[0.084,0.115,0.075],artery);heart.rotation.z=0.28;heart.name='org-heart';
  const aorta=tube([[0.075,0.38,0.10],[0.025,0.57,0.08],[-0.035,0.48,0.06],[-0.025,-0.17,0.03]],0.018,artery,'org-aorta');
  const liver=part([-0.086,0.165,0.025],[0.169,0.074,0.10],KIT.surface(0x795044,{rough:0.87}));liver.rotation.z=-0.12;liver.name='org-liver';
  const gastricMat=KIT.surface(0xb69b80,{rough:0.88}),bowelMat=KIT.surface(0xae987d,{rough:0.9}),colonMat=KIT.surface(0x9c8971,{rough:0.9});
  tube([[0,0.72,-0.035],[0,0.27,-0.025],[0.075,0.17,0.025]],0.013,gastricMat,'org-esophagus');
  // A J-shaped stomach enters a continuous duodenum, a packed series of small
  // bowel folds, then an enclosing colon. This is selected anatomy, not a gut atlas.
  const stomach=tube([[0.075,0.17,0.025],[0.118,0.148,0.044],[0.143,0.105,0.056],[0.126,0.052,0.069],[0.071,0.033,0.071],[0.032,0.057,0.070]],0.036,gastricMat,'org-stomach',64);
  tube([[0.032,0.057,0.070],[-0.017,0.046,0.067],[-0.053,0.005,0.063],[-0.015,-0.036,0.061],[0.056,-0.045,0.059]],0.018,bowelMat,'org-duodenum',64);
  const bowelPoints=[[0.056,-0.045,0.059]];
  for(let row=0;row<5;row++){
    const y=-0.077-row*0.035,dir=row%2?-1:1;
    for(let k=0;k<=10;k++){const t=k/10,x=dir*(-0.10+t*0.20);bowelPoints.push([x,y+Math.sin(t*Math.PI*2)*0.010,0.076+Math.sin(t*Math.PI+row)*0.010]);}
  }
  bowelPoints.push([0.11,-0.255,0.068],[-0.145,-0.262,0.058]);
  const intestine=tube(bowelPoints,0.015,bowelMat,'org-small-intestine',220);
  const colon=tube([[-0.145,-0.262,0.058],[-0.17,-0.20,0.06],[-0.173,-0.01,0.05],[-0.14,0.002,0.075],[-0.065,-0.018,0.105],[0.07,-0.013,0.105],[0.169,-0.012,0.067],[0.173,-0.15,0.075],[0.159,-0.257,0.074],[0.07,-0.29,0.077],[0.017,-0.315,0.056],[0.017,-0.365,0.024]],0.023,colonMat,'org-large-intestine',140);
  // Shallow haustral grooves follow the wall; they do not become disconnected beads.
  const cg=colon.geometry.attributes.position;
  for(let j=0;j<cg.count;j++){const row=Math.floor(j/9),c=colon.userData.curve.getPointAt(row/140),r=0.90+0.10*Math.cos(row/140*Math.PI*2*25);cg.setXYZ(j,c.x+(cg.getX(j)-c.x)*r,c.y+(cg.getY(j)-c.y)*r,c.z+(cg.getZ(j)-c.z)*r);}colon.geometry.computeVertexNormals();
  const HS=meta.hotspots||{},hotspots=[
    {id:'org-nervous',get:v=>brain.getWorldPosition(v),meta:HS.nervous},
    {id:'org-circ',get:v=>heart.getWorldPosition(v),meta:HS.circulatory},
    {id:'org-skel',get:v=>v.set(0.2,0.4,0.15).applyMatrix4(body.matrixWorld),meta:HS.skeleton},
    {id:'org-lungs',get:v=>lungs[0].getWorldPosition(v),meta:HS.lungs},
    {id:'org-liver',get:v=>liver.getWorldPosition(v),meta:HS.liver},
    {id:'org-stomach',get:v=>v.copy(stomach.userData.curve.getPoint(0.5)).applyMatrix4(body.matrixWorld),meta:HS.stomach},
    {id:'org-intestine',get:v=>v.copy(intestine.userData.curve.getPoint(0.5)).applyMatrix4(body.matrixWorld),meta:HS.intestine},
    {id:'org-colon',get:v=>v.copy(colon.userData.curve.getPoint(0.55)).applyMatrix4(body.matrixWorld),meta:HS.colon},
    {id:'org-ribcage',get:v=>v.copy(ribAnchors[0]).applyMatrix4(body.matrixWorld),meta:HS.ribcage},
    {id:'org-aorta',get:v=>v.copy(aorta.userData.curve.getPoint(0.38)).applyMatrix4(body.matrixWorld),meta:HS.aorta},
  ].filter(h=>h.meta);
  root.userData.structure={representation:'illustrative human systems, no medical scan',connectedLimbs:4,hands:2,feet:2,ribPairs:12,vertebralMarkers:24,cerebralHemispheres:2,lungLobesIndicated:5,continuousDigestiveTract:true};
  let clock=0;
  function update(dt){clock+=dt;body.rotation.y=Math.sin(clock*0.10)*0.28;const s=1+Math.sin(clock*KIT.TAU)*0.025;heart.scale.set(0.084*s,0.115*s,0.075*s);}
  return {root,update,hotspots,dispose:()=>KIT.dispose(root)};
});
