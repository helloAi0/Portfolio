import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SERVER_START_TIME = Date.now();

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'CONNECTED';
  let dbLatencyMs = 0;
  let dbError: string | null = null;

  try {
    const dbStart = Date.now();
    // Lightweight database ping
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: any) {
    dbStatus = 'DISCONNECTED';
    dbError = err.message || 'Database ping failed';
  }

  // Count core records for observability
  let metrics = {
    projectsCount: 0,
    skillsCount: 0,
    unansweredQuestionsPending: 0,
  };

  if (dbStatus === 'CONNECTED') {
    try {
      const [pCount, sCount, qCount] = await Promise.all([
        prisma.project.count({ where: { approvalStatus: 'APPROVED' } }),
        prisma.skill.count({ where: { verified: true } }),
        prisma.unansweredQuestion.count({ where: { status: 'PENDING_OWNER' } }),
      ]);
      metrics = {
        projectsCount: pCount,
        skillsCount: sCount,
        unansweredQuestionsPending: qCount,
      };
    } catch {}
  }

  const isHealthy = dbStatus === 'CONNECTED';
  const totalResponseTimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);

  const payload = {
    status: isHealthy ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    environment: process.env.NODE_ENV || 'production',
    service: 'project-lamo-portfolio',
    version: '1.0.0',
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      error: dbError,
    },
    integrations: {
      githubSync: !!process.env.GITHUB_USERNAME,
      geminiLlm: !!process.env.GEMINI_API_KEY,
      emailNotifications: !!process.env.RESEND_API_KEY,
    },
    metrics,
    performance: {
      responseTimeMs: totalResponseTimeMs,
      memoryUsage: process.memoryUsage ? {
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      } : undefined,
    },
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
