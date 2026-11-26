import { NextRequest, NextResponse } from 'next/server';
import { requireWorker } from '@/lib/certIngest/internalAuth';
import { prisma } from '@/lib/prisma';
import { readUpload } from '@/lib/storage';
export const dynamic = 'force-dynamic';
/** Lets the worker fetch a queued PDF back for Gemini. Secret-protected; not a public file route. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireWorker(req); if (denied) return denied;
  if (!/^[a-z0-9]{20,40}$/.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const file = await prisma.storedFile.findUnique({ where: { id: params.id } });
  const bytes = file ? await readUpload(file) : null;
  if (!file || !bytes) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(bytes as unknown as BodyInit, { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' } });
}
