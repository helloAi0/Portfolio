import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const integrations = await prisma.integration.findMany({
    include: {
      syncLogs: {
        orderBy: { syncedAt: 'desc' },
        take: 3,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: integrations });
}

export async function PATCH(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { platform, identifier, status, configData } = await req.json();
    if (!platform) return NextResponse.json({ error: 'Platform required' }, { status: 400 });

    const updated = await prisma.integration.upsert({
      where: { platform },
      create: {
        platform,
        identifier: identifier || 'default',
        status: status || 'PENDING',
        configData: configData ? JSON.stringify(configData) : null,
      },
      update: {
        ...(identifier && { identifier }),
        ...(status && { status }),
        ...(configData && { configData: JSON.stringify(configData) }),
      },
    });

    return NextResponse.json({ success: true, integration: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update integration settings' }, { status: 500 });
  }
}

