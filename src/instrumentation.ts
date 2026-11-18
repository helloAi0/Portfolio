/**
 * In-app scheduler: refreshes GitHub, LeetCode/GFG stats and recent LeetCode solves every
 * AUTO_SYNC_INTERVAL_HOURS (default 6) on a long-running Node server (Render web service).
 * Disable with AUTO_SYNC_ENABLED=false. Serverless hosts should use POST /api/sync/reconcile instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.AUTO_SYNC_ENABLED === 'false') return;
  if (process.env.NODE_ENV !== 'production' && process.env.AUTO_SYNC_IN_DEV !== 'true') return;
  const hours = Math.max(1, Number(process.env.AUTO_SYNC_INTERVAL_HOURS ?? 6));
  const { runAllSyncs } = await import('@/lib/services/autoSyncService');
  const tick = () => { runAllSyncs('SCHEDULED').catch(() => undefined); };
  setTimeout(tick, 60_000); // first run one minute after boot
  setInterval(tick, hours * 3_600_000).unref?.();
}
