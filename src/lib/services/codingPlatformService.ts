/**
 * Coding Platform Sync Service
 * Syncs LeetCode and GeeksForGeeks stats into the CodingPlatformProfile table.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { fetchLeetCodeStats } from '@/lib/adapters/leetcodeAdapter';
import { fetchGFGStats } from '@/lib/adapters/gfgAdapter';

export async function syncCodingPlatforms(): Promise<{
  leetcode: string;
  gfg: string;
}> {
  logger.info('CodingPlatformSync', 'Starting coding platform sync...');

  // LeetCode
  let leetcodeStatus = 'SKIPPED';
  try {
    const stats = await fetchLeetCodeStats();
    await prisma.codingPlatformProfile.upsert({
      where: { platform: 'LEETCODE' },
      create: {
        platform: 'LEETCODE',
        username: stats.username,
        profileUrl: stats.profileUrl,
        totalSolved: stats.totalSolved,
        easySolved: stats.easySolved,
        mediumSolved: stats.mediumSolved,
        hardSolved: stats.hardSolved,
        globalRanking: stats.ranking,
        contributionPoints: stats.contributionPoints,
        badges: JSON.stringify(stats.badges),
        recentActivity: JSON.stringify(stats.recentSubmissions),
        rawData: JSON.stringify(stats),
        dataSource: stats.dataSource,
        lastSyncedAt: stats.lastSyncedAt,
        syncError: stats.syncError ?? null,
      },
      update: {
        totalSolved: stats.totalSolved,
        easySolved: stats.easySolved,
        mediumSolved: stats.mediumSolved,
        hardSolved: stats.hardSolved,
        globalRanking: stats.ranking,
        contributionPoints: stats.contributionPoints,
        badges: JSON.stringify(stats.badges),
        recentActivity: JSON.stringify(stats.recentSubmissions),
        rawData: JSON.stringify(stats),
        dataSource: stats.dataSource,
        lastSyncedAt: stats.lastSyncedAt,
        syncError: stats.syncError ?? null,
      },
    });
    leetcodeStatus = stats.dataSource === 'LIVE' ? 'LIVE' : 'MOCK';
  } catch (err) {
    leetcodeStatus = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    logger.error('CodingPlatformSync', `LeetCode sync failed: ${leetcodeStatus}`);
  }

  // GFG
  let gfgStatus = 'SKIPPED';
  try {
    const stats = await fetchGFGStats();
    await prisma.codingPlatformProfile.upsert({
      where: { platform: 'GEEKSFORGEEKS' },
      create: {
        platform: 'GEEKSFORGEEKS',
        username: stats.username,
        profileUrl: stats.profileUrl,
        totalSolved: stats.totalSolved,
        easySolved: stats.easy,
        mediumSolved: stats.medium,
        hardSolved: stats.hard,
        rawData: JSON.stringify(stats),
        dataSource: stats.dataSource,
        lastSyncedAt: stats.lastSyncedAt,
        syncError: stats.syncError ?? null,
      },
      update: {
        totalSolved: stats.totalSolved,
        easySolved: stats.easy,
        mediumSolved: stats.medium,
        hardSolved: stats.hard,
        rawData: JSON.stringify(stats),
        dataSource: stats.dataSource,
        lastSyncedAt: stats.lastSyncedAt,
        syncError: stats.syncError ?? null,
      },
    });
    gfgStatus = stats.dataSource === 'LIVE' ? 'LIVE' : 'MOCK';
  } catch (err) {
    gfgStatus = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    logger.error('CodingPlatformSync', `GFG sync failed: ${gfgStatus}`);
  }

  logger.info('CodingPlatformSync', `Sync complete. LeetCode: ${leetcodeStatus}, GFG: ${gfgStatus}`);
  return { leetcode: leetcodeStatus, gfg: gfgStatus };
}

export async function getCodingStats() {
  const profiles = await prisma.codingPlatformProfile.findMany();
  const leetcode = profiles.find((p) => p.platform === 'LEETCODE') ?? null;
  const gfg = profiles.find((p) => p.platform === 'GEEKSFORGEEKS') ?? null;

  return {
    leetcode: leetcode
      ? {
          ...leetcode,
          badges: safeJsonParse(leetcode.badges as string, []),
          recentActivity: safeJsonParse(leetcode.recentActivity as string, []),
        }
      : null,
    gfg: gfg ?? null,
  };
}

function safeJsonParse<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

