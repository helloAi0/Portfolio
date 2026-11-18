import { text, dateOrNull, httpsOrNull } from '@/lib/adminInput';
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

    if (!text(roleTitle, 200) || !text(organization, 200) || !startDate || !text(description, 4000)) {
      return NextResponse.json({ error: 'Role title, organization, start date, and description are required.' }, { status: 400 });
    }
    const start = dateOrNull(startDate), end = dateOrNull(endDate), evidence = httpsOrNull(evidenceUrl);
    if (start === 'invalid' || end === 'invalid') return NextResponse.json({ error: 'Please enter valid dates.' }, { status: 400 });
    if (start && end && !isCurrent && end < start) return NextResponse.json({ error: 'The end date is before the start date.' }, { status: 400 });
    if (evidence === 'invalid') return NextResponse.json({ error: 'The evidence link must start with https://' }, { status: 400 });

    const experience = await prisma.experience.create({
      data: {
        roleTitle: text(roleTitle, 200)!,
        organization: text(organization, 200)!,
        organizationType: organizationType || 'Organization',
        location: text(location, 200),
        startDate: start as Date,
        endDate: isCurrent ? null : end,
        isCurrent: Boolean(isCurrent),
        description: text(description, 4000)!,
        keyContributions: text(keyContributions, 4000),
        skills: skills ? JSON.stringify(skills) : null,
        evidenceUrl: evidence,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        verified: Boolean(verified),
      },
    });

    return NextResponse.json({ success: true, experience });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create experience record' }, { status: 500 });
  }
}

