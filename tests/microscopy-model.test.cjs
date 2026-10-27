'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, '../src/cbse/microscopy-model.js');
const M = require(file);
const usable = (specimen = 'onion', overrides = {}) => ({ ...M.defaults(specimen), prepared: true, stain: true, focus: specimen === 'onion' ? 52 : 46, ...overrides });

test('pure API works in a script or CommonJS without storage, camera or synthetic experimental claims', () => {
  const context = {};
  const source = fs.readFileSync(file, 'utf8');
  vm.runInNewContext(source, context);
  assert.equal(context.BioMicroscopyModel.optics({ objective: 10 }).total, 100);
  assert.ok(Object.isFrozen(M));
  assert.ok(Object.isFrozen(M.constants));
  assert.ok(Object.isFrozen(M.constants.OBJECTIVES));
  assert.ok(Object.isFrozen(M.questions));
  assert.ok(Object.isFrozen(M.questions[0].options));
  assert.ok(Object.isFrozen(M.limits));
  assert.doesNotMatch(source, /getUserMedia|localStorage|fetch\(|Math\.random|Date\.now/);
  assert.match(M.constants.NOTICE, /not photographs.*calibrated microscopy.*experimental data.*competence/);
  assert.ok(M.limits.some(item => /stage micrometer/.test(item)));
  assert.ok(M.limits.some(item => /not.*depth of field/.test(item)));
  assert.ok(M.limits.some(item => /supervision and hygiene/.test(item)));
});

test('independent defaults are specific but do not award prepared state or mutate another call', () => {
  assert.deepEqual(M.defaults(), { specimen: 'onion', prepared: false, stain: false, mount: 'flat', objective: 4, focus: 30, light: 65, x: 0, y: 0 });
  const first = M.defaults('cheek'); first.prepared = true;
  assert.equal(M.defaults('cheek').prepared, false);
  assert.equal(M.defaults('fish'), null);
  assert.equal(M.defaults(null), null);
  assert.deepEqual(M.normalize(), M.defaults());
  assert.equal(M.normalize({ specimen: 'cheek' }).specimen, 'cheek');
  assert.equal(M.optics().ready, false);
});

test('normalization rejects out-of-range and forged data without coercion or executing getters', () => {
  for (const input of [null, [], 'onion', 4, { specimen: 'frog' }, { specimen: undefined }, { prepared: 1 }, { stain: 'true' }, { mount: 'thick' }, { objective: 100 }, { objective: '40' }, { objective: null }, { focus: -1 }, { focus: 101 }, { light: Infinity }, { light: NaN }, { light: '65' }, { x: -1501 }, { y: 1501 }, { x: undefined }, { ready: true }, { mastery: 100 }, { [Symbol('x')]: 0 }]) {
    assert.equal(M.normalize(input), null, JSON.stringify(input));
    assert.equal(M.optics(input), null);
  }
  let accessed = false;
  assert.equal(M.normalize({ get focus() { accessed = true; return 52; } }), null);
  assert.equal(accessed, false);
  assert.equal(M.normalize(new Proxy({}, { ownKeys() { throw new Error('broken'); } })), null);
  const original = Object.freeze(usable());
  const result = M.normalize(original);
  assert.notEqual(result, original);
  assert.deepEqual(result, original);
  assert.equal(Object.is(M.normalize({ x: -0 }).x, -0), false);
  assert.ok(M.normalize({ x: -1500, y: 1500, focus: 0, light: 100 }));
});

test('optical magnification and field diameters match independent unit conversions', () => {
  const expected = [[4, 40, 4500], [10, 100, 1800], [40, 400, 450]];
  for (const [objective, total, fovUm] of expected) {
    const view = M.optics(usable('onion', { objective }));
    assert.equal(view.total, total);
    assert.equal(view.fovUm, fovUm);
    assert.equal(view.ready, true);
    assert.equal(view.fovUm * objective, 18000);
  }
  const low = M.optics({ objective: 10 });
  const high = M.optics({ objective: 40 });
  assert.equal(low.fovUm / high.fovUm, 4);
  assert.equal(low.fovUm ** 2 / high.fovUm ** 2, 16);
  assert.equal(M.optics({ objective: 4 }).fovUm / high.fovUm, 10);
});

test('both specimen focus targets use inclusive objective-specific tolerance boundaries', () => {
  for (const [specimen, target] of [['onion', 52], ['cheek', 46]]) for (const [objective, tolerance] of [[4, 12], [10, 7], [40, 3]]) {
    for (const direction of [-1, 1]) {
      const edge = M.optics(usable(specimen, { objective, focus: target + direction * tolerance }));
      assert.equal(edge.targetFocus, target);
      assert.equal(edge.focusTolerance, tolerance);
      assert.equal(edge.focusError, tolerance);
      assert.equal(edge.sharp, true);
      assert.equal(edge.ready, true);
      const outside = M.optics(usable(specimen, { objective, focus: target + direction * (tolerance + 0.01) }));
      assert.equal(outside.sharp, false);
      assert.equal(outside.ready, false);
      assert.match(outside.feedback, /fine focus at high power/);
    }
    assert.equal(M.optics(usable(specimen, { objective, focus: target })).focusError, 0);
  }
  assert.equal(M.optics(usable('onion', { objective: 40, focus: 46 })).sharp, false);
  assert.equal(M.optics(usable('cheek', { objective: 40, focus: 52 })).sharp, false);
});

test('readiness requires deposited, stained, flat, adequately lit and focused virtual preparation', () => {
  for (const specimen of ['onion', 'cheek']) {
    const base = usable(specimen);
    assert.equal(M.optics(base).ready, true);
    for (const change of [{ prepared: false }, { stain: false }, { mount: 'bubbles' }, { mount: 'fold' }, { light: 24.99 }, { light: 85.01 }, { focus: 100 }]) {
      const bad = M.optics({ ...base, ...change });
      assert.equal(bad.ready, false);
      assert.ok(bad.issues.length > 0);
      assert.equal(M.record({ ...base, ...change }, 'A stained nucleus is visible.'), null);
    }
    for (const light of [25, 65, 85]) assert.equal(M.optics({ ...base, light }).ready, true);
  }
  assert.match(M.optics(usable('onion', { stain: false })).feedback, /unstained cells do not disappear/);
  assert.match(M.optics(usable('onion', { mount: 'fold' })).feedback, /Flatten the onion peel/);
  assert.match(M.optics(usable('cheek', { mount: 'fold' })).feedback, /thin smear/);
  assert.match(M.optics(usable('onion', { mount: 'bubbles' })).feedback, /artefacts, not cell nuclei/);
  assert.match(M.optics(usable('cheek', { light: 0 })).feedback, /too dim/);
  assert.match(M.optics(usable('cheek', { light: 100 })).feedback, /washed out/);
});

test('stage displacement reverses viewed movement on both axes without changing optical magnification', () => {
  for (const objective of [4, 10, 40]) {
    const state = usable('cheek', { objective, x: 450, y: -125 });
    const view = M.optics(state);
    assert.deepEqual(view.imageOffsetUm, { x: -450, y: 125 });
    assert.equal(view.total, objective * 10);
    assert.equal(view.fovUm, 18000 / objective);
    assert.deepEqual(state, usable('cheek', { objective, x: 450, y: -125 }));
  }
  assert.deepEqual(M.optics({ x: -1500, y: 1500 }).imageOffsetUm, { x: 1500, y: -1500 });
  assert.deepEqual(M.optics().imageOffsetUm, { x: 0, y: 0 });
});

test('retrieval feedback has unique IDs, a valid answer and explained incorrect alternatives', () => {
  assert.equal(new Set(M.questions.map(q => q.id)).size, M.questions.length);
  assert.equal(M.questions.length, 6);
  for (const q of M.questions) {
    assert.ok(q.prompt.length > 40);
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.explanation.length > 120);
    for (let index = 0; index < q.options.length; index++) {
      const result = M.grade(q.id, index);
      assert.equal(result.correct, index === q.answer);
      assert.equal(result.answer, q.answer);
      assert.equal(result.explanation, q.explanation);
    }
    for (const invalid of [-1, 4, 1.5, '1', null, NaN]) assert.equal(M.grade(q.id, invalid), null);
  }
  assert.equal(M.grade('constructor', 0), null);
  assert.equal(M.grade(null, 0), null);
  assert.equal(M.grade('total-magnification', 2).correct, true);
  assert.equal(M.grade('field-diameter', 1).correct, true);
  assert.match(M.grade('cell-boundary', 1).explanation, /cannot resolve the membrane bilayer/);
  assert.match(M.grade('onion-chloroplasts', 2).explanation, /normally lacks chloroplasts/);
});

test('record snapshots are bounded raw observations, not automatically graded biology claims', () => {
  const state = usable('cheek', { objective: 40, x: 125, y: -300 });
  const result = M.record(state, '  Several irregular outlines and darker stained nuclei.  ');
  assert.deepEqual(result, { state, observation: 'Several irregular outlines and darker stained nuclei.', total: 400, fovUm: 450, dataKind: 'illustrative_virtual_slide' });
  assert.notEqual(result.state, state);
  assert.equal(Object.hasOwn(result, 'mastery'), false);
  assert.equal(Object.hasOwn(result, 'correct'), false);
  state.focus = 0;
  assert.equal(result.state.focus, 46);
  assert.equal(M.record(usable(), 'x'.repeat(600)).observation.length, 600);
  for (const text of ['', '   ', null, undefined, 42, [], 'x'.repeat(601), 'cell\u0000nucleus', 'cell\u007f']) assert.equal(M.record(usable(), text), null);
  assert.equal(M.record({ ...usable(), total: 999 }, 'Cells'), null);
  assert.equal(M.record(usable(), 'This is an incorrect student interpretation.').observation, 'This is an incorrect student interpretation.');
  assert.equal(M.record(usable(), 'First field.\nSecond field.').observation, 'First field.\nSecond field.');
});
