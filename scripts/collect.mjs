import { execFileSync } from 'node:child_process';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { summarize } from './stats.mjs';
import { validateSnapshot, assertCoverage } from './validate.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const login = 'reymundotenorio';
const githubCodes = new Set(['GITHUB_FORBIDDEN', 'GITHUB_BAD_CREDENTIALS', 'GITHUB_RATE_LIMITED', 'GITHUB_REQUEST_FAILED']);
const failureCodes = new Map([
  ['Configure the dedicated PROFILE_STATS_TOKEN Actions secret before refreshing.', 'MISSING_CREDENTIAL'],
  ['The authenticated account is not the approved profile.', 'ACCOUNT_MISMATCH'],
  ['Historical coverage decreased; review credential access before refreshing.', 'HISTORICAL_COVERAGE_DECREASED'],
  ['Repository coverage decreased; review credential access before refreshing.', 'REPOSITORY_COVERAGE_DECREASED'],
  ['Repository coverage changed during collection; retry before rendering.', 'REPOSITORY_COVERAGE_CHANGED'],
  ['Invalid pagination; no partial result is rendered.', 'INVALID_PAGINATION'],
  ['Repository pages are incomplete.', 'INCOMPLETE_REPOSITORY_PAGES'],
]);
function githubFailure(response) {
  const types = Array.isArray(response?.errors) ? response.errors.map(error => error?.type ?? error?.extensions?.code) : [];
  let code = 'GITHUB_REQUEST_FAILED';
  if (response?.message === 'Bad credentials') code = 'GITHUB_BAD_CREDENTIALS';
  else if (types.includes('FORBIDDEN') || types.includes('INSUFFICIENT_SCOPES')) code = 'GITHUB_FORBIDDEN';
  else if (types.includes('RATE_LIMITED')) code = 'GITHUB_RATE_LIMITED';
  return Object.assign(new Error('GitHub read request failed.'), { code });
}
function graphql(query) {
  let result;
  try { result = JSON.parse(execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })); }
  catch (error) {
    let response;
    try { response = JSON.parse(error.stdout); } catch { /* Never expose raw command output. */ }
    throw githubFailure(response);
  }
  if (result.errors || !result.data) throw githubFailure(result);
  return result.data;
}
const languageFields = 'id isFork languages(first:100,orderBy:{field:SIZE,direction:DESC}) { totalCount edges { size node { name } } }';
function readRepositories(field, args) {
  let after = null, expected = null; const nodes = [], cursors = new Set();
  do {
    const suffix = after ? `,after:${JSON.stringify(after)}` : '';
    const connection = graphql(`query { viewer { result:${field}(first:100,${args}${suffix}) { totalCount nodes { ${languageFields} } pageInfo { hasNextPage endCursor } } } }`).viewer.result;
    if (expected === null) expected = connection.totalCount;
    if (expected !== connection.totalCount) throw new Error('Repository coverage changed during collection; retry before rendering.');
    nodes.push(...connection.nodes.filter(Boolean));
    if (!connection.pageInfo.hasNextPage) break;
    after = connection.pageInfo.endCursor;
    if (!after || cursors.has(after)) throw new Error('Invalid pagination; no partial result is rendered.');
    cursors.add(after);
  } while (true);
  if (nodes.length !== expected) throw new Error('Repository pages are incomplete.');
  return nodes;
}

async function collectSnapshot(progress) {
  if (process.env.GITHUB_ACTIONS === 'true' && !process.env.GH_TOKEN) {
    throw new Error('Configure the dedicated PROFILE_STATS_TOKEN Actions secret before refreshing.');
  }
  const now = new Date(), to = now.toISOString();
  const start = new Date(now); start.setUTCFullYear(start.getUTCFullYear() - 1);
  const from = start.toISOString();
  progress.stage = 'account';
  const meta = graphql(`query { viewer { login createdAt contributionsCollection { contributionYears } } }`).viewer;
  if (meta.login !== login) throw new Error('The authenticated account is not the approved profile.');
  const yearNumbers = meta.contributionsCollection.contributionYears;
  const aliases = yearNumbers.map(year => {
    const until = year === now.getUTCFullYear() ? to : `${year}-12-31T23:59:59Z`;
    return `y${year}:contributionsCollection(from:"${year}-01-01T00:00:00Z",to:"${until}") { restrictedContributionsCount contributionCalendar { totalContributions } }`;
  }).join('\n');
  progress.stage = 'history';
  const history = graphql(`query { viewer { ${aliases} } }`).viewer;
  const years = yearNumbers.map(year => ({ year, total: history[`y${year}`].contributionCalendar.totalContributions, restricted: history[`y${year}`].restrictedContributionsCount }));
  progress.stage = 'activity';
  const recent = graphql(`query { viewer { contributionsCollection(from:"${from}",to:"${to}") { startedAt endedAt restrictedContributionsCount contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`).viewer.contributionsCollection;
  progress.stage = 'pull-requests';
  const requests = graphql(`query {
    authored:search(query:"is:pr author:${login}",type:ISSUE,first:1){issueCount}
    merged:search(query:"is:pr author:${login} is:merged",type:ISSUE,first:1){issueCount}
    reviewed:search(query:"is:pr reviewed-by:${login} -author:${login}",type:ISSUE,first:1){issueCount}
  }`);
  // The API defines this connection as recent, not all-time authorship.
  progress.stage = 'owned-repositories';
  const owned = readRepositories('repositories', 'ownerAffiliations:[OWNER]');
  progress.stage = 'contributed-repositories';
  const contributed = readRepositories('repositoriesContributedTo', 'includeUserRepositories:true,contributionTypes:[COMMIT,PULL_REQUEST,PULL_REQUEST_REVIEW,ISSUE]');
  progress.stage = 'aggregate';
  const snapshot = summarize({
    collectedAt: to,
    publicProfile: { login, since: Number(meta.createdAt.slice(0, 4)) },
    period: { from, to },
    years,
    calendar: { total: recent.contributionCalendar.totalContributions, restricted: recent.restrictedContributionsCount, days: recent.contributionCalendar.weeks.flatMap(week => week.contributionDays.map(day => ({ date: day.date, count: day.contributionCount }))) },
    pullRequests: { authored: requests.authored.issueCount, merged: requests.merged.issueCount, reviewed: requests.reviewed.issueCount },
    repositories: [...owned.map(repo => ({ ...repo, owned: true })), ...contributed.map(repo => ({ ...repo, contributed: true }))],
  });
  progress.stage = 'validation';
  validateSnapshot(snapshot);
  const output = resolve(root, 'metrics.json');
  progress.stage = 'baseline';
  const previous = JSON.parse(await readFile(output, 'utf8'));
  progress.stage = 'coverage';
  assertCoverage(previous, snapshot);
  progress.stage = 'write';
  await writeFile(`${output}.tmp`, JSON.stringify(snapshot, null, 2) + '\n');
  await rename(`${output}.tmp`, output);
  console.log(JSON.stringify({ status: 'collected', updatedDate: snapshot.updatedDate, years: snapshot.years.length, languageRepositories: snapshot.languages.repositories, ...snapshot.lifetime, recent: snapshot.activity }));
  return snapshot;
}
export async function collect() {
  const progress = { stage: 'credentials' };
  try { return await collectSnapshot(progress); }
  catch (error) {
    const code = githubCodes.has(error?.code) ? error.code : failureCodes.get(error?.message) || 'COLLECTION_FAILED';
    throw Object.assign(new Error('Collection failed; the previous snapshot was preserved.'), { stage: progress.stage, code });
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  collect().catch(error => {
    console.error(`Collection failed [stage=${error.stage} code=${error.code}]; the previous snapshot was preserved.`);
    if (error.code === 'MISSING_CREDENTIAL') console.error('Configure the dedicated PROFILE_STATS_TOKEN Actions secret before refreshing.');
    process.exitCode = 1;
  });
}
