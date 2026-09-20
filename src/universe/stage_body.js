/*
 * stage_body.js — the ORGAN (a beating heart) and the TISSUE it is built from.
 *
 * These are explanatory anatomical models, not scanned specimens or validated
 * physiological simulations. The heart has connected great vessels and surface
 * coronaries; tissue has branching fibres, striations and intercalated discs.
 * Both use the same illustrative cardiac cadence across the scale transition.
 */

/* A cardiac silhouette from a sphere: taper to an apex, deepen the septal groove. */
function BODY_heartGeo(THREE, KIT) {
  const g = new THREE.SphereGeometry(1, 72, 52);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + 1) / 2;                       // 0 at the apex, 1 at the base
    const taper = Math.pow(Math.max(0, t), 0.6); // narrow below, full above
    x *= 0.55 + 0.60 * taper;
    z *= 0.52 + 0.55 * taper;
    y = y * 1.18 - 0.10;
    // the interventricular groove — a real anterior furrow, not a paint line
    const across = (x * 0.92 + z * 0.38);
    const groove = Math.exp(-Math.pow(across / 0.26, 2)) * 0.11 * (1 - Math.abs(y) * 0.35);
    const len = Math.hypot(x, z) || 1;
    x -= (x / len) * groove; z -= (z / len) * groove;
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true;
  KIT.displace(g, 0.022, 3.4, 2);               // organic irregularity
  return g;
}

UNI.register('organ', ({ THREE, KIT, meta }) => {
  const root=KIT.group(),heart=KIT.group();root.add(heart);
  const myoMat=KIT.wet(0x844b40,{rough:0.69,clear:0.18,bump:0.009,seed:3});
  const body=new THREE.Mesh(BODY_heartGeo(THREE,KIT),myoMat);body.scale.setScalar(0.69);heart.add(body);
  const atrMat=KIT.wet(0x755044,{rough:0.76,clear:0.12,bump:0.008,seed:7});
  function mass(pos,scale,mat){const m=new THREE.Mesh(KIT.displace(new THREE.SphereGeometry(1,32,24),0.018,4.0,scale[0]*311),mat);m.position.set(...pos);m.scale.set(...scale);heart.add(m);return m;}
  // Anterior view: the subject's right is the viewer's left.
  const ra=mass([-0.40,0.49,0.06],[0.24,0.27,0.24],atrMat);
  const la=mass([0.27,0.55,-0.16],[0.25,0.22,0.21],atrMat);
  const appendage=mass([0.37,0.45,0.26],[0.22,0.12,0.16],atrMat);appendage.rotation.z=-0.36;
  mass([-0.27,0.5,0.34],[0.20,0.11,0.16],atrMat);
  const arterial=KIT.wet(0xa87866,{rough:0.67,clear:0.14,seed:11});
  const venous=KIT.wet(0x75828b,{rough:0.73,clear:0.12,seed:13});
  const lumenMat=KIT.surface(0x372b29,{rough:0.95,side:THREE.DoubleSide});
  function vessel(coords,r,mat,open=true){
    const curve=new THREE.CatmullRomCurve3(coords.map(p=>new THREE.Vector3(...p)));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,36,r,14,false),mat);heart.add(mesh);
    if(open){
      const end=curve.getPoint(1),tangent=curve.getTangent(1);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(r*0.93,r*0.10,6,24),mat);rim.position.copy(end);rim.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),tangent);heart.add(rim);
      const hole=new THREE.Mesh(new THREE.CircleGeometry(r*0.88,24),lumenMat);hole.position.copy(end).addScaledVector(tangent,-r*0.7);hole.quaternion.copy(rim.quaternion);heart.add(hole);
    }
    return curve;
  }
  // Arch + its three superior branches; pulmonary bifurcation, both cavae and
  // paired pulmonary-vein entries are connected to their receiving structures.
  const aorta=vessel([[0.02,0.4,0],[0.00,0.89,-0.10],[0.28,1.03,-0.2],[0.47,0.85,-0.28],[0.39,0.42,-0.33]],0.11,arterial);
  vessel([[0.08,0.97,-0.13],[0.03,1.17,-0.10]],0.046,arterial);
  vessel([[0.22,1.02,-0.18],[0.20,1.22,-0.16]],0.043,arterial);
  vessel([[0.35,0.99,-0.22],[0.45,1.17,-0.23]],0.041,arterial);
  const pulmonary=vessel([[-0.10,0.43,0.28],[0.04,0.77,0.24],[0.35,0.82,0.15],[0.60,0.75,0.03]],0.092,venous);
  vessel([[0.19,0.82,0.18],[-0.2,0.79,-0.1],[-0.6,0.68,-0.17]],0.070,venous);
  const superiorCava=vessel([[-0.44,0.45,-0.06],[-0.49,0.89,-0.06],[-0.48,1.07,-0.1]],0.082,venous);
  const inferiorCava=vessel([[-0.43,0.32,-0.1],[-0.48,0.10,-0.22],[-0.48,-0.1,-0.27]],0.074,venous);
  const pulmonaryVeins=[];
  for(const side of [-1,1])for(const y of [0.45,0.65])pulmonaryVeins.push(vessel([[0.25,y,-0.2],[side*0.53,y+0.03,-0.25]],0.045,arterial));
  // Project coronary paths onto the actual ventricular mesh. Old fixed z values
  // buried every coronary branch beneath the wall and left the heart featureless.
  body.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(),dir=new THREE.Vector3(0,0,-1);
  function front(x,y,lift=0.015){ray.set(new THREE.Vector3(x,y,2),dir);const hit=ray.intersectObject(body,false)[0];return hit?hit.point.add(new THREE.Vector3(0,0,lift)):new THREE.Vector3(x,y,0.2);}
  const coronaryMat=KIT.wet(0x9e4c3e,{rough:0.66,clear:0.17,seed:17}),fatMat=KIT.wet(0xb2a077,{rough:0.87,clear:0.06,seed:19});
  const mainXY=[[0.0,0.48],[-0.05,0.28],[0.03,0.02],[0.12,-0.25],[0.21,-0.52],[0.19,-0.72]];
  function surfaceVessel(xy,r,mat){const pts=xy.map(([x,y])=>front(x,y));const c=new THREE.CatmullRomCurve3(pts);heart.add(new THREE.Mesh(new THREE.TubeGeometry(c,50,r,8,false),mat));return c;}
  const coroMain=surfaceVessel(mainXY,0.018,coronaryMat);
  surfaceVessel(mainXY.map(([x,y])=>[x-0.037,y]),0.012,venous);
  for(let i=0;i<4;i++){
    const [x,y]=mainXY[i+1];
    for(const s of [-1,1])surfaceVessel([[x,y],[x+s*0.12,y-0.04],[x+s*0.26,y-0.12]],0.009-i*0.001,coronaryMat);
  }
  surfaceVessel([[-0.57,0.21],[-0.38,0.4],[0,0.47],[0.35,0.4],[0.55,0.25]],0.017,coronaryMat);
  for(let i=0;i<35;i++){
    const t=i/34,p=coroMain.getPoint(t);p.x+=(KIT.hash(i+93)-0.5)*0.09;
    const q=front(p.x,p.y,0.003),m=mass(q.toArray(),[0.035+KIT.hash(i+17)*0.016,0.026,0.012],fatMat);m.rotation.z=KIT.hash(i+31)*Math.PI;
  }
  // No fictitious glowing valve sphere visible through an opaque exterior.
  const valveAnchor=new THREE.Vector3(0.03,0.72,0.10);
  const ventricleAnchor=front(0.35,-0.2);
  heart.rotation.set(0.08,-0.12,0.10);
  root.userData.structure={representation:'illustrative external human heart; internal valves not exposed',greatVesselsConnected:true,coronariesSurfaceProjected:true};
  const HS=meta.hotspots||{},hotspots=[
    {id:'organ-atrium',get:v=>ra.getWorldPosition(v),meta:HS.atrium},
    {id:'organ-ventricle',get:v=>v.copy(ventricleAnchor).applyMatrix4(heart.matrixWorld),meta:HS.ventricle},
    {id:'organ-valve',get:v=>v.copy(valveAnchor).applyMatrix4(heart.matrixWorld),meta:HS.valve},
    {id:'organ-coronary',get:v=>v.copy(coroMain.getPoint(0.55)).applyMatrix4(heart.matrixWorld),meta:HS.coronary},
    {id:'organ-left-atrium',get:v=>la.getWorldPosition(v),meta:HS.leftAtrium},
    {id:'organ-auricle',get:v=>appendage.getWorldPosition(v),meta:HS.auricle},
    {id:'organ-aorta',get:v=>v.copy(aorta.getPoint(0.42)).applyMatrix4(heart.matrixWorld),meta:HS.aorta},
    {id:'organ-pulmonary',get:v=>v.copy(pulmonary.getPoint(0.35)).applyMatrix4(heart.matrixWorld),meta:HS.pulmonary},
    {id:'organ-svc',get:v=>v.copy(superiorCava.getPoint(0.7)).applyMatrix4(heart.matrixWorld),meta:HS.superiorCava},
    {id:'organ-ivc',get:v=>v.copy(inferiorCava.getPoint(0.7)).applyMatrix4(heart.matrixWorld),meta:HS.inferiorCava},
    {id:'organ-pulmonary-veins',get:v=>v.copy(pulmonaryVeins[3].getPoint(0.7)).applyMatrix4(heart.matrixWorld),meta:HS.pulmonaryVeins},
  ].filter(h=>h.meta);
  let clock=0;
  function update(dt){clock+=dt;heart.rotation.y=-0.12+Math.sin(clock*0.09)*0.22;const t=(clock*1.05)%1,sq=t<0.16?Math.sin(t/0.16*Math.PI):0;heart.scale.set(1-sq*0.025,1-sq*0.014,1-sq*0.025);}
  return {root,update,hotspots,dispose:()=>KIT.dispose(root)};
});


UNI.register('tissue', ({ THREE, KIT, meta }) => {
  const root=KIT.group(),sheet=KIT.group();root.add(sheet);
  const cellMat=KIT.wet(0xad7868,{rough:0.76,clear:0.08,bump:0.004,seed:23});cellMat.vertexColors=true;
  const discMat=KIT.surface(0x674c49,{rough:0.9}),nucMat=KIT.surface(0x655569,{rough:0.85});
  // Real surface striation, not rings floating around capsule primitives.
  const fibreGeo=new THREE.CylinderGeometry(0.1,0.1,0.55,24,72,false);fibreGeo.rotateZ(Math.PI/2);
  const pos=fibreGeo.attributes.position,col=[];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),band=0.76+0.24*Math.pow(0.5+0.5*Math.cos(x*2*Math.PI/0.047),5);
    pos.setY(i,pos.getY(i)*(0.94+0.06*Math.cos(x*12)));col.push(band,band*0.97,band*0.96);
  }
  fibreGeo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));fibreGeo.computeVertexNormals();
  const cells=[],ROWS=4,COLS=5;
  function path(points,r,mat){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(c,24,r,10,false),mat);sheet.add(m);return m;}
  for(let row=0;row<ROWS;row++)for(let c=0;c<COLS;c++){
    const x=(c-2)*0.55+(row%2?0.075:-0.075),y=(row-1.5)*0.35;
    const g=KIT.group(x,y,0);sheet.add(g);
    const fibre=new THREE.Mesh(fibreGeo,cellMat);g.add(fibre);
    const nucleus=KIT.sphere(1,20,nucMat);nucleus.scale.set(0.068,0.029,0.022);nucleus.position.set(0.012,0.018,0.096);g.add(nucleus);
    const line=[];
    for(let k=0;k<9;k++)line.push([x+0.266+(k%2?0.007:-0.007),y+(k-4)*0.024,Math.sqrt(Math.max(0,0.010-(k-4)**2*0.024**2))+0.003]);
    path(line,0.0055,discMat);
    cells.push({g,x,y,nucleus});
  }
  const branchMat=KIT.wet(0xa77466,{rough:0.8,clear:0.05,seed:41});
  let branches=0;const branchAnchors=[];
  for(let row=0;row<ROWS-1;row++)for(let c=0;c<COLS-1;c++){
    const a=cells[row*COLS+c],b=cells[(row+1)*COLS+c+1];
    path([[a.x+0.11,a.y,0],[a.x+0.24,a.y+0.08,0],[b.x-0.23,b.y-0.10,0],[b.x-0.11,b.y,0]],0.061,branchMat);branches++;
    branchAnchors.push(new THREE.Vector3(a.x+0.24,a.y+0.08,0.061));
  }
  const capCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-1.35,-0.80,0.22),new THREE.Vector3(-0.4,-0.1,0.22),new THREE.Vector3(0.35,0.25,0.22),new THREE.Vector3(1.35,0.80,0.22)]);
  sheet.add(new THREE.Mesh(new THREE.TubeGeometry(capCurve,70,0.051,12,false),KIT.glassy(0xb28d8b,{opacity:0.13,glow:0})));
  // Biconcave erythrocyte: radial depression on both faces, not a flattened ball.
  const rbcGeo=new THREE.SphereGeometry(0.041,24,16),rp=rbcGeo.attributes.position;
  for(let i=0;i<rp.count;i++){const x=rp.getX(i),z=rp.getZ(i),r=Math.hypot(x,z)/0.041;rp.setY(i,Math.sign(rp.getY(i))*0.014*Math.sqrt(Math.max(0,1-r*r))*(0.35+1.8*r*r));}rbcGeo.computeVertexNormals();
  const rbcMat=KIT.wet(0x975657,{rough:0.67,clear:0.15,seed:31}),rbcs=[];
  for(let i=0;i<10;i++){const m=new THREE.Mesh(rbcGeo,rbcMat);sheet.add(m);rbcs.push(m);}
  root.userData.structure={representation:'illustrative cardiac tissue; surface nuclei are teaching cutaways',cardiomyocytes:20,branches,discs:20,biconcaveRedCells:10};
  const HS=meta.hotspots||{},hotspots=[
    {id:'tis-cardio',get:v=>cells[7].g.getWorldPosition(v),meta:HS.cardiomyocyte},
    {id:'tis-disc',get:v=>v.set(0.266,0,0.105).applyMatrix4(cells[7].g.matrixWorld),meta:HS.disc},
    {id:'tis-cap',get:v=>v.copy(capCurve.getPoint(0.65)).applyMatrix4(sheet.matrixWorld),meta:HS.capillary},
    {id:'tis-nucleus',get:v=>cells[8].nucleus.getWorldPosition(v),meta:HS.nucleus},
    {id:'tis-striation',get:v=>v.set(-0.14,0,0.1).applyMatrix4(cells[12].g.matrixWorld),meta:HS.striation},
    {id:'tis-branch',get:v=>v.copy(branchAnchors[5]).applyMatrix4(sheet.matrixWorld),meta:HS.branch},
    {id:'tis-rbc',get:v=>rbcs[6].getWorldPosition(v),meta:HS.erythrocyte},
  ].filter(h=>h.meta);
  let clock=0;const rbcPoint=new THREE.Vector3(),rbcTangent=new THREE.Vector3(),normal=new THREE.Vector3(0,1,0);
  function update(dt){
    clock+=dt;sheet.rotation.y=Math.sin(clock*0.09)*0.15;sheet.rotation.x=-0.1;
    const t=(clock*1.05)%1,sq=t<0.16?Math.sin(t/0.16*Math.PI):0;sheet.scale.set(1-sq*0.025,1+sq*0.012,1);
    for(let i=0;i<rbcs.length;i++){const u=(clock*0.11+i/rbcs.length)%1;capCurve.getPoint(u,rbcPoint);capCurve.getTangent(u,rbcTangent);rbcs[i].position.copy(rbcPoint);rbcs[i].quaternion.setFromUnitVectors(normal,rbcTangent);}
  }
  return {root,update,hotspots,dispose:()=>KIT.dispose(root)};
});
