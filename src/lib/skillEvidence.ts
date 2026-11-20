/** Turns stored evidence source strings into labelled links for the public Skills page. */
export interface EvidenceLink { label: string; href: string | null; kind: 'github' | 'link' | 'certificate' | 'project' | 'note' }

export function resolveEvidence(src: string, githubUser: string): EvidenceLink {
  if (src.startsWith('url:')) {
    const href = src.slice(4);
    let host = href;
    try { host = new URL(href).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
    return { label: host.includes('github.com') ? 'GitHub' : host, href, kind: host.includes('github.com') ? 'github' : 'link' };
  }
  if (src.startsWith('github:')) {
    const repo = src.slice(7).replace(/[^A-Za-z0-9._-]/g, '');
    return repo ? { label: `GitHub: ${repo}`, href: `https://github.com/${githubUser}/${repo}`, kind: 'github' } : { label: 'GitHub', href: null, kind: 'note' };
  }
  if (src.startsWith('certificate:')) return { label: 'Certificate', href: '/certificates', kind: 'certificate' };
  if (src.startsWith('project:')) return { label: 'Project', href: '/projects', kind: 'project' };
  if (src === 'owner:manual') return { label: 'Added by owner', href: null, kind: 'note' };
  return { label: src, href: null, kind: 'note' };
}

/** Owner-rated proficiency to a 1-4 step meter. Unrated skills show no meter. */
export function proficiencySteps(p: string | null | undefined): number {
  return ({ BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 } as Record<string, number>)[p ?? ''] ?? 0;
}

/** Merge new manual links in while keeping every non-manual-link source (github:, certificate:, ...). */
export function mergeEvidenceSources(existingJson: string | null, links: string[]): string {
  let arr: string[] = [];
  try { const p = JSON.parse(existingJson ?? '[]'); if (Array.isArray(p)) arr = p.map(String); } catch { /* ignore */ }
  const kept = arr.filter((x) => !x.startsWith('url:'));
  return JSON.stringify([...kept, ...links.map((l) => `url:${l}`)]);
}
