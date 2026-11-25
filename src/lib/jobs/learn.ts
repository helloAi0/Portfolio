/**
 * The agent's memory. It learns from (1) what you do with each role and (2) what the market posts.
 * It never adds a skill to your profile by itself; rising terms are only suggested.
 */
const STOP = new Set('the and for with you our are will that this from your have has not but all can who their they about into more than other what when where which work team role job company years year experience skills ability strong using used use new able also within across including such well etc intern internship application apply join looking help build make part full time'.split(' '));
export const tokens = (s: string) => (s.toLowerCase().match(/[a-z][a-z+#.]{2,19}/g) || []).filter((w) => !STOP.has(w));
export interface Model { w: Record<string, number>; n: Record<string, number>; fam: Record<string, Record<string, number>>; days: Record<string, Record<string, number>>; events: { id: string; outcome: string; at: string }[] }
export const emptyModel = (): Model => ({ w: {}, n: {}, fam: {}, days: {}, events: [] });
export interface JobLike { id: string; company: string; title: string; text: string }

export function features(job: JobLike, fam: string | null, countries: string[]): string[] {
  const f = new Set<string>(); tokens(job.title).forEach((t) => f.add('t:' + t)); f.add('c:' + job.company.toLowerCase()); if (fam) f.add('f:' + fam);
  countries.forEach((c) => f.add('k:' + c)); new Set(tokens(job.text).slice(0, 400)).forEach((t) => f.add('b:' + t)); return Array.from(f);
}
const REWARD: Record<string, number> = { offer: 1, interview: 0.8, applied: 0.25, no_reply: -0.05, skipped: -0.3, rejected: -0.5 };
export function learn(m: Model, job: JobLike, fam: string | null, countries: string[], outcome: string): boolean {
  const r = REWARD[outcome]; if (r === undefined) return false;
  for (const f of features(job, fam, countries)) { const n = m.n[f] || 0, lr = Math.max(0.06, 1 / (n + 2)); m.w[f] = (m.w[f] || 0) + lr * (r - (m.w[f] || 0)); m.n[f] = n + 1; }
  m.events.push({ id: job.id, outcome, at: new Date().toISOString() }); if (m.events.length > 500) m.events.shift(); return true;
}
export function correctFamily(m: Model, job: JobLike, wrong: string, right: string) {
  for (const t of tokens(job.title)) { (m.fam[right] ??= {})[t] = (m.fam[right][t] || 0) + 1; (m.fam[wrong] ??= {})[t] = (m.fam[wrong][t] || 0) - 1; }
  m.events.push({ id: job.id, outcome: `wrong_resume:${wrong}->${right}`, at: new Date().toISOString() });
}
export const familyBoost = (m: Model, fam: string, title: string) => tokens(title).reduce((a, t) => a + (m.fam[fam]?.[t] || 0), 0);
/** Bounded to +-10 points so the 85 / 90 gates stay meaningful. Needs at least 2 observations per feature. */
export function adjustment(m: Model, job: JobLike, fam: string | null, countries: string[]) {
  const used = features(job, fam, countries).filter((f) => (m.n[f] || 0) >= 2); if (!used.length) return { pts: 0, top: [] as string[] };
  const mean = used.reduce((a, f) => a + m.w[f], 0) / used.length;
  const top = [...used].sort((a, b) => Math.abs(m.w[b]) - Math.abs(m.w[a])).slice(0, 3).map((f) => `${f.slice(2)} ${m.w[f] >= 0 ? '+' : ''}${m.w[f].toFixed(2)}`);
  return { pts: Math.max(-10, Math.min(10, Math.round(mean * 14))), top };
}
export function observeMarket(m: Model, jobs: JobLike[], day: string, known: Set<string>): string[] {
  const c: Record<string, number> = {}; for (const j of jobs) new Set(tokens(`${j.title} ${j.text.slice(0, 1500)}`)).forEach((t) => (c[t] = (c[t] || 0) + 1));
  m.days[day] = c; const keys = Object.keys(m.days).sort(); while (keys.length > 30) delete m.days[keys.shift() as string];
  const past = keys.filter((k) => k !== day); if (past.length < 3) return [];
  return Object.entries(c).filter(([t, n]) => n >= 4 && !known.has(t)).map(([t, n]) => { const avg = past.reduce((a, k) => a + (m.days[k][t] || 0), 0) / past.length; return { t, n, ratio: n / Math.max(1, avg) }; })
    .filter((x) => x.ratio >= 2).sort((a, b) => b.ratio - a.ratio).slice(0, 10).map((x) => `${x.t} (${x.n} postings, ${x.ratio.toFixed(1)}x usual)`);
}
/** About one near-miss role in four is shown anyway, so the model can find out whether the bar is too strict. */
export const explore = (id: string, day: string, epsilon = 0.25) => { let h = 0; for (const ch of id + day) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h % 1000) / 1000 < epsilon; };
