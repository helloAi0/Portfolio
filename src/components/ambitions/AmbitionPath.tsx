'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toRoman } from '@/lib/roman';

export interface PathGoal { horizon: string; title: string; description: string; focus: string[] }

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/**
 * Pinned 3D stage: a tower that builds as you scroll, with a path winding up it. One landing pad per goal; the
 * marker climbs from pad to pad and holds still on each so the goal can be read. Goals are stated as intentions.
 * Reduced motion or no WebGL: the plain list on the page carries the same goals.
 */
export function AmbitionPath({ goals }: { goals: PathGoal[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctl = useRef<{ setPos: (p: number) => void; setNarrow: (v: boolean) => void; dispose: () => void } | null>(null);
  const [raw, setRaw] = useState(0);
  const [still, setStill] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const n = goals.length;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(reduce);
    if (reduce || n === 0) return;
    let cancelled = false;
    import('@/lib/three/ambitionPath').then(({ createAmbitionPath }) => {
      if (cancelled || !canvasRef.current) return;
      try { ctl.current = createAmbitionPath({ canvas: canvasRef.current, narrow: window.innerWidth < 1024, milestones: goals.map((g) => ({ label: g.horizon })) }); } catch { /* no WebGL: the list below still works */ }
    });
    let raf = 0;
    const update = () => {
      raf = 0;
      const nw = window.innerWidth < 1024; setNarrow(nw); ctl.current?.setNarrow(nw);
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const v = clamp(-r.top / ((r.height - window.innerHeight) || 1)) * Math.max(0, n - 1);
      const i0 = Math.floor(v);
      const pos = Math.min(n - 1, i0 + sm(0.55, 1, v - i0));
      setRaw(pos); ctl.current?.setPos(pos);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelled = true; window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); ctl.current?.dispose(); ctl.current = null; };
  }, [n, goals]);

  if (n === 0 || still) return null;
  const active = Math.min(n - 1, Math.round(raw));
  const g = goals[active];

  return (
    <div ref={outer} style={{ height: `${Math.max(2, n) * 110 + 60}vh` }} className="relative" aria-label="Goal path">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#07060f]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: narrow ? 'linear-gradient(0deg, rgba(7,6,15,0.97) 0%, rgba(7,6,15,0.8) 45%, transparent 68%)' : 'linear-gradient(270deg, rgba(7,6,15,0.95) 0%, rgba(7,6,15,0.7) 38%, transparent 62%)' }} />
        <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#07060f] to-transparent pointer-events-none" />
        <div className="relative h-full max-w-[88rem] mx-auto px-4 sm:px-8 pt-24 pb-8 flex lg:justify-end items-end lg:items-center">
          <div className="relative z-10 w-full lg:w-[44%]">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Stage {toRoman(active + 1)} of {toRoman(n)} · {g.horizon}</p>
            <h2 key={g.title} className="skdetail-title font-serif font-black text-white text-3xl sm:text-5xl mt-2 leading-[1.05]">{g.title}</h2>
            <p className="mt-4 text-neutral-200 leading-relaxed text-base lg:text-lg">{g.description}</p>
            {g.focus.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{g.focus.map((f) => <span key={f} className="px-3 py-1 rounded-full border border-gold-500/40 bg-black/40 text-xs font-mono text-gold-300">{f}</span>)}</div>}
            <div className="mt-6 flex items-center gap-1.5" aria-hidden>{goals.map((_, i) => <span key={i} className={'h-1 rounded-full transition-all ' + (i === active ? 'w-10 bg-gold-400' : i < active ? 'w-5 bg-gold-500/60' : 'w-5 bg-white/15')} />)}</div>
            <p className="mt-4 text-xs font-mono text-neutral-500">These are goals and intentions, not completed achievements.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
