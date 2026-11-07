import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { prisma } from '@/lib/prisma';
import { Briefcase, ShieldCheck, Calendar, MapPin, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ExperiencePage() {
  const experiences = await prisma.experience.findMany({
    where: { isPublic: true },
    orderBy: { startDate: 'desc' },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Work Experience' }]} />

      <SectionHeading
        eyebrow="Professional Engagements"
        title="Work Experience & Research Appointments"
        description="Authentic record of industry engineering, lab appointments, and technical contributions. Strictly manual and authorized."
      />

      {experiences.length === 0 ? (
        <Card variant="marble" className="p-10 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-imperial-900 border border-gold-500/30 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-6 h-6 text-gold-400" />
          </div>
          <h3 className="font-serif text-xl font-bold text-white mb-2">
            No Fabricated Internships or Employment
          </h3>
          <p className="text-xs text-neutral-300 font-sans leading-relaxed mb-6">
            Unlike standard developer portfolios that list fictional senior titles or unverified internships, Project LAMO lists only verified roles backed by employment contracts or authorized research agreements. As a current undergraduate student (Class of 2028), active focus is dedicated to academic foundational mastery and autonomous laboratory research.
          </p>
          <div className="p-3 rounded bg-imperial-950 border border-white/5 text-[11px] font-mono text-neutral-400">
            Open for verified industry internships & autonomous robotics research collaborations. Managed via Citadel Admin Desk.
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {experiences.map((exp) => (
            <Card key={exp.id} variant="marble" className="p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-serif font-bold text-xl text-white">{exp.roleTitle}</h3>
                    <Badge variant={exp.verified ? 'verified' : 'gold'} size="xs">
                      {exp.organizationType}
                    </Badge>
                  </div>
                  <p className="text-xs text-gold-300 font-mono">{exp.organization}</p>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400">
                  <Calendar className="w-3.5 h-3.5 text-gold-400" />
                  <span>
                    {new Date(exp.startDate).toLocaleDateString()} –{' '}
                    {exp.isCurrent ? 'Present' : exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-neutral-300 font-sans leading-relaxed mb-4">{exp.description}</p>

              {exp.keyContributions && (
                <div className="p-3 rounded bg-imperial-950 border border-white/5 text-xs font-mono text-neutral-300 mb-4">
                  <span className="text-[10px] uppercase text-neutral-500 block mb-1">Key Contributions:</span>
                  {exp.keyContributions}
                </div>
              )}

              {exp.evidenceUrl && (
                <div className="pt-3 border-t border-white/5">
                  <a
                    href={exp.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs font-mono text-gold-400 hover:text-gold-200"
                  >
                    <span>View Appointment Letter / Evidence</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
