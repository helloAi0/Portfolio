import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { cleanAmbition } from '@/lib/adminInput';

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data: await prisma.ambition.findMany({ orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }] }) });
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const c = cleanAmbition(body);
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const count = await prisma.ambition.count();
  const row = await prisma.ambition.create({ data: { horizon: c.data.horizon, title: c.data.title, description: c.data.description, focus: JSON.stringify(c.data.focus), orderIndex: count } });
  return NextResponse.json({ success: true, data: row });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.ambition.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
