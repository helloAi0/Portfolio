import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { prisma } from '@/lib/prisma';
import { Briefcase, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ExperiencePage() {
  const experiences = await prisma.experience.findMany({
    orderBy: { startDate: 'desc' },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Work Experience' }]} />

      <SectionHeading
        eyebrow="Professional Engagements"
        title="Work Experience & Industry History"
        description="Authentic record of industry engineering, lab appointments, and technical contributions."
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
            Unlike standard developer portfolios that list fictional senior titles or unverified internships, Project LAMO lists only verified roles backed by employment contracts. As a current undergraduate student (Class of 2028), active focus is dedicated to academic foundational mastery and autonomous laboratory research.
          </p>
          <div className="p-3 rounded bg-imperial-950 border border-white/5 text-[11px] font-mono text-neutral-400">
            Open for verified industry internships & autonomous robotics research collaborations.
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {experiences.map((exp) => (
            <Card key={exp.id} variant="marble" className="p-6">
              <h3 className="font-serif font-bold text-lg text-white">{exp.roleTitle}</h3>
              <p className="text-xs text-gold-300 font-mono">{exp.organization}</p>
              <p className="text-xs text-neutral-400 mt-2">{exp.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
