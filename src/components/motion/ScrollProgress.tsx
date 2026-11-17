'use client';

import { useEffect, useRef } from 'react';

/** Thin gold reading-progress bar at the top of the viewport. Pure transform, no re-renders. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div aria-hidden className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none">
      <div ref={ref} className="h-full origin-left bg-gradient-to-r from-gold-600 via-gold-300 to-gold-500 shadow-[0_0_10px_rgba(212,175,55,0.7)]" style={{ transform: 'scaleX(0)' }} />
    </div>
  );
}
