import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { cleanProjectInput, slugifyName } from '@/lib/adminInput';
import { CATEGORY_SLUGS, TAXONOMY } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

/** All projects (including unpublished) for the Projects Studio. */
export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await prisma.project.findMany({ include: { category: { select: { slug: true, name: true } } }, orderBy: [{ updatedAt: 'desc' }] });
  const arr = (v: string | null) => { try { const p = JSON.parse(v ?? '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
  return NextResponse.json({ data: rows.map((p) => ({
    id: p.id, slug: p.slug, title: p.title, tagline: p.tagline, description: p.description, categorySlug: p.category?.slug ?? '', categoryName: p.category?.name ?? '',
    problemStatement: p.problemStatement, solution: p.solution, githubRepo: p.githubRepo, liveDeployment: p.liveDeployment, githubSynced: p.githubSynced, approvalStatus: p.approvalStatus,
    keyFeatures: arr(p.keyFeatures), challenges: arr(p.challenges), results: arr(p.results), coverImage: p.coverImage, gallery: arr(p.gallery), learnings: arr(p.learnings),
  })) });
}

/** Manually add a project that is not (or not only) on GitHub. It is published immediately, as the owner entered it. */
export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const c = cleanProjectInput(body);
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const d = c.data;
  if (!CATEGORY_SLUGS.has(d.categorySlug)) return NextResponse.json({ error: 'Unknown category.' }, { status: 400 });
  const node = TAXONOMY.find((t) => t.slug === d.categorySlug)!;
  let category = await prisma.projectCategory.findUnique({ where: { slug: d.categorySlug } });
  if (!category) category = await prisma.projectCategory.create({ data: { slug: node.slug, name: node.name, description: node.description, icon: node.icon } });

  let slug = d.slug, n = 2;
  while (await prisma.project.findUnique({ where: { slug } })) slug = `${d.slug}-${n++}`;

  const project = await prisma.project.create({
    data: {
      slug, title: d.title, tagline: d.tagline, description: d.description, detailedExplanation: d.description,
      categoryId: category.id, subcategory: node.children[0]?.name ?? node.name,
      problemStatement: d.problemStatement, solution: d.solution,
      keyFeatures: JSON.stringify(d.keyFeatures), challenges: JSON.stringify(d.challenges), results: JSON.stringify(d.results),
      coverImage: d.coverImage, gallery: JSON.stringify(d.gallery), learnings: JSON.stringify(d.learnings),
      githubRepo: d.githubRepo, liveDeployment: d.liveDeployment, approvalStatus: 'APPROVED', difficulty: 'Unrated',
    },
  });
  for (const name of d.skillNames) {
    const sSlug = slugifyName(name);
    if (!sSlug) continue;
    const skill = (await prisma.skill.findUnique({ where: { slug: sSlug } })) ?? (await prisma.skill.create({
      data: { slug: sSlug, name, domain: 'General', category: 'General', level: 'PRACTICING', detectedOnly: false, confidenceScore: 0.6, evidenceSources: JSON.stringify([`project:${slug}`]) },
    }));
    await prisma.projectSkill.upsert({ where: { projectId_skillId: { projectId: project.id, skillId: skill.id } }, create: { projectId: project.id, skillId: skill.id }, update: {} });
  }
  await prisma.adminAuditLog.create({ data: { action: 'PROJECT_ADDED_MANUALLY', target: `Project:${slug}`, newState: JSON.stringify({ title: d.title }), explanation: `${(admin as any).username ?? 'owner'} added a project by hand` } }).catch(() => undefined);
  return NextResponse.json({ success: true, project: { id: project.id, slug } });
}
