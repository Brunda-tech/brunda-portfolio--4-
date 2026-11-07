// Fetches LeetCode + GitHub data and writes data/stats.json.
// Runs inside GitHub Actions (see .github/workflows/update-stats.yml).
// Needs Node 20+, no npm dependencies.
//
// Why this exists: browsers cannot call LeetCode's API directly (no CORS),
// so a tiny scheduled job fetches it server-side and saves it as a JSON file
// that the website reads.

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const LEETCODE_USER = process.env.LEETCODE_USER || 'Brunda-17';
const GITHUB_USER = process.env.GH_USER || 'Brunda-tech';
const OUT = 'data/stats.json';
const UA = 'Mozilla/5.0 (compatible; portfolio-stats-bot)';

async function getJSON(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, ...(init.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function leetcode() {
  const query = `query u($username: String!) {
    allQuestionsCount { difficulty count }
    matchedUser(username: $username) {
      profile { ranking }
      submitStatsGlobal { acSubmissionNum { difficulty count } }
    }
    recentAcSubmissionList(username: $username, limit: 10) { title titleSlug timestamp }
  }`;
  const json = await getJSON('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables: { username: LEETCODE_USER } }),
  });
  const data = json.data;
  if (json.errors || !data?.matchedUser) {
    throw new Error('LeetCode: user not found or query rejected');
  }
  const ac = Object.fromEntries(
    data.matchedUser.submitStatsGlobal.acSubmissionNum.map((x) => [x.difficulty, x.count])
  );
  const all = Object.fromEntries(data.allQuestionsCount.map((x) => [x.difficulty, x.count]));
  return {
    username: LEETCODE_USER,
    solved: ac.All ?? 0,
    easy: ac.Easy ?? 0,
    medium: ac.Medium ?? 0,
    hard: ac.Hard ?? 0,
    totals: { all: all.All, easy: all.Easy, medium: all.Medium, hard: all.Hard },
    ranking: data.matchedUser.profile?.ranking ?? null,
    recent: (data.recentAcSubmissionList || []).map((r) => ({
      title: r.title,
      slug: r.titleSlug,
      timestamp: Number(r.timestamp),
    })),
  };
}

async function github() {
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const [user, heat] = await Promise.all([
    getJSON(`https://api.github.com/users/${GITHUB_USER}`, { headers }),
    getJSON(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`),
  ]);
  return {
    username: GITHUB_USER,
    profile: { public_repos: user.public_repos, followers: user.followers },
    contributions: heat.contributions.map(({ date, count, level }) => ({ date, count, level })),
  };
}

async function main() {
  let prev = {};
  try {
    prev = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    /* first run */
  }
  const before = { leetcode: prev.leetcode ?? null, github: prev.github ?? null };
  const next = { ...before };

  let failures = 0;
  for (const [key, fn] of [['leetcode', leetcode], ['github', github]]) {
    try {
      next[key] = await fn();
    } catch (e) {
      failures++;
      console.warn(`::warning::${key} update failed (keeping previous data): ${e.message}`);
    }
  }
  if (failures === 2) {
    console.error('Both sources failed.');
    process.exit(1);
  }

  // Only touch the file when the data really changed, so the repo doesn't
  // collect an empty commit every 30 minutes.
  if (JSON.stringify(before) === JSON.stringify(next)) {
    console.log('No changes.');
    return;
  }
  await mkdir('data', { recursive: true });
  await writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), ...next }, null, 1) + '\n');
  console.log('Updated', OUT);
}

main();
