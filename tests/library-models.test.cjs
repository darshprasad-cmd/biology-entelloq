const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const registrations = [];
const context = {window:{}, LABS:{register(id,definition){registrations.push({id,...definition});}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/library/experiments.js'),'utf8'),context);
const m = context.window.BIO_MODELS;
const plain = x => JSON.parse(JSON.stringify(x));
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} ≈ ${b}`);

test('all eight new priority benches expose working builders and topic links',()=>{
  assert.equal(registrations.length,8);
  assert.equal(new Set(registrations.map(x=>x.id)).size,8);
  for(const lab of registrations){assert.equal(typeof lab.build,'function');assert.ok(lab.relatedTopics.length);}
});
test('osmosis conserves the trapped solute and reverses across isotonicity',()=>{
  assert.equal(m.osmosis(1,300,false).flow,0);
  assert.ok(m.osmosis(1,150,false).flow>0);
  assert.ok(m.osmosis(1,450,false).flow<0);
  for(const volume of [.3,.8,1,1.3,1.7])close(m.osmosis(volume,150,true).internal*volume,300);
  assert.ok(m.osmosis(1.2,150,true).flow<m.osmosis(1.2,150,false).flow);
});
test('photosynthesis retains respiratory demand in darkness and saturates with light',()=>{
  const v={light:0,co2:400,temp:25,color:'white'};
  assert.equal(m.photosynthesis(v).gross,0);assert.ok(m.photosynthesis(v).net<0);
  const low=m.photosynthesis({...v,light:100}).gross,mid=m.photosynthesis({...v,light:200}).gross;
  const high=m.photosynthesis({...v,light:1200}).gross,last=m.photosynthesis({...v,light:1300}).gross;
  assert.ok(mid-low>last-high);
  assert.ok(m.photosynthesis({...v,light:600,color:'green'}).gross>0);
  assert.equal(m.photosynthesis({...v,light:600,co2:0}).gross,0);
});
test('fermentation yields two ATP per glucose and distinguishes yeast from muscle products',()=>{
  const v={glucose:8,temp:35,oxygen:0,organism:'muscle'},r=m.respiration(v);
  assert.equal(r.oxygen,0);assert.equal(r.co2,0);close(r.atp/r.glucose,2);
  close(m.respiration({...v,organism:'yeast'}).co2/r.glucose,2);
  const noFuel=m.respiration({...v,glucose:0});assert.equal(noFuel.atp,0);
  assert.ok(m.respiration({...v,oxygen:20}).atp>r.atp);
});
test('cardiac output obeys its units and the illustrative vessel relation scales to the fourth power',()=>{
  const v={hr:72,sv:70,resistance:17,diameter:100},r=m.heart(v);
  close(r.output,5.04);close(r.pressure,5.04*17+5);
  close(m.heart({...v,diameter:125}).resistance/r.resistance,Math.pow(1/1.25,4));
});
test('gas exchange follows Fick area/thickness scaling and respects ventilation supply',()=>{
  const v={breaths:12,tidal:.5,area:70,thickness:.5,gradient:60},r=m.gasExchange(v);
  close(r.diffusion,250);close(r.ventilation,4.2);
  close(m.gasExchange({...v,thickness:1}).diffusion,r.diffusion/2);
  close(m.gasExchange({...v,area:35}).diffusion,r.diffusion/2);
  assert.equal(m.gasExchange({...v,gradient:0}).uptake,0);
  assert.ok(m.gasExchange({...v,breaths:4,tidal:.2}).uptake<r.uptake);
});
test('monohybrid and dihybrid probabilities sum to one with expected Mendelian ratios',()=>{
  assert.deepEqual(plain(m.cross('Aa','Aa')),{AA:.25,Aa:.5,aa:.25});
  assert.deepEqual(plain(m.cross('AA','aa')),{Aa:1});
  const di=m.cross('AaBb','AaBb');close(Object.values(di).reduce((s,p)=>s+p,0),1);
  close(Object.entries(di).filter(([g])=>g.includes('A')&&g.includes('B')).reduce((s,[,p])=>s+p,0),9/16);
  close(di.aabb,1/16);
});
test('X-linked crosses keep sex chromosomes intact and show recessive expression probabilities',()=>{
  assert.deepEqual(plain(m.cross('XAXa','XAY')),{XAXA:.25,XAY:.25,XAXa:.25,XaY:.25});
  assert.deepEqual(plain(m.cross('XaXa','XAY')),{XAXa:.5,XaY:.5});
});
test('all 64 standard codons exist with correct start and stop assignments',()=>{
  assert.equal(Object.keys(m.codons).length,64);
  assert.equal(m.codons.AUG,'Met');for(const stop of ['UAA','UAG','UGA'])assert.equal(m.codons[stop],'Stop');
  assert.equal(m.codons.UGG,'Trp');assert.equal(m.codons.AGA,'Arg');assert.equal(m.codons.AGG,'Arg');
  const translated=m.translate('ATGGCTTTTGAACCGTAA');
  assert.deepEqual(plain(translated.peptide),['Met','Ala','Phe','Glu','Pro']);
  assert.equal(translated.codons.at(-1).amino,'Stop');
});
test('fictional sequence edits distinguish silent, missense, nonsense and frameshift changes',()=>{
  const ref='ATGGCTTTTGAACCGTAA';
  assert.equal(m.mutation(ref,'ATGGCCTTTGAACCGTAA'),'Silent');
  assert.equal(m.mutation(ref,'ATGGATTTTGAACCGTAA'),'Missense');
  assert.equal(m.mutation(ref,'ATGGCTTTTTAACCGTAA'),'Nonsense / earlier stop');
  assert.equal(m.mutation(ref,'ATGGCTATTTGAACCGTAA'),'Frameshift');
  assert.equal(m.mutation(ref,'TTGGCTTTTGAACCGTAA'),'Start codon changed');
});
test('the active spindle checkpoint prevents anaphase with incomplete bipolar attachments',()=>{
  assert.equal(m.mitosisCanAdvance(2,50,true),false);
  assert.equal(m.mitosisCanAdvance(2,100,true),true);
  assert.equal(m.mitosisCanAdvance(2,50,false),true);
  assert.equal(m.mitosisCanAdvance(1,50,true),true);
});
test('slider-bound extremes remain finite for every quantitative model',()=>{
  for(const temp of [0,25,50])for(const light of [0,1500])for(const co2 of [0,1200])assert.ok(Object.values(m.photosynthesis({temp,light,co2,color:'green'})).every(Number.isFinite));
  for(const temp of [0,60])for(const glucose of [0,20])for(const oxygen of [0,20])assert.ok(Object.values(m.respiration({temp,glucose,oxygen,organism:'yeast'})).every(Number.isFinite));
  for(const diameter of [75,125])assert.ok(Object.values(m.heart({hr:180,sv:120,resistance:24,diameter})).every(Number.isFinite));
  for(const thickness of [.25,3])assert.ok(Object.values(m.gasExchange({breaths:40,tidal:1.2,area:100,thickness,gradient:100})).every(Number.isFinite));
});
