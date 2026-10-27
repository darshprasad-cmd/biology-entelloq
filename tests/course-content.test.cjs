const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const context = vm.createContext({});
for (const file of ['src/library/topics.js','src/library/extended-core.js','src/library/extended-systems.js','src/cbse/curriculum.js','src/courses/data.js']) {
  vm.runInContext(read(file), context, {filename:file});
}
const data = context.BIO_COURSES;
const courses = Array.from(data.classes);
const chapters = courses.flatMap(course=>Array.from(course.units).flatMap(unit=>Array.from(unit.chapters)));
const find = id => chapters.find(chapter=>chapter.id===id);

test('course navigation accounts for each mapped curriculum unit and all senior chapter headings', () => {
  assert.deepEqual(courses.map(course=>course.id), ['9','10','11','12']);
  const counts = courses.map(course=>Array.from(course.units).reduce((sum,unit)=>sum+unit.chapters.length,0));
  assert.deepEqual(counts,[5,5,20,14]);
  assert.equal(chapters.length,44);
  for (const course of courses) {
    const mapping = context.BIO_CBSE_DATA.courses[course.id];
    assert.ok(mapping,course.id);
    assert.deepEqual(Array.from(course.units,u=>u.id.replace(/^c\d+-/,'')),Array.from(mapping.units,u=>u.id));
    for (const unit of course.units) {
      assert.ok(unit.chapters.length,unit.id);
      for (const chapter of unit.chapters) {
        assert.equal(chapter.classId,course.id);
        assert.equal(chapter.unitId,unit.id);
        assert.equal(chapter.source.url,mapping.source);
      }
    }
  }
  assert.equal(chapters.filter(ch=>ch.classId==='11'&&ch.scope==='core').length,19);
  assert.equal(chapters.filter(ch=>ch.classId==='12'&&ch.scope==='core').length,13);
});

test('all chapter concept links resolve to released canonical concepts, never roadmap placeholders', () => {
  const topics = new Map(Array.from(context.BIO_LIBRARY.topics,t=>[t.id,t]));
  assert.equal(topics.size,109);
  for (const chapter of chapters) {
    assert.ok(chapter.concepts.length>=3,chapter.id);
    assert.equal(new Set(chapter.concepts).size,chapter.concepts.length,chapter.id);
    for (const id of chapter.concepts) {
      const topic=topics.get(id);
      assert.ok(topic,`${chapter.id} -> missing canonical concept ${id}`);
      assert.equal(topic.status,'complete',`${chapter.id} -> unreleased concept ${id}`);
    }
  }
});

test('every chapter lab link has a real registered builder, including both new field laboratories', () => {
  const labs = new Map();
  const sandbox = vm.createContext({LABS:{register(id,definition){if(!labs.has(id))labs.set(id,definition);}},matchMedia:()=>({matches:false})});
  sandbox.window=sandbox;
  for (const file of ['src/_lab_bench.js','src/_lab_physiology.js','src/_lab_molecular.js','src/_lab_ecology.js','src/library/experiments.js','src/library/investigations.js','src/library/lab-metadata.js','src/library/field-labs.js']) {
    vm.runInContext(read(file),sandbox,{filename:file});
  }
  for (const chapter of chapters) {
    assert.equal(new Set(chapter.labs).size,chapter.labs.length,chapter.id);
    for (const id of chapter.labs) assert.equal(typeof labs.get(id)?.build,'function',`${chapter.id} -> missing lab ${id}`);
  }
  assert.ok(find('c11-flowering-anatomy').labs.includes('stomatal-transpiration'));
  assert.ok(find('c12-organisms-populations').labs.includes('quadrat-sampling'));
  assert.deepEqual(Array.from(find('c11-animal-structure').labs),['frog-dissection']);
});

test('assessment boundaries preserve the current ambiguity and formative-only material', () => {
  assert.deepEqual(chapters.filter(ch=>ch.scope==='formative').map(ch=>ch.id),['c11-digestion','c12-environmental-issues']);
  assert.deepEqual(chapters.filter(ch=>ch.scope==='review').map(ch=>ch.id),['c10-heredity']);
  assert.match(find('c10-heredity').summary,/confirm.*school/i);
  assert.match(find('c10-heredity').scopeNote,/requires confirmation/i);
  assert.match(find('c11-digestion').scopeNote,/not part.*summative/i);
  assert.match(courses[0].description,/Standard Science/);
  assert.ok(find('c9-reproduction'),'New Class 9 reproduction sequence must be present.');
  assert.ok(find('c9-earth-system'),'The Biology connections to Earth systems must remain explicit.');
  assert.match(find('c9-earth-system').sections.map(s=>s.body).join(' '),/biological connections only/i);
});

test('every navigable guide carries substantive authored reading, outcomes and explanatory feedback', () => {
  const ids=new Set(), uniqueBodies=new Set(), uniqueQuestions=new Set();
  for (const chapter of chapters) {
    assert.match(chapter.id,/^c(?:9|10|11|12)-[a-z]+(?:-[a-z]+)*$/);
    assert.ok(!ids.has(chapter.id),`Duplicate chapter ${chapter.id}`);ids.add(chapter.id);
    assert.equal(chapter.guideStatus,'authored-baseline');
    assert.match(chapter.coverageNote,/not a complete textbook/i);
    assert.ok(chapter.outcomes.length>=3,chapter.id);
    assert.ok(chapter.sections.length>=3,chapter.id);
    for (const section of chapter.sections) {
      assert.ok(section.title.trim().length>5,chapter.id);
      assert.ok(section.body.trim().split(/\s+/).length>=45,`${chapter.id}: thin section ${section.title}`);
      assert.ok(!uniqueBodies.has(section.body),`${chapter.id}: repeated generic section`);uniqueBodies.add(section.body);
      assert.doesNotMatch(section.body,/coming soon|placeholder|lorem ipsum/i);
    }
    assert.ok(chapter.misconception.claim.length>20,chapter.id);
    assert.ok(chapter.misconception.correction.length>60,chapter.id);
    assert.ok(chapter.question.prompt.length>50,chapter.id);
    assert.ok(chapter.question.answer.length>90,chapter.id);
    assert.ok(!uniqueQuestions.has(chapter.question.prompt),chapter.id);uniqueQuestions.add(chapter.question.prompt);
    assert.notEqual(chapter.investigation,chapter.question.prompt,'Experimental guidance must not repeat the self-check verbatim.');
    const url=new URL(chapter.source.url);
    assert.equal(url.protocol,'https:');assert.equal(url.hostname,'cbseacademic.nic.in');
  }
});

test('membrane transport connects quantitative reasoning, controls, tissue comparison and model limits', () => {
  const chapter=find('c11-cell-unit-life');
  assert.ok(chapter.sections.length>=6);
  const text=chapter.sections.map(s=>s.body).join(' ');
  assert.match(text,/amount.*solute remains fixed/i);
  assert.match(text,/pressure.*oppose/i);
  assert.match(text,/blotting/i);
  assert.match(text,/model.*omit|omit.*model/i);
  const masses=Array.from(chapter.question.prompt.matchAll(/(\d+\.\d+) g/g),match=>Number(match[1]));
  assert.equal(masses.length,2,'The original mass-change task needs both measured masses.');
  const reported=Number(chapter.question.answer.match(/= (\d+(?:\.\d+)?)%/)[1]);
  const expected=100*(masses[1]-masses[0])/masses[0];
  assert.ok(Math.abs(reported-expected)<1e-10,'The worked percentage must agree with the stated masses.');
});

test('course data can be loaded alone in a browser-like context without modifying existing library objects', () => {
  const existing={topics:[{id:'sentinel'}]};
  const isolated={window:{BIO_LIBRARY:existing}};
  vm.runInNewContext(read('src/courses/data.js'),isolated);
  assert.equal(isolated.window.BIO_LIBRARY,existing);
  assert.equal(isolated.window.BIO_LIBRARY.topics.length,1);
  assert.equal(isolated.window.BIO_COURSES.classes.length,4);
});
