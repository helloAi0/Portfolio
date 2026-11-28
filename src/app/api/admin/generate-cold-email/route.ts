import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { getOutreachProfile } from '@/lib/coldEmail/profile';
import { generateColdEmail } from '@/lib/coldEmail/generate';
export const dynamic = 'force-dynamic';

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const recent: number[] = [];

/** Owner-only. Drafts one cold email with Gemini from the owner's own records. It never sends, stores or schedules anything. */
export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const company = clean(b.company, 120), jobTitle = clean(b.jobTitle, 140), recruiter = clean(b.recruiter, 60).split(' ')[0];
  const description = String(b.description ?? '').replace(/\r/g, '').trim().slice(0, 8000);
  if (!company || !jobTitle) return NextResponse.json({ error: 'Company name and job title are required.' }, { status: 400 });
  const now = Date.now(); while (recent.length && now - recent[0] > 60_000) recent.shift();
  if (recent.length >= 10) return NextResponse.json({ error: 'Too many requests. Wait a minute.' }, { status: 429 });
  recent.push(now);
  const profile = await getOutreachProfile();
  if (!profile.resumeUrl) return NextResponse.json({ error: 'No resume is uploaded yet. Upload it in Resume (PDF) first so the email can link to it.' }, { status: 409 });
  try { return NextResponse.json(await generateColdEmail(profile, { company, jobTitle, description, recruiter })); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 502 }); }
}
