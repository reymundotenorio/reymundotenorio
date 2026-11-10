import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const snapshot = new URL('metrics.json', root);
const canary = 'private-example/confidential-project github_pat_synthetic_canary';

function runCollector(mode) {
  const bin = mkdtempSync(join(tmpdir(), 'profile-diagnostics-'));
  const before = readFileSync(snapshot, 'utf8');
  try {
    writeFileSync(join(bin, 'gh'), `#!/usr/bin/env node
const mode = process.env.FIXTURE_MODE;
const canary = ${JSON.stringify(canary)};
const before = JSON.parse(process.env.FIXTURE_BASELINE);
if (!mode.startsWith('coverage-')) {
  const response = mode === 'credentials'
    ? { message: 'Bad credentials', private: canary }
    : { errors: [{ type: mode, message: canary, path: [canary] }] };
  process.stdout.write(JSON.stringify(response));
  process.stderr.write(canary);
  process.exit(1);
}
const query = process.argv.at(-1);
let data;
if (query.includes('contributionYears')) {
  data = { viewer: { login: 'reymundotenorio', createdAt: '2015-01-01T00:00:00Z', contributionsCollection: { contributionYears: before.years.map(y => y.year) } } };
} else if (query.includes('y' + before.years[0].year + ':')) {
  data = { viewer: Object.fromEntries(before.years.map(y => ['y' + y.year, { restrictedContributionsCount: y.privateContributions, contributionCalendar: { totalContributions: y.contributions } }])) };
} else if (query.includes('contributionDays')) {
  data = { viewer: { contributionsCollection: { restrictedContributionsCount: before.activity.privateContributions, contributionCalendar: { totalContributions: before.activity.contributions, weeks: [{ contributionDays: [{ date: before.updatedDate, contributionCount: before.activity.contributions }] }] } } } };
} else if (query.includes('authored:search')) {
  data = { authored: { issueCount: before.lifetime.authoredPullRequests - (mode === 'coverage-history' ? 1 : 0) }, merged: { issueCount: before.lifetime.mergedPullRequests }, reviewed: { issueCount: before.lifetime.reviewedPullRequests } };
} else if (mode === 'coverage-unavailable' && !query.includes('ownerAffiliations')) {
  data = { viewer: { result: { totalCount: 1, nodes: [null], pageInfo: { hasNextPage: false, endCursor: null } } } };
} else {
  const count = query.includes('ownerAffiliations') ? Math.floor(before.languages.repositories * (mode === 'coverage-repositories' ? 0.8 : 1)) : 0;
  data = { viewer: { result: { totalCount: count, nodes: Array.from({ length: count }, (_, id) => ({ id: 'synthetic-' + id, isFork: false, languages: { totalCount: 1, edges: [{ size: 1, node: { name: 'TypeScript' } }] } })), pageInfo: { hasNextPage: false, endCursor: null } } } };
}
process.stdout.write(JSON.stringify({ data }));
`, { mode: 0o755 });
    const result = spawnSync(process.execPath, ['scripts/collect.mjs'], {
      cwd: root,
      encoding: 'utf8',
      env: {
        PATH: `${bin}:${process.env.PATH}`,
        GITHUB_ACTIONS: 'true',
        GH_TOKEN: mode === 'missing' ? '' : 'synthetic-test-token',
        GITHUB_TOKEN: '',
        FIXTURE_MODE: mode,
        FIXTURE_BASELINE: before,
      },
    });
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(snapshot, 'utf8'), before);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /private-example|confidential-project|github_pat_|synthetic-test-token|GraphQL|query \{/);
    return result.stderr;
  } finally {
    rmSync(bin, { recursive: true, force: true });
  }
}

test('missing credential diagnostics identify the stage without exposing environment values', () => {
  assert.match(runCollector('missing'), /stage=credentials code=MISSING_CREDENTIAL/);
});

for (const [mode, code] of [
  ['FORBIDDEN', 'GITHUB_FORBIDDEN'],
  ['credentials', 'GITHUB_BAD_CREDENTIALS'],
  ['RATE_LIMITED', 'GITHUB_RATE_LIMITED'],
  ['UNKNOWN_PRIVATE_ERROR', 'GITHUB_REQUEST_FAILED'],
]) {
  test(`GitHub failure ${mode} produces only an allowlisted account-stage diagnostic`, () => {
    assert.match(runCollector(mode), new RegExp(`stage=account code=${code}\\]`));
  });
}

test('unavailable contributed repository entries have a distinct safe diagnostic', () => {
  assert.match(runCollector('coverage-unavailable'), /stage=contributed-repositories code=UNAVAILABLE_REPOSITORY_ENTRIES\]/);
});

for (const [mode, code] of [
  ['coverage-history', 'HISTORICAL_COVERAGE_DECREASED'],
  ['coverage-repositories', 'REPOSITORY_COVERAGE_DECREASED'],
]) {
  test(`${mode} reports the coverage guard without replacing the snapshot`, () => {
    assert.match(runCollector(mode), new RegExp(`stage=coverage code=${code}\\]`));
  });
}
