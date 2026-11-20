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

export const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

/** Parse a textarea / array of evidence links. Only https links are kept; anything else is an error. */
export function cleanEvidenceLinks(v: unknown): { error: string } | { links: string[] } {
  const raw = (typeof v === 'string' ? v.split(/[\n,]+/) : Array.isArray(v) ? v.map(String) : []).map((x) => x.trim()).filter(Boolean);
  const links: string[] = [];
  for (const r of raw.slice(0, 8)) {
    const u = httpsOrNull(r);
    if (u === 'invalid' || u === null) return { error: `"${r.slice(0, 60)}" is not a valid link. Evidence links must start with https://` };
    if (!links.includes(u)) links.push(u);
  }
  return { links };
}

/** Manually added skill. Never "demonstrated": only the owner's statement or "learning". */
export function cleanSkillInput(b: any): { error: string } | { data: { name: string; slug: string; domain: string; level: 'LEARNING' | 'OWNER_CONFIRMED'; notes: string | null; proficiency: string | null; links: string[] } } {
  const name = text(b?.name, 80);
  if (!name) return { error: 'Skill name is required.' };
  const slug = slugifyName(name);
  if (!slug) return { error: 'Skill name must contain letters or numbers.' };
  const level = b?.level === 'LEARNING' ? 'LEARNING' : 'OWNER_CONFIRMED';
  const proficiency = (PROFICIENCY_LEVELS as readonly string[]).includes(b?.proficiency) ? (b.proficiency as string) : null;
  const ev = cleanEvidenceLinks(b?.evidenceLinks);
  if ('error' in ev) return { error: ev.error };
  return { data: { name, slug, domain: text(b?.domain, 80) || 'General', level, notes: text(b?.notes, 500), proficiency, links: ev.links } };
}

/** Edit an existing skill: status, proficiency, note, area and evidence links (all optional). */
export const SKILL_LEVELS = ['DEMONSTRATED', 'OWNER_CONFIRMED', 'PRACTICING', 'LEARNING', 'DETECTED'] as const;
export function cleanSkillUpdate(b: any): { error: string } | { data: { level?: string; proficiency?: string; notes?: string | null; domain?: string; links?: string[] } } {
  const data: { level?: string; proficiency?: string; notes?: string | null; domain?: string; links?: string[] } = {};
  if (b?.level !== undefined) {
    if (!(SKILL_LEVELS as readonly string[]).includes(b.level)) return { error: 'Choose a valid status.' };
    data.level = b.level;
  }
  if (b?.proficiency !== undefined) {
    if (!(PROFICIENCY_LEVELS as readonly string[]).includes(b.proficiency)) return { error: 'Choose a valid proficiency.' };
    data.proficiency = b.proficiency;
  }
  if (b?.notes !== undefined) data.notes = text(b.notes, 500);
  if (b?.domain !== undefined) { const d = text(b.domain, 80); if (d) data.domain = d; }
  if (b?.evidenceLinks !== undefined) {
    const ev = cleanEvidenceLinks(b.evidenceLinks);
    if ('error' in ev) return { error: ev.error };
    data.links = ev.links;
  }
  return { data };
}

const FILE_OR_HTTPS = /^\/api\/files\/[a-z0-9]{20,40}$/;
/** An image/GIF reference: an uploaded file (/api/files/<id>) or an https link. */
export function cleanMediaUrl(v: unknown): string | null | 'invalid' {
  if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) return null;
  const t = String(v).trim();
  if (FILE_OR_HTTPS.test(t)) return t;
  return httpsOrNull(t);
}
const toLines = (v: unknown, max = 20, len = 400): string[] =>
  (typeof v === 'string' ? v.split('\n') : Array.isArray(v) ? v.map(String) : []).map((x) => x.trim().slice(0, len)).filter(Boolean).slice(0, max);

export interface ProjectMediaFields { coverImage: string | null; gallery: string[]; learnings: string[]; }

/** Shared by create and edit: cover image, gallery (max 8) and "what I learned" lines. */
export function cleanProjectMedia(b: any): { error: string } | ProjectMediaFields {
  const cover = cleanMediaUrl(b?.coverImage);
  if (cover === 'invalid') return { error: 'The cover image must be an uploaded file or an https link.' };
  const gallery: string[] = [];
  for (const g of toLines(b?.gallery, 8, 300)) {
    const u = cleanMediaUrl(g);
    if (u === 'invalid' || u === null) return { error: 'Every gallery image must be an uploaded file or an https link.' };
    gallery.push(u);
  }
  return { coverImage: cover, gallery, learnings: toLines(b?.learnings, 15) };
}

/** Manually added project (for work that is not on GitHub). */
export function cleanProjectInput(b: any): { error: string } | { data: { title: string; slug: string; tagline: string; description: string; categorySlug: string; problemStatement: string; solution: string; keyFeatures: string[]; challenges: string[]; results: string[]; githubRepo: string | null; liveDeployment: string | null; skillNames: string[] } & ProjectMediaFields } {
  const title = text(b?.title, 120), tagline = text(b?.tagline, 200), description = text(b?.description, 6000);
  if (!title || !tagline || !description) return { error: 'Title, one-line summary and description are required.' };
  const slug = slugifyName(title);
  if (!slug) return { error: 'Title must contain letters or numbers.' };
  const categorySlug = text(b?.categorySlug, 60);
  if (!categorySlug) return { error: 'Choose a domain.' };
  const gh = httpsOrNull(b?.githubRepo), live = httpsOrNull(b?.liveDeployment);
  if (gh === 'invalid' || live === 'invalid') return { error: 'Links must start with https://' };
  const media = cleanProjectMedia(b);
  if ('error' in media) return { error: media.error };
  return { data: {
    title, slug, tagline, description, categorySlug,
    problemStatement: text(b?.problemStatement, 2000) || description, solution: text(b?.solution, 3000) || description,
    keyFeatures: toLines(b?.keyFeatures), challenges: toLines(b?.challenges), results: toLines(b?.results),
    githubRepo: gh, liveDeployment: live,
    skillNames: (typeof b?.skills === 'string' ? b.skills.split(',') : []).map((x: string) => x.trim()).filter(Boolean).slice(0, 15),
    ...media,
  } };
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

export const RESUME_SECTIONS = ['education', 'skills', 'projects', 'certificates', 'achievements', 'experience'] as const;
export const RESUME_TEMPLATES = ['imperial', 'paper'] as const;

/** Resume Studio settings: summary, photo, downloadable PDF, template, hidden sections and custom sections. */
export function cleanResumeSettings(b: any): { error: string } | { data: { summary: string | null; photoUrl: string | null; pdfUrl: string | null; template: string; hiddenSections: string[]; extraSections: { title: string; body: string }[] } } {
  const photo = cleanMediaUrl(b?.photoUrl), pdf = cleanMediaUrl(b?.pdfUrl);
  if (photo === 'invalid' || pdf === 'invalid') return { error: 'Photo and PDF must be an uploaded file or an https link.' };
  const template = (RESUME_TEMPLATES as readonly string[]).includes(b?.template) ? b.template : 'imperial';
  const hidden = (Array.isArray(b?.hiddenSections) ? b.hiddenSections : []).filter((x: unknown) => (RESUME_SECTIONS as readonly string[]).includes(String(x)));
  const extra: { title: string; body: string }[] = [];
  for (const e of (Array.isArray(b?.extraSections) ? b.extraSections : []).slice(0, 6)) {
    const title = text(e?.title, 60), body = text(e?.body, 1500);
    if (title && body) extra.push({ title, body });
  }
  return { data: { summary: text(b?.summary, 800), photoUrl: photo, pdfUrl: pdf, template, hiddenSections: hidden, extraSections: extra } };
}
