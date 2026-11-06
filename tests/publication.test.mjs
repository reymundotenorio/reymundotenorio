import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validatePublication } from '../scripts/validate.mjs';

test('generated public assets pass the aggregate schema and credential-free validation', async () => {
  const data = await validatePublication();
  assert.equal(data.username, 'reymundotenorio');
});

test('the English README matches the generator output', async () => {
  const { readme } = await import('../scripts/render.mjs');
  const data = await validatePublication();
  const content = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.equal(content, readme(data));
});
