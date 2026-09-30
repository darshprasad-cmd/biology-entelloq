const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),window={};
for(const name of ['topics','depth-foundations','depth-processes','depth-study']) vm.runInNewContext(fs.readFileSync(path.join(root,'src/library',name+'.js'),'utf8'),{window});
const topics=window.BIO_LIBRARY.topics,units=window.BIO_DEPTH;
const words=text=>String(text).trim().split(/\s+/).length;
test('all published concepts, and only published concepts, receive substantive authored depth',()=>{
 assert.deepEqual(Object.keys(units).sort(),Array.from(topics,t=>t.id).sort());
 assert.equal(topics.length,73);
 for(const topic of topics){
  const unit=units[topic.id];assert.equal(unit.objectives.length,3,topic.id);
  assert.equal(unit.mechanism.length,3,topic.id);
  for(const step of unit.mechanism){assert.ok(words(step.body)>=35,topic.id+' mechanism too shallow');assert.ok(step.title.trim());}
  assert.ok(words(unit.misconception.correction)>=25,topic.id+' misconception needs explanation');
  assert.ok(words(unit.transfer.answer)>=20,topic.id+' transfer needs reasoning');
  assert.doesNotMatch(JSON.stringify(unit),/\b(?:TODO|TBD|lorem ipsum|coming soon|insert example)\b/i,topic.id);
 }
});
test('evidence is honestly labeled, interpretable and accompanied by limitations, hints and reasoning',()=>{
 const prompts=new Set(),transfers=new Set(),mechanisms=new Set();
 for(const [id,unit] of Object.entries(units)){
  const task=unit.investigation;
  assert.match(task.context,/fictional|illustrative|theoretical|idealized|synthetic|invented/i,id+' provenance');
  assert.ok(task.columns.length>=2&&task.columns.length<=4,id);
  assert.ok(task.rows.length>=3&&task.rows.length<=5,id);
  for(const row of task.rows){assert.equal(row.length,task.columns.length,id+' rectangular evidence table');assert.ok(row.every(cell=>String(cell).trim()));}
  assert.ok(words(task.hint)>=6,id);assert.ok(words(task.answer)>=15,id);assert.ok(words(task.limitation)>=12,id);
  assert.equal(task.reasoning.length,3,id);assert.ok(task.reasoning.every(step=>words(step)>=6),id);
  assert.ok(!prompts.has(task.question),id+' repeated evidence question');prompts.add(task.question);
  assert.ok(!transfers.has(unit.transfer.question),id+' repeated transfer question');transfers.add(unit.transfer.question);
  const mechanism=unit.mechanism.map(s=>s.body).join(' ');assert.ok(!mechanisms.has(mechanism),id+' repeated mechanism');mechanisms.add(mechanism);
  assert.ok(unit.sources.length>=1&&unit.sources.length<=2,id);
  for(const source of unit.sources){assert.ok(source.title.trim());const url=new URL(source.url);assert.equal(url.protocol,'https:');assert.match(url.hostname,/(^|\.)(openstax\.org|nih\.gov|genome\.gov|nasa\.gov|cdc\.gov)$/);}
 }
});
test('depth remains available in Learn, Reason and Solve with safely escaped student-facing content',()=>{
 const example=topics.find(t=>t.id==='enzymes');
 assert.match(window.BioDepth.markup(example),/data-depth-task="investigation"/);
 assert.match(window.BioDepth.markup(example),/data-depth-task="transfer"/);
 assert.doesNotMatch(window.BioDepth.markup(example,'reason'),/data-depth-task="transfer"/);
 assert.doesNotMatch(window.BioDepth.markup(example,'solve'),/data-depth-task="investigation"/);
 const original=units.enzymes.transfer.question;
 units.enzymes.transfer.question='<img src=x onerror=alert(1)>';
 const html=window.BioDepth.markup(example,'solve');assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
 units.enzymes.transfer.question=original;
 const builder=fs.readFileSync(path.join(root,'scripts/build-library.py'),'utf8');
 assert.equal((builder.match(/source\('depth-foundations.js'\)/g)||[]).length,2);
 assert.equal((builder.match(/source\('depth-processes.js'\)/g)||[]).length,2);
});
