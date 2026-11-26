import { prisma } from '@/lib/prisma';
import { PROFILE } from '@/config/profile';
import { JOB_CONFIG, JOB_BOARDS, type WorkMode } from '@/config/jobScout';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/lamo/emailAdapter';
import { background } from '@/lib/background';
import { jobCard } from '@/lib/notify/telegram';
import { placeOk } from './countries';
import { familyFor, isInternship, scoreJob, type Job } from './score';
import { writeLetter } from './letter';
import * as L from './learn';

const db = prisma as any;
export interface JobSettings { mode: WorkMode; enabled: boolean; letterTemplate: string }
const DEFAULTS: JobSettings = { mode: JOB_CONFIG.mode, enabled: true, letterTemplate: '' };

async function kvGet<T>(key: string, fallback: T): Promise<T> { try { const r = await db.jobKv.findUnique({ where: { key } }); return r ? { ...fallback, ...JSON.parse(r.value) } : fallback; } catch { return fallback; } }
async function kvSet(key: string, value: unknown) { const v = JSON.stringify(value); await db.jobKv.upsert({ where: { key }, update: { value: v }, create: { key, value: v } }); }

export const getSettings = () => kvGet<JobSettings>('settings', DEFAULTS);
export async function saveSettings(patch: Partial<JobSettings>) {
  const cur = await getSettings(); const next = { ...cur, ...patch };
  if (!['remote', 'onsite', 'hybrid'].includes(next.mode)) throw new Error('mode must be remote, onsite or hybrid');
  next.letterTemplate = String(next.letterTemplate ?? '').slice(0, 6000); await kvSet('settings', next); return next;
}
export const getLastScan = () => kvGet<{ at?: string; mode?: string; scanned?: number; queued?: number; boards?: number; errors?: string[]; emerging?: string[] }>('lastScan', {});
const loadModel = () => kvGet<L.Model>('model', L.emptyModel());
/** Phone comes only from a secret, never from the repo; only the admin panel ever sees it. */
export const ownerFields = () => ({ name: PROFILE.displayName, email: PROFILE.contactEmail, phone: process.env.OWNER_PHONE || '(set OWNER_PHONE to fill this in)', city: JOB_CONFIG.owner.city, workAuthorisation: JOB_CONFIG.owner.workAuthorisation, availability: JOB_CONFIG.owner.availability, currentStatus: JOB_CONFIG.owner.status });

/** One scan: read the boards, filter, score, write letters, store the best matches, email a digest. Never submits anything. */
export async function runJobScan(opts: { mode?: WorkMode; jobs?: Job[]; now?: Date } = {}) {
  const settings = await getSettings(); const now = opts.now ?? new Date(); const day = now.toISOString().slice(0, 10);
  const mode = opts.mode ?? settings.mode; const lim = JOB_CONFIG.limits;
  if (!settings.enabled && !opts.jobs) return { skipped: 'disabled' as const };
  const boards = JOB_BOARDS.slice(0, lim.maxBoardsPerScan); const errors: string[] = [];
  let jobs = opts.jobs; if (!jobs) { const r = await (await import('./sources')).fetchAllBoards(boards, (j) => isInternship(j)); jobs = r.jobs; errors.push(...r.errors); }
  const model = await loadModel();
  const since = new Date(now.getTime() - lim.dedupeDays * 864e5);
  const recent = await db.jobMatch.findMany({ where: { createdAt: { gte: since } }, select: { externalId: true, company: true, title: true, createdAt: true } });
  const seenIds = new Set<string>(recent.map((r: any) => r.externalId)), seenKeys = new Set<string>(recent.map((r: any) => `${r.company}|${r.title}`.toLowerCase()));
  const today = recent.filter((r: any) => new Date(r.createdAt).toISOString().slice(0, 10) === day).length; const room = Math.max(0, lim.dailyCap - today);
  const boost = (k: string, t: string) => L.familyBoost(model, k, t);
  type Cand = { job: Job; fam: string; match: number; why: string[]; evidence: { line: string }[]; place: ReturnType<typeof placeOk>; ratingNote: string | null; exploration?: boolean };
  const cands: Cand[] = []; let skipped = 0;
  for (const j of jobs) {
    if (seenIds.has(j.id) || seenKeys.has(`${j.company}|${j.title}`.toLowerCase())) { skipped++; continue; }
    if (!isInternship(j)) { skipped++; continue; }
    const place = placeOk(JOB_CONFIG.countries, j, mode); if (!place.ok) { skipped++; continue; }
    if (j.rating != null && j.rating < lim.minCompanyRating && !(j.startup && lim.ratingWaivedForStartups)) { skipped++; continue; }
    if (j.rating == null && !j.startup && lim.ratingPolicy === 'skip_unknown') { skipped++; continue; }
    const ratingNote = j.rating == null ? (j.startup && lim.ratingWaivedForStartups ? 'startup: rating waived' : 'rating unverified: check Glassdoor for 4.5+') : null;
    const fam = familyFor(j, boost); if (!fam) { skipped++; continue; }
    const s = scoreJob(j, place.countries); const adj = L.adjustment(model, j, fam, place.countries); const total = Math.max(0, Math.min(100, s.match + adj.pts));
    if (adj.pts) s.why.push(`learned from your feedback ${adj.pts > 0 ? '+' : ''}${adj.pts} (${adj.top.join(', ')})`);
    const base = { job: j, fam, match: total, why: s.why, evidence: s.evidence, place, ratingNote };
    if (total >= lim.minMatch) cands.push(base); else if (total >= lim.minMatch - 8 && L.explore(j.id, day)) cands.push({ ...base, exploration: true }); else skipped++;
  }
  cands.sort((a, b) => (a.exploration ? 1 : 0) - (b.exploration ? 1 : 0) || b.match - a.match);
  const explore = cands.filter((c) => c.exploration).slice(0, 1), main = cands.filter((c) => !c.exploration);
  const chosen = [...main.slice(0, Math.max(0, room - explore.length)), ...explore.slice(0, room ? 1 : 0)];
  const stored: { title: string; company: string; score: number; url: string; tier: string }[] = [];
  for (const c of chosen) {
    const tier = c.exploration ? 'EXPLORATION' : c.match >= lim.priorityMatch ? 'READY_FOR_ONE_CLICK_REVIEW' : 'REVIEW';
    const letter = writeLetter(c.job, { evidence: c.evidence, mode, countries: c.place.countries, remote: c.place.remote, template: settings.letterTemplate });
    const todo = ['Read the posting and confirm the role is a fit', 'Write any other open-ended answers yourself (nothing else is auto-written)', 'Check the resume attached is the one named above'];
    if (letter.note) todo.push(letter.note); if (mode !== 'remote' && c.place.countries[0] && c.place.countries[0] !== 'india') todo.push('On-site abroad: confirm visa / work-permit sponsorship for interns');
    try {
      await db.jobMatch.create({ data: { externalId: c.job.id, company: c.job.company, title: c.job.title, location: c.job.location, url: c.job.url, country: c.place.countries[0] ?? null, remote: c.place.remote, score: c.match, tier, family: c.fam, resume: JOB_CONFIG.families[c.fam].resume, why: JSON.stringify(c.why), letter: letter.text, letterNeeded: !!letter.required, todo: JSON.stringify(todo), ratingNote: c.ratingNote, snapshot: JSON.stringify({ id: c.job.id, company: c.job.company, title: c.job.title, text: c.job.text.slice(0, 1500), countries: c.place.countries }) } });
      stored.push({ title: c.job.title, company: c.job.company, score: c.match, url: c.job.url, tier });
      if (tier === 'READY_FOR_ONE_CLICK_REVIEW' && !opts.jobs) { const row = await db.jobMatch.findUnique({ where: { externalId: c.job.id }, select: { id: true } }); if (row) background(jobCard({ id: row.id, title: c.job.title, company: c.job.company, score: c.match, resume: JOB_CONFIG.families[c.fam].resume, url: c.job.url, essayFree: !letter.required })); }
    } catch (e) { logger.warn('JobAgent', `Could not store ${c.job.id}: ${(e as Error).message}`); }
  }
  const known = new Set<string>([...JOB_CONFIG.skills.core, ...JOB_CONFIG.skills.adjacent].flatMap((s) => s.split(' ')));
  const emerging = L.observeMarket(model, jobs.filter((j) => isInternship(j)), day, known);
  await kvSet('model', model);
  const summary = { at: now.toISOString(), mode, scanned: jobs.length, queued: stored.length, boards: boards.length, errors, emerging };
  await kvSet('lastScan', summary);
  if (stored.length && !opts.jobs) {
    const lines = stored.map((s) => `- ${s.score}/100 ${s.tier === 'READY_FOR_ONE_CLICK_REVIEW' ? '[ready for one-click review]' : s.tier === 'EXPLORATION' ? '[exploration]' : ''} ${s.title}, ${s.company}\n  ${s.url}`).join('\n');
    sendEmail({ to: PROFILE.contactEmail, subject: `[Job agent] ${stored.length} role${stored.length === 1 ? '' : 's'} ready for your review`, text: `Mode: ${mode}. Nothing was submitted; every application needs your click.\n\n${lines}\n\nLetters and prefilled details are in Admin -> Job Agent.` }).catch((e) => logger.warn('JobAgent', `digest email failed: ${(e as Error).message}`));
  }
  logger.info('JobAgent', `Scan done (${mode}): scanned ${jobs.length}, queued ${stored.length}, skipped ${skipped}, source errors ${errors.length}`);
  return { ...summary, skipped, stored };
}

const OUTCOME: Record<string, string> = { APPLIED: 'applied', SKIPPED: 'skipped', REJECTED: 'rejected', INTERVIEW: 'interview', OFFER: 'offer', NO_REPLY: 'no_reply' };
/** Records what you did with a role and teaches the model. wrongResume = the family the resume should have been. */
export async function setJobStatus(id: string, status?: string, wrongResume?: string) {
  const row = await db.jobMatch.findUnique({ where: { id } }); if (!row) throw new Error('Job not found');
  const snap = JSON.parse(row.snapshot || '{}'); const model = await loadModel(); const job = { id: row.externalId, company: row.company, title: row.title, text: snap.text || '' };
  if (wrongResume) { if (!JOB_CONFIG.families[wrongResume]) throw new Error('Unknown resume family'); L.correctFamily(model, job, row.family, wrongResume); await db.jobMatch.update({ where: { id }, data: { family: wrongResume, resume: JOB_CONFIG.families[wrongResume].resume } }); }
  if (status) { if (!(status in OUTCOME) && status !== 'NEW') throw new Error('Unknown status'); if (OUTCOME[status]) L.learn(model, job, row.family, snap.countries || [], OUTCOME[status]); await db.jobMatch.update({ where: { id }, data: { status } }); }
  await kvSet('model', model); return db.jobMatch.findUnique({ where: { id } });
}
