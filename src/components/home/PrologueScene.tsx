'use client';

import React, { useEffect, useRef, useState } from 'react';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const easeIn = (t: number) => t * t * t;
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const CAPTIONS = [
  { at: 0, text: 'Kolkata. Late at night.' },
  { at: 0.2, text: 'One small screen. A lot of ideas about AI, robots and secure systems.' },
  { at: 0.5, text: 'Let me show you what happens when he builds them.' },
];
const SCREEN_LINES = ['Hello.', "I'm Taha.", 'Come inside.'];

/**
 * Prologue: a pinned scroll scene. A person sits on a bed, lit by a phone. Scrolling pushes the camera
 * into the phone; the screen fills the view and opens into the portfolio. Original illustration (SVG).
 */
export function PrologueScene() {
  const outer = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      setP(clamp(-r.top / ((r.height - window.innerHeight) || 1)));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const skip = () => document.getElementById('portfolio-hero')?.scrollIntoView({ behavior: 'smooth' });

  const zoomT = clamp((p - 0.28) / 0.57);
  const scale = still ? 1 : 1 + 15 * easeIn(zoomT);
  const cap = [...CAPTIONS].reverse().find((c) => p >= c.at)!;
  const typed = (() => {
    const n = Math.floor(clamp((p - 0.12) / 0.5) * SCREEN_LINES.join('\n').length);
    return SCREEN_LINES.join('\n').slice(0, n);
  })();
  const bloom = smooth(0.74, 0.93, p);
  const dark = smooth(0.93, 1, p);
  const screenFade = 1 - smooth(0.7, 0.82, p);

  return (
    <div ref={outer} style={{ height: still ? 'auto' : '480vh' }} className="relative bg-[#070810]" aria-label="Prologue">
      <div className={(still ? 'relative h-[80vh]' : 'sticky top-0 h-screen') + ' overflow-hidden'} style={{ ['--w' as string]: 'max(100vw, 160vh)' }}>
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: 'var(--w)', height: 'calc(var(--w) * 0.625)', transformOrigin: '50% 55.5%',
            transform: `translate(-50%, -50%) translateY(calc(var(--w) * -0.034 * ${zoomT})) scale(${scale})`,
          }}
        >
          <RoomSvg />
          {/* Phone screen (rotated with the phone) */}
          <div className="absolute overflow-hidden" aria-hidden style={{
            left: '47.4%', top: '47.3%', width: '5.2%', height: '14.2%', transform: 'rotate(10deg)', borderRadius: 'calc(var(--w) * 0.004)',
            background: 'linear-gradient(160deg,#fff1c9,#f3c969 55%,#d99a2b)', boxShadow: '0 0 calc(var(--w)*0.06) rgba(255,200,90,.65)',
          }}>
            <div className="absolute inset-0 flex flex-col justify-center whitespace-pre-line font-serif font-black text-[#2b1d05]" style={{ opacity: screenFade, padding: '12%', fontSize: 'calc(var(--w) * 0.0072)', lineHeight: 1.25 }}>
              <span className="block font-mono font-normal opacity-70" style={{ fontSize: 'calc(var(--w) * 0.0036)' }}>LAMO · now</span>
              {typed}<span className="animate-pulse">|</span>
            </div>
          </div>
        </div>

        {/* gold bloom then dark, handing over to the hall */}
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ opacity: bloom, background: 'radial-gradient(circle at 50% 50%, #fff3cf 0%, #f3c969 35%, #7a5a14 80%)' }} />
        <div aria-hidden className="absolute inset-0 pointer-events-none bg-[#08090c]" style={{ opacity: dark }} />

        {/* captions */}
        <div className="absolute left-0 right-0 bottom-0 p-6 sm:p-12 pointer-events-none" style={{ opacity: 1 - smooth(0.62, 0.72, p) }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mb-3">Prologue</p>
          <p key={cap.text} className="max-w-xl font-serif text-2xl sm:text-4xl text-white leading-snug [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">{cap.text}</p>
        </div>

        <div className="absolute top-24 right-4 sm:right-10 flex items-center gap-4">
          <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500" aria-hidden>{p < 0.05 ? 'Scroll ↓' : ''}</span>
          <button type="button" onClick={skip} className="px-3 py-1.5 rounded-full border border-white/15 text-[11px] font-mono text-neutral-300 hover:border-gold-500/60 hover:text-gold-300 bg-black/30 backdrop-blur">Skip intro</button>
        </div>
      </div>
    </div>
  );
}

/** Original illustration: a night room, a person on a bed lit by a phone. */
function RoomSvg() {
  return (
    <svg viewBox="0 0 1600 1000" className="absolute inset-0 w-full h-full" role="img" aria-label="A young man sits on his bed at night, his face lit by his phone.">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a0c1a" /><stop offset="1" stopColor="#151833" /></linearGradient>
        <linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10224d" /><stop offset="1" stopColor="#2a2f66" /></linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffd98a" stopOpacity=".75" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></radialGradient>
        <linearGradient id="beam" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ffd98a" stopOpacity=".5" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#wall)" />
      {/* window with moon and skyline */}
      <g>
        <rect x="1150" y="130" width="330" height="390" rx="10" fill="url(#win)" stroke="#6b5a2a" strokeWidth="6" />
        <circle cx="1330" cy="240" r="34" fill="#e8ecff" opacity=".9" /><circle cx="1344" cy="232" r="30" fill="#10224d" />
        {[[1200, 190], [1260, 300], [1400, 180], [1430, 330], [1220, 400]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#fff" opacity=".8" />)}
        <polygon points="1156,520 1156,430 1196,430 1196,380 1232,380 1232,450 1262,450 1262,360 1306,360 1306,470 1342,470 1342,410 1382,410 1382,500 1474,500 1474,520" fill="#070810" />
        <line x1="1315" y1="130" x2="1315" y2="520" stroke="#6b5a2a" strokeWidth="4" /><line x1="1150" y1="325" x2="1480" y2="325" stroke="#6b5a2a" strokeWidth="4" />
      </g>
      {/* wall poster: a robot arm (line art) */}
      <g stroke="#e0b550" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".7">
        <rect x="160" y="170" width="250" height="320" rx="6" stroke="#6b5a2a" />
        <path d="M200 450 h170 M285 450 v-70 l70 -60 l-20 -60" /><circle cx="285" cy="380" r="12" /><circle cx="355" cy="320" r="12" /><path d="M335 260 l-24 -14 M335 260 l22 -18" />
      </g>
      {/* bed */}
      <rect x="0" y="735" width="1600" height="265" fill="#0f1124" />
      <rect x="90" y="650" width="1150" height="140" rx="30" fill="#1c2147" />
      <path d="M90 700 H1240 V790 H90 z" fill="#232a5c" />
      <ellipse cx="240" cy="640" rx="130" ry="46" fill="#2b3370" />
      {/* person (facing right, looking down at the phone) */}
      <g className="proto-bob">
        <path d="M560 690 C545 600 575 520 650 495 L720 520 L700 700 z" fill="#35457f" />
        <path d="M650 495 L720 520" stroke="#ffd98a" strokeOpacity=".55" strokeWidth="6" />
        <path d="M600 700 C700 700 780 705 840 740" stroke="#24305f" strokeWidth="78" strokeLinecap="round" fill="none" />
        <path d="M840 742 L850 800" stroke="#24305f" strokeWidth="56" strokeLinecap="round" />
        <rect x="705" y="470" width="44" height="40" fill="#d9a07a" />
        <circle cx="720" cy="430" r="58" fill="#e1a983" />
        <path d="M660 425 C655 360 730 352 775 395 C750 385 715 390 690 415 C680 430 672 440 660 425 z" fill="#1b1424" />
        <circle cx="755" cy="440" r="5" fill="#2a1a12" />
        <path d="M672 520 C690 560 740 560 782 545" stroke="#35457f" strokeWidth="34" strokeLinecap="round" fill="none" />
        <circle cx="795" cy="552" r="19" fill="#e1a983" />
      </g>
      {/* phone body + glow + light on the face */}
      <circle cx="800" cy="560" r="230" fill="url(#glow)" />
      <polygon points="800,545 770,445 735,430 760,500" fill="url(#beam)" opacity=".8" />
      <rect x="752" y="466" width="96" height="156" rx="12" transform="rotate(10 800 544)" fill="#111320" />
    </svg>
  );
}
