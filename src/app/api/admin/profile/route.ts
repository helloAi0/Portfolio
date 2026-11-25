import { ensureLegacyClean } from '@/lib/services/legacyCleanupService';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { cleanProfileUpdate } from '@/lib/adminInput';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureLegacyClean();
  return NextResponse.json({ data: await prisma.profile.findFirst({ orderBy: { createdAt: 'desc' } }) });
}

export async function PATCH(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const c = cleanProfileUpdate(body);
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const existing = await prisma.profile.findFirst({ orderBy: { createdAt: 'desc' } });
  const saved = existing
    ? await prisma.profile.update({ where: { id: existing.id }, data: c.data })
    : (c.data.bio ? await prisma.profile.create({ data: { bio: c.data.bio, ...c.data } as any }) : null);
  if (!saved) return NextResponse.json({ error: 'Write a bio to create the profile.' }, { status: 400 });
  // Audit with previous values so a bio change can be rolled back from the Copilot tab.
  const prev: Record<string, unknown> = {};
  if (existing) for (const k of Object.keys(c.data)) prev[k] = (existing as any)[k];
  await prisma.adminAuditLog.create({
    data: { action: 'bio' in c.data ? 'BIOGRAPHY_UPDATE' : 'PROFILE_UPDATE', target: 'Profile', previousState: JSON.stringify(prev), newState: JSON.stringify(c.data), explanation: `Profile edited by ${(admin as any).username ?? 'owner'}` },
  }).catch(() => undefined);
  return NextResponse.json({ success: true, data: saved });
}
