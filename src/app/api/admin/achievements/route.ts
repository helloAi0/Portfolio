import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const achievements = await prisma.achievement.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: achievements });
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { title, category, organization, date, rankOrAward, description, proofUrl, isPublic, ownerApproved } = body;

    if (!title || !category || !organization) {
      return NextResponse.json({ error: 'Title, category, and organization are required.' }, { status: 400 });
    }

    const achievement = await prisma.achievement.create({
      data: {
        title: title.trim(),
        category: category.trim(),
        organization: organization.trim(),
        date: date ? new Date(date) : null,
        rankOrAward: rankOrAward ? rankOrAward.trim() : null,
        description: description ? description.trim() : null,
        proofUrl: proofUrl ? proofUrl.trim() : null,
        isPublic: Boolean(isPublic),
        ownerApproved: Boolean(ownerApproved),
        verificationStatus: ownerApproved ? 'VERIFIED' : 'PENDING_VERIFICATION',
      },
    });

    return NextResponse.json({ success: true, achievement });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create achievement' }, { status: 500 });
  }
}

