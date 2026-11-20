'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=path.join(__dirname,'../src/cbse/pollen-model.js'),M=require(file);
const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,a+' differs from '+b);
const row=(field,time,total,germinated,percent)=>M.record({field,time},{total,germinated,percent});
const validA=()=>row('A',20,9,6,66.7);

test('pure browser/CommonJS model is deterministic and explicitly synthetic, with frozen public metadata',()=>{
  const text=fs.readFileSync(file,'utf8'),context={};vm.runInNewContext(text,context);
  assert.equal(context.BioPollenModel.field().length,9);
  assert.deepEqual(M.field({field:'C',time:20}),M.field({field:'C',time:20}));
  for(const item of [M,M.constants,M.constants.FIELDS,M.constants.TIMES,M.questions,M.questions[0],M.questions[0].options,M.limits])assert.ok(Object.isFrozen(item));
  assert.doesNotMatch(text,/localStorage|fetch\(|getUserMedia|XMLHttpRequest|Math\.random|Date\.now/);
  assert.match(M.constants.NOTICE,/Synthetic.*not measured.*species validation.*completion/);
  assert.ok(M.limits.some(value=>/not.*independent biological replicates/.test(value)));
  assert.ok(M.limits.some(value=>/no fitted germination curve/.test(value)));
});

test('settings admit only named fields and authored times, rejecting coercion and accessors',()=>{
  assert.deepEqual(M.normalize(),{field:'A',time:0});
  assert.deepEqual(M.normalize({field:'B'}),{field:'B',time:0});
  const original=Object.freeze({field:'C',time:10});assert.deepEqual(M.normalize(original),original);assert.notEqual(M.normalize(original),original);
  for(const value of [null,[],'A',10,{field:'D'},{field:'constructor'},{field:undefined},{time:5},{time:30},{time:'10'},{time:NaN},{time:Infinity},{time:null},{time:undefined},{extra:true},{[Symbol('time')]:0}]){assert.equal(M.normalize(value),null);assert.equal(M.field(value),null);assert.equal(M.tally(value),null);}
  let called=false;assert.equal(M.normalize({get field(){called=true;return'A';}}),null);assert.equal(called,false);
  assert.equal(M.normalize(new Proxy({},{ownKeys(){throw Error('broken');}})),null);
});

test('distinct fields have stable unique grain IDs, complete visible geometry and independent returned arrays',()=>{
  const ids=new Set();
  for(const [name,count]of[['A',9],['B',11],['C',14]]){
    const initial=M.field({field:name,time:0});assert.equal(initial.length,count);
    for(const grain of initial){assert.ok(!ids.has(grain.id));ids.add(grain.id);assert.equal(grain.tube.length,0);assert.equal(grain.tubeLength,0);assert.equal(grain.ratio,0);}
    for(const time of[10,20]){
      const grains=M.field({field:name,time});assert.deepEqual(grains.map(g=>g.id),initial.map(g=>g.id));
      grains.forEach((grain,i)=>{
        assert.equal(grain.x,initial[i].x);assert.equal(grain.y,initial[i].y);assert.equal(grain.radius,initial[i].radius);assert.equal(grain.diameter,2*grain.radius);
        assert.ok(grain.x-grain.radius>0&&grain.x+grain.radius<M.constants.WIDTH);assert.ok(grain.y-grain.radius>0&&grain.y+grain.radius<M.constants.HEIGHT);
        close(grain.tubeLength/grain.diameter,grain.ratio);
        if(grain.tube.length){assert.deepEqual(grain.tube[0],{x:grain.x+grain.radius,y:grain.y});const length=grain.tube.slice(1).reduce((sum,p,j)=>sum+Math.hypot(p.x-grain.tube[j].x,p.y-grain.tube[j].y),0);close(length,grain.tubeLength);}
        for(const point of grain.tube)assert.ok(point.x>0&&point.x<M.constants.WIDTH&&point.y>0&&point.y<M.constants.HEIGHT);
      });
    }
  }
  assert.equal(ids.size,34);
  const first=M.field({field:'A',time:20});first[0].radius=999;first[1].tube[0].x=999;
  assert.notEqual(M.field({field:'A',time:20})[0].radius,999);assert.notEqual(M.field({field:'A',time:20})[1].tube[0].x,999);
});

test('strict threshold excludes equal and shorter tubes from n, while every recognizable grain stays in N',()=>{
  for(const [length,germinated]of[[0,false],[23.999,false],[24,false],[24.001,true],[48,true]]){
    const result=M.classify({radius:12,tubeLength:length,ruptured:false});assert.equal(result.scorable,true);assert.equal(result.germinated,germinated);
    if(length===24)assert.match(result.reason,/Equal is not greater/);
  }
  const damaged=M.classify({radius:12,tubeLength:48,ruptured:true});assert.equal(damaged.status,'ruptured');assert.equal(damaged.scorable,true);assert.equal(damaged.germinated,false);assert.match(damaged.reason,/history is unknown/);
  for(const value of[null,{},[],{radius:0,tubeLength:0,ruptured:false},{radius:12,tubeLength:-1,ruptured:false},{radius:12,tubeLength:'25',ruptured:false},{radius:12,tubeLength:Infinity,ruptured:false},{radius:12,tubeLength:25,ruptured:'false'}])assert.equal(M.classify(value),null);
});

test('all nine snapshots have independently specified counts and explicit total-field denominator',()=>{
  for(const [field,total,ruptured,qualified]of[['A',9,1,[0,3,6]],['B',11,1,[0,4,7]],['C',14,2,[0,5,8]]])for(const [index,time]of[0,10,20].entries()){
    const result=M.tally({field,time});assert.equal(result.total,total);assert.equal(result.ruptured,ruptured);assert.equal(result.germinated,qualified[index]);close(result.percent,100*qualified[index]/total);
    assert.equal(M.field({field,time}).filter(grain=>grain.ruptured).length,ruptured);
  }
  close(M.tally({field:'A',time:20}).percent,66.66666666666666);
  close(M.tally({field:'B',time:10}).percent,36.36363636363637);
  close(M.tally({field:'C',time:20}).percent,57.14285714285714);
});

test('raw counts and percentages are checked with specific denominator, boundary and formula feedback',()=>{
  const state={field:'A',time:20};assert.equal(M.check(state,{total:9,germinated:6,percent:66.7}).correct,true);
  assert.equal(M.check(state,{total:9,germinated:6,percent:66.6}).correct,false);
  assert.match(M.check(state,{total:8,germinated:6,percent:75}).feedback,/including the 1 ruptured grain/);
  assert.match(M.check(state,{total:9,germinated:7,percent:77.8}).feedback,/equal is not greater/);
  assert.match(M.check(state,{total:9,germinated:6,percent:60}).feedback,/100 × 6 \/ 9/);
  for(const value of[null,[],{},'6',{total:0,germinated:0,percent:0},{total:9,germinated:10,percent:100},{total:9,germinated:6,percent:'66.7'},{total:9,germinated:6,percent:NaN},{total:9,germinated:6,percent:Infinity},{total:9,germinated:6,percent:66.7,correct:true},{total:9.1,germinated:6,percent:66.7},{total:9,germinated:6.1,percent:66.7}]){assert.equal(M.check(state,value).correct,false);assert.equal(M.record(state,value),null);}
  assert.equal(M.check({field:'D'},{}),null);assert.equal(M.record({field:'D'},{}),null);
  let called=false;assert.equal(M.check(state,{total:9,germinated:6,get percent(){called=true;return 66.7;}}).correct,false);assert.equal(called,false);
});

test('stored records keep only checked raw counts and recompute provenance without trusting stored answers',()=>{
  const good=validA();assert.deepEqual(good,{state:{field:'A',time:20},total:9,germinated:6,percent:66.7,dataKind:'synthetic_pollen_snapshot'});
  assert.deepEqual(M.validRecord({...good,dataKind:'real_measured_biology'}),good);
  assert.notEqual(M.validRecord(good),good);assert.notEqual(M.validRecord(good).state,good.state);
  for(const value of[null,{},[],{...good,expected:6},{...good,mastery:100},{...good,total:8},{...good,germinated:7},{...good,percent:99},{...good,state:{}},{...good,state:{field:'A'}},{...good,state:{field:'A',time:20,ready:true}}])assert.equal(M.validRecord(value),null);
  let called=false;const getter={...good};Object.defineProperty(getter,'percent',{get(){called=true;return 66.7;}});assert.equal(M.validRecord(getter),null);assert.equal(called,false);
});

test('pooling sums counts from distinct fields at one time, not percentages or repeated/time-mixed observations',()=>{
  const rows=[row('A',20,9,6,66.7),row('B',20,11,7,63.6),row('C',20,14,8,57.1),row('A',10,9,3,33.3),row('B',10,11,4,36.4),row('C',10,14,5,35.7)];
  const groups=M.summarize(rows);assert.equal(groups.length,2);assert.deepEqual(groups.map(g=>g.time),[10,20]);
  for(const group of groups){assert.deepEqual(group.fields,['A','B','C']);assert.equal(group.total,34);assert.equal(group.ruptured,4);assert.equal(group.complete,true);assert.match(group.limitation,/not the average of percentages/);}
  assert.equal(groups[0].germinated,12);close(groups[0].percent,35.294117647058826);assert.equal(groups[1].germinated,21);close(groups[1].percent,61.76470588235294);
  assert.notEqual(groups[1].percent,(66.7+63.6+57.1)/3);
  const two=M.summarize(rows.slice(0,2))[0];assert.equal(two.total,20);assert.equal(two.germinated,13);assert.equal(two.percent,65);assert.equal(two.complete,false);
  assert.deepEqual(M.summarize([validA(),validA(),validA()]),M.summarize([validA()]));
  const replacement=M.summarize([validA(),row('A',20,9,6,66.67)]);assert.equal(replacement[0].total,9);close(replacement[0].percent,200/3);
  assert.equal(M.summarize([null,...rows,{...validA(),germinated:7}]).length,2);
  for(const invalid of[null,{},'rows',Array(91).fill(validA())])assert.deepEqual(M.summarize(invalid),[]);
  assert.equal(M.summarize(Array(90).fill(validA()))[0].total,9);
});

test('questions give specific explained answers without mastery or species-certification claims',()=>{
  assert.equal(M.questions.length,6);assert.equal(new Set(M.questions.map(q=>q.id)).size,6);
  for(const q of M.questions){assert.ok(q.prompt.length>50);assert.equal(q.options.length,4);assert.ok(q.explanation.length>100);for(let answer=0;answer<4;answer++){const result=M.grade(q.id,answer);assert.equal(result.correct,answer===q.answer);assert.equal(result.explanation,q.explanation);assert.equal(Object.hasOwn(result,'mastery'),false);}for(const bad of[-1,4,1.5,'0',null,NaN])assert.equal(M.grade(q.id,bad),null);}
  assert.equal(M.grade('constructor',0),null);assert.equal(M.grade(null,0),null);
  assert.match(M.grade('denominator',2).explanation,/all 11 recognizable grains/);
  assert.match(M.grade('time',1).explanation,/do not establish real rates/);
});
