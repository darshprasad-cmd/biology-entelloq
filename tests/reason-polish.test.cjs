const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/_reason.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../src/_reason.css"), "utf8");
const data = source.slice(source.indexOf("  const STEPS ="), source.indexOf("  const app ="));
const catalog = source.slice(source.indexOf("  const WORKOUT_DETAILS ="), source.indexOf("  function route()"));
const context = vm.createContext({});
vm.runInContext(`${data}\n${catalog}\nglobalThis.workouts = PROBLEMS; globalThis.stages = STEPS; globalThis.details = WORKOUT_DETAILS; globalThis.searchWorkouts = filterProblems;`, context);
const ids = (query, domain = "all") => Array.from(context.searchWorkouts(query, domain), (p) => p.id);

test("catalog retains all three scenarios and the seven-stage learning sequence", () => {
  assert.deepEqual(ids(""), ["altitude", "resistance", "glucose"]);
  assert.deepEqual(Array.from(context.stages), ["Observe", "Principles", "What's regulated", "Form & function", "Strategy", "Reason", "Generalise"]);
  for (const problem of context.workouts) {
    assert.equal(problem.principles.options.filter((option) => option.ok).length, 3);
    assert.equal(problem.regulated.a, 1);
    assert.equal(problem.form.a, 1);
    assert.equal(problem.strategy.o.findIndex((option) => option.ok), 0);
    assert.equal(problem.reason.length, 6);
    assert.equal(context.details[problem.id].skills.length, 2);
  }
});

test("search supports words in titles, prompts and outcome or skill labels", () => {
  assert.deepEqual(ids("GLUCOSE"), ["glucose"]);
  assert.deepEqual(ids("  kidney   response  "), ["altitude"]);
  assert.deepEqual(ids("generations"), ["resistance"]);
  assert.deepEqual(ids("opposing"), ["glucose"]);
});

test("domain and text filters combine, with predictable empty and reset results", () => {
  assert.deepEqual(ids("", "Human Physiology"), ["altitude", "glucose"]);
  assert.deepEqual(ids("glucose", "Evolution"), []);
  assert.deepEqual(ids("does-not-exist"), []);
  assert.deepEqual(ids('<img src=x onerror="alert(1)">'), []);
  assert.equal(ids("", "all").length, 3);
});

test("a consumed Continue button cannot advance again or skip a stage", () => {
  const advanceSource = source.slice(source.indexOf("    function advance(event)"), source.indexOf("    function render()"));
  let renders = 0;
  let focused = 0;
  let scrolls = 0;
  const scope = vm.createContext({
    step: 0,
    STEPS: context.stages,
    render() { renders++; },
    host: { lastElementChild: { scrollIntoView() { scrolls++; } } },
    $() { return { focus() { focused++; } }; },
  });
  vm.runInContext(`${advanceSource}\nglobalThis.advanceStage = advance;`, scope);
  const button = { disabled: false };
  scope.advanceStage({ currentTarget: button });
  assert.equal(scope.step, 1);
  assert.equal(button.disabled, true);
  scope.advanceStage({ currentTarget: button });
  assert.equal(scope.step, 1);
  assert.equal(renders, 1);
  assert.equal(focused, 1);
  assert.equal(scrolls, 1);
  scope.step = 6;
  scope.advanceStage({ currentTarget: { disabled: false } });
  assert.equal(scope.step, 6);
  assert.equal(renders, 1);
});

test("controls expose selection, answer labels and an honest next step", () => {
  assert.match(source, /aria-pressed="false"/);
  assert.match(source, /setAttribute\("aria-pressed", String\(sel.has\(i\)\)\)/);
  assert.match(source, /setAttribute\("aria-current", "step"\)/);
  assert.match(source, /Correct answer/);
  assert.match(source, /selected \$\{distractors\} distractor/);
  assert.match(source, /Stages reviewed are not a measure of mastery/);
  assert.match(source, /href="\.\/solve\.html"/);
  assert.doesNotMatch(source, /localStorage\.(setItem|removeItem|clear)/);
  assert.match(source, /count\.textContent =/);
  assert.match(source, /function resetFilters\(\).*search\.focus\(\)/);
});

test("workout transitions are immediate and reduced motion remains covered", () => {
  assert.match(source, /behavior: "instant"/);
  assert.doesNotMatch(source, /behavior: "smooth"/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.rz-step\.in\{animation:none\}/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height:44px/);
});
