/**
 * LeetCode Provider Adapter
 *
 * LeetCode does NOT provide an official public REST API.
 * Their internal GraphQL endpoint is used by their own app but is not
 * documented, rate-limited aggressively, and subject to change without notice.
 *
 * This adapter:
 * 1. Attempts the public GraphQL endpoint with a known-safe query.
 * 2. On failure reports UNAVAILABLE (never fabricated numbers).
 * 3. Never scrapes authenticated pages or stores credentials.
 * 4. Clearly marks unavailable metrics with null.
 *
 * IMPORTANT: this endpoint is unofficial and best-effort. If LeetCode blocks it,
 * the adapter reports UNAVAILABLE with an error message and the previously synced
 * values (if any) are kept and shown as stale. No values are ever invented.
 */

import { logger } from '@/lib/logger';

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';
const LEETCODE_USERNAME = process.env.LEETCODE_USERNAME || '';

export interface LeetCodeStats {
  username: string;
  profileUrl: string;
  totalSolved: number | null;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
  acceptanceRate: number | null;
  ranking: number | null;
  contributionPoints: number | null;
  badges: string[];
  recentSubmissions: string[];
  dataSource: 'LIVE' | 'UNAVAILABLE';
  lastSyncedAt: Date;
  syncError?: string;
}

const UNAVAILABLE_LEETCODE_STATS: LeetCodeStats = {
  username: LEETCODE_USERNAME,
  profileUrl: LEETCODE_USERNAME ? `https://leetcode.com/${LEETCODE_USERNAME}` : '',
  totalSolved: null,
  easySolved: null,
  mediumSolved: null,
  hardSolved: null,
  acceptanceRate: null,
  ranking: null,
  contributionPoints: null,
  badges: [],
  recentSubmissions: [],
  dataSource: 'UNAVAILABLE',
  lastSyncedAt: new Date(),
  syncError: 'LeetCode username not configured (set LEETCODE_USERNAME).',
};

export async function fetchLeetCodeStats(): Promise<LeetCodeStats> {
  const username = process.env.LEETCODE_USERNAME;

  if (!username) {
    logger.warn('LeetCodeAdapter', 'LEETCODE_USERNAME not configured. Reporting UNAVAILABLE.');
    return UNAVAILABLE_LEETCODE_STATS;
  }

  // Attempt public GraphQL query
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
          reputation
        }
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        badges {
          displayName
        }
      }
    }
  `;

  try {
    const res = await fetch(LEETCODE_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (compatible; ProjectLAMO/2.0)',
      },
      body: JSON.stringify({ query, variables: { username } }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    const user = json?.data?.matchedUser;

    if (!user) {
      throw new Error('User not found or API blocked');
    }

    const acStats = user.submitStats?.acSubmissionNum || [];
    const getCount = (diff: string) =>
      acStats.find((s: { difficulty: string; count: number }) => s.difficulty === diff)?.count ?? null;

    const totalSolved = getCount('All');
    const easySolved = getCount('Easy');
    const mediumSolved = getCount('Medium');
    const hardSolved = getCount('Hard');
    const badges = (user.badges || []).map((b: { displayName: string }) => b.displayName);

    const result: LeetCodeStats = {
      username,
      profileUrl: `https://leetcode.com/${username}`,
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      acceptanceRate: null, // Not reliably available without auth
      ranking: user.profile?.ranking ?? null,
      contributionPoints: user.profile?.reputation ?? null,
      badges,
      recentSubmissions: [],
      dataSource: 'LIVE',
      lastSyncedAt: new Date(),
    };

    logger.info('LeetCodeAdapter', `Synced LeetCode stats for @${username}`);
    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.warn('LeetCodeAdapter', `Live fetch failed: ${errMsg}. Reporting UNAVAILABLE.`);
    return { ...UNAVAILABLE_LEETCODE_STATS, syncError: `Live sync failed: ${errMsg}` };
  }
}



export interface LeetCodeSolvedItem {
  title: string;
  slug: string;
  solvedAt: Date;
  difficulty: string | null;
  topicTags: string[];
}

async function gql(query: string, variables: Record<string, unknown>) {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com', 'User-Agent': 'Mozilla/5.0 (compatible; ProjectLAMO/2.0)' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json())?.data;
}

/**
 * Recently ACCEPTED problems from the public profile (titles and times only; LeetCode does not
 * expose submitted code without a login, and this project never stores credentials).
 * Returns { ok:false } on any failure; callers must not invent data.
 */
export async function fetchRecentAcceptedLeetCode(limit = 20): Promise<{ ok: boolean; items: LeetCodeSolvedItem[]; error?: string }> {
  const username = process.env.LEETCODE_USERNAME;
  if (!username) return { ok: false, items: [], error: 'LEETCODE_USERNAME not configured.' };
  try {
    const data = await gql(
      `query recent($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { title titleSlug timestamp } }`,
      { username, limit },
    );
    const list: Array<{ title: string; titleSlug: string; timestamp: string }> = data?.recentAcSubmissionList ?? [];
    const items: LeetCodeSolvedItem[] = list.map((x) => ({
      title: x.title, slug: x.titleSlug, solvedAt: new Date(Number(x.timestamp) * 1000), difficulty: null, topicTags: [],
    })).filter((x) => x.slug && !isNaN(x.solvedAt.getTime()));
    return { ok: true, items };
  } catch (err) {
    return { ok: false, items: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchLeetCodeProblemMeta(slug: string): Promise<{ difficulty: string | null; topicTags: string[] }> {
  try {
    const data = await gql(`query q($slug: String!) { question(titleSlug: $slug) { difficulty topicTags { name } } }`, { slug });
    const q = data?.question;
    return { difficulty: q?.difficulty ?? null, topicTags: (q?.topicTags ?? []).map((t: { name: string }) => t.name) };
  } catch {
    return { difficulty: null, topicTags: [] };
  }
}
