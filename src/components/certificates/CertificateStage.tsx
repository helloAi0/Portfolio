'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toRoman } from '@/lib/roman';

export interface Cert { title: string; org: string; dateLabel: string | null; credentialId: string | null; verified: boolean; description: string | null; fileUrl: string | null; verifyUrl: string | null }

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** A hall of books; the camera walks under one arch per certificate. No certificates yet: one living "coming soon" hall. */
export function CertificateStage({ certs }: { certs: Cert[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctl = useRef<{ setPos: (p: number) => void; setNarrow: (v: boolean) => void; dispose: () => void } | null>(null);
  const [raw, setRaw] = useState(0);
  const [still, setStill] = useState(false);
  const n = certs.length;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStill(reduce);
    if (reduce) return;
    let cancelled = false;
    import('@/lib/three/academy').then(({ createAcademy }) => {
      if (cancelled || !canvasRef.current) return;
      try { ctl.current = createAcademy({ canvas: canvasRef.current, items: certs.map((c) => ({ title: c.title, org: c.org })), narrow: window.innerWidth < 1024 }); } catch { /* no WebGL */ }
    });
    let raf = 0;
    const update = () => {
      raf = 0;
      const nw = window.innerWidth < 1024; ctl.current?.setNarrow(nw);
      const el = outer.current; if (!el || n < 2) return;
      const r = el.getBoundingClientRect();
      const v = clamp(-r.top / ((r.height - window.innerHeight) || 1)) * (n - 1);
      const i0 = Math.floor(v);
      const pos = Math.min(n - 1, i0 + sm(0.55, 1, v - i0));
      setRaw(pos); ctl.current?.setPos(pos);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelled = true; window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); ctl.current?.dispose(); ctl.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  if (still) return null;
  const active = n ? Math.min(n - 1, Math.round(raw)) : 0;
  const c = n ? certs[active] : null;

  return (
    <div ref={outer} style={{ height: n < 2 ? '100vh' : `${Math.min(n * 100, 500 + n * 45) + 60}vh` }} className="relative" aria-label="Certificates">
      <div className={(n < 2 ? 'relative' : 'sticky top-0') + ' h-screen overflow-hidden bg-[#0b0f24]'}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
        <div className="relative h-full max-w-[88rem] mx-auto px-4 sm:px-8 pt-24 pb-8 flex items-end lg:items-center lg:justify-end">
          <div style={{ background: 'rgba(8,11,32,0.94)' }} className="w-full lg:w-[40%] rounded-2xl backdrop-blur-md border border-amber-200/25 p-6 sm:p-8" key={active}>
            {c ? (
              <>
                <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-200">Certificate {toRoman(active + 1)} of {toRoman(n)}{c.verified ? ' · verified' : ''}</p>
                <h2 className="font-serif font-black text-white text-3xl sm:text-4xl mt-3 leading-tight">{c.title}</h2>
                <p className="mt-2 text-amber-200 font-mono text-sm">{c.org}{c.dateLabel ? ` · ${c.dateLabel}` : ''}</p>
                {c.credentialId && <p className="mt-2 text-xs font-mono text-neutral-400">ID: {c.credentialId}</p>}
                {c.description && <p className="mt-4 text-neutral-100 leading-relaxed">{c.description}</p>}
                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                  {c.fileUrl && <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className="sklink">View certificate ↗</a>}
                  {c.verifyUrl && <a href={c.verifyUrl} target="_blank" rel="noopener noreferrer" className="sklink">Verify with issuer ↗</a>}
                </div>
                {n > 1 && <p className="mt-6 text-xs font-mono text-amber-100/60">Scroll to walk to the next one.</p>}
              </>
            ) : (
              <>
                <p className="text-xs font-mono uppercase tracking-[0.3em] text-amber-200">Certificates</p>
                <h2 className="font-serif font-black text-white text-4xl sm:text-5xl mt-3 leading-tight">Coming soon</h2>
                <p className="mt-4 text-neutral-100 leading-relaxed">No certificate is shown until it is real and verified. When Taha adds one, it will hang under its own arch in this hall, one by one.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
