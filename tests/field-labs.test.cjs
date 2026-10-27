const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const m = require('../src/library/field-labs.js');
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);

test('both original field investigations register stable ids and notebook builders', () => {
  const registered = [], context = { window: {}, LABS: { register(id, lab) { registered.push({ id, ...lab }); } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/library/field-labs.js'), 'utf8'), context);
  assert.deepEqual(registered.map(l => l.id), ['stomatal-transpiration', 'quadrat-sampling']);
  for (const lab of registered) { assert.equal(typeof lab.build, 'function'); assert.ok(lab.relatedTopics.length >= 2); assert.ok(lab.learningObjectives.length >= 3); assert.ok(lab.steps.length >= 4); }
});

test('water-loss model respects zero vapour gradient, ideal seals, units and area scaling', () => {
  const v = { ...m.REFERENCE }, r = m.transpiration(v);
  close(r.deficit, 1.585);
  const boundary = .08 + .25;
  const upper = 1 / (1 / (.006 + .04 * .8) + 1 / boundary);
  const lower = 1 / (1 / (.006 + .22 * .8) + 1 / boundary);
  close(r.rate, (upper + lower) * 1.585 / 101.3 * .004 * 18 * 60 * 1000);
  close(m.transpiration({ ...v, area: 80 }).rate, r.rate * 2);
  close(m.transpiration({ ...v, humidity: 100 }).rate, 0);
  close(m.transpiration({ ...v, seal: 'both' }).rate, 0);
  close(m.transpiration({ ...v, seal: 'upper' }).rate + m.transpiration({ ...v, seal: 'lower' }).rate, r.rate);
});

test('controlled leaf interventions follow the stated mechanism, without claiming closed stomata eliminate all loss', () => {
  const v = { ...m.REFERENCE }, base = m.transpiration(v).rate;
  assert.ok(m.transpiration({ ...v, humidity: 80 }).rate < base);
  assert.ok(m.transpiration({ ...v, wind: 4 }).rate > base);
  const closed = m.transpiration({ ...v, aperture: 0 }).rate;
  assert.ok(closed > 0 && closed < base);
  assert.ok(m.transpiration({ ...v, seal: 'lower' }).rate < m.transpiration({ ...v, seal: 'upper' }).rate);
  for (const humidity of [0, 100]) for (const wind of [0, 5]) for (const aperture of [0, 100]) for (const seal of ['none', 'upper', 'lower', 'both']) {
    const result = m.transpiration({ ...v, humidity, wind, aperture, seal });
    assert.ok(Object.values(result).every(x => Number.isFinite(x) && x >= 0));
  }
  for (const invalid of [{ humidity: NaN }, { wind: -1 }, { aperture: 110 }, { area: 0 }, { seal: 'unknown' }]) assert.throws(() => m.transpiration({ ...v, ...invalid }), RangeError);
});

test('seeded fields are reproducible with distinct sites and all plants stay inside the sampling frame', () => {
  for (const distribution of ['random', 'clustered', 'gradient']) {
    const field = m.createField(1729, distribution);
    assert.deepEqual(field, m.createField(1729, distribution));
    assert.notDeepEqual(field.points, m.createField(4093, distribution).points);
    assert.equal(field.points.length, 120);
    assert.ok(field.points.every(p => p.x >= 0 && p.x < 10 && p.y >= 0 && p.y < 10));
    for (const side of [1, 2]) {
      const cells = m.quadrats(field, side);
      assert.equal(cells.length * side * side, 100);
      assert.equal(cells.reduce((sum, c) => sum + c.count, 0), 120);
      assert.equal(cells.flatMap(c => c.points).length, 120);
    }
  }
});

test('edge convention assigns boundary plants exactly once and random sample order contains no repeats', () => {
  const cells = m.quadrats({ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 9.99, y: 9.99 }] }, 1);
  assert.deepEqual(cells.filter(c => c.count).map(c => c.id), [0, 1, 11, 99]);
  for (const n of [25, 100]) {
    const order = m.sampleOrder(n, 1729);
    assert.deepEqual(order, m.sampleOrder(n, 1729));
    assert.equal(new Set(order).size, n);
    assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i));
  }
});

test('density includes empty quadrats, frequency counts occupancy and abundance uses occupied quadrats', () => {
  const s = m.surveySummary([0, 2, 0, 6], 4, 25);
  assert.equal(s.total, 8); assert.equal(s.occupied, 2); assert.equal(s.sampledArea, 16);
  close(s.density, .5); close(s.frequency, 50); close(s.abundance, 4); close(s.estimatedPopulation, 50);
  const empty = m.surveySummary([0, 0], 1, 100);
  assert.equal(empty.density, 0); assert.equal(empty.frequency, 0); assert.equal(empty.abundance, null);
  const none = m.surveySummary([], 1, 100);
  assert.equal(none.density, null); assert.equal(none.frequency, null); assert.equal(none.standardError, null);
});

test('random-sampling standard error uses finite frame correction and a complete census is exact', () => {
  const s = m.surveySummary([0, 2, 0, 6], 4, 25);
  const sampleVariance = (4 + 0 + 4 + 16) / 3;
  close(s.standardError, Math.sqrt((1 - 4 / 25) * sampleVariance / 4) / 4);
  assert.equal(m.surveySummary([0, 2, 0, 6], 4, 25, 'chosen').standardError, null);
  assert.equal(m.surveySummary([3], 1, 100).standardError, null);
  for (const side of [1, 2]) {
    const cells = m.quadrats(m.createField(9011, 'gradient'), side), all = m.surveySummary(cells.map(c => c.count), side * side, cells.length);
    close(all.density, 1.2); close(all.estimatedPopulation, 120); close(all.standardError, 0);
  }
});

test('invalid observations and unsupported simulation setups are rejected', () => {
  assert.throws(() => m.surveySummary([1, -1], 1, 100), RangeError);
  assert.throws(() => m.surveySummary([1.5], 1, 100), RangeError);
  assert.throws(() => m.surveySummary([1, 2], 1, 1), RangeError);
  assert.throws(() => m.surveySummary([1], 0, 100), RangeError);
  assert.throws(() => m.createField(-1), RangeError);
  assert.throws(() => m.createField(1, 'invented'), RangeError);
  assert.throws(() => m.quadrats(m.createField(1), 3), RangeError);
});
