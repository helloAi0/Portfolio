'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LiveClock, LiveDayLine } from '@/components/ui/LiveClock';

export interface ColSkill { id: string; name: string; label: string; steps: number; note: string | null; links: { label: string; href: string }[] }
export interface ColDomain { name: string; skills: ColSkill[] }

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Pinned robot work-cell. Each skill domain is a module on a turntable; a robot arm reaches over the one facing you,
 * scans it and lights its chips (brightness = my self-rating). The table holds still while you read, then turns.
 * Reduced motion or no WebGL: the text panel and the full ledger below still carry every skill and link.
 */
export function SkillRobotBay({ domains }: { domains: ColDomain[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const ctl = useRef<{ setPos: (p: number) => void; setNarrow: (v: boolean) => void; dispose: () => void } | null>(null);
  const [raw, setRaw] = useState(0);
  const [still, setStill] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const n = domains.length;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(reduce);
    if (reduce || n === 0) return;
    let cancelled = false;
    import('@/lib/three/skillRobot').then(({ createSkillRobot }) => {
      if (cancelled || !canvasRef.current) return;
      try {
        ctl.current = createSkillRobot({ canvas: canvasRef.current, narrow: window.innerWidth < 1024, onTelemetry: (t) => { const set = (k: string, v: string) => { const el = hud.current?.querySelector(`[data-k="${k}"]`); if (el) el.textContent = v; }; t.j.forEach((v, i) => set(`j${i + 1}`, `${v.toFixed(1)}°`)); set('x', t.tip[0].toFixed(2)); set('y', t.tip[1].toFixed(2)); set('z', t.tip[2].toFixed(2)); set('reach', `${Math.round((t.reach / t.reachMax) * 100)}%`); const bar = hud.current?.querySelector('[data-k="bar"]') as HTMLElement | null; if (bar) bar.style.width = `${Math.min(100, (t.reach / t.reachMax) * 100)}%`; }, domains: domains.map((d) => ({ name: d.name, levels: d.skills.map((s) => s.steps) })) });
      } catch { /* no WebGL: the text panel still works */ }
    });
    let raf = 0;
    const update = () => {
      raf = 0;
      const nw = window.innerWidth < 1024; setNarrow(nw); ctl.current?.setNarrow(nw);
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const v = clamp(-r.top / ((r.height - window.innerHeight) || 1)) * Math.max(0, n - 1);
      const i0 = Math.floor(v);
      const pos = Math.min(n - 1, i0 + sm(0.55, 1, v - i0));
      setRaw(pos); ctl.current?.setPos(pos);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelled = true; window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); ctl.current?.dispose(); ctl.current = null; };
  }, [n, domains]);

  if (n === 0 || still) return null;
  const active = Math.min(n - 1, Math.round(raw));
  const dom = domains[active];
  const cap = narrow ? 3 : 8;
  const shown = dom.skills.slice(0, cap);

  return (
    <div ref={outer} style={{ height: `${n * 100 + 60}vh` }} className="relative" aria-label="Skill modules">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#060a14]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: narrow ? 'linear-gradient(0deg, rgba(6,10,20,0.97) 0%, rgba(6,10,20,0.8) 45%, transparent 66%)' : 'linear-gradient(270deg, rgba(6,10,20,0.95) 0%, rgba(6,10,20,0.78) 38%, transparent 62%)' }} />
        <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#060a14] to-transparent pointer-events-none" />

        {/* teach-pendant readout + drawing title block (desktop) */}
        <div ref={hud} className="rbpend hidden lg:block" aria-hidden>
          <div className="rbpend-h"><span className="rbdot" />TEACH PENDANT · AUTO · SIM</div>
          <dl>
            {['j1', 'j2', 'j3', 'j4'].map((k, i) => (<div key={k}><dt>J{i + 1}</dt><dd data-k={k}>0.0°</dd></div>))}
            <div><dt>TCP X</dt><dd data-k="x">0.00</dd></div><div><dt>TCP Y</dt><dd data-k="y">0.00</dd></div><div><dt>TCP Z</dt><dd data-k="z">0.00</dd></div>
          </dl>
          <div className="rbpend-bar"><span>REACH <b data-k="reach">0%</b></span><i><u data-k="bar" /></i></div>
          <div className="rbtitle">
            <div><span>SHEET</span>03 · SKILL CELL</div>
            <div><span>DRAWN</span>T. UDAIPURWALA</div>
            <div><span>SCALE</span>1 : 1 (SIMULATION)</div>
            <div><span>TIME</span><LiveClock /></div>
            <div className="col-span-2"><span>DATE</span><LiveDayLine /></div>
          </div>
        </div>
        <div className="relative h-full max-w-[88rem] mx-auto px-4 sm:px-8 pt-24 pb-6 flex lg:justify-end items-end lg:items-center">
          <div className="relative z-10 min-w-0 w-full lg:w-[52%]">
            <div className="rbhud">
              <span className="rbdot" aria-hidden />MODULE {pad(active + 1)} / {pad(n)} · ONLINE · {dom.skills.length} SKILL{dom.skills.length === 1 ? '' : 'S'}
            </div>
            <h2 key={dom.name} className="skdetail-title font-serif font-black text-white text-4xl sm:text-6xl mt-2 leading-none">{dom.name}</h2>
            <ul className="mt-4 lg:mt-6 grid sm:grid-cols-2 gap-3">
              {shown.map((s) => (
                <li key={s.id} className="skrow rbrow">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-serif font-bold text-white text-lg lg:text-xl leading-tight">{s.name}</span>
                    <span className="sklabel">{s.label}</span>
                  </div>
                  {s.steps > 0 && <div className="flex gap-1.5 mt-2.5" aria-label={`Self-rated ${s.steps} of 4`}>{[1, 2, 3, 4].map((k) => <span key={k} className={'h-1.5 flex-1 rounded-sm ' + (k <= s.steps ? 'bg-cyan-300 shadow-[0_0_8px_rgba(79,216,255,0.7)]' : 'bg-white/10')} />)}</div>}
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
            {dom.skills.length > cap && <a href="#ledger" className="inline-block mt-3 text-sm font-mono text-cyan-300 hover:underline">+ {dom.skills.length - cap} more in the full ledger below ↓</a>}
            <p className="mt-4 text-xs font-mono text-neutral-500">Scroll: the table turns to the next module.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
