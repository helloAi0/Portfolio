import { prisma } from '@/lib/prisma';
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n) : '');
const ATS = ['greenhouse', 'lever', 'ashby', 'wellfound', 'internshala', 'other'];

/** What the worker reports about a form it filled (never submitted). Everything is validated: the worker is not trusted blindly. */
export async function recordPrefill(b: any) {
  const row = await prisma.jobMatch.findUnique({ where: { id: b.id }, select: { id: true } });
  if (!row) return { error: 'Unknown job' };
  const ok = b.prefillStatus === 'done'; const c = Number(b.formConfidence);
  const answers = (Array.isArray(b.draftedAnswers) ? b.draftedAnswers : []).slice(0, 12).map((a: any) => ({ question: clip(a?.question, 300), answer: clip(a?.answer, 1500) })).filter((a: any) => a.question && a.answer);
  const shot = typeof b.screenshotFileId === 'string' && /^[a-z0-9]{20,40}$/.test(b.screenshotFileId) ? `/api/files/${b.screenshotFileId}` : null;
  await prisma.jobMatch.update({ where: { id: b.id }, data: {
    prefillStatus: ok ? 'done' : 'failed', atsPlatform: ATS.includes(b.atsPlatform) ? b.atsPlatform : 'other',
    formConfidence: Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : null, essayFree: ok && b.essayFree === true,
    draftedAnswers: JSON.stringify(answers), screenshotUrl: shot, prefillNote: clip(b.note, 400) || null,
    // Priority tier only stays "ready" when the form really looks like a plain one-click form.
    ...(ok && b.essayFree !== true ? { tier: 'REVIEW' } : {}) } });
  return { ok: true };
}
