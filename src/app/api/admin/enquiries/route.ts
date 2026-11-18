import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { ENQUIRY_STATUSES } from '@/lib/adminInput';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await prisma.visitorEnquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  if (typeof body?.id !== 'string' || !(ENQUIRY_STATUSES as readonly string[]).includes(body?.status)) return NextResponse.json({ error: 'Valid id and status are required.' }, { status: 400 });
  const r = await prisma.visitorEnquiry.updateMany({ where: { id: body.id }, data: { status: body.status } });
  if (r.count === 0) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.visitorEnquiry.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
