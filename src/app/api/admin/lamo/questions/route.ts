import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  const whereClause: any = {};
  if (status && status !== 'ALL') {
    whereClause.status = status;
  }
  if (category && category !== 'ALL') {
    whereClause.category = category;
  }
  if (search) {
    whereClause.OR = [
      { question: { contains: search } },
      { questionId: { contains: search } },
      { visitorEmail: { contains: search } },
    ];
  }

  const questions = await prisma.unansweredQuestion.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: questions });
}
