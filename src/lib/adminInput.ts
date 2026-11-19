/** Small validation helpers for admin forms (pure, unit tested). Errors are plain sentences shown to the owner. */
export const text = (v: unknown, max = 500): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** '' / undefined -> null (not provided). Unreadable -> 'invalid'. */
export function dateOrNull(v: unknown): Date | null | 'invalid' {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime()) || d.getFullYear() < 1990 || d.getFullYear() > new Date().getFullYear() + 10) return 'invalid';
  return d;
}

/** '' -> null. Non-https or unparsable -> 'invalid'. */
export function httpsOrNull(v: unknown): string | null | 'invalid' {
  if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) return null;
  try { const u = new URL(String(v).trim()); return u.protocol === 'https:' ? u.toString() : 'invalid'; } catch { return 'invalid'; }
}

const num = (v: unknown, max: number): number | null | 'invalid' => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : 'invalid';
};

/** Owner-entered coding statistics (fallback when automatic sync fails). */
export function cleanManualStats(b: any): { error: string } | { data: { platform: 'LEETCODE' | 'GEEKSFORGEEKS'; username: string; totalSolved: number; easySolved: number | null; mediumSolved: number | null; hardSolved: number | null; globalRanking: number | null; profileUrl: string } } {
  const platform = String(b?.platform).toUpperCase();
  if (platform !== 'LEETCODE' && platform !== 'GEEKSFORGEEKS') return { error: 'Choose LeetCode or GeeksforGeeks.' };
  const username = text(b?.username, 80);
  if (!username || !/^[A-Za-z0-9_.-]+$/.test(username)) return { error: 'Enter your username (letters, numbers, . _ - only).' };
  const total = num(b?.totalSolved, 100000), easy = num(b?.easySolved, 100000), med = num(b?.mediumSolved, 100000), hard = num(b?.hardSolved, 100000), rank = num(b?.globalRanking, 100000000);
  if (total === null || total === 'invalid') return { error: 'Total solved must be a whole number.' };
  if ([easy, med, hard, rank].includes('invalid' as never)) return { error: 'Numbers must be whole numbers (leave blank if unknown).' };
  if (easy !== null && med !== null && hard !== null && (easy as number) + (med as number) + (hard as number) > total) return { error: 'Easy + Medium + Hard cannot be more than the total.' };
  const profileUrl = platform === 'LEETCODE' ? `https://leetcode.com/${username}` : `https://www.geeksforgeeks.org/user/${username}/`;
  return { data: { platform, username, totalSolved: total, easySolved: easy as number | null, mediumSolved: med as number | null, hardSolved: hard as number | null, globalRanking: rank as number | null, profileUrl } };
}

export const slugifyName = (s: string) => s.toLowerCase().replace(/\+\+/g, 'pp').replace(/#/g, 'sharp').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Manually added skill. Never "demonstrated": only the owner's statement or "learning". */
export function cleanSkillInput(b: any): { error: string } | { data: { name: string; slug: string; domain: string; level: 'LEARNING' | 'OWNER_CONFIRMED'; notes: string | null } } {
  const name = text(b?.name, 80);
  if (!name) return { error: 'Skill name is required.' };
  const slug = slugifyName(name);
  if (!slug) return { error: 'Skill name must contain letters or numbers.' };
  const level = b?.level === 'LEARNING' ? 'LEARNING' : 'OWNER_CONFIRMED';
  return { data: { name, slug, domain: text(b?.domain, 80) || 'General', level, notes: text(b?.notes, 500) } };
}

/** Manually added project (for work that is not on GitHub). */
export function cleanProjectInput(b: any): { error: string } | { data: { title: string; slug: string; tagline: string; description: string; categorySlug: string; problemStatement: string; solution: string; keyFeatures: string[]; githubRepo: string | null; liveDeployment: string | null; skillNames: string[] } } {
  const title = text(b?.title, 120), tagline = text(b?.tagline, 200), description = text(b?.description, 3000);
  if (!title || !tagline || !description) return { error: 'Title, one-line summary and description are required.' };
  const slug = slugifyName(title);
  if (!slug) return { error: 'Title must contain letters or numbers.' };
  const categorySlug = text(b?.categorySlug, 60);
  if (!categorySlug) return { error: 'Choose a category.' };
  const gh = httpsOrNull(b?.githubRepo), live = httpsOrNull(b?.liveDeployment);
  if (gh === 'invalid' || live === 'invalid') return { error: 'Links must start with https://' };
  const lines = (v: unknown) => (typeof v === 'string' ? v.split('\n') : Array.isArray(v) ? v.map(String) : []).map((x) => x.trim()).filter(Boolean).slice(0, 20);
  return { data: { title, slug, tagline, description, categorySlug, problemStatement: text(b?.problemStatement, 2000) || description, solution: text(b?.solution, 2000) || description, keyFeatures: lines(b?.keyFeatures), githubRepo: gh, liveDeployment: live, skillNames: (typeof b?.skills === 'string' ? b.skills.split(',') : []).map((x: string) => x.trim()).filter(Boolean).slice(0, 15) } };
}

export function cleanAmbition(b: any): { error: string } | { data: { horizon: string; title: string; description: string; focus: string[] } } {
  const horizon = text(b?.horizon, 80), title = text(b?.title, 150), description = text(b?.description, 1500);
  if (!horizon || !title || !description) return { error: 'Time horizon, title and description are required.' };
  const focus = (typeof b?.focus === 'string' ? b.focus.split(',') : []).map((x: string) => x.trim().slice(0, 40)).filter(Boolean).slice(0, 8);
  return { data: { horizon, title, description, focus } };
}

export const ENQUIRY_STATUSES = ['UNREAD', 'READ', 'REPLIED', 'ARCHIVED'] as const;

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

/** Partial profile update: only fields that are present are validated and returned. */
export function cleanProfileUpdate(b: any): { error: string } | { data: Record<string, string | null> } {
  const out: Record<string, string | null> = {};
  const set = (k: string, max: number, required = false) => {
    if (!(k in (b ?? {}))) return null;
    const v = text(b[k], max);
    if (required && !v) return `${k} cannot be empty.`;
    out[k] = v; return null;
  };
  for (const [k, max, req] of [['displayName', 100, true], ['headline', 160, true], ['bio', 4000, true], ['location', 120, false]] as const) {
    const e = set(k, max, req); if (e) return { error: e.replace('displayName', 'Name').replace('headline', 'Headline').replace('bio', 'Bio') };
  }
  if ('contactEmail' in (b ?? {})) {
    const e = text(b.contactEmail, 254)?.toLowerCase();
    if (!e || !EMAIL_RE.test(e)) return { error: 'Enter a valid contact email.' };
    out.contactEmail = e;
  }
  for (const k of ['githubUrl', 'linkedinUrl']) {
    if (!(k in (b ?? {}))) continue;
    const u = httpsOrNull(b[k]);
    if (u === 'invalid') return { error: `${k === 'githubUrl' ? 'GitHub' : 'LinkedIn'} link must start with https://` };
    if (k === 'githubUrl' && !u) return { error: 'GitHub link cannot be empty.' };
    out[k] = u;
  }
  if (Object.keys(out).length === 0) return { error: 'Nothing to update.' };
  return { data: out };
}

export const SCHOOL_TYPES = ['HIGHER_EDUCATION', 'HIGH_SCHOOL'] as const;
export const GRAD_STATUSES = ['EXPECTED', 'COMPLETED', 'ATTENDED'] as const;

export function cleanEducation(b: any): { error: string } | { data: { institution: string; institutionAcronym: string | null; schoolType: string; degree: string | null; field: string | null; minor: string | null; location: string | null; startYear: number | null; endYear: number | null; isCurrent: boolean; graduationStatus: string; orderIndex: number } } {
  const institution = text(b?.institution, 200);
  if (!institution) return { error: 'Institution name is required.' };
  const schoolType = String(b?.schoolType);
  if (!(SCHOOL_TYPES as readonly string[]).includes(schoolType)) return { error: 'Choose a level (university or school).' };
  const status = String(b?.graduationStatus);
  if (!(GRAD_STATUSES as readonly string[]).includes(status)) return { error: 'Choose a status.' };
  const yr = (v: unknown): number | null | 'invalid' => { if (v === undefined || v === null || v === '') return null; const n = Number(v); return Number.isInteger(n) && n >= 1990 && n <= 2100 ? n : 'invalid'; };
  const start = yr(b?.startYear), end = yr(b?.endYear);
  if (start === 'invalid' || end === 'invalid') return { error: 'Years must be between 1990 and 2100.' };
  if (start && end && end < start) return { error: 'The end year is before the start year.' };
  if (status === 'EXPECTED' && !end) return { error: 'Enter the expected graduation year.' };
  const order = Number(b?.orderIndex);
  return { data: {
    institution, institutionAcronym: text(b?.institutionAcronym, 20), schoolType, degree: text(b?.degree, 200), field: text(b?.field, 200),
    minor: text(b?.minor, 200), location: text(b?.location, 200), startYear: start, endYear: end,
    isCurrent: Boolean(b?.isCurrent), graduationStatus: status === 'EXPECTED' ? `EXPECTED_${end}` : status,
    orderIndex: Number.isInteger(order) && order >= 0 && order < 100 ? order : 0,
  } };
}
