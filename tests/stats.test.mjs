import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarize } from '../scripts/stats.mjs';

const repo = (id, owned, contributed, bytes, extra = {}) => ({
  id, owned, contributed, isFork: false,
  languages: { totalCount: 1, edges: [{ size: bytes, node: { name: 'TypeScript', color: '#3178c6' } }] },
  ...extra,
});
const input = () => ({
  collectedAt: '2026-11-06T04:00:00.000Z',
  period: { from: '2025-11-06T04:00:00.000Z', to: '2026-11-06T04:00:00.000Z' },
  years: [
    { year: 2025, total: 100, restricted: 80 },
    { year: 2026, total: 250, restricted: 220 },
  ],
  calendar: { total: 10, restricted: 8, days: [{ date: '2026-11-04', count: 3 }, { date: '2026-11-05', count: 7 }] },
  pullRequests: { authored: 20, merged: 18, reviewed: 30 },
  repositories: [repo('private-A', true, false, 100), repo('organization-B', false, true, 200)],
  publicProfile: { login: 'reymundotenorio', since: 2015 },
});

test('calendar totals include private activity once, never relabel restricted activity as commits', () => {
  const data = summarize(input());
  assert.equal(data.lifetime.contributions, 350);
  assert.equal(data.lifetime.privateContributions, 300);
  assert.equal(data.activity.contributions, 10);
  assert.equal(data.activity.privateContributions, 8);
  assert.equal(data.activity.activeDays, 2);
  assert.equal(data.lifetime.authoredPullRequests, 20);
  assert.equal(data.lifetime.reviewedPullRequests, 30);
  assert(!('commits' in data.lifetime));
  assert.equal(data.updatedDate, '2026-11-05');
});
test('unknown API fields and private identifiers do not survive the strict output schema', () => {
  const raw = input();
  raw.secret = 'ghp_not-a-real-token';
  raw.repositories[0].nameWithOwner = 'private-company/confidential-project';
  raw.repositories[0].url = 'https://private.invalid/internal';
  const json = JSON.stringify(summarize(raw));
  for (const word of ['private-A', 'organization-B', 'confidential', 'private.invalid', 'ghp_', 'nameWithOwner', 'secret']) assert(!json.includes(word));
});
test('language footprint includes owned or verified contributed repos, not unrelated access, forks or duplicates', () => {
  const raw = input();
  raw.repositories.push(repo('unrelated-C', false, false, 10000), repo('fork-D', true, true, 10000, { isFork: true }), raw.repositories[0]);
  const data = summarize(raw);
  assert.equal(data.languages.repositories, 2);
  assert.equal(data.languages.totalBytes, 300);
  assert.deepEqual(data.languages.items, [{ name: 'TypeScript', bytes: 300, repositories: 2, share: 100 }]);
});
test('partial language pages, invalid counts and duplicate periods fail closed', () => {
  const badCount = input(); badCount.calendar.restricted = 11;
  assert.throws(() => summarize(badCount));
  const partial = input(); partial.repositories[0].languages.totalCount = 2;
  assert.throws(() => summarize(partial));
  const duplicate = input(); duplicate.years.push(duplicate.years[0]);
  assert.throws(() => summarize(duplicate));
  const negative = input(); negative.pullRequests.authored = -1;
  assert.throws(() => summarize(negative));
});
