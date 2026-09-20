const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/universe/ui.js'), 'utf8');
const context = vm.createContext({ UNI: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'src/universe/data.js'), 'utf8') + '\n' + source + '\nthis.data=UNI_DATA;this.order=UNI_ORDER;', context);

test('all thirteen scale inventories contain exactly existing named hotspot metadata', () => {
  assert.equal(context.order.length, 13);
  let count = 0;
  for (const key of context.order) {
    const records = context.universeSubpartsFor(context.data, key);
    const ids = Object.keys(context.data[key].hotspots);
    assert.deepEqual(Array.from(records, r => r.id), ids, key);
    records.forEach(record => { assert.equal(record.stage, key); assert.equal(record.meta, context.data[key].hotspots[record.id]); assert.ok(record.meta.name); count++; });
  }
  assert.ok(count >= 40);
});

test('unknown scales and invalid unnamed entries fail closed rather than inventing structures', () => {
  const metadata = { name: 'Validated structure', desc: 'Existing description' };
  const records = context.universeSubpartsFor({ stage: { hotspots: { a: null, b: {}, c: { name: ' ' }, d: { name: 3 }, valid: metadata } } }, 'stage');
  assert.equal(records.length, 1); assert.equal(records[0].meta, metadata);
  assert.equal(context.universeSubpartsFor({}, 'unknown').length, 0);
});

test('the deployed AI client contract, cancellation and provenance survive subpart navigation', () => {
  assert.match(source, /script\.src = '\.\/src\/ai\/biology-ai\.js'/);
  assert.match(source, /answer = await client\.ask\(\{ question: ai,/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /const current = \(\) => gen === panelGeneration && ans\.isConnected/);
  assert.match(source, /function openPanel\(meta, stageKey\) \{\s*cancelPanelAI\(\)/);
  assert.match(source, /function closePanel\(restore = true\) \{\s*cancelPanelAI\(\)/);
  assert.match(source, /AI explanation · verify important details/);
  assert.match(source, /About this model/); assert.match(source, /rel="noopener noreferrer"/);
});
