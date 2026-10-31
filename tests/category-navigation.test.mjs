import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCategoryNavigation } from '../src/scripts/category-navigation.js';

function fixture(mobile) {
  const disclosure = { open: true };
  const current = { textContent: '' };
  const viewport = { matches: mobile, addEventListener(type, callback) { this.change = callback; } };
  const root = { querySelector: selector => selector === '.category-browser' ? disclosure : current };
  return { disclosure, current, viewport, controller: createCategoryNavigation(root, viewport) };
}

test('desktop categories stay open and display the selected category name', () => {
  const { controller, disclosure, current } = fixture(false);
  controller.update({ type: 'series', value: 'nubo' }, 'AI 주거지원 서비스 누보 개발기');
  assert.equal(disclosure.open, true);
  assert.equal(current.textContent, 'AI 주거지원 서비스 누보 개발기');
  controller.update(null, '');
  assert.equal(current.textContent, '전체 글');
});

test('mobile categories start collapsed and close only on category changes', () => {
  const { controller, disclosure } = fixture(true);
  assert.equal(disclosure.open, false);
  disclosure.open = true;
  controller.update(null, '');
  assert.equal(disclosure.open, true, 'searching does not close the categories');
  controller.update({ type: 'topic', value: 'Linux' }, 'Linux');
  assert.equal(disclosure.open, false);
  disclosure.open = true;
  controller.update({ type: 'topic', value: 'Linux' }, 'Linux');
  assert.equal(disclosure.open, true);
  controller.update(null, '');
  assert.equal(disclosure.open, false, 'resetting to all posts also closes the categories');
});

test('resizing restores desktop categories and collapses the mobile disclosure', () => {
  const { controller, disclosure, viewport, current } = fixture(true);
  controller.update({ type: 'series', value: 'msa' }, '서비스 운영 문제 재현과 개선');
  viewport.matches = false;
  viewport.change();
  assert.equal(disclosure.open, true);
  viewport.matches = true;
  viewport.change();
  assert.equal(disclosure.open, false);
  assert.equal(current.textContent, '서비스 운영 문제 재현과 개선');
});
