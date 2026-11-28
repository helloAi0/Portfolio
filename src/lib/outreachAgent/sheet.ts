/**
 * READ-ONLY view of the outreach agent's Google Sheet (the single source of truth, owned by n8n).
 * Uses a Google service account with the read-only Sheets scope. This code can never write to the sheet, never calls
 * Apify/Apollo/Hunter/OpenAI, and never sends email: it only displays what n8n recorded.
 */
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const TOKEN_URL = () => process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const API = () => (process.env.GOOGLE_SHEETS_API_BASE || 'https://sheets.googleapis.com').replace(/\/$/, '');

const b64u = (b: ArrayBuffer | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b);
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const pemToDer = (pem: string) => {
  const body = pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(body); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out.buffer;
};

export const sheetConfigured = () => !!(process.env.GOOGLE_SA_EMAIL && process.env.GOOGLE_SA_PRIVATE_KEY && process.env.OUTREACH_SHEET_ID);

export async function signServiceJwt(email: string, privateKeyPem: string, now = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL(), iat: now, exp: now + 3000 }));
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(privateKeyPem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`));
  return `${header}.${claim}.${b64u(sig)}`;
}

let cached: { token: string; exp: number } | null = null;
async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const jwt = await signServiceJwt(process.env.GOOGLE_SA_EMAIL!, process.env.GOOGLE_SA_PRIVATE_KEY!);
  const res = await fetch(TOKEN_URL(), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Google sign-in failed (HTTP ${res.status}). Check GOOGLE_SA_EMAIL and GOOGLE_SA_PRIVATE_KEY.`);
  const j = await res.json() as { access_token: string; expires_in: number };
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cached.token;
}

/** Reads one tab as objects keyed by its header row. */
export async function readTab(tab: 'Jobs' | 'Contacts' | 'Log'): Promise<Record<string, string>[]> {
  const token = await accessToken();
  const res = await fetch(`${API()}/v4/spreadsheets/${encodeURIComponent(process.env.OUTREACH_SHEET_ID!)}/values/${encodeURIComponent(tab)}?majorDimension=ROWS`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12_000) });
  if (res.status === 403 || res.status === 404) throw new Error(`Cannot read the "${tab}" tab (HTTP ${res.status}). Share the sheet with ${process.env.GOOGLE_SA_EMAIL} as Viewer and check OUTREACH_SHEET_ID.`);
  if (!res.ok) throw new Error(`Google Sheets returned HTTP ${res.status}.`);
  const values = ((await res.json()) as { values?: string[][] }).values ?? [];
  const [head, ...rows] = values; if (!head) return [];
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
