/** Pure validation for owner-entered solved problems (no DB). */
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export interface SolutionInput {
  platform?: unknown; problemTitle?: unknown; problemUrl?: unknown; difficulty?: unknown;
  language?: unknown; code?: unknown; notes?: unknown; solvedAt?: unknown; topicTags?: unknown;
}

/** Validates owner input. Returns an error string or the clean record. */
export function cleanSolutionInput(i: SolutionInput): { error: string } | { data: {
  platform: string; problemTitle: string; problemSlug: string; problemUrl: string | null; difficulty: string | null;
  language: string | null; code: string | null; notes: string | null; solvedAt: Date; topicTags: string | null } } {
  const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const title = str(i.problemTitle, 200);
  if (!title) return { error: 'Problem title is required.' };
  const platform = ['LEETCODE', 'GEEKSFORGEEKS', 'OTHER'].includes(String(i.platform).toUpperCase()) ? String(i.platform).toUpperCase() : 'OTHER';
  const difficulty = DIFFICULTIES.find((d) => d.toLowerCase() === String(i.difficulty ?? '').toLowerCase()) ?? null;
  let url: string | null = null;
  if (i.problemUrl) {
    try { const u = new URL(String(i.problemUrl)); if (u.protocol !== 'https:') throw new Error(); url = u.toString(); } catch { return { error: 'Problem link must be an https URL.' }; }
  }
  const solvedAt = i.solvedAt ? new Date(String(i.solvedAt)) : new Date();
  if (isNaN(solvedAt.getTime())) return { error: 'Invalid date.' };
  const tags = Array.isArray(i.topicTags) ? i.topicTags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10) : typeof i.topicTags === 'string' ? i.topicTags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10) : [];
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'problem';
  return { data: { platform, problemTitle: title, problemSlug: slug, problemUrl: url, difficulty, language: str(i.language, 40), code: str(i.code, 20000), notes: str(i.notes, 2000), solvedAt, topicTags: tags.length ? JSON.stringify(tags) : null } };
}
