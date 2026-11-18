/**
 * In-app scheduler: refreshes GitHub, LeetCode/GFG stats and recent LeetCode solves every
 * AUTO_SYNC_INTERVAL_HOURS (default 6) on a long-running Node server (Render web service).
 * Disable with AUTO_SYNC_ENABLED=false. Serverless hosts should use POST /api/sync/reconcile instead.
 */
if (process.env.AUTO_SYNC_ENABLED !== 'false' && (process.env.NODE_ENV === 'production' || process.env.AUTO_SYNC_IN_DEV === 'true')) {
  const hours = Math.max(1, Number(process.env.AUTO_SYNC_INTERVAL_HOURS ?? 6));
  const tick = async () => {
    try { const { runAllSyncs } = await import('@/lib/services/autoSyncService'); await runAllSyncs('SCHEDULED'); } catch { /* logged inside; never crash the server */ }
  };
  setTimeout(tick, 60_000); // first run one minute after boot
  const timer = setInterval(tick, hours * 3_600_000);
  timer.unref?.();
}

export {};
