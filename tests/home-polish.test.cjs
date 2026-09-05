const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const declarations = html.slice(html.indexOf('const VIEWS=['), html.indexOf('// ── sidebar nav'));
const helpers = html.slice(html.indexOf('function cleanActivity('), html.indexOf('const PATH_GROUPS='));
const commands = html.slice(html.indexOf('const CMDS=['), html.indexOf('let csel='));
const context = vm.createContext({});
vm.runInContext(declarations + helpers + commands + ';globalThis.api={cleanActivity,escapeHTML,matchCommands,CMDS,VIEWS};', context);
const api = context.api;
const plain = value => JSON.parse(JSON.stringify(value));

test('every original lesson is searchable and linked to its exact lesson ID', () => {
  const lessonSource = fs.readFileSync(path.join(root, 'src/_lessons.js'), 'utf8');
  const ids = [...lessonSource.matchAll(/id: "([a-z]+)", domain:/g)].map(match => match[1]);
  assert.equal(ids.length, 9);
  for (const id of ids) assert.equal(api.CMDS.filter(c => c.k === 'lessons' && c.sub === id).length, 1);
  assert.equal(api.matchCommands(api.CMDS, '  dna replication lesson  ')[0].sub, 'replication');
  assert.equal(api.matchCommands(api.CMDS, 'light calvin')[0].sub, 'photosynthesis');
});

test('search matches all words, recovers to full index and cannot inject HTML', () => {
  assert.equal(api.matchCommands(api.CMDS, 'unknown987').length, 0);
  assert.equal(api.matchCommands(api.CMDS, '   ').length, api.CMDS.length);
  assert.equal(api.escapeHTML('<img src=x onerror="bad()">'), '&lt;img src=x onerror=&quot;bad()&quot;&gt;');
  assert.equal(api.matchCommands(api.CMDS, '<img src=x>').length, 0);
});

test('invalid stored activity never prevents opening Home', () => {
  for (const value of [null, 0, 'x', [], { counts: null }, { last: {} }, { last: { k: '__proto__' } }]) {
    assert.deepEqual(plain(api.cleanActivity(value)), { counts: {} });
  }
  const value = { counts: { lessons: 2, reason: 'broken', learn: -3, missing: 10 }, last: { k: 'lessons', sub: 'replication', t: 42 } };
  const before = JSON.stringify(value);
  assert.deepEqual(plain(api.cleanActivity(value)), { counts: { lessons: 2 }, last: { k: 'lessons', sub: 'replication', t: 42 } });
  assert.equal(JSON.stringify(value), before, 'Reading activity must not mutate saved state');
  assert.equal(api.cleanActivity({ last: { k: 'lessons', sub: '" onmouseover="bad()' } }).last.sub, null);
});

test('practice search and home paths resolve to supported sections', () => {
  for (const slug of ['cell', 'genetics', 'physiology']) {
    assert.ok(api.CMDS.some(c => c.k === 'solve' && c.sub === slug));
  }
  assert.match(html, /data-path-group="understand"/);
  assert.match(html, /data-path-group="practise"/);
  assert.match(html, /id="cmdkInput" role="combobox"/);
  assert.match(html, /id="cmdkClose" aria-label="Close search"/);
});
