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
