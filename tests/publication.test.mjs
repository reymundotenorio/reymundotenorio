import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

test('manual maintenance needs no collection command, workflow or stored API credential', () => {
  const root = new URL('../', import.meta.url);
  const scripts = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).scripts;
  assert.equal(scripts.check, 'npm run build && npm test && npm run validate');
  assert(!('collect' in scripts));
  assert(!('refresh' in scripts));
  assert(!existsSync(new URL('scripts/collect.mjs', root)));
  assert(!existsSync(new URL('.github/workflows/refresh-profile.yml', root)));
  const guide = readFileSync(new URL('MAINTENANCE.md', root), 'utf8');
  assert.match(guide, /maintained manually/i);
  assert.doesNotMatch(guide, /PROFILE_STATS_TOKEN|npm run collect|scheduled workflow uses|authenticated GitHub CLI/i);
});
