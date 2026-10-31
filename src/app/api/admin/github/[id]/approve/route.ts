import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

// PATCH /api/admin/github/[id]/approve
// Body: { action: 'APPROVE' | 'REJECT' | 'SKIP', categorySlug?, subcategory?, skills? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, categorySlug, subcategory, skills } = await req.json();

  const repo = await prisma.githubRepository.findUnique({ where: { id: params.id } });
  if (!repo) return NextResponse.json({ error: 'Repository not found' }, { status: 404 });

  const validActions = ['APPROVE', 'REJECT', 'SKIP'];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const updated = await prisma.githubRepository.update({
    where: { id: params.id },
    data: {
      classificationStatus: action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'SKIPPED',
      ...(categorySlug && { suggestedCategorySlug: categorySlug }),
      ...(subcategory && { suggestedSubcategory: subcategory }),
      ...(skills && { suggestedSkills: JSON.stringify(skills) }),
    },
  });

  return NextResponse.json({ success: true, repo: updated });
}

