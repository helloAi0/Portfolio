'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface RoadItem { kind: string; title: string; detail?: string; href?: string; external?: boolean; dateLabel: string; shortDate: string; future: boolean }

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const KIND_HEX: Record<string, string> = { Education: '#f3c969', Project: '#4fd8ff', Certificate: '#b79cff', Achievement: '#7dffb0', Post: '#ff8fb8', Target: '#ffffff' };

/**
 * Pinned scroll: a lantern walks a road across a topographic night landscape, one real record per cairn, oldest
 * first. The walker holds at each cairn while you read, then moves on. Reduced motion or no WebGL: the full list
 * below carries every record.
 */
export function RoadStage({ items }: { items: RoadItem[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctl = useRef<{ setPos: (p: number) => void; setNarrow: (v: boolean) => void; dispose: () => void } | null>(null);
  const [raw, setRaw] = useState(0);
  const [still, setStill] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const n = items.length;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(reduce);
    if (reduce || n === 0) return;
    let cancelled = false;
    import('@/lib/three/journeyRoad').then(({ createJourneyRoad }) => {
      if (cancelled || !canvasRef.current) return;
      try { ctl.current = createJourneyRoad({ canvas: canvasRef.current, narrow: window.innerWidth < 1024, events: items.map((it) => ({ kind: it.kind, label: it.shortDate, future: it.future })) }); } catch { /* no WebGL: the list below still works */ }
    });
    let raf = 0;
    const update = () => {
      raf = 0;
      const nw = window.innerWidth < 1024; setNarrow(nw); ctl.current?.setNarrow(nw);
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const v = clamp(-r.top / ((r.height - window.innerHeight) || 1)) * Math.max(0, n - 1);
      const i0 = Math.floor(v);
      const pos = Math.min(n - 1, i0 + sm(0.4, 1, v - i0));
      setRaw(pos); ctl.current?.setPos(pos);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelled = true; window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); ctl.current?.dispose(); ctl.current = null; };
  }, [n, items]);

  if (n === 0 || still) return null;
  const active = Math.min(n - 1, Math.round(raw));
  const it = items[active];
  const col = KIND_HEX[it.kind] || '#f3c969';

  return (
    <div ref={outer} style={{ height: `${Math.min(n * 60, 700 + n * 22) + 100}vh` }} className="relative" aria-label="Journey road">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#05060d]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: narrow ? 'linear-gradient(0deg, rgba(5,6,13,0.97) 0%, rgba(5,6,13,0.82) 40%, transparent 64%)' : 'linear-gradient(90deg, rgba(5,6,13,0.95) 0%, rgba(5,6,13,0.78) 34%, transparent 58%)' }} />
        <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#05060d] to-transparent pointer-events-none" />
        <div className="relative h-full max-w-[88rem] mx-auto px-4 sm:px-8 pt-24 pb-8 flex items-end lg:items-center">
          <div className="relative z-10 w-full lg:w-[40%]" key={active}>
            <p className="text-xs font-mono uppercase tracking-[0.3em]" style={{ color: col }}>{it.kind} · {active + 1} of {n}</p>
            <p className="road-date font-serif font-black leading-none mt-3 text-5xl sm:text-7xl" style={{ WebkitTextStroke: `1.5px ${col}`, color: 'transparent' }}>{it.dateLabel}</p>
            <h2 className="skdetail-title font-serif font-bold text-white text-2xl sm:text-4xl mt-4 leading-tight">{it.title}</h2>
            {it.detail && <p className="mt-3 text-neutral-300 leading-relaxed text-sm sm:text-base">{it.detail}</p>}
            {it.href && (it.external
              ? <a href={it.href} target="_blank" rel="noopener noreferrer" className="inline-block mt-5 sklink" style={{ borderColor: col }}>View original post ↗</a>
              : <a href={it.href} className="inline-block mt-5 sklink">View details →</a>)}
            <div className="mt-7 flex items-center gap-[3px]" aria-hidden>
              {items.slice(0, 80).map((x, i) => <span key={i} className="h-3 rounded-sm" style={{ width: 3, background: i === active ? col : i < active ? 'rgba(243,201,105,.55)' : 'rgba(255,255,255,.16)' }} />)}
            </div>
            <p className="mt-3 text-xs font-mono text-neutral-500">Scroll to keep walking. Oldest record first; the dashed road is what is still ahead.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
