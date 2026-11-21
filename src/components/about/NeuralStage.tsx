'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const BEATS: { from: number; to: number; kicker?: string; line: string; big?: boolean }[] = [
  { from: 0.0, to: 0.16, kicker: 'About', line: 'Who is this guy?', big: true },
  { from: 0.16, to: 0.34, line: 'A B.Tech student of Computer Science (AI & ML) in Kolkata, with a minor in Cybersecurity.' },
  { from: 0.34, to: 0.52, line: 'Building agents. Simulating robots. Studying how machines learn.' },
  { from: 0.52, to: 0.7, line: 'Neural networks. Deep learning. Robotics. Agentic AI.' },
  { from: 0.7, to: 0.86, kicker: 'Remember the name', line: 'Taha Udaipurwala.', big: true },
  { from: 0.86, to: 1.01, line: 'I refuse to be average.' },
];

/**
 * Pinned opening for the About page: you fly through a neural network while the story types itself out.
 * Without WebGL, or with reduced motion, the same lines show as plain text.
 */
export function NeuralStage() {
  const outer = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctl = useRef<{ setProgress: (p: number) => void; dispose: () => void } | null>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(reduce);
    if (reduce) return;
    let cancelled = false;
    import('@/lib/three/neuralNet').then(({ createNeuralNet }) => {
      if (cancelled || !canvasRef.current) return;
      try { ctl.current = createNeuralNet({ canvas: canvasRef.current, reduceMotion: false }); } catch { /* no WebGL: text still works */ }
    });
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const v = clamp(-r.top / ((r.height - window.innerHeight) || 1));
      setP(v); ctl.current?.setProgress(v);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelled = true; window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); ctl.current?.dispose(); ctl.current = null; };
  }, []);

  if (still) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-20 space-y-6" aria-label="Who is this guy?">
        {BEATS.map((b) => <p key={b.line} className={b.big ? 'font-serif font-black text-4xl text-white' : 'text-lg text-neutral-300'}>{b.line}</p>)}
        <Link href="/contact" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gold-400 text-black font-bold">Let&apos;s connect <ArrowRight className="w-4 h-4" aria-hidden /></Link>
      </section>
    );
  }

  return (
    <div ref={outer} style={{ height: '620vh' }} className="relative" aria-label="Who is this guy?">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#07061a]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" aria-hidden />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(7,6,26,0.85)_100%)]" />
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center pointer-events-none">
          {BEATS.map((b, i) => {
            const t = (p - b.from) / (b.to - b.from);
            const o = sm(0, 0.22, t) * (1 - (i === BEATS.length - 1 ? 0 : sm(0.8, 1, t)));
            if (o <= 0.01) return null;
            const last = i === BEATS.length - 1;
            return (
              <div key={b.line} className="absolute max-w-4xl" style={{ opacity: o, transform: `translateY(${(1 - o) * 26}px) scale(${0.96 + o * 0.04})` }}>
                {b.kicker && <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-gold-400 mb-4">{b.kicker}</p>}
                <p className={(b.big ? 'font-serif font-black text-white text-[clamp(2.6rem,8vw,6.5rem)] leading-[0.95]' : 'font-serif font-bold text-white text-[clamp(1.5rem,3.6vw,2.8rem)] leading-tight') + ' drop-shadow-[0_0_30px_rgba(212,175,55,0.35)]'}>{b.line}</p>
                {last && (
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3 pointer-events-auto">
                    <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-gold-300 to-gold-500 text-black font-bold hover:scale-105 transition-transform">Let&apos;s connect <ArrowRight className="w-4 h-4" aria-hidden /></Link>
                    <Link href="/projects" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-gold-500/60 text-gold-200 font-semibold hover:bg-gold-500/10 transition-colors">See my work</Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div aria-hidden className="absolute bottom-6 left-1/2 -translate-x-1/2 w-40 h-[3px] rounded bg-white/10 overflow-hidden"><span className="block h-full bg-gold-400" style={{ width: `${p * 100}%` }} /></div>
        {p < 0.06 && <p aria-hidden className="absolute bottom-12 inset-x-0 text-center text-[11px] font-mono tracking-[0.3em] text-gold-300/80 animate-pulse">SCROLL</p>}
      </div>
    </div>
  );
}
