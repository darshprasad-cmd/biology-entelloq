const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),window={};
const context={window,LABS:{register(){}},console};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/library/topics.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(path.join(root,'src/library/lab-metadata.js'),'utf8'),context);
const lib=window.BIO_LIBRARY,topics=lib.topics,byId=new Map(topics.map(t=>[t.id,t]));
const priorities=['cell-structure','membrane-transport','biomolecules','enzymes','photosynthesis','cellular-respiration','mitosis','meiosis','dna','protein-synthesis','mendelian-genetics','heart-circulation','gas-exchange','nervous-system','immunity','plant-transport','natural-selection','ecology'];
test('all priority subjects and all 13 fields have completed authored content',()=>{
 assert.equal(lib.categories.length,13);assert.ok(topics.length>=73);assert.equal(byId.size,topics.length);
 for(const id of priorities)assert.ok(byId.has(id),id);
 for(const c of lib.categories)assert.ok(topics.some(t=>t.category===c.id),c.id);
});
test('every published concept has six distinct modes, terms, a visual and a valid explanatory check',()=>{
 for(const t of topics){
  const modes=['layman','intuition','visual','scientific','advanced','realWorld'];
  for(const m of modes)assert.ok(typeof t.explanations[m]==='string'&&t.explanations[m].length>80,t.id+':'+m);
  assert.equal(new Set(modes.map(m=>t.explanations[m])).size,6,t.id);assert.ok(t.keyTerms.length>0,t.id);assert.ok(t.visual?.steps?.length>1,t.id);assert.ok(t.quickCheck.length,t.id);
  for(const q of t.quickCheck){assert.ok(q.options.length>=3);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);assert.ok(q.explanation.length>20);}
 }
});
test('topic, parent, prerequisite and lab links resolve to canonical records',()=>{
 const categories=new Set(lib.categories.map(c=>c.id));
 for(const t of topics){assert.ok(categories.has(t.category),t.id);if(t.parentId)assert.ok(byId.has(t.parentId),t.id+' parent');
  for(const id of [...t.relatedTopics,...t.prerequisites]){assert.ok(byId.has(id),t.id+' → '+id);assert.notEqual(t.id,id);}
  for(const lab of t.labs||[])assert.ok(window.BIO_LAB_META[typeof lab==='string'?lab:lab.id],t.id+' lab '+lab);
 }
 for(const [id,lab]of Object.entries(window.BIO_LAB_META)){for(const t of lab.relatedTopics)assert.ok(byId.has(t),id+' theory '+t);assert.ok(lab.steps.length>=3,id);assert.ok(lab.minutes>0,id);}
});
test('all catalog entries describe working labs, not roadmap placeholders',()=>{
 assert.equal(Object.keys(window.BIO_LAB_META).length,23);
 for(const lab of Object.values(window.BIO_LAB_META)){assert.ok(['foundation','school','advanced'].includes(lab.difficulty));assert.ok(['simulation','microscope','dissection','genetics','data','investigation'].includes(lab.type));}
 assert.ok(Array.isArray(lib.roadmap));for(const item of lib.roadmap)assert.equal(byId.has(item.id),false,'A roadmap record must not shadow a completed topic');
});
