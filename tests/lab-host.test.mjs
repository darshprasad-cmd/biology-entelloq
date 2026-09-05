import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Test the actual host implementation without loading the app, iframe or GPU.
const source = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const start = source.indexOf('function closeLaunch(){');
const end = source.indexOf('// Explicit Exit', start);
assert.ok(start > 0 && end > start, 'The host closeLaunch implementation must be present');
const closeSource = source.slice(start, end);
const exitWiring = source.match(/^[\t ]*\$\(["']#launchX["']\)\.addEventListener\(["']click["'],[^\r\n]+/m)?.[0];
assert.ok(exitWiring, 'The explicit Exit click binding must be present');

function harness({ hash = '#lab', current = '' } = {}) {
  const launcherClasses = new Set(['on']), bodyClasses = new Set(['lab-open', 'theme-dark']);
  const timers = new Map([[10, { callback() {}, delay: 60000 }]]);
  const clearedTimers = [], active = [], tints = [], replacements = [];
  const location = { hash };
  // A direct #lab visit plus openLaunch's push is the formerly broken scenario.
  const historyEntries = [hash, hash];
  let nextTimer = 10, backCalls = 0, exitHandler;
  const lab = { k: 'lab' }, universe = { k: 'universe' };
  const lframe = { src: './lab.html?instant=1', dataset: { src: './lab.html?instant=1', ready: '1' } };
  const fixture = {
    current, location, lframe,
    launcher: { classList: { remove: key => launcherClasses.delete(key) } },
    document: { body: { classList: { remove: key => bodyClasses.delete(key) } } },
    BYKEY: { lab, universe, home: { k: 'home' }, learn: { k: 'learn' } },
    LAUNCH: [lab, universe],
    setActive: value => active.push(value),
    tintField: value => tints.push(value),
    history: {
      back() { backCalls++; },
      replaceState(state, title, target) {
        replacements.push({ state, title, target });
        historyEntries[historyEntries.length - 1] = target;
        location.hash = target;
      },
    },
    clearTimeout(id) { clearedTimers.push(id); timers.delete(id); },
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    $(selector) {
      assert.equal(selector, '#launchX');
      return { addEventListener(event, callback) { assert.equal(event, 'click'); exitHandler = callback; } };
    },
  };
  const api = new Function('fixture', `
    const { launcher, document, BYKEY, LAUNCH, setActive, tintField, history,
      location, lframe, clearTimeout, setTimeout, $ } = fixture;
    let launcherOpen = true, coolTimer = 10, current = fixture.current;
    ${closeSource}
    ${exitWiring}
    return {
      closeLaunch,
      read: () => ({ launcherOpen, coolTimer }),
      reopen: () => { launcherOpen = true; },
    };
  `)(fixture);
  return {
    ...api, clickExit: () => exitHandler(), get exitHandler() { return exitHandler; },
    get backCalls() { return backCalls; },
    launcherClasses, bodyClasses, timers, clearedTimers, active, tints,
    replacements, location, historyEntries, lframe,
  };
}

test('explicit Exit is wired directly to the actual closeLaunch function', () => {
  const h = harness();
  assert.equal(h.exitHandler, h.closeLaunch, 'Do not combine history.back() with explicit close');
});

test('Exit from a directly opened #lab closes once and replaces the duplicate immersive entry with home', () => {
  const h = harness();
  h.clickExit();
  assert.equal(h.read().launcherOpen, false);
  assert.equal(h.launcherClasses.has('on'), false);
  assert.equal(h.bodyClasses.has('lab-open'), false);
  assert.equal(h.bodyClasses.has('theme-dark'), true);
  assert.equal(h.location.hash, '#home');
  assert.deepEqual(h.historyEntries, ['#lab', '#home']);
  assert.deepEqual(h.replacements, [{ state: { k: 'home', sub: null }, title: '', target: '#home' }]);
  assert.deepEqual(h.active, ['home']);
  assert.deepEqual(h.tints, ['home']);
  assert.equal(h.backCalls, 0, 'Explicit Exit must not schedule a history traversal that can reopen #lab');
});

test('closing either immersive route restores the current non-immersive section', () => {
  for (const hash of ['#lab/specimen', '#universe/cell']) {
    const h = harness({ hash, current: 'learn' });
    h.clickExit();
    assert.equal(h.location.hash, '#learn');
    assert.equal(h.read().launcherOpen, false);
    assert.deepEqual(h.replacements, [{ state: { k: 'learn', sub: null }, title: '', target: '#learn' }]);
    assert.deepEqual(h.active, ['learn']);
    assert.deepEqual(h.tints, ['learn']);
    assert.equal(h.backCalls, 0);
  }
});

test('closing after normal navigation preserves a non-immersive hash including its subroute', () => {
  for (const hash of ['#learn/cells', '#home', '#unknown', '']) {
    const h = harness({ hash, current: 'learn' });
    h.closeLaunch();
    assert.equal(h.location.hash, hash);
    assert.deepEqual(h.replacements, []);
    assert.equal(h.backCalls, 0);
    assert.equal(h.read().launcherOpen, false);
    assert.equal(h.bodyClasses.has('lab-open'), false);
  }
});

test('closing retains the warm iframe briefly, replacing its old cooldown before release', () => {
  const h = harness();
  h.clickExit();
  assert.deepEqual(h.clearedTimers, [10]);
  assert.equal(h.timers.size, 1);
  assert.equal(h.lframe.src, './lab.html?instant=1');
  const timer = h.timers.get(h.read().coolTimer);
  assert.equal(timer.delay, 60000);
  timer.callback();
  assert.equal(h.lframe.src, 'about:blank');
  assert.deepEqual(h.lframe.dataset, { src: '', ready: '' });
});

test('a reopened lab is not unloaded by the previous close cooldown', () => {
  const h = harness();
  h.clickExit();
  h.reopen();
  h.timers.get(h.read().coolTimer).callback();
  assert.equal(h.read().launcherOpen, true);
  assert.equal(h.lframe.src, './lab.html?instant=1');
  assert.deepEqual(h.lframe.dataset, { src: './lab.html?instant=1', ready: '1' });
});
