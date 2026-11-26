import { NextRequest, NextResponse } from 'next/server';
import { requireWorker } from '@/lib/certIngest/internalAuth';
import { saveUpload } from '@/lib/storage';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const denied = requireWorker(req); if (denied) return denied;
  const form = await req.formData().catch(() => null); const f = form?.get('file');
  if (!(f instanceof File) || f.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'PNG up to 4 MB required' }, { status: 400 });
  const b = new Uint8Array(await f.arrayBuffer());
  if (!(b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)) return NextResponse.json({ error: 'Not a PNG' }, { status: 415 });
  const row = await saveUpload(b, { filename: 'prefill.png', mime: 'image/png' });
  return NextResponse.json({ fileId: row.id });
}
