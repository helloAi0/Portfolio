import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getSkillTaxonomy } from '@/lib/services/skillService';
import { CheckCircle2, AlertTriangle, Layers, Cpu, Code2, ArrowUpRight, ShieldCheck, Compass } from 'lucide-react';

export const metadata = {
  title: 'Skill Taxonomy & Dynamic Graph',
  description: 'Evidence-based skill graph separating owner-confirmed, demonstrated, practicing, and detected technologies.',
};

export const dynamic = 'force-dynamic';

function parseSources(src: string | null): string[] {
  if (!src) return [];
  try {
    const parsed = JSON.parse(src);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const levelBadgeMap: Record<string, { label: string; variant: 'verified' | 'gold' | 'bronze' | 'detected' | 'neutral' }> = {
  DEMONSTRATED: { label: 'Demonstrated in Projects', variant: 'verified' },
  OWNER_CONFIRMED: { label: 'Owner Confirmed', variant: 'gold' },
  PRACTICING: { label: 'Practicing', variant: 'bronze' },
  LEARNING: { label: 'Active Learning', variant: 'detected' },
  DETECTED: { label: 'Detected in Repos', variant: 'neutral' },
};

export default async function SkillsPage() {
  const { all, byDomain, verifiedCount, detectedCount } = await getSkillTaxonomy();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Skill Taxonomy' }]} />

      <SectionHeading
        eyebrow="Dynamic Intelligence Graph"
        title="Evidence-Based Skill Graph & Verification Hierarchy"
        description="Every skill is graded across five objective tiers: Demonstrated through Projects, Owner Confirmed, Practicing, Learning, and Repository-Detected. Automatic repository discovery is never equated with mastery."
      />

      {/* Verification Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-12">
        <Card variant="marble" className="p-5">
          <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
            Total Cataloged Skills
          </span>
          <span className="text-3xl font-serif font-black text-white">{all.length}</span>
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">Across 7 Core Domains</span>
        </Card>

        <Card variant="marble" className="p-5 border-emerald-500/30">
          <div className="flex items-center space-x-1.5 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono uppercase text-emerald-400">
              Demonstrated / Verified
            </span>
          </div>
          <span className="text-3xl font-serif font-black text-emerald-300">{verifiedCount}</span>
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">Backed by project architecture</span>
        </Card>

        <Card variant="marble" className="p-5 border-gold-500/30">
          <div className="flex items-center space-x-1.5 mb-1">
            <Compass className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-[10px] font-mono uppercase text-gold-400">
              Practicing & Learning
            </span>
          </div>
          <span className="text-3xl font-serif font-black text-gold-300">
            {all.filter((s: any) => s.level === 'PRACTICING' || s.level === 'LEARNING').length}
          </span>
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">In active laboratory progression</span>
        </Card>

        <Card variant="marble" className="p-5 border-amber-500/30">
          <div className="flex items-center space-x-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-mono uppercase text-amber-400">
              Detected Baseline
            </span>
          </div>
          <span className="text-3xl font-serif font-black text-amber-300">{detectedCount}</span>
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">Discovered in repository topics</span>
        </Card>
      </div>

      {/* Domain Groups */}
      <div className="space-y-12">
        {Object.entries(byDomain).map(([domain, skills]) => (
          <div key={domain} className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-gold-400">
              <span className="w-4 h-[1px] bg-gold-400" />
              <span>{domain} ({skills.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skills.map((skill: any) => {
                const levelInfo = levelBadgeMap[skill.level] || { label: skill.level || 'DETECTED', variant: 'neutral' };
                const sources = parseSources(skill.evidenceSources);
                const confidencePct = Math.round((skill.confidenceScore || 0.5) * 100);

                return (
                  <Card key={skill.id} variant="marble" className="p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-serif font-bold text-lg text-white">
                          {skill.name}
                        </h3>
                        <Badge variant={levelInfo.variant} size="xs">
                          {levelInfo.label}
                        </Badge>
                      </div>

                      <p className="text-[11px] font-mono text-gold-400 mb-3">
                        {skill.category} • Tier: {skill.proficiencyLevel}
                      </p>

                      {/* Confidence Score Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-[10px] font-mono mb-1">
                          <span className="text-neutral-400">Evidence Confidence:</span>
                          <span className="text-gold-300 font-bold">{confidencePct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-imperial-950 border border-gold-500/20 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
                            style={{ width: `${confidencePct}%` }}
                          />
                        </div>
                      </div>

                      {skill.evidenceNotes && (
                        <p className="text-xs text-neutral-400 leading-normal mb-3 font-sans">
                          {skill.evidenceNotes}
                        </p>
                      )}

                      {/* Evidence Sources */}
                      {sources.length > 0 && (
                        <div className="mb-4">
                          <span className="text-[9px] font-mono uppercase text-neutral-500 block mb-1">
                            Evidence Roots:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {sources.map((src, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-imperial-950 text-[10px] font-mono text-gold-400/90 border border-white/5"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Associated Projects */}
                    {skill.projects && skill.projects.length > 0 && (
                      <div className="pt-3 border-t border-white/5 space-y-1 mt-2">
                        <span className="text-[9px] font-mono uppercase text-neutral-500 block">
                          Demonstrated In:
                        </span>
                        {skill.projects.map((p: any) => (
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
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
