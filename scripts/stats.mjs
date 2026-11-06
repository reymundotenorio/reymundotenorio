import assert from 'node:assert/strict';

const count = value => { assert(Number.isSafeInteger(value) && value >= 0, 'Invalid numeric aggregate'); return value; };
const date = value => { assert(Number.isFinite(Date.parse(value)), 'Invalid date'); return value; };

export function summarize(raw) {
  const collectedAt = date(raw.collectedAt);
  const from = date(raw.period.from), to = date(raw.period.to);
  assert(Date.parse(from) < Date.parse(to) && Date.parse(to) <= Date.parse(collectedAt), 'Invalid period');
  assert(/^[a-zA-Z0-9-]{1,39}$/.test(raw.publicProfile.login));
  const seenYears = new Set();
  const years = raw.years.map(entry => {
    const year = count(entry.year); assert(year >= 2008 && !seenYears.has(year), 'Duplicate/invalid year'); seenYears.add(year);
    const contributions = count(entry.total), privateContributions = count(entry.restricted);
    assert(privateContributions <= contributions, 'Private activity exceeds total');
    return { year, contributions, privateContributions };
  }).sort((a, b) => a.year - b.year);
  const total = count(raw.calendar.total), restricted = count(raw.calendar.restricted);
  assert(restricted <= total, 'Private activity exceeds total');
  const seenDays = new Set();
  let dailyTotal = 0, activeDays = 0;
  for (const day of raw.calendar.days) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(day.date) && !seenDays.has(day.date), 'Duplicate/invalid day');
    seenDays.add(day.date); dailyTotal += count(day.count); if (day.count > 0) activeDays++;
  }
  assert(dailyTotal === total, 'Incomplete contribution calendar');
  const authoredPullRequests = count(raw.pullRequests.authored), mergedPullRequests = count(raw.pullRequests.merged), reviewedPullRequests = count(raw.pullRequests.reviewed);
  assert(mergedPullRequests <= authoredPullRequests, 'Merged exceeds authored PRs');

  const repos = new Map(), languages = new Map();
  for (const repo of raw.repositories) {
    if (repo.isFork || !(repo.owned || repo.contributed) || repos.has(repo.id)) continue;
    assert(repo.languages.totalCount === repo.languages.edges.length, 'Incomplete language page');
    if (!repo.languages.edges.length) continue;
    repos.set(repo.id, true);
    const names = new Set();
    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      assert(typeof name === 'string' && /^[\w .+#()-]{1,50}$/.test(name), 'Invalid language');
      const bytes = count(edge.size);
      if (!bytes) continue;
      const existing = languages.get(name) || { name, bytes: 0, repositories: 0 };
      existing.bytes += bytes; if (!names.has(name)) existing.repositories++;
      names.add(name); languages.set(name, existing);
    }
  }
  const totalBytes = [...languages.values()].reduce((sum, language) => sum + language.bytes, 0);
  const items = [...languages.values()].sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name, 'en'));
  const shares = items.map(item => totalBytes ? item.bytes / totalBytes * 1000 : 0);
  const units = shares.map(Math.floor);
  const order = shares.map((value, index) => ({ index, remainder: value - units[index] })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let left = totalBytes ? 1000 - units.reduce((a, b) => a + b, 0) : 0, index = 0; left > 0; left--, index++) units[order[index].index]++;

  return {
    version: 1,
    username: raw.publicProfile.login,
    since: count(raw.publicProfile.since),
    collectedAt,
    updatedDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Managua', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(collectedAt)),
    period: { from, to },
    lifetime: {
      contributions: years.reduce((sum, year) => sum + year.contributions, 0),
      privateContributions: years.reduce((sum, year) => sum + year.privateContributions, 0),
      authoredPullRequests, mergedPullRequests, reviewedPullRequests,
      activeYears: years.filter(year => year.contributions > 0).length,
    },
    activity: { contributions: total, privateContributions: restricted, activeDays },
    years,
    languages: {
      repositories: repos.size,
      totalBytes,
      scope: 'owned-and-recent-contributed-nonfork',
      items: items.map((item, index) => ({ ...item, share: units[index] / 10 })),
    },
  };
}
