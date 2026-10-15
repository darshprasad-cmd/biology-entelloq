const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const labPath = path.join(__dirname, '../src/lab');
const main = fs.readFileSync(path.join(labPath, 'main.js'), 'utf8');
const start = main.indexOf('function actionsFor('), end = main.indexOf('/* ---- pathology:');
assert.ok(start >= 0 && end > start, 'feature dispatch remains available for isolated behavior checks');
const features = main.slice(start, end);

// Use the production catalogue API without building a canvas or mocking its
// slide definitions. A truthy host permits construction; DOM is lazy until open.
const histologySource = fs.readFileSync(path.join(labPath, 'histology.js'), 'utf8');
const makeHistology = new Function(histologySource.replace(/^export\s+/gm, '') + '\nreturn createHistology;')();
const catalogue = makeHistology({}).catalogue();
const frogVariants = new Set(['epidermis', 'intestine', 'liver', 'lung', 'kidney', 'spleen']);
const plain = value => JSON.parse(JSON.stringify(value));

function fixture(specimenId = 'frog') {
  const calls = [], state = { histologyOpen: false, scaleOpen: false, imaging: 'off', running: false, clamps: [] };
  const launcher = { isConnected: true, getClientRects: () => [{}], focus: options => calls.push(['focus', 'launcher', options]) };
  const scaleClose = { focus: options => calls.push(['focus', 'scale-close', options]) };
  const context = {
    specimenId, specimenPreparation: 'preserved', blood: null, specimenAbort: null, examinationReturnFocus: null, examinedPartId: null,
    specimenGripRelease: false, mouse: { down: true }, input: { grip: .8, gripping: true, span: .7 },
    TCH: { claimed: 12, ids: new Set([12]) },
    dissection: { hovered: null },
    parts: [
      { id: 'liver-left', name: 'Left liver lobe', system: 'digestive', tissue: 'liver' },
      { id: 'kidney-right', name: 'Right kidney', system: 'urinary', tissue: 'kidney' },
      { id: 'artery-a', name: 'Artery', system: 'circulatory', tissue: 'artery' },
      { id: 'nerve-a', name: 'Nerve', system: 'nervous' },
    ],
    document: { activeElement: launcher, querySelector: selector => selector === '#zoomverse .zv-x' ? scaleClose : null,
      body: { classList: { toggle: (name, on) => calls.push(['class', name, on]) } } },
    shell: {
      showFeatureChoices: options => calls.push(['choices', options]),
      say: message => calls.push(['say', message]), setImaging: value => calls.push(['imaging-ui', value]),
      setPhysio: value => calls.push(['physiology-ui', value]),
      setActions: actions => calls.push(['actions', actions]),
      revealConsole: section => calls.push(['console', section]),
    },
    histology: { catalogue: () => catalogue,
      open: (id, metadata) => { calls.push(['histology', id, metadata]); state.histologyOpen = true; },
      close: () => { state.histologyOpen = false; }, isOpen: () => state.histologyOpen },
    zoomverse: { open: metadata => { calls.push(['scale', metadata]); state.scaleOpen = true; },
      close: () => { state.scaleOpen = false; }, isOpen: () => state.scaleOpen },
    imaging: { mode: () => state.imaging, setMode: mode => { calls.push(['imaging', mode]); state.imaging = mode; } },
    pathology: { histologyFor: () => null },
    physio: { running: () => state.running, setRunning: on => { state.running = on; calls.push(['running', on]); },
      mountMonitor: () => calls.push(['monitor', true]), unmountMonitor: () => calls.push(['monitor', false]),
      vessels: () => [{ id: 'artery-a' }], nerves: () => [{ id: 'nerve-a' }], clamped: () => state.clamps,
      clamp: id => { state.clamps.push(id); calls.push(['clamp', id]); },
      unclamp: id => { state.clamps = state.clamps.filter(value => value !== id); calls.push(['unclamp', id]); },
      stimulate: id => calls.push(['stimulate', id]),
    },
    constraints: { info: id => id === 'liver-left' ? [{ id: 'attachment' }] : [],
      sever: id => { calls.push(['divide', id]); return 1; } },
    soft: { setLife: on => calls.push(['life', on]) }, sfx: { setBreathing: on => calls.push(['breathing', on]) },
    tutor: { ask: () => calls.push(['ask']) },
    dialReset: () => calls.push(['dial-reset']), flickReset: () => calls.push(['flick-reset']),
    dispatchEvent: () => assert.fail('visible feature actions must not synthesize keyboard events'),
    KeyboardEvent: class { constructor() { assert.fail('visible feature actions must call their real modules'); } },
  };
  vm.createContext(context); vm.runInContext(features, context, { filename: 'main.js:feature-dispatch' });
  return { context, calls, state, launcher,
    choices: () => calls.filter(call => call[0] === 'choices').at(-1)?.[1],
    opened: () => calls.filter(call => call[0] === 'histology').at(-1),
  };
}

test('visible Histology opens the actual 23-slide reference catalogue without a hovered part', () => {
  const f = fixture();
  assert.equal(catalogue.length, 23); assert.equal(new Set(catalogue.map(slide => slide.id)).size, 23);
  f.context.openLabFeature('histology');
  const choices = f.choices(); assert.ok(choices);
  assert.deepEqual(plain(choices.items.map(item => item.id)), catalogue.map(slide => slide.id));
  assert.match(choices.note, /Illustrative teaching sections/);
  assert.match(choices.note, /not microscope photographs or tissue sampled/);
  assert.equal(f.opened(), undefined, 'the feature opens a chooser before any sample');
  for (const slide of catalogue) {
    const option = choices.items.find(item => item.id === slide.id);
    const species = frogVariants.has(slide.id) ? 'frog' : 'mammal';
    assert.equal(option.label, slide.name); assert.match(option.detail, new RegExp(species === 'frog' ? 'Frog reference' : 'Mammalian reference'));
    choices.onChoose(slide.id);
    const [, id, metadata] = f.opened();
    assert.equal(id, 'reference-' + slide.id); assert.equal(metadata.tissue, slide.id);
    assert.equal(metadata.species, species); assert.match(metadata.name, species === 'frog' ? /^Frog reference/ : /^Mammalian reference/);
  }
});

for (const specimen of ['heart', 'fish', 'earthworm', 'cockroach']) {
  test(`${specimen}: all catalogue selections explicitly identify mammalian references`, () => {
    const f = fixture(specimen); f.context.openLabFeature('histology');
    const choices = f.choices();
    if (specimen !== 'heart') {
      assert.match(choices.title, /Mammalian reference/);
      assert.match(choices.note, /Species-specific slides for this specimen are not available/);
    }
    for (const slide of catalogue) {
      choices.onChoose(slide.id);
      assert.equal(f.opened()[2].tissue, slide.id);
      assert.equal(f.opened()[2].species, 'mammal');
      assert.match(f.opened()[2].name, /^Mammalian reference/);
    }
    // A contextual request on these specimens must not imply a specimen-specific
    // section; it opens the same labelled comparison library.
    if (specimen !== 'heart') {
      f.calls.length = 0; f.context.openStructureHistology('liver-left');
      assert.ok(f.choices()); assert.equal(f.opened(), undefined);
    }
  });
}

test('invalid, stale-specimen and loading-delayed chooser callbacks cannot open a slide', () => {
  for (const invalidation of ['invalid-id', 'specimen-change', 'loading']) {
    const f = fixture(); f.context.openLabFeature('histology'); const choices = f.choices();
    f.calls.length = 0;
    if (invalidation === 'specimen-change') f.context.specimenId = 'heart';
    if (invalidation === 'loading') f.context.specimenAbort = {};
    choices.onChoose(invalidation === 'invalid-id' ? 'not-a-slide' : 'liver');
    assert.deepEqual(f.calls, [], invalidation + ' remains a no-op');
  }
});

test('contextual histology preserves a supported override and discloses an unsupported disease fallback', () => {
  const supported = fixture(); supported.context.pathology.histologyFor = () => 'cardiac';
  supported.context.openStructureHistology('liver-left');
  assert.equal(supported.opened()[1], 'liver-left');
  assert.equal(supported.opened()[2].tissue, 'cardiac', 'a registered override wins over the normal part tissue');
  assert.equal(supported.opened()[2].species, 'frog');
  assert.equal(supported.calls.some(call => call[0] === 'say'), false);

  const missing = fixture(); missing.context.pathology.histologyFor = () => 'liver-steatosis-macrovesicular';
  missing.context.openStructureHistology('liver-left');
  assert.equal(missing.opened()[2].tissue, 'liver');
  assert.ok(missing.calls.some(call => call[0] === 'say' && /no disease-specific slide.*normal teaching reference only/.test(call[1])));

  const noPart = fixture(); noPart.context.openStructureHistology(null);
  assert.ok(noPart.choices()); assert.equal(noPart.opened(), undefined);
});

test('captured structure actions keep their target when live hover changes and never dispatch keyboard events', () => {
  const f = fixture(), actions = f.context.actionsFor('liver-left');
  assert.ok(actions.length >= 3); assert.ok(actions.every(action => action.partId === 'liver-left'));
  f.context.dissection.hovered = 'kidney-right';
  const histology = actions.find(action => action.id === 'histology');
  f.context.doAction(histology.id, histology.partId);
  assert.equal(f.opened()[1], 'liver-left');
  f.context.doAction('zoomverse', 'liver-left');
  assert.equal(f.calls.find(call => call[0] === 'scale')[1].partId, 'liver-left');
  f.context.doAction('imaging', 'liver-left');
  assert.ok(f.calls.some(call => call[0] === 'console' && call[1] === 'secimg'));
  f.context.doAction('clamp', 'artery-a'); f.context.doAction('clamp', 'artery-a');
  f.context.doAction('stimulate', 'nerve-a'); f.context.doAction('divide', 'liver-left');
  for (const expected of [['clamp', 'artery-a'], ['unclamp', 'artery-a'], ['stimulate', 'nerve-a'], ['divide', 'liver-left']])
    assert.ok(f.calls.some(call => call[0] === expected[0] && call[1] === expected[1]), expected.join(' '));
});

test('opening and leaving examination neutralizes grip, stops imaging and returns focus only after viewers close', () => {
  const f = fixture(); f.state.imaging = 'ct';
  f.context.openStructureHistology('liver-left');
  assert.equal(f.context.mouse.down, false); assert.equal(f.context.specimenGripRelease, true);
  assert.deepEqual(plain(f.context.input), { grip: 0, gripping: false, span: 0 });
  assert.equal(f.state.imaging, 'off');
  assert.ok(f.calls.findIndex(call => call[0] === 'imaging') < f.calls.findIndex(call => call[0] === 'histology'));
  assert.ok(f.calls.some(call => call[0] === 'imaging-ui' && call[1].mode === 'off'));
  assert.equal(f.context.examinationReturnFocus, f.launcher);
  f.context.restoreExaminationFocus(); assert.equal(f.calls.some(call => call[0] === 'focus'), false);
  f.state.histologyOpen = false; f.state.scaleOpen = true;
  f.context.restoreExaminationFocus(); assert.equal(f.calls.some(call => call[0] === 'focus'), false);
  f.state.scaleOpen = false; f.context.mouse.down = true; f.context.input.gripping = true;
  f.context.restoreExaminationFocus();
  assert.ok(f.calls.some(call => call[0] === 'focus' && call[1] === 'launcher' && call[2].preventScroll));
  assert.equal(f.context.examinationReturnFocus, null); assert.equal(f.context.mouse.down, false); assert.equal(f.context.input.gripping, false);
  assert.ok(f.calls.filter(call => call[0] === 'dial-reset').length >= 2);
  assert.ok(f.calls.filter(call => call[0] === 'flick-reset').length >= 2);
});

test('hidden or disconnected return targets are not focused; scale uses last examined part and focuses its exit', () => {
  for (const unavailable of ['hidden', 'disconnected']) {
    const f = fixture();
    f.context.rememberExaminationFocus();
    if (unavailable === 'hidden') f.launcher.getClientRects = () => [];
    else f.launcher.isConnected = false;
    f.context.restoreExaminationFocus(); assert.equal(f.calls.some(call => call[0] === 'focus'), false);
  }
  const f = fixture(); f.context.examinedPartId = 'kidney-right';
  f.context.openLabFeature('zoomverse');
  assert.equal(f.calls.find(call => call[0] === 'scale')[1].partId, 'kidney-right');
  assert.ok(f.calls.some(call => call[0] === 'focus' && call[1] === 'scale-close'));
});

test('visible physiology and tutor buttons operate their modules; missing modules, startup and unknown IDs are no-ops', () => {
  const active = fixture(); active.context.openLabFeature('physiology'); assert.equal(active.state.running, true);
  active.context.openLabFeature('physiology'); assert.equal(active.state.running, false);
  active.context.openLabFeature('tutor'); assert.ok(active.calls.some(call => call[0] === 'ask'));
  assert.deepEqual(active.calls.filter(call => call[0] === 'monitor').map(call => call[1]), [true, false]);
  for (const blocked of ['loading', 'no-dissection', 'missing-modules']) {
    const f = fixture();
    if (blocked === 'loading') f.context.specimenAbort = {};
    if (blocked === 'no-dissection') f.context.dissection = null;
    if (blocked === 'missing-modules') for (const key of ['histology', 'zoomverse', 'physio', 'tutor']) f.context[key] = null;
    for (const id of ['histology', 'zoomverse', 'physiology', 'tutor', 'unknown']) f.context.openLabFeature(id);
    assert.deepEqual(f.calls, [], blocked + ' does not dispatch an unavailable feature');
  }
  const unknown = fixture(); unknown.context.openLabFeature('not-a-feature'); assert.deepEqual(unknown.calls, []);
  const noChooser = fixture(); delete noChooser.context.shell.showFeatureChoices;
  noChooser.context.openLabFeature('histology'); assert.deepEqual(noChooser.calls, []);
});
