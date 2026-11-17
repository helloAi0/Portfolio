import React from 'react';

/** Static stand-in for the 3D hall when WebGL is unavailable: a marble colonnade in SVG. */
export function HallFallback() {
  const cols = [8, 20, 31, 41, 50];
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" role="img" aria-label="Marble colonnade">
      <defs>
        <radialGradient id="gate" cx="50%" cy="45%" r="40%">
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#d4af37" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="col" x1="0" x2="1">
          <stop offset="0" stopColor="#8d8470" />
          <stop offset="0.5" stopColor="#e6dfd0" />
          <stop offset="1" stopColor="#8d8470" />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill="#07080b" />
      <ellipse cx="50" cy="27" rx="22" ry="20" fill="url(#gate)" />
      {cols.map((x, i) => {
        const w = 6 - i * 0.9;
        return (
          <g key={x} opacity={0.55 + i * 0.09}>
            <rect x={x - w / 2} y={2 + i * 3} width={w} height={50 - i * 6} fill="url(#col)" />
            <rect x={100 - x - w / 2} y={2 + i * 3} width={w} height={50 - i * 6} fill="url(#col)" />
          </g>
        );
      })}
      <circle cx="50" cy="26" r="7" fill="none" stroke="#d4af37" strokeWidth="1.2" strokeDasharray="1.2 0.8" />
      <rect y="52" width="100" height="8" fill="#101116" />
    </svg>
  );
}
