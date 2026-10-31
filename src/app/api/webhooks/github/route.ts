import { NextRequest, NextResponse } from 'next/server';
import { syncSingleRepository } from '@/lib/services/githubSyncService';
import { verifyWebhookSignature } from '@/lib/adapters/githubAdapter';
import { logger } from '@/lib/logger';

/**
 * GitHub Webhook Handler
 * Endpoint: POST /api/webhooks/github
 *
 * Configure in GitHub repo/org settings:
 * - Payload URL: https://your-domain.onrender.com/api/webhooks/github
 * - Content type: application/json
 * - Secret: value of GITHUB_WEBHOOK_SECRET env var
 * - Events: push, repository, create, delete
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-hub-signature-256');
  const event = req.headers.get('x-github-event');
  const deliveryId = req.headers.get('x-github-delivery');

  const rawBody = await req.text();

  // Verify webhook signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('GithubWebhook', 'GITHUB_WEBHOOK_SECRET not configured. Rejecting webhook.');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const isValid = await verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    logger.warn('GithubWebhook', `Invalid signature for delivery ${deliveryId}`);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  logger.info('GithubWebhook', `Received event: ${event} (delivery: ${deliveryId})`);

  // Handle supported events
  if (event === 'push' || event === 'repository') {
    const repoName = (payload.repository as { name?: string })?.name;
    if (repoName) {
      // Fire-and-forget background sync — don't block the webhook response
      syncSingleRepository(repoName).catch((err) =>
        logger.error('GithubWebhook', `Background sync failed for ${repoName}: ${err instanceof Error ? err.message : String(err)}`)
      );
    }
  }

  return NextResponse.json({ received: true, event, deliveryId });
}

