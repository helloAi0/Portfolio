import React from 'react';

/**
 * LAMO agent icon: a small "core" (a four-point spark) held inside two tilted orbits, with a node travelling on one of them.
 * Original vector artwork. `thinking` speeds up the orbits and pulses the core (CSS only, respects reduced motion).
 */
export function AgentIcon({ size = 28, thinking = false, className = '' }: { size?: number; thinking?: boolean; className?: string }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`lamo-agent ${thinking ? 'is-thinking' : ''} ${className}`} role="img" aria-label="LAMO agent">
      <defs>
        <radialGradient id={`c${id}`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff6d6" /><stop offset=".55" stopColor="#f3c969" /><stop offset="1" stopColor="#c98a1b" /></radialGradient>
        <linearGradient id={`o${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe9b0" /><stop offset="1" stopColor="#7aa7ff" /></linearGradient>
      </defs>
      <g className="lamo-agent-orbit-a" style={{ transformOrigin: '24px 24px' }}>
        <ellipse cx="24" cy="24" rx="20" ry="8" fill="none" stroke={`url(#o${id})`} strokeWidth="1.4" opacity=".85" transform="rotate(-28 24 24)" />
        <circle cx="44" cy="24" r="2.4" fill="#ffe9b0" transform="rotate(-28 24 24)" />
      </g>
      <g className="lamo-agent-orbit-b" style={{ transformOrigin: '24px 24px' }}>
        <ellipse cx="24" cy="24" rx="20" ry="8" fill="none" stroke="#7aa7ff" strokeWidth="1" opacity=".5" transform="rotate(32 24 24)" />
        <circle cx="4" cy="24" r="1.7" fill="#9bbcff" transform="rotate(32 24 24)" />
      </g>
      <path className="lamo-agent-core" style={{ transformOrigin: '24px 24px' }} d="M24 12 C25.2 19 29 22.8 36 24 C29 25.2 25.2 29 24 36 C22.8 29 19 25.2 12 24 C19 22.8 22.8 19 24 12 Z" fill={`url(#c${id})`} />
    </svg>
  );
}
