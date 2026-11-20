import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Serves an uploaded file. Public only while it is attached to a public, owner-approved certificate or
 * to a published project (cover/gallery) or the resume (photo/PDF); otherwise admin only. Unknown or unauthorised files both return 404.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[a-z0-9]{20,40}$/.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const file = await prisma.storedFile.findUnique({ where: { id: params.id } });
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const isAdmin = !!getAdminFromRequest(req);
  if (!isAdmin) {
    const published = await prisma.certificate.findFirst({ where: { filePath: `/api/files/${file.id}`, isPublic: true, ownerApproved: true }, select: { id: true } });
    const url = `/api/files/${file.id}`;
    const onProject = published ? null : await prisma.project.findFirst({
      where: { approvalStatus: 'APPROVED', OR: [{ coverImage: url }, { gallery: { contains: url } }] }, select: { id: true },
    });
    const onResume = published || onProject ? null : await prisma.resumeSettings.findFirst({ where: { OR: [{ photoUrl: url }, { pdfUrl: url }] }, select: { id: true } });
    if (!published && !onProject && !onResume) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return new NextResponse(file.data as unknown as BodyInit, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(file.size),
      'Content-Disposition': `inline; filename="${file.filename.replace(/"/g, '')}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'Cache-Control': isAdmin ? 'private, no-store' : 'public, max-age=300',
    },
  });
}
