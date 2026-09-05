const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const solve = read("solve.html");
const me = read("me.html");
const fragmentSource = solve.slice(solve.indexOf("const TOPIC_FRAGMENTS="), solve.indexOf("function syncConfigRadios()"));

test("all supported Solve fragments select real topics without changing other settings", () => {
  const cfg = { topic: "Mixed", board: "AP", diff: 3, mode: "timed", count: 12 };
  const scope = vm.createContext({ CFG: cfg });
  vm.runInContext(`${fragmentSource}\nglobalThis.apply = applyTopicFragment;`, scope);
  const expected = { cell: "Cell Biology", genetics: "Genetics & DNA", physiology: "Human Physiology", evolution: "Evolution", ecology: "Ecology", microbio: "Microbiology" };
  for (const [slug, topic] of Object.entries(expected)) {
    assert.equal(scope.apply("#" + slug), true);
    assert.deepEqual(cfg, { topic, board: "AP", diff: 3, mode: "timed", count: 12 });
  }
  assert.equal(scope.apply("#%63ELL"), true);
  assert.equal(cfg.topic, "Cell Biology");
  for (const invalid of ["#constructor", "#toString", "#molecular", "#neuro", "#%broken", "", "#svMain"]) {
    assert.equal(scope.apply(invalid), false);
    assert.equal(cfg.topic, "Cell Biology");
  }
  assert.match(solve, /function init\(\)\{wireGlobal\(\);applyTopicFragment\(location.hash\);renderStart\(\);\}/);
  assert.match(solve, /addEventListener\("hashchange",\(\)=>\{\s*if\(!applyTopicFragment\(location.hash\)\)return;/);
});

test("one radio per configuration group is in the tab order", () => {
  const syncSource = solve.slice(solve.indexOf("function syncConfigRadios()"), solve.indexOf("function historyStats()"));
  const groups = [0, 1, 2, 3, 4].map((group) => Array.from({ length: group + 2 }, (_, index) => ({
    getAttribute() { return String(index === group); },
    tabIndex: 0,
  })));
  const root = {};
  const scope = vm.createContext({ root, $$(selector, node) { return node === root ? groups : node; } });
  vm.runInContext(`${syncSource}\nsyncConfigRadios();`, scope);
  groups.forEach((group, index) => {
    assert.equal(group.filter((option) => option.tabIndex === 0).length, 1);
    assert.equal(group[index].tabIndex, 0);
  });
});

test("radio arrow and Home/End keys wrap within their group and activate the normal click path", () => {
  const keyboardSource = solve.slice(solve.indexOf('  root.addEventListener("keydown",e=>{'), solve.indexOf('  addEventListener("hashchange",()=>{'));
  let handler;
  let selected = 1;
  let focused = null;
  const group = {};
  const options = [0, 1, 2].map((index) => ({
    closest() { return group; },
    focus() { focused = index; },
    click() { selected = index; },
  }));
  const scope = vm.createContext({
    root: { addEventListener(type, fn) { assert.equal(type, "keydown"); handler = fn; }, contains() { return true; } },
    $$(selector, node) { assert.equal(node, group); return options; },
  });
  vm.runInContext(keyboardSource, scope);
  function press(key, expected, prevented = true) {
    let didPrevent = false;
    handler({ key, target: { closest() { return options[selected]; } }, preventDefault() { didPrevent = true; } });
    assert.equal(selected, expected, key);
    assert.equal(didPrevent, prevented, key);
    if (prevented) assert.equal(focused, expected, key);
  }
  press("ArrowRight", 2);
  press("ArrowDown", 0);
  press("ArrowLeft", 2);
  press("ArrowUp", 1);
  press("Home", 0);
  press("End", 2);
  press("Tab", 2, false);
  press("Enter", 2, false);
  handler({ key: "ArrowLeft", altKey: true, preventDefault() { assert.fail("Do not intercept browser navigation shortcuts"); } });
  assert.equal(selected, 2);
  assert.match(solve, /o\.setAttribute\("aria-checked",on\);o\.tabIndex=on\?0:-1/);
});

test("hash navigation does not replace an active session view or write its records", () => {
  const hashSource = solve.slice(solve.indexOf('  addEventListener("hashchange",()=>{'), solve.indexOf('  document.addEventListener("click",e=>{', solve.indexOf("function wireGlobal()")));
  let handler;
  let renders = 0;
  let notice = "";
  let configVisible = false;
  const cfg = { topic: "Mixed", board: "NEET", diff: 2, mode: "practice", count: 8 };
  const scope = vm.createContext({
    CFG: cfg, root: {}, location: { hash: "#genetics" },
    addEventListener(type, fn) { assert.equal(type, "hashchange"); handler = fn; },
    $() { return configVisible ? {} : null; },
    renderStart() { renders++; },
    toast(message) { notice = message; },
  });
  vm.runInContext(fragmentSource + hashSource, scope);
  handler();
  assert.equal(cfg.topic, "Genetics & DNA");
  assert.equal(renders, 0);
  assert.match(notice, /current view is unchanged/);
  configVisible = true;
  scope.location.hash = "#ecology";
  handler();
  assert.equal(renders, 1);
  assert.equal(cfg.topic, "Ecology");
});

test("Molecular Biology and Neuroscience recommendations open actual lessons with accurate labels", () => {
  const pageScript = me.match(/<script id="page-js">([\s\S]*?)<\/script>/)[1];
  const functionSource = pageScript.slice(pageScript.indexOf('"use strict";'), pageScript.indexOf('const toggle=$("#previewToggle")'));
  const scope = vm.createContext({});
  vm.runInContext(`${functionSource}\nglobalThis.recommend = buildRecs;`, scope);
  const lessons = read("src/_lessons.js");
  for (const [topic, lesson, title] of [["molecular", "enzyme", "Enzyme Action"], ["neuro", "actionpotential", "The Action Potential"]]) {
    assert.match(lessons, new RegExp(`id: "${lesson}"`));
    assert.ok(lessons.includes(`title: "${title}"`));
    for (const marks of [2, 9]) {
      const recs = scope.recommend({ history: [{ topic, marks, max: 10 }], mistakes: [], weak: [], seen: {} });
      const rec = recs.find((item) => item.href === `./lessons.html#${lesson}`);
      assert.ok(rec, `${topic}, ${marks}/10`);
      assert.equal(rec.cta, "Open " + title);
      assert.ok(!recs.some((item) => item.href === `./solve.html#${topic}`));
    }
  }
});
