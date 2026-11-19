import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { validateUpload, MAX_UPLOAD_BYTES } from '@/lib/fileUpload';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 100_000) return NextResponse.json({ error: 'The file is too large (max 3 MB).' }, { status: 413 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 }); }
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file was sent.' }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const v = validateUpload(bytes, file.name);
  if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 });
  const row = await prisma.storedFile.create({ data: { filename: v.filename, mimeType: v.mime, size: bytes.length, data: Buffer.from(bytes) } });
  return NextResponse.json({ success: true, id: row.id, url: `/api/files/${row.id}`, mimeType: v.mime, filename: v.filename });
}
