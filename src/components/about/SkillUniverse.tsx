'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { AddSkillDialog } from './AddSkillDialog';
import { useIsOwner } from './useIsOwner';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));

export interface UniSkill { id: string; name: string; status: string; steps: number; links: { label: string; href: string | null }[]; note: string | null }
export interface UniDomain { name: string; skills: UniSkill[] }

const STATUS_LABEL: Record<string, string> = {
  DEMONSTRATED: 'Demonstrated', OWNER_CONFIRMED: 'I know this', PRACTICING: 'Practicing', LEARNING: 'Learning', DETECTED: 'Detected in repos',
};

/**
 * Skill universe. A 3D wheel of domains turns as you scroll; the skills of the front domain fly in beside it.
 * The signed-in owner also sees "+ Add skill", which saves through the admin API and refreshes this view.
 */
export function SkillUniverse({ domains, allDomainNames }: { domains: UniDomain[]; allDomainNames: string[] }) {
  const router = useRouter();
  const owner = useIsOwner();
  const outer = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);
  const [adding, setAdding] = useState(false);
  const n = domains.length;

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      setP(clamp(-r.top / ((r.height - window.innerHeight) || 1)));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, [n]);

  const total = domains.reduce((a, d) => a + d.skills.length, 0);
  const dialog = adding && (
    <AddSkillDialog domains={allDomainNames} defaultDomain={domains[Math.round(p * (n - 1))]?.name} onClose={() => setAdding(false)} onSaved={() => router.refresh()} />
  );
  const addBtn = owner && (
    <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500 text-imperial-950 text-xs font-bold hover:bg-gold-400 shadow-[0_0_30px_rgba(212,175,55,.35)]">
      <Plus className="w-4 h-4" aria-hidden /> Add skill
    </button>
  );

  if (n === 0) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-24 text-center" aria-label="Skill universe">
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mb-4">Skill universe</p>
        <h2 className="font-serif font-black text-white text-4xl">No skills added yet.</h2>
        <p className="mt-3 text-neutral-400 text-sm">Skills appear here after the GitHub sync, or when the owner adds them.</p>
        <div className="mt-6">{addBtn}</div>{dialog}
      </section>
    );
  }

  if (still) {
    return (
      <section className="max-w-5xl mx-auto px-4 py-20 space-y-8" aria-label="Skill universe">
        <div className="flex items-center justify-between"><h2 className="font-serif font-black text-white text-3xl">Skill universe</h2>{addBtn}</div>
        {domains.map((d) => (
          <div key={d.name}><h3 className="text-gold-300 font-mono text-sm uppercase tracking-widest">{d.name}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">{d.skills.map((s) => <li key={s.id} className="px-3 py-1 rounded border border-white/10 text-sm text-neutral-200">{s.name}</li>)}</ul></div>
        ))}
        {dialog}
      </section>
    );
  }

  const f = p * (n - 1);          // continuous domain index
  const active = Math.round(f);
  const step = 360 / Math.max(n, 6);
  const R = 230;
  const cur = domains[active];

  return (
    <div ref={outer} style={{ height: `${Math.max(2, n) * 85 + 60}vh` }} className="relative" aria-label="Skill universe">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(212,175,55,0.14),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-8 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-6 pt-20">
          {/* wheel */}
          <div className="relative h-[34vh] lg:h-[70vh] flex items-center" style={{ perspective: '1000px' }}>
            <div className="absolute left-0 top-0 z-10">
              <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400">Skill universe</p>
              <p className="text-xs font-mono text-neutral-500 mt-1">{total} skills · {n} domain{n === 1 ? '' : 's'}</p>
              <div className="mt-3">{addBtn}</div>
            </div>
            <div className="relative w-full h-0" style={{ transformStyle: 'preserve-3d', transform: `translateX(8%) rotateX(${f * step}deg)`, transition: 'transform 90ms linear' }}>
              {domains.map((d, i) => {
                const dist = Math.abs(i - f);
                return (
                  <div key={d.name} className="absolute left-0 right-0 flex justify-center" style={{ transform: `rotateX(${-i * step}deg) translateZ(${R}px)`, backfaceVisibility: 'hidden' }}>
                    <span className="px-5 py-2.5 rounded-xl border font-serif font-black whitespace-nowrap" style={{
                      fontSize: i === active ? 'clamp(1.4rem,3.2vw,2.6rem)' : 'clamp(1rem,2vw,1.6rem)', opacity: clamp(1 - dist * 0.35, 0.12, 1),
                      color: i === active ? '#f3c969' : '#c9c2a8', borderColor: i === active ? 'rgba(243,201,105,.6)' : 'rgba(255,255,255,.08)',
                      background: i === active ? 'rgba(212,175,55,.1)' : 'rgba(255,255,255,.02)', boxShadow: i === active ? '0 0 50px rgba(212,175,55,.25)' : 'none',
                    }}>{d.name}<span className="ml-3 text-xs font-mono font-normal opacity-60">{d.skills.length}</span></span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* skills of the front domain */}
          <div key={cur.name} className="relative lg:h-[70vh] overflow-hidden" style={{ perspective: '1100px' }}>
            <h3 className="font-serif font-black text-white text-2xl sm:text-4xl mb-4">{cur.name}</h3>
            <ul className="grid sm:grid-cols-2 gap-3 max-h-[46vh] lg:max-h-[58vh] overflow-y-auto pr-1">
              {cur.skills.map((s, i) => (
                <li key={s.id} className="skill-pop rounded-xl border border-gold-500/15 bg-imperial-900/70 p-4" style={{ animationDelay: `${Math.min(i, 10) * 70}ms` }}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white text-sm">{s.name}</span>
                    <span className="text-[9px] font-mono uppercase text-gold-400 shrink-0 mt-0.5">{STATUS_LABEL[s.status] ?? s.status}</span>
                  </div>
                  {s.steps > 0 && (
                    <div className="mt-2 flex gap-1" aria-label={`Self-rated ${s.steps} of 4`}>
                      {[1, 2, 3, 4].map((k) => <span key={k} className={'h-1 flex-1 rounded-full ' + (k <= s.steps ? 'bg-gold-400' : 'bg-white/10')} />)}
                    </div>
                  )}
                  {s.note && <p className="mt-2 text-xs text-neutral-400">{s.note}</p>}
                  {s.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.links.slice(0, 3).map((l, k) => l.href
                        ? <a key={k} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-[10px] font-mono text-gold-300 border border-white/10 rounded px-1.5 py-0.5 hover:border-gold-500/60">{l.label} ↗</a>
                        : <span key={k} className="text-[10px] font-mono text-neutral-500 border border-white/5 rounded px-1.5 py-0.5">{l.label}</span>)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div aria-hidden className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {domains.map((d, i) => <span key={d.name} className={'h-1 rounded-full transition-all duration-300 ' + (i === active ? 'w-8 bg-gold-400' : 'w-2 bg-white/20')} />)}
        </div>
      </div>
      {dialog}
    </div>
  );
}
