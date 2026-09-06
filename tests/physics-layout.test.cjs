const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
function between(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Missing app source boundary: ' + start);
  return html.slice(a, b);
}
const declarations = between('const VIEWS=[', '// ── sidebar nav');
const activity = between('const ACT={', 'const PATH_GROUPS=');
const fields = between('const BIO_FIELDS=[', 'function buildHome(){');
const homeSource = between('function buildHome(){', 'function openExplore(){');
const pathSource = between('const PATH_GROUPS=', '// The domain map reads');
const exploreSource = between('function openExplore(){', '$("#exploreBtn").addEventListener');
const commands = between('const CMDS=[', 'let csel=');
const goSource = between('function go(k,', 'function routeFromHash(){');

const lessonSource = fs.readFileSync(path.join(root, 'src/_lessons.js'), 'utf8');
const lessonContext = vm.createContext({ document: {}, matchMedia: () => ({ matches: true }) });
vm.runInContext(lessonSource.slice(0, lessonSource.indexOf('  // ── shell chrome')) +
  lessonSource.slice(lessonSource.indexOf('  function createLessonProgress('), lessonSource.indexOf('  const lessonProgress =')) +
  'globalThis.lessonAPI={LESSONS,LENSES,createLessonProgress};})();', lessonContext);
const { LESSONS, LENSES, createLessonProgress } = lessonContext.lessonAPI;
const plain = value => JSON.parse(JSON.stringify(value));

function classList() {
  const values = new Set();
  return {
    add: name => values.add(name), remove: name => values.delete(name),
    contains: name => values.has(name),
    toggle(name, force) { const on = force === undefined ? !values.has(name) : force; on ? values.add(name) : values.delete(name); return on; },
  };
}

function harness(initial = {}) {
  const records = new Map(Object.entries(initial));
  const calls = [], nodes = new Map();
  let tiles = [];
  const document = { activeElement: null };
  function element(id) {
    if (!nodes.has(id)) {
      let markup = '';
      const node = {
        id, dataset: {}, textContent: '', attributes: {}, classList: classList(), isConnected: true,
        addEventListener() {}, setAttribute(k, v) { this.attributes[k] = v; },
        removeAttribute(k) { delete this.attributes[k]; },
        contains(other) { return this === other || (id === '#bq-explore' && other?.inExplore); },
        closest(selector) { return selector === '#bq-explore' && this.inExplore ? element('#bq-explore') : null; },
        focus() { if (this.inExplore && !element('#bq-explore').open) return; document.activeElement = this; },
        showModal() { this.open = true; }, close() { this.open = false; calls.push(['closeExplore']); },
        get innerHTML() { return markup; },
        set innerHTML(value) {
          markup = value;
          if (id === '#learningPaths') tiles = [...value.matchAll(/class="tile" data-go="([^"]+)"/g)].map(m => ({ dataset: { go: m[1] }, hidden: false }));
        },
      };
      nodes.set(id, node);
    }
    return nodes.get(id);
  }
  const filters = ['all', 'understand', 'practise', 'personal'].map(group => {
    const node = element('#filter-' + group); node.dataset.pathGroup = group; node.inExplore = true; return node;
  });
  const store = {
    getItem: key => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
  };
  const context = vm.createContext({
    document, localStorage: store, $: element,
    $$: selector => selector === '#learningPaths .tile' ? tiles : selector === '[data-path-group]' ? filters : [],
    IC: new Proxy({}, { get: () => '<svg></svg>' }),
    home: element('#home'), frame: element('#viewFrame'), skel: element('#skel'), oops: element('#oops'),
    current: null, loadTimer: null, clearTimeout() {},
    history: { pushState: (...args) => calls.push(['history', ...args]) },
    setActive: k => calls.push(['active', k]), tintField() {},
    loadSection: (...args) => calls.push(['loadSection', ...args]),
    openLaunch: k => calls.push(['openLaunch', k]), closeCmdk: () => calls.push(['closeCmdk']),
  });
  vm.runInContext(declarations + activity + fields + commands + pathSource + homeSource + exploreSource + goSource +
    ';globalThis.api={BIO_FIELDS,VIEWS,LAUNCH,PATH_GROUPS,CMDS,ACT,readExploredLessons,exploredLessons,buildHome,openExplore,closeExplore,filterPaths,go};', context);
  return { api: context.api, context, records, store, calls, element, document, filters, tiles: () => tiles };
}

test('Biology Map covers each canonical authored lesson once and accepts every actual lens', () => {
  const { api } = harness();
  const ids = plain(api.BIO_FIELDS).flatMap(field => field.ids);
  assert.equal(new Set(ids).size, ids.length, 'Duplicated map entries inflate the total');
  assert.deepEqual(ids.sort(), plain(LESSONS.map(lesson => lesson.id).sort()));
  for (const lens of LENSES) {
    const records = Object.fromEntries(LESSONS.map(lesson => [lesson.id, { lens: lens.k }]));
    assert.deepEqual([...api.readExploredLessons({ version: 1, lessons: records })].sort(), [...ids].sort());
  }
});

test('malformed journals, unsupported versions, collection shapes and record lenses never invent progress', () => {
  const { api, records, store } = harness();
  for (const value of [null, false, 1, 'text', [], {}, { version: '1', lessons: {} }, { version: 2, lessons: {} },
    { version: 1, lessons: null }, { version: 1, lessons: [] }]) assert.equal(api.readExploredLessons(value).size, 0);
  const value = { version: 1, lessons: {
    diffusion: { lens: 'visual' }, enzyme: [], population: null, cardiac: 'math',
    selection: { lens: 'unknown' }, replication: { lens: 2 }, unknown: { lens: 'experience' },
  } };
  const before = JSON.stringify(value);
  assert.deepEqual([...api.readExploredLessons(value)], ['diffusion']);
  assert.equal(JSON.stringify(value), before);
  const inherited = Object.create({ diffusion: { lens: 'math' } });
  assert.equal(api.readExploredLessons({ version: 1, lessons: inherited }).size, 0);
  for (const raw of ['{broken', 'null', '[]', 'true', '{"version":9,"lessons":{"diffusion":{"lens":"math"}}}']) {
    records.set('bioq_lessons_v1', raw); assert.equal(api.exploredLessons().size, 0, raw);
  }
  store.getItem = () => { throw new Error('Storage unavailable'); };
  assert.equal(api.exploredLessons().size, 0);
});

test('Home consumes real lesson-engine saves and the map directs the learner to an unexplored lesson', () => {
  const env = harness();
  const progress = createLessonProgress(LESSONS, LENSES, () => env.store);
  progress.setLens('diffusion', 'math');
  env.api.buildHome();
  assert.equal(env.element('#mapCount').textContent, '1 / 9 lessons explored');
  assert.equal(env.element('#mapPercent').textContent, '11%');
  assert.match(env.element('#homeIn').innerHTML, /class="cc-node" data-go="lessons" data-sub="respiration"><b>Cell Biology/);
  assert.match(env.element('#homeIn').innerHTML, /Exploration is a beginning/);
  const saved = env.store.getItem('bioq_lessons_v1');
  env.api.buildHome();
  assert.equal(env.store.getItem('bioq_lessons_v1'), saved, 'Viewing Home must not award or rewrite progress');
});

test('resume survives malformed activity and only emits safe local routes', () => {
  const env = harness();
  for (const raw of ['{broken', 'null', '[]', '{"last":{"k":"__proto__"}}']) {
    env.records.set('bioq_activity', raw); env.api.buildHome();
    assert.match(env.element('#homeIn').innerHTML, /data-go="lessons" data-sub="diffusion">Start exploring/);
  }
  env.records.set('bioq_activity', JSON.stringify({ last: { k: 'lessons', sub: 'replication' } }));
  env.api.buildHome();
  assert.match(env.element('#homeIn').innerHTML, /data-go="lessons" data-sub="replication">Continue DNA Replication/);
  assert.deepEqual(env.element('#continueLearning').dataset, { go: 'lessons', sub: 'replication' });
  env.records.set('bioq_activity', JSON.stringify({ last: { k: 'lessons', sub: '" onfocus="alert(1)' } }));
  env.api.buildHome();
  assert.doesNotMatch(env.element('#homeIn').innerHTML, /onfocus|alert\(1\)/);
  assert.deepEqual(env.element('#continueLearning').dataset, { go: 'lessons', sub: '' });
});

test('Explore reaches every pillar, filters accurately, and retains the chosen filter on reopen', () => {
  const env = harness();
  env.api.openExplore();
  assert.equal(env.element('#bq-explore').open, true);
  assert.deepEqual(env.tiles().map(tile => tile.dataset.go).sort(), plain(env.api.VIEWS).slice(1).map(view => view.k).sort());
  env.api.filterPaths('practise');
  assert.deepEqual(env.tiles().filter(tile => !tile.hidden).map(tile => tile.dataset.go).sort(), ['labs', 'reason', 'solve']);
  assert.equal(env.element('#pathCount').textContent, '3 sections shown');
  assert.equal(env.filters.find(filter => filter.dataset.pathGroup === 'practise').attributes['aria-pressed'], 'true');
  env.api.closeExplore(); env.api.openExplore();
  assert.equal(env.tiles().filter(tile => !tile.hidden).length, 3);
  env.api.filterPaths('__proto__');
  assert.equal(env.tiles().filter(tile => !tile.hidden).length, 8);
});

test('normal navigation uses the section iframe and shows the exact route label', () => {
  const env = harness();
  env.api.openExplore(); env.api.go('lessons', { sub: 'replication' });
  assert.equal(env.element('#bq-explore').open, false);
  assert.equal(env.element('#routeLabel').textContent, 'Lessons / DNA Replication');
  assert.equal(env.element('#viewFrame').classList.contains('on'), true);
  assert.equal(env.element('#home').classList.contains('on'), false);
  assert.deepEqual(env.calls.find(call => call[0] === 'loadSection'), ['loadSection', 'lessons', 'replication', true]);
  assert.equal(env.calls.filter(call => call[0] === 'openLaunch').length, 0);
  env.api.go('home');
  assert.equal(env.element('#routeLabel').textContent, 'Home');
  assert.equal(env.element('#home').classList.contains('on'), true);
  assert.equal(env.element('#viewFrame').classList.contains('on'), false);
});

test('immersive navigation keeps its original launcher and never repurposes the section iframe', () => {
  const env = harness();
  env.api.go('learn'); env.calls.length = 0;
  for (const key of ['lab', 'universe']) {
    env.api.openExplore(); env.api.go(key);
    assert.equal(env.element('#bq-explore').open, false);
  }
  assert.deepEqual(env.calls.filter(call => call[0] === 'openLaunch'), [['openLaunch', 'lab'], ['openLaunch', 'universe']]);
  assert.equal(env.calls.filter(call => call[0] === 'loadSection').length, 0);
  assert.equal(env.element('#routeLabel').textContent, 'Learn', 'The underlying section stays available on immersive exit');
});

test('unknown and inherited route keys return Home without loading an undefined page', () => {
  const env = harness();
  for (const key of ['missing', '__proto__', 'constructor', 'toString']) {
    env.api.go(key);
    assert.equal(env.element('#routeLabel').textContent, 'Home', key);
  }
  assert.equal(env.calls.filter(call => call[0] === 'loadSection').length, 0);
});

test('opening search from Explore closes the native dialog and returns focus to a visible shell control', () => {
  const env = harness();
  const input = env.element('#cmdkInput'), search = env.element('#cmdk'), trigger = env.element('#exploreSearch');
  trigger.inExplore = true;
  Object.assign(env.context, { cmdk: search, cin: input, ctrig: null, render() {} });
  vm.runInContext(between('function openCmdk(', 'function render(q){') +
    ';globalThis.searchAPI={openCmdk,closeCmdk};', env.context);
  env.api.openExplore(); env.document.activeElement = trigger;
  env.context.searchAPI.openCmdk({ type: 'keydown' });
  assert.equal(env.element('#bq-explore').open, false);
  assert.equal(env.document.activeElement, input);
  assert.equal(input.attributes['aria-expanded'], 'true');
  env.context.searchAPI.closeCmdk();
  assert.equal(env.document.activeElement, env.element('#exploreBtn'));
  assert.equal(input.attributes['aria-expanded'], 'false');
  const childInput = env.element('#child-lesson-search');
  env.context.searchAPI.openCmdk({ type: 'keydown' }, childInput);
  env.context.searchAPI.closeCmdk();
  assert.equal(env.document.activeElement, childInput, 'Embedded search still returns to its exact child control');
});
