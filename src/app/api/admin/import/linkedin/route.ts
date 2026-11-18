import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { importLinkedinCsv } from '@/lib/services/linkedinImportService';

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const files: unknown[] = Array.isArray(body?.files) ? body.files : [];
  if (files.length === 0 || files.length > 6) return NextResponse.json({ error: 'Send 1 to 6 CSV files.' }, { status: 400 });
  const results = [];
  for (const f of files) {
    if (typeof f !== 'string' || f.length > 2_000_000) { results.push({ kind: 'UNKNOWN', added: 0, skipped: 0, message: 'File missing or larger than 2 MB.' }); continue; }
    results.push(await importLinkedinCsv(f, (admin as any).username || 'admin'));
  }
  return NextResponse.json({ success: true, results });
}
