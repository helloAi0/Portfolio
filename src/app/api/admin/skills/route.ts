import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

// GET — list skills with filtering
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  const level = searchParams.get('level');

  const skills = await prisma.skill.findMany({
    where: {
      ...(domain && { domain }),
      ...(level && { level }),
    },
    include: {
      projects: { include: { project: { select: { id: true, slug: true, title: true } } } },
    },
    orderBy: [{ verified: 'desc' }, { domain: 'asc' }, { orderIndex: 'asc' }],
  });

  return NextResponse.json({ data: skills });
}

// PATCH — owner updates a skill (verify, change level, correct domain)
export async function PATCH(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, verified, level, proficiencyLevel, evidenceNotes, domain, category, subcategory } = body;

  if (!id) return NextResponse.json({ error: 'Skill ID required' }, { status: 400 });

  const updated = await prisma.skill.update({
    where: { id },
    data: {
      ...(typeof verified === 'boolean' && { verified }),
      ...(typeof verified === 'boolean' && { detectedOnly: !verified }),
      ...(level && { level }),
      ...(proficiencyLevel && { proficiencyLevel }),
      ...(evidenceNotes && { evidenceNotes }),
      ...(domain && { domain }),
      ...(category && { category }),
      ...(subcategory && { subcategory }),
      lastConfirmedAt: verified ? new Date() : undefined,
    },
  });

  return NextResponse.json({ success: true, skill: updated });
}

