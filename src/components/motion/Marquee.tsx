import React from 'react';

/** Infinite ticker (pure CSS). Pauses on hover; static when reduced motion is requested. */
export function Marquee({ items, ariaLabel }: { items: string[]; ariaLabel: string }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={`${t}-${i}`} className="flex items-center gap-10 whitespace-nowrap">
          <span className="font-serif text-lg sm:text-2xl tracking-wide text-neutral-300">{t}</span>
          <span className="w-1.5 h-1.5 rotate-45 bg-gold-500/70" />
        </li>
      ))}
    </ul>
  );
  return (
    <div role="region" aria-label={ariaLabel} className="marquee relative overflow-hidden py-6 border-y border-gold-500/10 bg-imperial-950/60">
      <div className="marquee-track flex w-max">{row(false)}{row(true)}</div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#08090c] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#08090c] to-transparent" />
    </div>
  );
}
