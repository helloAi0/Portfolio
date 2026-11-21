'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, GraduationCap } from 'lucide-react';

export interface ClimbStep {
  id: string; title: string; line: string; years: string; place: string | null; status: 'done' | 'current' | 'future'; tag: string;
  extra?: { label: string; value: string }[];
}

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const W = 260, D = 200, GAPX = 250, H = 78;

function Block({ i, step, active }: { i: number; step: ClimbStep; active: boolean }) {
  const h = (i + 1) * H;
  return (
    <div className="eb" data-status={step.status} data-active={active ? '1' : '0'} style={{ left: i * GAPX, width: W, height: D, transform: 'translateZ(0)' }}>
      <div className="eb-top" style={{ transform: `translateZ(${h}px)` }}><span>{step.years.split(/\s*[–-]\s*/)[0]}</span></div>
      <div className="eb-front" style={{ width: W, height: h }} />
      <div className="eb-side" style={{ width: h, height: D }} />
    </div>
  );
}

/**
 * Pinned 3D staircase. Each milestone is a taller block than the last; a gold marker climbs them as you scroll
 * while the facing milestone's details are shown beside it, in plain, large type. Reduced motion: a simple list.
 */
export function EducationClimb({ steps }: { steps: ClimbStep[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const [raw, setRaw] = useState(0);
  const [still, setStill] = useState(false);
  const n = steps.length;

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
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, [n]);

  const Detail = ({ s, idx }: { s: ClimbStep; idx: number }) => (
    <div>
      <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">{s.tag}</p>
      <h2 key={s.id} className="skdetail-title font-serif font-black text-white text-3xl sm:text-5xl mt-2 leading-[1.05]">{s.title}</h2>
      <p className="mt-4 text-lg text-neutral-200 max-w-xl">{s.line}</p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm font-mono text-neutral-300">
        <span className="edchip">{s.years}</span>
        {s.place && <span className="edchip"><MapPin className="w-3.5 h-3.5 text-gold-400" aria-hidden />{s.place}</span>}
        <span className="edchip" data-s={s.status}>{s.status === 'done' ? 'Completed' : s.status === 'current' ? 'In progress' : 'Upcoming'}</span>
      </div>
      {s.extra && s.extra.length > 0 && (
        <dl className="mt-6 grid sm:grid-cols-2 gap-3 max-w-xl">
          {s.extra.map((e) => <div key={e.label} className="skrow"><dt className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">{e.label}</dt><dd className="font-serif font-bold text-white text-lg mt-1">{e.value}</dd></div>)}
        </dl>
      )}
      <p className="mt-6 text-xs font-mono text-neutral-500">Step {idx + 1} of {n}</p>
    </div>
  );

  if (n === 0) return null;
  if (still) {
    return <div className="max-w-4xl mx-auto px-4 py-12 space-y-14">{steps.map((s, i) => <Detail key={s.id} s={s} idx={i} />)}</div>;
  }

  const i0 = Math.floor(raw), f = raw - i0;
  const pos = Math.min(n - 1, i0 + sm(0.5, 1, f));
  const active = Math.round(pos);
  const a = Math.floor(pos), b = Math.min(n - 1, a + 1), t = pos - a;
  const topZ = (i: number) => (i + 1) * H;
  const mx = a * GAPX + W / 2 + (b * GAPX - a * GAPX) * t;
  const mz = topZ(a) + (topZ(b) - topZ(a)) * t + Math.sin(t * Math.PI) * 60;
  const cx = pos * GAPX + W / 2, cz = (pos + 1) * H;

  return (
    <div ref={outer} style={{ height: `${n * 95 + 70}vh` }} className="relative" aria-label="Education milestones">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_60%,rgba(212,175,55,0.16),transparent_60%)]" />
        <div aria-hidden className="skmotes">{Array.from({ length: 20 }).map((_, i) => <i key={i} style={{ left: `${(i * 47) % 100}%`, animationDelay: `${(i % 8) * -1.7}s`, animationDuration: `${9 + (i % 5) * 2}s` }} />)}</div>
        <div className="relative h-full max-w-[88rem] mx-auto px-4 sm:px-8 pt-24 pb-6 grid lg:grid-cols-[1fr,1.05fr] gap-4 items-center">
          <div className="relative z-10 order-2 lg:order-1"><Detail s={steps[active]} idx={active} /></div>

          <div className="relative h-[38vh] lg:h-[74vh] order-1 lg:order-2" style={{ perspective: '2200px' }} aria-hidden>
            <div className="absolute left-1/2 top-[58%] edworld" style={{ transformStyle: 'preserve-3d', transform: `rotateX(58deg) rotateZ(-38deg) translate3d(${-cx}px, ${-D / 2}px, ${-cz}px) scale(var(--edscale, 1))` }}>
              {steps.map((s, i) => <Block key={s.id} i={i} step={s} active={i === active} />)}
              <div className="edmark" style={{ transform: `translate3d(${mx}px, ${D / 2}px, ${mz + 60}px) rotateZ(38deg) rotateX(-58deg)` }}><GraduationCap className="w-6 h-6 text-[#1a1205]" /></div>
            </div>
            <p className="absolute bottom-0 inset-x-0 text-center text-[11px] font-mono text-neutral-500">Scroll to climb</p>
          </div>
        </div>
      </div>
    </div>
  );
}
