export const COUNTRIES: Record<string, string[]> = {
  india: ['india', 'bengaluru', 'bangalore', 'hyderabad', 'pune', 'mumbai', 'delhi', 'gurgaon', 'gurugram', 'noida', 'kolkata', 'chennai'],
  germany: ['germany', 'deutschland', 'berlin', 'munich', 'münchen', 'hamburg', 'frankfurt', 'cologne', 'stuttgart', 'karlsruhe', 'aachen'],
  japan: ['japan', 'tokyo', 'osaka', 'yokohama', 'kyoto', 'nagoya', 'fukuoka'],
  switzerland: ['switzerland', 'zurich', 'zürich', 'geneva', 'lausanne', 'basel', 'zug', 'bern'],
  netherlands: ['netherlands', 'amsterdam', 'rotterdam', 'eindhoven', 'delft', 'utrecht'],
  sweden: ['sweden', 'stockholm', 'gothenburg', 'malmö'], denmark: ['denmark', 'copenhagen'], norway: ['norway', 'oslo'], finland: ['finland', 'helsinki', 'espoo'],
  ireland: ['ireland', 'dublin'], france: ['france', 'paris', 'lyon', 'toulouse'], austria: ['austria', 'vienna', 'wien'], belgium: ['belgium', 'brussels', 'leuven'],
  spain: ['spain', 'madrid', 'barcelona'], portugal: ['portugal', 'lisbon', 'porto'], poland: ['poland', 'warsaw', 'krakow', 'wroclaw'], estonia: ['estonia', 'tallinn'],
  luxembourg: ['luxembourg'], 'united kingdom': ['united kingdom', 'uk', 'london', 'cambridge', 'edinburgh', 'england'],
  'united states': ['united states', 'usa', 'us', 'u.s.', 'new york', 'san francisco', 'seattle', 'california', 'austin', 'boston'], canada: ['canada', 'toronto', 'vancouver'],
};
const GLOBAL = /(worldwide|global(ly)?|anywhere|apac|emea|europe|asia)/i;
const word = (t: string, w: string) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(t);

export const detectCountries = (location = ''): string[] => { const l = location.toLowerCase(); return Object.entries(COUNTRIES).filter(([, ws]) => ws.some((w) => word(l, w))).map(([c]) => c); };
export const isRemote = (job: { location: string; title: string; text?: string }) => /(remote|work from home|distributed|anywhere)/i.test(`${job.location} ${job.title}`) || /\b(fully remote|100% remote)\b/i.test((job.text || '').slice(0, 800));

function remoteEligible(job: { location: string; text?: string }, accepted: string[]) {
  const text = (job.text || '').slice(0, 2500); const where = detectCountries(job.location);
  if (/(must|need to|required to)\s+(be\s+)?(located|based|reside|living)[^.]{0,50}\b(united states|u\.s\.|usa|canada|united kingdom)\b/i.test(text) && !accepted.some((c) => text.toLowerCase().includes(c))) return false;
  if (where.length) return where.some((c) => accepted.includes(c)) || GLOBAL.test(job.location);
  return true;
}
export function placeOk(accepted: string[], job: { location: string; title: string; text?: string }, mode: 'remote' | 'onsite' | 'hybrid') {
  const remote = isRemote(job); const countries = detectCountries(job.location);
  const r = remote && remoteEligible(job, accepted); const o = countries.some((c) => accepted.includes(c));
  const ok = mode === 'remote' ? r : mode === 'onsite' ? o : r || o;
  return { ok, countries, remote, reason: ok ? '' : mode === 'remote' ? (remote ? `remote but not open to your countries (${job.location})` : `not remote (${job.location || 'no location'})`) : `outside your target countries (${job.location || 'no location'})` };
}
