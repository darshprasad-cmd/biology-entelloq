/* Real-browser route focus checks. The caller owns navigation and browser.
 * DOM focus/keyboard behavior is not a claim about screen-reader speech. */
'use strict';
const assert = require('node:assert/strict');

async function checkLibraryRoute(page, initialWorld, options = {}) {
  let world = initialWorld;
  const checks = [];
  const markerKey = 'bioq.library-route.browser.unrelated';
  const marker = 'Route changes must not overwrite private study records';
  const previous = await world.evaluate(({ key, value }) => {
    const old = localStorage.getItem(key);
    localStorage.setItem(key, value);
    return old;
  }, { key: markerKey, value: marker });
  const studyBefore = await world.evaluate(() => Object.fromEntries(Object.keys(localStorage)
    .filter(key => key.startsWith('bioq.depth-study.v1.')).map(key => [key, localStorage.getItem(key)])));
  const focused = async (selector, message) => assert.equal(
    await world.locator(selector).evaluate(el => el === document.activeElement), true, message);
  const visible = async (selector, message) => assert.equal(await world.locator(selector).evaluate(el => {
    const box = el.getBoundingClientRect();
    return box.top >= -1 && box.bottom <= innerHeight + 1;
  }), true, message);
  const focusOutline = async selector => {
    const style = await world.locator(selector).evaluate(el => {
      const computed = getComputedStyle(el);
      return { visible: el.matches(':focus-visible'), width: parseFloat(computed.outlineWidth),
        style: computed.outlineStyle, color: computed.outlineColor };
    });
    assert.equal(style.visible, true, selector + ': keyboard focus uses focus-visible');
    assert.ok(style.width >= 2 && !['none', 'hidden'].includes(style.style), selector + ': visible focus outline');
    assert.ok(!['transparent', 'rgba(0, 0, 0, 0)'].includes(style.color), selector + ': opaque focus outline');
  };
  const waitTopic = async (id, mode) => {
    await world.waitForFunction(({ id, mode }) => {
      const topic = window.BIO_LIBRARY.topics.find(item => item.id === id);
      return (window.BioqLocation || location).hash === '#topic/' + id + '/' + mode &&
        document.querySelector('#bl-topic-title')?.textContent === topic.title &&
        document.querySelector('[data-mode="' + mode + '"]')?.getAttribute('aria-selected') === 'true';
    }, { id, mode });
  };
  const atTopic = async (id, mode, label) => {
    await waitTopic(id, mode);
    await focused('#bl-topic-title', label + ': new lesson heading receives focus');
    assert.equal(await world.locator('#bl-topic-title').getAttribute('tabindex'), '-1');
    await focusOutline('#bl-topic-title');
    await visible('#bl-topic-title', label + ': new lesson heading is in view');
    assert.equal(await world.locator('[data-practice="solve"]').getAttribute('href'), './solve.html#learn/' + id + '/' + mode);
    assert.equal(await world.locator('[data-practice="reason"]').getAttribute('href'), './reason.html#learn/' + id + '/' + mode);
    await page.keyboard.press('Tab');
    await focused('.bl-curriculum-detail summary', label + ': next Tab enters the lesson instead of restarting at its breadcrumb');
    checks.push(label);
  };
  const activate = async selector => {
    await world.locator(selector).focus();
    await page.keyboard.press('Enter');
  };
  try {
    await world.locator('#bl-search').waitFor();
    await world.locator('#bl-clear').click();
    await world.locator('#bl-search').fill('photosynthesis');
    await world.locator('#bl-search').press('Enter');
    await page.keyboard.press('Tab');
    await focused('.bl-topiclink[href="#topic/photosynthesis/layman"]', 'Search keyboard flow reaches the matching concept');
    await page.keyboard.press('Enter');
    await atTopic('photosynthesis', 'layman', 'Search result Enter');
    if (options.capture) await options.capture('topic', world);

    await world.locator('[data-mode="layman"]').focus();
    await page.keyboard.press('ArrowRight');
    await waitTopic('photosynthesis', 'intuition');
    await focused('[data-mode="intuition"]', 'Same-topic ArrowRight retains the existing mode-tab focus contract');
    assert.equal(await world.locator('.bl-mode[tabindex="0"]').count(), 1);
    await world.locator('#bl-next-mode').focus();
    await page.keyboard.press('Enter');
    await waitTopic('photosynthesis', 'visual');
    await focused('[data-mode="visual"]', 'Try-next-mode retains the selected-tab focus contract');
    checks.push('Existing explanation tab focus');

    await activate('.bl-subnav a[href="#topic/calvin-cycle/visual"]');
    await atTopic('calvin-cycle', 'visual', 'Subtopic Enter');
    const related = world.locator('.bl-mapbranch a').first();
    const target = await related.getAttribute('href');
    const [, relatedId, relatedMode] = target.split('/');
    assert.notEqual(relatedId, 'calvin-cycle', 'Connected concept is a distinct topic');
    await related.focus();
    await page.keyboard.press('Enter');
    await atTopic(relatedId, relatedMode, 'Connected concept Enter');

    // Reacquire the embedded document if its shell restores a frame on history.
    await page.goBack();
    if (options.getWorld) world = await options.getWorld();
    await atTopic('calvin-cycle', 'visual', 'Browser Back between concepts');
    await page.goForward();
    if (options.getWorld) world = await options.getWorld();
    await atTopic(relatedId, relatedMode, 'Browser Forward between concepts');

    const category = world.locator('.bl-breadcrumb a[href^="#category/"]');
    const categoryHash = await category.getAttribute('href');
    const categoryName = (await category.textContent()).trim();
    await category.focus();
    await page.keyboard.press('Enter');
    await world.waitForFunction(({ hash, name }) => (window.BioqLocation || location).hash === hash &&
      document.querySelector('#bl-results-title')?.textContent === name, { hash: categoryHash, name: categoryName });
    await focused('#bl-results-title', 'Category breadcrumb focuses the filtered-results heading');
    await focusOutline('#bl-results-title');
    await visible('#bl-results-title', 'Category breadcrumb scrolls to its filtered results');
    await page.keyboard.press('Tab');
    assert.equal(await world.locator('#bl-result-items .bl-topiclink').first().evaluate(el => el === document.activeElement), true,
      'Next Tab after category heading reaches its first concept');
    const categoryTarget = await world.locator('#bl-result-items .bl-topiclink').first().getAttribute('href');
    const [, categoryTopic, categoryMode] = categoryTarget.split('/');
    await page.keyboard.press('Enter');
    await atTopic(categoryTopic, categoryMode, 'Category result Enter');
    checks.push('Category breadcrumb results');

    await activate('.bl-breadcrumb a[href="#library"]');
    await world.locator('.bl-library-title').waitFor();
    await focused('.bl-library-title', 'Learn breadcrumb focuses the library heading');
    await focusOutline('.bl-library-title');
    assert.equal(await world.locator('.bl-library-title').getAttribute('tabindex'), '-1');
    await visible('.bl-library-title', 'Library heading is in view');
    await page.keyboard.press('Tab');
    await focused('.bl-progress a', 'Next Tab follows the library heading into its Continue link');
    checks.push('Library breadcrumb heading');
    if (options.capture) await options.capture('library', world);

    assert.equal(await world.evaluate(key => localStorage.getItem(key), markerKey), marker, 'Unrelated saved state survives every route');
    assert.deepEqual(await world.evaluate(() => Object.fromEntries(Object.keys(localStorage)
      .filter(key => key.startsWith('bioq.depth-study.v1.')).map(key => [key, localStorage.getItem(key)]))), studyBefore,
    'Private depth-study records are byte-for-byte unchanged');
    return checks;
  } finally {
    await world.evaluate(({ key, previous }) => {
      if (previous === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous);
    }, { key: markerKey, previous });
  }
}

module.exports = { checkLibraryRoute };
