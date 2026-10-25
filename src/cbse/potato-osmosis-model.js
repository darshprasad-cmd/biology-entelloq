/* Original, deliberately idealized potato-cup teaching model.
 * Heights are mm above the cavity floor; sucrose is % w/v; time is minutes.
 * Selected sucrose is initially inside for inward mode, outside for outward.
 * The paired control is always intact, with water both inside and outside.
 * The response curve is illustrative, NOT a fit to measured potato kinetics.
 * It omits tissue heterogeneity, solute transport and a pressure/water-potential
 * balance. It cannot predict a school experiment's rate or final height.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BioPotatoOsmosisModel = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';

  const constants = Object.freeze({
    INITIAL_LEVEL_MM: 8,
    RIM_LEVEL_MM: 24,
    BATH_LEVEL_MM: 5,
    FLOODED_BATH_LEVEL_MM: 26,
    MAX_TIME_MINUTES: 60,
    TIME_STEP_MINUTES: 10,
    MAX_RECORDS: 90,
    CONCENTRATIONS: Object.freeze([0, 10, 20]),
    SETUPS: Object.freeze(['intact', 'leaking', 'flooded']),
    DIRECTIONS: Object.freeze(['inward', 'outward']),
    REPEATS: Object.freeze([1, 2, 3]),
    NOTICE: 'Illustrative model, not calibrated potato kinetics, experimental data or proof of practical competence.'
  });
  const optionKeys = ['concentration', 'setup', 'direction', 'repeat'];
  const recordKeys = [...optionKeys, 'timeMinutes', 'testLevel', 'controlLevel'];
  const repeatFactors = [0.9, 1, 1.1];

  // Local notebooks accept raw, bounded data only, never executable getters or
  // stored conclusions. Unknown fields are not silently promoted to evidence.
  function dataObject(value, keys, required) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    try {
      const own = Reflect.ownKeys(value);
      if (own.some(key => typeof key !== 'string' || !keys.includes(key))) return false;
      if (required && keys.some(key => !own.includes(key))) return false;
      return own.every(key => Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(value, key), 'value'));
    } catch (_) { return false; }
  }
  function normalize(options = {}) {
    if (!dataObject(options, optionKeys, false)) return null;
    const concentration = Object.hasOwn(options, 'concentration') ? options.concentration : 10;
    const setup = Object.hasOwn(options, 'setup') ? options.setup : 'intact';
    const direction = Object.hasOwn(options, 'direction') ? options.direction : 'inward';
    const repeat = Object.hasOwn(options, 'repeat') ? options.repeat : 1;
    if (!constants.CONCENTRATIONS.includes(concentration) || !constants.SETUPS.includes(setup) || !constants.DIRECTIONS.includes(direction) || !constants.REPEATS.includes(repeat)) return null;
    return { concentration: concentration === 0 ? 0 : concentration, setup, direction, repeat };
  }
  function validTime(time) {
    return typeof time === 'number' && Number.isInteger(time) && time >= 0 && time <= 60 && time % 10 === 0;
  }
  function inference(options, time) {
    if (time === 0) return { validInference: false, reason: 'These are the pre-immersion baseline readings. Compare both cups after the same elapsed time before making an inference.' };
    if (options.setup === 'leaking') return { validInference: false, reason: 'The punctured cup exchanges solution directly with the bath. A falling or unchanged level cannot isolate osmosis; repair the leak and repeat with a matched control.' };
    if (options.setup === 'flooded') return { validInference: false, reason: 'The bath is above the rim: direct flooding and mixing remove the independent cavity meniscus. The later reading is the bath surface, not evidence of osmotic uptake.' };
    if (options.concentration === 0) return { validInference: true, reason: 'Both intact cups contain water: no sucrose gradient is imposed in this idealization. No net level change does not mean individual water molecules stop moving or that real potato tissue has zero solutes.' };
    if (options.direction === 'outward') return { validInference: true, reason: 'With water inside and sucrose solution in the external bath, a fall relative to the intact water-only control is consistent with net water moving outward through selectively permeable living tissues. The external bath is idealized as a reservoir; these values are not calibrated kinetics or a real-potato prediction.' };
    return { validInference: true, reason: 'Under the stated intact-cup assumptions, a rise relative to the matched water control is consistent with net water entry toward the sucrose solution through selectively permeable living tissues. The illustrative values do not measure real permeability or a universal rate.' };
  }
  function reading(options, timeMinutes) {
    const normalized = normalize(options);
    if (!normalized || !validTime(timeMinutes)) return null;
    const c = normalized.concentration;
    let levelMm;
    if (normalized.setup === 'leaking') {
      // Deliberate confound: direct exchange, NOT a model of membrane failure.
      levelMm = 5 + 3 * Math.exp(-timeMinutes / 20);
    } else if (normalized.setup === 'flooded') {
      // t=0 is the pre-immersion baseline. Once immersed, no separate cavity
      // surface exists; the observable surface is the 26 mm bath level.
      levelMm = timeMinutes === 0 ? 8 : 26;
    } else {
      // A chosen saturating curve below the rim, not an osmotic rate equation.
      const response = 1 - Math.exp(-timeMinutes * repeatFactors[normalized.repeat - 1] / 30);
      levelMm = normalized.direction === 'outward' ? 8 - 0.2 * c * response : 8 + 0.45 * c * response;
    }
    const intact = normalized.setup === 'intact';
    return {
      options: normalized,
      timeMinutes: timeMinutes === 0 ? 0 : timeMinutes,
      levelMm,
      initialLevelMm: 8,
      changeMm: levelMm - 8,
      // For an ideal constant-area cavity, volume is proportional to height.
      // Intact inward mode assumes solute retention: c(t)*h(t) = c(0)*h(0).
      // This index is not a solute mass because cavity area is unspecified.
      // Outward mode idealizes a water-only cavity and an external reservoir;
      // it makes no claim of finite-bath concentration or solute mass balance.
      concentrationPercent: intact ? (normalized.direction === 'outward' ? 0 : c * 8 / levelMm) : null,
      soluteIndex: intact && normalized.direction === 'inward' ? c * 8 : null,
      volumeRatio: intact ? levelMm / 8 : null,
      ...inference(normalized, timeMinutes)
    };
  }
  function compare(options, timeMinutes) {
    const normalized = normalize(options);
    if (!normalized || !validTime(timeMinutes)) return null;
    const test = reading(normalized, timeMinutes);
    const control = reading({ ...normalized, setup: 'intact', concentration: 0 }, timeMinutes);
    return {
      options: normalized,
      timeMinutes: timeMinutes === 0 ? 0 : timeMinutes,
      test,
      control,
      testLevel: test.levelMm,
      controlLevel: control.levelMm,
      sugarLevelMm: test.levelMm,
      controlLevelMm: control.levelMm,
      differenceMm: test.changeMm - control.changeMm,
      ...inference(normalized, timeMinutes)
    };
  }
  function validRecord(input) {
    if (!dataObject(input, recordKeys, true)) return null;
    const options = normalize({ concentration: input.concentration, setup: input.setup, direction: input.direction, repeat: input.repeat });
    if (!options || !validTime(input.timeMinutes)) return null;
    for (const key of ['testLevel', 'controlLevel']) {
      if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0 || input[key] > 28) return null;
    }
    return { ...options, timeMinutes: input.timeMinutes === 0 ? 0 : input.timeMinutes,
      testLevel: input.testLevel === 0 ? 0 : input.testLevel,
      controlLevel: input.controlLevel === 0 ? 0 : input.controlLevel };
  }
  function safeRecords(records) {
    if (!Array.isArray(records) || records.length > constants.MAX_RECORDS) return [];
    return records.map(validRecord).filter(Boolean);
  }
  function summarize(records) {
    const groups = new Map();
    for (const row of safeRecords(records)) {
      const key = [row.concentration, row.setup, row.direction, row.timeMinutes].join('|');
      if (!groups.has(key)) groups.set(key, new Map());
      // Re-reading a placement is not an independent repeat. Its latest raw
      // observation replaces the earlier one for this condition/time/repeat.
      groups.get(key).set(row.repeat, row);
    }
    return [...groups.values()].map(repeats => {
      const rows = [...repeats.values()];
      const first = rows[0];
      const mean = key => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
      return {
        concentration: first.concentration, setup: first.setup, direction: first.direction, timeMinutes: first.timeMinutes,
        count: rows.length, repeats: rows.map(row => row.repeat).sort((a, b) => a - b),
        meanTestLevel: mean('testLevel'), meanControlLevel: mean('controlLevel'),
        meanDifferenceMm: rows.reduce((sum, row) => sum + row.testLevel - row.controlLevel, 0) / rows.length,
        ...inference(first, first.timeMinutes),
        limitation: 'Means summarize entered illustrative readings within one condition and time only. Deterministic repeats do not establish experimental uncertainty or statistical confidence.'
      };
    }).sort((a, b) => a.concentration - b.concentration || constants.SETUPS.indexOf(a.setup) - constants.SETUPS.indexOf(b.setup) || constants.DIRECTIONS.indexOf(a.direction) - constants.DIRECTIONS.indexOf(b.direction) || a.timeMinutes - b.timeMinutes);
  }
  function csv(records) {
    const header = 'initial_sucrose_percent_wv,setup,direction,repeat,time_min,test_level_mm,water_control_level_mm,differential_change_mm,data_kind';
    // All cells are bounded numbers or a fixed enumeration, not arbitrary text.
    const lines = safeRecords(records).map(row => [row.concentration, row.setup, row.direction, row.repeat, row.timeMinutes,
      row.testLevel, row.controlLevel, Number((row.testLevel - row.controlLevel).toFixed(8)), 'illustrative_not_experimental'].join(','));
    return [header, ...lines].join('\r\n') + '\r\n';
  }
  return Object.freeze({ constants, normalize, reading, compare, validRecord, summarize, csv });
});
