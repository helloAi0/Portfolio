import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const updated = await prisma.certificate.update({
      where: { id: params.id },
      data: {
        ...(typeof body.isPublic === 'boolean' && { isPublic: body.isPublic }),
        ...(typeof body.ownerApproved === 'boolean' && {
          ownerApproved: body.ownerApproved,
          verificationStatus: body.ownerApproved ? 'VERIFIED' : 'PENDING_VERIFICATION',
        }),
        ...(body.title && { title: body.title }),
        ...(body.issuingOrganization && { issuingOrganization: body.issuingOrganization }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.skillsCovered !== undefined && { skillsCovered: body.skillsCovered }),
      },
    });

    return NextResponse.json({ success: true, certificate: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update certificate' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.certificate.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete certificate' }, { status: 500 });
  }
}

