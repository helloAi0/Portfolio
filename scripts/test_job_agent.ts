import './_testDb';
/** Job Agent: scan with injected fixture jobs, never needs the network. Run: npx tsx scripts/test_job_agent.ts */
import { runJobScan, setJobStatus, saveSettings, getSettings } from '../src/lib/jobs/service';
import { prisma } from '../src/lib/prisma';
let fail = 0; const ok = (n: string, c: boolean, x?: unknown) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`, c ? '' : x ?? ''); if (!c) fail++; };
const mk = (id: string, title: string, loc: string, text: string, extra = {}) => ({ id, company: 'Acme AI', title, location: loc, url: `https://example.com/${id}`, text, rating: 4.7, ...extra });
const body = 'We use Python, PyTorch, machine learning, deep learning, robotics, flow matching, embodied AI research, NLP and LLM. Please include a cover letter. '.repeat(4);
(async () => {
  const db = prisma as any; await db.jobMatch.deleteMany({ where: { externalId: { startsWith: 'test:' } } }); await db.jobKv.deleteMany({});
  await saveSettings({ mode: 'remote', enabled: true, letterTemplate: '' });
  const jobs = [
    mk('test:1', 'Machine Learning Research Intern', 'Remote - Germany', body),
    mk('test:2', 'Senior Staff Engineer', 'Berlin', body),
    mk('test:3', 'Robotics Intern', 'San Francisco, USA (on-site)', body),
    mk('test:4', 'Marketing Intern', 'Remote', 'Social media and brand campaigns.'),
    mk('test:5', 'Deep Learning Intern', 'Remote', body, { rating: 3.2 }),
  ];
  const r: any = await runJobScan({ jobs, mode: 'remote' });
  const rows = await db.jobMatch.findMany({ where: { externalId: { startsWith: 'test:' } } });
  const ids = rows.map((x: any) => x.externalId);
  ok('good remote intern queued', ids.includes('test:1'), ids);
  ok('senior role excluded', !ids.includes('test:2'));
  ok('on-site US excluded in remote mode', !ids.includes('test:3'), ids);
  ok('irrelevant role excluded', !ids.includes('test:4'));
  ok('low-rated company excluded', !ids.includes('test:5'));
  ok('letter written, no phone in it', rows[0]?.letter.includes('Dear Hiring Team') && !/\+?91\s?7439/.test(rows[0].letter));
  ok('resume family assigned', /resume/i.test(rows[0]?.resume ?? ''));
  const again: any = await runJobScan({ jobs, mode: 'remote' });
  ok('rescan does not duplicate', again.queued === 0, again.queued);
  const id = rows[0].id; await setJobStatus(id, 'APPLIED');
  ok('status saved', (await db.jobMatch.findUnique({ where: { id } })).status === 'APPLIED');
  let bad = false; try { await setJobStatus(id, 'BOGUS'); } catch { bad = true; } ok('bad status rejected', bad);
  bad = false; try { await saveSettings({ mode: 'mars' as any }); } catch { bad = true; } ok('bad mode rejected', bad);
  ok('mode persisted', (await getSettings()).mode === 'remote');
  await db.jobMatch.deleteMany({ where: { externalId: { startsWith: 'test:' } } }); await db.jobKv.deleteMany({});
  console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
})();
