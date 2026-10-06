/* Additive authored content: preserve the existing library, do not promote roadmap stubs. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = ['topics', 'learning-cards', 'depth-foundations', 'depth-processes', 'extended-core', 'extended-systems'];
function load(names = files) {
  const context = vm.createContext({ window: {} });
  for (const file of names) vm.runInContext(fs.readFileSync(path.join(root, 'src/library', file + '.js'), 'utf8'), context);
  return context.window;
}
const added = 'water carbohydrates lipids proteins gene-regulation sex-linked-inheritance pedigrees hardy-weinberg speciation phylogenetic-trees biodiversity conservation fungi microbiome recombinant-dna dna-sequencing bioinformatics surface-area-volume digestive-system nutrient-absorption endocrine-system insulin-glucagon kidney nephron osmoregulation muscle-contraction reproductive-anatomy gametogenesis fertilization innate-immunity plant-tissues plant-hormones tropisms plant-reproduction pollination seed-germination'.split(' ');
test('the 36 named additions are complete lessons, not duplicate roadmap entries', () => {
  const { BIO_LIBRARY: lib, BIO_DEPTH: depth, BIO_ENRICHMENT: cards } = load();
  assert.equal(lib.topics.length, 109);
  const ids = new Set(lib.topics.map(t => t.id));
  assert.equal(ids.size, 109);
  for (const id of added) {
    const topic = lib.topics.find(t => t.id === id);
    assert.equal(topic?.status, 'complete', id);
    assert.ok(depth[id] && cards[id], id + ' has explanation, evidence and practice');
    assert.ok(topic.curriculumTags.includes('NEET'), id);
    assert.ok(!lib.roadmap.some(t => t.id === id), id + ' must leave the roadmap');
    assert.ok(topic.sources.length > 0, id);
  }
  assert.equal(lib.roadmap.length, 139, '175 planned entries minus 36 completed lessons');
});
test('the original 73 lessons are unchanged apart from the new NEET depth filter tag', () => {
  const original = load().BIO_LIBRARY.topics.filter(t => !added.includes(t.id));
  assert.equal(original.length, 73);
  for (const topic of original) topic.curriculumTags = topic.curriculumTags.filter(tag => tag !== 'NEET');
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex'),
    'd82462d1cf59bb4b17c9b50cf87948fd2f7da37fec9bc6b258076ae98b7090a1',
    'Captured independently from origin/main 0361e95; existing authored lessons are preserved');
});
test('each addition works in the app registry without assuming study scripts have loaded', () => {
  const full = load(), minimal = load(['topics', 'extended-core', 'extended-systems']);
  assert.deepEqual(JSON.parse(JSON.stringify(minimal.BIO_LIBRARY)), JSON.parse(JSON.stringify(full.BIO_LIBRARY)));
  const refs = full.BIO_LIBRARY.sources, sourceIds = new Set(refs.map(s => s.id));
  assert.equal(sourceIds.size, refs.length);
  for (const topic of full.BIO_LIBRARY.topics) for (const id of topic.sources) assert.ok(sourceIds.has(id), topic.id + ': ' + id);
  for (const source of refs) { assert.equal(new URL(source.url).protocol, 'https:'); assert.ok(source.title.trim()); }
});
test('loading the extensions again cannot duplicate concepts, references or practice', () => {
  const once = load(), twice = load([...files, 'extended-core', 'extended-systems']);
  for (const key of ['BIO_LIBRARY', 'BIO_DEPTH', 'BIO_ENRICHMENT']) {
    assert.deepEqual(JSON.parse(JSON.stringify(twice[key])), JSON.parse(JSON.stringify(once[key])), key);
  }
});

test('the narrow builder includes both additions across home, Learn, Reason and Solve', () => {
  const builder = fs.readFileSync(path.join(root, 'scripts/build-library.py'), 'utf8');
  assert.match(builder, /source\('extended-core.js'\) \+ source\('extended-systems.js'\)/);
  assert.equal((builder.match(/\+ extensions\(\)/g) || []).length, 3);
  for (const name of ['extended-core', 'extended-systems']) {
    const source = fs.readFileSync(path.join(root, 'src/library', name + '.js'), 'utf8');
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|getUserMedia)\b/,
      'Content modules never request services or alter student storage');
  }
});
