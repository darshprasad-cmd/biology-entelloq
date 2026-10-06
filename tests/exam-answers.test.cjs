const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const ctx = vm.createContext({window:{}});
for (const name of ['topics.js','learning-cards.js','exam-solve-data.js','exam-reason-data.js','exam-topic-rationales.js','exam-answers.js']) vm.runInContext(read('src/library/'+name),ctx,{filename:name});
const api = ctx.window.BioExamAnswers;
const solve = read('solve.html');
vm.runInContext(solve.slice(solve.indexOf('const QBANK='),solve.indexOf('const GEN_TEMPLATES='))+';globalThis.bank=QBANK;',ctx);
const workouts = read('src/_reason.js');
vm.runInContext(workouts.slice(workouts.indexOf('  const STEPS ='),workouts.indexOf('  const app ='))+';globalThis.workouts=PROBLEMS;',ctx);
const bank = ctx.bank;
const choiceQuestions = bank.flatMap(q => q.type === 'case' ? q.subs.map((sub,i) => ({...sub,id:q.id+'.'+i,type:'mcq'})) : [q]).filter(q => ['mcq','ar','exp'].includes(q.type));

test('every existing bank question has an authored worked solution, including each case part', () => {
  for (const q of bank) {
    const html = api.solve(q);
    assert.match(html,/bioq-exam-answer/,q.id);
    assert.match(html,/be-explanation/,q.id);
    assert.doesNotMatch(html,/undefined|\[object Object\]/,q.id);
    if (q.type === 'case') assert.equal((html.match(/class="be-direct"/g)||[]).length,q.subs.length);
    else assert.ok(ctx.window.BIO_EXAM_SOLVE[q.id],q.id);
  }
  for (const q of choiceQuestions) {
    const details = ctx.window.BIO_EXAM_SOLVE[q.id];
    assert.equal(details.reasons.length,q.type === 'ar' ? 4 : q.options.length,q.id);
    assert.equal(new Set(details.reasons).size,details.reasons.length,q.id+' has individual explanations');
    assert.ok(details.paragraphs.length >= 2,q.id+' explains the mechanism as well as the answer');
    assert.match(api.solve(q),/Check each option/,q.id);
  }
});

test('generated explanations follow shuffled option identity, not fixed option positions', () => {
  vm.runInContext('function shuffle(a){return a.slice().reverse();}\n'+solve.slice(solve.indexOf('const GEN_TEMPLATES='),solve.indexOf('function generateQuestion('))+';globalThis.templates=GEN_TEMPLATES;',ctx);
  const facts = ctx.window.BIO_EXAM_GENERATED;
  for (const name of Object.keys(facts)) {
    const choices = [name,...Object.keys(facts).filter(x=>x!==name).slice(0,3)];
    for (const options of [choices,choices.slice().reverse()]) {
      const q = {id:'generated-test',generated:true,type:'mcq',options,answer:options.indexOf(name),explain:'Old short fallback'};
      const html = api.solve(q);
      assert.match(html,/Check each option/);
      assert.ok(html.includes(facts[name].paragraphs[0]));
      assert.ok(html.includes('Correct answer · '+String.fromCharCode(65+q.answer)));
      assert.doesNotMatch(html,/Old short fallback/);
    }
  }
  for (const template of ctx.templates) {
    const q = template.make();
    assert.ok(q.options.every(option=>facts[option]),template.topic);
    assert.ok(facts[q.options[q.answer]],template.topic);
  }
});

test('specific exam mechanisms and important qualifications survive presentation', () => {
  const render = id => api.solve(bank.find(q=>q.id===id));
  assert.match(render('gen4'),/9\/16/);
  assert.match(render('gen4'),/complete dominance.*no epistasis/);
  assert.match(render('gen4'),/Dihybrid Punnett square/);
  assert.match(render('gen4'),/scope="col"/);
  assert.match(render('phy5'),/does not establish that CO₂ alone/);
  assert.match(render('pla5'),/28 to 29/);
  assert.match(render('pla5'),/does not identify the exact limiting factor/);
  assert.match(render('eco2'),/not a universal physical constant/);
  assert.match(render('bio3'),/targeted cut from a precisely specified edit/);
  assert.match(render('mic1'),/not universal/);
  assert.match(render('gen5'),/heterozygote survival advantage/);
});

test('all three guided workouts explain principles, MCQ alternatives and the complete feedback mechanism', () => {
  for (const p of ctx.workouts) {
    const data = ctx.window.BIO_EXAM_WORKOUTS[p.id];
    assert.equal(data.principles.reasons.length,p.principles.options.length);
    assert.match(api.workout(p.id,'principles',p.principles),/Reasoning trap/);
    for (const stage of ['regulated','form','strategy']) {
      assert.equal(data[stage].reasons.length,p[stage].o.length);
      const html = api.workout(p.id,stage,p[stage]);
      assert.match(html,/Check each option/);
      assert.match(html,/be-direct/);
    }
    const model = api.workout(p.id,'reason');
    assert.match(model,/Model exam answer/);
    assert.match(model,/be-diagram/);
    assert.match(model,/Precision matters/);
  }
  assert.match(api.workout('altitude','reason'),/total red-cell mass/);
  assert.match(api.workout('glucose','reason'),/GLUT2 rather than insulin-regulated GLUT4/);
  assert.match(api.workout('resistance','reason'),/differential survival and reproduction/);
});

test('canonical concept feedback resolves option rationales after rotation', () => {
  for (const topic of ctx.window.BIO_LIBRARY.topics) {
    for (const q of topic.quickCheck) {
      const html = api.topic(q,topic);
      assert.match(html,/Check each option/,topic.id);
      assert.equal((html.match(/<dd>/g)||[]).length,q.options.length,topic.id);
      assert.match(html,/be-explanation/,topic.id);
    }
    const example = ctx.window.BIO_ENRICHMENT[topic.id]?.workedExample;
    assert.ok(example,topic.id);
    const html = api.reason(example,topic);
    assert.match(html,/Model answer/);
    assert.match(html,/be-explanation/);
  }
  const enzymes = ctx.window.BIO_LIBRARY.topics.find(t=>t.id==='enzymes');
  assert.match(api.reason(ctx.window.BIO_ENRICHMENT.enzymes.workedExample,enzymes),/kcat/);
  assert.match(api.reason(ctx.window.BIO_ENRICHMENT.enzymes.workedExample,enzymes),/be-diagram/);
});

test('stored question data and fallback answers cannot inject markup', () => {
  const payload = '<img src=x onerror="globalThis.hacked=1">';
  const html = api.solve({id:'unknown',type:'mcq',options:[payload,'safe'],answer:0,explain:payload});
  assert.doesNotMatch(html,/<img|<script|onerror="/);
  assert.match(html,/&lt;img/);
  const table = api.solve({id:'unknown',type:'match',left:[payload],right:[payload],explain:payload});
  assert.doesNotMatch(table,/<img/);
  const topic = {id:'untrusted',explanations:{scientific:payload}};
  assert.doesNotMatch(api.topic({options:[payload],answer:0,question:payload,explanation:payload},topic),/<img/);
});

test('answer integration keeps local fallbacks and the original grading engines', () => {
  assert.match(solve,/window\.BioExamAnswers\.solve\(q\)/);
  assert.match(solve,/window\.BioExamAnswers\.solve\(m\.q\)/);
  assert.match(solve,/esc\(q\.explain\)/);
  assert.match(read('src/library/practice-bridge.js'),/BioExamAnswers\.topic\(q,route\.topic\)/);
  assert.match(read('src/library/practice-bridge.js'),/BioExamAnswers\.reason\(example,route\.topic\)/);
  assert.match(read('src/library/exam-answers.css'),/@media\(max-width:620px\)/);
  assert.doesNotMatch(read('src/library/exam-answers.js'),/fetch\(|localStorage|\.answer\s*=/);
});
