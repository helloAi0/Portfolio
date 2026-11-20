/**
 * GeeksForGeeks Provider Adapter
 *
 * GeeksForGeeks has NO official public API. This adapter therefore does not call
 * any third-party scraping proxy by default. It only syncs when the owner supplies
 * an endpoint they trust via GFG_STATS_ENDPOINT (a URL template containing
 * {username}); otherwise GfG is reported UNAVAILABLE and stats can be entered
 * manually in the admin. No values are ever invented.
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
  dataSource: 'LIVE' | 'UNAVAILABLE';
  lastSyncedAt: Date;
  syncError?: string;
}

const UNAVAILABLE_GFG_STATS: GFGStats = {
  username: GFG_USERNAME,
  profileUrl: GFG_USERNAME ? `https://www.geeksforgeeks.org/profile/${GFG_USERNAME}` : '',
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
  dataSource: 'UNAVAILABLE',
  lastSyncedAt: new Date(),
  syncError: 'GeeksForGeeks has no official public API. Set GFG_USERNAME and GFG_STATS_ENDPOINT, or enter stats manually in the admin.',
};

export async function fetchGFGStats(): Promise<GFGStats> {
  const username = process.env.GFG_USERNAME;

  if (!username) {
    logger.warn('GFGAdapter', 'GFG_USERNAME not configured.');
    return UNAVAILABLE_GFG_STATS;
  }

  const template = process.env.GFG_STATS_ENDPOINT;
  if (!template || !template.includes('{username}')) {
    return { ...UNAVAILABLE_GFG_STATS, syncError: 'No supported GfG data source configured (GFG_STATS_ENDPOINT). Enter stats manually in the admin.' };
  }
  const url = template.replace('{username}', encodeURIComponent(username));

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
      profileUrl: `https://www.geeksforgeeks.org/profile/${username}`,
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
      instituteName: null,
      dataSource: 'LIVE',
      lastSyncedAt: new Date(),
    };

    logger.info('GFGAdapter', `Synced GFG stats for @${username}`);
    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.warn('GFGAdapter', `GFG live fetch failed: ${errMsg}. Reporting UNAVAILABLE.`);
    return { ...UNAVAILABLE_GFG_STATS, syncError: `Live sync failed: ${errMsg}` };
  }
}

