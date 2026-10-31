import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getSkillTaxonomy } from '@/lib/services/skillService';
import { CheckCircle2, AlertTriangle, Layers, Cpu, Code2, ArrowUpRight } from 'lucide-react';

export const metadata = {
  title: 'Skill Taxonomy & Evidence Registry',
  description: 'Evidence-based skill management system separating verified proficiency from detected technologies.',
};

export const dynamic = 'force-dynamic';

export default async function SkillsPage() {
  const { all, byDomain, verifiedCount, detectedCount } = await getSkillTaxonomy();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Skill Taxonomy' }]} />

      <SectionHeading
        eyebrow="Evidence Engine"
        title="Skill Taxonomy & Verification Boundaries"
        description="Every skill is subjected to an empirical standard. We explicitly segregate owner-verified proficiency from exploratory and repository-detected technologies."
      />

      {/* Verification Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <Card variant="marble" className="p-6">
          <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
            Total Cataloged Skills
          </span>
          <span className="text-3xl font-serif font-black text-white">{all.length}</span>
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">Across 7 Core Domains</span>
        </Card>

        <Card variant="marble" className="p-6 border-emerald-500/30">
          <div className="flex items-center space-x-1.5 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono uppercase text-emerald-400">
              Verified Proficiencies
            </span>
          </div>
          <span className="text-3xl font-serif font-black text-emerald-300">{verifiedCount}</span>
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">Backed by project architecture</span>
        </Card>

        <Card variant="marble" className="p-6 border-amber-500/30">
          <div className="flex items-center space-x-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-mono uppercase text-amber-400">
              Exploratory / Detected
            </span>
          </div>
          <span className="text-3xl font-serif font-black text-amber-300">{detectedCount}</span>
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">Foundational / Academic labs</span>
        </Card>
      </div>

      {/* Domain Groups */}
      <div className="space-y-10">
        {Object.entries(byDomain).map(([domain, skills]) => (
          <div key={domain} className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-gold-400">
              <span className="w-4 h-[1px] bg-gold-400" />
              <span>{domain} ({skills.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <Card key={skill.id} variant="marble" className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-serif font-bold text-base text-white">
                      {skill.name}
                    </h3>
                    <Badge variant={skill.verified ? 'verified' : 'detected'} size="xs">
                      {skill.verified ? 'Verified' : 'Detected'}
                    </Badge>
                  </div>

                  <p className="text-[11px] font-mono text-gold-400 mb-2">
                    {skill.category} • Tier: {skill.proficiencyLevel}
                  </p>

                  {skill.evidenceNotes && (
                    <p className="text-xs text-neutral-400 leading-normal mb-3 font-sans">
                      {skill.evidenceNotes}
                    </p>
                  )}

                  {/* Associated Projects */}
                  {skill.projects && skill.projects.length > 0 && (
                    <div className="pt-3 border-t border-white/5 space-y-1">
                      <span className="text-[9px] font-mono uppercase text-neutral-500 block">
                        Demonstrated In:
                      </span>
                      {skill.projects.map((p) => (
                        <Link
                          key={p.project.id}
                          href={`/projects/${p.project.slug}`}
                          className="inline-flex items-center space-x-1 text-xs text-gold-300 hover:underline font-mono"
                        >
                          <span>{p.project.title}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

