import { NextRequest, NextResponse } from 'next/server';
import { requireWorker } from '@/lib/certIngest/internalAuth';
import { prisma } from '@/lib/prisma';
import { readUpload } from '@/lib/storage';
import { JOB_CONFIG } from '@/config/jobScout';
import { FILE_URL_RE } from '@/lib/fileUpload';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { family: string } }) {
  const denied = requireWorker(req); if (denied) return denied;
  const slot = JOB_CONFIG.resumeSlot[params.family]; if (!slot) return NextResponse.json({ error: 'Unknown family' }, { status: 404 });
  const rs = await prisma.resumeSettings.findUnique({ where: { id: 'singleton' } });
  const m = FILE_URL_RE.exec((rs as any)?.[slot] ?? ''); if (!m) return NextResponse.json({ error: 'That resume has not been uploaded yet (Admin → Resume).' }, { status: 404 });
  const file = await prisma.storedFile.findUnique({ where: { id: m[1] } }); const bytes = file ? await readUpload(file) : null;
  if (!file || !bytes) return NextResponse.json({ error: 'Resume file missing' }, { status: 404 });
  return new NextResponse(bytes as unknown as BodyInit, { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' } });
}
