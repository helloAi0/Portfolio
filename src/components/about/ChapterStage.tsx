'use client';

import React, { useEffect, useRef, useState } from 'react';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export interface Chapter { key: string; question: string; answer: readonly string[] }

/**
 * Pinned chapter stage. As you scroll, a 3D gold armillary turns behind a glass slab; each chapter's slab
 * swings in on its hinge, its lines reveal one by one, then it swings away. Reduced motion: a plain stack.
 */
export function ChapterStage({ chapters }: { chapters: readonly Chapter[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      setP(clamp(-r.top / ((r.height - window.innerHeight) || 1)));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const n = chapters.length;

  if (still) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-14" aria-label="About me, in five questions">
        {chapters.map((c, i) => (
          <div key={c.key}><p className="text-gold-400 font-mono text-xs">Chapter {i + 1}</p><h3 className="text-3xl font-serif font-black text-white mt-1">{c.question}</h3>
            <div className="mt-4 space-y-3 text-neutral-300">{c.answer.map((a) => <p key={a.slice(0, 20)}>{a}</p>)}</div></div>
        ))}
      </section>
    );
  }

  const pos = p * n; // 0..n
  return (
    <div ref={outer} style={{ height: `${n * 130 + 40}vh` }} className="relative" aria-label="About me, in five questions">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(212,175,55,0.12),transparent_62%)]" />

        {/* 3D armillary behind everything */}
        <div aria-hidden className="absolute inset-0 flex items-center justify-center" style={{ perspective: '1200px' }}>
          <div className="relative" style={{ width: 'min(90vw, 90vh)', height: 'min(90vw, 90vh)', transformStyle: 'preserve-3d', transform: `rotateX(${60 - p * 40}deg) rotateZ(${p * 300}deg)` }}>
            {[1, 0.78, 0.56].map((s, i) => (
              <span key={i} className="absolute inset-0 m-auto rounded-full border" style={{ width: `${s * 100}%`, height: `${s * 100}%`, borderColor: `rgba(224,181,80,${0.35 - i * 0.08})`, transform: `rotateY(${i * 28}deg) rotateX(${i * 16}deg)`, boxShadow: '0 0 40px rgba(224,181,80,.08)' }}>
                <span className="absolute -top-1.5 left-1/2 w-3 h-3 rounded-full bg-gold-300 shadow-[0_0_18px_6px_rgba(243,201,105,.6)]" />
              </span>
            ))}
          </div>
        </div>

        {/* giant chapter numeral */}
        <span aria-hidden className="absolute font-serif font-black text-gold-500/[0.06] leading-none select-none" style={{ fontSize: 'clamp(14rem, 42vw, 40rem)', transform: `translateY(${(0.5 - (pos % 1)) * 60}px)` }}>
          {String(Math.min(n, Math.floor(pos) + 1)).padStart(2, '0')}
        </span>

        {/* slabs */}
        <div className="relative w-full max-w-4xl px-4 sm:px-8" style={{ perspective: '1600px' }}>
          {chapters.map((c, i) => {
            const f = pos - i - 0.5;              // -0.5..0.5 while this chapter is the active one
            const enter = smooth(-0.5, -0.28, f); // 0..1
            const leave = smooth(0.28, 0.5, f);   // 0..1
            const vis = enter * (1 - leave);
            const rot = (1 - enter) * 42 - leave * 42;
            const lines = c.answer.length + 1;
            return (
              <div key={c.key} className="absolute inset-x-0 top-1/2" style={{ opacity: vis, transform: `translateY(-50%) translateZ(${(1 - vis) * -240}px) rotateY(${rot}deg)`, transformOrigin: rot > 0 ? '0% 50%' : '100% 50%', pointerEvents: vis > 0.5 ? 'auto' : 'none' }} aria-hidden={vis < 0.5}>
                <div className="marble-card rounded-2xl p-7 sm:p-12 border border-gold-500/25 shadow-[0_30px_120px_rgba(0,0,0,.6),0_0_60px_rgba(212,175,55,.08)]">
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mb-4">Chapter {i + 1} of {n}</p>
                  <h3 className="font-serif font-black text-white text-2xl sm:text-5xl leading-[1.05] mb-6">{c.question}</h3>
                  <div className="space-y-4 text-neutral-300 text-sm sm:text-lg leading-relaxed">
                    {c.answer.map((a, k) => {
                      const t = smooth(-0.3 + (k / lines) * 0.45, -0.2 + ((k + 1) / lines) * 0.45, f);
                      return <p key={a.slice(0, 24)} style={{ opacity: 0.15 + t * 0.85, transform: `translateY(${(1 - t) * 16}px)` }}>{a}</p>;
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ height: 'min(70vh, 560px)' }} />
        </div>

        {/* progress rail */}
        <div aria-hidden className="absolute left-4 sm:left-10 top-1/2 -translate-y-1/2 flex flex-col gap-3">
          {chapters.map((c, i) => (
            <span key={c.key} className="flex items-center gap-3">
              <span className="h-px transition-all duration-500" style={{ width: Math.floor(pos) === i ? 36 : 14, background: Math.floor(pos) === i ? '#f3c969' : 'rgba(255,255,255,.2)' }} />
              <span className="hidden sm:inline text-[10px] font-mono text-gold-300" style={{ opacity: Math.floor(pos) === i ? 1 : 0.3 }}>{String(i + 1).padStart(2, '0')}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
