/* Execute production focus and practice handlers with scoped DOM/storage doubles.
 * A native focus() call permits browser scrolling; real viewport visibility,
 * native Tab order and focus styling belong to the companion browser checks. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/library/practice-bridge.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function productionFunction(name, next) {
  const start = source.indexOf('  function ' + name + '(');
  const end = source.indexOf('  function ' + next + '(', start);
  assert.ok(start >= 0 && end > start, 'Extract production ' + name + ', never a copied implementation');
  return source.slice(start, end);
}
function productionLine(prefix) {
  const line = source.split('\n').find(line => line.trimStart().startsWith(prefix));
  assert.ok(line, 'Use the production ' + prefix + ' declaration');
  return line;
}
const focusCode = productionFunction('focusCurrent', 'mountDepth');
const selectorCode = productionLine('const $ =');

test('focusCurrent queries only its practice host and permits native focus scrolling', () => {
  for (const selector of ['#tpQuestion', '.tp-feedback', '.tp-step-status', '#tpDraft', '.tp-heading h1']) {
    const calls = [], target = {focus(...args) { calls.push({type:'focus', args:plain(args)}); }};
    const host = {querySelector(value) { calls.push({type:'query', value}); return target; }};
    const forbidden = () => assert.fail('The helper must not reach outside the practice host or alter saved data');
    const context = vm.createContext({host, document:{querySelector:forbidden}, localStorage:{getItem:forbidden,setItem:forbidden}});
    vm.runInContext(selectorCode + '\n' + focusCode + '\nglobalThis.invoke = focusCurrent;', context);
    context.invoke(selector);
    assert.deepEqual(calls, [{type:'query', value:selector}, {type:'focus', args:[]}],
      'Do not use preventScroll:true after replacing a long practice view');
  }
});

test('focusCurrent safely ignores an absent target without document fallback', () => {
  const queries = [], context = vm.createContext({
    host:{querySelector(selector) { queries.push(selector); return null; }},
    document:{querySelector() { assert.fail('Missing host target must not focus another page region'); }}
  });
  vm.runInContext(selectorCode + '\n' + focusCode + '\nglobalThis.invoke = focusCurrent;', context);
  assert.doesNotThrow(() => context.invoke('.missing-target', '.tp-feedback > strong'));
  assert.deepEqual(queries, ['.missing-target']);
});

test('focusCurrent centers an optional host-scoped verdict instantly without moving status focus', () => {
  const calls = [], document = {activeElement:null, querySelector() { assert.fail('No document-wide anchor lookup'); }};
  const target = {focus(...args) { document.activeElement = target; calls.push({type:'focus',args:plain(args)}); }};
  const anchor = {
    focus() { assert.fail('The readable verdict must not steal focus from its status region'); },
    scrollIntoView(options) { calls.push({type:'scroll',options:plain(options)}); }
  };
  const context = vm.createContext({document, host:{querySelector(selector) {
    calls.push({type:'query',selector});
    return selector === '.tp-feedback' ? target : selector === '.tp-feedback > strong' ? anchor : null;
  }}});
  vm.runInContext(selectorCode + '\n' + focusCode + '\nglobalThis.invoke = focusCurrent;', context);
  context.invoke('.tp-feedback', '.tp-feedback > strong');
  assert.equal(document.activeElement,target, 'Status-region focus remains after anchoring its short verdict');
  assert.deepEqual(calls,[
    {type:'query',selector:'.tp-feedback'}, {type:'focus',args:[]},
    {type:'query',selector:'.tp-feedback > strong'},
    {type:'scroll',options:{block:'center',inline:'nearest',behavior:'instant'}}
  ], 'Keep the tall-card verdict clear without animation or suppressing native focus scrolling');
});

test('a missing optional verdict anchor does not prevent or replace target focus', () => {
  const calls = [], target = {focus(...args) { calls.push({type:'focus',args:plain(args)}); }};
  const context = vm.createContext({host:{querySelector(selector) {
    calls.push({type:'query',selector}); return selector === '.tp-feedback' ? target : null;
  }}, document:{querySelector() { assert.fail('Missing anchor must not search another page region'); }}});
  vm.runInContext(selectorCode + '\n' + focusCode + '\nglobalThis.invoke = focusCurrent;', context);
  assert.doesNotThrow(() => context.invoke('.tp-feedback', '.missing-anchor'));
  assert.deepEqual(calls,[
    {type:'query',selector:'.tp-feedback'}, {type:'focus',args:[]}, {type:'query',selector:'.missing-anchor'}
  ]);
});

function setup(section) {
  const prefix = 'bioq.topic-practice.v1.', focusCalls = [], scrollCalls = [], writes = [], published = [];
  const records = new Map([
    ['bioq.depth-study.v1.synthetic-topic', 'private evidence draft'],
    ['bioq_lessons_v1', 'private lesson journal'],
    ['bioq.solve.bank', 'original solve state'],
    [prefix + 'unrelated-topic', 'unrelated practice record']
  ]);
  const unrelated = new Map(records), outside = {name:'outside-practice'}, body = {name:'BODY',classList:{toggle() {}}};
  const document = {activeElement:outside, body, getElementById() { return null; },
    querySelector() { assert.fail('Practice focus must remain host-scoped'); }};
  let elements = new Map(), dots = [], html = '';
  function element(selector, tag) {
    return {selector, disabled:/\sdisabled(?:\s|>)/.test(tag), dataset:{}, listeners:{},
      addEventListener(type, callback) { this.listeners[type] = callback; },
      focus(...args) {
        assert.ok(/tabindex="-1"|^<(?:textarea|input|button)\b/.test(tag), selector + ' must be a real focus target');
        document.activeElement = this;
        focusCalls.push({selector, args:plain(args)});
      },
      scrollIntoView(options) { scrollCalls.push({selector,options:plain(options)}); }
    };
  }
  const selectors = {
    '.tp-heading h1': /<h1\b[^>]*>/,
    '#tpQuestion': /<h2\b[^>]*id="tpQuestion"[^>]*>/,
    '#tpDraft': /<textarea\b[^>]*id="tpDraft"[^>]*>/,
    '#tpReflection': /<textarea\b[^>]*id="tpReflection"[^>]*>/,
    '.tp-answer-form': /<form\b[^>]*class="tp-answer-form"[^>]*>/,
    '.tp-feedback': /<div\b[^>]*class="tp-feedback"[^>]*>/,
    '.tp-feedback > strong': /<div\b[^>]*class="tp-feedback"[^>]*>\s*<strong\b[^>]*>/,
    '.tp-step-status': /<div\b[^>]*class="tp-step-status"[^>]*>/,
    '.tp-save': /<span\b[^>]*class="tp-save"[^>]*>/,
    '.tp-footer': /<footer\b[^>]*class="tp-footer"[^>]*>/
  };
  for (const name of ['submit','retry','next','reveal','revisit']) {
    selectors['.tp-' + name] = new RegExp('<button\\b[^>]*class="[^"]*\\btp-' + name + '\\b[^"]*"[^>]*>');
  }
  const host = {hidden:true,
    set innerHTML(value) {
      if ([...elements.values(), ...dots].includes(document.activeElement)) document.activeElement = body;
      html = value; elements = new Map(); dots = [];
      for (const [selector, pattern] of Object.entries(selectors)) {
        const tag = value.match(pattern)?.[0];
        if (tag) elements.set(selector, element(selector, tag));
      }
      for (const match of value.matchAll(/<button\b[^>]*data-question="(\d+)"[^>]*>/g)) {
        const button = element('[data-question="' + match[1] + '"]', match[0]);
        button.dataset.question = match[1]; dots.push(button);
      }
    },
    get innerHTML() { return html; },
    querySelector(selector) { return elements.get(selector) || null; },
    querySelectorAll(selector) { assert.equal(selector, '[data-question]'); return dots; }
  };
  const topic = {id:'synthetic-topic', title:'Synthetic topic', quickCheck:[
    {question:'First question?',options:['Correct','Alternative'],answer:0,explanation:'First causal explanation.'},
    {question:'Second question?',options:['Alternative','Correct'],answer:1,explanation:'Second causal explanation.'}
  ]};
  const example = {question:'What causes this result?',steps:['First mechanism','Second mechanism'],answer:'A connected explanation.'};
  const route = {topic,mode:'visual'}, original = {hidden:false}, catalog = {hidden:false};
  const context = vm.createContext({host, original, catalog, section, document, location:{hash:'#learn/synthetic-topic/visual'},
    global:{}, active:null, state:{}, saved:true,
    localStorage:{getItem:key => records.get(key) ?? null, setItem(key,value) { writes.push({key,value}); records.set(key,value); }},
    parseRoute:hash => hash === '#learn/synthetic-topic/visual' ? route : null,
    questionsFor:() => topic.quickCheck, enrichment:() => ({workedExample:example}),
    publish:next => published.push({id:next.topic.id,mode:next.mode}),
    renderCatalog() {}, enhanceReasonVisuals() {}
  });
  const code = [productionLine('const PREFIX ='), productionLine('const modes ='), productionLine('const memory ='),
    productionLine('const esc ='), selectorCode,
    productionFunction('href','questionsFor'), productionFunction('get','put'), productionFunction('put','validateAnswers'),
    productionFunction('validateAnswers','publish').split('  global.BioPractice =')[0],
    productionFunction('save','nav'), productionFunction('nav','header'), productionFunction('header','footer'),
    productionFunction('footer','focusCurrent'), focusCode, productionFunction('mountDepth','renderSolve'),
    productionFunction('renderSolve','validExample'), productionFunction('validExample','renderReason'),
    productionFunction('renderReason','renderUnavailable'), productionFunction('renderUnavailable','enhanceReasonVisuals'),
    productionFunction('route','boot'),
    'globalThis.invokeRoute = route; globalThis.invokeSolve = renderSolve; globalThis.invokeReason = renderReason;'
  ].join('\n');
  vm.runInContext(code, context);
  return {context, host, topic, route, records, unrelated, focusCalls, scrollCalls, writes, published, outside, document, original, catalog,
    clearFocus() { focusCalls.length = 0; scrollCalls.length = 0; },
    element:selector => elements.get(selector), dot:index => dots[index],
    invoke(event) { context.invokeRoute(event); },
    fire(selector,type,event = {}) {
      const target = elements.get(selector);
      assert.ok(target, selector + ' is present in the actual rendered markup');
      assert.equal(typeof target.listeners[type], 'function', selector + ' has the production handler');
      target.listeners[type](event);
    },
    assertPrivateRecords() {
      for (const [key,value] of unrelated) assert.equal(records.get(key),value,key);
      assert.ok(writes.every(write => [prefix + 'latest',prefix + section + '.' + topic.id].includes(write.key)),
        'Only the existing practice-specific keys may be written');
    }
  };
}
function onlyFocus(state, selector, anchor) {
  assert.deepEqual(state.focusCalls, [{selector,args:[]}]);
  assert.deepEqual(state.scrollCalls,anchor ? [{selector:anchor,options:{block:'center',inline:'nearest',behavior:'instant'}}] : [],
    'Only checked feedback needs the optional short-verdict anchor');
  assert.equal(state.document.activeElement,state.element(selector));
  state.assertPrivateRecords();
}

test('initial Solve and Reason routes render saved controls without moving focus', () => {
  for (const section of ['solve','reason']) {
    const state = setup(section);
    const question = state.topic.quickCheck[0];
    const savedState = section === 'solve' ? {index:0,answers:[{
      question:question.question,signature:JSON.stringify(question.options)+':'+question.answer,choice:0,checked:true
    }]} : {draft:'Saved prediction',reflection:'Saved reflection',revealed:2};
    state.records.set('bioq.topic-practice.v1.' + section + '.synthetic-topic',JSON.stringify(savedState));
    state.invoke();
    assert.deepEqual(state.focusCalls,[]);
    assert.deepEqual(state.scrollCalls,[], 'Initial routes do not scroll a practice verdict either');
    assert.equal(state.document.activeElement,state.outside);
    assert.equal(state.host.hidden,false);
    assert.equal(state.original.hidden,true);
    assert.equal(state.catalog.hidden,true);
    assert.ok(state.element(section === 'solve' ? '.tp-feedback' : '.tp-revisit'), 'Saved review controls are actually restored');
    if (section === 'reason') assert.equal(state.context.state.draft,'Saved prediction');
    assert.deepEqual(state.published,[{id:'synthetic-topic',mode:'visual'}]);
    state.assertPrivateRecords();
  }
});

test('explicit hash navigation focuses the practice heading without adding a scroll override', () => {
  for (const section of ['solve','reason']) {
    const state = setup(section);
    state.invoke({type:'hashchange'});
    onlyFocus(state,'.tp-heading h1');
  }
});

test('invalid and non-hash routes never focus an unrelated heading', () => {
  for (const section of ['solve','reason']) {
    const state = setup(section);
    state.invoke({type:'DOMContentLoaded'});
    assert.deepEqual(state.focusCalls,[]);
    assert.deepEqual(state.scrollCalls,[]);
    state.context.location.hash = '#not-a-practice-topic';
    state.invoke({type:'hashchange'});
    assert.deepEqual(state.focusCalls,[]);
    assert.deepEqual(state.scrollCalls,[]);
    assert.equal(state.host.hidden,true);
    assert.equal(state.original.hidden,false);
    assert.equal(state.catalog.hidden,false);
    state.assertPrivateRecords();
  }
});

test('Solve submit focuses feedback; retry and next focus their new question while preserving answers', () => {
  const state = setup('solve'); state.invoke();
  state.fire('.tp-answer-form','submit',{preventDefault(){}});
  assert.deepEqual(state.focusCalls,[], 'Submitting without a choice does not jump or grade');
  state.fire('.tp-answer-form','change',{target:{matches:() => true,value:'0'}});
  assert.deepEqual(state.focusCalls,[], 'Changing a choice does not move focus');
  state.fire('.tp-answer-form','submit',{preventDefault(){}});
  onlyFocus(state,'.tp-feedback','.tp-feedback > strong');
  assert.equal(state.context.state.answers[0].checked,true);
  state.clearFocus();
  state.fire('.tp-answer-form','submit',{preventDefault(){}});
  assert.deepEqual(state.focusCalls,[], 'Re-submitting an already checked question has no effect');
  state.fire('.tp-next','click');
  onlyFocus(state,'#tpQuestion');
  assert.equal(state.context.state.index,1);
  assert.equal(state.context.state.answers[0].checked,true, 'Advancing retains the first checked answer');
  state.clearFocus();
  state.fire('.tp-answer-form','change',{target:{matches:() => true,value:'1'}});
  state.fire('.tp-answer-form','submit',{preventDefault(){}});
  onlyFocus(state,'.tp-feedback','.tp-feedback > strong');
  state.clearFocus();
  state.dot(0).listeners.click();
  onlyFocus(state,'#tpQuestion');
  state.clearFocus();
  state.fire('.tp-retry','click');
  onlyFocus(state,'#tpQuestion');
  assert.equal(state.context.state.answers[0],null, 'Retry clears only the selected answer');
  assert.equal(state.context.state.answers[1].checked,true, 'The other checked answer survives retry');
});

test('Reason reveal and hide actions focus their destinations without clearing private writing', () => {
  const state = setup('reason'); state.invoke();
  state.fire('.tp-reveal','click');
  assert.deepEqual(state.focusCalls,[], 'An empty prediction cannot reveal the worked example');
  state.fire('#tpDraft','input',{target:{value:'My private prediction'}});
  assert.deepEqual(state.focusCalls,[], 'Typing a draft never moves focus');
  state.fire('.tp-reveal','click');
  onlyFocus(state,'.tp-step-status');
  assert.equal(state.context.state.revealed,1);
  state.clearFocus();
  state.fire('.tp-reveal','click');
  onlyFocus(state,'.tp-step-status');
  assert.equal(state.context.state.revealed,2);
  state.fire('#tpReflection','input',{target:{value:'My private reflection'}});
  state.clearFocus();
  state.fire('.tp-revisit','click');
  onlyFocus(state,'#tpDraft');
  assert.equal(state.context.state.revealed,0);
  assert.equal(state.context.state.draft,'My private prediction');
  assert.equal(state.context.state.reflection,'My private reflection');
});
