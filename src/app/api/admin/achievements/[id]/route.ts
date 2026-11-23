import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { httpsOrNull } from '@/lib/adminInput';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    let proof: string | null | undefined;
    if (body.proofUrl !== undefined) {
      const p = httpsOrNull(body.proofUrl);
      if (p === 'invalid') return NextResponse.json({ error: 'The proof link must start with https://' }, { status: 400 });
      proof = p;
    }
    const updated = await prisma.achievement.update({
      where: { id: params.id },
      data: {
        ...(typeof body.isPublic === 'boolean' && { isPublic: body.isPublic }),
        ...(typeof body.ownerApproved === 'boolean' && {
          ownerApproved: body.ownerApproved,
          verificationStatus: body.ownerApproved ? 'VERIFIED' : 'PENDING_VERIFICATION',
        }),
        ...(body.title && { title: body.title }),
        ...(body.category && { category: body.category }),
        ...(body.organization && { organization: body.organization }),
        ...(body.description !== undefined && { description: body.description }),
        ...(proof !== undefined && { proofUrl: proof }),
      },
    });

    return NextResponse.json({ success: true, achievement: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update achievement' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const r = await prisma.achievement.deleteMany({ where: { id: params.id } });
    if (r.count === 0) return NextResponse.json({ error: 'Achievement not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete achievement' }, { status: 500 });
  }
}

