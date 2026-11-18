import { text, dateOrNull, httpsOrNull } from '@/lib/adminInput';
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

    if (!text(title, 200) || !text(issuingOrganization, 200)) {
      return NextResponse.json({ error: 'Title and issuing organization are required.' }, { status: 400 });
    }
    const issued = dateOrNull(issueDate), expires = dateOrNull(expiryDate), credUrl = httpsOrNull(credentialUrl);
    if (issued === 'invalid' || expires === 'invalid') return NextResponse.json({ error: 'Please enter a valid date.' }, { status: 400 });
    if (credUrl === 'invalid') return NextResponse.json({ error: 'The credential link must start with https://' }, { status: 400 });

    // Suggest skills (whole-word, owner confirms) when none were provided.
    const suggestedSkills = skillsCovered ?? JSON.stringify(suggestSkillsFromText(`${title} ${description ?? ''}`));

    // File upload is NOT IMPLEMENTED: no storage backend yet. Only an https link to an externally hosted file is accepted.
    const safeFilePath = typeof filePath === 'string' && /^https:\/\//i.test(filePath) ? filePath : null;

    const certificate = await prisma.certificate.create({
      data: {
        title: text(title, 200)!,
        issuingOrganization: text(issuingOrganization, 200)!,
        issueDate: issued,
        expiryDate: expires,
        credentialId: text(credentialId, 120),
        credentialUrl: credUrl,
        description: text(description, 2000),
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

