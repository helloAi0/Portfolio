import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { cleanSkillInput } from '@/lib/adminInput';

// GET — list skills with filtering
export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
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


// POST: owner adds a skill by hand. Stored as "stated by the owner" or "learning", never as demonstrated.
export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const c = cleanSkillInput(body);
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const { name, slug, domain, level, notes } = c.data;
  if (await prisma.skill.findUnique({ where: { slug } })) return NextResponse.json({ error: `"${name}" is already in your skills.` }, { status: 409 });
  const skill = await prisma.skill.create({
    data: { slug, name, domain, category: domain, level, verified: false, detectedOnly: false, confidenceScore: 0.6, evidenceNotes: notes, evidenceSources: JSON.stringify(['owner:manual']), lastConfirmedAt: new Date() },
  });
  return NextResponse.json({ success: true, skill });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.skill.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
