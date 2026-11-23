import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { removeUploadByUrl } from '@/lib/storage';
import { cleanResumeSettings } from '@/lib/adminInput';

export const dynamic = 'force-dynamic';

const parse = (v: string | null) => { try { const p = JSON.parse(v ?? '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const r = await prisma.resumeSettings.findUnique({ where: { id: 'singleton' } });
  return NextResponse.json({ data: { summary: r?.summary ?? '', photoUrl: r?.photoUrl ?? '', pdfUrl: r?.pdfUrl ?? '', pdfUrlB: r?.pdfUrlB ?? '', template: r?.template ?? 'imperial', hiddenSections: parse(r?.hiddenSections ?? null), extraSections: parse(r?.extraSections ?? null) } });
}

export async function PUT(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const c = cleanResumeSettings(body);
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const d = c.data;
  const data = { summary: d.summary, photoUrl: d.photoUrl, pdfUrl: d.pdfUrl, pdfUrlB: d.pdfUrlB, template: d.template, hiddenSections: JSON.stringify(d.hiddenSections), extraSections: JSON.stringify(d.extraSections) };
  const before = await prisma.resumeSettings.findUnique({ where: { id: 'singleton' }, select: { pdfUrl: true, pdfUrlB: true, photoUrl: true } });
  await prisma.resumeSettings.upsert({ where: { id: 'singleton' }, create: { id: 'singleton', ...data }, update: data });
  // a replaced or removed PDF/photo must not stay in storage
  if (before?.pdfUrl && before.pdfUrl !== data.pdfUrl) await removeUploadByUrl(before.pdfUrl).catch(() => undefined);
  if (before?.pdfUrlB && before.pdfUrlB !== data.pdfUrlB) await removeUploadByUrl(before.pdfUrlB).catch(() => undefined);
  if (before?.photoUrl && before.photoUrl !== data.photoUrl) await removeUploadByUrl(before.photoUrl).catch(() => undefined);
  await prisma.adminAuditLog.create({ data: { action: 'RESUME_UPDATE', target: 'ResumeSettings', newState: JSON.stringify(Object.keys(data)), explanation: `${(admin as any).username ?? 'owner'} updated the resume settings` } }).catch(() => undefined);
  return NextResponse.json({ success: true });
}
