'use client';

import React, { useEffect, useRef, useState } from 'react';

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>/{}[]#$%';

/** Falling-character backdrop. Purely visual; static when the visitor prefers reduced motion. */
export function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const g = c.getContext('2d'); if (!g) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, cols = 0, drops: number[] = [], raf = 0, last = 0;
    const FS = 16;
    const size = () => { const r = c.getBoundingClientRect(); w = c.width = r.width; h = c.height = r.height; cols = Math.ceil(w / FS); drops = Array.from({ length: cols }, () => Math.random() * -40); g.fillStyle = '#040807'; g.fillRect(0, 0, w, h); };
    size();
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 55) return; last = t;
      g.fillStyle = 'rgba(4,8,7,0.16)'; g.fillRect(0, 0, w, h);
      g.font = `${FS}px "JetBrains Mono", monospace`;
      for (let i = 0; i < cols; i++) {
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        g.fillStyle = Math.random() < 0.04 ? '#e6fff0' : 'rgba(57,255,136,0.75)';
        g.fillText(ch, i * FS, drops[i] * FS);
        if (drops[i] * FS > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 1;
      }
    };
    if (reduce) { for (let k = 0; k < 40; k++) { drops = drops.map((d) => d + 1); } } else raf = requestAnimationFrame(draw);
    window.addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, []);
  return <canvas ref={ref} aria-hidden className="absolute inset-0 w-full h-full opacity-50" />;
}

/** Text that resolves out of random characters, once, when it appears. */
export function Scramble({ text }: { text: string }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0; const total = 26;
    const id = setInterval(() => {
      i++;
      const keep = Math.floor((i / total) * text.length);
      setOut(text.split('').map((ch, k) => (ch === ' ' || ch === '\n' || k < keep ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join(''));
      if (i >= total) { clearInterval(id); setOut(text); }
    }, 45);
    return () => clearInterval(id);
  }, [text]);
  return <span aria-label={text}>{out}</span>;
}

const SCRIPT = (clock: string | null) => [
  { t: '$ whoami', r: 'visitor' },
  { t: '$ locate --target', r: 'Taha Udaipurwala · Kolkata, IN' },
  { t: '$ ls ./focus', r: 'ai-ml  robotics  agentic-ai  security' },
  { t: '$ open_channel --secure', r: 'handshake ......... OK' },
  { t: `$ date`, r: clock ? `${clock} IST` : 'now' },
  { t: '>', r: 'Channel open. Say something.' },
];

/** A fake terminal that "boots" the channel line by line. Decorative: nothing here touches the network. */
export function TerminalIntro({ clock }: { clock: string | null }) {
  const lines = SCRIPT(clock);
  const [n, setN] = useState(0);
  const [chars, setChars] = useState(0);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduce) { setN(lines.length); return; }
    if (n >= lines.length) return;
    const cur = lines[n];
    const full = cur.t.length + 1 + cur.r.length;
    if (chars < full) { const id = setTimeout(() => setChars((c) => c + 1), chars < cur.t.length ? 55 : 14); return () => clearTimeout(id); }
    const id = setTimeout(() => { setN((x) => x + 1); setChars(0); }, 380);
    return () => clearTimeout(id);
  }, [n, chars, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-lg border border-emerald-400/30 bg-[#050a08]/90 shadow-[0_0_60px_rgba(57,255,136,0.12)] overflow-hidden font-mono text-[13px] sm:text-sm" aria-hidden>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-400/20 bg-black/60">
        <span className="w-3 h-3 rounded-full bg-red-500/80" /><span className="w-3 h-3 rounded-full bg-amber-400/80" /><span className="w-3 h-3 rounded-full bg-emerald-400/80" />
        <span className="ml-3 text-emerald-300/70 text-xs">visitor@portfolio: ~/contact</span>
      </div>
      <div className="p-5 min-h-[20rem] leading-7">
        {lines.map((l, i) => {
          if (i > n) return null;
          const shown = i < n ? l.t.length + 1 + l.r.length : chars;
          const cmd = l.t.slice(0, Math.min(l.t.length, shown));
          const res = shown > l.t.length ? l.r.slice(0, shown - l.t.length - 1) : '';
          return (
            <div key={i}>
              <div className="text-emerald-300">{cmd}{i === n && shown <= l.t.length && <span className="inline-block w-2 h-4 bg-emerald-300 align-middle ml-0.5 animate-pulse" />}</div>
              {res && <div className="text-neutral-200 pl-3">{res}{i === n && <span className="inline-block w-2 h-4 bg-neutral-200 align-middle ml-0.5 animate-pulse" />}</div>}
            </div>
          );
        })}
        {n >= lines.length && <div className="text-emerald-300 mt-1">$ <span className="inline-block w-2 h-4 bg-emerald-300 align-middle animate-pulse" /></div>}
      </div>
    </div>
  );
}
