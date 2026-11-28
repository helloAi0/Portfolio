import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { readTab, sheetConfigured } from '@/lib/outreachAgent/sheet';
import { buildStatus } from '@/lib/outreachAgent/classify';
export const dynamic = 'force-dynamic';

/** Read-only: shows what the n8n outreach agent recorded in its Google Sheet. Cannot approve, send or change anything. */
export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const canRun = !!process.env.N8N_RUN_WEBHOOK_URL;
  if (!sheetConfigured()) return NextResponse.json({ configured: false, canRun, message: 'Not connected yet. Set GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY and OUTREACH_SHEET_ID (see docs/OUTREACH_DASHBOARD.md).' });
  try {
    const [jobs, log] = await Promise.all([readTab('Jobs'), readTab('Log').catch(() => [])]);
    return NextResponse.json({ configured: true, canRun, ...buildStatus(jobs, log), fetchedAt: new Date().toISOString() });
  } catch (e) { return NextResponse.json({ configured: true, canRun, error: (e as Error).message }, { status: 502 }); }
}
