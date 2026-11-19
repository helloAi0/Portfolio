import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { cleanEducation } from '@/lib/adminInput';

export const dynamic = 'force-dynamic';

const guard = (req: NextRequest) => (getAdminFromRequest(req) ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
const readBody = async (req: NextRequest) => { try { return await req.json(); } catch { return null; } };

export async function GET(req: NextRequest) {
  const g = guard(req); if (g) return g;
  return NextResponse.json({ data: await prisma.education.findMany({ orderBy: { orderIndex: 'asc' } }) });
}

export async function POST(req: NextRequest) {
  const g = guard(req); if (g) return g;
  const body = await readBody(req); if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  const c = cleanEducation(body);
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const row = await prisma.education.create({ data: { ...c.data, verificationStatus: 'OWNER_CONFIRMED' } });
  return NextResponse.json({ success: true, data: row });
}

export async function PATCH(req: NextRequest) {
  const g = guard(req); if (g) return g;
  const body = await readBody(req); if (!body || typeof body.id !== 'string') return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  const c = cleanEducation(body);
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const r = await prisma.education.updateMany({ where: { id: body.id }, data: { ...c.data, verificationStatus: 'OWNER_CONFIRMED' } });
  if (r.count === 0) return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const g = guard(req); if (g) return g;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.education.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
