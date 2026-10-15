/* Shared real-browser evidence-table contract. The caller supplies the mounted
 * Page/Frame and its owning Playwright Page, viewport and genuine app theme.
 * No routes, lesson data, CSS, application state or network responses change. */
'use strict';
const assert = require('node:assert/strict');
const selector = '[data-depth-task="investigation"] .bd-table-wrap';

async function settleScroll(table) {
  await table.evaluate(el => new Promise(resolve => {
    let previous = el.scrollLeft, stable = 0;
    function tick() {
      const next = el.scrollLeft;
      stable = Math.abs(next - previous) < .1 ? stable + 1 : 0;
      previous = next;
      if (stable > 4) resolve(); else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));
}

async function scrollEvidenceTableEdge(page, table, direction) {
  await table.focus();
  const dimensions = await table.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, left: el.scrollLeft }));
  const distance = direction === 'left' ? dimensions.left : dimensions.scroll - dimensions.width - dimensions.left;
  if (distance <= 1) {
    // Even a fitting table gets one real key event after a theme/pointer action,
    // so the focus-visible assertion tests keyboard modality, not prior state.
    await page.keyboard.press(direction === 'left' ? 'ArrowLeft' : 'ArrowRight');
    await settleScroll(table);
    return;
  }
  for (let i = 0; i < Math.ceil(distance / 20) + 2; i++) await page.keyboard.press(direction === 'left' ? 'ArrowLeft' : 'ArrowRight');
  await settleScroll(table);
  const left = await table.evaluate(el => el.scrollLeft);
  assert.ok(direction === 'left' ? left <= 1 : left >= dimensions.scroll - dimensions.width - 1, 'Native keyboard reaches the ' + direction + ' edge');
}

async function evidenceTableMetrics(table) {
  return table.evaluate(el => {
    const region = el.getBoundingClientRect();
    const rows = [...el.querySelectorAll('thead tr,tbody tr')];
    const first = rows.map(row => row.cells[0]);
    const last = rows.map(row => row.cells[row.cells.length - 1]);
    const box = cell => {
      const b = cell.getBoundingClientRect(), style = getComputedStyle(cell);
      return { text: cell.textContent.trim(), left: b.left, right: b.right, width: b.width, position: style.position, background: style.backgroundColor, overflowX: cell.scrollWidth > cell.clientWidth + 1 };
    };
    const labelBoxes = first.map(box), valueBoxes = last.map(box);
    return {
      width: el.clientWidth, scrollWidth: el.scrollWidth, scrollLeft: el.scrollLeft,
      region: { left: region.left, right: region.right }, labelBoxes, valueBoxes,
      allLabelsVisible: labelBoxes.every(b => b.left >= region.left - 1 && b.right <= region.right + 1),
      lastColumnVisible: valueBoxes.every(b => b.left >= region.left - 1 && b.right <= region.right + 1),
      labelsAndLastColumnSeparate: valueBoxes.every((b, i) => b.left >= labelBoxes[i].right - 1),
      hasCellOverflow: rows.some(row => [...row.cells].some(cell => cell.scrollWidth > cell.clientWidth + 1))
    };
  });
}

async function assertHitTestedColumn(table, index) {
  // Locators scroll each pinned label vertically into view. Hit tests establish
  // which cell owns each point; separate alpha assertions below check opacity.
  const rows = table.locator('thead tr,tbody tr');
  for (let rowIndex = 0; rowIndex < await rows.count(); rowIndex++) {
    const label = rows.nth(rowIndex).locator(':scope > :first-child');
    await label.scrollIntoViewIfNeeded();
    const result = await rows.nth(rowIndex).evaluate((row, index) => {
      return [row.cells[0], row.cells[index]].map(cell => {
        const r = cell.getBoundingClientRect();
        const top = Math.max(1, r.top + 2), bottom = Math.min(innerHeight - 1, r.bottom - 2), y = (top + bottom) / 2;
        const points = [r.left + 4, r.left + r.width / 2, r.right - 4];
        return { text: cell.textContent.trim(), hitTested: bottom > top && points.every(x => cell.contains(document.elementFromPoint(x, y))), y };
      });
    }, index);
    assert.ok(result.every(cell => cell.hitTested), 'Row label and value must own their hit-test points: ' + JSON.stringify(result));
  }
}

async function checkEvidenceTable(page, world) {
  const topic = world.locator('[data-depth-topic]');
  assert.equal(await topic.count(), 1, 'One real topic is mounted');
  const id = await topic.getAttribute('data-depth-topic');
  const authored = await world.evaluate(id => window.BIO_DEPTH[id].investigation, id);
  const table = world.locator(selector);
  assert.equal(await table.count(), 1);
  assert.equal(await table.getAttribute('role'), 'region');
  assert.equal(await table.getAttribute('aria-label'), 'Evidence table');
  assert.equal(await table.getAttribute('tabindex'), '0');
  assert.equal(await table.locator('table').count(), 1, 'Keep a native table');
  assert.equal(await table.locator('caption').innerText(), authored.title);
  assert.deepEqual(await table.locator('thead th[scope="col"]').allTextContents(), authored.columns);
  assert.equal(await table.locator('tbody th[scope="row"]').count(), authored.rows.length);
  assert.deepEqual(await table.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))), authored.rows, 'Every numeric/text value remains authored content');
  const stickyBackgrounds = await table.evaluate(el => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    return [...el.querySelectorAll('thead th:first-child,tbody th[scope="row"]')].flatMap(cell => {
      const style = getComputedStyle(cell);
      if (style.position !== 'sticky') return [];
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = 'rgba(0,0,0,0)';
      context.fillStyle = style.backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return [{ text: cell.textContent.trim(), background: style.backgroundColor, alpha: context.getImageData(0, 0, 1, 1).data[3] }];
    });
  });
  assert.ok(stickyBackgrounds.every(cell => cell.alpha === 255), 'Sticky row/column labels require an opaque background: ' + JSON.stringify(stickyBackgrounds));
  await table.scrollIntoViewIfNeeded();
  await scrollEvidenceTableEdge(page, table, 'left');
  const before = await evidenceTableMetrics(table), columns = [];
  assert.ok(before.allLabelsVisible, 'All row labels are initially visible');
  for (let index = 1; index < authored.columns.length; index++) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const position = await table.evaluate((el, index) => {
        const row = el.querySelector('thead tr'), label = row.cells[0].getBoundingClientRect(), cell = row.cells[index].getBoundingClientRect(), region = el.getBoundingClientRect();
        return { left: cell.left, right: cell.right, labelRight: label.right, regionRight: region.right };
      }, index);
      if (position.left >= position.labelRight - 1 && position.right <= position.regionRight + 1) break;
      await table.focus();
      await page.keyboard.press(position.right > position.regionRight + 1 ? 'ArrowRight' : 'ArrowLeft');
      await settleScroll(table);
    }
    const geometry = await table.evaluate((el, index) => {
      const region = el.getBoundingClientRect();
      return [...el.querySelectorAll('thead tr,tbody tr')].map(row => {
        const label = row.cells[0].getBoundingClientRect(), value = row.cells[index].getBoundingClientRect();
        return { labelInside: label.left >= region.left - 1 && label.right <= region.right + 1, valueInside: value.left >= label.right - 1 && value.right <= region.right + 1 };
      });
    }, index);
    assert.ok(geometry.every(row => row.labelInside && row.valueInside), id + ': complete labels and column ' + index + ' must fit together');
    await assertHitTestedColumn(table, index);
    columns.push({ index, completeLabelsAndValuesVisible: true, hitTestedCells: true });
  }
  await scrollEvidenceTableEdge(page, table, 'right');
  const after = await evidenceTableMetrics(table);
  assert.ok(after.allLabelsVisible && after.lastColumnVisible && after.labelsAndLastColumnSeparate, 'Labels and final values stay simultaneously visible');
  assert.equal(after.hasCellOverflow, false, 'Long labels, headings and values wrap without internal clipping');
  await assertHitTestedColumn(table, authored.columns.length - 1);
  assert.equal(await table.evaluate(el => el === document.activeElement && el.matches(':focus-visible')), true, 'Native keyboard focus remains visible on the scroll region');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No outer page overflow');
  assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No lesson overflow');
  return { id, columns, tableWidth: after.width, tableScrollWidth: after.scrollWidth, labelsAndValuesVisible: true, stickyBackgrounds, nativeKeyboardFocus: true };
}

module.exports = { checkEvidenceTable, evidenceTableMetrics, scrollEvidenceTableEdge };
