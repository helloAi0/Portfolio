'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LamoMark } from '@/components/brand/LamoMark';
import { useNow } from '@/components/ui/LiveClock';
import { Bot, Cpu, Code2, ShieldCheck, Award, GitBranch, Rocket, Brain, Terminal, Briefcase, Compass, Camera, Wifi, BatteryFull, Signal } from 'lucide-react';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIn = (t: number) => t * t * t;

/** First-person story. The caption voice is the owner's ("I"). Nothing here states a fact about his work beyond his own About text. */
const BEATS = [
  { at: 0, big: '', small: '' },
  { at: 0.12, big: "I'm not.", small: 'A screen is the only light in the room.' },
  { at: 0.3, big: 'Robots to simulate.\nAgents to build.\nSystems to secure.', small: 'This is what is waiting on my phone.' },
  { at: 0.5, big: 'One tap.', small: 'Let me show you.' },
];

const NOTES = [
  { icon: Cpu, app: 'ROBOTICS', text: 'A simulation is waiting to run.' },
  { icon: Brain, app: 'AGENTIC AI', text: 'The agent has a new idea.' },
  { icon: ShieldCheck, app: 'SECURITY', text: 'Think like an attacker. Build like a defender.' },
  { icon: Bot, app: 'LAMO', text: 'Your portfolio is ready.', accent: true },
];

const APPS = [
  { i: Code2, l: 'Code' }, { i: GitBranch, l: 'Git' }, { i: Cpu, l: 'Robots' }, { i: Brain, l: 'AI' },
  { i: ShieldCheck, l: 'Secure' }, { i: Terminal, l: 'Shell' }, { i: Award, l: 'Certs' }, { i: Briefcase, l: 'Work' },
  { i: Rocket, l: 'Ship' }, { i: Compass, l: 'Journey' }, { i: Camera, l: 'Demos' }, { i: 'LAMO', l: 'LAMO' },
] as const;
const LAMO_IDX = 11;
// LAMO icon centre inside the phone, in % of phone width/height (4-col grid, 3rd row, 4th col)
const OX = 0.81, OY = 0.392;

function clockFor(d: Date | null) {
  if (!d) return { hm: '', ampm: '', day: '', night: true, hour: 23 };
  const h = d.getHours();
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(d);
  const hm = `${parts.find((x) => x.type === 'hour')!.value}:${parts.find((x) => x.type === 'minute')!.value}`;
  const ampm = (parts.find((x) => x.type === 'dayPeriod')?.value || '').toUpperCase();
  const part = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  return { hm, ampm, day: `${d.toLocaleDateString('en-US', { weekday: 'long' })} ${part}`, night: h >= 22 || h < 5, hour: h };
}

export function PrologueScene() {
  const outer = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);
  const [vp, setVp] = useState({ w: 1440, h: 900 });

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let raf = 0;
    const update = () => {
      raf = 0;
      setVp({ w: window.innerWidth, h: window.innerHeight });
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
  const q = still ? 0.45 : p;

  // geometry (px) so the zoom can centre the LAMO icon exactly
  const phoneH = vp.h * 0.94;
  const phoneW = Math.min(phoneH * 0.47, vp.w * 0.86);
  const left = (vp.w - phoneW) / 2;
  const top = vp.h * 0.12;
  const iconX = left + OX * phoneW, iconY = top + OY * phoneH;
  const zoomT = clamp((q - 0.6) / 0.3);
  const zE = easeIn(zoomT);
  const iconSize = phoneW * 0.17;
  const S = 1 + (Math.max(vp.w, vp.h) / iconSize * 1.25 - 1) * zE;
  const dx = (vp.w / 2 - iconX) * zE, dy = (vp.h / 2 - iconY) * zE;
  const tilt = 1 - smooth(0.5, 0.65, q);

  const now = useNow(5000);
  const ck = clockFor(now);
  const timeBig = ck.hm ? `${ck.hm} ${ck.ampm}.` : '';
  const timeSmall = ck.night ? 'Everyone else is asleep.' : ck.hour < 12 ? 'The day is only starting.' : ck.hour < 17 ? 'The afternoon is quiet.' : 'The day is winding down.';
  const found = [...BEATS].reverse().find((b) => q >= b.at)!;
  const beat = found.at === 0 ? { ...found, big: timeBig || '\u00a0', small: timeSmall } : found.at === 0.12 && !ck.night ? { ...found, big: "I'm building.", small: 'A screen is the only light I need.' } : found;
  const lockOut = smooth(0.4, 0.5, q);
  const bloom = smooth(0.86, 0.96, q);
  const dark = smooth(0.96, 1, q);
  const capFade = 1 - smooth(0.62, 0.7, q);

  return (
    <div ref={outer} style={{ height: still ? 'auto' : '560vh' }} className="relative bg-[#04050a]" aria-label="Prologue">
      <div className={(still ? 'relative h-[100vh]' : 'sticky top-0 h-screen') + ' overflow-hidden'}>
        <Room p={q} />

        {/* phone, held at the bottom of the frame like a first-person shot */}
        <div
          className="absolute"
          style={{
            left, top, width: phoneW, height: phoneH, transformOrigin: `${OX * 100}% ${OY * 100}%`,
            transform: `translate(${dx}px, ${dy}px) scale(${S}) perspective(1200px) rotateX(${7 * tilt}deg) rotateZ(${-2 * tilt}deg)`,
          }}
        >
          <Phone p={q} lockOut={lockOut} phoneW={phoneW} hm={ck.hm} day={ck.day} />
          <Fingers />
        </div>

        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ opacity: bloom, background: 'radial-gradient(circle at 50% 50%, #fff3cf 0%, #f3c969 40%, #7a5a14 90%)' }} />
        <div aria-hidden className="absolute inset-0 pointer-events-none bg-[#08090c]" style={{ opacity: dark }} />
        {/* vignette */}
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(0,0,0,.75) 100%)', opacity: 1 - bloom }} />

        {/* captions */}
        <div className="absolute inset-0 pointer-events-none flex items-end sm:items-center px-5 sm:px-14 pb-20 sm:pb-0" style={{ opacity: capFade }}>
          <div key={beat.big} className="max-w-[18rem] sm:max-w-lg anim-cap">
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mb-3">Prologue</p>
            <p className="whitespace-pre-line font-serif font-black text-white leading-[1.08] text-3xl sm:text-5xl [text-shadow:0_4px_40px_rgba(0,0,0,.9)]">{beat.big}</p>
            <p className="mt-4 text-sm sm:text-base text-neutral-300 [text-shadow:0_2px_20px_rgba(0,0,0,.9)]">{beat.small}</p>
          </div>
        </div>

        <div className="absolute top-24 right-4 sm:right-10 flex items-center gap-4 z-10">
          <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-400" aria-hidden>{q < 0.05 ? 'Scroll ↓' : ''}</span>
          <button type="button" onClick={skip} className="px-3 py-1.5 rounded-full border border-white/15 text-[11px] font-mono text-neutral-300 hover:border-gold-500/60 hover:text-gold-300 bg-black/40 backdrop-blur">Skip intro</button>
        </div>
      </div>
    </div>
  );
}

/** A dark bedroom: window glow, dust and soft out-of-focus lights drifting as you scroll. */
function Room({ p }: { p: number }) {
  const blobs = [
    { x: 8, y: 20, s: 140, c: 'rgba(212,175,55,.22)' }, { x: 88, y: 16, s: 190, c: 'rgba(80,110,220,.25)' },
    { x: 78, y: 70, s: 120, c: 'rgba(212,175,55,.16)' }, { x: 14, y: 78, s: 170, c: 'rgba(90,70,200,.2)' },
    { x: 94, y: 48, s: 90, c: 'rgba(255,220,140,.18)' }, { x: 4, y: 50, s: 110, c: 'rgba(120,160,255,.16)' },
  ];
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,#10142b_0%,#05060d_70%)]" />
      {/* window light shaft */}
      <div className="absolute -top-10 right-[6%] w-[30vw] h-[120%] origin-top" style={{ background: 'linear-gradient(180deg, rgba(120,150,255,.16), transparent 70%)', transform: 'skewX(-14deg)', filter: 'blur(18px)' }} />
      {blobs.map((b, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.s, height: b.s, background: `radial-gradient(circle, ${b.c}, transparent 70%)`, filter: 'blur(6px)', transform: `translate3d(${(i % 2 ? -1 : 1) * p * 60}px, ${p * (i % 3 + 1) * -50}px, 0)` }} />
      ))}
      {Array.from({ length: 26 }).map((_, i) => (
        <span key={i} className="absolute rounded-full bg-white/50 dust" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, width: 2 + (i % 3), height: 2 + (i % 3), animationDelay: `${(i % 9) * -1.3}s`, opacity: 0.15 + (i % 4) * 0.08 }} />
      ))}
    </div>
  );
}

function Fingers() {
  // Dark finger/thumb silhouettes with a warm rim light from the screen, gripping the phone edges.
  const f = (style: React.CSSProperties) => <span className="absolute rounded-[40%] bg-gradient-to-b from-[#1a1612] to-[#07070a]" style={{ boxShadow: 'inset 0 0 14px rgba(255,200,120,.18), 0 0 30px rgba(0,0,0,.8)', ...style }} />;
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      {f({ left: '-11%', top: '58%', width: '15%', height: '9%', transform: 'rotate(-8deg)' })}
      {f({ left: '-12%', top: '69%', width: '16%', height: '9%', transform: 'rotate(-4deg)' })}
      {f({ left: '-10%', top: '80%', width: '14%', height: '8.5%', transform: 'rotate(0deg)' })}
      {f({ right: '-14%', top: '66%', width: '20%', height: '12%', transform: 'rotate(18deg)' })}
    </div>
  );
}

function Phone({ p, lockOut, phoneW, hm, day }: { p: number; lockOut: number; phoneW: number; hm: string; day: string }) {
  const u = phoneW / 100; // 1% of phone width in px
  const ripple = smooth(0.55, 0.6, p) * (1 - smooth(0.6, 0.66, p));
  const lamoGlow = smooth(0.46, 0.55, p);
  return (
    <div className="absolute inset-0 rounded-[11%/5%] p-[2.2%]" style={{ background: 'linear-gradient(145deg,#2a2c36,#0c0d12)', boxShadow: '0 0 0 1.5px #3b3f50, 0 0 90px rgba(255,200,110,.35), 0 40px 120px rgba(0,0,0,.9)' }}>
      <div className="relative w-full h-full overflow-hidden rounded-[9.5%/4.4%]" style={{ background: 'linear-gradient(170deg,#1b2350 0%,#0b0d22 45%,#3a2a0a 100%)' }}>
        {/* status bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-[7%] pt-[3.2%] text-white/90" style={{ fontSize: u * 3.6 }}>
          <span className="font-semibold">{hm}</span>
          <span className="absolute left-1/2 -translate-x-1/2 top-[1.6%] rounded-full bg-black" style={{ width: u * 26, height: u * 7 }} />
          <span className="flex items-center gap-1"><Signal style={{ width: u * 4.2, height: u * 4.2 }} /><Wifi style={{ width: u * 4.2, height: u * 4.2 }} /><BatteryFull style={{ width: u * 5.5, height: u * 5.5 }} /></span>
        </div>

        {/* LOCK SCREEN */}
        {lockOut < 1 && (
          <div className="absolute inset-0" style={{ transform: `translateY(${-lockOut * 100}%)`, opacity: 1 - lockOut * 0.6 }}>
            <div className="text-center text-white" style={{ paddingTop: u * 20 }}>
              <p className="opacity-70" style={{ fontSize: u * 4.2 }}>{day}</p>
              <p className="font-light tracking-tight leading-none" style={{ fontSize: u * 24 }}>{hm}</p>
            </div>
            <div className="absolute left-[5%] right-[5%] space-y-[2.2%]" style={{ top: '38%' }}>
              {NOTES.map((n, i) => {
                const t = smooth(0.1 + i * 0.07, 0.17 + i * 0.07, p);
                const Icon = n.icon;
                return (
                  <div key={n.app} className="flex items-center rounded-2xl backdrop-blur-md"
                    style={{ gap: u * 3, padding: u * 3.4, opacity: t, transform: `translateY(${(1 - t) * 30}px) scale(${0.96 + t * 0.04})`, background: n.accent ? 'linear-gradient(135deg,rgba(243,201,105,.95),rgba(217,154,43,.92))' : 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.14)', color: n.accent ? '#2b1d05' : '#fff', boxShadow: n.accent ? '0 0 40px rgba(243,201,105,.5)' : 'none' }}>
                    <span className="shrink-0 rounded-xl flex items-center justify-center" style={{ width: u * 11, height: u * 11, background: n.accent ? '#2b1d05' : 'rgba(255,255,255,.14)' }}>
                      <Icon style={{ width: u * 6, height: u * 6, color: n.accent ? '#f3c969' : '#f3c969' }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono tracking-widest opacity-70" style={{ fontSize: u * 2.7 }}>{n.app} · now</span>
                      <span className="block font-semibold leading-snug" style={{ fontSize: u * 4 }}>{n.text}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="absolute bottom-[4%] left-0 right-0 text-center text-white/60" style={{ fontSize: u * 3.4, opacity: smooth(0.3, 0.38, p) * (1 - lockOut) }}>swipe up</p>
          </div>
        )}

        {/* HOME SCREEN */}
        <div className="absolute inset-0" style={{ opacity: lockOut, transform: `scale(${0.94 + lockOut * 0.06})` }}>
          <div className="grid grid-cols-4 gap-y-[3.2%] px-[6%]" style={{ paddingTop: u * 22 }}>
            {APPS.map((a, idx) => {
              const isLamo = idx === LAMO_IDX;
              const Icon = (isLamo ? Bot : a.i) as React.ComponentType<{ style?: React.CSSProperties }>;
              return (
                <div key={a.l} className="flex flex-col items-center" style={{ gap: u * 1.4 }}>
                  <span className="flex items-center justify-center" style={{
                    width: u * 17, height: u * 17, borderRadius: u * 4.2,
                    background: isLamo ? 'linear-gradient(145deg,#ffe9b0,#e3a93a)' : 'linear-gradient(145deg,rgba(255,255,255,.2),rgba(255,255,255,.07))',
                    border: '1px solid rgba(255,255,255,.15)',
                    boxShadow: isLamo ? `0 0 ${u * 12 * lamoGlow}px rgba(255,210,110,${0.4 + lamoGlow * 0.5})` : 'none',
                    transform: isLamo ? `scale(${1 + ripple * 0.08})` : undefined,
                  }}>
                    {isLamo
                      ? <LamoMark size={u * 11} tone="dark" />
                      : <Icon style={{ width: u * 8, height: u * 8, color: '#f3c969' }} />}
                  </span>
                  <span className="text-white/85" style={{ fontSize: u * 3 }}>{a.l}</span>
                </div>
              );
            })}
          </div>
          {/* touch ripple on LAMO */}
          <span aria-hidden className="absolute rounded-full border-2 border-white/80" style={{ left: `${OX * 100 - 2.2 * 0}%`, top: `${OY * 100 - 2.2}%`, width: u * 24, height: u * 24, opacity: ripple, transform: `translate(-50%, -50%) scale(${0.4 + ripple * 0.8})` }} />
        </div>
      </div>
    </div>
  );
}
