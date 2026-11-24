/**
 * GitHub REST API Adapter
 * Implements provider adapter pattern so API changes don't break the application.
 * Uses public GitHub REST API — no authentication required for public repos.
 * With a GITHUB_TOKEN set, rate limit increases from 60 to 5000 req/hr.
 */

import { logger } from '@/lib/logger';

const GITHUB_API_BASE = 'https://api.github.com';
/** Read at call time: on Cloudflare the variables only exist once a request is running. */
const githubUser = () => process.env.GITHUB_USERNAME || 'helloAi0';

interface GithubRawRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  homepage: string | null;
  default_branch: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  topics: string[];
  license: { key: string } | null;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GithubRepoData {
  githubId: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  cloneUrl: string;
  homepage: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  stars: number;
  forks: number;
  openIssues: number;
  watchersCount: number;
  topics: string[];
  licenseKey: string | null;
  pushedAt: Date | null;
  githubCreatedAt: Date;
  githubUpdatedAt: Date;
}

export interface GithubLanguages {
  [language: string]: number;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ProjectLAMO-Portfolio/2.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Typed errors + retry policy (pure helpers are exported for unit tests)
// ---------------------------------------------------------------------------

export type GithubErrorKind = 'NOT_FOUND' | 'RATE_LIMITED' | 'AUTH' | 'SERVER' | 'NETWORK' | 'CLIENT';

export class GithubApiError extends Error {
  constructor(
    public readonly kind: GithubErrorKind,
    message: string,
    public readonly status?: number,
    /** When rate limited: ms until the limit resets, if GitHub told us. */
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'GithubApiError';
  }
}

export interface ResponseLike {
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
}

/** Classify an HTTP response. Returns null when the response is a success. */
export function classifyResponse(res: ResponseLike, nowMs: number = Date.now()): GithubApiError | null {
  if (res.ok) return null;
  if (res.status === 404) return new GithubApiError('NOT_FOUND', 'Not found', 404);
  if (res.status === 401) return new GithubApiError('AUTH', 'GitHub rejected the credentials (401). Check GITHUB_TOKEN.', 401);
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    const retryAfter = res.headers.get('retry-after');
    const reset = res.headers.get('x-ratelimit-reset');
    if (retryAfter && !Number.isNaN(Number(retryAfter))) {
      return new GithubApiError('RATE_LIMITED', `Rate limited (retry after ${retryAfter}s)`, res.status, Number(retryAfter) * 1000);
    }
    if (remaining === '0' && reset && !Number.isNaN(Number(reset))) {
      return new GithubApiError('RATE_LIMITED', 'Primary rate limit exhausted', res.status, Math.max(0, Number(reset) * 1000 - nowMs));
    }
    if (res.status === 429) return new GithubApiError('RATE_LIMITED', 'Rate limited (429)', 429, 60_000);
    return new GithubApiError('AUTH', 'GitHub refused access (403). Token missing permissions or repository is blocked.', 403);
  }
  if (res.status >= 500) return new GithubApiError('SERVER', `GitHub server error (${res.status})`, res.status);
  return new GithubApiError('CLIENT', `Unexpected response (${res.status})`, res.status);
}

/** Exponential backoff with a cap. Deterministic (no jitter) so it is testable. */
export function computeBackoffMs(attempt: number, baseMs = 500, capMs = 8000): number {
  return Math.min(capMs, baseMs * Math.pow(2, Math.max(0, attempt)));
}

const MAX_ATTEMPTS = 3;
const MAX_RATE_LIMIT_WAIT_MS = 10_000; // never block a request for longer than this; surface the error instead

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Fetch JSON from GitHub. Returns null ONLY for a genuine 404.
 * Every other failure throws a GithubApiError, so callers can never mistake an outage or
 * a rate limit for "this repository has no README / does not exist".
 */
async function githubFetch<T>(url: string): Promise<T | null> {
  let lastError: GithubApiError | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: buildHeaders(), cache: 'no-store' });
      const err = classifyResponse(res);
      if (!err) return (await res.json()) as T;
      if (err.kind === 'NOT_FOUND') return null;
      lastError = err;
      if (err.kind === 'AUTH' || err.kind === 'CLIENT') throw err;
      if (err.kind === 'RATE_LIMITED') {
        const wait = err.retryAfterMs ?? computeBackoffMs(attempt);
        if (wait > MAX_RATE_LIMIT_WAIT_MS) throw err; // reset is far away: fail fast, scheduler retries later
        logger.warn('GithubAdapter', `Rate limited; waiting ${wait}ms before retry`);
        await sleep(wait);
        continue;
      }
      // SERVER: retry with backoff
      await sleep(computeBackoffMs(attempt));
    } catch (e) {
      if (e instanceof GithubApiError) {
        if (e.kind === 'AUTH' || e.kind === 'CLIENT' || e.kind === 'RATE_LIMITED') throw e;
        lastError = e;
      } else {
        lastError = new GithubApiError('NETWORK', `Network error: ${e instanceof Error ? e.message : String(e)}`);
        await sleep(computeBackoffMs(attempt));
      }
    }
  }
  throw lastError ?? new GithubApiError('NETWORK', 'Unknown GitHub failure');
}

/**
 * List all public, owner-authored repositories for the configured username.
 * Pagination is handled here. Throws GithubApiError on any failure (never returns a partial
 * list silently - a partial list would make the sync think repositories were deleted).
 */
export async function fetchGithubRepositories(): Promise<GithubRepoData[]> {
  const allRepos: GithubRepoData[] = [];
  const perPage = 100;
  for (let page = 1; page <= 20; page++) {
    const url = `${GITHUB_API_BASE}/users/${githubUser()}/repos?type=owner&sort=updated&per_page=${perPage}&page=${page}`;
    const raw = await githubFetch<GithubRawRepo[]>(url);
    if (raw === null) throw new GithubApiError('NOT_FOUND', `GitHub user "${githubUser()}" not found`, 404);
    for (const r of raw) {
      if (!r.private) allRepos.push(mapRepo(r)); // defence in depth: never ingest private repos
    }
    if (raw.length < perPage) break;
  }
  logger.info('GithubAdapter', `Fetched ${allRepos.length} public repositories for @${githubUser()}`);
  return allRepos;
}

/** Fetch a single repository by name. null = repository does not exist or is not visible. */
export async function fetchGithubRepository(repoName: string): Promise<GithubRepoData | null> {
  if (!/^[A-Za-z0-9._-]+$/.test(repoName)) return null;
  const raw = await githubFetch<GithubRawRepo>(`${GITHUB_API_BASE}/repos/${githubUser()}/${repoName}`);
  return raw ? mapRepo(raw) : null;
}

/** Language byte counts. Empty object when the repo has no detectable code. */
export async function fetchRepoLanguages(repoName: string): Promise<GithubLanguages> {
  const raw = await githubFetch<GithubLanguages>(`${GITHUB_API_BASE}/repos/${githubUser()}/${repoName}/languages`);
  return raw || {};
}

/** README text (base64 decoded). null = the repository has no README. */
export async function fetchRepoReadme(repoName: string): Promise<string | null> {
  const raw = await githubFetch<{ content: string; encoding: string }>(`${GITHUB_API_BASE}/repos/${githubUser()}/${repoName}/readme`);
  if (!raw?.content) return null;
  return Buffer.from(raw.content, 'base64').toString('utf-8');
}

/**
 * Recursive file tree (paths only). null = unavailable (empty repo / not found).
 * `truncated` trees are still returned; classification treats them as partial evidence.
 */
export async function fetchRepoTree(repoName: string, branch: string): Promise<string[] | null> {
  const raw = await githubFetch<{ tree: { path: string; type: string }[]; truncated: boolean }>(
    `${GITHUB_API_BASE}/repos/${githubUser()}/${repoName}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  if (!raw) return null;
  return raw.tree.filter((n) => n.type === 'blob').map((n) => n.path).slice(0, 5000);
}

const MANIFEST_NAMES = ['package.json', 'requirements.txt', 'pyproject.toml', 'package.xml', 'CMakeLists.txt', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle'];

/** Pick root-level dependency manifests out of a file tree. */
export function selectManifestPaths(tree: string[]): string[] {
  return tree.filter((p) => MANIFEST_NAMES.includes(p)).slice(0, 5);
}

/** Fetch the text of the given root-level manifests (each capped). Failures of one file are non-fatal. */
export async function fetchRepoManifests(repoName: string, paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const path of paths) {
    try {
      const raw = await githubFetch<{ content?: string; size?: number }>(`${GITHUB_API_BASE}/repos/${githubUser()}/${repoName}/contents/${path}`);
      if (raw?.content && (raw.size ?? 0) < 200_000) out[path] = Buffer.from(raw.content, 'base64').toString('utf-8').slice(0, 30_000);
    } catch (e) {
      logger.warn('GithubAdapter', `Manifest ${repoName}/${path} unavailable: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}

/** Rate limit status for the current credentials; null when it cannot be determined. */
export async function getGithubRateLimit(): Promise<{ limit: number; remaining: number; reset: Date; used: number } | null> {
  try {
    const raw = await githubFetch<{ rate: { limit: number; remaining: number; reset: number; used: number } }>(`${GITHUB_API_BASE}/rate_limit`);
    if (!raw) return null;
    return { limit: raw.rate.limit, remaining: raw.rate.remaining, reset: new Date(raw.rate.reset * 1000), used: raw.rate.used };
  } catch {
    return null;
  }
}

/**
 * Verify a GitHub webhook signature (HMAC-SHA256 over the RAW body), constant-time.
 */
export async function verifyWebhookSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret || !signature.startsWith('sha256=')) return false;
  try {
    const { createHmac, timingSafeEqual } = await import('crypto');
    const expected = Buffer.from('sha256=' + createHmac('sha256', secret).update(payload, 'utf8').digest('hex'));
    const given = Buffer.from(signature);
    return expected.length === given.length && timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

// Internal mapper
function mapRepo(r: GithubRawRepo): GithubRepoData {
  return {
    githubId: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    htmlUrl: r.html_url,
    cloneUrl: r.clone_url,
    homepage: r.homepage,
    defaultBranch: r.default_branch,
    isPrivate: r.private,
    isFork: r.fork,
    isArchived: r.archived,
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    watchersCount: r.watchers_count,
    topics: r.topics || [],
    licenseKey: r.license?.key || null,
    pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
    githubCreatedAt: new Date(r.created_at),
    githubUpdatedAt: new Date(r.updated_at),
  };
}

