/* Route assertions must inspect the logical location: the portable outer URL is
 * deliberately clean, while standalone authoring pages retain native hashes. */
'use strict';
const assert = require('node:assert/strict');

async function readRoute(owner) {
  return owner.evaluate(() => window.BioqLocation?.hash ?? window.BioPortable?.getRoute() ?? location.hash);
}

async function waitForPortableRoute(page, expected, options = {}) {
  const match = expected instanceof RegExp ? {source:expected.source,flags:expected.flags} : {exact:expected};
  await page.waitForFunction(match => {
    if (!window.BioPortable) return false;
    const route = window.BioPortable.getRoute();
    const matches = 'exact' in match ? route === match.exact : new RegExp(match.source,match.flags).test(route);
    return matches && !location.hash && !new URL(location.href).searchParams.has('route');
  }, match, {timeout:options.timeout});
  const url = new URL(page.url());
  assert.equal(url.hash,'','Ordinary portable navigation keeps the outer fragment empty');
  assert.equal(url.searchParams.has('route'),false,'An incoming share query is consumed into history state');
}

module.exports = {readRoute,waitForPortableRoute};
