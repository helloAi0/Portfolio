// Public job-board APIs published for exactly this purpose. No logins, no scraping, no evasion.
import type { BoardEntry } from '@/config/jobScout';
import type { Job } from './score';
const strip = (h = '') => h.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
async function get(url: string): Promise<any> { const r = await fetch(url, { headers: { 'User-Agent': 'portfolio-job-agent/1.0 (personal job search)' }, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(String(r.status)); return r.json(); }

export async function fetchBoard(b: BoardEntry): Promise<Job[]> {
  const base = { company: b.name, startup: !!b.startup, rating: b.rating ?? null };
  if (b.ats === 'greenhouse') { const j = await get(`https://boards-api.greenhouse.io/v1/boards/${b.token}/jobs?content=true`); return (j.jobs || []).map((x: any) => ({ ...base, id: `gh:${b.token}:${x.id}`, title: x.title, location: x.location?.name || '', url: x.absolute_url, text: strip(x.content) })); }
  if (b.ats === 'lever') { const j = await get(`https://api.lever.co/v0/postings/${b.token}?mode=json`); return (j || []).map((x: any) => ({ ...base, id: `lv:${b.token}:${x.id}`, title: x.text, location: x.categories?.location || '', url: x.hostedUrl, text: strip(x.descriptionPlain || x.description) })); }
  const j = await get(`https://api.ashbyhq.com/posting-api/job-board/${b.token}`);
  return (j.jobs || []).map((x: any) => ({ ...base, id: `ab:${b.token}:${x.id}`, title: x.title, location: x.location || '', url: x.jobUrl, text: strip(x.descriptionPlain || x.descriptionHtml) }));
}
/** Only internship-looking roles are kept (before scoring), to keep memory and storage small. */
export async function fetchAllBoards(boards: BoardEntry[], keep: (j: Job) => boolean) {
  const jobs: Job[] = []; const errors: string[] = [];
  const results = await Promise.allSettled(boards.map((b) => fetchBoard(b)));
  results.forEach((r, i) => { if (r.status === 'fulfilled') jobs.push(...r.value.filter(keep)); else errors.push(`${boards[i].name}: ${(r.reason as Error).message}`); });
  return { jobs, errors };
}
