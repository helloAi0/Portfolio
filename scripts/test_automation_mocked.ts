import './_nodeDb';
/**
 * Automatic-source tests with MOCKED network responses shaped like the real APIs.
 * These prove parsing, failure handling and "never invent data". They do NOT prove the live services answer;
 * that needs a run on a machine with internet access (see docs).
 */
process.env.LEETCODE_USERNAME = 'tester';
import { fetchLeetCodeStats, fetchRecentAcceptedLeetCode, fetchLeetCodeProblemMeta } from '../src/lib/adapters/leetcodeAdapter';

let passed = 0, failed = 0;
const t = (n: string, ok: boolean, x?: unknown) => { if (ok) { passed++; console.log(`[PASS] ${n}`); } else { failed++; console.error(`[FAIL] ${n}`, x ?? ''); } };
const realFetch = globalThis.fetch;
const mock = (handler: (body: any) => { status?: number; json?: unknown; throws?: boolean }) => {
  globalThis.fetch = (async (_u: any, init: any) => {
    const r = handler(JSON.parse(init.body));
    if (r.throws) throw new Error('network down');
    return { ok: (r.status ?? 200) < 400, status: r.status ?? 200, json: async () => r.json } as Response;
  }) as typeof fetch;
};

(async () => {
  mock(() => ({ json: { data: { matchedUser: { profile: { ranking: 4321, reputation: 5 }, submitStats: { acSubmissionNum: [{ difficulty: 'All', count: 120 }, { difficulty: 'Easy', count: 60 }, { difficulty: 'Medium', count: 50 }, { difficulty: 'Hard', count: 10 }] }, badges: [{ displayName: 'Knight' }] } } } }));
  const ok = await fetchLeetCodeStats();
  t('stats: live parse', ok.dataSource === 'LIVE' && ok.totalSolved === 120 && ok.easySolved === 60 && ok.hardSolved === 10 && ok.ranking === 4321 && ok.badges[0] === 'Knight', ok);

  mock(() => ({ json: { data: { matchedUser: null } } }));
  const none = await fetchLeetCodeStats();
  t('stats: unknown user is UNAVAILABLE with null numbers (nothing invented)', none.dataSource === 'UNAVAILABLE' && none.totalSolved === null);

  mock(() => ({ status: 429 }));
  t('stats: rate limited -> UNAVAILABLE', (await fetchLeetCodeStats()).dataSource === 'UNAVAILABLE');
  mock(() => ({ throws: true }));
  const down = await fetchLeetCodeStats();
  t('stats: network error -> UNAVAILABLE, no throw', down.dataSource === 'UNAVAILABLE' && !!down.syncError);

  mock(() => ({ json: { data: { recentAcSubmissionList: [{ title: 'Two Sum', titleSlug: 'two-sum', timestamp: '1731900000' }, { title: '', titleSlug: '', timestamp: 'x' }] } } }));
  const rec = await fetchRecentAcceptedLeetCode(20);
  t('recent: parsed, junk rows dropped, time converted', rec.ok && rec.items.length === 1 && rec.items[0].slug === 'two-sum' && rec.items[0].solvedAt.getUTCFullYear() === 2024, rec);
  mock(() => ({ throws: true }));
  const recFail = await fetchRecentAcceptedLeetCode(20);
  t('recent: failure is reported, not faked', recFail.ok === false && recFail.items.length === 0);

  mock(() => ({ json: { data: { question: { difficulty: 'Medium', topicTags: [{ name: 'Array' }, { name: 'Hash Table' }] } } } }));
  const meta = await fetchLeetCodeProblemMeta('two-sum');
  t('meta: difficulty and tags', meta.difficulty === 'Medium' && meta.topicTags.join(',') === 'Array,Hash Table');
  mock(() => ({ throws: true }));
  const metaFail = await fetchLeetCodeProblemMeta('x');
  t('meta: failure gives nulls', metaFail.difficulty === null && metaFail.topicTags.length === 0);

  globalThis.fetch = realFetch;
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
