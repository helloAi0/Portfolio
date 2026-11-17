import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { suggestSkillsFromText } from '@/lib/skills/suggest';
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

    // Suggest skills (whole-word, owner confirms) when none were provided.
    const suggestedSkills = skillsCovered ?? JSON.stringify(suggestSkillsFromText(`${title} ${description ?? ''}`));

    // File upload is NOT IMPLEMENTED: no storage backend yet. Only an https link to an externally hosted file is accepted.
    const safeFilePath = typeof filePath === 'string' && /^https:\/\//i.test(filePath) ? filePath : null;

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
        filePath: safeFilePath,
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

