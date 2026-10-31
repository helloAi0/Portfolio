/**
 * GeeksForGeeks Provider Adapter
 *
 * GeeksForGeeks does NOT have an official public API.
 * Their profile data is served via HTML pages and some internal JSON endpoints
 * that are undocumented and subject to change at any time.
 *
 * This adapter:
 * 1. Attempts to read from the public profile JSON endpoint if available.
 * 2. Falls back cleanly to MOCK data labeled explicitly as such.
 * 3. Never authenticates or scrapes protected user data.
 * 4. Clearly marks all unavailable metrics as null.
 */

import { logger } from '@/lib/logger';

const GFG_USERNAME = process.env.GFG_USERNAME || '';

export interface GFGStats {
  username: string;
  profileUrl: string;
  totalSolved: number | null;
  school: number | null;
  basic: number | null;
  easy: number | null;
  medium: number | null;
  hard: number | null;
  streak: number | null;
  monthlyScore: number | null;
  overallScore: number | null;
  rank: number | null;
  instituteName: string | null;
  dataSource: 'LIVE' | 'MOCK';
  lastSyncedAt: Date;
  syncError?: string;
}

const MOCK_GFG_STATS: GFGStats = {
  username: GFG_USERNAME || 'configure-gfg-username',
  profileUrl: `https://www.geeksforgeeks.org/user/${GFG_USERNAME || 'configure-gfg-username'}`,
  totalSolved: null,
  school: null,
  basic: null,
  easy: null,
  medium: null,
  hard: null,
  streak: null,
  monthlyScore: null,
  overallScore: null,
  rank: null,
  instituteName: null,
  dataSource: 'MOCK',
  lastSyncedAt: new Date(),
  syncError: 'GeeksForGeeks does not provide an official public API. Configure GFG_USERNAME in .env. Stats display pending available data access.',
};

export async function fetchGFGStats(): Promise<GFGStats> {
  const username = process.env.GFG_USERNAME;

  if (!username) {
    logger.warn('GFGAdapter', 'GFG_USERNAME not configured. Returning mock.');
    return MOCK_GFG_STATS;
  }

  // Attempt the known internal JSON endpoint (undocumented, may break)
  const url = `https://geeks-for-geeks-stats-api.vercel.app/?raw=Y&userName=${username}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ProjectLAMO-Portfolio/2.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data?.status === 'error' || !data?.info) {
      throw new Error('Unexpected response structure from GFG stats proxy');
    }

    const info = data.info;
    const solved = data.solvedStats;

    const result: GFGStats = {
      username,
      profileUrl: `https://www.geeksforgeeks.org/user/${username}`,
      totalSolved: info.totalProblemsSolved ?? null,
      school: solved?.SCHOOL?.count ?? null,
      basic: solved?.BASIC?.count ?? null,
      easy: solved?.EASY?.count ?? null,
      medium: solved?.MEDIUM?.count ?? null,
      hard: solved?.HARD?.count ?? null,
      streak: info.currentStreak ?? null,
      monthlyScore: info.monthlyScore ?? null,
      overallScore: info.overallCodingScore ?? null,
      rank: info.rank ?? null,
      instituteName: info.instituteRank ? 'UEM / IEM Kolkata' : null,
      dataSource: 'LIVE',
      lastSyncedAt: new Date(),
    };

    logger.info('GFGAdapter', `Synced GFG stats for @${username}`);
    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.warn('GFGAdapter', `GFG live fetch failed: ${errMsg}. Returning mock.`);
    return { ...MOCK_GFG_STATS, syncError: `Live sync failed: ${errMsg}` };
  }
}

