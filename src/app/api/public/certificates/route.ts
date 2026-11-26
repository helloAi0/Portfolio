import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

/** Public list. Only certificates the owner approved AND published; pending/rejected can never match this filter. */
export async function GET() {
  const rows = await prisma.certificate.findMany({
    where: { reviewStatus: 'approved', isPublic: true, ownerApproved: true }, orderBy: { issueDate: 'desc' },
    select: { id: true, title: true, issuingOrganization: true, issueDate: true, credentialId: true, credentialUrl: true, filePath: true, description: true },
  });
  return NextResponse.json({ data: rows }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
