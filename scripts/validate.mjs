import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function fields(value, names) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Invalid aggregate object');
  assert.deepEqual(Object.keys(value).sort(), names.split(' ').sort(), 'Unexpected aggregate fields');
}
function count(value) { assert(Number.isSafeInteger(value) && value >= 0, 'Invalid numeric aggregate'); }
function date(value) { assert(typeof value === 'string' && Number.isFinite(Date.parse(value)), 'Invalid aggregate date'); }

export function validateSnapshot(data) {
  fields(data, 'version username since collectedAt updatedDate period lifetime activity years languages');
  assert.equal(data.version, 1);
  assert.equal(data.username, 'reymundotenorio');
  count(data.since); date(data.collectedAt);
  assert.match(data.updatedDate, /^\d{4}-\d{2}-\d{2}$/);
  fields(data.period, 'from to'); date(data.period.from); date(data.period.to);
  assert(Date.parse(data.period.from) < Date.parse(data.period.to));
  assert(Date.parse(data.period.to) <= Date.parse(data.collectedAt));
  fields(data.lifetime, 'contributions privateContributions authoredPullRequests mergedPullRequests reviewedPullRequests activeYears');
  fields(data.activity, 'contributions privateContributions activeDays');
  for (const group of [data.lifetime, data.activity]) {
    Object.values(group).forEach(count);
    assert(group.privateContributions <= group.contributions);
  }
  assert(data.lifetime.mergedPullRequests <= data.lifetime.authoredPullRequests);
  assert(data.activity.activeDays <= 367);
  assert(Array.isArray(data.years) && data.years.length > 0);
  let total = 0, restricted = 0, previousYear = 0, activeYears = 0;
  for (const year of data.years) {
    fields(year, 'year contributions privateContributions'); Object.values(year).forEach(count);
    assert(year.year >= data.since && year.year > previousYear);
    assert(year.privateContributions <= year.contributions);
    previousYear = year.year; total += year.contributions; restricted += year.privateContributions;
    if (year.contributions > 0) activeYears++;
  }
  assert.equal(data.lifetime.contributions, total);
  assert.equal(data.lifetime.privateContributions, restricted);
  assert.equal(data.lifetime.activeYears, activeYears);
  fields(data.languages, 'repositories totalBytes scope items');
  count(data.languages.repositories); count(data.languages.totalBytes);
  assert.equal(data.languages.scope, 'owned-and-recent-contributed-nonfork');
  assert(Array.isArray(data.languages.items));
  let bytes = 0, share = 0; const names = new Set();
  for (const language of data.languages.items) {
    fields(language, 'name bytes repositories share');
    assert.match(language.name, /^[\w .+#()-]{1,50}$/);
    assert(!names.has(language.name)); names.add(language.name);
    count(language.bytes); count(language.repositories);
    assert(language.repositories <= data.languages.repositories);
    assert(Number.isFinite(language.share) && language.share >= 0 && language.share <= 100);
    bytes += language.bytes; share += language.share;
  }
  assert.equal(bytes, data.languages.totalBytes);
  assert.equal(Math.round(share * 10), bytes > 0 ? 1000 : 0);
  return data;
}

export function assertCoverage(before, after) {
  validateSnapshot(before); validateSnapshot(after);
  // A narrower credential must not silently overwrite the approved historical scope.
  for (const key of ['contributions', 'privateContributions', 'authoredPullRequests', 'mergedPullRequests', 'reviewedPullRequests']) {
    assert(after.lifetime[key] >= before.lifetime[key], 'Historical coverage decreased; review credential access before refreshing.');
  }
  assert(after.languages.repositories >= before.languages.repositories * 0.85, 'Repository coverage decreased; review credential access before refreshing.');
}

export async function validatePublication(root = fileURLToPath(new URL('../', import.meta.url))) {
  const data = validateSnapshot(JSON.parse(await readFile(resolve(root, 'metrics.json'), 'utf8')));
  const expected = ['header', 'activity', 'languages'].flatMap(kind => ['dark', 'light'].flatMap(theme => ['', '-tablet', '-mobile'].map(size => `${kind}-en-${theme}${size}.svg`)));
  assert.deepEqual((await readdir(resolve(root, 'assets'))).sort(), expected.sort(), 'Unexpected publication assets');
  for (const file of [...expected.map(name => `assets/${name}`), 'README.md']) {
    const source = await readFile(resolve(root, file), 'utf8');
    assert.doesNotMatch(source, /github_pat_|gh[pousr]_[a-zA-Z0-9]+|R_kg[A-Za-z0-9_-]+|nameWithOwner|node_id|mailto:|tel:|\/Users\/|<script|foreignObject|onload=/i, 'Unsafe publication content');
    if (file.endsWith('.svg')) assert.doesNotMatch(source, /(?:href|src)=["']https?:\/\//i);
  }
  return data;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  validatePublication().then(() => console.log('Validated aggregate-only profile assets.')).catch(() => {
    console.error('Publication validation failed; nothing was published.'); process.exitCode = 1;
  });
}
