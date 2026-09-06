const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const main = fs.readFileSync(path.join(__dirname, '../src/lab/main.js'), 'utf8');
const code = main.slice(main.indexOf('function setCase('), main.indexOf('/* ---- specimen lifecycle'));
for (const changed of [false, true]) test(`case selection ${changed ? 'replaces a used' : 'retains an untouched'} specimen before applying geometry`, () => {
  const calls = [];
  const context = { specimenId: 'frog', cutting: { count: changed ? 1 : 0 }, soft: null,
    dissection: { state: { pinned: new Set(), incisions: new Map(), removed: new Set() } },
    pathology: { apply: () => calls.push('old apply'), clear() {}, vignette() {} },
    captureCutRest: () => calls.push('capture'), shell: { say() {} },
    loadSpecimen(id) { calls.push('fresh ' + id); context.pathology = { apply: () => calls.push('fresh apply'), vignette() {} }; } };
  vm.createContext(context); vm.runInContext(code, context); context.setCase('example');
  assert.deepEqual(calls, changed ? ['fresh frog', 'fresh apply', 'capture'] : ['old apply', 'capture']);
});
