/** Mode 3 drafts + pre-fill bookkeeping. Run: npx tsx scripts/test_outreach.ts */
import './_testDb';
import { draftColdEmail, pickProject, wordCount, EMAIL_RE } from '../src/lib/outreach/draft';
import { recordPrefill } from '../src/lib/jobs/prefill';
import { scoreJob } from '../src/lib/jobs/score';
import { prisma } from '../src/lib/prisma';
let fail = 0; const ok = (n: string, c: boolean, x?: unknown) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`, c ? '' : x ?? ''); if (!c) fail++; };
(async () => {
  const a = draftColdEmail({ recipientName: 'Dr. Rao', companyOrLab: 'Robot Learning Lab', focus: 'bimanual robot manipulation with world models' });
  ok('under 150 words', wordCount(a.body) <= 150, wordCount(a.body));
  ok('robotics focus picks the flow-matching project', a.body.includes('Flow Matching') && a.project.includes('Flow Matching'));
  ok('physics focus picks PinnFlow', pickProject('fluid simulation PDE').name === 'PinnFlow');
  ok('security focus picks Shadow-Net', pickProject('zero-knowledge protocol and C++ systems').name === 'Project Shadow-Net');
  ok('signed with the owner name and email only', a.body.includes('Taha Udaipurwala') && a.body.includes('tahaudaipurwala68@gmail.com') && !/\+?\d{2}\s?\d{5}/.test(a.body));
  const long = draftColdEmail({ recipientName: 'X'.repeat(500), companyOrLab: 'L'.repeat(900), focus: 'robot '.repeat(300) });
  ok('hostile / huge input still capped', wordCount(long.body) <= 150 && long.body.length < 2500, wordCount(long.body));
  ok('control characters removed', !/[\u0000-\u001f]/.test(draftColdEmail({ recipientName: 'A\u0000B\r\nBcc: x@y.z', companyOrLab: 'Lab', focus: '' }).body.split('\n')[0]));
  ok('email validation', EMAIL_RE.test('a@b.co') && !EMAIL_RE.test('a@b') && !EMAIL_RE.test('a b@c.com') && !EMAIL_RE.test('a@b.com, c@d.com'));
  // scoring weights: reputation & geography is the final 10%
  const job = { id: 'x', company: 'Acme', title: 'Machine Learning Intern', location: 'Remote', url: 'https://x', text: 'python pytorch deep learning robotics '.repeat(20), rating: 4.8 };
  const s = scoreJob(job, ['germany']); ok('score includes reputation & geography line', s.why.some((w) => w.startsWith('reputation & geography')) && s.match <= 100, s.why);
  ok('unknown rating + off-list country scores lower', scoreJob({ ...job, rating: 3.0, location: 'Mars' }, ['brazil']).match < s.match);
  // prefill result validation
  const db = prisma as any; await db.jobMatch.deleteMany({ where: { externalId: 'test:prefill' } });
  const row = await db.jobMatch.create({ data: { externalId: 'test:prefill', company: 'A', title: 'ML Intern', url: 'https://x', score: 92, tier: 'READY_FOR_ONE_CLICK_REVIEW', family: 'ai_robotics', resume: 'r', letter: 'l' } });
  ok('unknown job rejected', 'error' in (await recordPrefill({ id: 'nope' })));
  await recordPrefill({ id: row.id, prefillStatus: 'done', atsPlatform: 'evil', formConfidence: 7, essayFree: false, draftedAnswers: [{ question: 'Why?', answer: 'Because.' }, { question: '', answer: 'x' }], screenshotFileId: '../../etc/passwd' });
  const after = await db.jobMatch.findUnique({ where: { id: row.id } });
  ok('values sanitised: ats->other, confidence clamped, bad screenshot id dropped, empty answers removed', after.atsPlatform === 'other' && after.formConfidence === 1 && after.screenshotUrl === null && JSON.parse(after.draftedAnswers).length === 1, after);
  ok('form with essay questions loses the one-click tier', after.tier === 'REVIEW', after.tier);
  await db.jobMatch.deleteMany({ where: { externalId: 'test:prefill' } });
  console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
})();
