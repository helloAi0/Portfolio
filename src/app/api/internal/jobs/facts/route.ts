import { NextRequest, NextResponse } from 'next/server';
import { requireWorker } from '@/lib/certIngest/internalAuth';
import { loadVerifiedKnowledge } from '@/lib/lamo/knowledgeRetriever';
export const dynamic = 'force-dynamic';

/** Owner-approved facts only (same source LAMO uses). The worker may draft answers solely from these. */
export async function GET(req: NextRequest) {
  const denied = requireWorker(req); if (denied) return denied;
  const chunks = await loadVerifiedKnowledge();
  return NextResponse.json({ facts: chunks.slice(0, 40).map((c) => ({ source: c.source, text: c.content.slice(0, 600) })) });
}
