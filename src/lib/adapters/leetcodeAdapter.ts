/**
 * LeetCode Provider Adapter
 *
 * LeetCode does NOT provide an official public REST API.
 * Their internal GraphQL endpoint is used by their own app but is not
 * documented, rate-limited aggressively, and subject to change without notice.
 *
 * This adapter:
 * 1. Attempts the public GraphQL endpoint with a known-safe query.
 * 2. Falls back gracefully to MOCK data labeled as such.
 * 3. Never scrapes authenticated pages or stores credentials.
 * 4. Clearly marks unavailable metrics with null.
 *
 * IMPORTANT: If LeetCode blocks this endpoint, the adapter returns mock data
 * so the portfolio does not break.
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
  dataSource: 'LIVE' | 'MOCK';
  lastSyncedAt: Date;
  syncError?: string;
}

const MOCK_LEETCODE_STATS: LeetCodeStats = {
  username: LEETCODE_USERNAME || 'helloAi0',
  profileUrl: `https://leetcode.com/${LEETCODE_USERNAME || 'helloAi0'}`,
  totalSolved: null,
  easySolved: null,
  mediumSolved: null,
  hardSolved: null,
  acceptanceRate: null,
  ranking: null,
  contributionPoints: null,
  badges: [],
  recentSubmissions: [],
  dataSource: 'MOCK',
  lastSyncedAt: new Date(),
  syncError: 'LeetCode public API unavailable or username not configured. Configure LEETCODE_USERNAME in .env to enable live sync.',
};

export async function fetchLeetCodeStats(): Promise<LeetCodeStats> {
  const username = process.env.LEETCODE_USERNAME;

  if (!username) {
    logger.warn('LeetCodeAdapter', 'LEETCODE_USERNAME not configured. Using mock data.');
    return MOCK_LEETCODE_STATS;
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
    logger.warn('LeetCodeAdapter', `Live fetch failed: ${errMsg}. Returning mock.`);
    return { ...MOCK_LEETCODE_STATS, syncError: `Live sync failed: ${errMsg}` };
  }
}

