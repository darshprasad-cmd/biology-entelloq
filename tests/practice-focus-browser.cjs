/* Native keyboard practice actions in real browser documents. The caller owns
 * the browser and initial Solve topic. This is not screen-reader/device QA. */
'use strict';
const assert = require('node:assert/strict');
const {waitForPortableRoute}=require('./portable-route-browser-helper.cjs');

async function checkPracticeFocus(page, initialWorld, options = {}) {
  let world = initialWorld;
  const results = [];
  await world.locator('.tp-question').waitFor();
  const route = await world.evaluate(() => window.BioPractice.parseRoute((window.BioqLocation || location).hash));
  assert.ok(route?.topic, 'Start on an authored topic Solve route');
  const { topic, mode } = route;
  const questions = await world.evaluate(id => BioPractice.questionsFor(BIO_LIBRARY.topics.find(t => t.id === id)), topic.id);
  assert.ok(questions.length >= 2, 'The fixture provides consecutive practice questions');
  const solveKey = 'bioq.topic-practice.v1.solve.' + topic.id;
  const reasonKey = 'bioq.topic-practice.v1.reason.' + topic.id;
  // The embedded shell legitimately records section visits in bioq_activity.
  // Practice answers/latest context also change; every other stored byte stays.
  const snapshot = () => world.evaluate(except => Object.fromEntries(Object.keys(localStorage).filter(key => !except.includes(key))
    .sort().map(key => [key, localStorage.getItem(key)])), [solveKey, reasonKey, 'bioq.topic-practice.v1.latest', 'bioq_activity']);
  const unchanged = await snapshot();
  const savedSolve = () => world.evaluate(key => JSON.parse(localStorage.getItem(key)), solveKey);
  const savedReason = () => world.evaluate(key => JSON.parse(localStorage.getItem(key)), reasonKey);
  const settled = () => world.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const enter = async selector => {
    await world.locator(selector).focus();
    const scrollBefore = await world.evaluate(() => scrollY);
    await page.keyboard.press('Enter');
    await settled();
    return scrollBefore;
  };
  const focusVisible = async (selector, label, scrollBefore, readableSelector = selector) => {
    const focused = await world.locator(selector).evaluate(el => {
      const style = getComputedStyle(el);
      return { active: el === document.activeElement, focusVisible: el.matches(':focus-visible'),
        outlineWidth: parseFloat(style.outlineWidth), outlineStyle: style.outlineStyle };
    });
    assert.equal(focused.active, true, label + ': expected target receives focus');
    assert.equal(focused.focusVisible, true, label + ': native keyboard focus is visible');
    assert.ok(focused.outlineWidth >= 2 && !['none', 'hidden'].includes(focused.outlineStyle), label + ': focus outline is drawn');
    const position = await world.locator(readableSelector).evaluate(el => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2);
      return { top: box.top, bottom: box.bottom, height: box.height, viewport: innerHeight, scrollY,
        unobscured: hit === el || el.contains(hit) };
    });
    assert.ok(position.top >= -1 && position.bottom <= position.viewport + 1,
      label + ': focused content is readable in the viewport (' + position.top + '..' + position.bottom + ' / ' + position.viewport + ')');
    assert.equal(position.unobscured, true, label + ': focused content is not covered by the fixed header or an overlay');
    assert.equal(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, label + ': no horizontal overflow');
    results.push({ action: label, scrollBefore, ...position });
    if (options.capture) await options.capture(label, world);
  };
  const choose = async index => {
    const option = world.locator('input[name="tpAnswer"]').nth(index);
    await option.focus();
    await page.keyboard.press('Space');
    assert.equal(await option.isChecked(), true, 'Native Space selects the radio');
  };
  const disabledAfterGrade = async () => {
    assert.equal(await world.locator('.tp-answer-form fieldset').evaluate(el => el.disabled), true,
      'The graded answer fieldset has its native disabled property');
    for (const option of await world.locator('input[name="tpAnswer"]').all()) {
      assert.equal(await option.isDisabled(), true, 'Graded radios stay natively disabled');
      assert.equal(await option.evaluate(el => el.matches(':disabled')), true);
    }
    assert.equal(await world.locator('.tp-submit').count(), 0, 'Checked view omits submission');
  };
  const submit = async (questionIndex, answerIndex, label) => {
    await choose(answerIndex);
    const before = await enter('.tp-submit');
    await world.locator('.tp-feedback').waitFor();
    // Rich feedback may be taller than the screen: its verdict, not its entire
    // long worked explanation, must be immediately readable after focus.
    await focusVisible('.tp-feedback', label, before, '.tp-feedback > strong');
    await disabledAfterGrade();
    assert.equal((await savedSolve()).answers[questionIndex].choice, answerIndex);
    assert.equal((await savedSolve()).answers[questionIndex].checked, true);
  };
  const follow = async section => {
    const link = world.locator('.tp-path a[href="./' + section + '.html#learn/' + topic.id + '/' + mode + '"]');
    await link.focus();
    await page.keyboard.press('Enter');
    if (await page.evaluate(()=>!!window.BioPortable)) await waitForPortableRoute(page,'#'+section+'/learn/'+topic.id+'/'+mode);
    else await page.waitForURL(url => url.pathname.endsWith('/' + section + '.html') || url.hash === '#' + section + '/learn/' + topic.id + '/' + mode,
      { waitUntil: 'domcontentloaded' });
    if (options.getWorld) world = await options.getWorld();
    await world.locator(section === 'reason' ? '#tpDraft' : '.tp-question').waitFor();
    assert.equal(await world.locator('.tp-heading h1').textContent(), topic.title);
  };

  // Repeat-safe when a larger regression suite has already used this topic.
  await enter('[data-question="0"]');
  if (await world.locator('.tp-retry').count()) await enter('.tp-retry');
  const wrong = (questions[0].answer + 1) % questions[0].options.length;
  await submit(0, wrong, 'Solve check incorrect answer');
  let before = await enter('.tp-retry');
  await focusVisible('#tpQuestion', 'Solve retry question', before);
  assert.ok((await savedSolve()).answers[0] == null, 'Retry clears only this question answer');
  assert.equal(await world.locator('input[name="tpAnswer"]:checked').count(), 0);
  assert.equal(await world.locator('.tp-submit').isDisabled(), true);
  await submit(0, questions[0].answer, 'Solve check correct answer');
  before = await enter('.tp-next');
  await focusVisible('#tpQuestion', 'Solve next question', before);
  assert.equal(await world.locator('#tpQuestion').textContent(), questions[1].question);
  const firstAnswer = (await savedSolve()).answers[0];
  if (await world.locator('.tp-retry').count()) await enter('.tp-retry');
  await submit(1, questions[1].answer, 'Solve check second question');
  before = await enter('[data-question="0"]');
  await focusVisible('#tpQuestion', 'Solve question selector', before);
  await disabledAfterGrade();
  assert.deepEqual((await savedSolve()).answers[0], firstAnswer, 'Question navigation retains the graded answer');
  const solvedAnswers = (await savedSolve()).answers;

  await follow('reason');
  if (await world.locator('.tp-revisit').count()) await enter('.tp-revisit');
  const draft = 'Light reactions supply ATP and NADPH; carbon fixation depends on those inputs.';
  const reflection = 'Distinguish the immediate products from the downstream biological outcome.';
  await world.locator('#tpDraft').fill(draft);
  let revealCount = await world.locator('.tp-chain li').count();
  while (await world.locator('.tp-reveal').count()) {
    before = await enter('.tp-reveal');
    revealCount++;
    await focusVisible('.tp-step-status', 'Reason reveal step ' + revealCount, before);
    assert.equal(await world.locator('.tp-chain li').count(), revealCount);
    assert.equal(await world.locator('#tpDraft').inputValue(), draft);
    assert.equal((await savedReason()).draft, draft);
  }
  assert.ok(revealCount >= 2, 'The fixture exercises multiple causal-chain reveals');
  await world.locator('#tpReflection').fill(reflection);
  before = await enter('.tp-revisit');
  await focusVisible('#tpDraft', 'Reason hide worked answer', before);
  assert.equal(await world.locator('#tpDraft').inputValue(), draft);
  assert.equal((await savedReason()).reflection, reflection, 'Hiding worked reasoning preserves the reflection');
  assert.equal((await savedReason()).revealed, 0);
  assert.equal(await world.locator('.tp-chain').count(), 0);
  assert.deepEqual((await savedSolve()).answers, solvedAnswers, 'Reason actions preserve graded Solve answers');
  assert.deepEqual(await snapshot(), unchanged, 'Unrelated records and private depth-study drafts are unchanged');
  return { topicId: topic.id, mode, actions: results, answersPreserved: true, draftsPreserved: true,
    gradedRadiosDisabled: true, reasonDraft: draft, reflection };
}

module.exports = { checkPracticeFocus };
