/* Original Entelloq teaching models and diagrams. No empirical plant calibration.
 * Two lab adapters share the existing LABS registry and local notebook contract.
 * Model version is retained in every snapshot; neither model writes storage.
 */
(function (root) {
  'use strict';
  const VERSION = 'field-labs-1';
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const round = (value, places = 3) => Number(value.toFixed(places));
  const REFERENCE = Object.freeze({ humidity: 50, wind: 1, aperture: 80, seal: 'none', area: 40 });
  function transpiration(v) {
    if (!v || ![v.humidity, v.wind, v.aperture, v.area].every(Number.isFinite) || v.humidity < 0 || v.humidity > 100 || v.wind < 0 || v.wind > 5 || v.aperture < 0 || v.aperture > 100 || v.area <= 0 || v.area > 200 || !['none', 'upper', 'lower', 'both'].includes(v.seal)) throw new RangeError('Unsupported leaf conditions');
    // A deliberately chosen broadleaf: lower-surface conductance is greater.
    // Leaf and air are both 25 C. Vapor pressure inside the leaf is saturated.
    // Conductances are mol m^-2 s^-1, pressure is kPa, one-sided area is cm^2.
    const deficit = 3.17 * (1 - v.humidity / 100), boundary = 0.08 + 0.25 * Math.sqrt(v.wind);
    const surface = (name, maximum) => {
      if (v.seal === name || v.seal === 'both') return 0;
      const leaf = 0.006 + maximum * v.aperture / 100;
      return 1 / (1 / leaf + 1 / boundary);
    };
    const upper = surface('upper', 0.04), lower = surface('lower', 0.22);
    const molarFlux = (upper + lower) * deficit / 101.3;
    const rate = molarFlux * (v.area / 10000) * 18 * 60 * 1000;
    return { deficit, boundary, upper, lower, conductance: upper + lower, rate, flux: molarFlux * 1000 };
  }
  function random(seed) {
    let state = seed >>> 0;
    return () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
  }
  function createField(seed, distribution = 'clustered', population = 120) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295 || !['random', 'clustered', 'gradient'].includes(distribution) || !Number.isInteger(population) || population < 0 || population > 300) throw new RangeError('Unsupported field setup');
    const rand = random(seed), centers = [[2, 2], [7.7, 3.2], [5.5, 8]], points = [];
    for (let i = 0; i < population; i++) {
      let x, y;
      if (distribution === 'clustered') {
        const c = centers[Math.floor(rand() * centers.length)];
        const radius = Math.sqrt(-2 * Math.log(Math.max(1e-9, rand()))) * 0.88, theta = rand() * Math.PI * 2;
        x = clamp(c[0] + radius * Math.cos(theta), 0.02, 9.98);
        y = clamp(c[1] + radius * Math.sin(theta), 0.02, 9.98);
      } else { x = (distribution === 'gradient' ? Math.sqrt(rand()) : rand()) * 10; y = rand() * 10; }
      points.push({ x, y });
    }
    return { seed, distribution, width: 10, area: 100, points };
  }
  function quadrats(field, side = 1) {
    if (![1, 2].includes(side)) throw new RangeError('Quadrat side must be 1 or 2 m');
    const across = 10 / side;
    const cells = Array.from({ length: across * across }, (_, id) => ({ id, x: id % across * side, y: Math.floor(id / across) * side, side, count: 0, points: [] }));
    field.points.forEach(p => {
      // Include left/top boundaries; exclude right/bottom. Field edges are closed.
      const id = Math.min(across - 1, Math.floor(p.y / side)) * across + Math.min(across - 1, Math.floor(p.x / side));
      cells[id].count++; cells[id].points.push(p);
    });
    return cells;
  }
  function sampleOrder(count, seed) {
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new RangeError('Unsupported sampling frame');
    const order = Array.from({ length: count }, (_, i) => i), rand = random(seed);
    for (let i = count - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    return order;
  }
  function surveySummary(counts, area, frameSize, design = 'random') {
    if (!Array.isArray(counts) || counts.some(c => !Number.isInteger(c) || c < 0) || !Number.isFinite(area) || area <= 0 || !Number.isInteger(frameSize) || frameSize < 1 || counts.length > frameSize) throw new RangeError('Invalid survey observations');
    const n = counts.length, total = counts.reduce((sum, c) => sum + c, 0), occupied = counts.filter(c => c > 0).length;
    const density = n ? total / (n * area) : null;
    let standardError = null;
    if (design === 'random' && n > 1) {
      const mean = total / n, variance = counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / (n - 1);
      standardError = Math.sqrt((1 - n / frameSize) * variance / n) / area;
    }
    return { n, total, occupied, sampledArea: n * area, density, frequency: n ? occupied / n * 100 : null, abundance: occupied ? total / occupied : null, estimatedPopulation: density === null ? null : density * area * frameSize, standardError };
  }
  const M = Object.freeze({ VERSION, REFERENCE, transpiration, createField, quadrats, sampleOrder, surveySummary });
  root.BIO_FIELD_MODELS = M;
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (typeof LABS === 'undefined') return;

  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
  const fmt = (n, p = 2) => n == null ? '—' : Number(n.toFixed(p)).toLocaleString('en');
  function button(parent, text, action, primary = false) { const b = el('button', 'fl-button' + (primary ? ' fl-primary' : ''), text); b.type = 'button'; b.onclick = action; parent.append(b); return b; }
  function select(parent, name, options, value, change) {
    const label = el('label', 'fl-control'), caption = el('span', '', name), input = el('select');
    options.forEach(([v, text]) => { const o = el('option', '', text); o.value = v; input.append(o); });
    input.value = value; input.setAttribute('aria-label', name); input.onchange = () => change(input.value); label.append(caption, input); parent.append(label); return input;
  }
  function range(parent, name, min, max, step, value, suffix, change) {
    const label = el('label', 'fl-control'), top = el('span', 'fl-control-label'), output = el('output', '', value + suffix), input = el('input');
    top.append(el('span', '', name), output); input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = value; input.setAttribute('aria-label', name);
    input.oninput = () => { output.textContent = input.value + suffix; change(Number(input.value)); }; label.append(top, input); parent.append(label); return input;
  }
  function frame(host, title, intro) {
    const wrap = el('div', 'fl-workbench'); host.append(wrap);
    const head = el('header', 'fl-head'); head.append(el('p', 'fl-eyebrow', 'Observe • compare • explain'), el('h2', '', title), el('p', '', intro)); wrap.append(head);
    const layout = el('div', 'fl-layout'), stage = el('section', 'fl-stage'), controls = el('aside', 'fl-controls'); controls.setAttribute('aria-label', 'Experiment controls'); layout.append(stage, controls); wrap.append(layout);
    const evidence = el('section', 'fl-evidence'); evidence.setAttribute('aria-label', 'Measurements and evidence'); wrap.append(evidence);
    const status = el('p', 'fl-status'); status.setAttribute('role', 'status'); controls.append(status);
    return { wrap, stage, controls, evidence, status };
  }
  function details(parent, title, html) { const d = el('details', 'fl-details'); d.append(el('summary', '', title)); const content = el('div'); content.innerHTML = html; d.append(content); parent.append(d); return d; }
  function readings(parent, rows) {
    parent.innerHTML = '<dl class="fl-readings">' + rows.map(([label, value, unit]) => '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '<small>' + esc(unit || '') + '</small></dd></div>').join('') + '</dl>';
  }
  function chart(points, title, xLabel, yLabel, second = false, truth = null) {
    if (!points.length) return '<p class="fl-empty">Record an observation to build this graph.</p>';
    const maxX = Math.max(1, ...points.map(p => p.x)), maxY = Math.max(0.1, ...points.flatMap(p => second ? [p.y, p.z] : [p.y]), truth || 0) * 1.12;
    const px = x => 63 + x / maxX * 514, py = y => 210 - y / maxY * 160;
    const path = key => points.map((p, i) => (i ? 'L' : 'M') + px(p.x).toFixed(2) + ' ' + py(p[key]).toFixed(2)).join(' ');
    return '<svg class="fl-chart" viewBox="0 0 620 265" role="img" aria-label="' + esc(title) + '; exact values are in the table below."><path class="fl-axis" d="M63 45V210H580"/>' + [0, .5, 1].map(f => '<path class="fl-gridline" d="M63 ' + py(maxY * f) + 'H580"/><text class="fl-tick" x="54" y="' + (py(maxY * f) + 4) + '" text-anchor="end">' + fmt(maxY * f, 1) + '</text>').join('') + '<text x="63" y="24">' + esc(yLabel) + '</text><text x="63" y="229">0</text><text x="577" y="229" text-anchor="end">' + fmt(maxX) + '</text><text x="320" y="254" text-anchor="middle">' + esc(xLabel) + '</text>' + (truth === null ? '' : '<path class="fl-census" d="M63 ' + py(truth) + 'H580"/>') + '<path class="fl-trace" d="' + path('y') + '"/>' + (second ? '<path class="fl-trace fl-comparison" d="' + path('z') + '"/>' : '') + points.map(p => '<circle class="fl-dot" cx="' + px(p.x) + '" cy="' + py(p.y) + '" r="3.5"/>').join('') + '</svg>';
  }
  function captureStage(stage, title, lines) {
    const drawings = [...stage.querySelectorAll('svg')].slice(0, 2);
    if (!drawings.length) return Promise.reject(new Error('No diagram is ready'));
    const ink = getComputedStyle(stage).color, background = getComputedStyle(stage.closest('.fl-workbench')).getPropertyValue('--panel').trim() || '#0b1117';
    const properties = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor'];
    const diagrams = drawings.map((source, i) => {
      const copy = source.cloneNode(true), originals = [source, ...source.querySelectorAll('*')], copies = [copy, ...copy.querySelectorAll('*')];
      originals.forEach((node, index) => { const style = getComputedStyle(node); copies[index].setAttribute('style', properties.map(key => key + ':' + style.getPropertyValue(key)).join(';')); });
      copy.setAttribute('x', String(40 + i * 570)); copy.setAttribute('y', '110'); copy.setAttribute('width', drawings.length === 1 ? '700' : '550'); copy.setAttribute('height', '500');
      return new XMLSerializer().serializeToString(copy);
    }).join('');
    const source = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="880" viewBox="0 0 1200 880"><rect width="1200" height="880" fill="' + esc(background) + '"/><g fill="' + esc(ink) + '" font-family="Arial,sans-serif"><text x="40" y="48" font-size="28">' + esc(title) + '</text><text x="40" y="82" font-size="16">Original teaching simulation · not an experimental measurement · ' + VERSION + '</text>' + lines.slice(0, 8).map((line, i) => '<text x="40" y="' + (648 + i * 26) + '" font-size="17">' + esc(line) + '</text>').join('') + '</g>' + diagrams + '</svg>';
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' })), img = new Image();
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Capture could not render')); };
      img.onload = () => {
        try { const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 880; canvas.getContext('2d').drawImage(img, 0, 0); canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Capture unavailable')), 'image/png'); }
        catch (error) { reject(error); } finally { URL.revokeObjectURL(url); }
      };
      img.src = url;
    });
  }

  LABS.register('stomatal-transpiration', {
    title: 'Stomata & Water Loss', tag: 'Plant Biology', category: 'Plant Biology', type: 'simulation', difficulty: 'school', minutes: 20,
    color: 'var(--em)', blurb: 'Run two matched leaf chambers. Change one condition, measure water loss and explain what the comparison can establish.',
    relatedTopics: ['stomata', 'plant-transport', 'xylem'], aliases: ['transpiration', 'leaf surfaces', 'guard cells', 'humidity', 'wind', 'controlled comparison'],
    question: 'How does one change to a leaf or its environment affect water loss?',
    learningObjectives: ['Design a matched comparison', 'Connect stomatal and boundary-layer resistance', 'Distinguish a flux model from a school indicator experiment'],
    steps: ['Predict a difference before starting', 'Change one test condition', 'Advance both chambers for equal time', 'Record and explain the measured difference'],
    challenge: 'Can you halve water loss without changing leaf area? Test one variable at a time and defend the comparison with recorded values.',
    build(host) {
      const ui = frame(host, 'Two leaves. One deliberate change.', 'Both chambers contain the same fictional broadleaf. Select one test factor; the reference stays matched in every other condition.');
      let area = 40, factor = 'humidity', testValue = 25, minutes = 0, started = false, disposed = false, history = [{ x: 0, y: 0, z: 0 }];
      const actions = [], setups = { humidity: ['Relative humidity', 0, 100, 5, 25, '%'], wind: ['Air speed', 0, 5, .25, 2.5, ' m/s'], aperture: ['Stomatal opening', 0, 100, 5, 20, '%'] };
      const stageHeading = el('div', 'fl-stage-heading'); ui.stage.append(stageHeading);
      const pair = el('div', 'fl-chambers'); ui.stage.append(pair);
      ui.stage.append(el('p', 'fl-help', 'Original schematic: pore numbers are not a density measurement. Arrows show net vapour loss; individual water molecules still move at zero net flux.'));
      ui.controls.append(el('h3', '', 'Set the comparison'));
      const areaInput = range(ui.controls, 'Matched leaf area', 20, 100, 5, 40, ' cm²', v => { area = v; render(); });
      const factorInput = select(ui.controls, 'Change only this factor', [['humidity', 'Air humidity'], ['wind', 'Air speed'], ['aperture', 'Stomatal opening'], ['seal', 'Seal a leaf surface']], factor, value => { factor = value; testValue = factor === 'seal' ? 'lower' : setups[factor][4]; setupControl(); render(); });
      const testControl = el('div', 'fl-treatment'); ui.controls.append(testControl);
      const lockNote = el('p', 'fl-help', 'Conditions lock when a run begins. New comparison resets the apparatus, while recorded notebook trials stay saved.'); ui.controls.append(lockNote);
      const buttons = el('div', 'fl-actions'); ui.controls.append(buttons);
      const startButton = button(buttons, 'Start paired experiment', () => { started = true; actions.push('Started matched comparison'); render(); ui.status.textContent = 'Baseline established at 0 minutes. Advance both chambers together.'; }, true);
      const advanceButton = button(buttons, 'Advance both by 5 min', () => { if (!started || minutes >= 30) return; minutes += 5; const p = conditions(); history.push({ x: minutes, y: transpiration(p.reference).rate * minutes, z: transpiration(p.test).rate * minutes }); actions.push('Observed at ' + minutes + ' model min'); render(); ui.status.textContent = minutes === 30 ? 'Thirty-minute observation complete. Record this trial in the notebook, then begin another comparison.' : 'Both chambers observed at ' + minutes + ' model minutes.'; }, true);
      const resetButton = button(buttons, 'New comparison', () => { started = false; minutes = 0; history = [{ x: 0, y: 0, z: 0 }]; actions.length = 0; render(); ui.status.textContent = 'Apparatus reset. Existing notebook trials are unchanged.'; factorInput.focus(); });
      const measures = el('div'); ui.evidence.append(measures);
      const graph = el('div', 'fl-graph'); ui.evidence.append(graph);
      const data = el('div', 'fl-table-wrap'); data.tabIndex = 0; data.setAttribute('role', 'region'); data.setAttribute('aria-label', 'Paired water-loss observations'); ui.evidence.append(data);
      details(ui.wrap, 'How this model works, and where it stops', '<p>This is an original, uncalibrated teaching model of a fictional broadleaf at 25 °C, with leaf and air at the same temperature. The saturated leaf-air vapour pressure is fixed at 3.17 kPa and atmospheric pressure at 101.3 kPa. Stomatal opening is set directly; hormonal, light and drought responses are not simulated.</p><p>For each unsealed surface, leaf and boundary-layer conductances act in series. Total molar flux = conductance × vapour-pressure deficit ÷ atmospheric pressure. Water mass follows from molar mass, leaf area and elapsed time. Conductance constants, the lower/upper difference and the wind response are illustrative choices, not measurements from a species. A small cuticular pathway remains when stomata close; an ideal seal blocks both pathways on its surface.</p><p>The model holds conditions constant and supplies unlimited water. It omits leaf heating, changing water status, storage, growth and feedback. These chamber mass outputs are <strong>simulated water loss</strong>; they are not calibrated potometer uptake or a cobalt-chloride-paper endpoint. Equal indicator times and equal water flux are different measurements.</p><p><a href="https://openstax.org/books/biology-2e/pages/30-5-transport-of-water-and-solutes-in-plants" target="_blank" rel="noopener">Mechanism reference: OpenStax · plant water transport</a>; <a href="https://www.fao.org/4/x0490e/x0490e0j.htm" target="_blank" rel="noopener">FAO saturation vapour-pressure table</a> (25 °C rounded to 3.17 kPa). Equations, apparatus diagram and parameters are original Entelloq teaching choices. Model version: ' + VERSION + '.</p>');
      function conditions() { const reference = { ...REFERENCE, area }, test = { ...reference, [factor]: testValue }; return { reference, test }; }
      function setupControl() {
        testControl.replaceChildren();
        if (factor === 'seal') select(testControl, 'Test surface treatment', [['none', 'Neither sealed'], ['upper', 'Upper surface sealed'], ['lower', 'Lower surface sealed'], ['both', 'Both surfaces sealed']], testValue, value => { testValue = value; render(); });
        else { const s = setups[factor]; range(testControl, 'Test: ' + s[0], s[1], s[2], s[3], testValue, s[5], value => { testValue = value; render(); }); }
      }
      function leaf(v, result, label, index) {
        const gap = 1 + v.aperture / 100 * 9, sealedUpper = ['upper', 'both'].includes(v.seal), sealedLower = ['lower', 'both'].includes(v.seal);
        return '<article class="fl-chamber"><h3><span class="fl-key ' + (index ? 'fl-key-test' : '') + '"></span>' + label + '</h3><svg viewBox="0 0 310 245" role="img" aria-label="Original schematic leaf cross-section. Upper surface ' + (sealedUpper ? 'sealed' : 'open') + '; lower surface ' + (sealedLower ? 'sealed' : 'open') + '. Stomatal opening ' + v.aperture + ' percent."><path class="fl-chamber-glass" d="M35 27H275V220H35Z"/><path class="fl-leaf" d="M50 105Q150 58 260 105V149Q150 190 50 149Z"/><path class="fl-vein" d="M65 130H249"/>' + [84, 155, 226].map(x => '<ellipse class="fl-guard" cx="' + (x - gap) + '" cy="164" rx="8" ry="17"/><ellipse class="fl-guard" cx="' + (x + gap) + '" cy="164" rx="8" ry="17"/>').join('') + '<ellipse class="fl-guard" cx="' + (155 - gap) + '" cy="87" rx="8" ry="15"/><ellipse class="fl-guard" cx="' + (155 + gap) + '" cy="87" rx="8" ry="15"/>' + (sealedUpper ? '<path class="fl-seal" d="M55 93Q150 54 255 93"/>' : result.rate > 0 ? '<path class="fl-water-arrow" d="M155 68V37m-5 7 5-7 5 7"/>' : '') + (sealedLower ? '<path class="fl-seal" d="M55 168Q150 205 255 168"/>' : result.rate > 0 ? '<path class="fl-water-arrow" d="M84 185v27m-5-7 5 7 5-7m66-20v27m-5-7 5 7 5-7m66-20v27m-5-7 5 7 5-7"/>' : '') + '<text x="43" y="45">Upper</text><text x="43" y="211">Lower</text><text x="155" y="134" text-anchor="middle">Water supply</text></svg><p class="fl-mass"><strong>' + fmt(result.rate * minutes) + '</strong> mg lost</p><p class="fl-help">' + fmt(result.rate) + ' mg/min · ' + fmt(v.humidity, 0) + '% RH · ' + fmt(v.wind) + ' m/s</p><p class="fl-help">Opening ' + v.aperture + '% · ' + ({ none: 'no seal', upper: 'upper sealed', lower: 'lower sealed', both: 'both sealed' }[v.seal]) + '</p></article>';
      }
      function render() {
        if (disposed) return;
        const p = conditions(), a = transpiration(p.reference), b = transpiration(p.test);
        areaInput.disabled = factorInput.disabled = started; testControl.querySelectorAll('input,select').forEach(input => { input.disabled = started; });
        startButton.disabled = started; advanceButton.disabled = !started || minutes >= 30; resetButton.disabled = !started;
        stageHeading.textContent = (started ? minutes + ' / 30 model min' : 'Inspect the matched setup') + ' · ' + area + ' cm² per leaf · 25 °C';
        pair.innerHTML = leaf(p.reference, a, 'Reference chamber', 0) + leaf(p.test, b, 'Test chamber', 1);
        readings(measures, [['Test − reference', fmt((b.rate - a.rate) * minutes), 'mg water'], ['Test / reference rate', a.rate ? fmt(b.rate / a.rate) + '×' : 'Undefined', 'ratio'], ['Test vapour deficit', fmt(b.deficit), 'kPa'], ['Test surface flux', fmt(b.flux), 'mmol m⁻² s⁻¹']]);
        graph.innerHTML = '<h3>Water loss over equal time</h3><p class="fl-legend"><span>● Reference</span><span>– – Test</span></p>' + chart(history, 'Reference and test accumulated water loss', 'Elapsed model time (min)', 'Water loss (mg)', true);
        data.innerHTML = '<table><caption>Current comparison · synthetic chamber outputs</caption><thead><tr><th scope="col">Time (min)</th><th scope="col">Reference (mg)</th><th scope="col">Test (mg)</th><th scope="col">Difference (mg)</th></tr></thead><tbody>' + history.map(p => '<tr><th scope="row">' + p.x + '</th><td>' + fmt(p.y) + '</td><td>' + fmt(p.z) + '</td><td>' + fmt(p.z - p.y) + '</td></tr>').join('') + '</tbody></table>';
      }
      setupControl(); render(); ui.status.textContent = 'Choose a test condition and make a prediction before starting.';
      return { dispose() { disposed = true; ui.wrap.remove(); }, capture() {
        const p = conditions(), a = transpiration(p.reference), b = transpiration(p.test);
        return captureStage(ui.stage, 'Stomata & Water Loss · matched comparison', ['Left: reference chamber. Right: test chamber.', 'Elapsed: ' + minutes + ' model min. Matched leaf area: ' + area + ' cm²; temperature: 25 °C.', 'Reference: 50% humidity, 1 m/s air, 80% opening, no seal.', 'Test: ' + p.test.humidity + '% humidity, ' + p.test.wind + ' m/s air, ' + p.test.aperture + '% opening, seal: ' + p.test.seal + '.', 'Reference water loss: ' + fmt(a.rate * minutes) + ' mg. Test water loss: ' + fmt(b.rate * minutes) + ' mg.', 'Difference (test − reference): ' + fmt((b.rate - a.rate) * minutes) + ' mg. Rates are uncalibrated teaching outputs.']);
      }, snapshot() {
        const p = conditions(), a = transpiration(p.reference), b = transpiration(p.test);
        return { variables: { 'Model version': VERSION, 'Data kind': 'Illustrative simulation', 'Changed factor': factor, 'Leaf area (cm²)': area, 'Test humidity (%)': p.test.humidity, 'Test air speed (m/s)': p.test.wind, 'Test opening (%)': p.test.aperture, 'Test seal': p.test.seal, 'Reference humidity (%)': REFERENCE.humidity, 'Reference air speed (m/s)': REFERENCE.wind, 'Reference opening (%)': REFERENCE.aperture, 'Reference seal': 'none', 'Elapsed model time (min)': minutes }, measurements: { 'Reference loss (mg)': round(a.rate * minutes), 'Test loss (mg)': round(b.rate * minutes), 'Difference in loss (mg)': round((b.rate - a.rate) * minutes), 'Reference rate (mg/min)': round(a.rate), 'Test rate (mg/min)': round(b.rate), 'Test vapour deficit (kPa)': round(b.deficit) }, stage: started ? (minutes ? 'Matched comparison at ' + minutes + ' model minutes' : 'Starting baseline') : 'Setup; no elapsed experiment', actions: actions.slice(-12) };
      } };
    }
  });

  LABS.register('quadrat-sampling', {
    title: 'Quadrat Sampling Fieldwork', tag: 'Ecology', category: 'Ecology', type: 'investigation', difficulty: 'school', minutes: 20,
    color: 'var(--em)', blurb: 'Survey a reproducible virtual meadow. Count focal plants, retain empty quadrats and compare density, frequency and abundance.',
    relatedTopics: ['ecology', 'population-growth'], aliases: ['quadrat', 'sampling', 'density', 'frequency', 'abundance', 'fieldwork', 'population'],
    question: 'How well does a quadrat sample represent the whole virtual meadow?',
    learningObjectives: ['Use random placement without replacement', 'Distinguish density, frequency and abundance', 'Evaluate sampling variation and selection bias'],
    steps: ['Choose the site and sampling design', 'Locate a quadrat before counting', 'Record all selected quadrats, including zeros', 'Compare the estimate with the revealed census'],
    challenge: 'Compare two sampling designs on the same seed and quadrat area. Can a precise-looking average still misrepresent the meadow?',
    build(host) {
      const ui = frame(host, 'A meadow is more than its busiest patch.', 'Sample a 10 × 10 m virtual field. Each three-leaf symbol is one focal plant. Record zeros as carefully as crowded quadrats.');
      let seed = 1729, distribution = 'clustered', side = 1, design = 'random', field, cells, order, records = [], selected = null, census = false, disposed = false;
      const fieldHost = el('div', 'fl-meadow'); ui.stage.append(fieldHost);
      const zoom = el('section', 'fl-quadrat-detail'); zoom.setAttribute('aria-label', 'Selected quadrat'); ui.stage.append(zoom);
      ui.controls.append(el('h3', '', 'Plan before sampling'));
      const setupInputs = [];
      setupInputs.push(select(ui.controls, 'Virtual site seed', [['1729', 'Meadow A · seed 1729'], ['4093', 'Meadow B · seed 4093'], ['9011', 'Meadow C · seed 9011']], seed, value => { seed = Number(value); reset(false); }));
      setupInputs.push(select(ui.controls, 'Plant distribution', [['clustered', 'Clustered patches'], ['random', 'Random positions'], ['gradient', 'Increasing toward the east']], distribution, value => { distribution = value; reset(false); }));
      setupInputs.push(select(ui.controls, 'Quadrat area', [['1', '1 m² · 1 × 1 m'], ['2', '4 m² · 2 × 2 m']], side, value => { side = Number(value); reset(false); }));
      setupInputs.push(select(ui.controls, 'Placement design', [['random', 'Random, without replacement'], ['chosen', 'Choose locations yourself']], design, value => { design = value; reset(false); }));
      ui.controls.append(el('p', 'fl-help', 'Setup locks at the first location. Start a new survey to change it. Existing shared notebook trials remain saved.'));
      const actions = el('div', 'fl-actions'); ui.controls.append(actions);
      const locateButton = button(actions, 'Locate a random quadrat', () => { const next = order.find(id => !records.some(r => r.id === id)); if (next !== undefined) choose(next); }, true);
      const chosenLocation = el('div', 'fl-chosen-location'); ui.controls.append(chosenLocation);
      const locationInput = select(chosenLocation, 'Choose quadrat by number', [], '', () => {});
      const inspectButton = button(chosenLocation, 'Inspect this location', () => choose(Number(locationInput.value)));
      const countForm = el('form', 'fl-count-form');
      const countLabel = el('label', 'fl-control'); countLabel.append(el('span', '', 'Focal plants in this quadrat'));
      const countInput = el('input'); countInput.type = 'number'; countInput.min = '0'; countInput.max = '300'; countInput.step = '1'; countInput.required = true; countInput.inputMode = 'numeric'; countInput.setAttribute('aria-label', 'Focal plants in this quadrat'); countLabel.append(countInput);
      const recordButton = el('button', 'fl-button fl-primary', 'Check count & record'); recordButton.type = 'submit'; countForm.append(countLabel, recordButton); ui.controls.append(countForm);
      const feedback = el('p', 'fl-feedback'); feedback.setAttribute('role', 'status'); ui.controls.append(feedback);
      countForm.onsubmit = event => {
        event.preventDefault(); if (selected === null || records.some(r => r.id === selected)) return;
        const count = Number(countInput.value); if (!Number.isInteger(count) || count < 0 || countInput.value === '') return;
        if (count !== cells[selected].count) { feedback.textContent = 'Recount the enlarged quadrat. Each complete three-leaf symbol marks one plant; the text description provides the same count. Retain a zero when the quadrat is empty.'; return; }
        records.push({ id: selected, count }); selected = null; countInput.value = ''; render(); feedback.textContent = 'Quadrat recorded, including its area. Locate the next quadrat or record this survey summary in your notebook.';
      };
      const endActions = el('div', 'fl-actions'); ui.controls.append(endActions);
      const censusButton = button(endActions, 'Reveal virtual census', () => { census = true; render(); ui.status.textContent = 'The whole simulated field is now revealed. Census comparison checks this virtual sample, not a real habitat.'; });
      button(endActions, 'New survey · same field', () => { reset(false); ui.status.textContent = 'Survey cleared; notebook trials remain. The same seed recreates the same field and random order.'; setupInputs[0].focus(); });
      const metrics = el('div'); ui.evidence.append(metrics);
      const graph = el('div', 'fl-graph'); ui.evidence.append(graph);
      const table = el('div', 'fl-table-wrap'); table.tabIndex = 0; table.setAttribute('role', 'region'); table.setAttribute('aria-label', 'Quadrat observations'); ui.evidence.append(table);
      details(ui.wrap, 'Read the estimators and sampling assumptions', '<p><strong>Density</strong> = all focal plants counted ÷ total sampled area (plants/m²). <strong>Frequency</strong> = occupied quadrats ÷ all sampled quadrats × 100. <strong>Abundance</strong> = focal plants ÷ occupied quadrats (plants per occupied quadrat); it is undefined when none are occupied. Empty quadrats belong in density and frequency denominators. Changing quadrat size changes frequency and abundance, so hold size constant when comparing them.</p><p>The field is a fixed synthetic population, with perfect detection and no births, deaths or movement. Aligned quadrats partition the entire field; the random plan shuffles this finite frame without replacement. Choosing locations yourself illustrates possible selection bias. Locations cannot be recorded twice. The census becomes available after three quadrats, and does not award a mastery score.</p><p>For a random survey with at least two quadrats, the displayed sampling standard error uses the sample variance of counts, quadrat area and finite-population correction √(1 − n/N). It is an estimate of sampling precision, not a confidence guarantee or evidence about real biological variation. Zero observed variation in a small sample does not prove a uniform field. No standard error is claimed for handpicked locations. Larger samples need not move closer to the census on every step.</p><p><a href="https://openstax.org/books/biology-2e/pages/45-1-population-demography" target="_blank" rel="noopener">Method reference: OpenStax · population sampling</a>. The deterministic population, illustration and observations are original Entelloq simulations, not a photograph or field dataset. Model version: ' + VERSION + '.</p>');
      function reset(announce = true) {
        field = createField(seed, distribution); cells = quadrats(field, side); order = sampleOrder(cells.length, seed ^ 0x51f15e); records = []; selected = null; census = false;
        if (countInput) countInput.value = ''; if (feedback) feedback.textContent = ''; render(); if (announce) ui.status.textContent = 'Survey ready. Choose the sampling plan before locating a quadrat.';
      }
      function choose(id) {
        if (selected !== null || records.some(r => r.id === id)) return; selected = id; countInput.value = ''; feedback.textContent = ''; render(); ui.status.textContent = 'Quadrat ' + (id + 1) + ' selected. Count before recording; do not discard an empty location.'; countInput.focus();
      }
      function plant(p, x, y, scale, radius) { const cx = (p.x - x) * scale, cy = (p.y - y) * scale; return '<g class="fl-plant" transform="translate(' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ')"><circle cx="0" cy="-' + radius + '" r="' + radius + '"/><circle cx="-' + radius + '" cy="' + radius * .5 + '" r="' + radius + '"/><circle cx="' + radius + '" cy="' + radius * .5 + '" r="' + radius + '"/></g>'; }
      function render() {
        if (disposed || !field) return;
        const locked = records.length > 0 || selected !== null, summary = surveySummary(records.map(r => r.count), side * side, cells.length, design);
        setupInputs.forEach(input => { input.disabled = locked; }); locateButton.hidden = design !== 'random'; locateButton.disabled = selected !== null || records.length === cells.length;
        chosenLocation.hidden = design !== 'chosen';
        const previousLocation = locationInput.value;
        locationInput.replaceChildren(...cells.filter(c => !records.some(r => r.id === c.id)).map(c => { const option = el('option', '', 'Quadrat ' + (c.id + 1)); option.value = c.id; return option; }));
        if (Array.from(locationInput.options).some(o => o.value === previousLocation)) locationInput.value = previousLocation;
        locationInput.disabled = inspectButton.disabled = selected !== null || records.length === cells.length;
        countInput.disabled = recordButton.disabled = selected === null; censusButton.disabled = records.length < 3 || census;
        const across = 10 / side;
        const mapGrid = cells.map(c => { const observed = records.find(r => r.id === c.id); return '<rect class="fl-map-cell' + (observed ? ' fl-map-sampled' : '') + (selected === c.id ? ' fl-map-selected' : '') + '" x="' + c.x * 50 + '" y="' + c.y * 50 + '" width="' + side * 50 + '" height="' + side * 50 + '"/><text class="fl-map-label" x="' + (c.x * 50 + 4) + '" y="' + (c.y * 50 + 12) + '">' + (observed ? c.count : c.id + 1) + '</text>'; }).join('');
        fieldHost.innerHTML = '<div class="fl-stage-heading"><span>10 m × 10 m · ' + cells.length + ' possible quadrats</span><span>' + records.length + ' sampled</span></div><div class="fl-field-wrap"><svg viewBox="0 0 500 500" role="img" aria-label="Virtual meadow with ' + distribution + ' plant positions. Each grid location is accessible through the overlaid buttons."><rect class="fl-field-ground" width="500" height="500"/>' + field.points.map(p => plant(p, 0, 0, 50, 2)).join('') + mapGrid + '</svg><div class="fl-field-grid" style="--fl-columns:' + across + '"></div></div><p class="fl-help">' + (design === 'random' ? 'Use “Locate a random quadrat”; the plan selects locations before you inspect their counts.' : 'Select any unsampled grid location. Handpicking productive patches may bias the estimate.') + ' Top and left edges count; bottom and right edges belong to the adjacent quadrat.</p>';
        const grid = fieldHost.querySelector('.fl-field-grid');
        cells.forEach(c => {
          const observed = records.find(r => r.id === c.id), cell = el('button', 'fl-cell' + (observed ? ' fl-sampled' : '') + (selected === c.id ? ' fl-selected' : '')); cell.type = 'button';
          cell.setAttribute('aria-label', 'Quadrat ' + (c.id + 1) + ', row ' + (Math.floor(c.id / across) + 1) + ', column ' + (c.id % across + 1) + (observed ? ', recorded ' + c.count + ' plants' : selected === c.id ? ', selected for counting' : ', not sampled'));
          cell.disabled = design === 'random' || !!observed || selected !== null; cell.onclick = () => choose(c.id); grid.append(cell);
        });
        if (selected === null) zoom.innerHTML = '<div class="fl-empty"><h3>' + (records.length === cells.length ? 'The entire frame is surveyed.' : 'Inspect one quadrat at a time.') + '</h3><p>' + (records.length === cells.length ? 'Your density estimate now equals this field’s census density.' : 'Locate a quadrat to open an enlarged counting view. A text equivalent is available beside it.') + '</p></div>';
        else {
          const c = cells[selected]; zoom.innerHTML = '<div><h3>Quadrat ' + (c.id + 1) + ' · ' + side * side + ' m²</h3><p>Count each three-leaf symbol once. Symbols mark individual plant centres; their drawn leaves do not define the counting boundary.</p><details class="fl-details"><summary>Text equivalent of this quadrat</summary><p>This quadrat contains <strong>' + c.count + '</strong> focal plants. ' + (c.count === 0 ? 'It is empty and must still be recorded.' : 'Each plotted symbol corresponds to one individual.') + '</p></details></div><svg viewBox="0 0 320 320" role="img" aria-label="Enlarged quadrat ' + (c.id + 1) + '; use the adjacent text equivalent for its exact plant count."><rect class="fl-field-ground" x="0" y="0" width="320" height="320"/>' + c.points.map(p => plant(p, c.x, c.y, 320 / side, 4)).join('') + '<rect class="fl-quadrat-border" x="1" y="1" width="318" height="318"/></svg>';
        }
        readings(metrics, [['Density', fmt(summary.density), 'plants/m²'], ['Frequency', summary.frequency == null ? '—' : fmt(summary.frequency, 1) + '%', 'quadrats occupied'], ['Abundance', summary.abundance == null ? 'Not defined' : fmt(summary.abundance), 'plants/occupied quadrat'], ['Area surveyed', fmt(summary.sampledArea), 'm² of 100 m²']]);
        const trace = records.map((_, i) => ({ x: i + 1, y: surveySummary(records.slice(0, i + 1).map(r => r.count), side * side, cells.length, design).density }));
        graph.innerHTML = '<h3>Does the estimate settle?</h3>' + (census ? '<p class="fl-census-note">Virtual census: <strong>' + field.points.length + ' plants · ' + fmt(field.points.length / 100) + ' plants/m²</strong>. Dashed line shows census density; it is revealed information, not another sample.</p>' : '<p>Collect at least three quadrats to reveal this virtual field’s census.</p>') + chart(trace, 'Estimated density after each quadrat', 'Quadrats recorded', 'Estimated plants/m²', false, census ? field.points.length / 100 : null) + '<p class="fl-help">' + (summary.n ? 'Estimated field population: ' + fmt(summary.estimatedPopulation, 1) + ' plants. ' : '') + (design !== 'random' ? 'Handpicked survey: no random-sampling error estimate is claimed.' : summary.standardError === null ? 'At least two random quadrats are needed to estimate sampling standard error.' : 'Sampling standard error: ' + fmt(summary.standardError, 3) + ' plants/m². This does not measure systematic error or detection failure.') + '</p>';
        table.innerHTML = '<table><caption>Current survey · every selected quadrat retained</caption><thead><tr><th scope="col">Sample</th><th scope="col">Quadrat</th><th scope="col">Area (m²)</th><th scope="col">Plants</th><th scope="col">Occupied?</th></tr></thead><tbody>' + (records.length ? records.map((r, i) => '<tr><th scope="row">' + (i + 1) + '</th><td>' + (r.id + 1) + '</td><td>' + side * side + '</td><td>' + r.count + '</td><td>' + (r.count ? 'Yes' : 'No') + '</td></tr>').join('') : '<tr><td colspan="5">No quadrats recorded yet.</td></tr>') + '</tbody></table>';
      }
      reset();
      return { dispose() { disposed = true; ui.wrap.remove(); }, capture() {
        const s = surveySummary(records.map(r => r.count), side * side, cells.length, design);
        return captureStage(ui.stage, 'Quadrat Sampling · virtual field observation', ['Seed ' + seed + '; distribution: ' + distribution + '; design: ' + design + '.', 'Field area: 100 m². Quadrat area: ' + side * side + ' m². Recorded quadrats: ' + s.n + '.', 'Plants counted: ' + s.total + '; occupied quadrats: ' + s.occupied + '.', 'Density: ' + fmt(s.density) + ' plants/m². Frequency: ' + fmt(s.frequency) + '%. Abundance: ' + fmt(s.abundance) + ' plants/occupied quadrat.', selected === null ? 'No quadrat currently selected for counting.' : 'Enlarged view: quadrat ' + (selected + 1) + ', containing ' + cells[selected].count + ' focal plants.', census ? 'Revealed census: ' + field.points.length + ' plants in this synthetic field.' : 'Census not revealed. No real habitat inference is claimed.']);
      }, snapshot() {
        const s = surveySummary(records.map(r => r.count), side * side, cells.length, design);
        return { variables: { 'Model version': VERSION, 'Data kind': 'Synthetic virtual field', 'Field seed': seed, Distribution: distribution, 'Sampling design': design === 'random' ? 'Random without replacement' : 'Chosen locations', 'Quadrat area (m²)': side * side, 'Field area (m²)': 100, 'Quadrat IDs': records.map(r => r.id + 1).join(', ') || 'None', 'Observed counts': records.map(r => r.count).join(', ') || 'None' }, measurements: { 'Quadrats recorded': s.n, 'Sampled area (m²)': s.sampledArea, 'Plants counted': s.total, 'Occupied quadrats': s.occupied, 'Density (plants/m²)': s.density == null ? 'No sample' : round(s.density), 'Frequency (%)': s.frequency == null ? 'No sample' : round(s.frequency), 'Abundance (plants/occupied quadrat)': s.abundance == null ? 'Undefined; no occupied quadrats' : round(s.abundance), 'Estimated field population': s.estimatedPopulation == null ? 'No sample' : round(s.estimatedPopulation), 'Sampling standard error (plants/m²)': s.standardError == null ? 'Not estimated' : round(s.standardError), ...(census ? { 'Revealed census (plants)': field.points.length, 'Census density (plants/m²)': field.points.length / 100 } : {}) }, stage: selected === null ? (s.n ? 'Survey summary; record to compare another sampling design' : 'Plan before sampling') : 'Counting quadrat ' + (selected + 1), actions: records.slice(-12).map(r => 'Quadrat ' + (r.id + 1) + ': ' + r.count + ' focal plants') };
      } };
    }
  });
})(typeof window === 'undefined' ? globalThis : window);
