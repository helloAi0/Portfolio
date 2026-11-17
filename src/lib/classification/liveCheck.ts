/**
 * Live-URL reachability check. Candidates are only ever shown/published as "live" after this
 * passes AND the owner approves. SSRF-guarded: public http(s) hosts only, redirects are not
 * followed (a redirect to an internal address must not be fetched), short timeout.
 */
import { isSafePublicUrl, type LiveUrlCandidate } from './readmeText';

export interface CheckedLiveUrl extends LiveUrlCandidate { reachable: boolean; status: number | null; checkedAt: string }

export async function checkLiveUrl(c: LiveUrlCandidate, timeoutMs = 5000): Promise<CheckedLiveUrl> {
  const base = { ...c, checkedAt: new Date().toISOString() };
  if (!isSafePublicUrl(c.url)) return { ...base, reachable: false, status: null };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(c.url, { method: 'HEAD', redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'ProjectLAMO-LinkCheck/1.0' } });
    clearTimeout(t);
    // 2xx, or a redirect (typically http->https / www): the site answers.
    return { ...base, reachable: res.status < 400 || res.status === 405, status: res.status };
  } catch {
    return { ...base, reachable: false, status: null };
  }
}

export async function checkLiveUrls(cands: LiveUrlCandidate[]): Promise<CheckedLiveUrl[]> {
  return Promise.all(cands.slice(0, 3).map((c) => checkLiveUrl(c)));
}
