'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface ColSkill { id: string; name: string; label: string; steps: number; note: string | null; links: { label: string; href: string }[] }
export interface ColDomain { name: string; skills: ColSkill[] }

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));

export function toRoman(num: number): string {
  if (num <= 0) return '0';
  const map: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let n = num, out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

/**
 * Pinned 3D stage. Domains stand as marble columns on a ring; scrolling turns the ring, and the domain facing
 * you opens its skills on the right. Reduced motion: the stage is skipped (the full ledger below shows everything).
 */
export function SkillColosseum({ domains }: { domains: ColDomain[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  const [still, setStill] = useState(false);
  const n = domains.length;

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      setPos(clamp(-r.top / ((r.height - window.innerHeight) || 1)) * Math.max(0, n - 1));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, [n]);

  if (n === 0 || still) return null;
  const step = 360 / Math.max(n, 3);
  const R = Math.max(360, 135 / Math.tan(Math.PI / Math.max(n, 3)));
  const active = Math.round(pos);
  const dom = domains[active];

  return (
    <div ref={outer} style={{ height: `${n * 75 + 110}vh` }} className="relative" aria-label="Skill domains">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_60%,rgba(212,175,55,0.14),transparent_60%)]" />
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 grid lg:grid-cols-[1.15fr,1fr] gap-4 items-center">
          {/* ring */}
          <div className="relative h-[44vh] lg:h-[74vh]" style={{ perspective: '1500px' }} aria-hidden>
            <div className="absolute left-1/2 top-1/2" style={{ transformStyle: 'preserve-3d', transform: `translate(-50%,-50%) translateZ(-${R}px) rotateX(-9deg) rotateY(${-pos * step}deg)`, transition: 'transform .12s linear' }}>
              {domains.map((d, i) => {
                const near = Math.abs(i - pos);
                const on = near < 0.5;
                return (
                  <div key={d.name} className="skcol" data-on={on ? '1' : '0'} style={{ transform: `rotateY(${i * step}deg) translateZ(${R}px)` }}>
                    <span className="skcol-cap" />
                    <p className="skcol-num">{toRoman(d.skills.length)}</p>
                    <h3 className="skcol-name">{d.name}</h3>
                    <ul className="skcol-list">{d.skills.slice(0, 4).map((s) => <li key={s.id}>{s.name}</li>)}{d.skills.length > 4 && <li className="more">+ {d.skills.length - 4} more</li>}</ul>
                    <span className="skcol-base" />
                  </div>
                );
              })}
            </div>
            <div className="skfloor" />
          </div>

          {/* detail */}
          <div className="relative z-10">
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400">Domain {toRoman(active + 1)} of {toRoman(n)}</p>
            <h2 key={dom.name} className="skdetail-title font-serif font-black text-white text-3xl sm:text-5xl mt-2">{dom.name}</h2>
            <ul className="mt-5 space-y-2.5 max-h-[34vh] lg:max-h-[48vh] overflow-y-auto pr-2">
              {dom.skills.map((s) => (
                <li key={s.id} className="skrow">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-serif font-bold text-white">{s.name}</span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-gold-300 shrink-0">{s.label}</span>
                  </div>
                  {s.steps > 0 && <div className="flex gap-1 mt-1.5">{[1, 2, 3, 4].map((k) => <span key={k} className={'h-1 flex-1 rounded-full ' + (k <= s.steps ? 'bg-gold-400' : 'bg-white/10')} />)}</div>}
                  {s.links.length > 0 && <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono">{s.links.slice(0, 3).map((l) => <a key={l.href} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-gold-300 hover:underline">{l.label} ↗</a>)}</p>}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[10px] font-mono text-neutral-500">Scroll to turn the ring.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
