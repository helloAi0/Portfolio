'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Lock, Eye, ArrowRight } from 'lucide-react';

/**
 * The front door. A small robot rises off a glowing platform, greets you, and opens a hologram
 * screen with two doors: the owner's sign-in, or the story for visitors.
 */
export function GateScene() {
  const [stage, setStage] = useState(0); // 0 dark, 1 platform, 2 robot, 3 screen, 4 choices
  const [typed, setTyped] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hud = useRef<HTMLDivElement>(null);
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
    if (stage < 1 || !canvasRef.current) return;
    let handle: { dispose: () => void } | null = null;
    let cancelled = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    import('@/lib/three/robotArm').then(({ createRobotArm }) => {
      if (cancelled || !canvasRef.current) return;
      try {
        handle = createRobotArm({
          canvas: canvasRef.current, reduceMotion: reduce,
          onTelemetry: (t) => {
            const root = hud.current; if (!root) return;
            t.q.forEach((v, i) => {
              const bar = root.querySelector<HTMLElement>(`[data-q="${i}"]`); const val = root.querySelector(`[data-qv="${i}"]`);
              if (bar) bar.style.width = `${Math.min(100, Math.abs(v) / 180 * 100)}%`;
              if (val) val.textContent = `${v.toFixed(0)}°`;
            });
            const w = root.querySelector<HTMLElement>('[data-w]'); if (w) { w.style.width = `${t.manipulability * 100}%`; w.dataset.low = t.manipulability < 0.2 ? '1' : '0'; }
            const wv = root.querySelector('[data-wv]'); if (wv) wv.textContent = t.manipulability.toFixed(2);
            const xyz = root.querySelector('[data-xyz]'); if (xyz) xyz.textContent = `tip  x ${t.tip[0].toFixed(2)}  y ${t.tip[1].toFixed(2)}  z ${t.tip[2].toFixed(2)}`;
            const st = root.querySelector<HTMLElement>('[data-state]');
            if (st) { st.textContent = t.clamped ? 'TARGET OUT OF REACH' : t.manipulability < 0.2 ? 'NEAR SINGULARITY' : t.error < 0.05 ? 'ON TARGET' : 'TRACKING'; st.dataset.warn = t.clamped || t.manipulability < 0.2 ? '1' : '0'; }
          },
        });
      } catch { /* WebGL unavailable: the two doors still work */ }
    });
    return () => { cancelled = true; handle?.dispose(); };
  }, [stage >= 1]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div role="main" id="main-content" className="gate" data-stage={stage} aria-label="Choose how to enter">
      <div className="gate-glow" aria-hidden />
      <div className="gate-floor" aria-hidden />
      <div className="gate-dust" aria-hidden>
        {Array.from({ length: 26 }).map((_, i) => (
          <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * -1.3}s`, animationDuration: `${7 + (i % 6)}s`, height: `${6 + (i % 5) * 5}px` }} />
        ))}
      </div>


      <div className="gate-layout">
        {/* left: a live 6-DOF arm (inverse kinematics) */}
        <div className="gate-robot-col">
          <div className="gate-arm">
            <canvas ref={canvasRef} className="gate-canvas" aria-label="A simulated six-axis robot arm tracking your cursor with live inverse kinematics" role="img" />
            <div className="gate-hud" ref={hud} aria-hidden>
              <p className="hud-title">6-DOF ARM · LIVE IK</p>
              <p className="hud-sub">Simulated in your browser. Damped least squares, numerical Jacobian.</p>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div className="hud-row" key={n}><span>q{n}</span><i><b data-q={n - 1} /></i><em data-qv={n - 1}>0°</em></div>
              ))}
              <div className="hud-row"><span>w</span><i><b data-w /></i><em data-wv>0.00</em></div>
              <p className="hud-xyz" data-xyz>tip x 0.00 y 0.00 z 0.00</p>
              <p className="hud-state" data-state>BOOTING</p>
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
