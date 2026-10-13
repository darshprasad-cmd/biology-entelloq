/* Shared browser regression for a mounted Learn topic. The caller owns browser,
 * route, theme and reloads. This leaves a correct saved answer for restore checks.
 * DOM/focus checks do not claim screen-reader speech or real touch-hardware QA. */
'use strict';
const assert = require('node:assert/strict');

async function checkLibraryAnswer(page, world) {
  await world.locator('#bl-topic-title').waitFor({state:'visible'});
  const mountedTopic = world.locator('[data-depth-topic]');
  assert.equal(await mountedTopic.count(), 1, 'Exactly one authored topic is mounted');
  const topicId = await mountedTopic.getAttribute('data-depth-topic');
  const topic = await world.evaluate(id => window.BIO_LIBRARY.topics.find(item => item.id === id), topicId);
  assert.ok(topic?.quickCheck?.length, 'The caller mounts an authored Learn topic');
  assert.equal(await world.locator('#bl-topic-title').innerText(), topic.title);
  const questionIndex = 0, question = topic.quickCheck[questionIndex];
  assert.ok(question.options.length >= 2 && Number.isInteger(question.answer));
  const correctIndex = question.answer, incorrectIndex = (correctIndex + 1) % question.options.length;
  const quiz = world.locator('.bl-quiz fieldset[data-question="0"]');
  const options = quiz.locator('[data-check="0"]');
  const feedback = quiz.locator('[data-feedback="0"]');
  const explanation = feedback.locator('.bl-answer-explanation');
  const retry = feedback.getByRole('button', {name:'Try this check again', exact:true});
  const storageKey = 'bio.entelloq.library.progress.v1';
  const sentinelKey = 'bioq.library-answer.browser.unrelated';
  const sentinelValue = 'Unrelated saved state must survive answer and retry';
  const previousSentinel = await world.evaluate(({key, value}) => {
    const previous = localStorage.getItem(key);
    localStorage.setItem(key, value);
    return previous;
  }, {key:sentinelKey, value:sentinelValue});
  const hashes = [await page.evaluate(() => location.hash), await world.evaluate(() => location.hash)];
  const savedChoice = () => world.evaluate(({key, id, index}) =>
    JSON.parse(localStorage.getItem(key))?.topics?.[id]?.checked?.[index],
  {key:storageKey, id:topic.id, index:questionIndex});
  const preserved = async label => {
    assert.deepEqual([await page.evaluate(() => location.hash), await world.evaluate(() => location.hash)], hashes,
      label + ': answering does not navigate either document');
    assert.equal(await world.evaluate(key => localStorage.getItem(key), sentinelKey), sentinelValue,
      label + ': unrelated storage survives');
  };
  const assertFeedback = async (chosen, keyboard) => {
    assert.equal(await feedback.isVisible(), true);
    assert.equal(await feedback.getAttribute('role'), null, 'Focused feedback does not also use a live status role');
    assert.equal(await feedback.getAttribute('aria-live'), null, 'Focus is the single announcement mechanism');
    assert.equal(await explanation.count(), 1, 'The result has one explicit explanation focus target');
    assert.equal(await explanation.evaluate(el => el.tagName), 'P');
    assert.equal(await explanation.getAttribute('tabindex'), '-1');
    assert.equal(await explanation.evaluate(el => el === document.activeElement), true,
      'Disabling the chosen option transfers focus to its explanation, not BODY');
    const text = await explanation.innerText();
    assert.ok(text.includes(question.explanation), 'The complete authored explanation is preserved');
    assert.equal(await explanation.locator('strong').innerText(), chosen === correctIndex ? 'That’s the mechanism.' : 'A useful misconception to untangle.');
    if (chosen !== correctIndex) assert.ok(text.includes('The best answer is ' + String.fromCharCode(65 + correctIndex) + '.'));
    const position = await explanation.evaluate(el => {
      const box = el.getBoundingClientRect();
      return {top:box.top, bottom:box.bottom, height:innerHeight};
    });
    assert.ok(position.top >= -1 && position.bottom <= position.height + 1,
      'Native focus scrolling brings the explanation into its document viewport');
    assert.equal(await options.count(), question.options.length);
    for (let index = 0; index < question.options.length; index++) {
      const option = options.nth(index);
      assert.equal(await option.isDisabled(), true, 'Every option is disabled after checking');
      assert.equal(await option.getAttribute('data-result'), index === correctIndex ? 'correct' : index === chosen ? 'incorrect' : '');
    }
    if (keyboard) {
      const focusStyle = await explanation.evaluate(el => {
        const style = getComputedStyle(el);
        return {visible:el.matches(':focus-visible'), width:parseFloat(style.outlineWidth), style:style.outlineStyle, color:style.outlineColor};
      });
      assert.equal(focusStyle.visible, true, 'Keyboard feedback uses focus-visible styling');
      assert.ok(focusStyle.width >= 2 && !['none','hidden'].includes(focusStyle.style), 'The explanation has a visible focus outline');
      assert.ok(!['transparent','rgba(0, 0, 0, 0)'].includes(focusStyle.color), 'The focus outline is not transparent');
    }
    assert.equal(await savedChoice(), chosen, 'The real chosen option persists');
    await preserved('Checked answer');
  };
  const assertRetried = async () => {
    assert.equal(await feedback.isVisible(), false);
    assert.equal(await savedChoice(), undefined, 'Retry removes the saved answer for this check');
    for (const option of await options.all()) {
      assert.equal(await option.isEnabled(), true);
      assert.equal(await option.getAttribute('data-result'), '', 'Retry clears old correctness styling');
    }
    assert.equal(await options.first().evaluate(el => el === document.activeElement), true, 'Retry returns focus to the first option');
    await preserved('Retry');
  };
  try {
    // Repeat-safe on a restored topic without rewriting application state.
    if (await feedback.isVisible()) {
      await retry.click();
      await assertRetried();
    }
    await options.nth(incorrectIndex).focus();
    await page.keyboard.press('Enter');
    await assertFeedback(incorrectIndex, true);
    await page.keyboard.press('Tab');
    assert.equal(await retry.evaluate(el => el === document.activeElement), true, 'Next Tab reaches retry, without revisiting disabled options');
    await page.keyboard.press('Enter');
    await assertRetried();

    await options.nth(correctIndex).focus();
    await page.keyboard.press('Space');
    await assertFeedback(correctIndex, true);
    await page.keyboard.press('Tab');
    assert.equal(await retry.evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Space');
    await assertRetried();

    await options.nth(incorrectIndex).click();
    await assertFeedback(incorrectIndex, false);
    await retry.click();
    await assertRetried();
    await options.nth(correctIndex).click();
    await assertFeedback(correctIndex, false);
    // Leave keyboard-visible feedback for the caller's screenshots and restore checks.
    await retry.click();
    await assertRetried();
    await options.nth(correctIndex).focus();
    await page.keyboard.press('Space');
    await assertFeedback(correctIndex, true);
    return {topicId:topic.id, questionIndex, correctIndex, explanation:question.explanation, savedChoice:correctIndex,
      checks:['Keyboard incorrect/correct explanations receive visible focus', 'Next Tab reaches retry; retry clears state and focuses the first option',
        'Pointer answers and retries preserve feedback and grading', 'Route and unrelated storage remain unchanged']};
  } finally {
    await world.evaluate(({key, previous}) => {
      if (previous === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous);
    }, {key:sentinelKey, previous:previousSentinel});
  }
}

module.exports = {checkLibraryAnswer};
