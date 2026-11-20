'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Lock, Eye, ArrowRight } from 'lucide-react';
import { LamoMark } from '@/components/brand/LamoMark';

/**
 * The front door. A small robot rises off a glowing platform, greets you, and opens a hologram
 * screen with two doors: the owner's sign-in, or the story for visitors.
 */
export function GateScene() {
  const [stage, setStage] = useState(0); // 0 dark, 1 platform, 2 robot, 3 screen, 4 choices
  const [typed, setTyped] = useState('');
  const rig = useRef<HTMLDivElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const LINE = 'Hello. Who is walking in?';

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm) { setStage(4); setTyped(LINE); return; }
    const t = [
      setTimeout(() => setStage(1), 250),
      setTimeout(() => setStage(2), 1100),
      setTimeout(() => setStage(3), 2600),
      setTimeout(() => setStage(4), 3500),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (stage < 3) return;
    let i = 0;
    const id = setInterval(() => { i += 1; setTyped(LINE.slice(0, i)); if (i >= LINE.length) clearInterval(id); }, 38);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        if (rig.current) rig.current.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 8}deg)`;
        if (eyes.current) eyes.current.style.transform = `translate(${x * 9}px, ${y * 5}px)`;
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div role="main" id="main-content" className="gate" data-stage={stage} aria-label="Choose how to enter">
      <div className="gate-glow" aria-hidden />
      <div className="gate-floor" aria-hidden />
      <div className="gate-dust" aria-hidden>
        {Array.from({ length: 26 }).map((_, i) => (
          <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * -1.3}s`, animationDuration: `${7 + (i % 6)}s`, height: `${6 + (i % 5) * 5}px` }} />
        ))}
      </div>

      <header className="gate-brand">
        <LamoMark size={30} />
        <span>PROJECT LAMO</span>
      </header>

      <div className="gate-layout">
        {/* left: the robot on its platform */}
        <div className="gate-robot-col">
          <div className="gate-persp">
            <div className="gate-pad" aria-hidden>
              <span className="r r1" /><span className="r r2" /><span className="r r3" /><span className="r r4" /><span className="core" />
            </div>
            <div className="gate-beam" aria-hidden />
            <div className="gate-rig" ref={rig}>
              <div className="gate-bot">
                <svg viewBox="0 0 240 340" width="100%" role="img" aria-label="A friendly white robot with glowing gold eyes">
                  <defs>
                    <radialGradient id="gb-shell" cx="35%" cy="28%" r="80%">
                      <stop offset="0" stopColor="#ffffff" />
                      <stop offset="0.55" stopColor="#dfe3f2" />
                      <stop offset="1" stopColor="#8d93b8" />
                    </radialGradient>
                    <linearGradient id="gb-visor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#1b1740" />
                      <stop offset="1" stopColor="#0a0820" />
                    </linearGradient>
                    <radialGradient id="gb-eye" cx="50%" cy="50%" r="50%">
                      <stop offset="0" stopColor="#fff6c8" />
                      <stop offset="0.5" stopColor="#ffc933" />
                      <stop offset="1" stopColor="#ff9a1f" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="gb-gold" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#ffe48a" />
                      <stop offset="1" stopColor="#d9992a" />
                    </linearGradient>
                  </defs>
                  {/* thruster glow */}
                  <ellipse cx="120" cy="322" rx="34" ry="8" fill="#ffb12e" opacity="0.55" />
                  <path d="M96 262 Q120 330 144 262 Z" fill="url(#gb-gold)" opacity="0.85" />
                  {/* torso */}
                  <path d="M62 190 Q60 120 120 118 Q180 120 178 190 Q176 268 120 272 Q64 268 62 190Z" fill="url(#gb-shell)" />
                  <path d="M80 160 Q120 148 160 160" stroke="#b9bedc" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <circle cx="120" cy="205" r="17" fill="url(#gb-visor)" stroke="url(#gb-gold)" strokeWidth="3" />
                  <circle cx="120" cy="205" r="7" fill="#ffc933" />
                  <path d="M104 196 L120 226 M136 196 L120 226" stroke="none" />
                  {/* neck */}
                  <rect x="100" y="104" width="40" height="22" rx="8" fill="#9aa0c6" />
                  <rect x="96" y="112" width="48" height="8" rx="4" fill="url(#gb-gold)" />
                  {/* head */}
                  <ellipse cx="120" cy="70" rx="64" ry="58" fill="url(#gb-shell)" />
                  <ellipse cx="46" cy="72" rx="9" ry="20" fill="#b3b8da" />
                  <ellipse cx="194" cy="72" rx="9" ry="20" fill="#b3b8da" />
                  <rect x="48" y="44" width="144" height="56" rx="28" fill="url(#gb-visor)" />
                  <path d="M60 52 Q120 38 180 52" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <g ref={eyes} className="gate-eyes">
                    <circle cx="94" cy="72" r="15" fill="url(#gb-eye)" />
                    <circle cx="146" cy="72" r="15" fill="url(#gb-eye)" />
                    <circle cx="94" cy="72" r="6" fill="#fff6c8" />
                    <circle cx="146" cy="72" r="6" fill="#fff6c8" />
                  </g>
                  {/* antenna */}
                  <line x1="120" y1="12" x2="120" y2="-2" stroke="#9aa0c6" strokeWidth="4" />
                  <circle cx="120" cy="0" r="6" fill="#ffc933" className="gate-bulb" />
                  {/* floating hands */}
                  <g className="gate-hand l">
                    <ellipse cx="34" cy="204" rx="19" ry="23" fill="url(#gb-shell)" />
                    <rect x="22" y="212" width="24" height="9" rx="4.5" fill="url(#gb-gold)" />
                  </g>
                  <g className="gate-hand r">
                    <ellipse cx="206" cy="204" rx="19" ry="23" fill="url(#gb-shell)" />
                    <rect x="194" y="212" width="24" height="9" rx="4.5" fill="url(#gb-gold)" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* right: the hologram screen */}
        <div className="gate-screen-col">
          <div className="gate-screen">
            <div className="gate-screen-in">
              <p className="gate-kicker">LAMO · front door</p>
              <p className="gate-line" aria-live="polite">{typed}<span className="gate-caret" aria-hidden /></p>
              <h1 className="gate-title">
                <span className="outline">TAHA</span>
                <span className="solid">UDAIPURWALA</span>
              </h1>
              <p className="gate-sub">AI · Robotics · Full-stack · Security. Choose how you want to come in.</p>

              <div className="gate-choices">
                <Link href="/story" className="gate-choice visitor">
                  <Eye className="w-5 h-5" aria-hidden />
                  <span>
                    <b>I&apos;m a visitor</b>
                    <em>Start the story</em>
                  </span>
                  <ArrowRight className="w-4 h-4 go" aria-hidden />
                </Link>
                <Link href="/admin/login" className="gate-choice owner">
                  <Lock className="w-5 h-5" aria-hidden />
                  <span>
                    <b>Owner sign-in</b>
                    <em>Taha Udaipurwala only</em>
                  </span>
                  <ArrowRight className="w-4 h-4 go" aria-hidden />
                </Link>
              </div>
              <Link href="/story#portfolio-hero" className="gate-skip">Skip the intro, go straight to the portfolio →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
