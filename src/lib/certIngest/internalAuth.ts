import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';

/** Shared-secret guard for the worker's endpoints. Fails closed when INGEST_SECRET is not configured. */
export function requireWorker(req: NextRequest): NextResponse | null {
  const secret = process.env.INGEST_SECRET;
  const got = req.headers.get('x-internal-secret') ?? '';
  const h = (s: string) => createHash('sha256').update(s).digest();
  if (!secret || secret.length < 24 || !timingSafeEqual(h(secret), h(got))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}
