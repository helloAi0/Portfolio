import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { DIFFICULTIES, isValidHttpUrl } from '@/lib/services/projectPublicationService';
import { CATEGORY_SLUGS } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/projects/[id] - owner corrections to a published project.
 * Body (all optional): categorySlug, subcategory, difficulty, liveDeployment (url|null), title, tagline, description,
 * problemStatement, solution, keyFeatures[], challenges[], results[], featured, removeSkillSlugs[], addSkillSlugs[]
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data: Record<string, unknown> = {};
  const text = (k: string) => { if (typeof b[k] === 'string') data[k] = (b[k] as string).slice(0, 5000); };
  ['title', 'tagline', 'description', 'detailedExplanation', 'problemStatement', 'solution', 'subcategory'].forEach(text);
  for (const k of ['keyFeatures', 'challenges', 'results']) if (Array.isArray(b[k])) data[k] = JSON.stringify((b[k] as unknown[]).filter((x) => typeof x === 'string').slice(0, 30));
  if (typeof b.featured === 'boolean') data.featured = b.featured;
  if (b.difficulty !== undefined) {
    if (!(DIFFICULTIES as readonly string[]).includes(String(b.difficulty))) return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
    data.difficulty = b.difficulty; data.difficultyConfirmed = true;
  }
  if (b.liveDeployment !== undefined) {
    if (b.liveDeployment !== null && !isValidHttpUrl(String(b.liveDeployment))) return NextResponse.json({ error: 'Invalid live URL' }, { status: 400 });
    data.liveDeployment = b.liveDeployment;
  }
  if (typeof b.categorySlug === 'string') {
    if (!CATEGORY_SLUGS.has(b.categorySlug)) return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
    const cat = await prisma.projectCategory.findUnique({ where: { slug: b.categorySlug } });
    if (!cat) return NextResponse.json({ error: 'Category missing' }, { status: 400 });
    data.categoryId = cat.id;
  }

  const slugs = (k: string) => (Array.isArray(b[k]) ? (b[k] as unknown[]).filter((x): x is string => typeof x === 'string') : []);
  const remove = slugs('removeSkillSlugs'); const add = slugs('addSkillSlugs');
  if (remove.length) await prisma.projectSkill.deleteMany({ where: { projectId: project.id, skill: { slug: { in: remove } } } });
  for (const slug of add) {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (skill) await prisma.projectSkill.upsert({ where: { projectId_skillId: { projectId: project.id, skillId: skill.id } }, create: { projectId: project.id, skillId: skill.id }, update: {} });
  }

  const updated = await prisma.project.update({ where: { id: project.id }, data });
  if (project.githubRepoId && (data.categoryId || remove.length || add.length)) {
    await prisma.githubRepository.updateMany({ where: { githubId: project.githubRepoId }, data: { ownerOverride: true } });
  }
  await prisma.adminAuditLog.create({ data: { action: 'PROJECT_EDITED', target: `Project:${project.slug}`, previousState: JSON.stringify({ difficulty: project.difficulty, subcategory: project.subcategory, liveDeployment: project.liveDeployment }), newState: JSON.stringify(Object.keys(data)), explanation: `${admin.username ?? 'owner'} edited ${Object.keys(data).join(', ') || 'skills'}`, status: 'COMMITTED' } }).catch(() => undefined);
  return NextResponse.json({ success: true, project: { id: updated.id, slug: updated.slug } });
}
