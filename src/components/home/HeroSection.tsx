import React from 'react';
import Link from 'next/link';
import { HeroStage, type HeroChapter } from './HeroStage';
import { Button } from '@/components/ui/Button';
import { resolveIdentitySafety } from '@/lib/identity';
import { PROFILE } from '@/config/profile';
import { Github, Linkedin, ArrowRight, ShieldCheck, Cpu, Code2, Sparkles, BookOpen } from 'lucide-react';

export function HeroSection() {
  const identity = resolveIdentitySafety();

  const intro = (
          <div className="max-w-2xl space-y-6 text-left">
            {/* Imperial Identity Eyebrow */}
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-imperial-900/90 border border-gold-500/30 text-xs font-mono text-gold-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
              <span>THE IMPERIAL FOUNDATION • PROJECT LAMO</span>
            </div>

            {/* Cinematic Name & Title */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-black tracking-tight text-white leading-none">
                {identity.displayName.toUpperCase()}
              </h1>
              <p className="text-lg sm:text-2xl font-serif italic text-gold-300 font-light tracking-wide">
                {PROFILE.headline}
              </p>
            </div>

            {/* Academic summary (institution shown only once owner-confirmed) */}
            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-sans max-w-lg">
              B.Tech student in{' '}
              <span className="text-gold-300 font-medium">Computer Science &amp; Engineering (AI &amp; ML)</span>
              {identity.academicStatus.institution && (
                <> at <span className="text-white font-medium">{identity.academicStatus.institution}</span></>
              )}{' '}
              ({identity.academicStatus.enrollmentYear}–{identity.academicStatus.expectedGraduationYear}), with a minor in{' '}
              <span className="text-gold-300 font-medium">Cybersecurity</span> and hands-on learning in{' '}
              <span className="text-gold-300 font-medium">Robotics</span>.
            </p>

            {/* Dynamic Temporal Telemetry Badge */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 pb-2 max-w-xl">
              {identity.publicAge !== null && (
              <div className="p-3 rounded bg-imperial-900/80 border border-gold-500/20">
                <span className="block text-[10px] font-mono text-neutral-400 uppercase">Age</span>
                <span className="text-base font-serif font-bold text-white">{identity.publicAge} Years</span>
              </div>
              )}

              <div className="p-3 rounded bg-imperial-900/80 border border-gold-500/20">
                <span className="block text-[10px] font-mono text-neutral-400 uppercase">Progression</span>
                <span className="text-base font-serif font-bold text-gold-300">
                  {identity.academicStatus.phase === 'COMPLETED' ? 'Completed' : `${identity.academicStatus.currentAcademicYear.split(' ')[0]} · Sem ${identity.academicStatus.semesterLabel.split(' ')[1]}`}
                </span>
                <span className="block text-[9px] text-neutral-400 font-mono">B.Tech 2024–2028</span>
              </div>

              <div className="p-3 rounded bg-imperial-900/80 border border-gold-500/20 col-span-2 sm:col-span-1">
                <span className="block text-[10px] font-mono text-neutral-400 uppercase">Academic Minor</span>
                <span className="text-base font-serif font-bold text-white">
                  Cybersecurity
                </span>
                <span className="block text-[9px] text-emerald-400 font-mono">Robotics learning</span>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button
                href="/projects"
                variant="primary"
                size="lg"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Explore Portfolio
              </Button>

              <Button
                href="/resume"
                variant="secondary"
                size="lg"
                icon={<BookOpen className="w-4 h-4" />}
              >
                View Resume
              </Button>

              <div className="flex items-center space-x-2 pl-2">
                <a
                  href="https://github.com/helloAi0/Portfolio.git"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded bg-imperial-900 text-neutral-300 hover:text-gold-300 border border-gold-500/20 hover:border-gold-500/60 transition-all shadow-sm"
                  title="GitHub Repository"
                >
                  <Github className="w-5 h-5" />
                </a>

                {PROFILE.linkedinUrl && (
                <a
                  href={PROFILE.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded bg-imperial-900 text-neutral-300 hover:text-gold-300 border border-gold-500/20 hover:border-gold-500/60 transition-all shadow-sm"
                  title="LinkedIn"
                  aria-label="LinkedIn profile"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                )}
              </div>
            </div>
          </div>
  );

  const chapters: HeroChapter[] = [
    {
      id: 'now',
      from: 0.3,
      to: 0.6,
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
      id: 'enter',
      from: 0.68,
      to: 1.01,
      node: (
        <div className="max-w-xl space-y-5">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold-400">The work</span>
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

  return <HeroStage intro={intro} chapters={chapters} />;
}
