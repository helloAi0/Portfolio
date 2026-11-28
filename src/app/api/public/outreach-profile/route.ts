import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PROFILE, SITE_URL } from '@/config/profile';
import { JOB_CONFIG } from '@/config/jobScout';
import { loadVerifiedKnowledge } from '@/lib/lamo/knowledgeRetriever';
export const dynamic = 'force-dynamic';

const abs = (u?: string | null) => (u ? (/^https?:\/\//i.test(u) ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`) : '');

/**
 * Everything the outreach workflow (n8n) needs about the owner, taken from the portfolio so nothing is typed twice.
 * Public data only: it is already visible on the site. No secrets, no private records, no phone number.
 */
export async function GET() {
  const [resume, all] = await Promise.all([
    prisma.resumeSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null),
    loadVerifiedKnowledge().catch(() => []),
  ]);
  const pick = (re: RegExp, n: number) => all.filter((c) => re.test(c.id) && c.verificationStatus !== 'IN_PROGRESS').slice(0, n).map((c) => c.title.replace(/\s*\(.*\)$/, ''));
  const projects = pick(/^project:/, 3), skills = pick(/^skill:/, 8);
  const e = PROFILE.education;
  const bio = [
    `${e.degree} student in ${e.field}, expected graduation ${e.endYear}, based in ${PROFILE.location}. No full-time experience.`,
    projects.length ? `Verified projects: ${projects.join('; ')}.` : '',
    skills.length ? `Skills on record: ${skills.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  const slots = JOB_CONFIG.resumeSlot;
  const url = (slot: 'pdfUrl' | 'pdfUrlB') => abs(resume?.[slot]);
  return NextResponse.json({
    name: PROFILE.displayName, email: PROFILE.contactEmail, location: PROFILE.location, headline: PROFILE.headline,
    portfolioUrl: SITE_URL, bio,
    resumeUrl: url(slots.ai_robotics) || url(slots.systems_security),
    resumes: { ai_robotics: url(slots.ai_robotics), systems_security: url(slots.systems_security) },
    github: PROFILE.github.url, linkedin: PROFILE.linkedinUrl,
    availability: JOB_CONFIG.owner.availability, workAuthorisationNote: 'Do not state work authorisation in outreach.',
  }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
