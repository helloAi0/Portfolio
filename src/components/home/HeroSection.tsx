import React from 'react';
import Link from 'next/link';
import { BucephalusCanvas } from './BucephalusCanvas';
import { Button } from '@/components/ui/Button';
import { resolveIdentitySafety } from '@/lib/identity';
import { Github, Linkedin, ArrowRight, ShieldCheck, Cpu, Code2, Sparkles, BookOpen } from 'lucide-react';

export function HeroSection() {
  const identity = resolveIdentitySafety();

  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center pt-24 pb-16 overflow-hidden">
      {/* Background radial atmosphere */}
      <div className="absolute inset-0 bg-imperial-radial pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Imperial Identity & Typography */}
          <div className="lg:col-span-7 space-y-6 text-left">
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
                Architect of Intelligent Systems & Autonomous Robotics
              </p>
            </div>

            {/* Derived Academic & Identity Specification */}
            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-sans max-w-2xl">
              Undergraduate engineer at{' '}
              <span className="text-white font-medium">UEM / IEM Kolkata</span> ({identity.academicStatus.enrollmentYear}–{identity.academicStatus.expectedGraduationYear}), specializing in{' '}
              <span className="text-gold-300 font-medium">Computer Science & Artificial Intelligence / Machine Learning</span> with an academic minor in{' '}
              <span className="text-gold-300 font-medium">Cybersecurity</span> and dedicated research focus in{' '}
              <span className="text-gold-300 font-medium">Autonomous Robotics</span>.
            </p>

            {/* Dynamic Temporal Telemetry Badge */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 pb-2 max-w-xl">
              <div className="p-3 rounded bg-imperial-900/80 border border-gold-500/20">
                <span className="block text-[10px] font-mono text-neutral-400 uppercase">Age (Derived)</span>
                <span className="text-base font-serif font-bold text-white">
                  {identity.computedAge} Years
                </span>
                <span className="block text-[9px] text-gold-400/80 font-mono">Born {identity.birthDateFormatted}</span>
              </div>

              <div className="p-3 rounded bg-imperial-900/80 border border-gold-500/20">
                <span className="block text-[10px] font-mono text-neutral-400 uppercase">Progression</span>
                <span className="text-base font-serif font-bold text-gold-300">
                  {identity.academicStatus.currentAcademicYear.split(' ')[0]}
                </span>
                <span className="block text-[9px] text-neutral-400 font-mono">B.Tech 2024–2028</span>
              </div>

              <div className="p-3 rounded bg-imperial-900/80 border border-gold-500/20 col-span-2 sm:col-span-1">
                <span className="block text-[10px] font-mono text-neutral-400 uppercase">Academic Minor</span>
                <span className="text-base font-serif font-bold text-white">
                  Cybersecurity
                </span>
                <span className="block text-[9px] text-emerald-400 font-mono">Robotics Research</span>
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

                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded bg-imperial-900 text-neutral-300 hover:text-gold-300 border border-gold-500/20 hover:border-gold-500/60 transition-all shadow-sm"
                  title="LinkedIn Network"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Bucephalus Scene */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <BucephalusCanvas />
          </div>
        </div>
      </div>
    </section>
  );
}
