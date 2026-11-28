import { prisma } from '@/lib/prisma';
import { PROFILE, SITE_URL } from '@/config/profile';
import { JOB_CONFIG } from '@/config/jobScout';
import { loadVerifiedKnowledge } from '@/lib/lamo/knowledgeRetriever';

export interface OutreachProfile { name: string; email: string; portfolioUrl: string; resumeUrl: string; bio: string; projects: string[]; skills: string[]; factsText: string }
const abs = (u?: string | null) => (u ? (/^https?:\/\//i.test(u) ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`) : '');
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const firstSentence = (s: string) => (s.replace(/\s+/g, ' ').match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();

/** The owner's public facts, straight from the portfolio database. The email may only claim what is in here. */
export async function getOutreachProfile(): Promise<OutreachProfile> {
  const [resume, all] = await Promise.all([
    prisma.resumeSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null),
    loadVerifiedKnowledge().catch(() => []),
  ]);
  const done = all.filter((c) => c.verificationStatus !== 'IN_PROGRESS');
  const projects = done.filter((c) => c.id.startsWith('project:')).slice(0, 4).map((c) => `${c.title.replace(/\s*\(.*\)$/, '')}: ${clip(firstSentence(c.content), 170)}`);
  const skills = done.filter((c) => c.id.startsWith('skill:')).slice(0, 14).map((c) => c.title.replace(/\s*\(.*\)$/, ''));
  const e = PROFILE.education;
  const bio = `${e.degree} student in ${e.field}, expected graduation ${e.endYear}, based in ${PROFILE.location}. No full-time experience yet; looking for internships.`;
  const slots = JOB_CONFIG.resumeSlot;
  const resumeUrl = abs(resume?.[slots.ai_robotics]) || abs(resume?.[slots.systems_security]);
  return { name: PROFILE.displayName, email: PROFILE.contactEmail, portfolioUrl: SITE_URL, resumeUrl, bio, projects, skills, factsText: [bio, ...projects, ...skills].join('\n').toLowerCase() };
}
