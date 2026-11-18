import { text, dateOrNull, httpsOrNull } from '@/lib/adminInput';
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

    if (!text(title, 200) || !text(category, 80) || !text(organization, 200)) {
      return NextResponse.json({ error: 'Title, category, and organization are required.' }, { status: 400 });
    }
    const when = dateOrNull(date), proof = httpsOrNull(proofUrl);
    if (when === 'invalid') return NextResponse.json({ error: 'Please enter a valid date.' }, { status: 400 });
    if (proof === 'invalid') return NextResponse.json({ error: 'The proof link must start with https://' }, { status: 400 });

    const achievement = await prisma.achievement.create({
      data: {
        title: text(title, 200)!,
        category: text(category, 80)!,
        organization: text(organization, 200)!,
        date: when,
        rankOrAward: text(rankOrAward, 200),
        description: text(description, 2000),
        proofUrl: proof,
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

