import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { PROFILE } from '@/config/profile';
import { prisma } from '@/lib/prisma';
import { ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Journey',
  description: 'A timeline built only from real, approved records: education, projects, certificates, achievements, experience and posts.',
};

export const dynamic = 'force-dynamic';

interface TimelineEvent {
  date: Date;
  kind: 'Education' | 'Project' | 'Certificate' | 'Achievement' | 'Experience' | 'Post' | 'Target';
  title: string;
  detail?: string;
  href?: string;
  external?: boolean;
}

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default async function JourneyPage() {
  const now = new Date();
  const events: TimelineEvent[] = [
    {
      date: new Date(Date.UTC(PROFILE.education.startYear, 6, 1)),
      kind: 'Education',
      title: `Started ${PROFILE.education.degree} in Computer Science and Engineering (AI & ML)`,
      detail: PROFILE.education.institution ?? undefined,
      href: '/education',
    },
    {
      date: new Date(Date.UTC(PROFILE.education.endYear, 5, 1)),
      kind: 'Target',
      title: `Expected graduation (${PROFILE.education.endYear})`,
      detail: 'A planned milestone, not yet reached.',
    },
  ];

  try {
    const [projects, certs, achievements, experiences, posts] = await Promise.all([
      prisma.project.findMany({ where: { approvalStatus: 'APPROVED' }, select: { title: true, slug: true, createdAt: true } }),
      prisma.certificate.findMany({ where: { isPublic: true, ownerApproved: true } }),
      prisma.achievement.findMany({ where: { isPublic: true, ownerApproved: true } }),
      prisma.experience.findMany({ where: { isPublic: true } }),
      prisma.linkedinPost.findMany({ where: { isApproved: true, isPublic: true } }),
    ]);
    for (const p of projects) events.push({ date: p.createdAt, kind: 'Project', title: `Project added: ${p.title}`, href: `/projects/${p.slug}` });
    for (const c of certs) if (c.issueDate) events.push({ date: c.issueDate, kind: 'Certificate', title: c.title, detail: c.issuingOrganization, href: '/certificates' });
    for (const a of achievements) if (a.date) events.push({ date: a.date, kind: 'Achievement', title: a.title, detail: a.organization, href: '/achievements' });
    for (const e of experiences) events.push({ date: e.startDate, kind: 'Experience', title: `${e.roleTitle}, ${e.organization}`, href: '/experience' });
    for (const post of posts) events.push({ date: post.publishedAt, kind: 'Post', title: post.title || 'LinkedIn post', detail: post.contentExcerpt, href: post.postUrl ?? undefined, external: true });
  } catch {
    // Database unavailable: the static education milestones above still render.
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Journey' }]} />

      <SectionHeading
        eyebrow="Timeline"
        title="Journey"
        description="Every entry here comes from a real record. The timeline grows as projects, certificates, achievements and experience are added and approved."
      />

      <ol className="relative border-l border-gold-500/30 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-8">
        {events.map((ev, idx) => (
          <li key={idx} className="relative">
            <span className="absolute -left-[31px] sm:-left-[47px] top-2 w-3 h-3 rounded-full bg-imperial-950 border-2 border-gold-400" aria-hidden />
            <Card variant="marble" className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <Badge variant={ev.kind === 'Target' ? 'neutral' : 'gold'} size="xs">{ev.kind}</Badge>
                <time className="text-xs font-mono text-neutral-400" dateTime={ev.date.toISOString()}>
                  {fmt(ev.date)}{ev.date > now ? ' (expected)' : ''}
                </time>
              </div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-white">{ev.title}</h3>
              {ev.detail && <p className="text-xs sm:text-sm text-neutral-300 mt-1 leading-relaxed">{ev.detail}</p>}
              {ev.href && (
                ev.external ? (
                  <a href={ev.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs font-mono text-gold-400 hover:text-gold-200">
                    View original post <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <a href={ev.href} className="inline-block mt-3 text-xs font-mono text-gold-400 hover:text-gold-200">View details &rarr;</a>
                )
              )}
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
