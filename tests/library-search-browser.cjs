/* Shared real-browser search checks. The caller owns navigation and the browser;
 * world is the mounted Learn Page or Frame, including a portable nested frame.
 * This exercises DOM/focus behavior, not assistive-technology speech output. */
'use strict';
const assert = require('node:assert/strict');

async function checkLibrarySearch(page, world) {
  const search = world.locator('#bl-search');
  const heading = world.locator('#bl-results-title');
  const status = world.locator('#bl-result-status');
  const items = world.locator('#bl-result-items');
  const show = world.locator('#bl-show-results');
  await search.waitFor({ state: 'visible' });
  // Immediate assertions make the old replace-the-entire-results implementation
  // fail explicitly, rather than timing out during a later keyboard action.
  assert.equal(await heading.count(), 1, 'Results have one persistent focus target');
  assert.equal(await status.count(), 1, 'Results have one persistent live status');
  assert.equal(await items.count(), 1, 'Result cards have their own replaceable container');
  assert.equal(await show.count(), 1, 'Search offers an explicit results jump');
  assert.equal(await heading.evaluate(el => el.tagName), 'H2');
  assert.equal(await heading.getAttribute('tabindex'), '-1');
  assert.ok((await heading.getAttribute('aria-describedby') || '').split(/\s+/).includes('bl-result-status'));
  assert.equal(await status.getAttribute('role'), 'status');
  assert.equal(await status.getAttribute('aria-live'), 'polite');
  assert.equal(await status.getAttribute('aria-atomic'), 'true');
  assert.equal(await show.getAttribute('type'), 'button');
  const retained = await Promise.all([heading.elementHandle(), status.elementHandle(), search.elementHandle()]);
  const markerKey = 'bioq.library-search.browser.unrelated';
  const marker = 'preserve-unrelated-search-state';
  const previous = await world.evaluate(({ key, value }) => {
    const old = localStorage.getItem(key);
    localStorage.setItem(key, value);
    return old;
  }, { key: markerKey, value: marker });
  const hashes = [await page.evaluate(() => location.hash), await world.evaluate(() => location.hash)];
  const focused = async (selector, message) => {
    assert.equal(await world.locator(selector).evaluate(el => el === document.activeElement), true, message);
  };
  const unchanged = async label => {
    for (const [index, id] of ['bl-results-title', 'bl-result-status', 'bl-search'].entries()) {
      assert.equal(await retained[index].evaluate((el, id) => el.isConnected && el === document.getElementById(id), id), true,
        label + ': ' + id + ' retains its original DOM identity');
    }
    assert.deepEqual([await page.evaluate(() => location.hash), await world.evaluate(() => location.hash)], hashes,
      label + ': filtering does not navigate either document');
    assert.equal(await world.evaluate(key => localStorage.getItem(key), markerKey), marker,
      label + ': unrelated saved state is preserved');
    const count = await items.locator('.bl-topicrow').count();
    const text = (await status.textContent()).trim();
    assert.equal(Number(text.match(/\d+/)?.[0]), count, label + ': live status reports the displayed result count');
    return count;
  };
  const atResults = async label => {
    await focused('#bl-results-title', label + ': focus lands on the results heading');
    const visible = await heading.evaluate(el => {
      const box = el.getBoundingClientRect();
      return box.top >= -1 && box.bottom <= innerHeight + 1;
    });
    assert.equal(visible, true, label + ': results heading scrolls into view');
  };
  const resetState = async label => {
    assert.equal(await search.inputValue(), '', label + ': query clears');
    assert.equal(await world.locator('#bl-curriculum').inputValue(), 'all', label + ': curriculum resets');
    assert.equal(await world.locator('[data-category="all"]').getAttribute('aria-pressed'), 'true', label + ': field resets');
    assert.equal(await world.locator('[data-scope="start"]').getAttribute('aria-pressed'), 'true', label + ': starting-point scope restores');
    assert.equal(await world.locator('#bl-empty-reset').count(), 0, label + ': empty-state recovery disappears');
    await focused('#bl-search', label + ': the learner can type immediately');
    assert.ok(await unchanged(label) > 0, label + ': concepts return');
  };
  try {
    await world.locator('#bl-clear').click();
    await resetState('Initial reset');
    await search.fill('photo');
    await focused('#bl-search', 'Typing a partial query does not steal focus');
    await unchanged('Partial query');
    await search.pressSequentially('synthesis');
    await focused('#bl-search', 'Successive input events keep focus in the search field');
    assert.ok(await unchanged('Completed query') > 0, 'A known query finds concepts');
    assert.equal(await items.locator('.bl-topiclink[href="#topic/photosynthesis/layman"]').count(), 1);

    await page.keyboard.press('Enter');
    await atResults('Search Enter');
    await unchanged('Search Enter');
    await page.keyboard.press('Tab');
    assert.equal(await world.evaluate(() => document.activeElement === document.querySelector('#bl-result-items .bl-topiclink')), true,
      'The next Tab after a populated-query heading reaches the first result');
    await show.click();
    await atResults('Show results button');
    await unchanged('Show results button');

    await search.fill('');
    await focused('#bl-search', 'Clearing the query does not move focus to results');
    await unchanged('Query cleared');
    await world.locator('[data-scope="all"]').focus();
    await page.keyboard.press('Enter');
    await focused('[data-scope="all"]', 'Changing scope retains focus on its control');
    await unchanged('All-concepts scope');
    const field = world.locator('[data-category="plant-biology"]');
    const fieldLabel = (await field.locator('span').first().textContent()).trim();
    await field.focus();
    await page.keyboard.press('Enter');
    await focused('[data-category="plant-biology"]', 'Changing field retains focus on its control');
    await unchanged('Plant field');
    assert.ok((await status.textContent()).includes(fieldLabel), 'Status identifies the selected biology field');
    const curriculum = world.locator('#bl-curriculum');
    await curriculum.focus();
    await curriculum.selectOption('neet');
    await focused('#bl-curriculum', 'Changing curriculum retains focus on its control');
    assert.ok(await unchanged('NEET plant field') > 0, 'The selected field and curriculum have real content');
    assert.ok((await status.textContent()).includes('NEET'), 'Status identifies the selected curriculum');
    assert.ok((await status.textContent()).includes(fieldLabel), 'Curriculum changes retain the field announcement');

    await search.fill('zzzxqv-no-biology-match-987654321');
    await focused('#bl-search', 'An empty result set does not steal typing focus');
    assert.equal(await unchanged('Zero results'), 0);
    const emptyReset = world.locator('#bl-empty-reset');
    assert.equal(await emptyReset.count(), 1, 'Zero results include an operable recovery button');
    assert.equal(await emptyReset.getAttribute('type'), 'button');
    await page.keyboard.press('Enter');
    await atResults('Zero-result Enter');
    await page.keyboard.press('Tab');
    await focused('#bl-empty-reset', 'The empty-state recovery is next in keyboard order');
    await page.keyboard.press('Enter');
    await resetState('Keyboard empty-state recovery');

    // Repeat through the always-visible reset with every filter non-default.
    await world.locator('[data-scope="all"]').click();
    await field.click();
    await curriculum.selectOption('ap');
    await search.fill('plant');
    await unchanged('Before main reset');
    await world.locator('#bl-clear').focus();
    await page.keyboard.press('Enter');
    await resetState('Main reset');
    return 'Persistent result-status semantics, keyboard/results jumps, focus-safe filters, both reset paths, unchanged routes and unrelated storage verified.';
  } finally {
    await world.evaluate(({ key, previous }) => {
      if (previous === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous);
    }, { key: markerKey, previous });
    await Promise.all(retained.map(handle => handle.dispose()));
  }
}

module.exports = { checkLibrarySearch };
