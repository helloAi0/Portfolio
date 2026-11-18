import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { cleanSolutionInput } from '@/lib/services/codingSolutionService';

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await prisma.codingSolution.findMany({ orderBy: { solvedAt: 'desc' }, take: 200 });
  return NextResponse.json({ data });
}

/** Add, or update by platform+title (so attaching code to an auto-collected problem just works). */
export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const clean = cleanSolutionInput(body);
  if ('error' in clean) return NextResponse.json({ error: clean.error }, { status: 400 });
  const { platform, problemSlug, ...rest } = clean.data;
  const existing = await prisma.codingSolution.findUnique({ where: { platform_problemSlug: { platform, problemSlug } } });
  const record = existing
    ? await prisma.codingSolution.update({ where: { id: existing.id }, data: { ...rest, difficulty: rest.difficulty ?? existing.difficulty, topicTags: rest.topicTags ?? existing.topicTags } })
    : await prisma.codingSolution.create({ data: { platform, problemSlug, ...rest, source: 'MANUAL' } });
  return NextResponse.json({ success: true, data: record });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.codingSolution.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
