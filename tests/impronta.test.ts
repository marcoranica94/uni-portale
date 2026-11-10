/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { improntaAppunti } from '../scripts/impronta-appunti.mjs';

test('impronta: stabile, sensibile al contenuto, ignora file non html e "_"', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'impronta-'));
  try {
    await writeFile(path.join(dir, '01-a.html'), '<p>uno</p>');
    await writeFile(path.join(dir, '02-b.html'), '<p>due</p>');
    const prima = await improntaAppunti(dir);
    assert.match(prima, /^[0-9a-f]{16}$/);
    await writeFile(path.join(dir, '_piano.md'), 'nota');
    await writeFile(path.join(dir, 'stile.css'), 'p{}');
    assert.equal(await improntaAppunti(dir), prima);
    await writeFile(path.join(dir, '02-b.html'), '<p>due!</p>');
    assert.notEqual(await improntaAppunti(dir), prima);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
