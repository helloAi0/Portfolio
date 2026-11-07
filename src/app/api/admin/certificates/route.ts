import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const certificates = await prisma.certificate.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: certificates });
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { title, issuingOrganization, issueDate, expiryDate, credentialId, credentialUrl, description, skillsCovered, filePath, fileType, isPublic, ownerApproved } = body;

    if (!title || !issuingOrganization) {
      return NextResponse.json({ error: 'Title and issuing organization are required.' }, { status: 400 });
    }

    // Auto-suggest skills if not provided
    let suggestedSkills = skillsCovered;
    if (!suggestedSkills && description) {
      const lower = (description + ' ' + title).toLowerCase();
      const detected: string[] = [];
      if (lower.includes('python')) detected.push('python');
      if (lower.includes('c++') || lower.includes('cpp')) detected.push('cpp');
      if (lower.includes('robot')) detected.push('robotics');
      if (lower.includes('ros')) detected.push('ros2');
      if (lower.includes('security') || lower.includes('cyber')) detected.push('cybersecurity');
      if (lower.includes('machine learning') || lower.includes('ml')) detected.push('machine-learning');
      if (lower.includes('ai') || lower.includes('artificial intelligence')) detected.push('artificial-intelligence');
      if (lower.includes('react') || lower.includes('web')) detected.push('javascript');
      suggestedSkills = JSON.stringify(detected);
    }

    const certificate = await prisma.certificate.create({
      data: {
        title: title.trim(),
        issuingOrganization: issuingOrganization.trim(),
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        credentialId: credentialId ? credentialId.trim() : null,
        credentialUrl: credentialUrl ? credentialUrl.trim() : null,
        description: description ? description.trim() : null,
        skillsCovered: suggestedSkills || null,
        filePath: filePath || null,
        fileType: fileType || null,
        isPublic: Boolean(isPublic),
        ownerApproved: Boolean(ownerApproved),
        verificationStatus: ownerApproved ? 'VERIFIED' : 'PENDING_VERIFICATION',
      },
    });

    return NextResponse.json({ success: true, certificate });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
  }
}

