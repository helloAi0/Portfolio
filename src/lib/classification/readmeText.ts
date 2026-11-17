/**
 * Pure helpers that turn raw README markdown into clean, real text for project drafts.
 * Nothing here invents content: every output string is a (cleaned) excerpt of the README.
 */

const EXCLUDED_LIVE_HOSTS = [
  'github.com', 'githubusercontent.com', 'shields.io', 'badgen.net', 'codecov.io', 'travis-ci.com', 'travis-ci.org',
  'linkedin.com', 'npmjs.com', 'pypi.org', 'youtube.com', 'youtu.be', 'twitter.com', 'x.com', 'localhost', '127.0.0.1',
  'opensource.org', 'creativecommons.org', 'nextjs.org', 'reactjs.org', 'react.dev', 'nodejs.org', 'python.org',
];

export function stripMarkdown(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')       // images / badges
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // links -> text
    .replace(/<[^>]+>/g, '')                    // html
    .replace(/[*_`~>#]+/g, '')                  // emphasis, code, quotes, headings
    .replace(/\s+/g, ' ')
    .trim();
}

function withoutCodeBlocks(readme: string): string {
  return readme.replace(/```[\s\S]*?```/g, '\n');
}

/** First meaningful paragraph, max 400 chars. Empty string if the README has no prose. */
export function extractReadmeSummary(readme: string | null): string {
  if (!readme) return '';
  const lines = withoutCodeBlocks(readme).split('\n');
  const para: string[] = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { if (para.length) break; continue; }
    if (t.startsWith('#') || t.startsWith('|') || /^[-*+]\s/.test(t) || /^(---|===)/.test(t)) { if (para.length) break; continue; }
    const clean = stripMarkdown(t);
    if (clean.length < 15) continue;
    para.push(clean);
    if (para.join(' ').length >= 400) break;
  }
  const out = para.join(' ').slice(0, 400).trim();
  return out.length >= 20 ? out : '';
}

/** Cleaned prose from the start of the README (code blocks, badges, html removed). */
export function extractReadmeExcerpt(readme: string | null, maxChars = 1500): string {
  if (!readme) return '';
  const out: string[] = [];
  let total = 0;
  for (const raw of withoutCodeBlocks(readme).split('\n')) {
    const t = raw.trim();
    if (!t || t.startsWith('|') || /^(---|===)/.test(t)) continue;
    const isHeading = t.startsWith('#');
    const clean = stripMarkdown(t);
    if (clean.length < (isHeading ? 3 : 15)) continue;
    const line = isHeading ? `\n${clean}` : clean;
    if (total + line.length > maxChars) break;
    out.push(line);
    total += line.length;
  }
  return out.join('\n').trim();
}

/** Bullet points under a "Features"/"Highlights" heading, verbatim but de-marked-up. Max 8. */
export function extractFeatureBullets(readme: string | null): string[] {
  if (!readme) return [];
  const lines = withoutCodeBlocks(readme).split('\n');
  const bullets: string[] = [];
  let inFeatures = false;
  for (const raw of lines) {
    const t = raw.trim();
    if (/^#{1,4}\s/.test(t)) {
      if (inFeatures && bullets.length) break;
      inFeatures = /feature|highlight|capabilit/i.test(t);
      continue;
    }
    if (inFeatures && /^[-*+]\s+/.test(t)) {
      const clean = stripMarkdown(t.replace(/^[-*+]\s+(\[[ xX]\]\s*)?/, ''));
      if (clean.length >= 8) bullets.push(clean.slice(0, 160));
      if (bullets.length >= 8) break;
    }
  }
  return bullets;
}

function hostOf(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

export function isExcludedLiveHost(host: string): boolean {
  return EXCLUDED_LIVE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

export interface LiveUrlCandidate { url: string; source: 'github-homepage' | 'readme' }

/**
 * Candidate live-site URLs. The GitHub "homepage" field is an explicit owner action and is
 * trusted as a candidate; README links are only candidates when the surrounding text says
 * live/demo/deployed/website. Candidates are never published without a reachability check
 * and owner review.
 */
export function extractLiveUrls(homepage: string | null, readme: string | null): LiveUrlCandidate[] {
  const out: LiveUrlCandidate[] = [];
  const seen = new Set<string>();
  const add = (url: string, source: LiveUrlCandidate['source']) => {
    const clean = url.replace(/[).,;]+$/, '');
    const host = hostOf(clean);
    if (!host || !/^https?:\/\//i.test(clean) || isExcludedLiveHost(host)) return;
    const key = clean.replace(/\/$/, '').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ url: clean, source });
  };
  if (homepage && /^https?:\/\//i.test(homepage.trim())) {
    const h = hostOf(homepage.trim());
    if (h && !isExcludedLiveHost(h)) add(homepage.trim(), 'github-homepage');
  }
  if (readme) {
    const text = withoutCodeBlocks(readme);
    for (const line of text.split('\n')) {
      if (!/live|demo|deployed|website|visit|try it|production/i.test(line)) continue;
      const urls = line.match(/https?:\/\/[^\s)>\]"']+/g) ?? [];
      for (const u of urls) add(u, 'readme');
    }
  }
  return out.slice(0, 3);
}

/** Blocks private/internal targets before any outbound reachability probe (SSRF guard). */
export function isSafePublicUrl(url: string): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false;
  }
  if (h.includes(':') || h === '[::1]') return false; // no raw IPv6 literals
  return true;
}
