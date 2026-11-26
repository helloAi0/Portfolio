import { JOB_CONFIG } from '@/config/jobScout';
const has = (t: string, w: string) => t.includes(w);
export interface Job { id: string; company: string; title: string; location: string; url: string; text: string; startup?: boolean; rating?: number | null }

export function familyFor(job: Job, boost: (fam: string, title: string) => number = () => 0): string | null {
  const t = ` ${job.title.toLowerCase()} `; let best: string | null = null, hits = 0.5;
  for (const [k, f] of Object.entries(JOB_CONFIG.families)) { const n = f.titleWords.filter((w) => has(t, w)).length + boost(k, job.title); if (n > hits) { hits = n; best = k; } }
  return best;
}
export const isInternship = (job: Job) => { const t = job.title.toLowerCase(); return JOB_CONFIG.internTitles.some((w) => t.includes(w)); };

/** Deterministic 0-100 fit score with the reasons spelled out. */
export function scoreJob(job: Job, countries: string[] = []) {
  const text = `${job.title} ${job.text}`.toLowerCase(); const why: string[] = [];
  const core = JOB_CONFIG.skills.core.filter((s) => has(text, s)), adj = JOB_CONFIG.skills.adjacent.filter((s) => has(text, s));
  const tech = Math.min(45, Math.round(core.length * 7 + adj.length * 2.5)); why.push(`technical ${tech}/45 (${core.slice(0, 6).join(', ') || 'no core skills named'})`);
  const intern = isInternship(job); const senior = /\b(senior|staff|principal|lead|manager|director|\d{2,}\+? years|[4-9]\+? years)\b/.test(text.slice(0, 1500));
  const seniority = intern ? (senior ? 12 : 25) : /\b(0-?[12]|entry|graduate|new grad|fresher)\b/.test(text) ? 14 : 3;
  why.push(`seniority ${seniority}/25 (${intern ? 'internship' : 'not an internship'}${senior ? ', mentions seniority' : ''})`);
  const ev = JOB_CONFIG.evidence.filter((e) => e.tags.some((tg) => has(text, tg))); const impact = Math.min(20, ev.length * 7);
  why.push(`evidence ${impact}/20 (${ev.map((e) => e.name).join(', ') || 'none of your projects match'})`);
  // 10%: company / lab reputation (rated 4.5+, or an early-stage startup / lab) and target geography (a country on your list, or remote).
  const rep = job.startup ? 4 : job.rating != null && job.rating >= JOB_CONFIG.limits.minCompanyRating ? 5 : job.rating == null ? 2 : 0;
  const geo = countries.some((c) => JOB_CONFIG.countries.includes(c)) || /\bremote\b/i.test(job.location) ? 5 : 1;
  const reputation = Math.min(10, rep + geo); why.push(`reputation & geography ${reputation}/10`);
  return { match: Math.min(100, tech + seniority + impact + reputation), why, evidence: ev };
}
