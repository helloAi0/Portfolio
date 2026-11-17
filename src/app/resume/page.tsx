import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { PrintButton } from '@/components/ui/PrintButton';
import { resolveIdentitySafety } from '@/lib/identity';
import { PROFILE } from '@/config/profile';
import { prisma } from '@/lib/prisma';
import { Mail, Github, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Resume',
  description: 'Resume of Taha Udaipurwala, generated from approved portfolio records.',
};

export const dynamic = 'force-dynamic';

const PUBLIC_SKILL_EXCLUDED = ['DETECTED', 'REPOSITORY_DETECTED'];

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 break-inside-avoid">
      <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-gold-400 border-b border-white/5 pb-1">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ResumePage() {
  const identity = resolveIdentitySafety();

  let skills: any[] = [], projects: any[] = [], certs: any[] = [], achievements: any[] = [], experiences: any[] = [], education: any[] = [];
  let loadedAt = new Date();
  try {
    [skills, projects, certs, achievements, experiences, education] = await Promise.all([
      prisma.skill.findMany({ where: { level: { notIn: PUBLIC_SKILL_EXCLUDED } }, orderBy: [{ domain: 'asc' }, { name: 'asc' }] }),
      prisma.project.findMany({ where: { approvalStatus: 'APPROVED' }, orderBy: [{ featured: 'desc' }, { orderIndex: 'asc' }], take: 6 }),
      prisma.certificate.findMany({ where: { isPublic: true, ownerApproved: true }, orderBy: { issueDate: 'desc' } }),
      prisma.achievement.findMany({ where: { isPublic: true, ownerApproved: true }, orderBy: { date: 'desc' } }),
      prisma.experience.findMany({ where: { isPublic: true }, orderBy: { startDate: 'desc' } }),
      prisma.education.findMany({ orderBy: { orderIndex: 'asc' } }),
    ]);
    loadedAt = new Date();
  } catch {
    // Render the static identity block even if the database is unreachable.
  }

  const skillsByDomain = skills.reduce<Record<string, any[]>>((acc, s) => {
    (acc[s.domain] ||= []).push(s);
    return acc;
  }, {});
  const tag = (s: any) =>
    s.level === 'LEARNING' || s.level === 'IN_PROGRESS' || s.level === 'PRACTICING' ? `${s.name} (learning)` : s.name;

  let n = 0;
  const num = () => String(++n).padStart(2, '0');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="print:hidden">
        <Breadcrumbs items={[{ label: 'Resume' }]} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 print:hidden">
        <SectionHeading eyebrow="Curriculum Vitae" title="Resume" description="Generated from approved portfolio records. Nothing appears here that is not in the database." />
        <PrintButton />
      </div>

      <article className="marble-card p-8 sm:p-14 rounded-lg text-neutral-200 border-gold-500/30 shadow-2xl space-y-8">
        <header className="border-b border-gold-500/20 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">{identity.displayName.toUpperCase()}</h1>
            <p className="text-sm font-mono text-gold-400 mt-1">{PROFILE.headline}</p>
          </div>
          <div className="text-xs font-mono space-y-1 text-neutral-300 md:text-right">
            <div className="flex items-center md:justify-end space-x-1.5"><Mail className="w-3.5 h-3.5 text-gold-400" aria-hidden /><span>{identity.contactEmail}</span></div>
            <div className="flex items-center md:justify-end space-x-1.5"><Github className="w-3.5 h-3.5 text-gold-400" aria-hidden /><span>github.com/{PROFILE.github.username}</span></div>
            <div className="flex items-center md:justify-end space-x-1.5"><MapPin className="w-3.5 h-3.5 text-gold-400" aria-hidden /><span>{PROFILE.location}</span></div>
          </div>
        </header>

        <Section n={num()} title="Education">
          <div className="space-y-3">
            {(education.length ? education : [{ id: 'default', institution: identity.academicStatus.institution ?? 'B.Tech programme', degree: 'B.Tech', field: identity.academicStatus.field, minor: identity.academicStatus.minor, startYear: identity.academicStatus.enrollmentYear, endYear: identity.academicStatus.expectedGraduationYear }]).map((e: any) => (
              <div key={e.id} className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                <div>
                  <h3 className="font-serif font-bold text-white text-sm">{e.institution}</h3>
                  {e.degree && <p className="text-xs text-neutral-300">{e.degree}{e.field ? `, ${e.field}` : ''}</p>}
                  {e.minor && <p className="text-xs text-gold-300/90 font-mono">Minor: {e.minor}</p>}
                </div>
                {e.startYear && (
                  <span className="text-xs font-mono text-neutral-400">{e.startYear} - {e.endYear ?? 'Present'}{e.isCurrent ? ' (expected)' : ''}</span>
                )}
              </div>
            ))}
          </div>
        </Section>

        {skills.length > 0 && (
          <Section n={num()} title="Technical Skills">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {Object.entries(skillsByDomain).map(([domain, list]) => (
                <div key={domain} className="p-3 rounded bg-imperial-900 border border-white/5">
                  <span className="font-mono text-gold-300 font-bold block mb-1">{domain}</span>
                  <p className="text-neutral-300">{list.map(tag).join(', ')}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {projects.length > 0 && (
          <Section n={num()} title="Selected Projects">
            <div className="space-y-4">
              {projects.map((p) => (
                <div key={p.id}>
                  <h3 className="font-serif font-bold text-white text-sm">{p.title}</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed">{p.tagline || p.description}</p>
                  {p.githubRepo && <p className="text-[11px] font-mono text-gold-400 mt-0.5">{p.githubRepo}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {certs.length > 0 && (
          <Section n={num()} title="Certificates">
            <ul className="text-xs text-neutral-300 space-y-1">
              {certs.map((c) => (
                <li key={c.id}>{c.title}, {c.issuingOrganization}{c.issueDate ? ` (${c.issueDate.getFullYear()})` : ''}</li>
              ))}
            </ul>
          </Section>
        )}

        {achievements.length > 0 && (
          <Section n={num()} title="Achievements">
            <ul className="text-xs text-neutral-300 space-y-1">
              {achievements.map((a) => (<li key={a.id}>{a.title}, {a.organization}</li>))}
            </ul>
          </Section>
        )}

        {experiences.length > 0 && (
          <Section n={num()} title="Experience">
            <div className="space-y-3">
              {experiences.map((e) => (
                <div key={e.id}>
                  <h3 className="font-serif font-bold text-white text-sm">{e.roleTitle}, {e.organization}</h3>
                  <p className="text-[11px] font-mono text-neutral-400">
                    {e.startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} - {e.isCurrent ? 'Present' : e.endDate ? e.endDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}
                  </p>
                  <p className="text-xs text-neutral-300">{e.description}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        <footer className="pt-4 border-t border-gold-500/20 text-[11px] font-mono text-neutral-500">
          Generated {loadedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })} from approved portfolio records.
        </footer>
      </article>
    </div>
  );
}
