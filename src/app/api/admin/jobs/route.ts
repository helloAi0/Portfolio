import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { JOB_CONFIG, JOB_BOARDS } from '@/config/jobScout';
import { getSettings, getLastScan, saveSettings, runJobScan, setJobStatus, ownerFields } from '@/lib/jobs/service';

export const dynamic = 'force-dynamic';
const db = prisma as any;
const unauth = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const parse = (s: string, d: unknown) => { try { return JSON.parse(s); } catch { return d; } };

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauth();
  const [rows, settings, lastScan] = await Promise.all([db.jobMatch.findMany({ orderBy: [{ createdAt: 'desc' }, { score: 'desc' }], take: 200 }), getSettings(), getLastScan()]);
  const data = rows.map((r: any) => ({ ...r, why: parse(r.why, []), todo: parse(r.todo, []), snapshot: undefined, resumeFamilies: undefined }));
  const count = (s: string) => rows.filter((r: any) => r.status === s).length;
  const stats = { total: rows.length, new: count('NEW'), applied: count('APPLIED'), interview: count('INTERVIEW'), offer: count('OFFER') };
  return NextResponse.json({
    data, stats, settings, lastScan, owner: ownerFields(), boards: JOB_BOARDS.length,
    families: Object.fromEntries(Object.entries(JOB_CONFIG.families).map(([k, f]) => [k, f.resume])), limits: JOB_CONFIG.limits,
  });
}

/** POST { action: 'scan', mode? } runs a scan now. Nothing is ever submitted to an employer. */
export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauth();
  const body = await req.json().catch(() => ({}));
  if (body.action !== 'scan') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  try { return NextResponse.json({ success: true, result: await runJobScan({ mode: body.mode }) }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }); }
}

/** PATCH { settings } saves mode / letter template; PATCH { id, status?, wrongResume? } records what you did and teaches the model. */
export async function PATCH(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauth();
  const body = await req.json().catch(() => ({}));
  try {
    if (body.settings) return NextResponse.json({ success: true, settings: await saveSettings(body.settings) });
    if (!body.id) return NextResponse.json({ error: 'id or settings required' }, { status: 400 });
    await setJobStatus(String(body.id), body.status, body.wrongResume);
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
}
