'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createRoboticsStage } from '@/lib/three/roboticsStage';
import type { HologramSource } from '@/lib/three/roboticsWorld';
import { HoloCallouts, applyCallouts } from '@/components/home/HoloCallouts';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * About-page header: replaces the plain name heading with the robotics lab and the owner's hologram.
 * Scroll scrubs the camera (orbit + dolly), the arms and the callouts. The neural stage below is unchanged.
 */
export function AboutHologramStage({ name, headline, holo, children }: { name: string; headline: string; holo: HologramSource; children?: React.ReactNode }) {
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [cinematic, setCinematic] = useState(true);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowPower = window.innerWidth < 768 || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    let ctl: ReturnType<typeof createRoboticsStage> | null = null;
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('no webgl');
      ctl = createRoboticsStage(canvas, { lowPower, reducedMotion: reduced, holo, onFrame: ({ labels }) => applyCallouts(calloutRef.current, labels) });
    } catch { setWebgl(false); setCinematic(false); return; }
    if (reduced) setCinematic(false);
    const resize = () => { const r = canvas.parentElement?.getBoundingClientRect(); if (r) ctl?.resize(r.width, r.height); };
    resize();
    const ro = new ResizeObserver(resize); if (canvas.parentElement) ro.observe(canvas.parentElement);
    let raf = 0;
    const update = () => {
      raf = 0; if (reduced) return;
      const rect = stage.getBoundingClientRect();
      const p = clamp01(-rect.top / Math.max(1, rect.height - window.innerHeight));
      ctl?.setScroll(p);
      if (titleRef.current) { const o = 1 - smooth(clamp01((p - 0.1) / 0.2)); titleRef.current.style.opacity = String(o); titleRef.current.style.transform = `translateY(${(1 - o) * -30}px)`; }
      if (hintRef.current) hintRef.current.style.opacity = String(1 - clamp01(p / 0.05));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onMove = (e: PointerEvent) => ctl?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    const io = new IntersectionObserver(([e]) => ctl?.setPaused(!e.isIntersecting), { threshold: 0 }); io.observe(stage);
    update();
    window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('pointermove', onMove, { passive: true });
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('pointermove', onMove); io.disconnect(); ro.disconnect(); ctl?.dispose(); };
    // holo is a stable prop from a server component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const words = name.toUpperCase().split(' ');
  return (
    <section ref={stageRef} aria-label="About, introduction" className="relative" style={cinematic ? { height: '300vh' } : undefined}>
      <div className={cinematic ? 'sticky top-0 h-screen overflow-hidden' : 'relative min-h-[80vh] overflow-hidden'}>
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[#03060a]" />
          <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${webgl ? '' : 'hidden'}`} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#04070b]/85 via-[#04070b]/35 to-transparent lg:via-[#04070b]/15" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#08090c] to-transparent" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#08090c]/80 to-transparent" />
          <div className="absolute inset-0 [background:radial-gradient(ellipse_at_70%_50%,transparent_40%,rgba(2,10,16,0.55)_100%)]" />
        </div>
        {webgl && <HoloCallouts ref={calloutRef} />}
        <div ref={titleRef} className="absolute inset-0 flex items-center will-change-transform">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-24">
            {children}
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-300 mt-6 mb-4">About</p>
            <h1 className="font-serif font-black text-white leading-[0.92] text-[clamp(2.4rem,6.5vw,5.8rem)] [text-shadow:0_4px_30px_rgba(0,0,0,.8)]" aria-label={name}>
              {words.map((w, i) => <span key={w} className="kw mr-[0.25em]" aria-hidden><span style={{ ['--i' as string]: i }}>{w}</span></span>)}
            </h1>
            <p className="mt-5 text-xl sm:text-3xl font-serif italic text-cyan-200/90 max-w-xl">{headline}</p>
          </div>
        </div>
        {cinematic && (
          <div ref={hintRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none" aria-hidden>
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-200/80">Scroll</span>
            <span className="scroll-hint-line" />
          </div>
        )}
      </div>
    </section>
  );
}
