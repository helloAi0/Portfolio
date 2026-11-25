/**
 * One entry point that refreshes every automatic source. Used by:
 *  - the in-app scheduler (src/instrumentation.ts),
 *  - the "Sync everything now" admin button,
 *  - POST /api/sync/reconcile (external cron).
 * A run lock prevents overlapping runs. Each source fails independently.
 */
import { syncGithubRepositories } from '@/lib/services/githubSyncService';
import { syncCodingPlatforms } from '@/lib/services/codingPlatformService';
import { syncLeetCodeSolutions } from '@/lib/services/codingSolutionService';
import { publishPendingSuggestions } from '@/lib/services/projectPublicationService';
import { cleanLegacyData } from '@/lib/services/legacyCleanupService';
import { logger } from '@/lib/logger';

let running = false;
export let lastRun: { at: string; trigger: string; result: Record<string, unknown> } | null = null;

export async function runAllSyncs(trigger: string): Promise<{ skipped?: boolean; result: Record<string, unknown> }> {
  if (running) return { skipped: true, result: { message: 'A sync is already running.' } };
  running = true;
  const result: Record<string, unknown> = {};
  try {
    try { result.legacyCleanup = await cleanLegacyData(); }
    catch (e) { result.legacyCleanup = { error: String((e as Error).message) }; }
    try { result.github = await syncGithubRepositories(trigger === 'MANUAL' ? 'MANUAL' : 'SCHEDULED'); }
    catch (e) { result.github = { error: String((e as Error).message) }; }
    try { result.autoPublished = await publishPendingSuggestions(); }
    catch (e) { result.autoPublished = { error: String((e as Error).message) }; }
    try { result.codingPlatforms = await syncCodingPlatforms(); }
    catch (e) { result.codingPlatforms = { error: String((e as Error).message) }; }
    try { result.leetcodeSolutions = await syncLeetCodeSolutions(); }
    catch (e) { result.leetcodeSolutions = { error: String((e as Error).message) }; }
    lastRun = { at: new Date().toISOString(), trigger, result };
    logger.info('AutoSync', `Run finished (${trigger})`);
    return { result };
  } finally {
    running = false;
  }
}
