'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, '../src/cbse/potato-osmosis-model.js');
const model = require(file);
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const row = (override = {}) => ({ concentration: 10, setup: 'intact', direction: 'inward', repeat: 1, timeMinutes: 20, testLevel: 10.03, controlLevel: 8, ...override });

test('pure UMD API is available without browser, storage, network or random dependencies', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
  assert.equal(typeof context.BioPotatoOsmosisModel.compare, 'function');
  close(context.BioPotatoOsmosisModel.compare({ concentration: 20, setup: 'intact', repeat: 2 }, 30).sugarLevelMm, 13.689085029457018);
  assert.ok(Object.isFrozen(model));
  assert.ok(Object.isFrozen(model.constants));
  assert.ok(Object.isFrozen(model.constants.CONCENTRATIONS));
  assert.match(model.constants.NOTICE, /not calibrated.*experimental data.*competence/i);
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /localStorage|fetch\(|getUserMedia|Math\.random|Date\.now/);
});

test('options use bounded explicit units and reject malformed values without mutation or coercion', () => {
  assert.deepEqual(model.normalize(), { concentration: 10, setup: 'intact', direction: 'inward', repeat: 1 });
  assert.deepEqual(model.normalize({ concentration: 0 }), { concentration: 0, setup: 'intact', direction: 'inward', repeat: 1 });
  for (const options of [null, [], '10', 10, { concentration: '10' }, { concentration: 5 }, { concentration: NaN }, { concentration: Infinity }, { concentration: undefined }, { setup: 'boiled' }, { setup: 'constructor' }, { direction: 'forward' }, { direction: null }, { repeat: 0 }, { repeat: 4 }, { repeat: 1.5 }, { repeat: '2' }, { extra: true }]) assert.equal(model.normalize(options), null);
  const options = Object.freeze({ concentration: 20, setup: 'intact', repeat: 3 });
  assert.notEqual(model.normalize(options), options);
  assert.deepEqual(options, { concentration: 20, setup: 'intact', repeat: 3 });
  let accessed = false;
  const accessor = { get concentration() { accessed = true; return 10; } };
  assert.equal(model.normalize(accessor), null);
  assert.equal(accessed, false);
});

test('independently calculated illustrative heights and dilution are correct', () => {
  const thirty = model.reading({ concentration: 20, setup: 'intact', repeat: 2 }, 30);
  close(thirty.levelMm, 13.689085029457018);
  close(thirty.changeMm, 5.689085029457018);
  close(thirty.concentrationPercent, 11.688144215314765);
  close(thirty.soluteIndex, 160);
  close(thirty.volumeRatio, 1.7111356286821273);
  const sixty = model.compare({ concentration: 10, setup: 'intact', repeat: 1 }, 60);
  close(sixty.sugarLevelMm, 11.756155003002861);
  close(sixty.controlLevelMm, 8);
  close(sixty.differenceMm, 3.756155003002861);
  assert.equal(sixty.validInference, true);
  assert.match(sixty.reason, /consistent.*not measure real permeability/);
});

test('intact cup invariants: all starting levels, monotone response, dilution, solute retention and no overflow', () => {
  for (const concentration of [0, 10, 20]) for (const repeat of [1, 2, 3]) {
    let previous = 8;
    let previousConcentration = concentration;
    for (let time = 0; time <= 60; time += 10) {
      const pair = model.compare({ concentration, setup: 'intact', repeat }, time);
      assert.ok(pair.sugarLevelMm >= previous);
      assert.ok(pair.sugarLevelMm < model.constants.RIM_LEVEL_MM);
      assert.equal(pair.controlLevelMm, 8);
      assert.ok(pair.test.concentrationPercent <= previousConcentration);
      close(pair.test.concentrationPercent * pair.test.levelMm, concentration * 8);
      close(pair.differenceMm, pair.sugarLevelMm - pair.controlLevelMm);
      if (time === 0) { assert.equal(pair.sugarLevelMm, 8); assert.equal(pair.validInference, false); }
      if (concentration === 0) { assert.equal(pair.sugarLevelMm, 8); assert.equal(pair.test.concentrationPercent, 0); }
      previous = pair.sugarLevelMm;
      previousConcentration = pair.test.concentrationPercent;
    }
  }
  const control = model.compare({ concentration: 0 }, 30);
  assert.match(control.reason, /does not mean individual water molecules stop moving/);
  assert.match(control.reason, /real potato tissue has zero solutes/);
  assert.ok(model.reading({ concentration: 20 }, 30).levelMm > model.reading({ concentration: 10 }, 30).levelMm);
});

test('repeats are deterministic illustrative variation, not pseudorandom experimental evidence', () => {
  const values = [1, 2, 3].map(repeat => model.compare({ concentration: 10, repeat }, 40).sugarLevelMm);
  assert.ok(values[0] < values[1] && values[1] < values[2]);
  assert.deepEqual(values, [1, 2, 3].map(repeat => model.compare({ concentration: 10, repeat }, 40).sugarLevelMm));
  assert.match(model.summarize([row()])[0].limitation, /Deterministic repeats do not establish experimental uncertainty/);
});

test('reversed solution placement decreases the water-filled cup level, without mixing direction groups', () => {
  const pair = model.compare({ concentration: 20, direction: 'outward', repeat: 2 }, 30);
  close(pair.testLevel, 5.471517764685769);
  assert.equal(pair.controlLevel, 8);
  close(pair.differenceMm, -2.528482235314231);
  assert.equal(pair.test.concentrationPercent, 0);
  assert.equal(pair.test.soluteIndex, null);
  assert.match(pair.reason, /water inside.*sucrose solution in the external bath/);
  assert.match(pair.reason, /reservoir/);
  for (const concentration of [0, 10, 20]) for (const repeat of [1, 2, 3]) {
    let last = 8;
    for (let time = 0; time <= 60; time += 10) {
      const result = model.compare({ concentration, direction: 'outward', repeat }, time);
      assert.ok(result.testLevel <= last && result.testLevel >= 4);
      assert.equal(result.controlLevel, 8);
      if (concentration === 0) assert.equal(result.testLevel, 8);
      last = result.testLevel;
    }
  }
  const groups = model.summarize([row(), row({ direction: 'outward', testLevel: 6 })]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].count, 1);
  assert.equal(groups[1].meanDifferenceMm, -2);
});

test('leak and flood are confounded, not membrane experiments or osmosis proof', () => {
  close(model.reading({ setup: 'leaking' }, 20).levelMm, 6.103638323514327);
  for (const setup of ['leaking', 'flooded']) for (const concentration of [0, 10, 20]) for (const time of [0, 10, 30, 60]) {
    const pair = model.compare({ setup, concentration }, time);
    assert.equal(pair.validInference, false);
    assert.equal(pair.controlLevel, 8);
    close(pair.differenceMm, pair.testLevel - 8);
    assert.equal(pair.test.concentrationPercent, null);
    assert.equal(pair.test.soluteIndex, null);
    assert.equal(pair.test.volumeRatio, null);
    if (time === 0) { assert.equal(pair.sugarLevelMm, 8); assert.match(pair.reason, /pre-immersion baseline/); }
    else if (setup === 'flooded') assert.equal(pair.sugarLevelMm, 26);
    else assert.ok(pair.sugarLevelMm > 5 && pair.sugarLevelMm < 8);
  }
  assert.match(model.compare({ setup: 'flooded' }, 20).reason, /no.*|remove the independent cavity meniscus/);
  assert.match(model.compare({ setup: 'leaking' }, 20).reason, /directly.*cannot isolate osmosis/);
});

test('time controls reject off-grid, string, negative, infinite and undefined inputs', () => {
  for (const time of [-10, 1, 9, 15, 70, 10000, Infinity, NaN, '10', null, undefined]) {
    assert.equal(model.reading({}, time), null);
    assert.equal(model.compare({}, time), null);
  }
  assert.equal(model.compare({ concentration: 5 }, 10), null);
  assert.equal(model.reading({ setup: 'boiled' }, 10), null);
});

test('notebook accepts only bounded raw records and never trusts stored conclusions', () => {
  const original = Object.freeze(row());
  assert.deepEqual(model.validRecord(original), original);
  assert.notEqual(model.validRecord(original), original);
  assert.ok(model.validRecord(row({ testLevel: 26, controlLevel: 8, setup: 'flooded' })));
  for (const input of [null, [], 'x'.repeat(10000), {}, row({ extra: true }), row({ validInference: true }), row({ differenceMm: 2.03 }), row({ concentration: '10' }), row({ setup: '<script>' }), row({ direction: 'forward' }), row({ repeat: 99 }), row({ timeMinutes: 13 }), row({ testLevel: NaN }), row({ testLevel: Infinity }), row({ testLevel: '10.03' }), row({ testLevel: -1 }), row({ controlLevel: 29 }), row({ controlLevel: null })]) assert.equal(model.validRecord(input), null);
  const missing = row(); delete missing.controlLevel;
  assert.equal(model.validRecord(missing), null);
  let accessed = false;
  const unsafe = row(); Object.defineProperty(unsafe, 'testLevel', { get() { accessed = true; return 10; } });
  assert.equal(model.validRecord(unsafe), null); assert.equal(accessed, false);
});

test('summaries group by concentration, setup and elapsed time, not across experiments', () => {
  const data = [row(), row({ repeat: 2, testLevel: 10.3, controlLevel: 8.1 }), row({ concentration: 20, testLevel: 12 }), row({ timeMinutes: 30, testLevel: 11 }), row({ setup: 'leaking', testLevel: 6, controlLevel: 8 })];
  const groups = model.summarize(data);
  assert.equal(groups.length, 4);
  const shared = groups.find(g => g.concentration === 10 && g.setup === 'intact' && g.timeMinutes === 20);
  assert.equal(shared.count, 2);
  assert.deepEqual(shared.repeats, [1, 2]);
  close(shared.meanTestLevel, 10.165);
  close(shared.meanControlLevel, 8.05);
  close(shared.meanDifferenceMm, 2.115);
  assert.equal(groups.find(g => g.setup === 'leaking').validInference, false);
  assert.equal(groups.find(g => g.concentration === 20).count, 1);
  assert.equal(data.length, 5);
  assert.equal(Object.hasOwn(shared, 'mastery'), false);
});

test('repeat re-reading replaces its observation; malformed and oversized notebooks are bounded', () => {
  const summary = model.summarize([row(), row({ testLevel: 11 })]);
  assert.equal(summary[0].count, 1);
  assert.equal(summary[0].meanTestLevel, 11);
  assert.deepEqual(model.summarize(null), []);
  assert.deepEqual(model.summarize({ length: 1 }), []);
  assert.deepEqual(model.summarize(Array(91).fill(row())), []);
  assert.equal(model.summarize(Array(90).fill(row()))[0].count, 1);
  assert.deepEqual(model.summarize([null, { setup: 'intact' }]), []);
  assert.equal(model.summarize([null, row()])[0].count, 1);
});

test('CSV is fixed-schema raw observations with derived differences and explicit illustrative provenance', () => {
  assert.equal(model.csv([row(), row({ setup: '=SUM(1,2)' })]), 'initial_sucrose_percent_wv,setup,direction,repeat,time_min,test_level_mm,water_control_level_mm,differential_change_mm,data_kind\r\n10,intact,inward,1,20,10.03,8,2.03,illustrative_not_experimental\r\n');
  assert.equal(model.csv(Array(91).fill(row())).split('\r\n').length, 2);
  assert.equal(model.csv([]), model.csv(null));
});
