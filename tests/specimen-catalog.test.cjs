/* Every existing teaching specimen remains available independently of assets. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const ctx = vm.createContext({});
for (const name of ['anatomy', 'frog', 'heart', 'fish', 'earthworm', 'cockroach']) {
  vm.runInContext(read('src/lab/' + name + '.js').replace(/\bexport\s+/g, ''), ctx, { filename: name + '.js' });
}
vm.runInContext('globalThis.catalogApi={SPECIMENS,getAvailableSpecimens,normalizeSpecimenId,buildSpecimen};', ctx);
const api = ctx.catalogApi;
const ids = ['frog', 'heart', 'fish', 'earthworm', 'cockroach'];

test('all five teaching specimens remain available in the original registry order', () => {
  assert.deepEqual(Object.keys(api.getAvailableSpecimens()), ids);
  for (const id of ids) assert.equal(api.getAvailableSpecimens()[id], api.SPECIMENS[id], 'existing builder descriptor reused');
});

test('all five restore/deep-link selections survive while unsupported and malformed inputs recover to frog', () => {
  for (const id of ['human', 'constructor', '__proto__', '', null, undefined, {}, []]) {
    assert.equal(api.normalizeSpecimenId(id), 'frog', String(id));
  }
  for (const id of ids) assert.equal(api.normalizeSpecimenId(id), id);
  const inherited = Object.create({ frog: api.SPECIMENS.frog });
  inherited.cockroach = api.SPECIMENS.cockroach;
  assert.deepEqual(Object.keys(api.getAvailableSpecimens(inherited)), ['cockroach']);
  assert.deepEqual(Object.keys(api.getAvailableSpecimens({ frog: api.SPECIMENS.heart })), []);
});

test('the actual picker creates and activates all five specimen cards', () => {
  const shell = read('src/lab/shell.js');
  const body = shell.match(/mountCards:\s*\(specs, cb\) => \{([\s\S]*?)\n    \},/);
  assert.ok(body, 'exercise the real picker implementation');
  const cards = [], selected = [];
  const container = { innerHTML: 'stale cards', appendChild(card) { cards.push(card); } };
  const mountCards = new Function('pick', 'el', 'getAvailableSpecimens',
    'return (specs, cb) => {' + body[1] + '};')(
      { querySelector(selector) { assert.equal(selector, '#cards'); return container; } },
      html => ({ html, onclick: null }), api.getAvailableSpecimens);
  mountCards(api.SPECIMENS, id => selected.push(id));
  assert.equal(container.innerHTML, '');
  assert.equal(cards.length, 5);
  assert.match(cards[0].html, /<h2>Frog<\/h2>/);
  assert.match(cards[1].html, /<h2>Mammalian heart<\/h2>/);
  assert.match(cards[2].html, /<h2>Bony fish<\/h2>/);
  assert.match(cards[3].html, /<h2>Earthworm<\/h2>/);
  assert.match(cards[4].html, /<h2>Cockroach<\/h2>/);
  cards.forEach(card => card.onclick());
  assert.deepEqual(selected, ids);
});

test('app navigation and search include every restored dissection choice', () => {
  const html = read('app.html');
  const declarations = html.slice(html.indexOf('const VIEWS=['), html.indexOf('// ── sidebar nav'));
  const commands = html.slice(html.indexOf('const CMDS=['), html.indexOf('let csel='));
  const context = vm.createContext({});
  vm.runInContext(declarations + commands + ';globalThis.data={LAUNCH,CMDS};', context);
  const view = context.data.LAUNCH.find(item => item.k === 'lab');
  const command = context.data.CMDS.find(item => item.k === 'lab' && item.label === 'Dissect a specimen');
  assert.equal(view.file, 'lab.html');
  for (const id of ids) { assert.ok(view.desc.includes(id)); assert.ok(command.kw.includes(id)); }
  assert.equal(command.desc, 'Frog · mammalian heart · fish · earthworm · cockroach');
  assert.doesNotMatch(command.kw, /human/);
  // The latest explicit specimen-restoration request changes only this catalog copy
  // in the fixture; all original file/launcher-region fingerprints stay intact.
  const fixture = JSON.parse(read('tests/fixtures/dissection-original.json'));
  assert.equal(html.match(/\{k:"lab",label:"Dissection Lab"[^\n]*/)[0].trimEnd(), fixture.lab_entry);
});

test('landing and about-page lab entries accurately name all five available specimens', () => {
  const landing = read('index.html'), about = read('about.html');
  const pages = landing.match(/var pages=(\[.*?\]);/);
  assert.ok(pages);
  const entries = vm.runInNewContext(pages[1]);
  assert.equal(entries.find(item => item[2] === 'lab')[1], 'Frog, mammalian heart, fish, earthworm and cockroach anatomy');
  assert.match(about, /t:"Virtual Dissection Lab",s:"Frog · mammalian heart · fish · earthworm · cockroach"/);
  assert.match(about, /<b class="grad">5<\/b><span>virtual specimens<\/span>/);
});

test('help exposes deployed attribution for both prepared exteriors without claiming exact interiors', () => {
  const shell = read('src/lab/shell.js');
  for (const name of ['FROG', 'COCKROACH']) {
    const relative = 'assets/specimens/' + name + '-ATTRIBUTION.md';
    assert.ok(shell.includes('href="./' + relative + '"'), name + ': discoverable licence link');
    assert.ok(fs.existsSync(path.join(root, relative)), name + ': licence ships beside the asset');
  }
  assert.match(shell, /Cockroach — CK \(modified, CC BY 4\.0\)/);
  assert.match(shell, /Teaching-model interiors are illustrative/);
});
