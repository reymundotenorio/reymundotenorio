import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validatePublication } from '../scripts/validate.mjs';

test('generated public assets pass the aggregate schema and credential-free validation', async () => {
  const data = await validatePublication();
  assert.equal(data.username, 'reymundotenorio');
});

test('committed readmes match the generator output for each language', async () => {
  const { readme } = await import('../scripts/render.mjs');
  const data = await validatePublication();
  for (const lang of ['en', 'es']) {
    const filename = lang === 'en' ? 'README.md' : 'README.es.md';
    const content = readFileSync(new URL(`../${filename}`, import.meta.url), 'utf8');
    assert.equal(content, readme(data, lang));
  }
});
