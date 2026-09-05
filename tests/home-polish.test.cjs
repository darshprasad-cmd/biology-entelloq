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

test('embedded keyboard search uses the shell and restores the exact child focus target', () => {
  const shellSource = html.slice(html.indexOf('function useShellNavigation(){'), html.indexOf('function failSection('));
  const styles = [];
  const listeners = [];
  const input = { id: 'lesson-search' };
  const doc = {
    body: { classList: { contains: name => name === 'embed' } },
    getElementById: id => styles.find(style => style.id === id),
    createElement: () => ({}), head: { appendChild: style => styles.push(style) },
    activeElement: input,
    defaultView: { addEventListener: (...args) => listeners.push(args) },
  };
  const calls = [];
  const bridge = vm.createContext({ frame: { contentDocument: doc }, openCmdk: (...args) => calls.push(args) });
  vm.runInContext(shellSource + ';useShellNavigation();useShellNavigation();', bridge);
  assert.equal(styles.length, 1, 'Only one shell integration per embedded document');
  assert.equal(listeners.length, 1);
  const [eventName, handle, capture] = listeners[0];
  assert.equal(eventName, 'keydown');
  assert.equal(capture, true, 'Run before the standalone section key handler');
  let prevented = 0, stopped = 0;
  const event = { key: 'K', ctrlKey: true, preventDefault: () => prevented++, stopImmediatePropagation: () => stopped++ };
  handle(event);
  assert.equal(prevented, 1);assert.equal(stopped, 1);
  assert.equal(calls[0][0], event);assert.equal(calls[0][1], input);
  handle({ ...event, altKey: true });handle({ ...event, ctrlKey: false });handle({ ...event, key: 'ArrowRight' });
  assert.equal(calls.length, 1, 'Do not intercept typing, lesson keys or unrelated shortcuts');
  assert.doesNotMatch(shellSource, /lframe|launchFrame\./, 'The immersive frame is not modified');
});
