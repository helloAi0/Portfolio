'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { toRoman } from '@/lib/roman';

export interface GalaxyWorld {
  slug: string; name: string; description: string; subtracks: string[]; skills: string[]; projects: { slug: string; title: string }[];
}

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const HUES = [42, 268, 198, 332, 150, 22, 288, 56, 176, 350, 238, 98];

/**
 * Pinned scroll through a 3D galaxy: every engineering domain is a planet. Its moons are the projects filed under
 * it and its sparks are the skills logged in it. The ring holds still while you read, then the camera flies on.
 * Without WebGL or with reduced motion, the plain list below the stage carries the same information.
 */
export function DomainGalaxy({ worlds }: { worlds: GalaxyWorld[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctl = useRef<{ setPos: (p: number) => void; setNarrow: (v: boolean) => void; dispose: () => void } | null>(null);
  const [raw, setRaw] = useState(0);
  const [still, setStill] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const n = worlds.length;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(reduce);
    if (reduce || n === 0) return;
    let cancelled = false;
    import('@/lib/three/domainGalaxy').then(({ createDomainGalaxy }) => {
      if (cancelled || !canvasRef.current) return;
      try {
        ctl.current = createDomainGalaxy({
          canvas: canvasRef.current, narrow: window.innerWidth < 1024,
          domains: worlds.map((w, i) => ({ name: w.name, projects: w.projects.length, skills: w.skills.length, hue: HUES[i % HUES.length] })),
        });
      } catch { /* no WebGL: the text panel still works */ }
    });
    let raf = 0;
    const update = () => {
      raf = 0;
      ctl.current?.setNarrow(window.innerWidth < 1024); setNarrow(window.innerWidth < 1024);
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const v = clamp(-r.top / ((r.height - window.innerHeight) || 1)) * Math.max(0, n - 1);
      const i0 = Math.floor(v), f = v - i0;
      const pos = Math.min(n - 1, i0 + sm(0.55, 1, f));
      setRaw(pos); ctl.current?.setPos(pos);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelled = true; window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); ctl.current?.dispose(); ctl.current = null; };
  }, [n, worlds]);

  if (n === 0 || still) return null;
  const active = Math.min(n - 1, Math.round(raw));
  const w = worlds[active];

  return (
    <div ref={outer} style={{ height: `${n * 95 + 70}vh` }} className="relative" aria-label="Engineering domains">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#07061a]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" aria-hidden />
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: narrow ? 'linear-gradient(0deg, rgba(7,6,26,0.96) 0%, rgba(7,6,26,0.72) 42%, transparent 68%)' : 'linear-gradient(90deg, rgba(7,6,26,0.92) 0%, rgba(7,6,26,0.5) 40%, transparent 66%)' }} />

        <div className="relative h-full max-w-[90rem] mx-auto px-4 sm:px-8 pt-20 pb-5 flex flex-col justify-end lg:justify-center">
          <div className="max-w-xl">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">World {toRoman(active + 1)} of {toRoman(n)}</p>
            <h2 key={w.slug} className="skdetail-title font-serif font-black text-white text-[clamp(2rem,5vw,4.4rem)] leading-[0.98] mt-2">{w.name}</h2>
            <p className="mt-3 text-neutral-200 text-sm lg:text-base line-clamp-3 lg:line-clamp-none">{w.description}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 max-w-sm">
              <div className="skrow !py-2.5"><p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Moons · projects</p><p className="font-serif font-black text-white text-2xl">{w.projects.length}</p></div>
              <div className="skrow !py-2.5"><p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Sparks · skills</p><p className="font-serif font-black text-white text-2xl">{w.skills.length}</p></div>
            </div>

            {w.subtracks.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{w.subtracks.slice(0, 7).map((s) => <span key={s} className="exh-tag">{s}</span>)}</div>}
            {w.projects.length > 0 && (
              <ul className="mt-4 space-y-1 hidden sm:block">
                {w.projects.slice(0, 4).map((p) => <li key={p.slug}><Link href={`/projects/${p.slug}`} className="text-neutral-100 hover:text-gold-300 text-sm lg:text-base font-semibold">→ {p.title}</Link></li>)}
                {w.projects.length > 4 && <li className="text-xs font-mono text-neutral-400">+ {w.projects.length - 4} more</li>}
              </ul>
            )}
            <Link href={`/projects?category=${w.slug}`} className="exh-cta mt-5 mb-16 lg:mb-0 inline-flex">See {w.name} projects <ArrowRight className="w-4 h-4" aria-hidden /></Link>
          </div>
          <div aria-hidden className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-1.5">{worlds.map((x, i) => <span key={x.slug} className="exh-dot !w-[7px] !h-[7px]" style={i === active ? { height: 26, background: '#f3c969' } : undefined} />)}</div>
        </div>
      </div>
    </div>
  );
}
