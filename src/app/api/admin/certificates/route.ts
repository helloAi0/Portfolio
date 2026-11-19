import { FILE_URL_RE } from '@/lib/fileUpload';
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

    // File: either an https link, or a file previously uploaded through /api/admin/uploads (stored in the database).
    let safeFilePath: string | null = null;
    let safeFileType: string | null = null;
    if (typeof filePath === 'string' && filePath) {
      const m = filePath.match(FILE_URL_RE);
      if (m) {
        const stored = await prisma.storedFile.findUnique({ where: { id: m[1] }, select: { mimeType: true } });
        if (!stored) return NextResponse.json({ error: 'The uploaded file was not found. Please upload it again.' }, { status: 400 });
        safeFilePath = filePath; safeFileType = stored.mimeType;
      } else if (/^https:\/\//i.test(filePath)) safeFilePath = filePath;
      else return NextResponse.json({ error: 'The file link must start with https://' }, { status: 400 });
    }

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
        fileType: safeFileType,
        isPublic: Boolean(isPublic),
        ownerApproved: Boolean(ownerApproved),
        verificationStatus: 'PENDING_VERIFICATION', // owner approval is not independent verification
      },
    });

    return NextResponse.json({ success: true, certificate });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
  }
}

