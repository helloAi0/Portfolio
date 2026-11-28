import React from 'react';
import Link from 'next/link';
import { HeroStage, type HeroChapter } from './HeroStage';
import { Button } from '@/components/ui/Button';
import { resolveIdentitySafety } from '@/lib/identity';
import { getPublicProfile } from '@/lib/services/publicProfile';
import { Github, Linkedin, ArrowRight, ShieldCheck, Cpu, Code2, Sparkles, BookOpen } from 'lucide-react';

export async function HeroSection() {
  const identity = resolveIdentitySafety();
  const profile = await getPublicProfile();

  const nameWords = identity.displayName.toUpperCase().split(' ');
  const intro = (
    <div className="max-w-3xl space-y-7 text-left">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-imperial-900/80 border border-gold-500/30 text-[11px] font-mono text-gold-300 backdrop-blur">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
        <span>{identity.academicStatus.phase === 'COMPLETED' ? 'B.Tech completed' : `B.Tech ${identity.academicStatus.currentAcademicYear} · ${identity.academicStatus.semesterLabel}`} · Kolkata</span>
      </div>

      <h1 className="font-serif font-black tracking-tight text-white leading-[0.9] text-[clamp(2.6rem,6.4vw,5.6rem)] [text-shadow:0_4px_30px_rgba(0,0,0,.7)]" aria-label={identity.displayName}>
        {nameWords.map((w, i) => (
          <span key={w} className="kw mr-[0.25em]" aria-hidden><span style={{ ['--i' as string]: i }}>{w}</span></span>
        ))}
      </h1>

      <p className="text-xl sm:text-3xl font-serif italic text-gold-300 font-light">{profile.headline}</p>
      <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-xl">
        I build agentic AI apps, full-stack platforms and robotics simulations, and I am training in cybersecurity.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button href="/projects" variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />}>See my work</Button>
        <Button href="/resume" variant="secondary" size="lg" icon={<BookOpen className="w-4 h-4" />}>Resume</Button>
        <a href={profile.githubUrl || 'https://github.com/helloAi0'} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="p-3 rounded border border-gold-500/20 bg-imperial-900/70 text-neutral-300 hover:text-gold-300 hover:border-gold-500/60 transition"><Github className="w-5 h-5" /></a>
        {profile.linkedinUrl && (
          <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile" className="p-3 rounded border border-gold-500/20 bg-imperial-900/70 text-neutral-300 hover:text-gold-300 hover:border-gold-500/60 transition"><Linkedin className="w-5 h-5" /></a>
        )}
      </div>
    </div>
  );

  const chapters: HeroChapter[] = [
    {
      id: 'now',
      from: 0.17,
      to: 0.43,
      node: (
        <div className="max-w-xl space-y-5">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold-400">Where I am now</span>
          <h2 className="text-3xl sm:text-5xl font-serif font-black text-white leading-tight">
            {identity.academicStatus.phase === 'COMPLETED' ? 'Programme completed' : <>{identity.academicStatus.currentAcademicYear},<br />{identity.academicStatus.semesterLabel}</>}
          </h2>
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
            B.Tech in Computer Science &amp; Engineering (AI &amp; ML), minor in Cybersecurity
            {identity.academicStatus.institution ? <>, at {identity.academicStatus.institution}</> : null}.
            This status updates itself from today&apos;s date.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {['AI / ML', 'Robotics', 'Cybersecurity'].map((t) => (
              <span key={t} className="px-3 py-1 rounded-full border border-gold-500/30 bg-imperial-900/70 text-xs font-mono text-gold-300">{t}</span>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'meet',
      from: 0.57,
      to: 0.81,
      node: (
        <div className="max-w-md space-y-5">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-300">Act two · The lab</span>
          <h2 className="text-3xl sm:text-5xl font-serif font-black text-white leading-tight">From classical craft<br />to robotics.</h2>
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
            Agentic AI, robotics simulation and security, built end to end. The figure on the right is rebuilt from a single photo into a depth-relief hologram: a real photo lifted by a depth map, not a 3D scan.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {['Agentic AI', 'Robotics sim', 'Security'].map((t) => (
              <span key={t} className="px-3 py-1 rounded-full border border-cyan-300/40 bg-[#04121a]/70 text-xs font-mono text-cyan-200">{t}</span>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'enter',
      from: 0.85,
      to: 1.01,
      node: (
        <div className="max-w-xl space-y-5">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-300">The work</span>
          <h2 className="text-3xl sm:text-5xl font-serif font-black text-white leading-tight">Enter the portfolio</h2>
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
            Projects synced from GitHub, skills backed by evidence, and an assistant, LAMO, that only answers from verified records.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button href="/projects" variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />}>Projects</Button>
            <Button href="/skills" variant="secondary" size="lg">Skills</Button>
            <Button href="/contact" variant="outline" size="lg">Contact</Button>
          </div>
        </div>
      ),
    },
  ];

  const holo = { portraitUrl: '/hologram/portrait.webp', depthUrl: '/hologram/depth.webp', aspect: 0.7983, name: identity.displayName, headline: profile.headline || 'AI and robotics engineer' };
  return <HeroStage intro={intro} chapters={chapters} holo={holo} />;
}
