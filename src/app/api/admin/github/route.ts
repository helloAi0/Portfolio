import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { syncGithubRepositories } from '@/lib/services/githubSyncService';
import { prisma } from '@/lib/prisma';

// GET /api/admin/github — list synced repos
export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // 'PENDING' | 'SUGGESTED' | 'APPROVED' | 'REJECTED'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = 20;

  const whereClause = status ? { classificationStatus: status } : {};

  const [repos, total] = await Promise.all([
    prisma.githubRepository.findMany({
      where: whereClause,
      orderBy: { pushedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.githubRepository.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    data: repos.map((r) => ({
      ...r,
      languages: safeJsonParse(r.languages, {}),
      topics: safeJsonParse(r.topics, []),
      suggestedSkills: safeJsonParse(r.suggestedSkills, []),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST /api/admin/github — trigger manual sync
export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await syncGithubRepositories('MANUAL');
  return NextResponse.json(result, { status: result.success ? 200 : 503 });
}

function safeJsonParse<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

