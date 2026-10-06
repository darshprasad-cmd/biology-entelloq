/* Exercise the published package's real quiz controls and saved-answer flows.
 * Canonical questions enter through the existing saved-mistake re-quiz; grading
 * and rendering run unchanged. No WebGL scene, account or live AI is started. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), vm = require('node:vm');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const {chromium} = createRequire(path.join(modules, '__exam_answer_check__.cjs'))('playwright');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('dist/index.html'), source = read('solve.html'), reasonSource = read('src/_reason.js');
const data = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const QBANK='), source.indexOf('const GEN_TEMPLATES=')) + ';globalThis.bank=QBANK;', data);
vm.runInContext(reasonSource.slice(reasonSource.indexOf('  const STEPS ='), reasonSource.indexOf('  const app =')) + ';globalThis.workouts=PROBLEMS;', data);
const questions = JSON.parse(JSON.stringify(data.bank.filter(q => ['cell1','cell3','cellAR2','phy3','phyAR2','cell6','gen5','gen4','pla5','cell4'].includes(q.id))));
assert.equal(questions.length, 10);
const report = {complete:false, checks:[], widths:[], errors:[], unexpectedRequests:[]};
const reportPath = path.join(root, 'docs/single-file/exam-answers-browser-report.json');
const server = http.createServer((req,res) => {
  if (req.url === '/') {res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); res.end(html);}
  else {res.writeHead(404); res.end();}
});
async function frame(parent, selector) {return (await parent.locator(selector).elementHandle()).contentFrame();}
async function navigate(page, route, selector) {
  await page.evaluate(value => {location.hash = value;}, '#' + route);
  const [section,...parts] = route.split('/'), sub = parts.length ? '#' + parts.join('/') : '';
  await page.waitForFunction(({section,sub}) => {
    const app = document.querySelector('#bioq-workspace')?.contentWindow;
    const child = app?.document.querySelector('#viewFrame.on')?.contentWindow;
    return child?.BioqContext?.ready && child.BioqLocation.pathname.endsWith('/' + section + '.html') && child.BioqLocation.hash === sub;
  }, {section,sub});
  const app = await frame(page, '#bioq-workspace'), child = await frame(app, '#viewFrame');
  await child.locator(selector).waitFor();
  return child;
}
async function noOverflow(page, child, label) {
  const app = await frame(page, '#bioq-workspace');
  for (const [name,scope] of [['package',page],['workspace',app],['content',child]]) {
    const size = await scope.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(size.scroll <= size.width + 1, `${label}: ${name} overflows (${size.scroll}/${size.width})`);
  }
}
async function answerScreenshot(page, target, name) {
  // Element screenshots inside nested fixed-height frames are clipped at the
  // frame boundary. Preserve the responsive width and grow only capture height.
  const viewport = page.viewportSize(), box = await target.boundingBox();
  try {
    await page.setViewportSize({width:viewport.width,height:Math.ceil(box.height) + 180});
    await target.screenshot({path:path.join(root,'docs/single-file',name),scale:'css'});
  } finally {await page.setViewportSize(viewport);}
}
async function feedback(child, q) {
  const shown = child.locator('#svFeedback');
  await shown.locator('.bioq-exam-answer').first().waitFor();
  assert.doesNotMatch(await shown.innerText(), /undefined|\[object Object\]/);
  if (q.type === 'case') {
    assert.equal(await shown.locator('.be-direct').count(), q.subs.length);
    for (let i=0;i<q.subs.length;i++) {
      const sub = q.subs[i], direct = await shown.locator('.be-direct').nth(i).textContent();
      assert.ok(direct.includes(sub.options[sub.answer]));
      assert.ok(direct.includes('Correct answer · ' + String.fromCharCode(65 + sub.answer)));
    }
  } else if (q.type === 'match') {
    assert.equal(await shown.locator('tbody tr').count(), q.left.length);
    for (let i=0;i<q.left.length;i++) {
      const cells = await shown.locator('tbody tr').nth(i).locator('th,td').allTextContents();
      assert.equal(cells[0], q.left[i]); assert.equal(cells[1], q.right[i]);
      assert.ok(cells[2].length > 35, q.id + ' explains each match');
    }
  } else if (q.type === 'diagram') {
    assert.equal(await shown.locator('.be-diagram').count(), 1);
    assert.match(await shown.innerText(), /nucleus|Nucleus/);
  } else {
    assert.equal(await shown.locator('.be-options dl > div').count(), q.type === 'ar' ? 4 : q.options.length);
    assert.ok((await shown.locator('.be-direct').textContent()).includes('Correct answer · ' + String.fromCharCode(65 + q.answer)), q.id + ' displays the graded answer letter');
    if (q.options) assert.ok((await shown.locator('.be-direct').innerText()).includes(q.options[q.answer]));
    const selected = shown.locator('.be-option-correct dt > span');
    assert.equal(await selected.innerText(), String.fromCharCode(65 + q.answer));
  }
  if (q.id === 'gen4') {
    assert.equal(await shown.locator('table tbody tr').count(), 4);
    assert.match(await shown.innerText(), /9\/16/);
  }
}
async function bankSession(page, solve, width) {
  await solve.evaluate(qs => localStorage.setItem('bioq_solve_mistakes', JSON.stringify(qs.map(q => ({qid:q.id,topic:q.topic,type:q.type,stem:q.stem || q.assertion || q.passage,yours:'Earlier answer',right:'Review',explain:q.explain,q})))), questions);
  await solve.locator('[data-act="review"]').click();
  await solve.locator('[data-act="practice-mistakes"]').click();
  const seen = new Set(); let marks = 0, max = 0;
  for (let n=0;n<questions.length;n++) {
    const stem = await solve.locator('#svStem').innerText();
    const q = questions.find(q => !seen.has(q.id) && stem.includes(q.type === 'ar' ? q.assertion : q.type === 'case' ? q.passage : q.stem));
    assert.ok(q, 'A real authored question appears in the re-quiz'); seen.add(q.id);
    if (q.type === 'match') {
      for (let i=0;i<q.left.length;i++) {
        await solve.locator(`[data-side="L"][data-i="${i}"]`).click();
        await solve.locator(`[data-side="R"][data-ri="${i < 2 ? 1-i : i}"]`).click();
      }
      marks += q.left.length - 2; max += q.left.length;
    } else if (q.type === 'case') {
      for (let i=0;i<q.subs.length;i++) await solve.locator(`[data-sub="${i}"][data-choice="${i ? q.subs[i].answer : 0}"]`).click();
      marks += q.subs.length - 1; max += q.subs.length;
    } else if (q.type === 'diagram') {
      const labels = ['Nucleus','Mitochondrion','Cell membrane','Ribosome'];
      for (let i=0;i<labels.length;i++) {
        await solve.locator(`[data-label="${labels[i]}"]`).click();
        await solve.locator(`[data-hi="${i}"]`).click();
      }
      marks += labels.length; max += labels.length;
    } else {
      await solve.locator(`[data-choice="${q.id === 'cell1' ? 0 : q.answer}"]`).click();
      marks += q.id === 'cell1' ? 0 : 1; max++;
    }
    await solve.locator('#svPrimary').click();
    await feedback(solve,q);
    const verdict = await solve.locator('#svFeedback .fh').innerText();
    assert.ok(verdict.includes(q.id === 'cell1' ? 'Not quite' : q.type === 'match' || q.type === 'case' ? 'Partly right' : 'Correct'), q.id + ' retains grading');
    await noOverflow(page,solve,`${width}px ${q.id} feedback`);
    if (q.id === 'gen4') await answerScreenshot(page,solve.locator('#svFeedback .sv-feedback'),`exam-punnett-${width}.png`);
    await solve.locator('#svPrimary').click();
  }
  const history = await solve.evaluate(() => JSON.parse(localStorage.getItem('bioq_solve_history')));
  assert.equal(history.length, 1);
  assert.deepEqual({marks:history[0].marks,max:history[0].max,pct:history[0].pct,count:history[0].count}, {marks,max,pct:Math.round(marks/max*100),count:questions.length});
  assert.equal(await solve.locator('.be-session-question').count(), questions.length);
  for (let i=0;i<questions.length;i++) {
    const result = solve.locator('.be-session-question').nth(i);
    await result.locator('summary').click();
    await result.locator('.bioq-exam-answer').first().waitFor();
    await noOverflow(page,solve,`${width}px end-of-session answer ${i+1}`);
    await result.locator('summary').click();
  }
  await solve.locator('[data-act="review"]').click();
  assert.equal(await solve.locator('.sv-mrow').count(), questions.length);
  assert.ok(await solve.locator('.sv-mrow .bioq-exam-answer').count() >= questions.length);
  await noOverflow(page,solve,`${width}px saved mistake explanations`);
  report.checks.push(`${width}px: all six Solve formats, all four assertion-reason answers, partial marks (${marks}/${max}), Punnett table and saved review pass.`);
  await solve.locator('[data-act="new"]').click();
  await solve.locator('[data-group="topic"][data-val="Cell Biology"]').click();
  await solve.locator('[data-act="generate"]').click();
  const generatedStem = await solve.locator('#svStem').innerText();
  const generatedPairs = [
    ["generating most of the cell's ATP",'Mitochondrion'],['synthesising proteins from mRNA','Ribosome'],
    ['modifying, packaging and secreting proteins','Golgi apparatus'],['digesting worn-out organelles and debris','Lysosome'],
    ['synthesising and transporting proteins','Rough endoplasmic reticulum'],['carrying out photosynthesis','Chloroplast']
  ];
  const correct = generatedPairs.find(([phrase]) => generatedStem.includes(phrase))?.[1];
  assert.ok(correct, 'Generator chose one of its authored mechanisms');
  const options = await solve.locator('.sv-choice > span:nth-child(2)').allTextContents();
  const answer = options.indexOf(correct); assert.ok(answer >= 0);
  await solve.locator(`[data-choice="${answer}"]`).click(); await solve.locator('#svPrimary').click();
  await feedback(solve, {id:'generated-browser',type:'mcq',options,answer});
  assert.match(await solve.locator('#svFeedback .fh').innerText(), /Correct/);
  await noOverflow(page,solve,`${width}px generated feedback`);
  await solve.locator('#svPrimary').click();
  assert.equal(await solve.evaluate(() => JSON.parse(localStorage.getItem('bioq_solve_history')).at(-1).marks), 1);
  assert.equal(await solve.locator('.be-session-question').count(), 1);
  await solve.locator('.be-session-question summary').click();
  assert.ok((await solve.locator('.be-session-body .be-direct').innerText()).includes(correct));
  assert.equal(await solve.locator('.be-session-body .be-options dd').count(), options.length);
  await noOverflow(page,solve,`${width}px generated result answer`);
  await solve.locator('[data-act="new"]').click();
  await solve.locator('[data-group="topic"][data-val="Biotechnology"]').click();
  await solve.locator('[data-group="board"][data-val="AP"]').click();
  await solve.locator('[data-group="diff"][data-val="2"]').click();
  await solve.locator('[data-group="count"][data-val="5"]').click();
  await solve.locator('[data-group="mode"][data-val="timed"]').click();
  await solve.locator('[data-act="start"]').click();
  for (let i=0;i<3;i++) {
    await solve.locator('#svTimer').waitFor();
    assert.equal(await solve.locator('#svFeedback .bioq-exam-answer').count(),0,'Timed mode retains delayed feedback');
    await solve.locator('[data-act="skip"]').click();
  }
  assert.equal(await solve.locator('.be-session-question').count(),3);
  const timed = await solve.evaluate(() => JSON.parse(localStorage.getItem('bioq_solve_history')).at(-1));
  assert.deepEqual({mode:timed.mode,marks:timed.marks,max:timed.max,count:timed.count},{mode:'timed',marks:0,max:6,count:3});
  for (let i=0;i<3;i++) {
    const result = solve.locator('.be-session-question').nth(i);
    await result.locator('summary').click(); await result.locator('.bioq-exam-answer').waitFor();
  }
  await noOverflow(page,solve,`${width}px timed result answers`);
  report.checks.push(`${width}px: end-of-session answers open for every result; generated and timed sessions retain their scoring and full worked feedback.`);
}
async function topicSession(page, width) {
  let solve = await navigate(page,'solve/learn/enzymes/advanced','.tp-submit');
  const q = await solve.evaluate(() => BioPractice.questionsFor(BIO_LIBRARY.topics.find(t=>t.id==='enzymes'))[0]);
  await solve.locator(`input[name="tpAnswer"][value="${q.answer}"]`).check();
  await solve.locator('.tp-submit').click();
  assert.match(await solve.locator('.tp-feedback > strong').innerText(), /right/);
  assert.equal(await solve.locator('.tp-feedback .be-options dd').count(), q.options.length);
  const saved = await solve.evaluate(() => JSON.parse(localStorage.getItem('bioq.topic-practice.v1.solve.enzymes')));
  assert.equal(saved.answers[0].choice,q.answer); assert.equal(saved.answers[0].checked,true);
  const reason = await navigate(page,'reason/learn/enzymes/advanced','#tpDraft');
  const draft = 'More enzyme adds catalytic sites, so the limiting rate can increase.';
  await reason.locator('#tpDraft').fill(draft);
  for (let guard=0;guard<12 && await reason.locator('.tp-reveal').count();guard++) await reason.locator('.tp-reveal').click();
  await reason.locator('.tp-model-answer .be-diagram').waitFor();
  assert.match(await reason.locator('.tp-model-answer').innerText(), /Vmax = kcat\[E\]total/);
  assert.equal(await reason.locator('#tpDraft').inputValue(),draft);
  await reason.locator('#tpReflection').fill('The available number of catalytic sites links enzyme amount to rate.');
  await noOverflow(page,reason,`${width}px topic model answer`);
  await reason.locator('.tp-revisit').click();
  assert.equal(await reason.locator('.tp-model-answer').count(),0);
  assert.equal(await reason.locator('#tpDraft').inputValue(),draft);
  solve = await navigate(page,'solve/learn/enzymes/advanced','.tp-feedback');
  assert.equal(await solve.locator(`input[name="tpAnswer"][value="${q.answer}"]`).isChecked(),true);
  assert.deepEqual(await solve.evaluate(() => JSON.parse(localStorage.getItem('bioq.topic-practice.v1.solve.enzymes'))),saved);
  await noOverflow(page,solve,`${width}px restored topic answer`);
  report.checks.push(`${width}px: topic answer grading and saved choice persist; Reason reveals a mechanism diagram and preserves the student's draft when hidden.`);
}
async function workouts(page, width) {
  for (const p of data.workouts) {
    const reason = await navigate(page,'reason/' + p.id,'.rz-next');
    await reason.locator('.rz-next').last().click();
    for (let i=0;i<p.principles.options.length;i++) if(p.principles.options[i].ok) await reason.locator(`.rz-step:last-child .rz-mo[data-i="${i}"]`).click();
    await reason.locator('.rz-step:last-child .rz-check-btn').click();
    assert.equal(await reason.locator('.rz-step:last-child .be-principles dd').count(),p.principles.options.length);
    await reason.locator('.rz-next').last().click();
    for (const stage of ['regulated','form']) {
      await reason.locator(`.rz-step:last-child .rz-opt[data-i="${p[stage].a}"]`).click();
      assert.equal(await reason.locator('.rz-step:last-child .be-options dd').count(),p[stage].o.length);
      assert.ok((await reason.locator('.rz-step:last-child .be-direct').innerText()).includes(p[stage].o[p[stage].a]));
      await reason.locator('.rz-next').last().click();
    }
    await reason.locator('.rz-step:last-child .rz-opt[data-i="1"]').click();
    assert.match(await reason.locator('.rz-step:last-child .rz-fb').innerText(), /Try another strategy/);
    const correct = p.strategy.o.findIndex(o=>o.ok);
    await reason.locator(`.rz-step:last-child .rz-opt[data-i="${correct}"]`).click();
    assert.ok((await reason.locator('.rz-step:last-child .be-direct').innerText()).includes(p.strategy.o[correct].t));
    await reason.locator('.rz-next').last().click();
    await reason.locator('.rz-step:last-child .rz-reveal').click();
    await reason.locator('.rz-step:last-child .be-diagram').waitFor();
    assert.equal(await reason.locator('.rz-step:last-child .be-flow li').count(),4);
    assert.match(await reason.locator('.rz-step:last-child .be-direct').innerText(), /Model exam answer/i);
    await noOverflow(page,reason,`${width}px ${p.id} model answer`);
    if (p.id === 'glucose') await answerScreenshot(page,reason.locator('.rz-step:last-child .bioq-exam-answer'),`exam-reason-${width}.png`);
    await reason.locator('.rz-next').last().click();
    await reason.locator('.rz-done').waitFor();
  }
  report.checks.push(`${width}px: all three guided workouts retain correct/trap selection and reach the complete model answer, causal flow and Generalise step.`);
}
(async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try {
    for (const width of [1280,320]) {
      const context = await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block'});
      await context.route('**/*',route => {
        const url = new URL(route.request().url());
        if (url.origin === base && url.pathname === '/') return route.continue();
        if (['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) return route.abort('blockedbyclient');
        if (['http:','https:','file:'].includes(url.protocol)) {report.unexpectedRequests.push(url.href); return route.abort('blockedbyclient');}
        return route.continue();
      });
      const page = await context.newPage(); page.setDefaultTimeout(30000);
      page.on('pageerror',error=>report.errors.push(error.message));
      await page.goto(base + '/#solve',{waitUntil:'commit'});
      const solve = await navigate(page,'solve','#svConfigCard');
      await bankSession(page,solve,width);
      await topicSession(page,width);
      await workouts(page,width);
      report.widths.push(width);
      await context.close();
    }
    assert.deepEqual(report.errors,[]); assert.deepEqual(report.unexpectedRequests,[]);
    report.complete = true;
  } finally {
    await browser.close(); server.close();
    fs.mkdirSync(path.dirname(reportPath),{recursive:true}); fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1;});
