import React from 'react';
import { EmptyNote } from '@/components/ui/EmptyNote';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getSkillTaxonomy } from '@/lib/services/skillService';
import { PROFILE } from '@/config/profile';
import { resolveEvidence, proficiencySteps } from '@/lib/skillEvidence';
import { SkillRobotBay, type ColDomain } from '@/components/skills/SkillRobotBay';
import { toRoman } from '@/lib/roman';
import { ScrollDepth, TiltCard, CountUp } from '@/components/motion/Depth';
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
  OWNER_VERIFIED: { label: 'Owner stated', variant: 'gold' },
  PROJECT_DEMONSTRATED: { label: 'Demonstrated in a project', variant: 'verified' },
  REPOSITORY_DETECTED: { label: 'Detected in a repository', variant: 'neutral' },
  IN_PROGRESS: { label: 'In progress', variant: 'bronze' },
  DEMONSTRATED: { label: 'Demonstrated in Projects', variant: 'verified' },
  OWNER_CONFIRMED: { label: 'Owner Confirmed', variant: 'gold' },
  PRACTICING: { label: 'Practicing', variant: 'bronze' },
  LEARNING: { label: 'Active Learning', variant: 'detected' },
  DETECTED: { label: 'Detected in Repos', variant: 'neutral' },
};

export default async function SkillsPage() {
  const { all, byDomain, verifiedCount, detectedCount } = await getSkillTaxonomy();

  const colDomains: ColDomain[] = Object.entries(byDomain)
    .map(([name, list]) => ({
      name,
      skills: (list as any[]).map((sk) => ({
        id: sk.id, name: sk.name, label: (levelBadgeMap[sk.level] || { label: sk.level || 'Detected' }).label, steps: proficiencySteps(sk.proficiencyLevel), note: sk.evidenceNotes ?? null,
        links: parseSources(sk.evidenceSources).map((x) => resolveEvidence(String(x), PROFILE.github.username)).filter((l) => l.kind !== 'note' && l.href).map((l) => ({ label: l.label, href: l.href as string })),
      })),
    }))
    .sort((a, b) => b.skills.length - a.skills.length);

  return (
    <div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
      <Breadcrumbs items={[{ label: 'Skill Taxonomy' }]} />
      <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mt-10 mb-4">Skills · {toRoman(all.length)}</p>
      <h1 className="font-serif font-black text-white leading-[0.92] text-[clamp(2.6rem,8vw,7rem)]">What I know,<br /><span className="text-gold-300">and the proof.</span></h1>
      <p className="mt-5 text-neutral-300 max-w-2xl">Each skill is marked honestly: demonstrated in a project, confirmed by me, still practising, or only detected in a repository. Detection is never treated as mastery.</p>
    </div>
    {all.length === 0 ? <EmptyNote title="The skill ledger is being built">Each skill is added with its evidence, so nothing is listed until it is backed by a project or confirmed by the owner.</EmptyNote> : <SkillRobotBay domains={colDomains} />}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

      <div id="ledger" className="scroll-mt-24" />
      <SectionHeading eyebrow="The full ledger" title="Every skill, with its evidence" description="The same skills as above, laid out in full." />

      {/* Verification Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-12">
        <Card variant="marble" className="p-5">
          <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
            Total Cataloged Skills
          </span>
          <CountUp value={all.length} className="text-3xl font-serif font-black text-white" />
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">Across {Object.keys(byDomain).length} domains</span>
        </Card>

        <Card variant="marble" className="p-5 border-emerald-500/30">
          <div className="flex items-center space-x-1.5 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono uppercase text-emerald-400">
              Owner-stated or demonstrated
            </span>
          </div>
          <span className="text-3xl font-serif font-black text-emerald-300">{verifiedCount}</span>
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">Backed by a project or owner confirmation</span>
        </Card>

        <Card variant="marble" className="p-5 border-gold-500/30">
          <div className="flex items-center space-x-1.5 mb-1">
            <Compass className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-[10px] font-mono uppercase text-gold-400">
              Practicing & Learning
            </span>
          </div>
          <span className="text-3xl font-serif font-black text-gold-300">
            {all.filter((s: any) => s.level === 'PRACTICING' || s.level === 'LEARNING' || s.level === 'IN_PROGRESS').length}
          </span>
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">Currently learning</span>
        </Card>

        <Card variant="marble" className="p-5 border-amber-500/30">
          <div className="flex items-center space-x-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-mono uppercase text-amber-400">
              Detected Baseline
            </span>
          </div>
          <span className="text-3xl font-serif font-black text-amber-300">{detectedCount}</span>
          <span className="text-[10px] font-mono text-neutral-500 block mt-1">Found in repositories, not yet reviewed</span>
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

                return (
                  <ScrollDepth key={skill.id} strength={0.4}><TiltCard className="h-full"><Card variant="marble" className="p-6 flex flex-col justify-between h-full">
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
                        {skill.category}
                      </p>

                      {skill.evidenceNotes && (
                        <p className="text-xs text-neutral-400 leading-normal mb-3 font-sans">
                          {skill.evidenceNotes}
                        </p>
                      )}

                      {/* Owner-rated proficiency */}
                      {proficiencySteps(skill.proficiencyLevel) > 0 && (
                        <div className="mb-4" aria-label={`Owner-rated proficiency: ${String(skill.proficiencyLevel).toLowerCase()}`}>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((n) => (
                              <span key={n} className={'h-1.5 flex-1 rounded-full ' + (n <= proficiencySteps(skill.proficiencyLevel) ? 'bg-gold-400' : 'bg-white/10')} />
                            ))}
                          </div>
                          <span className="text-[9px] font-mono uppercase text-neutral-500 block mt-1">Self-rated: {String(skill.proficiencyLevel).toLowerCase()}</span>
                        </div>
                      )}

                      {/* Evidence: real links */}
                      {sources.length > 0 && (
                        <div className="mb-4">
                          <span className="text-[9px] font-mono uppercase text-neutral-500 block mb-1">Evidence</span>
                          <div className="flex flex-wrap gap-1.5">
                            {sources.map((src, i) => {
                              const ev = resolveEvidence(String(src), PROFILE.github.username);
                              const cls = 'px-2 py-0.5 rounded bg-imperial-950 text-[10px] font-mono border border-white/5 ';
                              return ev.href ? (
                                <a key={i} href={ev.href} {...(ev.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={cls + 'text-gold-300 hover:border-gold-500/60'}>{ev.label} ↗</a>
                              ) : (
                                <span key={i} className={cls + 'text-neutral-400'}>{ev.label}</span>
                              );
                            })}
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
                  </Card></TiltCard></ScrollDepth>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
