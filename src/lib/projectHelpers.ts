/** Pure (DB-free) helpers shared by publication, admin routes and tests. */
export const DIFFICULTIES = ['Foundational', 'Beginner', 'Intermediate', 'Advanced', 'Research-oriented'] as const;

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'project';
}
export function humanizeName(name: string): string {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}
export function isValidHttpUrl(u: string): boolean {
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch { return false; }
}

