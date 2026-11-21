/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Github, ExternalLink } from 'lucide-react';
import { ProjectArt } from './ProjectArt';

export interface Exhibit {
  slug: string; title: string; tagline: string; domain: string; domainSlug: string; difficulty: string; status: string;
  tags: string[]; github: string | null; live: string | null; cover: string | null; stars: number;
}

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Pinned 3D gallery. Every project is a framed exhibit standing in a deep hall. Scrolling walks the camera down
 * the hall: the exhibit in front holds still while you read its placard, then flies past and the next one
 * rises out of the dark. Filtering by domain rebuilds the hall. Reduced motion: skipped (the archive below lists all).
 */
export function ExhibitionStage({ items, initialDomain }: { items: Exhibit[]; initialDomain?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const rig = useRef<HTMLDivElement>(null);
  const [raw, setRaw] = useState(0);
  const [still, setStill] = useState(false);
  const [domain, setDomain] = useState(initialDomain || 'ALL');

  const domains = useMemo(() => {
    const m = new Map<string, { name: string; n: number }>();
    items.forEach((p) => m.set(p.domainSlug, { name: p.domain, n: (m.get(p.domainSlug)?.n ?? 0) + 1 }));
    return Array.from(m.entries()).map(([slug, v]) => ({ slug, ...v }));
  }, [items]);
  const list = useMemo(() => items.filter((p) => domain === 'ALL' || p.domainSlug === domain), [items, domain]);
  const n = list.length;

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      setRaw(clamp(-r.top / ((r.height - window.innerHeight) || 1)) * Math.max(0, n - 1));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    const pm = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      if (rig.current) rig.current.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 5}deg)`;
    };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    window.addEventListener('pointermove', pm);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); window.removeEventListener('pointermove', pm); if (raf) cancelAnimationFrame(raf); };
  }, [n]);

  if (still || items.length === 0) return null;

  const i0 = Math.floor(raw), f = raw - i0;
  const pos = Math.min(Math.max(0, n - 1), i0 + sm(0.55, 1, f));
  const active = Math.min(n - 1, Math.round(pos));
  const cur = list[active];

  const jump = (i: number) => {
    const el = outer.current; if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (n > 1 ? (i / (n - 1)) * (el.offsetHeight - window.innerHeight) : 0), behavior: 'smooth' });
  };
  const pick = (slug: string) => { setDomain(slug); outer.current && window.scrollTo({ top: outer.current.getBoundingClientRect().top + window.scrollY, behavior: 'auto' }); };

  return (
    <div ref={outer} style={{ height: `${Math.max(1, n) * 90 + 90}vh` }} className="relative" aria-label="Project exhibition">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_55%,rgba(212,175,55,0.17),transparent_62%)]" />
        <div aria-hidden className="exh-floor" />
        <div aria-hidden className="skmotes">{Array.from({ length: 22 }).map((_, i) => <i key={i} style={{ left: `${(i * 43) % 100}%`, animationDelay: `${(i % 8) * -1.7}s`, animationDuration: `${9 + (i % 5) * 2}s` }} />)}</div>

        <div className="relative h-full max-w-[90rem] mx-auto px-4 sm:px-8 pt-20 pb-4 flex flex-col">
          {/* domain filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" role="tablist" aria-label="Filter exhibits by domain">
            {[{ slug: 'ALL', name: 'All', n: items.length }, ...domains].map((d) => (
              <button key={d.slug} role="tab" aria-selected={domain === d.slug} onClick={() => pick(d.slug)} className="exh-chip" data-on={domain === d.slug ? '1' : '0'}>{d.name} <b>{d.n}</b></button>
            ))}
          </div>

          <div className="flex-1 min-h-0 grid lg:grid-cols-[0.95fr,1.15fr] gap-2 lg:gap-8 items-center">
            {/* placard */}
            <div className="relative z-10 order-2 lg:order-1 min-w-0">
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Exhibit {pad(active + 1)} <span className="text-neutral-500">/ {pad(n)}</span> · {cur.domain}</p>
              <h2 key={cur.slug} className="skdetail-title font-serif font-black text-white leading-[0.98] mt-3 text-[clamp(2rem,5.2vw,4.6rem)] break-words">{cur.title}</h2>
              <p className="mt-4 text-neutral-200 text-base lg:text-lg max-w-xl line-clamp-3">{cur.tagline}</p>
              {cur.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{cur.tags.slice(0, 6).map((t) => <span key={t} className="exh-tag">{t}</span>)}</div>}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs font-mono text-neutral-400">
                {cur.difficulty && cur.difficulty !== 'Unrated' && <span>Tier · <b className="text-gold-300">{cur.difficulty}</b></span>}
                <span>Status · <b className="text-gold-300">{cur.status}</b></span>
                {cur.stars > 0 && <span>★ <b className="text-gold-300">{cur.stars}</b> on GitHub</span>}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href={`/projects/${cur.slug}`} className="exh-cta">Open case study <ArrowRight className="w-4 h-4" aria-hidden /></Link>
                {cur.github && <a href={cur.github} target="_blank" rel="noopener noreferrer" className="exh-ghost"><Github className="w-4 h-4" aria-hidden /> Code</a>}
                {cur.live && <a href={cur.live} target="_blank" rel="noopener noreferrer" className="exh-ghost"><ExternalLink className="w-4 h-4" aria-hidden /> Live</a>}
              </div>
            </div>

            {/* hall */}
            <div className="relative h-[40vh] lg:h-[74vh] order-1 lg:order-2" style={{ perspective: '1500px' }}>
              <div ref={rig} className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transition: 'transform .25s ease-out' }}>
                {list.map((p, i) => {
                  const d = i - pos;
                  if (d < -1.3 || d > 4) return null;
                  const ahead = Math.max(0, d);
                  const x = d >= 0 ? Math.min(ahead, 3) * 36 : -d * 60; // % of the card's own width
                  const y = d >= 0 ? -Math.min(ahead, 3) * 7 : d * 8;
                  const z = d >= 0 ? -ahead * 620 : -d * 520;
                  const ry = d >= 0 ? -Math.min(ahead, 2) * 12 : d * 14;
                  const op = d >= 0 ? 1 - Math.min(ahead, 3.2) / 3.6 : Math.max(0, 1 + d * 1.5);
                  const front = Math.abs(d) < 0.5;
                  return (
                    <div key={p.slug} className="exh-card" style={{ transform: `translate3d(calc(-50% + ${x}%), calc(-50% + ${y}%), ${z}px) rotateY(${ry}deg)`, opacity: op, zIndex: 100 - Math.round(ahead * 10), pointerEvents: front ? 'auto' : 'none' }} data-front={front ? '1' : '0'}>
                      <Link href={`/projects/${p.slug}`} tabIndex={front ? 0 : -1} aria-label={`Open ${p.title}`} className="exh-frame">
                        <div className="exh-mat">
                          {p.cover ? <img src={p.cover} alt={`${p.title} preview`} className="w-full h-full object-cover" /> : <ProjectArt slug={p.slug} title={p.title} label={p.domain} />}
                          <span className="exh-sheen" aria-hidden />
                        </div>
                        <div className="exh-plaque"><span>No. {pad(i + 1)}</span><span>{p.domain}</span></div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* rail */}
          <div className="flex items-center justify-center gap-1.5 pt-2" role="tablist" aria-label="Exhibits">
            {list.map((p, i) => <button key={p.slug} onClick={() => jump(i)} aria-label={`Go to ${p.title}`} className="exh-dot" data-on={i === active ? '1' : '0'} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
