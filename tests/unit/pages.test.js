import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePageLink, uniquePageName } from '../../src/pages.js';

const pages = ['index.html', 'about.html', 'pricing.html'];

test('matches a plain file name', () => {
  assert.equal(resolvePageLink('about.html', pages), 1);
});

test('ignores ./ and leading slashes, hashes and queries', () => {
  assert.equal(resolvePageLink('./pricing.html#plans', pages), 2);
  assert.equal(resolvePageLink('/about.html?x=1', pages), 1);
});

test('treats "/" and "./" as the home page when index.html exists', () => {
  assert.equal(resolvePageLink('/', pages), 0);
  assert.equal(resolvePageLink('./', pages), 0);
});

test('matches case-insensitively', () => {
  assert.equal(resolvePageLink('About.HTML', pages), 1);
});

test('returns -1 for external links, anchors and unknown pages', () => {
  assert.equal(resolvePageLink('https://example.com/about.html', pages), -1);
  assert.equal(resolvePageLink('#contact', pages), -1);
  assert.equal(resolvePageLink('mailto:a@b.com', pages), -1);
  assert.equal(resolvePageLink('blog.html', pages), -1);
});

test('uniquePageName adds a number when a name is taken', () => {
  assert.equal(uniquePageName('about.html', pages), 'about-2.html');
  assert.equal(uniquePageName('new.html', pages), 'new.html');
  assert.equal(uniquePageName('page', pages), 'page.html');
});
