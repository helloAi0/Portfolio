import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const experiences = await prisma.experience.findMany({
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json({ data: experiences });
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { roleTitle, organization, organizationType, location, startDate, endDate, isCurrent, description, keyContributions, skills, evidenceUrl, isPublic, verified } = body;

    if (!roleTitle || !organization || !startDate || !description) {
      return NextResponse.json({ error: 'Role title, organization, start date, and description are required.' }, { status: 400 });
    }

    const experience = await prisma.experience.create({
      data: {
        roleTitle: roleTitle.trim(),
        organization: organization.trim(),
        organizationType: organizationType || 'Organization',
        location: location ? location.trim() : null,
        startDate: new Date(startDate),
        endDate: endDate && !isCurrent ? new Date(endDate) : null,
        isCurrent: Boolean(isCurrent),
        description: description.trim(),
        keyContributions: keyContributions ? keyContributions.trim() : null,
        skills: skills ? JSON.stringify(skills) : null,
        evidenceUrl: evidenceUrl ? evidenceUrl.trim() : null,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        verified: Boolean(verified),
      },
    });

    return NextResponse.json({ success: true, experience });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create experience record' }, { status: 500 });
  }
}

