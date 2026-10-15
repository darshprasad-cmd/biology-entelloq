const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let THREE, ctx;
test.before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  ctx = vm.createContext({ THREE });
  for (const name of ['anatomy', 'heart', 'strata', 'surface', 'softbody'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src/lab', name+'.js'), 'utf8').replace(/^export\s+/gm, ''), ctx);
});
const find = (s, id) => s.parts.find(p => p.id === id).mesh;

test('ventricular shoulders taper to an offset apex and RV margins bury into the LV', () => {
  const s=ctx.buildHeart(THREE), lv=find(s,'lv-free-wall'), rv=find(s,'rv-free-wall');
  assert.ok(ctx.HEART_radius(1.1)>ctx.HEART_radius(-1), 'broad superior shoulder, not a symmetric ellipsoid');
  assert.ok(ctx.HEART_radius(-2.8)<ctx.HEART_radius(-1)*.5, 'tapered inferior mass');
  const apex=ctx.HEART_surfacePoint(THREE,-3.45,0);
  assert.ok(apex.x < -.7 && apex.z > 0, 'apex is displaced anatomically left and anterior');
  for (const phi of [-.12*Math.PI,.58*Math.PI]) for (const y of [-1.7,0,2.7]) {
    const a=ctx.HEART_surfacePoint(THREE,y,phi), b=ctx.HEART_surfacePoint(THREE,y,phi,true);
    assert.ok(a.distanceTo(b)<.07, 'RV free margin stays just inside the LV');
    const radial=new THREE.Vector3(Math.sin(phi),0,Math.cos(phi));
    assert.ok(b.clone().sub(a).dot(radial)<0,'no elevated free edge');
  }
  for (const mesh of [lv,rv]) {
    assert.ok(mesh.geometry.attributes.position.count < 9000, 'existing soft-body budget');
    assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));
  }
});

test('named coronary centrelines follow the revised cuttable walls', () => {
  const s=ctx.buildHeart(THREE);
  for (const id of ['lad','rca','circumflex','posterior-iv-branch']) {
    const curve=find(s,id).geometry.parameters.path;
    for(let i=0;i<=32;i++) {
      const p=curve.getPoint(i/32);
      // Nearest point over the radial angle accounts for the flattened posterior.
      let closest=Infinity;
      for(let k=0;k<=720;k++) {
        const a=-Math.PI+k/720*2*Math.PI;
        const rv=a>-.12*Math.PI&&a<.58*Math.PI&&p.y>=-1.85&&p.y<=2.9;
        closest=Math.min(closest,p.distanceTo(ctx.HEART_surfacePoint(THREE,p.y,a,rv,true)));
      }
      assert.ok(closest<.075, id+': no floating or deeply buried vessel, distance '+closest);
    }
  }
});

test('epicardium follows the revised ventricular envelope without hiding it under glass', () => {
  const s=ctx.buildHeart(THREE); ctx.buildStrata(THREE,'heart',s.parts,s.group);
  const epi=find(s,'epicardium'), pos=epi.geometry.attributes.position;
  assert.ok(epi.material.opacity<=.2 && epi.material.transmission===0);
  assert.equal(epi.material.depthWrite,false);
  for(let i=0;i<pos.count;i+=23) {
    const p=new THREE.Vector3().fromBufferAttribute(pos,i);
    if(p.y>2.85||p.y< -3.2) continue;
    let nearest=Infinity;
    for(let k=0;k<=720;k++) {
      const a=-Math.PI+k/720*2*Math.PI;
      const rv=a>-.12*Math.PI&&a<.58*Math.PI&&p.y>=-1.85&&p.y<=2.9;
      nearest=Math.min(nearest,p.distanceTo(ctx.HEART_surfacePoint(THREE,p.y,a,rv,true)));
    }
    assert.ok(nearest<.075,'adherent membrane matches both walls');
  }
});

test('septal tissue stays inside the retained ventricular envelope after exposure', () => {
  const s=ctx.buildHeart(THREE), sep=find(s,'septum'), pos=sep.geometry.attributes.position;
  for(let i=0;i<pos.count;i++) {
    const p=new THREE.Vector3().fromBufferAttribute(pos,i).add(sep.position);
    const lean=Math.max(0,1.4-p.y)*.16, x=p.x+lean, z=p.z-lean*.32;
    const radial=Math.hypot(x,z/(z>=0?.87:.75));
    assert.ok(radial<ctx.HEART_radius(p.y)*.90, 'no internal muscle protrudes through the narrowed posterior wall');
  }
});

test('partitioned ventricular boundary stays closed during surface finishing, press and circulation', () => {
  const s=ctx.buildHeart(THREE), a=find(s,'lv-free-wall'), b=find(s,'rv-free-wall');
  const key=(p,i)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
  const index=new Map(), pairs=[];
  for(const i of new Set(a.geometry.index.array)) index.set(key(a.geometry.attributes.position,i),i);
  for(const j of new Set(b.geometry.index.array)) {
    const i=index.get(key(b.geometry.attributes.position,j));
    if(i!==undefined) pairs.push([i,j]);
  }
  assert.ok(pairs.length>50,'walls share an actual sampled boundary, not overlapping shells');
  const surface=ctx.createSurfaceDetail(THREE,s.parts,'heart',s.group); surface.apply();
  s.group.updateMatrixWorld(true);
  const soft=ctx.createSoftBody(THREE,s.parts);
  const point=a.localToWorld(new THREE.Vector3().fromBufferAttribute(a.geometry.attributes.position,pairs[20][0]));
  soft.setLife(true); soft.press('lv-free-wall',point,.6,.5);
  for(let frame=0;frame<80;frame++) {
    soft.update(16);
    for(const [i,j] of pairs) {
      const x=new THREE.Vector3().fromBufferAttribute(a.geometry.attributes.position,i);
      const y=new THREE.Vector3().fromBufferAttribute(b.geometry.attributes.position,j);
      assert.ok(x.distanceTo(y)<1e-4,'shared wall boundary cannot open into a crack');
    }
  }
  soft.dispose(); surface.dispose();
});
