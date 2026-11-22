'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toRoman } from '@/lib/roman';

export interface Honor { title: string; category: string; organization: string; dateLabel: string | null; award: string | null; description: string | null; proofUrl: string | null }

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/**
 * Honors rise through the clouds. One pinned stage; the camera climbs from honor to honor and holds at each.
 * With no honors yet it is a single living "coming soon" scene. Reduced motion or no WebGL: the list below the stage.
 */
export function HeavenStage({ honors }: { honors: Honor[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctl = useRef<{ setPos: (p: number) => void; setNarrow: (v: boolean) => void; dispose: () => void } | null>(null);
  const [raw, setRaw] = useState(0);
  const [still, setStill] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const n = honors.length;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(reduce);
    if (reduce) return;
    let cancelled = false;
    import('@/lib/three/heaven').then(({ createHeaven }) => {
      if (cancelled || !canvasRef.current) return;
      try { ctl.current = createHeaven({ canvas: canvasRef.current, count: n, narrow: window.innerWidth < 1024 }); } catch { /* no WebGL */ }
    });
    let raf = 0;
    const update = () => {
      raf = 0;
      const nw = window.innerWidth < 1024; setNarrow(nw); ctl.current?.setNarrow(nw);
      const el = outer.current; if (!el || n < 2) return;
      const r = el.getBoundingClientRect();
      const v = clamp(-r.top / ((r.height - window.innerHeight) || 1)) * (n - 1);
      const i0 = Math.floor(v);
      const pos = Math.min(n - 1, i0 + sm(0.55, 1, v - i0));
      setRaw(pos); ctl.current?.setPos(pos);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelled = true; window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); ctl.current?.dispose(); ctl.current = null; };
  }, [n]);

  if (still) return null;
  const active = n ? Math.min(n - 1, Math.round(raw)) : 0;
  const h = n ? honors[active] : null;

  return (
    <div ref={outer} style={{ height: n < 2 ? '100vh' : `${Math.min(n * 100, 500 + n * 45) + 60}vh` }} className="relative" aria-label="Honors">
      <div className={(n < 2 ? 'relative' : 'sticky top-0') + ' h-screen overflow-hidden bg-[#141c44]'}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
        <div className="relative h-full max-w-[88rem] mx-auto px-4 sm:px-8 pt-24 pb-8 flex items-end lg:items-center lg:justify-end">
          <div style={{ background: "rgba(10,13,42,0.94)" }} className="w-full lg:w-[42%] rounded-2xl backdrop-blur-md border border-amber-200/25 p-6 sm:p-8 shadow-[0_0_80px_rgba(255,214,120,0.18)]" key={active}>
            {h ? (
              <>
                <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-200">Honor {toRoman(active + 1)} of {toRoman(n)} · {h.category}</p>
                <h2 className="skdetail-title font-serif font-black text-white text-3xl sm:text-4xl mt-3 leading-tight">{h.title}</h2>
                <p className="mt-2 text-amber-200 font-mono text-sm">{h.organization}{h.dateLabel ? ` · ${h.dateLabel}` : ''}</p>
                {h.award && <p className="mt-4 inline-block px-3 py-1 rounded-full border border-amber-300/50 text-amber-100 text-sm font-mono">{h.award}</p>}
                {h.description && <p className="mt-4 text-neutral-100 leading-relaxed">{h.description}</p>}
                {h.proofUrl && <a href={h.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-5 sklink">View proof ↗</a>}
                {n > 1 && <p className="mt-6 text-xs font-mono text-amber-100/60">Scroll to keep climbing.</p>}
              </>
            ) : (
              <>
                <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-200">Achievements &amp; honors</p>
                <h2 className="font-serif font-black text-white text-4xl sm:text-5xl mt-3 leading-tight">Coming soon</h2>
                <p className="mt-4 text-neutral-100 leading-relaxed">Nothing is claimed here until it is real. When Taha adds an award, a ranking or an academic honor with proof, it will appear in this sky, one by one.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
