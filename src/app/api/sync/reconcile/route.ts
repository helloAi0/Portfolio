import { NextRequest, NextResponse } from 'next/server';
import { syncGithubRepositories } from '@/lib/services/githubSyncService';
import { syncCodingPlatforms } from '@/lib/services/codingPlatformService';
import { logger } from '@/lib/logger';

/**
 * Reconciliation & Scheduled Sync Endpoint
 * Can be triggered via CRON (e.g. Render Cron Job, GitHub Actions, Vercel Cron)
 * or by calling POST with CRON_SECRET authorization header.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Protect reconciliation endpoint if secret configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized reconciliation trigger' }, { status: 401 });
  }

  logger.info('ReconciliationRunner', 'Starting full reconciliation sync...');

  // 1. Reconcile GitHub Repositories
  const githubResult = await syncGithubRepositories('SCHEDULED');

  // 2. Reconcile Coding Platforms (LeetCode, GFG)
  const codingResult = await syncCodingPlatforms();

  const timestamp = new Date().toISOString();
  logger.info('ReconciliationRunner', `Reconciliation completed at ${timestamp}`);

  return NextResponse.json({
    success: true,
    reconciliationTimestamp: timestamp,
    github: githubResult,
    codingPlatforms: codingResult,
  });
}

