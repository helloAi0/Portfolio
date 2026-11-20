import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ScrollDepth, TiltCard, OrbitRing } from '@/components/motion/Depth';
import { resolveIdentitySafety } from '@/lib/identity';
import { PROFILE } from '@/config/profile';
import { ABOUT_CHAPTERS, ORBIT_WORDS } from '@/config/aboutContent';
import { getPublicProfile } from '@/lib/services/publicProfile';
import { Calendar, MapPin, GraduationCap } from 'lucide-react';

export const metadata = {
  title: 'About',
  description: 'About Taha Udaipurwala: B.Tech CSE (AI & ML), minor in Cybersecurity; agentic AI, full-stack and robotics simulation.',
};

export default async function AboutPage() {
  const identity = resolveIdentitySafety();
  const profile = await getPublicProfile();
  const status = identity.academicStatus.phase === 'COMPLETED'
    ? 'Graduated (B.Tech)'
    : `${identity.academicStatus.currentAcademicYear}, ${identity.academicStatus.semesterLabel}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'About' }]} />

      <SectionHeading eyebrow="About" title="Who I am, and what I am building" description="Scroll: five questions, answered in my own words." />

      <OrbitRing items={ORBIT_WORDS} />

      <ScrollDepth className="mb-24" strength={0.6}>
        <TiltCard className="marble-card rounded-lg p-8 grid sm:grid-cols-[auto,1fr] gap-8 items-center">
          <div className="w-28 h-28 rounded bg-gradient-to-br from-gold-500/20 via-imperial-800 to-imperial-950 border border-gold-500/40 flex items-center justify-center shadow-imperial-gold">
            <span className="font-serif text-5xl font-black text-gold-300">Σ</span>
          </div>
          <div>
            <h2 className="text-3xl font-serif font-black text-white">{identity.displayName}</h2>
            <p className="text-sm text-gold-400 font-mono mt-1">{profile.headline}</p>
            {profile.bio && <p className="mt-4 text-neutral-200 text-sm leading-relaxed">{profile.bio}</p>}
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-neutral-300">
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gold-400" aria-hidden />{profile.location}</span>
              <span className="inline-flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-gold-400" aria-hidden />{status}</span>
              {identity.publicAge !== null && <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gold-400" aria-hidden />{identity.publicAge} years</span>}
            </div>
          </div>
        </TiltCard>
      </ScrollDepth>

      <ol className="space-y-24 sm:space-y-32">
        {ABOUT_CHAPTERS.map((c, i) => (
          <li key={c.key}>
            <ScrollDepth>
              <TiltCard className="marble-card rounded-lg p-8 sm:p-12 relative overflow-hidden">
                <span aria-hidden className="absolute -top-6 right-4 text-[9rem] sm:text-[12rem] font-serif font-black leading-none text-gold-500/[0.07] select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold-400 mb-3">Chapter {i + 1}</p>
                <h3 className="text-2xl sm:text-4xl font-serif font-black text-white mb-6 max-w-3xl">{c.question}</h3>
                <div className="space-y-4 max-w-3xl text-neutral-300 leading-relaxed text-sm sm:text-base relative">
                  {c.answer.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
                </div>
              </TiltCard>
            </ScrollDepth>
          </li>
        ))}
      </ol>

      <ScrollDepth className="mt-28">
        <div className="text-center py-16">
          <p className="font-serif text-4xl sm:text-6xl font-black text-gold-300">I refuse to be average.</p>
          <p className="mt-4 text-xs font-mono text-neutral-500">{PROFILE.displayName}</p>
        </div>
      </ScrollDepth>
    </div>
  );
}
