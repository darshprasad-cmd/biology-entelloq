/* Execute the production answer() body with narrow DOM/storage test doubles.
 * This verifies focus intent and state transitions; the browser helper verifies
 * actual focus, native Tab order, focus-visible styling and viewport behavior. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/library/learn.js'), 'utf8');
const start = source.indexOf('  function answer('), end = source.indexOf('  let lastTopic', start);
assert.ok(start >= 0 && end > start, 'Use the production answer function, never a copied implementation');
const answerCode = source.slice(start, end);
const escapeCode = source.split('\n').find(line => line.startsWith('  const esc ='));
assert.ok(escapeCode, 'Use the production escaping helper');

function setup() {
  const body = {name:'BODY'}, document = {activeElement:null};
  const entry = {checked:{}}, persisted = [], focusCalls = [];
  function element(name) {
    return {name, dataset:{}, listeners:{},
      addEventListener(type, callback) { this.listeners[type] = callback; },
      focus(options) { document.activeElement = this; focusCalls.push({name:this.name, options}); }
    };
  }
  const options = [element('option-0'), element('option-1'), element('option-2')];
  options.forEach((option, index) => {
    option.dataset.answer = String(index);
    let disabled = false;
    Object.defineProperty(option, 'disabled', {get:() => disabled, set:value => {
      disabled = value;
      if (value && document.activeElement === option) document.activeElement = body;
    }});
  });
  const retry = element('retry');
  const feedback = {hidden:true, html:'', paragraph:null,
    set innerHTML(value) {
      this.html = value;
      // Do not manufacture a focus target when the real markup lacks one.
      this.paragraph = /<p\b[^>]*class="bl-answer-explanation"[^>]*tabindex="-1"/.test(value) ? element('explanation') : null;
    },
    get innerHTML() { return this.html; },
    querySelector(selector) {
      if (selector === 'button') return retry;
      if (selector === '.bl-answer-explanation') return this.paragraph;
      throw new Error('Unmodeled feedback selector: ' + selector);
    }
  };
  const root = {
    querySelectorAll(selector) { assert.equal(selector, '[data-check="0"]'); return options; },
    querySelector(selector) {
      if (selector === '[data-feedback="0"]') return feedback;
      if (selector === '[data-check="0"]') return options[0];
      throw new Error('Unmodeled root selector: ' + selector);
    }
  };
  const topic = {id:'synthetic-test', quickCheck:[{options:['First','Correct','Third'], answer:1, explanation:'A meaningful causal explanation, including <unsafe> markup.'}]};
  const context = vm.createContext({root, document, entryFor:id => {
    assert.equal(id, topic.id); return entry;
  }, persist:() => persisted.push(JSON.parse(JSON.stringify(entry)))});
  vm.runInContext(escapeCode + '\n' + answerCode + '\nglobalThis.invokeAnswer = answer;', context);
  return {invoke:(chosen, save = true, index = 0) => context.invokeAnswer(topic, index, chosen, save), body, document, options,
    feedback, retry, entry, persisted, focusCalls};
}

test('new keyboard answers focus their explanation after disabling the active option', () => {
  for (const chosen of [0, 1]) {
    const state = setup();
    state.document.activeElement = state.options[chosen];
    state.invoke(chosen);
    assert.equal(state.feedback.hidden, false);
    assert.ok(state.options.every(option => option.disabled));
    assert.equal(state.document.activeElement, state.feedback.paragraph);
    assert.notEqual(state.document.activeElement, state.body);
    assert.deepEqual(state.focusCalls, [{name:'explanation', options:undefined}], 'Native focus may scroll; do not prevent scrolling to feedback');
    assert.equal(state.entry.checked[0], chosen);
    assert.equal(state.persisted.length, 1);
    assert.equal(state.options[1].dataset.result, 'correct');
    assert.equal(state.options[0].dataset.result, chosen === 0 ? 'incorrect' : '');
    assert.match(state.feedback.innerHTML, /&lt;unsafe&gt;/);
    assert.doesNotMatch(state.feedback.innerHTML, /<unsafe>/);
  }
});

test('restoring a saved answer renders feedback without moving focus or rewriting progress', () => {
  const state = setup(), navigationControl = {name:'existing-navigation-focus'};
  state.document.activeElement = navigationControl;
  state.entry.checked[0] = 1;
  state.invoke(1, false);
  assert.equal(state.feedback.hidden, false);
  assert.ok(state.feedback.paragraph, 'Restored feedback remains keyboard-addressable');
  assert.equal(state.document.activeElement, navigationControl);
  assert.deepEqual(state.focusCalls, []);
  assert.deepEqual(state.persisted, []);
  assert.equal(state.entry.checked[0], 1);
});

test('retry removes only this saved answer and restores enabled options and first-option focus', () => {
  const state = setup();
  state.entry.checked[7] = 2;
  state.invoke(0);
  state.retry.listeners.click();
  assert.equal(state.feedback.hidden, true);
  assert.equal(state.entry.checked[0], undefined);
  assert.equal(state.entry.checked[7], 2, 'Unrelated saved checks survive');
  assert.ok(state.options.every(option => !option.disabled && option.dataset.result === ''));
  assert.equal(state.document.activeElement, state.options[0]);
  assert.equal(state.persisted.length, 2);
  assert.deepEqual(state.persisted[1], {checked:{7:2}});
});

test('invalid answer indices cannot change feedback, focus or saved progress', () => {
  for (const [chosen, index] of [[-1,0], [1.5,0], [3,0], [1,4]]) {
    const state = setup(), navigationControl = {name:'navigation'};
    state.document.activeElement = navigationControl;
    state.invoke(chosen, true, index);
    assert.equal(state.feedback.hidden, true);
    assert.equal(state.document.activeElement, navigationControl);
    assert.deepEqual(state.persisted, []);
    assert.deepEqual(state.focusCalls, []);
    assert.ok(state.options.every(option => !option.disabled));
  }
});
