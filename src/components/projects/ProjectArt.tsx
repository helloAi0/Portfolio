import React from 'react';

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rnd(seed: number) { let s = seed || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

/**
 * Deterministic "blueprint" artwork for a project that has no cover image yet: concentric rings, circuit traces
 * and a monogram, all derived from the slug so each project gets its own stable piece. It is decoration only and
 * is never presented as a screenshot of the project.
 */
export function ProjectArt({ slug, title, label }: { slug: string; title: string; label?: string }) {
  const r = rnd(hash(slug));
  const hue = 36 + Math.floor(r() * 22);
  const accent = `hsl(${hue} 80% 62%)`;
  const violet = `hsl(${252 + Math.floor(r() * 30)} 70% 60%)`;
  const rings = Array.from({ length: 5 }, (_, i) => ({ rad: 40 + i * 34 + r() * 14, dash: r() > 0.5, w: 0.8 + r() * 2.2, rot: Math.floor(r() * 360) }));
  const traces = Array.from({ length: 7 }, () => {
    let x = 20 + r() * 360, y = 60 + r() * 380; let d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
    const steps = 3 + Math.floor(r() * 3);
    for (let k = 0; k < steps; k++) { if (r() > 0.5) x += (r() - 0.5) * 160; else y += (r() - 0.5) * 160; x = Math.max(10, Math.min(390, x)); y = Math.max(10, Math.min(490, y)); d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; }
    return { d, x, y };
  });
  const mono = title.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'P';
  const id = `pa-${hash(slug)}`;
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full block" role="img" aria-label={`Abstract artwork for ${title}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1b1540" /><stop offset="1" stopColor="#07061a" /></linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="46%" r="55%"><stop offset="0" stopColor={accent} stopOpacity=".38" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
        <pattern id={`${id}-grid`} width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#fff" strokeOpacity=".05" /></pattern>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}-bg)`} />
      <rect width="400" height="500" fill={`url(#${id}-grid)`} />
      <rect width="400" height="500" fill={`url(#${id}-glow)`} />
      <g transform="translate(200 235)">
        {rings.map((c, i) => (<circle key={i} r={c.rad} fill="none" stroke={i % 2 ? violet : accent} strokeOpacity={0.55} strokeWidth={c.w} strokeDasharray={c.dash ? '3 9' : undefined} transform={`rotate(${c.rot})`} />))}
      </g>
      {traces.map((t, i) => (<g key={i}><path d={t.d} fill="none" stroke={i % 2 ? violet : accent} strokeOpacity=".55" strokeWidth="1.4" /><circle cx={t.x} cy={t.y} r="3.5" fill={accent} /></g>))}
      <text x="200" y="262" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="900" fontSize="120" fill="none" stroke={accent} strokeWidth="1.6" strokeOpacity=".9">{mono}</text>
      <text x="200" y="262" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="900" fontSize="120" fill={accent} fillOpacity=".12">{mono}</text>
      {label && <text x="200" y="470" textAnchor="middle" fontFamily="monospace" fontSize="11" letterSpacing="4" fill="#fff" fillOpacity=".55">{label.toUpperCase()}</text>}
    </svg>
  );
}
