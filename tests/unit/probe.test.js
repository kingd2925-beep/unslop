import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreviewHtml, runtimeStyles } from '../../src/probe.js';

test('buildPreviewHtml injects the helper right before the last </body>', () => {
  const out = buildPreviewHtml('<html><body><p>Hi</p></body></html>', 'tok123');
  assert.match(out, /<p>Hi<\/p><script data-unslop-probe>[\s\S]*<\/script><\/body><\/html>$/);
  assert.ok(out.includes('"tok123"'));
});

test('buildPreviewHtml appends the helper when there is no body tag', () => {
  const out = buildPreviewHtml('<h1>Fragment</h1>', 'tok');
  assert.ok(out.startsWith('<h1>Fragment</h1><script data-unslop-probe>'));
});

test('the helper token is JSON-escaped', () => {
  const out = buildPreviewHtml('<body></body>', 'a"b');
  assert.ok(out.includes('"a\\"b"'));
});

test('runtimeStyles returns only styles that were not in the original page', () => {
  const original = ['body{color:red}'];
  const rendered = ['body{color:red}', '.bg-indigo-600{background:#4f46e5}', ''];
  assert.equal(runtimeStyles(original, rendered), '.bg-indigo-600{background:#4f46e5}');
});
