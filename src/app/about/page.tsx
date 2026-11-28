import React from 'react';
import { ScrollDepth, TiltCard } from '@/components/motion/Depth';
import { ChapterStage } from '@/components/about/ChapterStage';
import { AboutHologramStage } from '@/components/about/AboutHologramStage';
import { NeuralStage } from '@/components/about/NeuralStage';
import { SkillUniverse, type UniDomain } from '@/components/about/SkillUniverse';
import { resolveIdentitySafety } from '@/lib/identity';
import { PROFILE } from '@/config/profile';
import { ABOUT_CHAPTERS } from '@/config/aboutContent';
import { TAXONOMY } from '@/lib/taxonomy';
import { getPublicProfile } from '@/lib/services/publicProfile';
import { getSkillTaxonomy } from '@/lib/services/skillService';
import { resolveEvidence, proficiencySteps } from '@/lib/skillEvidence';
import { Calendar, MapPin, GraduationCap } from 'lucide-react';

export const metadata = {
  title: 'About',
  description: 'About Taha Udaipurwala: B.Tech CSE (AI & ML), minor in Cybersecurity; agentic AI, full-stack and robotics simulation.',
};
export const dynamic = 'force-dynamic';

function parseArr(v: string | null): string[] { try { const a = JSON.parse(v ?? '[]'); return Array.isArray(a) ? a.map(String) : []; } catch { return []; } }

export default async function AboutPage() {
  const identity = resolveIdentitySafety();
  const profile = await getPublicProfile();
  const tax = await getSkillTaxonomy();
  const status = identity.academicStatus.phase === 'COMPLETED' ? 'Graduated (B.Tech)' : `${identity.academicStatus.currentAcademicYear}, ${identity.academicStatus.semesterLabel}`;

  const domains: UniDomain[] = Object.entries(tax.byDomain)
    .map(([name, list]) => ({
      name,
      skills: (list as any[]).map((s) => ({
        id: s.id, name: s.name, status: s.level, steps: proficiencySteps(s.proficiencyLevel), note: s.evidenceNotes ?? null,
        links: parseArr(s.evidenceSources).map((x) => resolveEvidence(x, PROFILE.github.username)).filter((l) => l.kind !== 'note').map((l) => ({ label: l.label, href: l.href })),
      })),
    }))
    .sort((a, b) => b.skills.length - a.skills.length);
  const allDomainNames = Array.from(new Set([...TAXONOMY.map((t) => t.name), ...domains.map((d) => d.name)]));

  return (
    <div>
      <AboutHologramStage
        name={identity.displayName}
        headline={profile.headline}
        holo={{ portraitUrl: '/hologram/portrait.webp', depthUrl: '/hologram/depth.webp', aspect: 0.7983, name: identity.displayName, headline: profile.headline }}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <ScrollDepth className="mb-10" strength={0.6}>
          <TiltCard className="marble-card rounded-2xl p-8 grid sm:grid-cols-[auto,1fr] gap-8 items-center">
            <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-gold-500/20 via-imperial-800 to-imperial-950 border border-gold-500/40 flex items-center justify-center shadow-imperial-gold">
              <span className="font-serif text-5xl font-black text-gold-300">{identity.displayName.charAt(0)}</span>
            </div>
            <div>
              {profile.bio && <p className="text-neutral-200 text-sm sm:text-base leading-relaxed">{profile.bio}</p>}
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-neutral-300">
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gold-400" aria-hidden />{profile.location}</span>
                <span className="inline-flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-gold-400" aria-hidden />{status}</span>
                {identity.publicAge !== null && <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gold-400" aria-hidden />{identity.publicAge} years</span>}
              </div>
            </div>
          </TiltCard>
        </ScrollDepth>
      </div>

      <NeuralStage />
      <ChapterStage chapters={ABOUT_CHAPTERS} />
      <SkillUniverse domains={domains} allDomainNames={allDomainNames} />

      <ScrollDepth className="py-28">
        <div className="text-center">
          <p className="font-serif text-4xl sm:text-7xl font-black text-gold-300">I refuse to be average.</p>
        </div>
      </ScrollDepth>
    </div>
  );
}
