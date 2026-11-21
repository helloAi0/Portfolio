'use client';

import React, { useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';

/** A 3D portal that opens the owner's public profile on the platform itself. No stats are shown here. */
export function ProfilePortal({ name, handle, href, glyph, blurb }: { name: string; handle: string; href: string; glyph: string; blurb: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${x * 22}deg`); el.style.setProperty('--rx', `${-y * 18}deg`);
  };
  const leave = () => { const el = ref.current; if (el) { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); } };
  return (
    <a ref={ref} href={href} target="_blank" rel="noopener noreferrer" onPointerMove={move} onPointerLeave={leave} className="portal group" aria-label={`Open Taha's ${name} profile in a new tab`}>
      <div className="portal-wrap" aria-hidden>
        <div className="portal-stage">
          <span className="portal-ring r1" /><span className="portal-ring r2" /><span className="portal-ring r3" />
          {[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className="portal-spark" style={{ ['--a' as string]: `${i * 60}deg`, animationDelay: `${i * -0.8}s` }} />)}
        </div>
        <span className="portal-disc"><span className="portal-glyph">{glyph}</span></span>
      </div>
      <div className="portal-info">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold-400">Open profile</p>
        <h3 className="font-serif font-black text-3xl sm:text-4xl text-white mt-2">{name}</h3>
        <p className="font-mono text-xs text-neutral-400 mt-1">@{handle}</p>
        <p className="text-sm text-neutral-300 mt-4 max-w-xs">{blurb}</p>
        <span className="portal-go">Visit my profile <ArrowUpRight className="w-4 h-4" aria-hidden /></span>
      </div>
    </a>
  );
}
