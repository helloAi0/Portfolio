/**
 * GitHub Synchronization Service
 *
 * Orchestrates the full GitHub sync pipeline:
 * 1. Fetch all public repositories for @helloAi0
 * 2. Upsert each repository into GithubRepository table (idempotent)
 * 3. Fetch and store languages & README per repo
 * 4. Run classification engine on each new/updated repo
 * 5. Log sync result to SyncLog
 *
 * Handles:
 * - Duplicate detection (upsert by githubId)
 * - Incremental sync (skips repos unchanged since lastSyncedAt)
 * - Rate limit awareness
 * - Individual repo failure isolation (doesn't abort entire sync)
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  fetchGithubRepositories,
  fetchRepoLanguages,
  fetchRepoReadme,
  getGithubRateLimit,
  type GithubRepoData,
} from '@/lib/adapters/githubAdapter';
import { classifyRepository } from '@/lib/classification/classificationEngine';

export interface SyncResult {
  success: boolean;
  trigger: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK';
  reposFetched: number;
  reposUpserted: number;
  reposClassified: number;
  reposFailed: number;
  durationMs: number;
  errorMessage?: string;
}

export async function syncGithubRepositories(
  trigger: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK' = 'MANUAL'
): Promise<SyncResult> {
  const startMs = Date.now();
  let reposFetched = 0;
  let reposUpserted = 0;
  let reposClassified = 0;
  let reposFailed = 0;

  logger.info('GithubSyncService', `Starting GitHub sync (trigger: ${trigger})`);

  // Check rate limit before starting
  const rateLimit = await getGithubRateLimit();
  if (rateLimit && rateLimit.remaining < 10) {
    const msg = `GitHub rate limit critically low: ${rateLimit.remaining}/${rateLimit.limit} remaining. Reset at ${rateLimit.reset}.`;
    logger.warn('GithubSyncService', msg);
    await logSync('GITHUB', trigger, 'FAILED', 0, msg);
    return { success: false, trigger, reposFetched: 0, reposUpserted: 0, reposClassified: 0, reposFailed: 0, durationMs: Date.now() - startMs, errorMessage: msg };
  }

  // Fetch all public repositories
  let repos: GithubRepoData[] = [];
  try {
    repos = await fetchGithubRepositories();
    reposFetched = repos.length;
  } catch (err) {
    const msg = `Failed to fetch repositories: ${err instanceof Error ? err.message : String(err)}`;
    logger.error('GithubSyncService', msg);
    await logSync('GITHUB', trigger, 'FAILED', 0, msg);
    return { success: false, trigger, reposFetched: 0, reposUpserted: 0, reposClassified: 0, reposFailed: 0, durationMs: Date.now() - startMs, errorMessage: msg };
  }

  // Process each repository
  for (const repo of repos) {
    try {
      // Idempotent upsert by githubId
      const existing = await prisma.githubRepository.findUnique({
        where: { githubId: repo.githubId },
      });

      // Skip if unchanged (incremental sync)
      if (existing && existing.githubUpdatedAt && existing.githubUpdatedAt >= repo.githubUpdatedAt && existing.classificationStatus !== 'PENDING') {
        continue;
      }

      // Fetch languages & README (may return empty/null — that's fine)
      const languages = await fetchRepoLanguages(repo.name);
      const readme = await fetchRepoReadme(repo.name);

      // Run classification
      const classification = classifyRepository({
        name: repo.name,
        description: repo.description,
        topics: repo.topics,
        languages,
        readme,
      });

      reposClassified++;

      // Upsert into database
      await prisma.githubRepository.upsert({
        where: { githubId: repo.githubId },
        create: {
          githubId: repo.githubId,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          htmlUrl: repo.htmlUrl,
          cloneUrl: repo.cloneUrl,
          homepage: repo.homepage,
          defaultBranch: repo.defaultBranch,
          isPrivate: repo.isPrivate,
          isFork: repo.isFork,
          isArchived: repo.isArchived,
          stars: repo.stars,
          forks: repo.forks,
          openIssues: repo.openIssues,
          watchersCount: repo.watchersCount,
          languages: JSON.stringify(languages),
          topics: JSON.stringify(repo.topics),
          readmeContent: readme?.slice(0, 20000) ?? null, // cap at 20KB
          readmeSummary: classification.readmeSummary,
          licenseKey: repo.licenseKey,
          pushedAt: repo.pushedAt,
          githubCreatedAt: repo.githubCreatedAt,
          githubUpdatedAt: repo.githubUpdatedAt,
          classificationStatus: 'SUGGESTED',
          suggestedCategorySlug: classification.suggestedCategorySlug,
          suggestedSubcategory: classification.suggestedSubcategory,
          suggestedSkills: JSON.stringify(classification.suggestedSkills),
          classificationScore: classification.confidenceScore,
          classificationNotes: classification.classificationNotes,
          lastSyncedAt: new Date(),
        },
        update: {
          description: repo.description,
          homepage: repo.homepage,
          defaultBranch: repo.defaultBranch,
          isArchived: repo.isArchived,
          stars: repo.stars,
          forks: repo.forks,
          openIssues: repo.openIssues,
          watchersCount: repo.watchersCount,
          languages: JSON.stringify(languages),
          topics: JSON.stringify(repo.topics),
          readmeContent: readme?.slice(0, 20000) ?? null,
          readmeSummary: classification.readmeSummary,
          pushedAt: repo.pushedAt,
          githubUpdatedAt: repo.githubUpdatedAt,
          suggestedCategorySlug: classification.suggestedCategorySlug,
          suggestedSubcategory: classification.suggestedSubcategory,
          suggestedSkills: JSON.stringify(classification.suggestedSkills),
          classificationScore: classification.confidenceScore,
          classificationNotes: classification.classificationNotes,
          lastSyncedAt: new Date(),
          // Don't reset manual approval decisions
          ...(existing?.classificationStatus === 'APPROVED' ? {} : { classificationStatus: 'SUGGESTED' }),
        },
      });

      reposUpserted++;
    } catch (err) {
      reposFailed++;
      logger.error('GithubSyncService', `Failed to process repo ${repo.name}: ${err instanceof Error ? err.message : String(err)}`);
      // Continue — don't abort entire sync for one failed repo
    }
  }

  // Update Integration record
  await prisma.integration.upsert({
    where: { platform: 'GITHUB' },
    create: {
      platform: 'GITHUB',
      identifier: process.env.GITHUB_USERNAME || 'helloAi0',
      status: 'CONNECTED',
      lastSyncedAt: new Date(),
    },
    update: {
      status: 'CONNECTED',
      lastSyncedAt: new Date(),
    },
  });

  const durationMs = Date.now() - startMs;
  const details = `Fetched: ${reposFetched}, Upserted: ${reposUpserted}, Classified: ${reposClassified}, Failed: ${reposFailed}`;
  await logSync('GITHUB', trigger, reposFailed === reposFetched && reposFetched > 0 ? 'FAILED' : 'SUCCESS', reposUpserted, details);

  logger.info('GithubSyncService', `Sync complete in ${durationMs}ms. ${details}`);

  return {
    success: true,
    trigger,
    reposFetched,
    reposUpserted,
    reposClassified,
    reposFailed,
    durationMs,
  };
}

/**
 * Process a single repository from a webhook push event.
 * Idempotent — safe to call multiple times for the same repo.
 */
export async function syncSingleRepository(repoName: string): Promise<boolean> {
  logger.info('GithubSyncService', `Webhook-triggered sync for repo: ${repoName}`);
  const { fetchGithubRepository } = await import('@/lib/adapters/githubAdapter');

  const repo = await fetchGithubRepository(repoName);
  if (!repo) {
    logger.warn('GithubSyncService', `Repo ${repoName} not found via API`);
    return false;
  }

  const languages = await fetchRepoLanguages(repo.name);
  const readme = await fetchRepoReadme(repo.name);
  const classification = classifyRepository({
    name: repo.name,
    description: repo.description,
    topics: repo.topics,
    languages,
    readme,
  });

  const existing = await prisma.githubRepository.findUnique({ where: { githubId: repo.githubId } });

  await prisma.githubRepository.upsert({
    where: { githubId: repo.githubId },
    create: {
      githubId: repo.githubId,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      htmlUrl: repo.htmlUrl,
      cloneUrl: repo.cloneUrl,
      homepage: repo.homepage,
      defaultBranch: repo.defaultBranch,
      isPrivate: repo.isPrivate,
      isFork: repo.isFork,
      isArchived: repo.isArchived,
      stars: repo.stars,
      forks: repo.forks,
      openIssues: repo.openIssues,
      watchersCount: repo.watchersCount,
      languages: JSON.stringify(languages),
      topics: JSON.stringify(repo.topics),
      readmeContent: readme?.slice(0, 20000) ?? null,
      readmeSummary: classification.readmeSummary,
      licenseKey: repo.licenseKey,
      pushedAt: repo.pushedAt,
      githubCreatedAt: repo.githubCreatedAt,
      githubUpdatedAt: repo.githubUpdatedAt,
      classificationStatus: 'SUGGESTED',
      suggestedCategorySlug: classification.suggestedCategorySlug,
      suggestedSubcategory: classification.suggestedSubcategory,
      suggestedSkills: JSON.stringify(classification.suggestedSkills),
      classificationScore: classification.confidenceScore,
      classificationNotes: classification.classificationNotes,
      lastSyncedAt: new Date(),
    },
    update: {
      description: repo.description,
      homepage: repo.homepage,
      stars: repo.stars,
      forks: repo.forks,
      languages: JSON.stringify(languages),
      topics: JSON.stringify(repo.topics),
      readmeContent: readme?.slice(0, 20000) ?? null,
      readmeSummary: classification.readmeSummary,
      pushedAt: repo.pushedAt,
      githubUpdatedAt: repo.githubUpdatedAt,
      suggestedCategorySlug: classification.suggestedCategorySlug,
      suggestedSubcategory: classification.suggestedSubcategory,
      suggestedSkills: JSON.stringify(classification.suggestedSkills),
      classificationScore: classification.confidenceScore,
      classificationNotes: classification.classificationNotes,
      lastSyncedAt: new Date(),
      ...(existing?.classificationStatus === 'APPROVED' ? {} : { classificationStatus: 'SUGGESTED' }),
    },
  });

  return true;
}

// Helper: write a SyncLog entry
async function logSync(
  platform: string,
  trigger: string,
  status: string,
  recordsSynced: number,
  details: string,
  errorMessage?: string
) {
  try {
    const integration = await prisma.integration.findUnique({ where: { platform } });
    if (integration) {
      await prisma.syncLog.create({
        data: {
          integrationId: integration.id,
          trigger,
          status,
          details,
          recordsSynced,
          errorMessage: errorMessage || null,
        },
      });
    }
  } catch (err) {
    logger.error('GithubSyncService.logSync', err instanceof Error ? err : new Error(String(err)));
  }
}

