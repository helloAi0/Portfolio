import React from 'react';

/**
 * The LAMO mark: a Greek capital lambda (Λ, the "L" of LAMO) whose apex is capped by a long top bar,
 * which turns the same shape into a "T" (for Taha). A small node sits at the right end of the bar,
 * like a point on a circuit. Original mark, drawn as vector so it stays sharp at any size.
 */
export function LamoMark({ size = 24, className = '', tone = 'gold' }: { size?: number; className?: string; tone?: 'gold' | 'dark' }) {
  const id = React.useId().replace(/:/g, '');
  const dark = tone === 'dark';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} role="img" aria-label="LAMO">
      <defs>
        <linearGradient id={`g${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0" stopColor={dark ? '#3a2a08' : '#ffe9b0'} /><stop offset="1" stopColor={dark ? '#1c1303' : '#d99a2b'} />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#g${id})`} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9 H29" />
        <path d="M17.5 9 L8 33" />
        <path d="M17.5 9 L27 33" />
      </g>
      <circle cx="33" cy="9" r="3" fill={dark ? '#3a2a08' : '#ffe9b0'} />
      <circle cx="33" cy="9" r="5.2" fill="none" stroke={dark ? '#3a2a08' : '#f3c969'} strokeOpacity=".45" strokeWidth="1" />
    </svg>
  );
}
