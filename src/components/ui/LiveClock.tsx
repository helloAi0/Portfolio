'use client';

import React, { useEffect, useState } from 'react';

function dayPart(h: number) { return h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'; }

/** Real, ticking time in the visitor's own time zone. Renders nothing until mounted (no hydration mismatch). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const id = setInterval(() => setNow(new Date()), intervalMs); return () => clearInterval(id); }, [intervalMs]);
  return now;
}

export function LiveClock({ className = '', seconds = true }: { className?: string; seconds?: boolean }) {
  const now = useNow();
  if (!now) return <span className={className} aria-hidden>--:--</span>;
  const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0'), ss = String(now.getSeconds()).padStart(2, '0');
  return <time className={className} dateTime={now.toISOString()}>{hh}:{mm}{seconds ? `:${ss}` : ''}</time>;
}

export function LiveDayLine({ className = '' }: { className?: string }) {
  const now = useNow(30000);
  if (!now) return null;
  const day = now.toLocaleDateString('en-IN', { weekday: 'long' });
  return <span className={className}>{day} {dayPart(now.getHours())} · {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>;
}
