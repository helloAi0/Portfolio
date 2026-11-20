'use client';

import React, { useEffect, useRef, useState } from 'react';

const CHAPTERS = [
  { n: '01', title: 'Agentic AI', text: 'End-to-end web applications powered by autonomous AI agents and custom chatbots, built so they answer only from what is true.' },
  { n: '02', title: 'Full-stack', text: 'From the database to the 3D interface: platforms designed from the ground up. This portfolio is one of them.' },
  { n: '03', title: 'Robotics simulation', text: 'High-fidelity physics simulation in Gazebo and NVIDIA Isaac Sim, with ROS 2 and SLAM as the next layers.' },
  { n: '04', title: 'Cybersecurity', text: 'My minor, and a habit: security is part of how every system is designed, not an afterthought.' },
] as const;

/**
 * Pinned scroll story. The section is 400vh tall; a sticky stage keeps a 3D prism turning to the
 * next face as you scroll while the chapter text changes. Falls back to a normal stack for reduced motion.
 */
export function PinnedStory() {
  const outer = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = outer.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(Math.max(0, Math.min(1, -r.top / (total || 1))));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, []);

  if (still) {
    return (
      <section className="py-20 px-4 max-w-4xl mx-auto space-y-10" aria-label="What I work on">
        {CHAPTERS.map((c) => (
          <div key={c.n}><p className="text-gold-400 font-mono text-xs">{c.n}</p><h3 className="text-3xl font-serif font-black text-white">{c.title}</h3><p className="text-neutral-300 mt-2">{c.text}</p></div>
        ))}
      </section>
    );
  }

  const face = p * (CHAPTERS.length - 1);
  const idx = Math.min(CHAPTERS.length - 1, Math.round(face));
  const angle = -face * 90;

  return (
    <div ref={outer} style={{ height: '400vh' }} className="relative" aria-label="What I work on">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(212,175,55,0.14),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-8 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mb-6">Chapter II · What I work on · {String(idx + 1).padStart(2, '0')} / {String(CHAPTERS.length).padStart(2, '0')}</p>
            <div className="relative min-h-[260px]">
              {CHAPTERS.map((c, i) => (
                <div key={c.n} className="absolute inset-0 transition-all duration-500 ease-out" style={{ opacity: i === idx ? 1 : 0, transform: `translateY(${i === idx ? 0 : i < idx ? -40 : 40}px)`, pointerEvents: i === idx ? 'auto' : 'none' }} aria-hidden={i !== idx}>
                  <h2 className="font-serif font-black text-white leading-[0.95] text-5xl sm:text-7xl">{c.title}</h2>
                  <p className="mt-6 max-w-md text-neutral-300 text-sm sm:text-base leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-2" aria-hidden>
              {CHAPTERS.map((c, i) => <span key={c.n} className={'h-1 rounded-full transition-all duration-500 ' + (i === idx ? 'w-12 bg-gold-400' : 'w-5 bg-white/15')} />)}
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center" style={{ perspective: '1100px' }} aria-hidden>
            <div className="relative w-[300px] h-[300px]" style={{ transformStyle: 'preserve-3d', transform: `rotateX(-12deg) rotateY(${angle}deg)`, transition: 'transform 120ms linear' }}>
              {CHAPTERS.map((c, i) => (
                <div key={c.n} className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-gold-500/40 bg-gradient-to-br from-imperial-800/90 to-imperial-950/95 shadow-[0_0_60px_rgba(212,175,55,0.15)]"
                  style={{ transform: `rotateY(${i * 90}deg) translateZ(150px)`, backfaceVisibility: 'hidden' }}>
                  <span className="font-serif font-black text-[7rem] leading-none text-gold-400/25">{c.n}</span>
                  <span className="font-mono text-xs uppercase tracking-[0.25em] text-gold-300 mt-2">{c.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
