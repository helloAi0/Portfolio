import React from 'react';
import Link from 'next/link';
import { resolveIdentitySafety } from '@/lib/identity';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Brain, Bot, ShieldCheck, ArrowUpRight, Sparkles, FileCheck2 } from 'lucide-react';

const tile = 'reveal spot bento-tile marble-card p-6 sm:p-8 overflow-hidden relative';

function Ring({ percent }: { percent: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32 sm:w-40 sm:h-40 -rotate-90" aria-hidden>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="6" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="url(#ringGold)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      <defs>
        <linearGradient id="ringGold" x1="0" x2="1">
          <stop offset="0" stopColor="#b89025" /><stop offset="1" stopColor="#f3eacf" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Bento layout: one live "now" tile (derived from today's date), plus focus areas and principles. */
export function BentoGrid() {
  const id = resolveIdentitySafety();
  const a = id.academicStatus;
  const done = a.phase === 'COMPLETED';
  const sem = a.semesterLabel.split(' ')[1];

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="At a glance"
          title="Engineering with evidence"
          description="Learning AI, robotics and security by building things that run. Everything here is backed by a record, or left out."
        />

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 sm:gap-5 auto-rows-[minmax(190px,auto)]">
          {/* Live academic tile */}
          <div className={`${tile} md:col-span-3 md:row-span-2 flex flex-col justify-between`}>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold-400">Live · updates with today&apos;s date</span>
              <h3 className="mt-3 text-xl font-serif font-bold text-white">Academic journey</h3>
            </div>
            <div className="flex items-center gap-6 sm:gap-10 my-6">
              <div className="relative shrink-0">
                <Ring percent={a.semesterProgressPercent} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="display-xl text-4xl sm:text-5xl text-gold-300">{done ? '8' : sem}</span>
                  <span className="text-[10px] font-mono uppercase text-neutral-400">of 8 semesters</span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-neutral-300">
                <p className="text-white font-semibold">{done ? 'Programme completed' : `${a.currentAcademicYear}, ${a.semesterLabel}`}</p>
                <p>B.Tech CSE (AI &amp; ML) · {a.enrollmentYear}–{a.expectedGraduationYear}</p>
                {!done && <p className="text-neutral-400">About {a.monthsToGraduation} months to graduation</p>}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-1.5"><span>Degree progress</span><span className="text-gold-300">{a.progressPercent}%</span></div>
              <div className="h-1.5 rounded-full bg-imperial-950 border border-gold-500/20 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-gold-600 to-gold-300" style={{ width: `${a.progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Focus areas */}
          {[
            { icon: <Brain className="w-6 h-6" />, title: 'AI & Machine Learning', text: 'B.Tech specialization. Learning by building.' },
            { icon: <Bot className="w-6 h-6" />, title: 'Robotics', text: 'Learning ROS 2, SLAM and autonomous navigation.' },
          ].map((t) => (
            <div key={t.title} className={`${tile} md:col-span-3 flex flex-col justify-between gap-6`}>
              <span className="text-gold-400">{t.icon}</span>
              <div>
                <h3 className="font-serif font-bold text-lg text-white mb-1">{t.title}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">{t.text}</p>
              </div>
            </div>
          ))}

          <div className={`${tile} md:col-span-2 flex flex-col justify-between gap-6`}>
            <span className="text-gold-400"><ShieldCheck className="w-6 h-6" /></span>
            <div>
              <h3 className="font-serif font-bold text-lg text-white mb-1">Cybersecurity minor</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">Security is part of how I design, not an afterthought.</p>
            </div>
          </div>

          <div className={`${tile} md:col-span-2 flex flex-col justify-between`}>
            <span className="text-gold-400"><FileCheck2 className="w-6 h-6" /></span>
            <div>
              <h3 className="font-serif font-bold text-lg text-white mb-2">Languages</h3>
              <div className="flex flex-wrap gap-1.5">
                {['C', 'C++', 'Python', 'Java', 'JavaScript', 'HTML', 'CSS'].map((l) => (
                  <span key={l} className="px-2.5 py-1 rounded-full border border-gold-500/25 bg-imperial-900/70 text-[11px] font-mono text-neutral-200">{l}</span>
                ))}
              </div>
            </div>
          </div>

          <Link href="/skills" className={`${tile} md:col-span-2 group flex flex-col justify-between hover:border-gold-400/50`}>
            <div className="flex items-start justify-between">
              <span className="text-gold-400"><Sparkles className="w-6 h-6" /></span>
              <ArrowUpRight className="w-5 h-5 text-neutral-500 group-hover:text-gold-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" aria-hidden />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white mb-1">Skills, with evidence</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">What I use, what I&apos;m learning, and what code merely detects, kept separate.</p>
            </div>
          </Link>

        </div>
      </div>
    </section>
  );
}
