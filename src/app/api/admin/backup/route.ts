import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { createBackup } from '@/lib/backup';
import { loadModelInfo } from '@/lib/backupSchema';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Downloads a full JSON backup of all content (no passwords or sessions). */
export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const backup = await createBackup(prisma, loadModelInfo(Prisma));
    await prisma.adminAuditLog.create({ data: { action: 'BACKUP_DOWNLOADED', target: 'Database', explanation: `Backup downloaded by ${(admin as any).username ?? 'owner'}` } }).catch(() => undefined);
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    return new NextResponse(JSON.stringify(backup), {
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="portfolio-backup-${stamp}.json"`, 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'The backup could not be created.' }, { status: 500 });
  }
}
