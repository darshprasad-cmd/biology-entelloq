/* Execute the production route() with narrow rendering/DOM test doubles.
 * These tests verify routing intent and cleanup order, not native Tab order,
 * viewport geometry, assistive-technology speech or physical-device behavior. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/library/learn.js'), 'utf8');
const start = source.indexOf('  let lastTopic = null;');
const end = source.indexOf("  window.addEventListener('hashchange', route);", start);
assert.ok(start >= 0 && end > start, 'Execute the actual production route, never a copied router');
const routeCode = source.slice(start, end);
const modeFocusCode = source.split('\n').find(line => line.trimStart().startsWith('if (focusMode) {'));
assert.ok(modeFocusCode, 'Reuse the production selected-mode focus restoration');
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const scrollOptions = {block:'start', behavior:'instant'};

function setup() {
  const calls = [], body = {name:'BODY'}, outside = {name:'outside-library'};
  const document = {activeElement:outside, getElementById:id => legacy.get(id) || null};
  let elements = new Map(), context, generation = 0;
  function element(selector, markup = '') {
    const attributes = {};
    for (const match of markup.matchAll(/([\w-]+)="([^"]*)"/g)) attributes[match[1]] = match[2];
    return {selector, attributes, generation,
      setAttribute(name, value) { this.attributes[name] = value; },
      focus(options) {
        // A plain heading cannot acquire programmatic focus. Use the actual
        // source markup and any production setAttribute(), not a fake tabindex.
        if (!Object.hasOwn(this.attributes, 'tabindex')) return;
        document.activeElement = this;
        calls.push({type:'focus', selector, options:plain(options)});
      },
      scrollIntoView(options) { calls.push({type:'scroll', selector, options:plain(options)}); }
    };
  }
  function sourceHeading(pattern) {
    const match = source.match(pattern);
    assert.ok(match, 'The real renderer must provide the expected heading');
    return match[0];
  }
  function replaceView() {
    if ([...elements.values()].includes(document.activeElement)) document.activeElement = body;
    elements = new Map();
    generation += 1;
  }
  const legacy = new Map(['cell', 'microscope'].map(id => [id, element('#' + id)]));
  const root = {
    querySelector(selector) { return elements.get(selector) || null; },
    scrollIntoView(options) { calls.push({type:'scroll', selector:'#bioLibrary', options:plain(options)}); }
  };
  const topics = ['alpha', 'beta', 'encoded topic'].map(id => ({id}));
  const byId = new Map(topics.map(topic => [topic.id, topic]));
  const categoryById = new Map([['cell-biology', {id:'cell-biology'}], ['encoded category', {id:'encoded category'}]]);
  const location = {hash:'#library'};
  context = vm.createContext({root, document, byId, categoryById, location,
    renderTopic(topic, mode) {
      calls.push({type:'render-topic', id:topic.id, mode});
      replaceView();
      elements.set('#bl-topic-title', element('#bl-topic-title', sourceHeading(/<h1\b[^>]*id="bl-topic-title"[^>]*>/)));
      for (const id of ['layman','intuition','visual','scientific','advanced','realWorld']) {
        elements.set('#bl-mode-' + id, element('#bl-mode-' + id, 'tabindex="0"'));
      }
      context.restoreRenderedModeFocus();
      context.visualCleanup = () => calls.push({type:'cleanup', id:topic.id});
    },
    renderIndex() {
      calls.push({type:'render-index'});
      replaceView();
      elements.set('.bl-library-title', element('.bl-library-title', sourceHeading(/<h1\b[^>]*class="bl-library-title"[^>]*>/)));
      elements.set('#bl-results-title', element('#bl-results-title', sourceHeading(/<h2\b[^>]*id="bl-results-title"[^>]*>/)));
    }
  });
  vm.runInContext("let selectedCategory = 'all', query = '', focusMode = null;\n" +
    'var visualCleanup = null;\n' + routeCode + '\n' +
    'globalThis.restoreRenderedModeFocus = function () {\n' + modeFocusCode + '\n};\n' +
    'globalThis.invokeRoute = route;\n' +
    'globalThis.readState = () => ({lastTopic, selectedCategory, query, focusMode});\n' +
    'globalThis.setFilters = (category, search) => {selectedCategory = category; query = search;};\n' +
    'globalThis.setModeFocus = mode => {focusMode = mode;};', context);
  return {calls, document, body, outside, location, root, legacy,
    route(hash, event) { location.hash = hash; context.invokeRoute(event); },
    state:() => plain(context.readState()),
    element:selector => elements.get(selector),
    setFilters:(category, search) => context.setFilters(category, search),
    setModeFocus:mode => context.setModeFocus(mode),
    setCleanup:value => { context.visualCleanup = value; },
    cleanup:() => context.visualCleanup,
    clear:() => { calls.length = 0; }
  };
}
const hashchange = {type:'hashchange'};

test('initial and non-navigation renders do not steal outside focus', () => {
  for (const hash of ['#topic/alpha/visual', '#library', '#category/cell-biology']) {
    for (const event of [undefined, {type:'DOMContentLoaded'}]) {
      const state = setup();
      state.route(hash, event);
      assert.equal(state.document.activeElement, state.outside, hash);
      assert.equal(state.calls.filter(call => call.type === 'focus').length, 0);
      assert.deepEqual(state.calls.filter(call => call.type === 'scroll'), [
        {type:'scroll', selector:'#bioLibrary', options:scrollOptions}
      ], 'Preserve the existing initial route position without focusing a heading');
    }
  }
});

test('catalog-to-topic hash navigation focuses the newly rendered lesson before scrolling', () => {
  for (const [hash, id] of [['#topic/alpha/visual','alpha'], ['#topic/encoded%20topic/advanced','encoded topic']]) {
    const state = setup();
    state.route('#library');
    state.document.activeElement = state.element('.bl-library-title');
    state.clear();
    state.route(hash, hashchange);
    assert.equal(state.document.activeElement, state.element('#bl-topic-title'));
    assert.notEqual(state.document.activeElement, state.body);
    assert.deepEqual(state.calls, [
      {type:'render-topic', id, mode:hash.endsWith('advanced') ? 'advanced' : 'visual'},
      {type:'focus', selector:'#bl-topic-title', options:{preventScroll:true}},
      {type:'scroll', selector:'#bioLibrary', options:scrollOptions}
    ]);
    assert.equal(state.state().lastTopic, id);
  }
});

test('connection navigation cleans up the old visual then focuses the replacement topic', () => {
  const state = setup();
  state.route('#topic/alpha/scientific');
  const oldHeading = state.element('#bl-topic-title');
  state.document.activeElement = oldHeading;
  state.clear();
  state.route('#topic/beta/layman', hashchange);
  assert.notEqual(state.document.activeElement, oldHeading);
  assert.equal(state.document.activeElement, state.element('#bl-topic-title'));
  assert.deepEqual(state.calls, [
    {type:'cleanup', id:'alpha'}, {type:'render-topic', id:'beta', mode:'layman'},
    {type:'focus', selector:'#bl-topic-title', options:{preventScroll:true}},
    {type:'scroll', selector:'#bioLibrary', options:scrollOptions}
  ]);
});

test('same-topic explanation switching keeps selected-tab focus and does not scroll the root', () => {
  const state = setup();
  state.route('#topic/alpha/visual');
  state.document.activeElement = state.element('#bl-mode-visual');
  state.setModeFocus('advanced');
  state.clear();
  state.route('#topic/alpha/advanced', hashchange);
  assert.equal(state.document.activeElement, state.element('#bl-mode-advanced'));
  assert.deepEqual(state.calls, [
    {type:'cleanup', id:'alpha'}, {type:'render-topic', id:'alpha', mode:'advanced'},
    {type:'focus', selector:'#bl-mode-advanced', options:{preventScroll:true}}
  ]);
  assert.equal(state.state().focusMode, null, 'The real renderer consumes the pending mode focus');
  assert.equal(state.state().lastTopic, 'alpha');
});

test('same-topic history changes without pending tab focus do not force heading focus', () => {
  const state = setup();
  state.route('#topic/alpha/visual');
  state.clear();
  state.route('#topic/alpha/scientific', hashchange);
  assert.deepEqual(state.calls, [
    {type:'cleanup', id:'alpha'}, {type:'render-topic', id:'alpha', mode:'scientific'}
  ]);
  assert.equal(state.document.activeElement, state.outside);
});

test('returning to All biology focuses the library heading and preserves the existing search', () => {
  const state = setup();
  state.setFilters('cell-biology', 'cell powerhouse');
  state.route('#topic/alpha/visual');
  state.document.activeElement = state.element('#bl-topic-title');
  state.clear();
  state.route('#library', hashchange);
  assert.equal(state.document.activeElement, state.element('.bl-library-title'));
  assert.equal(state.element('.bl-library-title').attributes.tabindex, '-1');
  assert.deepEqual(state.calls, [
    {type:'cleanup', id:'alpha'}, {type:'render-index'},
    {type:'focus', selector:'.bl-library-title', options:{preventScroll:true}},
    {type:'scroll', selector:'#bioLibrary', options:scrollOptions}
  ]);
  assert.deepEqual(state.state(), {lastTopic:null, selectedCategory:'all', query:'cell powerhouse', focusMode:null});
  assert.equal(state.cleanup(), null, 'Disposed visual cleanup must not remain registered');
  state.clear();
  state.route('#topic/alpha/visual', hashchange);
  assert.equal(state.document.activeElement, state.element('#bl-topic-title'), 'Reopening the same topic from the index is still a new lesson view');
  assert.deepEqual(state.calls.filter(call => call.type === 'focus'), [
    {type:'focus', selector:'#bl-topic-title', options:{preventScroll:true}}
  ]);
});

test('a known category focuses and scrolls its results rather than the introductory hero', () => {
  for (const [hash, category] of [['#category/cell-biology','cell-biology'], ['#category/encoded%20category','encoded category']]) {
    const state = setup();
    state.setFilters('all', 'old search');
    state.route('#topic/alpha/visual');
    state.clear();
    state.route(hash, hashchange);
    assert.equal(state.document.activeElement, state.element('#bl-results-title'));
    assert.deepEqual(state.calls, [
      {type:'cleanup', id:'alpha'}, {type:'render-index'},
      {type:'focus', selector:'#bl-results-title', options:{preventScroll:true}},
      {type:'scroll', selector:'#bl-results-title', options:scrollOptions}
    ]);
    assert.deepEqual(state.state(), {lastTopic:null, selectedCategory:category, query:'', focusMode:null});
  }
});

test('malformed, empty and unknown routes never acquire unrelated heading focus', () => {
  for (const hash of ['', '#', '#unknown', '#topic/missing/visual', '#category/missing', '#category', '#topic/%E0%A4%A/visual', '#category/%ZZ', '#%']) {
    const state = setup();
    state.setFilters('cell-biology', 'preserved query');
    state.route('#topic/alpha/visual');
    state.clear();
    assert.doesNotThrow(() => state.route(hash, hashchange), hash);
    assert.deepEqual(state.calls, [{type:'cleanup', id:'alpha'}, {type:'render-index'}], hash);
    assert.equal(state.document.activeElement, state.outside, hash);
    assert.deepEqual(state.state(), {lastTopic:null, selectedCategory:'cell-biology', query:'preserved query', focusMode:null});
    assert.equal(state.cleanup(), null);
  }
});

test('legacy cell and microscope routes scroll only their own tool and never focus the library', () => {
  for (const id of ['cell', 'microscope']) {
    for (const missing of [false, true]) {
      const state = setup();
      if (missing) state.legacy.delete(id);
      state.route('#topic/alpha/visual');
      state.clear();
      assert.doesNotThrow(() => state.route('#' + id, hashchange));
      assert.deepEqual(state.calls, [
        {type:'cleanup', id:'alpha'}, {type:'render-index'},
        ...(missing ? [] : [{type:'scroll', selector:'#' + id, options:scrollOptions}])
      ]);
      assert.equal(state.document.activeElement, state.outside);
      assert.equal(state.state().lastTopic, null);
      assert.equal(state.cleanup(), null);
    }
  }
});

test('cleanup is consumed once before rendering and non-function cleanup remains safe', () => {
  const state = setup();
  state.setCleanup(() => state.calls.push({type:'cleanup', id:'previous-visual'}));
  state.route('#unknown', hashchange);
  state.route('#unknown', hashchange);
  assert.deepEqual(state.calls, [
    {type:'cleanup', id:'previous-visual'}, {type:'render-index'}, {type:'render-index'}
  ]);
  for (const value of [null, undefined, {}, false]) {
    state.setCleanup(value);
    assert.doesNotThrow(() => state.route('#unknown', hashchange));
    assert.equal(state.cleanup(), null);
  }
});
