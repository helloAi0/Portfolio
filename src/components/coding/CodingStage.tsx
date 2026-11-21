'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ProfilePortal } from './ProfilePortal';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const GLYPHS = ['{ }', '</>', '=>', 'O(n)', '01', '&&', '[ ]', 'λ', '∑', '#', '++', '!=', 'for', 'if', '::'];

export interface Platform { name: string; handle: string; href: string; glyph: string; blurb: string }

/**
 * Pinned scroll stage: a field of code glyphs drifts past in 3D while the two profile portals swing in one after
 * the other, then dock side by side. Each portal is a real link to the profile. Reduced motion: a plain pair.
 */
export function CodingStage({ platforms }: { platforms: [Platform, Platform] }) {
  const outer = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const meas = () => setNarrow(window.innerWidth < 860);
    meas();
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      setP(clamp(-r.top / ((r.height - window.innerHeight) || 1)));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); meas(); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, []);

  if (still) {
    return (
      <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto px-4 py-16">
        {platforms.map((pl) => <ProfilePortal key={pl.name} {...pl} />)}
      </div>
    );
  }

  const e1 = sm(0.06, 0.3, p), e2 = sm(0.36, 0.6, p), s1 = e2, d = sm(0.68, 0.88, p);
  const unit = narrow ? 'vh' : 'vw';
  const slab = (i: 0 | 1) => {
    if (i === 0) {
      const x = narrow ? 0 : -34 * s1 + 9 * d;
      const y = narrow ? -34 * s1 + 11 * d : 0;
      const sc = narrow ? 0.9 - 0.3 * s1 + 0.12 * d : 1 - 0.4 * s1 + 0.28 * d;
      const op = e1 * (1 - 0.5 * s1 + 0.5 * d);
      return { t: `translate3d(${x}${unit}, ${narrow ? y : 0}vh, ${lerp(-900, 0, e1)}px) rotateY(${lerp(-80, 0, e1) + 18 * s1 * (1 - d)}deg) scale(${sc})`, op };
    }
    const x = narrow ? 0 : 25 * d;
    const y = narrow ? 22 * d : 0;
    const sc = narrow ? 0.9 - 0.18 * d : 1 - 0.12 * d;
    const op = e2;
    return { t: `translate3d(${x}${unit}, ${narrow ? y : 0}vh, ${lerp(-900, 0, e2)}px) rotateY(${lerp(80, 0, e2) - 14 * d}deg) scale(${sc})`, op };
  };
  const a = slab(0), b = slab(1);
  const title = 1 - sm(0.04, 0.2, p);

  return (
    <div ref={outer} style={{ height: '520vh' }} className="relative" aria-label="My coding profiles">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(212,175,55,0.15),transparent_62%)]" />

        {/* drifting code glyphs in real depth */}
        <div aria-hidden className="absolute inset-0" style={{ perspective: '900px' }}>
          {GLYPHS.concat(GLYPHS).map((g, i) => {
            const z = -1100 + ((i * 197) % 1300);
            const x = ((i * 53) % 100);
            const y = ((i * 37) % 100);
            return (
              <span key={i} className="cglyph" style={{ left: `${x}%`, top: `${y}%`, transform: `translate3d(0, ${-p * (260 + (z + 1100) * 0.35)}px, ${z}px) rotateZ(${p * (i % 2 ? 90 : -90)}deg)`, opacity: 0.12 + ((z + 1100) / 1300) * 0.35 }}>{g}</span>
            );
          })}
        </div>

        {/* title */}
        <div className="absolute inset-x-0 top-[22vh] text-center px-4" style={{ opacity: title, transform: `translateY(${-(1 - title) * 40}px) scale(${1 + (1 - title) * 0.2})`, pointerEvents: 'none' }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400">Coding Arena</p>
          <h1 className="font-serif font-black text-white leading-[0.95] text-[clamp(2.6rem,8vw,6.5rem)] mt-4">Where I practise.</h1>
          <p className="mt-4 text-neutral-300">Scroll. Two doors open onto my real profiles.</p>
        </div>

        {/* the two portals */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '1400px' }}>
          <div className="absolute" style={{ width: 'min(440px, 86vw)', transform: a.t, opacity: a.op, pointerEvents: a.op > 0.6 ? 'auto' : 'none', willChange: 'transform, opacity' }}>
            <ProfilePortal {...platforms[0]} />
          </div>
          <div className="absolute" style={{ width: 'min(440px, 86vw)', transform: b.t, opacity: b.op, pointerEvents: b.op > 0.6 ? 'auto' : 'none', willChange: 'transform, opacity' }}>
            <ProfilePortal {...platforms[1]} />
          </div>
        </div>

        {/* progress */}
        <div aria-hidden className="absolute bottom-6 left-1/2 -translate-x-1/2 w-40 h-[3px] rounded bg-white/10 overflow-hidden"><span className="block h-full bg-gold-400" style={{ width: `${p * 100}%` }} /></div>
      </div>
    </div>
  );
}
