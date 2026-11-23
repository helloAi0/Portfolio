import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { saveUpload, hasBucket } from '@/lib/storage';
import { validateUpload, MAX_UPLOAD_BYTES } from '@/lib/fileUpload';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 100_000) return NextResponse.json({ error: 'The file is too large (max 8 MB).' }, { status: 413 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 }); }
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file was sent.' }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const v = validateUpload(bytes, file.name);
  if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 });
  // Without an R2 bucket the bytes are kept in the database, and D1 rows are limited to about 2 MB.
  if (!hasBucket() && bytes.length > 1_500_000) return NextResponse.json({ error: 'File storage (R2) is not connected, so files over 1.5 MB cannot be saved.' }, { status: 503 });
  let row;
  try { row = await saveUpload(bytes, { filename: v.filename, mime: v.mime }); }
  catch { return NextResponse.json({ error: 'The file could not be stored. Please try again.' }, { status: 500 }); }
  return NextResponse.json({ success: true, id: row.id, url: `/api/files/${row.id}`, mimeType: v.mime, filename: v.filename });
}
