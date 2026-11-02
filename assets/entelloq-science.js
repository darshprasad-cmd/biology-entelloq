/* Entelloq scientific workspace contracts. No network requests or scientific solvers. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EntelloqScience = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var VERSION = '1.0.0';
  var STOP = new Set('a an the is are was were how what why can could would i we me my you to of for in on with and does do show find try experiment about happens when please work works working measure explore'.split(' '));
  var GROUPS = [
    ['projectile','projectiles','trajectory','trajectories','throw','thrown','ballistic'],
    ['pendulum','pendulums','swing','swinging'], ['oscillation','oscillations','oscillate','vibration','vibrations'],
    ['circuit','circuits','electricity','electrical'], ['resistance','resistor','resistors','ohm','ohms'],
    ['gravity','gravitation','gravitational'], ['refraction','refract','bending'],
    ['microscope','microscopy','microscopic'], ['osmosis','osmotic','tonicity','swelling','swell','swollen'],
    ['diffusion','diffuse','diffusing'], ['photosynthesis','photosynthetic'],
    ['mitosis','cell division','divide'], ['dna','genetics','genetic','heredity','inheritance'],
    ['heart','cardiac','circulation','circulatory'], ['frog','amphibian'],
    ['dissection','dissect','anatomy','anatomical'], ['neuron','neural','nerve'],
    ['enzyme','enzymes','catalyst'], ['notebook','notes','saved','observations'],
    ['speed','velocity'], ['force','forces'], ['wave','waves'], ['cell','cells'],
    ['lesson','lessons','learn','concept','concepts'], ['lab','labs','practical','practicals']
  ];
  function normalize(s) { return String(s == null ? '' : s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9μΩωαβγδλπ\s-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function terms(s) { return normalize(s).split(' ').filter(function (x) { return x && !STOP.has(x); }); }
  function aliases(token) { var groups = GROUPS.filter(function (g) { return g.indexOf(token) >= 0; }); return groups.length ? Array.from(new Set([token].concat.apply([token], groups))) : [token]; }
  function search(items, query, limit) {
    var q = normalize(query), tokens = terms(query), max = Math.max(1, Math.min(100, limit || 20));
    if (!tokens.length) return items.slice(0, max);
    return items.map(function (item, index) {
      var title = normalize(item.title || item.n || item.name), extra = normalize([item.description, item.kind, item.subject, (item.tags || []).join(' '), item.id].join(' '));
      var hay = title + ' ' + extra, score = title === q ? 200 : title.indexOf(q) >= 0 ? 100 : 0, matches = 0;
      tokens.forEach(function (token) {
        var best = 0;
        aliases(token).forEach(function (word) {
          var exact = word === token, wordRx = new RegExp('(^|\\s)' + word + '(?=\\s|$)');
          if (wordRx.test(title)) best = Math.max(best, exact ? 32 : 20);
          else if (title.indexOf(word) >= 0) best = Math.max(best, exact ? 19 : 12);
          else if (wordRx.test(hay)) best = Math.max(best, exact ? 12 : 7);
        });
        if (best) { matches++; score += best; }
      });
      // Every meaningful term must match: avoid confident-looking irrelevant results.
      return { item: item, score: matches === tokens.length ? score : -1, index: index };
    }).filter(function (x) { return x.score >= 0; }).sort(function (a, b) { return b.score - a.score || a.index - b.index; }).slice(0, max).map(function (x) { return x.item; });
  }
  function enabled(locationLike) {
    var loc = locationLike || (typeof location !== 'undefined' ? location : { search: '', hostname: '' });
    if (!locationLike && typeof window !== 'undefined') { try { if (window.top !== window) loc = window.top.location; } catch (_) {} }
    var flag = new URLSearchParams(loc.search || '').get('excellence');
    return flag === '1' || (flag !== '0' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname || ''));
  }
  function classroomEnabled(locationLike) { var loc = locationLike || (typeof location !== 'undefined' ? location : {}); if (!locationLike && typeof window !== 'undefined') { try { loc = window.top.location; } catch (_) {} } return new URLSearchParams(loc.search || '').get('classroom') === '1'; }
  function resolveSubjectURL(item, locationLike) {
    if (!item || !/^(physics|biology)$/.test(item.subject)) throw new Error('Unknown Entelloq subject.');
    var target = new URL(item.url), expected = 'https://' + item.subject + '.entelloq.com';
    if (target.origin !== expected || target.username || target.password) throw new Error('Untrusted subject destination.');
    var loc = locationLike || (typeof location !== 'undefined' ? location : {search:'',hostname:''});
    if (!locationLike && typeof window !== 'undefined') { try { loc = window.top.location; } catch (_) {} }
    var params = new URLSearchParams(loc.search || ''), peers = {};
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname || '')) {
      ['physics','biology'].forEach(function(subject){
        var value=params.get(subject==='physics'?'eqPhysics':'eqBiology');if(!value)return;
        try { var peer=new URL(value);if(/^https?:$/.test(peer.protocol)&&peer.hostname===loc.hostname&&!peer.username&&!peer.password&&peer.pathname==='/'&&!peer.search&&!peer.hash)peers[subject]=peer.origin; } catch(_) {}
      });
      if(peers[item.subject])target=new URL(target.pathname+target.search+target.hash,peers[item.subject]);
      Object.keys(peers).forEach(function(subject){target.searchParams.set(subject==='physics'?'eqPhysics':'eqBiology',peers[subject]);});
    }
    if(enabled(loc))target.searchParams.set('excellence','1');
    if(classroomEnabled(loc))target.searchParams.set('classroom','1');
    return target.href;
  }
  function clone(value, limit) {
    var text = JSON.stringify(value);
    if (!text || text.length > (limit || 2000000)) throw new Error('This record is too large. Export or reduce the captured data before saving.');
    return JSON.parse(text, function (key, val) { if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new Error('Unsupported record key.'); return val; });
  }
  function uid() { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'record-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function csvCell(s) { var v = typeof s === 'object' && s !== null ? JSON.stringify(s) : String(s == null ? '' : s); if (/^[\s]*[=+@-]/.test(v) && !/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
  function exportCSV(entries) {
    var rows = [['id','subject','experiment','saved_at','field','value','unit','observations']];
    entries.forEach(function (e) {
      var prefix = [e.id, e.subject, e.title, e.updatedAt], note = e.observations || e.observation || '';
      rows.push(prefix.concat(['configuration', e.config || {}, '', note]));
      var measurements = e.measurements || [];
      if (!Array.isArray(measurements)) measurements = Object.keys(measurements).map(function (key) { return { name: key, value: measurements[key] }; });
      measurements.forEach(function (m, i) { var reading=m&&typeof m==='object'?m:{value:m}; rows.push(prefix.concat([reading.name || reading.label || ('measurement ' + (i + 1)), reading.value === undefined ? reading : reading.value, reading.unit || '', note])); });
      if (e.graph) { var graph = clone(e.graph); if (graph && typeof graph === 'object' && graph.image) { delete graph.image; graph.imageExport = 'Raster capture is included in the JSON backup and printable report.'; } rows.push(prefix.concat(['graph', graph, '', note])); }
      if (e.model) rows.push(prefix.concat(['model', e.model, '', '']));
      if (e.provenance) rows.push(prefix.concat(['provenance', e.provenance, '', '']));
    });
    return '\uFEFF' + rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
  }
  function reportHTML(entries) {
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Entelloq laboratory report</title><style>body{font:16px/1.55 system-ui;max-width:900px;margin:36px auto;padding:0 24px;color:#132638}h1,h2{line-height:1.2}article{border-top:1px solid #bac6cf;padding-top:20px;margin-top:28px;break-inside:avoid}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f5f9;padding:12px}small{color:#456} @media print{body{margin:0}button{display:none}}</style><h1>Entelloq laboratory report</h1><p>Local notebook export. Simulation results are educational model outputs, not physical measurements or clinical findings.</p>' + entries.map(function (e) {
      return '<article><h2>' + esc(e.title || 'Experiment') + '</h2><small>' + esc(e.subject) + ' · ' + (e.updatedAt ? 'Saved ' + esc(e.updatedAt) : 'Unsaved draft export') + '</small><h3>Observations</h3><p>' + esc(e.observations || e.observation || 'No observation recorded.').replace(/\n/g, '<br>') + '</p>' + ['config','measurements','graph','model','provenance'].filter(function (k) { return e[k] != null; }).map(function (k) {
        var heading = '<h3>' + esc({config:'Configuration',measurements:'Measurements',graph:'Graph or viewport evidence',model:'Model and limitations',provenance:'Provenance'}[k]) + '</h3>';
        if (k === 'graph' && e.graph.kind === 'canvas-observation' && /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(e.graph.image || '')) return heading + '<img style="max-width:100%;height:auto" alt="Captured experiment viewport" src="' + e.graph.image + '"><p>' + esc(e.graph.note || 'Actual displayed canvas capture; not raw numerical data.') + '</p>';
        return heading + '<pre>' + esc(JSON.stringify(e[k], null, 2)) + '</pre>';
      }).join('') + '</article>';
    }).join('') + '</html>';
  }
  function createNotebook(storage, key) {
    key = key || 'entelloq.science.notebook.v1';
    var error = null, baseline = null;
    function read() {
      try {
        var raw = storage.getItem(key), data = raw === null ? { version: 1, entries: [] } : JSON.parse(raw);
        if (!data || data.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 200) throw new Error('Notebook format is unreadable. Existing data has been left untouched.');
        data.entries.forEach(function (e) { if (!e || typeof e.id !== 'string' || typeof e.title !== 'string') throw new Error('Notebook contains an unreadable record. Existing data has been left untouched.'); });
        error = null; baseline = raw; return data;
      } catch (e) { error = 'Local notebook unavailable: ' + e.message; return null; }
    }
    function write(data, expectedRaw) {
      try {
        var current = storage.getItem(key);
        if (current !== expectedRaw) return { ok: false, conflict: true, error: 'This notebook changed in another window. Reload its entries before saving.' };
        var raw = JSON.stringify(data); if (raw.length > 4500000) throw new Error('Notebook is full. Export your records before removing older entries.');
        storage.setItem(key, raw);
        if (storage.getItem(key) !== raw) throw new Error('Storage did not confirm the write.');
        baseline = raw; error = null; return { ok: true };
      } catch (e) { error = 'Not saved: ' + e.message; return { ok: false, error: error }; }
    }
    return {
      list: function () { var d = read(); if (!d) return []; try { return clone(d.entries,4500000); } catch(e) { error = 'Local notebook unavailable: ' + e.message; return []; } },
      status: function () { return { available: !error, error: error, mode: 'local-only', cloudSync: false }; },
      save: function (entry, expectedUpdatedAt) {
        var data = read(); if (!data) return { ok: false, error: error };
        var expectedRaw = baseline;
        try {
          var saved = clone(entry); saved.id = saved.id || uid();
          if (typeof saved.id !== 'string' || saved.id.length > 128 || !saved.id.trim()) throw new Error('Record ID must be a nonempty string of up to 128 characters.');
          if (typeof saved.title !== 'string' || !saved.title.trim() || saved.title.length > 300) throw new Error('An experiment title is required (up to 300 characters).');
          if (saved.subject !== 'physics' && saved.subject !== 'biology') throw new Error('Choose Physics or Biology.');
          var index = data.entries.findIndex(function (e) { return e.id === saved.id; }), previous = data.entries[index];
          if (previous && (expectedUpdatedAt === undefined || expectedUpdatedAt !== previous.updatedAt)) return { ok: false, conflict: true, error: 'A saved version already exists. Reload it or save a separate copy.' };
          if (!previous && expectedUpdatedAt != null) return { ok: false, conflict: true, error: 'This record was removed. Save a separate copy to keep your changes.' };
          var now = Math.max(Date.now(), previous ? Date.parse(previous.updatedAt) + 1 : 0);
          saved.createdAt = previous ? previous.createdAt : new Date(now).toISOString(); saved.updatedAt = new Date(now).toISOString();
          saved = clone(saved); // Check the final record, including generated metadata, before persisting it.
          if (previous) data.entries[index] = saved; else { if (data.entries.length >= 200) throw new Error('Notebook contains 200 records. Export before removing older entries.'); data.entries.unshift(saved); }
          var result = write(data, expectedRaw); if (result.ok) result.entry = saved; return result;
        } catch (e) { return { ok: false, error: 'Not saved: ' + e.message }; }
      },
      remove: function (id, expectedUpdatedAt) {
        var data = read(); if (!data) return { ok: false, error: error };
        var expectedRaw = baseline, previous = data.entries.find(function (e) { return e.id === id; });
        if (!previous || expectedUpdatedAt !== previous.updatedAt) return { ok: false, conflict: true, error: 'The record changed. Reload before removing it.' };
        data.entries = data.entries.filter(function (e) { return e.id !== id; }); return write(data, expectedRaw);
      },
      exportCSV: exportCSV,
      reportHTML: reportHTML,
      exportJSON: function (entries) { return JSON.stringify({ format: 'entelloq-notebook', version: 1, exportedAt: new Date().toISOString(), entries: clone(entries,4500000) }, null, 2); }
    };
  }
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }
  return { version: VERSION, enabled: enabled, classroomEnabled: classroomEnabled, resolveSubjectURL: resolveSubjectURL, normalize: normalize, search: search, createNotebook: createNotebook, exportCSV: exportCSV, reportHTML: reportHTML, escapeHTML: esc, download: download, uid: uid };
});
