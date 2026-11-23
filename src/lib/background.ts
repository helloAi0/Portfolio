/**
 * Runs work after the response has been sent (owner e-mail notifications).
 * On Cloudflare Workers a promise that is not handed to waitUntil() is cancelled as soon as the response goes out,
 * which would lose the e-mail and leave database calls half-finished, so it must be registered here.
 */
export function background(work: Promise<unknown>): void {
  const safe = work.catch(() => undefined);
  const ctx = (globalThis as any)[Symbol.for('__cloudflare-context__')]?.ctx;
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(safe);
}
