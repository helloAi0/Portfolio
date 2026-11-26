import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { removeUploadByUrl } from '@/lib/storage';
import { dateOrNull, httpsOrNull, text } from '@/lib/adminInput';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const issued = dateOrNull(body.issueDate), url = httpsOrNull(body.credentialUrl);
    if (issued === 'invalid') return NextResponse.json({ error: 'Please enter a valid date.' }, { status: 400 });
    if (url === 'invalid') return NextResponse.json({ error: 'The verification link must start with https://' }, { status: 400 });
    if (body.status !== undefined && !['approved', 'rejected', 'pending'].includes(body.status)) return NextResponse.json({ error: 'status must be approved, rejected or pending' }, { status: 400 });
    // Approve = live immediately (public + approved). Reject / back to pending = hidden everywhere public.
    const review = body.status === 'approved' ? { reviewStatus: 'approved', isPublic: true, ownerApproved: true, verificationStatus: 'VERIFIED', reviewedAt: new Date() }
      : body.status === 'rejected' ? { reviewStatus: 'rejected', isPublic: false, ownerApproved: false, verificationStatus: 'PENDING_VERIFICATION', reviewedAt: new Date() }
      : body.status === 'pending' ? { reviewStatus: 'pending', isPublic: false, ownerApproved: false, verificationStatus: 'PENDING_VERIFICATION' } : {};
    const updated = await prisma.certificate.update({
      where: { id: params.id },
      data: {
        ...(typeof body.isPublic === 'boolean' && { isPublic: body.isPublic }),
        ...(typeof body.ownerApproved === 'boolean' && {
          ownerApproved: body.ownerApproved,
          verificationStatus: body.ownerApproved ? 'VERIFIED' : 'PENDING_VERIFICATION',
          reviewStatus: body.ownerApproved ? 'approved' : undefined,
        }),
        ...(text(body.title, 200) && { title: text(body.title, 200)! }),
        ...(text(body.issuingOrganization, 200) && { issuingOrganization: text(body.issuingOrganization, 200)! }),
        ...(body.credentialId !== undefined && { credentialId: text(body.credentialId, 120) }),
        ...(body.credentialUrl !== undefined && { credentialUrl: url, needsUrlReview: url ? false : undefined }),
        ...(body.issueDate !== undefined && { issueDate: issued }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.skillsCovered !== undefined && { skillsCovered: body.skillsCovered }),
        ...review,
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
    const cert = await prisma.certificate.findUnique({ where: { id: params.id }, select: { filePath: true } });
    if (!cert) return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 });
    await prisma.certificate.delete({ where: { id: params.id } });
    await removeUploadByUrl(cert?.filePath); // do not leave orphaned uploads
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete certificate' }, { status: 500 });
  }
}

