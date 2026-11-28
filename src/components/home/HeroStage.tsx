'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createImperialHall, type HallController } from '@/lib/three/imperialHall';
import { HallFallback } from './HallFallback';

export interface HeroChapter {
  id: string;
  /** scroll window (0-1) in which this chapter is visible */
  from: number;
  to: number;
  node: React.ReactNode;
}

interface HeroStageProps {
  intro: React.ReactNode;
  chapters: HeroChapter[];
}

type Mode = 'cinematic' | 'static';

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Scroll-driven cinematic hero. A tall section holds a sticky full-screen WebGL canvas; scrolling
 * flies the camera down the hall while text "chapters" fade in and out. Falls back to a compact
 * static hero (still frame or SVG) when WebGL is unavailable or the visitor prefers reduced motion.
 */
export function HeroStage({ intro, chapters }: HeroStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('cinematic');
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowPower = window.innerWidth < 768 || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;

    let hall: HallController | null = null;
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('no webgl');
      hall = createImperialHall(canvas, { lowPower, reducedMotion: reduced });
    } catch {
      setWebgl(false);
      setMode('static');
      return;
    }
    if (reduced) setMode('static');

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect();
      if (r) hall?.resize(r.width, r.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    let raf = 0;
    const update = () => {
      raf = 0;
      if (reduced) return;
      const rect = stage.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const p = clamp01(-rect.top / scrollable);
      hall?.setScroll(p);
      if (introRef.current) {
        const o = 1 - smooth(clamp01((p - 0.08) / 0.12));
        introRef.current.style.opacity = String(o);
        introRef.current.style.transform = `translateY(${(1 - o) * -40}px)`;
        introRef.current.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      }
      chapters.forEach((c, i) => {
        const el = chapterRefs.current[i];
        if (!el) return;
        const fade = 0.07;
        const inT = smooth(clamp01((p - c.from) / fade));
        const outT = smooth(clamp01((p - (c.to - fade)) / fade));
        const o = inT * (1 - outT);
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - inT) * 36 - outT * 36}px)`;
        el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
        el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      });
      if (hintRef.current) hintRef.current.style.opacity = String(1 - clamp01(p / 0.06));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onMove = (e: PointerEvent) => hall?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    const io = new IntersectionObserver(([e]) => hall?.setPaused(!e.isIntersecting), { threshold: 0 });
    io.observe(stage);
    const onVis = () => hall?.setPaused(document.hidden);

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
      ro.disconnect();
      hall?.dispose();
    };
    // chapters is a stable prop from a server component render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cinematic = mode === 'cinematic';

  return (
    <section
      ref={stageRef}
      aria-label="Introduction"
      className="relative"
      style={cinematic ? { height: '360vh' } : undefined}
    >
      <div className={cinematic ? 'sticky top-0 h-screen overflow-hidden' : 'relative min-h-[92vh] overflow-hidden'}>
        <div className="absolute inset-0" aria-hidden>
          {!webgl && <HallFallback />}
          <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${webgl ? '' : 'hidden'}`} />
          {/* readability veil: dark on the text side, open on the scene side */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#07080b]/85 via-[#07080b]/40 to-transparent lg:via-[#07080b]/25" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#08090c] to-transparent" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#08090c]/80 to-transparent" />
        </div>

        <div ref={introRef} className="absolute inset-0 flex items-center will-change-transform" style={cinematic ? undefined : { position: 'relative' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-24 pb-16">{intro}</div>
        </div>

        {cinematic &&
          chapters.map((c, i) => (
            <div
              key={c.id}
              ref={(el) => { chapterRefs.current[i] = el; }}
              className="absolute inset-0 flex items-center will-change-transform"
              style={{ opacity: 0, visibility: 'hidden' }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20">{c.node}</div>
            </div>
          ))}

        {cinematic && (
          <div ref={hintRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none" aria-hidden>
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold-300/80">Scroll to enter</span>
            <span className="scroll-hint-line" />
          </div>
        )}
      </div>

      {!cinematic && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-16">
          {chapters.map((c) => <div key={c.id}>{c.node}</div>)}
        </div>
      )}
    </section>
  );
}
