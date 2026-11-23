import './_nodeDb';
/**
 * LIVE end-to-end check. Run on a machine with internet access, a generated Prisma client and a pushed database:
 *   npm run verify:live
 * It calls the real services with your .env, runs the real sync, and prints PASS / FAIL / SKIP per source.
 * It writes the same data a normal sync writes; it deletes nothing.
 */
// Load .env (Next.js does this for the app; plain scripts must do it themselves).
try { require('dotenv').config(); } catch { /* dotenv not installed: rely on the shell environment */ }

const rows: string[] = [];
const line = (s: 'PASS' | 'FAIL' | 'SKIP', what: string, detail = '') => { rows.push(`[${s}] ${what}${detail ? ' - ' + detail : ''}`); console.log(rows[rows.length - 1]); };

(async () => {
  const { prisma } = await import('../src/lib/prisma');
  try { await prisma.$queryRaw`SELECT 1`; line('PASS', 'Database reachable'); } catch (e) { line('FAIL', 'Database reachable', String((e as Error).message).split('\n')[0]); process.exit(1); }

  const gh = await import('../src/lib/adapters/githubAdapter');
  try { const repos = await gh.fetchGithubRepositories(); line(repos.length ? 'PASS' : 'FAIL', 'GitHub: public repositories fetched', `${repos.length} repos`); }
  catch (e) { line('FAIL', 'GitHub fetch', (e as Error).message); }

  const lc = await import('../src/lib/adapters/leetcodeAdapter');
  if (!process.env.LEETCODE_USERNAME) line('SKIP', 'LeetCode', 'LEETCODE_USERNAME not set');
  else {
    const s = await lc.fetchLeetCodeStats();
    line(s.dataSource === 'LIVE' ? 'PASS' : 'FAIL', 'LeetCode: stats', s.dataSource === 'LIVE' ? `${s.totalSolved} solved` : s.syncError);
    const r = await lc.fetchRecentAcceptedLeetCode(5);
    line(r.ok ? 'PASS' : 'FAIL', 'LeetCode: recent accepted problems', r.ok ? `${r.items.length} items` : r.error);
  }

  const { runAllSyncs } = await import('../src/lib/services/autoSyncService');
  const out = await runAllSyncs('MANUAL');
  const g: any = out.result.github;
  line(g && !g.error ? 'PASS' : 'FAIL', 'Full sync: GitHub -> database', g?.error ?? JSON.stringify({ fetched: g?.reposFetched, upserted: g?.reposUpserted, classified: g?.reposClassified }));
  const [repos, projects, solutions] = await Promise.all([prisma.githubRepository.count(), prisma.project.count({ where: { approvalStatus: 'APPROVED' } }), prisma.codingSolution.count()]);
  line(repos > 0 ? 'PASS' : 'FAIL', 'Database now holds', `${repos} repositories, ${projects} published projects, ${solutions} solved problems`);

  console.log(`\n${rows.filter((r) => r.startsWith('[FAIL]')).length} failure(s). Paste any [FAIL] line to the developer.`);
  await prisma.$disconnect();
})();
