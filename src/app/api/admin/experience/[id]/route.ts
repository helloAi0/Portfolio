import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const updated = await prisma.experience.update({
      where: { id: params.id },
      data: {
        ...(typeof body.isPublic === 'boolean' && { isPublic: body.isPublic }),
        ...(typeof body.verified === 'boolean' && { verified: body.verified }),
        ...(body.roleTitle && { roleTitle: body.roleTitle }),
        ...(body.organization && { organization: body.organization }),
        ...(body.organizationType && { organizationType: body.organizationType }),
        ...(body.description && { description: body.description }),
        ...(body.keyContributions !== undefined && { keyContributions: body.keyContributions }),
        ...(body.skills !== undefined && { skills: JSON.stringify(body.skills) }),
        ...(body.isCurrent !== undefined && { isCurrent: body.isCurrent }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      },
    });

    return NextResponse.json({ success: true, experience: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update experience' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.experience.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete experience' }, { status: 500 });
  }
}

