import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { syncCodingPlatforms, getCodingStats } from '@/lib/services/codingPlatformService';

// GET — fetch stored coding stats
export async function GET(req: NextRequest) {
  // Public endpoint — coding arena is publicly visible
  const stats = await getCodingStats();
  return NextResponse.json(stats);
}

// POST — trigger manual sync (admin only)
export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await syncCodingPlatforms();
  return NextResponse.json({ success: true, ...result });
}

