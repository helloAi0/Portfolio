import { NextRequest, NextResponse } from 'next/server';
import { requireWorker } from '@/lib/certIngest/internalAuth';
import { saveUpload } from '@/lib/storage';
export const dynamic = 'force-dynamic';
const MAX = 10 * 1024 * 1024;
/** The worker uploads a certificate PDF straight into the portfolio's R2 bucket. Only real PDFs (magic bytes) are accepted. */
export async function POST(req: NextRequest) {
  const denied = requireWorker(req); if (denied) return denied;
  const form = await req.formData().catch(() => null); const f = form?.get('file');
  if (!(f instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });
  if (f.size > MAX) return NextResponse.json({ error: 'PDF larger than 10 MB' }, { status: 413 });
  const bytes = new Uint8Array(await f.arrayBuffer());
  if (Array.from(bytes.slice(0, 5)).map((b) => String.fromCharCode(b)).join('') !== '%PDF-') return NextResponse.json({ error: 'Not a PDF' }, { status: 415 });
  const name = (f.name || 'certificate.pdf').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);
  const row = await saveUpload(bytes, { filename: /\.pdf$/i.test(name) ? name : name + '.pdf', mime: 'application/pdf' });
  return NextResponse.json({ fileId: row.id });
}
