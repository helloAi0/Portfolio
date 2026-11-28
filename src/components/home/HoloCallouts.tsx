'use client';
import React from 'react';

export const CALLOUT_IDS = [['ai', 'Agentic AI'], ['sim', 'Robotics Sim'], ['sec', 'Security']] as const;

/** Place HUD callouts at screen positions computed by the 3D scene. */
export function applyCallouts(root: HTMLElement | null, labels: Array<{ id: string; x: number; y: number; o: number }> | undefined) {
  if (!root) return;
  if (!labels) { root.querySelectorAll<HTMLElement>('[data-callout]').forEach((el) => { el.style.opacity = '0'; }); return; }
  for (const l of labels) {
    const el = root.querySelector<HTMLElement>(`[data-callout="${l.id}"]`);
    if (!el) continue;
    el.style.opacity = String(l.o);
    el.style.transform = `translate(${l.x}px, ${l.y}px)`;
  }
}

export const HoloCallouts = React.forwardRef<HTMLDivElement>(function HoloCallouts(_, ref) {
  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {CALLOUT_IDS.map(([id, text]) => (
        <div key={id} data-callout={id} className="absolute left-0 top-0 opacity-0 will-change-transform">
          <div className="flex items-center gap-2 -translate-y-1/2">
            <span className="w-8 h-px bg-cyan-300/80" />
            <span className="px-2.5 py-1 border border-cyan-300/50 bg-[#04121a]/70 backdrop-blur-sm text-[11px] font-mono uppercase tracking-[0.18em] text-cyan-100 whitespace-nowrap">{text}</span>
          </div>
        </div>
      ))}
    </div>
  );
});
