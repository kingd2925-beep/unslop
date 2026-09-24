// Builds dist/unslop.html: the whole editor in one file that works offline by double-click.
// No bundler: modules are joined in dependency order inside one strict function.
// The build fails if two modules declare the same top-level name, or if the output could break its <script> tag.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = 'src/main.js';
const IMPORT_LINE = /^import\s[^;]*?from\s+['"](\.\/[^'"]+)['"];?\s*$/gm;
const TOP_LEVEL_DECL = /^(?:export\s+)?(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;

function moduleOrder(entry) {
  const order = [];
  const seen = new Set();
  const visit = (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    const source = readFileSync(join(ROOT, path), 'utf8');
    for (const [, spec] of source.matchAll(IMPORT_LINE)) visit(join(dirname(path), spec));
    order.push(path);
  };
  visit(entry);
  return order;
}

function stripModuleSyntax(source) {
  return source
    .replace(IMPORT_LINE, '')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+(?=(async\s+)?function|const|let|class)/gm, '');
}

function assertUniqueNames(modules) {
  const owner = new Map();
  for (const { path, source } of modules) {
    for (const [, name] of source.matchAll(TOP_LEVEL_DECL)) {
      if (owner.has(name)) throw new Error(`"${name}" is declared in both ${owner.get(name)} and ${path}. Rename one.`);
      owner.set(name, path);
    }
  }
}

function build() {
  const modules = moduleOrder(ENTRY).map((path) => ({ path, source: readFileSync(join(ROOT, path), 'utf8') }));
  assertUniqueNames(modules);
  const bundle = modules.map(({ path, source }) => `// ---- ${path}\n${stripModuleSyntax(source)}`).join('\n');
  if (/<\/script/i.test(bundle)) throw new Error('The bundle contains "</script", which would end the inline script early.');
  if (/^\s*(import|export)\s/m.test(bundle)) throw new Error('Unconverted import/export left in the bundle.');

  const css = readFileSync(join(ROOT, 'styles/app.css'), 'utf8');
  const page = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const CSS_TAG = '<link rel="stylesheet" href="styles/app.css">';
  const JS_TAG = '<script type="module" src="src/main.js"></script>';
  if (!page.includes(CSS_TAG) || !page.includes(JS_TAG)) throw new Error('index.html markers not found; update scripts/build.mjs.');
  const html = page
    .replace(CSS_TAG, () => `<style>\n${css}</style>`)
    .replace(JS_TAG, () => `<script>\n(function () {\n'use strict';\n${bundle}\n})();\n</script>`);

  mkdirSync(join(ROOT, 'dist'), { recursive: true });
  writeFileSync(join(ROOT, 'dist/unslop.html'), html);
  console.log(`dist/unslop.html written: ${modules.length} modules, ${(html.length / 1024).toFixed(1)} KB`);
}

build();
