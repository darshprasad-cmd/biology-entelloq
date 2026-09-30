const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname,'../src/library/depth-study.js'),'utf8');
const task = {question:'What changed?',answer:'The rate doubled.',rows:[['Control','1'],['Treatment','2']]};
function setup(storage) {
  const window = {localStorage:storage,BIO_DEPTH:{enzymes:{investigation:task,transfer:task}}};
  vm.runInNewContext(code,{window});
  return window.BioDepth;
}
test('invalid saved state cannot claim reviewed understanding; changed questions preserve drafts but reset review',()=>{
  const api=setup({getItem(){return null;}});
  for(const raw of [null,[],17,'bad',{rating:'explained',revealed:true}]) assert.equal(api.clean(raw,task).rating,'');
  const signature=JSON.stringify([task.question,task.answer,task.rows]);
  const valid=api.clean({draft:'Evidence supports this.',rating:'revisit',revealed:true,signature},task);
  assert.equal(valid.rating,'revisit');
  const stale=api.clean(valid,{...task,answer:'A revised conclusion.'});
  assert.equal(stale.draft,valid.draft);assert.equal(stale.rating,'');assert.equal(stale.revealed,false);
  assert.equal(api.clean({draft:'x'.repeat(8000)},task).draft.length,4000);
});
test('readable but full storage retains new drafts across remounts rather than restoring old saved text',()=>{
  const api=setup({getItem(){return JSON.stringify({draft:'Old draft'});},setItem(){throw Error('quota');}});
  assert.equal(api.read('enzymes','investigation',task).value.draft,'Old draft');
  assert.equal(api.write('enzymes','investigation',task,{draft:'New reasoning',revealed:true,rating:'revisit'}),false);
  const result=api.read('enzymes','investigation',task);
  assert.equal(result.value.draft,'New reasoning');assert.equal(result.saved,false);
  assert.equal(api.reviewItems([{id:'enzymes'}]).length,1);
});
test('review choices stay separate for each topic and activity, without modifying existing learning records',()=>{
  const records=new Map([['bioq_lessons_v1','existing lesson journal']]);
  const api=setup({getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)});
  assert.equal(api.reviewItems([{id:'enzymes'}]).length,0);
  api.write('enzymes','investigation',task,{draft:'Needs a stronger causal link.',revealed:true,rating:'revisit'});
  api.write('enzymes','transfer',task,{draft:'An independent prediction.',revealed:true,rating:'explained'});
  assert.equal(api.read('enzymes','investigation',task).value.rating,'revisit');
  assert.equal(api.read('enzymes','transfer',task).value.rating,'explained');
  assert.equal(api.reviewItems([{id:'enzymes'},{id:'unknown'}]).length,1);
  const review=api.read('enzymes','investigation',task).value;
  api.write('enzymes','investigation',task,{...review,revealed:false});
  assert.equal(api.read('enzymes','investigation',task).value.rating,'revisit','closing an answer does not remove review intent');
  assert.equal(api.reviewItems([{id:'enzymes'}]).length,1);
  assert.equal(records.get('bioq_lessons_v1'),'existing lesson journal');
});
test('blocked or corrupt storage does not prevent study',()=>{
  const blocked=setup({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
  blocked.write('enzymes','transfer',task,{draft:'Still studying.'});
  assert.equal(blocked.read('enzymes','transfer',task).value.draft,'Still studying.');
  const corrupt=setup({getItem(){return '{';}});
  assert.equal(corrupt.read('enzymes','transfer',task).value.draft,'');
});
