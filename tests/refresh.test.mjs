import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { validateSnapshot, assertCoverage } from '../scripts/validate.mjs';

const root = new URL('../', import.meta.url);
const input = () => JSON.parse(readFileSync(new URL('metrics.json', root), 'utf8'));

test('publication rejects unexpected fields anywhere in an otherwise valid aggregate', () => {
  validateSnapshot(input());
  for (const mutate of [
    data => { data.repository = 'confidential-example'; },
    data => { data.lifetime.repositories = ['confidential-example']; },
    data => { data.years[0].url = 'https://internal.invalid'; },
    data => { data.languages.items[0].owner = 'confidential-example'; },
  ]) {
    const data = input(); mutate(data);
    assert.throws(() => validateSnapshot(data), /Unexpected aggregate fields/);
  }
});

test('publication rejects inconsistent totals and invalid numeric aggregates', () => {
  for (const mutate of [
    data => { data.lifetime.authoredPullRequests = -1; },
    data => { data.years[0].contributions += 1; },
    data => { data.languages.items[0].bytes += 1; },
    data => { data.activity.privateContributions = data.activity.contributions + 1; },
    data => { data.username = 'someone-else'; },
  ]) {
    const data = input(); mutate(data);
    assert.throws(() => validateSnapshot(data));
  }
});

test('lost private coverage does not silently replace the approved full snapshot', () => {
  const before = input(), after = input();
  assertCoverage(before, after);
  after.lifetime.authoredPullRequests -= 1;
  assert.throws(() => assertCoverage(before, after), /coverage/);
  const fewerRepositories = input();
  fewerRepositories.languages.repositories = Math.floor(before.languages.repositories * 0.8);
  assert.throws(() => assertCoverage(before, fewerRepositories), /coverage/);
});

test('Actions without a collection credential fails before replacing any snapshot', () => {
  const file = new URL('metrics.json', root), before = readFileSync(file, 'utf8');
  const result = spawnSync(process.execPath, ['scripts/collect.mjs'], {
    cwd: root,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, GITHUB_ACTIONS: 'true', GH_TOKEN: '', GITHUB_TOKEN: '' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /PROFILE_STATS_TOKEN/);
  assert.equal(readFileSync(file, 'utf8'), before);
});
