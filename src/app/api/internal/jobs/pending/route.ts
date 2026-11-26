import { NextRequest, NextResponse } from 'next/server';
import { requireWorker } from '@/lib/certIngest/internalAuth';
import { prisma } from '@/lib/prisma';
import { PROFILE } from '@/config/profile';
export const dynamic = 'force-dynamic';

/** Jobs waiting for form pre-fill. Contains NO phone number: the worker gets that from its own secret store. */
export async function GET(req: NextRequest) {
  const denied = requireWorker(req); if (denied) return denied;
  const rows = await prisma.jobMatch.findMany({ where: { prefillStatus: 'none', status: 'NEW', tier: { not: 'EXPLORATION' } }, orderBy: [{ score: 'desc' }], take: 6 });
  const parts = PROFILE.displayName.trim().split(/\s+/);
  return NextResponse.json({
    applicant: { firstName: parts[0], lastName: parts.slice(1).join(' '), fullName: PROFILE.displayName, email: PROFILE.contactEmail, city: 'Kolkata, India', github: PROFILE.github.url, linkedin: PROFILE.linkedinUrl },
    jobs: rows.map((j) => ({ id: j.id, url: j.url, company: j.company, title: j.title, family: j.family, letter: j.letter, letterNeeded: j.letterNeeded })),
  });
}
