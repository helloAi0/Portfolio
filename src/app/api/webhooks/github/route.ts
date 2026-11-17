import { NextRequest, NextResponse } from 'next/server';
import { syncSingleRepository, withdrawRepositoryByName } from '@/lib/services/githubSyncService';
import { verifyWebhookSignature } from '@/lib/adapters/githubAdapter';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GitHub webhook: POST /api/webhooks/github
 * Payload URL https://<domain>/api/webhooks/github, content type application/json,
 * secret = GITHUB_WEBHOOK_SECRET, events: push, repository (and ping).
 *
 * - Signature is verified over the RAW body before anything else (fail-closed without a secret).
 * - Deliveries are de-duplicated by X-GitHub-Delivery (GitHub retries; we must stay idempotent).
 * - Only the configured owner's repositories are processed.
 * - The sync is awaited (bounded) so serverless/instance recycling cannot drop it silently.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('GithubWebhook', 'GITHUB_WEBHOOK_SECRET not configured; rejecting.');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }
  const rawBody = await req.text();
  const event = req.headers.get('x-github-event') ?? '';
  const deliveryId = req.headers.get('x-github-delivery');

  if (!(await verifyWebhookSignature(rawBody, req.headers.get('x-hub-signature-256'), secret))) {
    logger.warn('GithubWebhook', `Invalid signature (delivery ${deliveryId})`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  if (!deliveryId) return NextResponse.json({ error: 'Missing delivery id' }, { status: 400 });

  let payload: { action?: string; repository?: { name?: string; private?: boolean; owner?: { login?: string } } };
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (event === 'ping') return NextResponse.json({ received: true, pong: true });

  // Idempotency: the unique deliveryId makes a duplicate insert fail.
  try {
    await prisma.webhookDelivery.create({ data: { deliveryId, event, repoName: payload.repository?.name ?? null, status: 'RECEIVED' } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const owner = (process.env.GITHUB_USERNAME || 'helloAi0').toLowerCase();
  const repoName = payload.repository?.name;
  if (!repoName || payload.repository?.owner?.login?.toLowerCase() !== owner) {
    await prisma.webhookDelivery.update({ where: { deliveryId }, data: { status: 'IGNORED' } });
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    let outcome = 'IGNORED';
    if (event === 'repository' && (payload.action === 'deleted' || payload.action === 'privatized')) {
      outcome = (await withdrawRepositoryByName(repoName)) ? 'WITHDRAWN' : 'NOT_FOUND';
    } else if (event === 'push' || event === 'repository') {
      outcome = await syncSingleRepository(repoName);
    }
    await prisma.webhookDelivery.update({ where: { deliveryId }, data: { status: outcome } });
    return NextResponse.json({ received: true, event, outcome });
  } catch (err) {
    await prisma.webhookDelivery.update({ where: { deliveryId }, data: { status: 'FAILED' } }).catch(() => undefined);
    logger.error('GithubWebhook', `Sync failed for ${repoName}: ${err instanceof Error ? err.message : String(err)}`);
    // 500 makes GitHub show the failure and lets the owner redeliver; scheduled reconciliation also heals it.
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
