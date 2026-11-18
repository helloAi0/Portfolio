/**
 * LAMO request security helpers (pure / dependency-light so they can be unit tested).
 */
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// ---------------------------------------------------------------------------
// Sliding-window rate limiter (in-memory, bounded, injectable clock)
// ---------------------------------------------------------------------------
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private readonly windowMs: number, private readonly max: number, private readonly maxKeys = 5000) {}

  /** Returns true when the request is ALLOWED (and records it). */
  allow(key: string, now: number = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) this.prune(now);
    return true;
  }

  private prune(now: number) {
    for (const [k, v] of Array.from(this.hits.entries())) {
      if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k);
    }
    // Hard cap: drop oldest keys if still too large.
    while (this.hits.size > this.maxKeys) {
      const first = this.hits.keys().next().value as string | undefined;
      if (first === undefined) break;
      this.hits.delete(first);
    }
  }
}

/**
 * Client IP behind a trusted reverse proxy. X-Forwarded-For is appended to by each proxy, so the
 * LEFT-most entries are attacker-controlled. We take the entry `hops` positions from the right
 * (Render = 1 hop). Falls back to a constant so limits still apply when no header is present.
 */
export function getClientIp(forwardedFor: string | null, hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1)): string {
  if (!forwardedFor) return 'unknown';
  const parts = forwardedFor.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return 'unknown';
  const idx = Math.max(0, parts.length - Math.max(1, hops));
  return parts[idx].slice(0, 64);
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
export const isValidSessionId = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(s);

export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  if (e.length > 254 || !/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/.test(e)) return null;
  return e;
}

/** Visitor display name: plain text only, bounded. */
export function sanitizeName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const n = v.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return n.length ? n : null;
}

/** Escape text for safe inclusion in HTML emails. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// IDs and tokens
// ---------------------------------------------------------------------------
const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alike characters

export function generateQuestionId(now: Date = new Date()): string {
  const bytes = randomBytes(6);
  let suffix = '';
  for (const b of Array.from(bytes)) suffix += ID_ALPHABET[b % ID_ALPHABET.length];
  return `LQ-${now.getFullYear()}-${suffix}`;
}

export function newFollowUpToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: hashToken(token) };
}
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
export function tokenMatches(token: unknown, hash: string | null | undefined): boolean {
  if (typeof token !== 'string' || !hash) return false;
  const a = Buffer.from(hashToken(token)), b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Lowercased word-only form used to detect repeats of the same question. */
export function normalizeQuestionKey(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}
