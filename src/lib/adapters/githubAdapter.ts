/**
 * GitHub REST API Adapter
 * Implements provider adapter pattern so API changes don't break the application.
 * Uses public GitHub REST API — no authentication required for public repos.
 * With a GITHUB_TOKEN set, rate limit increases from 60 to 5000 req/hr.
 */

import { logger } from '@/lib/logger';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'helloAi0';

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

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ProjectLAMO-Portfolio/2.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function githubFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: buildHeaders(),
      next: { revalidate: 300 }, // 5-min cache
    });

    if (res.status === 404) {
      logger.warn('GithubAdapter', `Resource not found: ${url}`);
      return null;
    }

    if (res.status === 403) {
      const remaining = res.headers.get('X-RateLimit-Remaining');
      const reset = res.headers.get('X-RateLimit-Reset');
      logger.warn('GithubAdapter', `Rate limited. Remaining: ${remaining}. Resets: ${reset}`);
      return null;
    }

    if (!res.ok) {
      logger.error('GithubAdapter', `HTTP ${res.status} for ${url}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    logger.error('GithubAdapter', err as Error);
    return null;
  }
}

/**
 * List all public repositories for the configured GitHub username.
 * Handles pagination transparently.
 */
export async function fetchGithubRepositories(): Promise<GithubRepoData[]> {
  const allRepos: GithubRepoData[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/repos?type=public&sort=updated&per_page=${perPage}&page=${page}`;
    const raw = await githubFetch<GithubRawRepo[]>(url);

    if (!raw || raw.length === 0) break;

    for (const r of raw) {
      allRepos.push(mapRepo(r));
    }

    if (raw.length < perPage) break;
    page++;
  }

  logger.info('GithubAdapter', `Fetched ${allRepos.length} public repositories for @${GITHUB_USERNAME}`);
  return allRepos;
}

/**
 * Fetch a single repository by name.
 */
export async function fetchGithubRepository(repoName: string): Promise<GithubRepoData | null> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_USERNAME}/${repoName}`;
  const raw = await githubFetch<GithubRawRepo>(url);
  return raw ? mapRepo(raw) : null;
}

/**
 * Fetch repository language byte counts.
 */
export async function fetchRepoLanguages(repoName: string): Promise<GithubLanguages> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_USERNAME}/${repoName}/languages`;
  const raw = await githubFetch<GithubLanguages>(url);
  return raw || {};
}

/**
 * Fetch README content for a repository (base64 decoded).
 */
export async function fetchRepoReadme(repoName: string): Promise<string | null> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_USERNAME}/${repoName}/readme`;
  const raw = await githubFetch<{ content: string; encoding: string }>(url);
  if (!raw?.content) return null;
  try {
    return Buffer.from(raw.content, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Get rate limit status for the current token.
 */
export async function getGithubRateLimit(): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
} | null> {
  const url = `${GITHUB_API_BASE}/rate_limit`;
  const raw = await githubFetch<{ rate: { limit: number; remaining: number; reset: number; used: number } }>(url);
  if (!raw) return null;
  return {
    limit: raw.rate.limit,
    remaining: raw.rate.remaining,
    reset: new Date(raw.rate.reset * 1000),
    used: raw.rate.used,
  };
}

/**
 * Verify a GitHub webhook signature (HMAC-SHA256).
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const computedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const computed = `sha256=${computedHex}`;

    // Constant-time comparison
    if (computed.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
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

