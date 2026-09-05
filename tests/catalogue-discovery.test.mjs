import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const learn = fs.readFileSync(new URL('learn.html', root), 'utf8');
const explore = fs.readFileSync(new URL('explore.html', root), 'utf8');
const catalogueHost = { innerHTML: '' };
const catalogue = vm.createContext({
  LAB: './lab.html', UNIVERSE: './universe.html', I: new Proxy({}, { get: () => '' }),
  $: selector => selector === '#catalog' ? catalogueHost : null,
});
const catalogueStart = learn.indexOf('const CATS=[');
assert.ok(catalogueStart > 0, 'Learn catalogue boundary must remain explicit');
vm.runInContext(learn.slice(catalogueStart, learn.indexOf('/* ---- interactive cell', catalogueStart)) +
  '\nglobalThis.items = CATS.flatMap(category => category.items); buildCatalog();', catalogue);

test('Learn keeps all fourteen cards and only labels working routes as live', () => {
  assert.equal(catalogue.items.length, 14);
  assert.equal(catalogue.items.filter(item => item.live).length, 12);
  assert.deepEqual(Array.from(catalogue.items.filter(item => !item.live), item => item.t),
    ['Histology Viewer', 'Gram Staining Lab']);
  const referenceCards = catalogueHost.innerHTML.match(/<article\b[\s\S]*?<\/article>/g);
  assert.equal(referenceCards.length, 2);
  for (const card of referenceCards) {
    assert.match(card, /Reference topic · no interactive/);
    assert.doesNotMatch(card, /href=|chip live|card lift|Open bench/);
  }
});

test('every live Learn destination is an existing page, section, or registered bench', () => {
  for (const item of catalogue.items.filter(item => item.live)) {
    assert.ok(item.href, item.t);
    const [file, fragment] = item.href.split('#');
    const html = file ? fs.readFileSync(new URL(file, root), 'utf8') : learn;
    if (!fragment) continue;
    assert.ok(html.includes(`id="${fragment}"`) || html.includes(`LABS.register("${fragment}"`), item.href);
  }
});

test('the original dissection catalogue entry remains unchanged', () => {
  const entry = catalogue.items.find(item => item.ic === 'scalpel');
  assert.deepEqual(JSON.parse(JSON.stringify(entry)), {
    t: 'Virtual Dissection Theatre', ic: 'scalpel', live: true, href: './lab.html',
    d: 'A real specimen on the table. Cut, retract and identify structures layer by layer, at your own pace.',
  });
});

// A small DOM adapter exercises the actual disease controller without a browser
// or runtime test dependency. Rendering, filtering and event handlers are source code.
function diseaseController() {
  function element() {
    return {
      value: '', innerHTML: '', textContent: '', attributes: {}, listeners: {},
      addEventListener(name, fn) { this.listeners[name] = fn; },
      setAttribute(name, value) { this.attributes[name] = value; },
      focus() { this.focused = true; },
    };
  }
  const list = element(), count = element(), search = element(), filters = element();
  let filterHTML = '';
  Object.defineProperty(filters, 'innerHTML', {
    get: () => filterHTML,
    set(html) {
      filterHTML = html;
      filters.buttons = [...html.matchAll(/data-cat="([^"]+)" aria-pressed="([^"]+)"/g)].map(match => ({
        dataset: { cat: match[1] }, attributes: { 'aria-pressed': match[2] },
        classList: { toggle() {} },
        setAttribute(name, value) { this.attributes[name] = value; },
      }));
    },
  });
  filters.querySelectorAll = () => filters.buttons;
  const hosts = { '#dzList': list, '#dzCount': count, '#dzSearch': search, '#dzFilters': filters };
  const context = vm.createContext({
    $: selector => hosts[selector],
    esc: value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]),
  });
  const start = explore.indexOf('  const DISEASES=[');
  const controller = explore.slice(start, explore.indexOf('  /* ---------------------------- EVOLUTION TIMELINE', start));
  assert.ok(controller.includes('function buildDiseases'), 'Disease controller boundary must remain explicit');
  vm.runInContext(controller, context);
  return {
    list, count, search, filters,
    searchFor(value) { search.value = value; search.listeners.input(); },
    select(category) {
      const button = filters.buttons.find(item => item.dataset.cat === category);
      assert.ok(button, category);
      filters.listeners.click({ target: { closest: () => button } });
    },
    reset() {
      assert.match(list.innerHTML, /id="dzReset"/);
      list.listeners.click({ target: { closest: selector => selector === '#dzReset' ? {} : null } });
    },
  };
}

test('disease categories expose their selected state and result count is live', () => {
  const controller = diseaseController();
  assert.match(explore, /id="dzCount" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(controller.count.textContent, /^14 of 14 diseases$/);
  controller.select('Infectious');
  for (const button of controller.filters.buttons) {
    assert.equal(button.attributes['aria-pressed'], String(button.dataset.cat === 'Infectious'));
  }
  assert.match(controller.count.textContent, / · Infectious$/);
});

test('empty-result reset clears the search and category together, restoring focus', () => {
  const controller = diseaseController();
  controller.select('Infectious');
  controller.searchFor('Asthma');
  assert.match(controller.count.textContent, /^0 of 14 diseases/);
  assert.match(controller.list.innerHTML, /Show all diseases/);
  controller.reset();
  assert.equal(controller.search.value, '');
  assert.equal(controller.search.focused, true);
  assert.equal(controller.count.textContent, '14 of 14 diseases');
  assert.equal(controller.filters.buttons.filter(button => button.attributes['aria-pressed'] === 'true').length, 1);
  assert.equal(controller.filters.buttons[0].attributes['aria-pressed'], 'true');
});

test('markup-like search never becomes disease-result markup', () => {
  const controller = diseaseController();
  controller.searchFor('<img src=x onerror=alert(1)>');
  assert.match(controller.count.textContent, /^0 of 14 diseases/);
  assert.doesNotMatch(controller.list.innerHTML, /<img|onerror/);
});
