/**
 * Turns a synchronized GitHub repository into a portfolio Project.
 *
 * Nothing is published without an explicit owner action, unless PROJECT_PUBLICATION_MODE=AUTOMATIC
 * and the classification is high-confidence. Content comes only from the repository
 * (README summary, bullets under a "Features" heading, topics) or from the owner. Problem
 * statement / solution / challenges / results are NEVER generated - they stay empty until
 * the owner writes them, and the UI hides empty sections.
 */
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ensureTaxonomy, CATEGORY_SLUGS } from '@/lib/taxonomy';
import { extractReadmeExcerpt, extractFeatureBullets } from '@/lib/classification/readmeText';
import { SKILL_BY_SLUG } from '@/lib/skills/catalog';

import { DIFFICULTIES, slugify, humanizeName, isValidHttpUrl } from '@/lib/projectHelpers';
export { DIFFICULTIES, slugify, humanizeName, isValidHttpUrl };
/** Confidence needed before a repository is published without a click. Tunable: AUTO_PUBLISH_MIN_CONFIDENCE (0-1). */
export const AUTO_PUBLISH_MIN_CONFIDENCE = 0.8; // legacy constant, kept for tests
export const autoPublishMin = (): number => {
  const v = Number(process.env.AUTO_PUBLISH_MIN_CONFIDENCE);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.4;
};
/** Default is AUTOMATIC: public repositories become projects on their own. Set PROJECT_PUBLICATION_MODE=REVIEW for approve-first. */
export const publicationMode = (): string => (process.env.PROJECT_PUBLICATION_MODE || 'AUTOMATIC').toUpperCase();

export interface PublishOverrides {
  categorySlug?: string;
  subcategory?: string;
  skills?: string[];
  difficulty?: string;           // owner-confirmed difficulty
  title?: string;
  tagline?: string;
  description?: string;
  liveDeployment?: string | null; // owner-confirmed live URL
  featured?: boolean;
}

const parse = <T,>(v: string | null | undefined, fb: T): T => { if (!v) return fb; try { return JSON.parse(v) as T; } catch { return fb; } };

/** Publish (or update) the project for a repository. Idempotent: keyed by githubRepoId. */
export async function publishRepositoryAsProject(repoId: string, overrides: PublishOverrides = {}, actor = 'owner') {
  await ensureTaxonomy(prisma);
  const repo = await prisma.githubRepository.findUnique({ where: { id: repoId } });
  if (!repo) throw new Error('Repository not found');
  if (repo.isPrivate) throw new Error('Private repositories cannot be published');
  if (repo.classificationStatus === 'REJECTED' && actor !== 'owner') throw new Error('Repository was rejected by the owner');

  const categorySlug = overrides.categorySlug ?? repo.suggestedCategorySlug ?? 'research-and-experiments';
  if (!CATEGORY_SLUGS.has(categorySlug)) throw new Error(`Unknown category "${categorySlug}"`);
  if (overrides.difficulty && !(DIFFICULTIES as readonly string[]).includes(overrides.difficulty)) throw new Error('Invalid difficulty');
  if (overrides.liveDeployment && !isValidHttpUrl(overrides.liveDeployment)) throw new Error('Invalid live URL');

  const category = await prisma.projectCategory.findUnique({ where: { slug: categorySlug } });
  if (!category) throw new Error('Category missing from database');

  const existing = await prisma.project.findFirst({ where: { githubRepoId: repo.githubId } });
  const languages = parse<Record<string, number>>(repo.languages, {});
  const candidates = parse<{ url: string; reachable: boolean }[]>(repo.liveUrlCandidates, []);
  // Live link: owner-confirmed value wins; otherwise only a reachable GitHub-homepage/README candidate on explicit publish.
  const autoLive = candidates.find((c) => c.reachable)?.url ?? null;
  const live = overrides.liveDeployment !== undefined ? overrides.liveDeployment : existing?.liveDeployment ?? autoLive;

  const difficulty = overrides.difficulty ?? (existing?.difficultyConfirmed ? existing.difficulty : repo.suggestedDifficulty ?? 'Unrated');
  const difficultyConfirmed = overrides.difficulty ? true : existing?.difficultyConfirmed ?? false;
  const summary = repo.readmeSummary || repo.description || '';
  const features = extractFeatureBullets(repo.readmeContent);

  const content = {
    title: overrides.title ?? existing?.title ?? humanizeName(repo.name),
    tagline: overrides.tagline ?? existing?.tagline ?? (repo.description || summary).slice(0, 140),
    description: overrides.description ?? existing?.description ?? summary,
    detailedExplanation: existing?.detailedExplanation || extractReadmeExcerpt(repo.readmeContent, 1500),
    categoryId: category.id,
    subcategory: overrides.subcategory ?? repo.suggestedSubcategory ?? 'General',
    difficulty, difficultyConfirmed,
    githubRepo: repo.htmlUrl, liveDeployment: live,
    status: repo.isArchived ? 'Archived' : 'Active',
    githubSynced: true, githubRepoId: repo.githubId, githubStars: repo.stars, githubForks: repo.forks,
    githubLanguages: repo.languages, githubTopics: repo.topics, githubLastPushedAt: repo.pushedAt,
    approvalStatus: 'APPROVED', reviewNote: null as string | null,
    ...(overrides.featured !== undefined ? { featured: overrides.featured } : {}),
  };

  const project = existing
    ? await prisma.project.update({ where: { id: existing.id }, data: content })
    : await prisma.project.create({
        data: {
          ...content,
          slug: await uniqueSlug(slugify(repo.name)),
          // Owner-written sections start empty; never generated.
          problemStatement: '', solution: '', keyFeatures: JSON.stringify(features), challenges: '[]', results: '[]',
        },
      });

  await linkSkills(project.id, overrides.skills ?? parse<string[]>(repo.suggestedSkills, []), repo.name, languages);
  await prisma.githubRepository.update({
    where: { id: repo.id },
    data: { classificationStatus: 'APPROVED', linkedProjectId: project.id, ...(overrides.categorySlug || overrides.subcategory || overrides.skills ? { ownerOverride: true } : {}) },
  });
  await audit('PROJECT_PUBLISHED', `Project:${project.slug}`, actor, existing ? 'updated' : 'created');
  return project;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base; let n = 2;
  while (await prisma.project.findUnique({ where: { slug } })) slug = `${base}-${n++}`;
  return slug;
}

/**
 * Link skills to a project as DETECTED evidence. Detection never promotes a skill to
 * verified/owner-confirmed; existing owner-verified skills only gain an evidence source.
 */
async function linkSkills(projectId: string, slugs: string[], repoName: string, languages: Record<string, number>) {
  for (const slug of Array.from(new Set(slugs))) {
    const def = SKILL_BY_SLUG.get(slug);
    if (!def) continue;
    const evidence = `github:${repoName}`;
    let skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) {
      skill = await prisma.skill.create({
        data: { slug, name: def.name, domain: def.domain, category: def.category, level: 'DETECTED', verified: false, detectedOnly: true, confidenceScore: 0.4, evidenceSources: JSON.stringify([evidence]) },
      });
    } else {
      const sources = parse<string[]>(skill.evidenceSources, []);
      if (!sources.includes(evidence)) {
        await prisma.skill.update({ where: { id: skill.id }, data: { evidenceSources: JSON.stringify([...sources, evidence]) } });
      }
    }
    await prisma.projectSkill.upsert({
      where: { projectId_skillId: { projectId, skillId: skill.id } },
      create: { projectId, skillId: skill.id, relevance: 'PRIMARY' },
      update: {},
    });
  }
  void languages;
}

/** AUTOMATIC mode only: publish strong, high-confidence suggestions of non-owner-rejected repos. Default mode is REVIEW (no-op). */
export async function maybeAutoPublish(githubId: number): Promise<boolean> {
  if (publicationMode() !== 'AUTOMATIC') return false;
  const repo = await prisma.githubRepository.findUnique({ where: { githubId } });
  if (!repo || repo.classificationStatus !== 'SUGGESTED' || repo.linkedProjectId) return false;
  if (repo.isPrivate || repo.classificationScore < autoPublishMin()) return false;
  try { await publishRepositoryAsProject(repo.id, {}, 'automatic'); return true; }
  catch (e) { logger.warn('Publication', `Auto-publish failed for ${repo.name}: ${e instanceof Error ? e.message : String(e)}`); return false; }
}

/** Catch-up: publish every suggested public repository that has no project yet (new repos, or repos synced before AUTOMATIC was on). */
export async function publishPendingSuggestions(): Promise<{ published: number; failed: number }> {
  if (publicationMode() !== 'AUTOMATIC') return { published: 0, failed: 0 };
  const rows = await prisma.githubRepository.findMany({
    where: { classificationStatus: 'SUGGESTED', linkedProjectId: null, isPrivate: false, missingSince: null },
    select: { githubId: true },
  });
  let published = 0, failed = 0;
  for (const r of rows) { if (await maybeAutoPublish(r.githubId)) published++; else failed++; }
  return { published, failed };
}

/** Unpublish a project (owner action or rejection). Keeps the record. */
export async function unpublishProject(projectId: string, reason: string, actor = 'owner') {
  const p = await prisma.project.update({ where: { id: projectId }, data: { approvalStatus: 'PENDING_REVIEW', reviewNote: reason } });
  await audit('PROJECT_UNPUBLISHED', `Project:${p.slug}`, actor, reason);
  return p;
}

async function audit(action: string, target: string, actor: string, explanation: string) {
  try { await prisma.adminAuditLog.create({ data: { action, target, explanation: `${actor}: ${explanation}`, status: 'COMMITTED' } }); }
  catch (e) { logger.warn('Publication', `audit failed: ${e instanceof Error ? e.message : String(e)}`); }
}
