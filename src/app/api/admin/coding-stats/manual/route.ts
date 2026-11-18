import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { cleanManualStats } from '@/lib/adminInput';

/** Owner-entered statistics. A later successful automatic sync replaces them with live numbers. */
export async function PUT(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const c = cleanManualStats(body);
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const { platform, ...fields } = c.data;
  const data = { ...fields, dataSource: 'MANUAL', lastSyncedAt: new Date(), syncError: null };
  const saved = await prisma.codingPlatformProfile.upsert({ where: { platform }, create: { platform, ...data }, update: data });
  return NextResponse.json({ success: true, data: saved });
}
