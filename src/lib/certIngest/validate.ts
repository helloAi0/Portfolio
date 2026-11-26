/** Pure helpers for the certificate ingestion pipeline (unit tested). Everything from the worker is treated as untrusted. */
export interface Extraction {
  title: string; issuer: string; issueDate: string | null; credentialId: string | null; verifyUrl: string | null;
  confidence: number; sourceType: 'url' | 'pdf'; needsUrlReview: boolean; pdfFileId: string | null;
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n) : '');
/** Lowercase, drop punctuation and filler so "Intro to AI (Certificate)" == "intro to ai". */
export const normalizeKey = (s: string) => s.toLowerCase().replace(/\b(certificate|certification|course|of|completion|the|in|for|and)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** Returns a cleaned extraction, or { error }. Never invents values: unusable optional fields become null. */
export function cleanExtraction(raw: any): Extraction | { error: string } {
  const title = clip(raw?.title, 200), issuer = clip(raw?.issuer, 200);
  if (!title || !issuer) return { error: 'title and issuer are required' };
  let issueDate: string | null = null;
  const d = clip(raw?.issueDate, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) { const t = new Date(d + 'T00:00:00Z'); if (!isNaN(+t) && t.toISOString().slice(0, 10) === d && t.getUTCFullYear() >= 1990 && t <= new Date(Date.now() + 864e5)) issueDate = d; }
  const cid = clip(raw?.credentialId, 120); const credentialId = cid && cid.toLowerCase() !== 'null' && cid.toLowerCase() !== 'n/a' ? cid : null;
  let verifyUrl: string | null = null;
  try { const u = new URL(String(raw?.verifyUrl ?? '')); if (u.protocol === 'https:' && !u.username && !u.password) verifyUrl = u.toString().slice(0, 500); } catch { /* not a URL */ }
  const c = Number(raw?.confidence); const confidence = Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0;
  const sourceType = raw?.sourceType === 'pdf' ? 'pdf' : 'url';
  const pdfFileId = typeof raw?.pdfFileId === 'string' && /^[a-z0-9]{20,40}$/.test(raw.pdfFileId) ? raw.pdfFileId : null;
  // Anything the model could not back with a verification link or a date is flagged for the owner, never silently trusted.
  const needsUrlReview = Boolean(raw?.needsUrlReview) || (!verifyUrl && !pdfFileId) || !issueDate;
  return { title, issuer, issueDate, credentialId, verifyUrl, confidence, sourceType, needsUrlReview, pdfFileId };
}

export interface ExistingCert { id: string; title: string; issuingOrganization: string; credentialId: string | null; reviewStatus: string; credentialUrl: string | null; filePath: string | null }
/** Matches by credential id (exact) or by normalised title + issuer. Only pending / approved rows count. */
export function findDuplicate(rows: ExistingCert[], x: { title: string; issuer: string; credentialId: string | null }) {
  const live = rows.filter((r) => r.reviewStatus === 'pending' || r.reviewStatus === 'approved');
  if (x.credentialId) { const hit = live.find((r) => r.credentialId && r.credentialId.toLowerCase() === x.credentialId!.toLowerCase()); if (hit) return hit; }
  const k = normalizeKey(x.title), org = normalizeKey(x.issuer);
  return live.find((r) => normalizeKey(r.title) === k && normalizeKey(r.issuingOrganization) === org) ?? null;
}
