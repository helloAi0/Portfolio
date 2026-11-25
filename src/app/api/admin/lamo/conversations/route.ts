import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { detectAudience } from '@/lib/lamo/audience';

export const dynamic = 'force-dynamic';

/** Every public LAMO chat, newest first, with who the visitor seems to be (guessed only from what they typed) and whether they showed hiring intent. */
export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const convs = await prisma.lamoConversation.findMany({ orderBy: { updatedAt: 'desc' }, take: 150, include: { messages: { orderBy: { createdAt: 'asc' }, take: 60 } } });
  const data = convs.map((c) => {
    const user = c.messages.filter((m) => m.role === 'USER').map((m) => m.content);
    const a = detectAudience(user);
    return {
      id: c.id, visitorName: c.visitorName || a.name || null, visitorEmail: c.visitorEmail, role: a.kind, org: a.org || null, hiringIntent: a.dealIntent,
      turns: user.length, startedAt: c.createdAt, lastAt: c.updatedAt,
      messages: c.messages.map((m) => ({ role: m.role, content: m.content, at: m.createdAt, confidence: m.confidence })),
    };
  });
  const day = Date.now() - 864e5, week = Date.now() - 7 * 864e5;
  const stats = { total: data.length, today: data.filter((d) => +new Date(d.lastAt) > day).length, week: data.filter((d) => +new Date(d.lastAt) > week).length, hiring: data.filter((d) => d.hiringIntent).length, withContact: data.filter((d) => d.visitorEmail).length };
  return NextResponse.json({ data, stats });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.lamoConversation.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
