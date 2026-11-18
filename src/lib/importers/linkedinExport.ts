/**
 * Parser for LinkedIn's official "Get a copy of your data" export (Settings > Data privacy).
 * This is the legitimate way to bring LinkedIn content in: no scraping, no login automation,
 * no credentials. Pure functions only (no DB) so they are unit tested.
 */

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, newlines inside quotes, BOM). */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

/** Rows -> objects keyed by header. LinkedIn sometimes puts a notes paragraph before the header. */
export function csvToObjects(input: string, requiredHeader: string): Record<string, string>[] {
  const rows = parseCsv(input);
  const headerIdx = rows.findIndex((r) => r.some((c) => c.trim().toLowerCase() === requiredHeader.toLowerCase()));
  if (headerIdx < 0) return [];
  const header = rows[headerIdx].map((h) => h.trim());
  return rows.slice(headerIdx + 1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Accepts "2024-05-12 10:22:33", "2024-05-12", "May 2024", "2024". Returns null if unreadable. */
export function parseLinkedinDate(v: string | undefined): Date | null {
  if (!v) return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) { const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return isNaN(d.getTime()) ? null : d; }
  m = s.match(/^([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (m) { const mi = MONTHS.indexOf(m[1].toLowerCase()); if (mi >= 0) return new Date(Date.UTC(+m[2], mi, 1)); }
  m = s.match(/^(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[1], 0, 1));
  return null;
}

const httpsUrl = (v: string | undefined): string | null => {
  if (!v) return null;
  try { const u = new URL(v.trim()); return u.protocol === 'https:' ? u.toString() : null; } catch { return null; }
};

export interface ImportedCertificate {
  title: string; issuingOrganization: string; issueDate: Date | null; expiryDate: Date | null;
  credentialId: string | null; credentialUrl: string | null;
}
export function mapCertifications(csv: string): ImportedCertificate[] {
  return csvToObjects(csv, 'Name')
    .filter((r) => r['Name'])
    .map((r) => ({
      title: r['Name'].slice(0, 200),
      issuingOrganization: (r['Authority'] || 'Not specified').slice(0, 200),
      issueDate: parseLinkedinDate(r['Started On']),
      expiryDate: parseLinkedinDate(r['Finished On']),
      credentialId: r['License Number'] || null,
      credentialUrl: httpsUrl(r['Url']),
    }));
}

export function mapSkills(csv: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of csvToObjects(csv, 'Name')) {
    const n = (r['Name'] || '').trim().slice(0, 80);
    if (n && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); out.push(n); }
  }
  return out;
}

export interface ImportedPost { contentExcerpt: string; postUrl: string | null; publishedAt: Date; title: string | null }
export function mapShares(csv: string): ImportedPost[] {
  return csvToObjects(csv, 'ShareCommentary')
    .map((r) => {
      const text = (r['ShareCommentary'] || '').trim();
      const date = parseLinkedinDate(r['Date']);
      const link = httpsUrl(r['ShareLink']);
      return { text, date, link };
    })
    .filter((x) => x.text && x.date && (!x.link || /(^|\.)linkedin\.com$/i.test(new URL(x.link).hostname)))
    .map((x) => ({
      contentExcerpt: x.text.slice(0, 1500),
      postUrl: x.link,
      publishedAt: x.date as Date,
      title: x.text.split(/\n/)[0].slice(0, 90),
    }));
}

/** Decide which export file a pasted/uploaded CSV is, from its header (so the owner never has to choose). */
export function detectLinkedinCsv(csv: string): 'CERTIFICATIONS' | 'SKILLS' | 'SHARES' | 'UNKNOWN' {
  const head = parseCsv(csv).slice(0, 6).flat().map((c) => c.trim().toLowerCase());
  if (head.includes('sharecommentary')) return 'SHARES';
  if (head.includes('authority') && head.includes('name')) return 'CERTIFICATIONS';
  if (head.includes('name') && head.length <= 12 && !head.includes('authority')) return 'SKILLS';
  return 'UNKNOWN';
}
