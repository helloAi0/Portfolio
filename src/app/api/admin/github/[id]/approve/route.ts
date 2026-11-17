import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { publishRepositoryAsProject, unpublishProject } from '@/lib/services/projectPublicationService';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/github/[id]/approve
 * Body: { action: 'APPROVE'|'REJECT'|'SKIP'|'UNPUBLISH', categorySlug?, subcategory?, skills?: string[],
 *         difficulty?, title?, tagline?, description?, liveDeployment?, featured? }
 * APPROVE creates/updates the public Project (owner action). REJECT is sticky across syncs.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const action = String(body.action ?? '');
  if (!['APPROVE', 'REJECT', 'SKIP', 'UNPUBLISH'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const repo = await prisma.githubRepository.findUnique({ where: { id: params.id } });
  if (!repo) return NextResponse.json({ error: 'Repository not found' }, { status: 404 });

  try {
    if (action === 'APPROVE') {
      const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : undefined);
      const project = await publishRepositoryAsProject(params.id, {
        categorySlug: str('categorySlug'), subcategory: str('subcategory'), difficulty: str('difficulty'),
        title: str('title'), tagline: str('tagline'), description: str('description'),
        liveDeployment: body.liveDeployment === null ? null : str('liveDeployment'),
        skills: Array.isArray(body.skills) ? (body.skills as unknown[]).filter((s): s is string => typeof s === 'string') : undefined,
        featured: typeof body.featured === 'boolean' ? body.featured : undefined,
      }, admin.username ?? 'owner');
      return NextResponse.json({ success: true, project: { id: project.id, slug: project.slug } });
    }
    if (action === 'UNPUBLISH') {
      if (!repo.linkedProjectId) return NextResponse.json({ error: 'No linked project' }, { status: 400 });
      await unpublishProject(repo.linkedProjectId, 'Unpublished by owner', admin.username ?? 'owner');
      return NextResponse.json({ success: true });
    }
    if (repo.linkedProjectId && action === 'REJECT') await unpublishProject(repo.linkedProjectId, 'Repository rejected by owner', admin.username ?? 'owner');
    const updated = await prisma.githubRepository.update({ where: { id: params.id }, data: { classificationStatus: action === 'REJECT' ? 'REJECTED' : 'SKIPPED' } });
    return NextResponse.json({ success: true, repo: { id: updated.id, classificationStatus: updated.classificationStatus } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
