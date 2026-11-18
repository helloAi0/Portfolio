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
