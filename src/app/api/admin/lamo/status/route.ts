import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { engineStatus, noteCall, geminiBase } from '@/lib/lamo/engineStatus';

export const dynamic = 'force-dynamic';
const unauth = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

/** GET: current engine health (no secrets). POST: send one tiny test prompt to Gemini and report the result. */
export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauth();
  return NextResponse.json({ status: engineStatus() });
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauth();
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ ok: false, message: 'GEMINI_API_KEY is not set on this deployment, so LAMO is using the basic built-in engine. Run: npx wrangler secret put GEMINI_API_KEY', status: engineStatus() });
  const model = process.env.LAMO_GEMINI_MODEL || 'gemini-2.5-flash';
  try {
    const res = await fetch(`${geminiBase()}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ready' }] }], generationConfig: { maxOutputTokens: 20 } }),
      signal: AbortSignal.timeout(9000),
    });
    noteCall(res.ok, res.ok ? null : `HTTP ${res.status}`);
    const hint = res.status === 400 || res.status === 403 ? 'The key was rejected. Create a new key in Google AI Studio and set it again.' : res.status === 404 ? `Model "${model}" was not found. Set LAMO_GEMINI_MODEL to a valid model.` : res.status === 429 ? 'Quota or rate limit reached.' : '';
    return NextResponse.json({ ok: res.ok, message: res.ok ? 'Gemini is answering. LAMO is using the full conversational engine.' : `Gemini returned HTTP ${res.status}. ${hint}`.trim(), status: engineStatus() });
  } catch (e) {
    noteCall(false, (e as Error).message);
    return NextResponse.json({ ok: false, message: 'Could not reach Gemini: ' + (e as Error).message, status: engineStatus() });
  }
}
