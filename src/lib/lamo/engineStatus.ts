/** In-memory health of the answer engine (per running instance). Shown in Admin so "why are answers poor?" has a visible cause. */
export interface EngineStatus {
  keyConfigured: boolean; model: string; calls: number; accepted: number; rejected: number; builtin: number;
  lastOk: boolean | null; lastAt: string | null; lastError: string | null; lastRejectReason: string | null;
}
const s: Omit<EngineStatus, 'keyConfigured' | 'model'> = { calls: 0, accepted: 0, rejected: 0, builtin: 0, lastOk: null, lastAt: null, lastError: null, lastRejectReason: null };
export const engineStatus = (): EngineStatus => ({ keyConfigured: !!process.env.GEMINI_API_KEY, model: process.env.LAMO_GEMINI_MODEL || 'gemini-2.5-flash', ...s });
export const noteCall = (ok: boolean, error: string | null = null) => { s.calls++; s.lastOk = ok; s.lastAt = new Date().toISOString(); s.lastError = ok ? null : error; };
export const noteAccepted = () => { s.accepted++; };
export const noteRejected = (reason: string) => { s.rejected++; s.lastRejectReason = reason.slice(0, 160); };
export const noteBuiltin = () => { s.builtin++; };
export const geminiBase = () => (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
