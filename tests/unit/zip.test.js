import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { crc32, createZip } from '../../src/zip.js';

test('crc32 matches the standard check values', () => {
  assert.equal(crc32(new TextEncoder().encode('hello')), 0x3610a686);
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('createZip builds an archive that unzip accepts and extracts byte-for-byte', () => {
  const dir = mkdtempSync(join(tmpdir(), 'unslop-zip-'));
  try {
    const files = [
      { name: 'index.html', text: '<h1>Hello ✓ नमस्ते</h1>' },
      { name: 'about.html', text: '<p>About</p>' },
    ];
    const zipPath = join(dir, 'site.zip');
    writeFileSync(zipPath, createZip(files));
    const listing = execFileSync('unzip', ['-t', zipPath]).toString();
    assert.match(listing, /No errors detected/);
    execFileSync('unzip', ['-q', zipPath, '-d', join(dir, 'out')]);
    for (const f of files) assert.equal(readFileSync(join(dir, 'out', f.name), 'utf8'), f.text);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
