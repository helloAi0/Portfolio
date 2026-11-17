/**
 * GitHub Synchronization Service
 *
 * One shared pipeline (processRepository) serves manual, scheduled and webhook triggers, so
 * behaviour is identical regardless of how a sync starts.
 *
 * Guarantees
 * - Idempotent: upsert by immutable githubId; repeated runs/deliveries converge to the same state.
 * - Never overwrites owner decisions: APPROVED / REJECTED status and owner overrides are sticky.
 * - Never ingests private repositories; a repo that turns private or disappears is flagged
 *   (missingSince) and its published project is pulled back to review - but only after a COMPLETE
 *   listing, never after a failed or partial fetch.
 * - Forks are stored but not proposed unless GITHUB_INCLUDE_FORKS=true.
 * - Failures are isolated per repository and reported honestly in Integration status + SyncLog.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  fetchGithubRepositories, fetchGithubRepository, fetchRepoLanguages, fetchRepoReadme, fetchRepoTree,
  fetchRepoManifests, selectManifestPaths, getGithubRateLimit, GithubApiError, type GithubRepoData,
} from '@/lib/adapters/githubAdapter';
import { classifyRepository } from '@/lib/classification/classificationEngine';
import { checkLiveUrls } from '@/lib/classification/liveCheck';
import { ensureTaxonomy } from '@/lib/taxonomy';
import { maybeAutoPublish } from '@/lib/services/projectPublicationService';

export type SyncTrigger = 'MANUAL' | 'SCHEDULED' | 'WEBHOOK';

export interface SyncResult {
  success: boolean;
  trigger: SyncTrigger;
  reposFetched: number;
  reposUpserted: number;
  reposClassified: number;
  reposSkipped: number;
  reposFailed: number;
  reposMissing: number;
  durationMs: number;
  errorMessage?: string;
}

const includeForks = () => process.env.GITHUB_INCLUDE_FORKS === 'true';
const json = (v: unknown) => JSON.stringify(v);

/** Cheap fields that change without bumping pushed_at (stars, forks, homepage...). Always refreshed. */
function metadataFields(repo: GithubRepoData) {
  return {
    name: repo.name, fullName: repo.fullName, description: repo.description, htmlUrl: repo.htmlUrl, cloneUrl: repo.cloneUrl,
    homepage: repo.homepage, defaultBranch: repo.defaultBranch, isPrivate: repo.isPrivate, isFork: repo.isFork, isArchived: repo.isArchived,
    stars: repo.stars, forks: repo.forks, openIssues: repo.openIssues, watchersCount: repo.watchersCount, licenseKey: repo.licenseKey,
    topics: json(repo.topics), pushedAt: repo.pushedAt, githubCreatedAt: repo.githubCreatedAt, githubUpdatedAt: repo.githubUpdatedAt,
    missingSince: null as Date | null,
  };
}

/** Full analysis for one repository. Returns what happened for reporting. */
export async function processRepository(repo: GithubRepoData): Promise<'CLASSIFIED' | 'SKIPPED' | 'METADATA_ONLY'> {
  if (repo.isPrivate) return 'SKIPPED'; // never ingest private repositories
  await ensureTaxonomy(prisma);

  const existing = await prisma.githubRepository.findUnique({ where: { githubId: repo.githubId } });
  const meta = metadataFields(repo);

  // Incremental: nothing pushed since the last full analysis -> refresh cheap metadata only (no extra API calls).
  const unchanged = existing && existing.suggestedDifficulty && existing.pushedAt && repo.pushedAt
    && existing.pushedAt.getTime() === repo.pushedAt.getTime() && existing.githubUpdatedAt?.getTime() === repo.githubUpdatedAt.getTime()
    && existing.homepage === repo.homepage;
  if (unchanged) {
    await prisma.githubRepository.update({ where: { githubId: repo.githubId }, data: { ...meta, lastSyncedAt: new Date() } });
    return 'METADATA_ONLY';
  }

  const languages = await fetchRepoLanguages(repo.name);
  const readme = await fetchRepoReadme(repo.name);
  let tree: string[] | null = null;
  let manifests: Record<string, string> = {};
  try {
    tree = await fetchRepoTree(repo.name, repo.defaultBranch);
    if (tree) manifests = await fetchRepoManifests(repo.name, selectManifestPaths(tree));
  } catch (e) {
    if (e instanceof GithubApiError && e.kind === 'RATE_LIMITED') throw e; // surface, scheduler retries later
    logger.warn('GithubSync', `Tree unavailable for ${repo.name}: ${e instanceof Error ? e.message : String(e)}`);
  }

  const c = classifyRepository({ name: repo.name, description: repo.description, topics: repo.topics, languages, readme, manifests, tree, homepage: repo.homepage });
  const live = await checkLiveUrls(c.liveUrlCandidates);

  const analysis = {
    languages: json(languages),
    readmeContent: readme?.slice(0, 20000) ?? null,
    readmeSummary: c.readmeSummary,
    liveUrlCandidates: json(live),
    technologyTags: json(c.technologyTags),
    complexityScore: c.difficulty.score,
    complexityEvidence: json(c.difficulty.evidence),
    suggestedDifficulty: c.difficulty.level,
  };
  const suggestion = {
    suggestedCategorySlug: c.suggestedCategorySlug,
    suggestedSubcategory: c.suggestedSubcategory,
    secondaryCategories: json(c.secondaryCategories),
    suggestedSkills: json(c.suggestedSkills),
    classificationScore: c.confidenceScore,
    classificationNotes: c.classificationNotes,
  };

  const skipFork = repo.isFork && !includeForks();
  if (!existing) {
    await prisma.githubRepository.create({
      data: { githubId: repo.githubId, ...meta, ...analysis, ...suggestion, classificationStatus: skipFork ? 'SKIPPED' : 'SUGGESTED', lastSyncedAt: new Date() },
    });
  } else {
    // Owner overrides keep their category/subcategory/skills; status APPROVED/REJECTED/SKIPPED(by owner) is never reset.
    await prisma.githubRepository.update({
      where: { githubId: repo.githubId },
      data: {
        ...meta, ...analysis, ...(existing.ownerOverride ? {} : suggestion), lastSyncedAt: new Date(),
        ...(existing.classificationStatus === 'PENDING' ? { classificationStatus: skipFork ? 'SKIPPED' : 'SUGGESTED' } : {}),
      },
    });
  }

  // Keep an already-published project's live GitHub stats current (content stays owner-controlled).
  await prisma.project.updateMany({
    where: { githubRepoId: repo.githubId },
    data: { githubStars: repo.stars, githubForks: repo.forks, githubLanguages: json(languages), githubTopics: json(repo.topics), githubLastPushedAt: repo.pushedAt, githubSynced: true },
  });
  if (!skipFork) await maybeAutoPublish(repo.githubId);
  return 'CLASSIFIED';
}

async function setIntegrationStatus(status: 'CONNECTED' | 'ERROR' | 'DEGRADED', ok: boolean, note?: string) {
  const identifier = process.env.GITHUB_USERNAME || 'helloAi0';
  await prisma.integration.upsert({
    where: { platform: 'GITHUB' },
    create: { platform: 'GITHUB', identifier, status, lastSyncedAt: ok ? new Date() : null, configData: note ? json({ lastError: note }) : null },
    update: { status, ...(ok ? { lastSyncedAt: new Date() } : {}), configData: note ? json({ lastError: note }) : null },
  });
}

export async function syncGithubRepositories(trigger: SyncTrigger = 'MANUAL'): Promise<SyncResult> {
  const start = Date.now();
  const r: SyncResult = { success: false, trigger, reposFetched: 0, reposUpserted: 0, reposClassified: 0, reposSkipped: 0, reposFailed: 0, reposMissing: 0, durationMs: 0 };
  const fail = async (msg: string, status: 'ERROR' | 'DEGRADED' = 'ERROR') => {
    r.errorMessage = msg; r.durationMs = Date.now() - start;
    logger.error('GithubSync', msg);
    await setIntegrationStatus(status, false, msg).catch(() => undefined);
    await logSync(trigger, 'FAILED', r.reposUpserted, msg, msg, r.durationMs);
    return r;
  };

  const rate = await getGithubRateLimit();
  if (rate && rate.remaining < 25) return fail(`GitHub rate limit low: ${rate.remaining}/${rate.limit}. Resets ${rate.reset.toISOString()}. Skipped to protect the quota.`, 'DEGRADED');

  let repos: GithubRepoData[];
  try { repos = await fetchGithubRepositories(); }
  catch (e) { return fail(`Could not list repositories: ${e instanceof Error ? e.message : String(e)}`); }
  r.reposFetched = repos.length;

  // Process sequentially: bounded API usage, deterministic logs.
  for (const repo of repos) {
    try {
      const outcome = await processRepository(repo);
      if (outcome === 'SKIPPED') r.reposSkipped++;
      else { r.reposUpserted++; if (outcome === 'CLASSIFIED') r.reposClassified++; }
    } catch (e) {
      r.reposFailed++;
      logger.error('GithubSync', `Repo ${repo.name} failed: ${e instanceof Error ? e.message : String(e)}`);
      if (e instanceof GithubApiError && e.kind === 'RATE_LIMITED') { await fail(`Stopped early: ${e.message}`, 'DEGRADED'); return r; }
    }
  }

  // Missing-repo detection ONLY after a complete, successful listing.
  r.reposMissing = await markMissing(new Set(repos.map((x) => x.githubId)));

  r.durationMs = Date.now() - start;
  const allFailed = r.reposFetched > 0 && r.reposFailed === r.reposFetched;
  r.success = !allFailed;
  const details = `Fetched ${r.reposFetched}, analysed ${r.reposClassified}, metadata-only ${r.reposUpserted - r.reposClassified}, skipped ${r.reposSkipped}, failed ${r.reposFailed}, missing ${r.reposMissing}`;
  const status = allFailed ? 'ERROR' : r.reposFailed > 0 ? 'DEGRADED' : 'CONNECTED';
  await setIntegrationStatus(status, !allFailed, r.reposFailed ? `${r.reposFailed} repositories failed` : undefined);
  await logSync(trigger, allFailed ? 'FAILED' : r.reposFailed ? 'PARTIAL' : 'SUCCESS', r.reposUpserted, details, undefined, r.durationMs);
  logger.info('GithubSync', `Done in ${r.durationMs}ms. ${details}`);
  return r;
}

/** Flag repositories that were previously synced but are no longer public; pull published projects back to review. */
async function markMissing(liveIds: Set<number>): Promise<number> {
  const known = await prisma.githubRepository.findMany({ where: { missingSince: null }, select: { githubId: true } });
  const gone = known.map((k) => k.githubId).filter((id) => !liveIds.has(id));
  for (const id of gone) await withdraw(id);
  return gone.length;
}

async function withdraw(githubId: number) {
  await prisma.githubRepository.updateMany({ where: { githubId }, data: { missingSince: new Date() } });
  const pulled = await prisma.project.updateMany({
    where: { githubRepoId: githubId, approvalStatus: 'APPROVED' },
    data: { approvalStatus: 'PENDING_REVIEW', reviewNote: 'Source repository is no longer public on GitHub. Unpublished pending owner review.' },
  });
  if (pulled.count) logger.warn('GithubSync', `Unpublished ${pulled.count} project(s) whose repository ${githubId} is gone`);
}

/** Webhook path: sync one repository by name. Returns what happened. */
export async function syncSingleRepository(repoName: string): Promise<'SYNCED' | 'WITHDRAWN' | 'NOT_FOUND'> {
  const repo = await fetchGithubRepository(repoName);
  if (!repo || repo.isPrivate) {
    const row = await prisma.githubRepository.findFirst({ where: { name: repoName } });
    if (!row) return 'NOT_FOUND';
    await withdraw(row.githubId);
    return 'WITHDRAWN';
  }
  await processRepository(repo);
  return 'SYNCED';
}

/** Webhook "repository deleted/privatized" without hitting the API. */
export async function withdrawRepositoryByName(repoName: string): Promise<boolean> {
  const row = await prisma.githubRepository.findFirst({ where: { name: repoName } });
  if (!row) return false;
  await withdraw(row.githubId);
  return true;
}

async function logSync(trigger: string, status: string, recordsSynced: number, details: string, errorMessage?: string, durationMs?: number) {
  try {
    const integration = await prisma.integration.findUnique({ where: { platform: 'GITHUB' } });
    if (integration) {
      await prisma.syncLog.create({ data: { integrationId: integration.id, trigger, status, details, recordsSynced, errorMessage: errorMessage ?? null, durationMs: durationMs ?? null } });
    }
  } catch (e) {
    logger.error('GithubSync.logSync', e instanceof Error ? e : new Error(String(e)));
  }
}
