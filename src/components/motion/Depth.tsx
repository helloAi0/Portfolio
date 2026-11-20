'use client';

import React, { useEffect, useRef } from 'react';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll-driven 3D: the block tilts back and drifts in depth while it enters and leaves the viewport,
 * and sits flat when it is centred. Pure CSS transforms; disabled for reduced-motion visitors.
 */
export function ScrollDepth({
  children, className = '', strength = 1,
}: { children: React.ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // -1 (below the fold) .. 0 (centred) .. 1 (above)
      const d = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / (vh * 0.7)));
      const k = strength;
      el.style.transform = `perspective(1400px) translate3d(0, 0, ${-Math.abs(d) * 120 * k}px) rotateX(${d * 12 * k}deg) scale(${1 - Math.abs(d) * 0.04 * k})`;
      el.style.opacity = String(1 - Math.abs(d) * 0.55);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);
  return <div ref={ref} className={className} style={{ willChange: 'transform, opacity' }}>{children}</div>;
}

/** Pointer-follow tilt with a moving highlight. */
export function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reducedMotion() || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(8px)`;
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
    el.style.setProperty('--my', `${(y + 0.5) * 100}%`);
  };
  const reset = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`tilt-card ${className}`}
      style={{ transition: 'transform 180ms ease-out', transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}

/** A ring of labels rotating in 3D around a vertical axis. Decorative. */
export function OrbitRing({ items, radius = 190 }: { items: string[]; radius?: number }) {
  return (
    <div className="orbit-scene" aria-hidden="true">
      <div className="orbit-ring" style={{ ['--r' as string]: `${radius}px` }}>
        {items.map((t, i) => (
          <span key={t} className="orbit-item" style={{ transform: `rotateY(${(360 / items.length) * i}deg) translateZ(${radius}px)` }}>
            {t}
          </span>
        ))}
      </div>
      <div className="orbit-core" />
    </div>
  );
}

/** Counts up to `value` once when scrolled into view. Shows the final value immediately for reduced motion / no JS. */
export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || typeof IntersectionObserver === 'undefined') return;
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now(), dur = 1400;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        el.textContent = String(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref} className={className} suppressHydrationWarning>{value}</span>;
}
