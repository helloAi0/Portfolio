'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toRoman } from '@/lib/roman';

export interface ColSkill { id: string; name: string; label: string; steps: number; note: string | null; links: { label: string; href: string }[] }
export interface ColDomain { name: string; skills: ColSkill[] }

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/**
 * Pinned 3D stage, built to be read. Domains stand as marble columns on a ring. Each domain gets a full screen of
 * scrolling: the ring holds still while you read, then turns to the next. The facing domain opens its skills as large
 * tiles with the level, the self-rating and clickable evidence. Reduced motion: skipped (the full ledger shows all).
 */
export function SkillColosseum({ domains }: { domains: ColDomain[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const [raw, setRaw] = useState(0);
  const [still, setStill] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const n = domains.length;

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let raf = 0;
    const update = () => {
      raf = 0;
      setNarrow(window.innerWidth < 1024);
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      setRaw(clamp(-r.top / ((r.height - window.innerHeight) || 1)) * Math.max(0, n - 1));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, [n]);

  if (n === 0 || still) return null;

  // hold still for the first 55% of each step, then turn
  const i0 = Math.floor(raw), f = raw - i0;
  const pos = Math.min(n - 1, i0 + sm(0.55, 1, f));
  const active = Math.round(pos);
  const dom = domains[active];
  const cw = narrow ? 180 : 300, ch = narrow ? 190 : 390;
  const step = 360 / Math.max(n, 3);
  const R = Math.max(cw * 1.2, (cw / 2 + 36) / Math.tan(Math.PI / Math.max(n, 3)));
  const cap = narrow ? 4 : 8;
  const shown = dom.skills.slice(0, cap);

  return (
    <div ref={outer} style={{ height: `${n * 100 + 60}vh` }} className="relative" aria-label="Skill domains">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_55%,rgba(212,175,55,0.16),transparent_60%)]" />
        <div aria-hidden className="skmotes">{Array.from({ length: 24 }).map((_, i) => <i key={i} style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 8) * -1.7}s`, animationDuration: `${9 + (i % 5) * 2}s` }} />)}</div>

        <div className="relative h-full max-w-[88rem] mx-auto px-4 sm:px-8 pt-24 pb-6 grid lg:grid-cols-[0.85fr,1.25fr] gap-2 lg:gap-8 items-center">
          {/* ring */}
          <div className="relative h-[30vh] lg:h-[72vh] overflow-hidden" style={{ perspective: '1900px', maskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)' }} aria-hidden>
            <div className="absolute left-1/2 top-1/2" style={{ transformStyle: 'preserve-3d', transform: `translate(-50%,-50%) translateZ(-${R}px) rotateX(-6deg) rotateY(${-pos * step}deg)` }}>
              {domains.map((d, i) => {
                const on = i === active;
                return (
                  <div key={d.name} className="skcol" data-on={on ? '1' : '0'} style={{ width: cw, height: ch, left: -cw / 2, top: -ch / 2, transform: `rotateY(${i * step}deg) translateZ(${R}px)` }}>
                    <span className="skcol-cap" />
                    <p className="skcol-num">{toRoman(i + 1)}</p>
                    <h3 className="skcol-name">{d.name}</h3>
                    <p className="skcol-count">{d.skills.length} skill{d.skills.length === 1 ? '' : 's'}</p>
                    <ul className="skcol-list">{d.skills.slice(0, narrow ? 0 : 5).map((s) => <li key={s.id}>{s.name}</li>)}</ul>
                    <span className="skcol-base" />
                  </div>
                );
              })}
            </div>
            <div className="skfloor" />
          </div>

          {/* detail */}
          <div className="relative z-10 min-w-0">
            <div className="skrail" aria-hidden>{domains.map((d, i) => <span key={d.name} data-on={i === active ? '1' : '0'}>{toRoman(i + 1)}</span>)}</div>
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Domain {toRoman(active + 1)} of {toRoman(n)} · {dom.skills.length} skill{dom.skills.length === 1 ? '' : 's'}</p>
            <h2 key={dom.name} className="skdetail-title font-serif font-black text-white text-4xl sm:text-6xl mt-2 leading-none">{dom.name}</h2>
            <ul className="mt-5 lg:mt-7 grid sm:grid-cols-2 gap-3">
              {shown.map((s) => (
                <li key={s.id} className="skrow">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-serif font-bold text-white text-lg lg:text-xl leading-tight">{s.name}</span>
                    <span className="sklabel">{s.label}</span>
                  </div>
                  {s.steps > 0 && <div className="flex gap-1.5 mt-2.5" aria-label={`Self-rated ${s.steps} of 4`}>{[1, 2, 3, 4].map((k) => <span key={k} className={'h-1.5 flex-1 rounded-full ' + (k <= s.steps ? 'bg-gold-400' : 'bg-white/10')} />)}</div>}
                  {s.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.links.slice(0, 2).map((l) => (
                        <a key={l.href} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="sklink">{l.label} ↗</a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {dom.skills.length > cap && <a href="#ledger" className="inline-block mt-4 text-sm font-mono text-gold-300 hover:underline">+ {dom.skills.length - cap} more in the full ledger below ↓</a>}
            <p className="mt-5 text-xs font-mono text-neutral-500">Keep scrolling to turn the ring to the next domain.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
