'use client';

import { useEffect } from 'react';

/**
 * One delegated pointer listener for the whole site:
 *  - `.spot`: a gold spotlight follows the cursor inside the element (--mx / --my)
 *  - `.tilt`: subtle 3D tilt toward the cursor
 * Disabled for touch pointers and reduced motion.
 */
export function PointerFX() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;
    let active: HTMLElement | null = null;
    const reset = (el: HTMLElement | null) => { if (el?.classList.contains('tilt')) el.style.transform = ''; };
    const onMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.('.spot, .tilt') as HTMLElement | null;
      if (active && active !== target) reset(active);
      active = target;
      if (!target) return;
      const r = target.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      target.style.setProperty('--mx', `${x}px`);
      target.style.setProperty('--my', `${y}px`);
      if (target.classList.contains('tilt')) {
        const rx = ((y / r.height) - 0.5) * -6, ry = ((x / r.width) - 0.5) * 6;
        target.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
      }
    };
    const onLeave = () => { reset(active); active = null; };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); };
  }, []);
  return null;
}
