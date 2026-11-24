'use client';

import React, { useEffect, useRef, useState } from 'react';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const MAX_PAGES = 8;

type Doc = { pages: HTMLCanvasElement[]; ratio: number };

// pdf.js ships in /public (no npm install needed): loaded once, on demand
let pdfJsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib);
  if (!pdfJsPromise) pdfJsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = '/pdf.min.js'; s.async = true;
    s.onload = () => ((window as any).pdfjsLib ? resolve((window as any).pdfjsLib) : reject(new Error('pdf.js missing')));
    s.onerror = () => reject(new Error('pdf.js failed to load'));
    document.head.appendChild(s);
  });
  return pdfJsPromise;
}

async function renderPdf(url: string, targetW: number): Promise<Doc> {
  const pdfjs: any = await loadPdfJs();
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  const pdf = await pdfjs.getDocument({ url, withCredentials: false }).promise;
  const pages: HTMLCanvasElement[] = []; let ratio = 0.707;
  for (let i = 1; i <= Math.min(pdf.numPages, MAX_PAGES); i++) {
    const page = await pdf.getPage(i);
    const v0 = page.getViewport({ scale: 1 });
    const scale = targetW / v0.width;
    const v = page.getViewport({ scale });
    const c = document.createElement('canvas'); c.width = Math.floor(v.width); c.height = Math.floor(v.height);
    await page.render({ canvasContext: c.getContext('2d')!, viewport: v, background: '#ffffff' }).promise;
    if (i === 1) ratio = v0.width / v0.height;
    pages.push(c);
  }
  return { pages, ratio };
}

/**
 * The owner's own resume PDF, shown like a trophy: it floats on a lit pedestal, then turns to face the visitor as
 * they scroll and grows until it can be read, followed by every page at full width with Open and Download.
 * Nothing is generated here: the pages are the PDF the owner uploaded.
 */
export function ResumeTrophy({ versions, tags = [] }: { versions: { key: string; label: string; url: string }[]; tags?: string[] }) {
  const [active, setActive] = useState(0);
  const pdfUrl = versions[Math.min(active, versions.length - 1)].url;
  const outer = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const pedestal = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const rings = useRef<HTMLDivElement>(null);
  const capA = useRef<HTMLDivElement>(null);
  const capB = useRef<HTMLDivElement>(null);
  const glint = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctl = useRef<{ setPos: (p: number) => void; setPages: (p: HTMLCanvasElement[], r: number) => void; setNarrow: (v: boolean) => void; setPointer: (x: number, y: number) => void; dispose: () => void } | null>(null);
  const docRef = useRef<Doc | null>(null);
  const capC = useRef<HTMLDivElement>(null);
  const capD = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'three' | 'css'>('three');
  const pRef = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });
  const [doc, setDoc] = useState<Doc | null>(null);
  const [failed, setFailed] = useState(false);
  const [still, setStill] = useState(false);
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  const readRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);

  useEffect(() => {
    let dead = false;
    renderPdf(pdfUrl, Math.min(1500, Math.round(window.innerHeight * 1.5 * 0.75 * window.devicePixelRatio) + 400))
      .then((d) => { if (!dead) setDoc(d); })
      .catch(() => { if (!dead) setFailed(true); });
    return () => { dead = true; };
  }, [pdfUrl]);

  // the real 3D stage (falls back to the CSS card if WebGL is not available)
  useEffect(() => {
    if (still) return;
    let cancelled = false;
    import('@/lib/three/resumeVault').then(({ createResumeVault }) => {
      if (cancelled || !canvasRef.current) return;
      try {
        ctl.current = createResumeVault({ canvas: canvasRef.current, tags, narrow: window.innerWidth < 800 });
        if (docRef.current) ctl.current.setPages(docRef.current.pages, docRef.current.ratio);
      } catch { setMode('css'); }
    }).catch(() => setMode('css'));
    return () => { cancelled = true; ctl.current?.dispose(); ctl.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);
  useEffect(() => { docRef.current = doc; if (doc && ctl.current) ctl.current.setPages(doc.pages, doc.ratio); }, [doc]);

  // paint pages into the reading section and page 1 onto the trophy face
  useEffect(() => {
    if (!doc) return;
    const host = readRef.current;
    if (host) { host.innerHTML = ''; doc.pages.forEach((c, i) => { const cc = document.createElement('canvas'); cc.width = c.width; cc.height = c.height; cc.getContext('2d')!.drawImage(c, 0, 0); cc.className = 'resume-sheet'; cc.setAttribute('role', 'img'); cc.setAttribute('aria-label', `Resume, page ${i + 1} of ${doc.pages.length}`); host.appendChild(cc); }); }
    const f = face.current;
    if (f) { f.innerHTML = ''; const cc = document.createElement('canvas'); cc.width = doc.pages[0].width; cc.height = doc.pages[0].height; cc.getContext('2d')!.drawImage(doc.pages[0], 0, 0); cc.style.cssText = 'width:100%;height:100%;display:block'; f.appendChild(cc); }
  }, [doc, still]);

  useEffect(() => {
    const onResize = () => { setVp({ w: window.innerWidth, h: window.innerHeight }); ctl.current?.setNarrow(window.innerWidth < 800); };
    onResize();
    const onScroll = () => {
      const el = outer.current; if (!el) return;
      const r = el.getBoundingClientRect();
      pRef.current = clamp(-r.top / ((r.height - window.innerHeight) || 1));
    };
    const onMove = (e: PointerEvent) => { mouse.current = { x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 }; ctl.current?.setPointer(mouse.current.x, mouse.current.y); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); window.removeEventListener('pointermove', onMove); };
  }, []);

  const ratio = doc?.ratio ?? 0.707;
  const narrow = vp.w < 800;
  const baseH = Math.min(vp.h * (narrow ? 0.5 : 0.62), 700);
  const baseW = baseH * ratio;
  const fitS = Math.min((vp.h * 0.78) / baseH, (vp.w * 0.94) / baseW);

  useEffect(() => {
    if (still) return;
    let raf = 0, ps = 0; const t0 = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = (performance.now() - t0) / 1000;
      ps += (pRef.current - ps) * 0.1;
      ctl.current?.setPos(pRef.current);
      const o = (el: HTMLElement | null, v: number) => { if (el) { el.style.opacity = String(v); el.style.transform = `translateY(${(1 - v) * 14}px)`; } };
      if (mode === 'three') {
        o(capA.current, 1 - sm(0.1, 0.2, ps));
        o(capB.current, sm(0.2, 0.28, ps) * (1 - sm(0.42, 0.5, ps)));
        o(capC.current, sm(0.55, 0.62, ps) * (1 - sm(0.74, 0.8, ps)));
        o(capD.current, sm(0.9, 0.98, ps));
        if (bar.current) bar.current.style.transform = `scaleY(${ps})`;
        if (hint.current) hint.current.style.opacity = String(1 - sm(0.02, 0.1, ps));
        return;
      }
      const turn = sm(0.18, 0.62, ps), grow = sm(0.5, 0.92, ps);
      const swing = Math.sin(t * 0.7) * 9 * (1 - turn);
      const ry = lerp(-48, 0, turn) + swing + mouse.current.x * 6 * (1 - turn);
      const rx = lerp(10, 0, turn) + mouse.current.y * -4 * (1 - turn);
      const s = lerp(1, fitS, grow);
      const float = Math.sin(t * 1.1) * 10 * (1 - grow);
      const lift = lerp(-30, 0, grow);
      if (card.current) card.current.style.transform = `translate3d(0, ${float + lift}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
      if (pedestal.current) pedestal.current.style.opacity = String(1 - sm(0.3, 0.62, ps));
      if (rings.current) { rings.current.style.opacity = String(1 - sm(0.3, 0.62, ps)); rings.current.style.transform = `translateX(-50%) rotateX(76deg) rotate(${t * 18}deg)`; }
      if (light.current) light.current.style.opacity = String(lerp(1, 0.55, grow));
      if (capA.current) capA.current.style.opacity = String(1 - sm(0.12, 0.3, ps));
      if (capB.current) capB.current.style.opacity = String(sm(0.4, 0.6, ps) * (1 - sm(0.85, 1, ps)));
      if (glint.current) { const g = sm(0.28, 0.5, ps) * (1 - sm(0.5, 0.52, ps)); glint.current.style.opacity = String(g > 0 ? 1 : 0); glint.current.style.transform = `translateX(${lerp(-120, 120, sm(0.28, 0.5, ps))}%) skewX(-18deg)`; }
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [still, fitS, mode]);

  const dust = React.useMemo(() => Array.from({ length: 36 }, (_, i) => ({ l: (i * 53) % 100, d: 6 + (i * 7) % 9, dl: (i * 1.3) % 8, s: 2 + (i % 3) })), []);

  return (
    <div>
      {!still && (
        <div ref={outer} style={{ height: mode === 'three' ? '560vh' : '380vh' }} className="relative" aria-label="Resume showcase">
          <div className="sticky top-0 h-screen overflow-hidden bg-[#05040a]" style={mode === 'css' ? { perspective: '1600px' } : undefined}>
            {mode === 'three' ? (
              <>
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
                <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 55%, rgba(5,4,10,.75) 100%)' }} />
                {!doc && !failed && <div className="absolute inset-x-0 bottom-24 text-center text-xs font-mono text-gold-300/80">Loading resume…</div>}

                <div ref={capA} className="absolute left-4 sm:left-12 bottom-10 sm:bottom-16 max-w-xs sm:max-w-md pointer-events-none">
                  <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Résumé</p>
                  <p className="font-serif font-black text-white text-3xl sm:text-5xl leading-[1.05] mt-2 [text-shadow:0_4px_40px_rgba(0,0,0,.9)]">Read this first.</p>
                  <p className="mt-3 text-sm text-neutral-300">Scroll. It turns to face you.</p>
                </div>
                <div ref={capB} className="absolute right-4 sm:right-12 top-28 max-w-[18rem] text-right pointer-events-none" style={{ opacity: 0 }}>
                  <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">{versions.length > 1 ? 'Two versions' : 'Version'}</p>
                  <p className="font-serif font-black text-white text-2xl sm:text-4xl leading-tight mt-2 [text-shadow:0_4px_40px_rgba(0,0,0,.9)]">{versions[Math.min(active, versions.length - 1)].label}</p>
                  {versions.length > 1 && <p className="mt-2 text-sm text-neutral-300">Switch the focus with the buttons below.</p>}
                </div>
                <div ref={capC} className="absolute left-4 sm:left-12 top-28 max-w-[18rem] pointer-events-none" style={{ opacity: 0 }}>
                  <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Every page</p>
                  <p className="font-serif font-black text-white text-2xl sm:text-4xl leading-tight mt-2 [text-shadow:0_4px_40px_rgba(0,0,0,.9)]">{doc ? (doc.pages.length === 1 ? 'Everything on one page.' : `${doc.pages.length} pages, laid out.`) : 'Laid out.'}</p>
                </div>
                <div ref={capD} className="absolute inset-x-0 bottom-8 text-center pointer-events-none" style={{ opacity: 0 }}>
                  <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Up close</p>
                  <p className="font-serif font-black text-white text-2xl sm:text-3xl mt-1 [text-shadow:0_4px_40px_rgba(0,0,0,.95)]">Take your time.</p>
                </div>

                {versions.length > 1 && (
                  <div role="tablist" aria-label="Resume version" className="absolute left-1/2 -translate-x-1/2 top-20 sm:left-auto sm:translate-x-0 sm:right-12 sm:top-auto sm:bottom-16 flex rounded-lg border border-gold-500/40 overflow-hidden bg-black/50 backdrop-blur-sm">
                    {versions.map((v, i) => (
                      <button key={v.key} type="button" role="tab" aria-selected={i === active} onClick={() => { if (i !== active) { setDoc(null); setFailed(false); setActive(i); } }}
                        className={`px-4 py-2 text-sm font-mono ${i === active ? 'bg-gold-400 text-black font-semibold' : 'text-gold-300 hover:bg-gold-500/10'}`}>{v.label}</button>
                    ))}
                  </div>
                )}
                <div aria-hidden className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 h-40 w-[2px] bg-white/10 rounded overflow-hidden pointer-events-none"><div ref={bar} className="w-full h-full bg-gold-400 origin-top" style={{ transform: 'scaleY(0)' }} /></div>
                <div ref={hint} aria-hidden className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none text-gold-300/80 text-[10px] font-mono uppercase tracking-[0.35em] resume-hint">Scroll ↓</div>
              </>
            ) : (
              <>
            <div ref={light} aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 55% 80% at 50% -5%, rgba(255,214,120,.42), rgba(255,214,120,.08) 45%, transparent 70%), radial-gradient(ellipse 60% 30% at 50% 100%, rgba(243,201,105,.18), transparent 70%)' }} />
            <div aria-hidden className="absolute inset-0 pointer-events-none">{dust.map((d, i) => <span key={i} className="resume-dust" style={{ left: `${d.l}%`, width: d.s, height: d.s, animationDuration: `${d.d}s`, animationDelay: `-${d.dl}s` }} />)}</div>

            <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
              <div ref={rings} aria-hidden className="absolute left-1/2 resume-rings" style={{ top: `calc(50% + ${baseH * 0.5 + 8}px)` }} />
              <div ref={pedestal} aria-hidden className="absolute left-1/2 resume-pedestal" style={{ top: `calc(50% + ${baseH * 0.5 + 34}px)`, width: baseW * 0.8 }} />
              <div ref={card} className="relative" style={{ width: baseW, height: baseH, transformStyle: 'preserve-3d', willChange: 'transform' }}>
                <div className="absolute inset-0 resume-frame">
                  <div ref={face} className="absolute inset-[7px] overflow-hidden bg-white">
                    {!doc && !failed && <div className="w-full h-full grid place-items-center text-neutral-500 text-xs font-mono">Loading resume…</div>}
                  </div>
                  <div ref={glint} aria-hidden className="absolute inset-0 pointer-events-none resume-glint" />
                </div>
              </div>
            </div>

            <div ref={capA} className="absolute left-4 sm:left-12 bottom-10 sm:bottom-16 max-w-xs sm:max-w-md pointer-events-none">
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Résumé</p>
              <p className="font-serif font-black text-white text-3xl sm:text-5xl leading-[1.05] mt-2 [text-shadow:0_4px_40px_rgba(0,0,0,.9)]">Read this first.</p>
              <p className="mt-3 text-sm text-neutral-300">Scroll. It turns to face you.</p>
            </div>
            <div ref={capB} className="absolute right-4 sm:right-12 top-24 max-w-[16rem] text-right pointer-events-none" style={{ opacity: 0 }}>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Up close</p>
              <p className="font-serif font-black text-white text-2xl sm:text-3xl leading-tight mt-2 [text-shadow:0_4px_40px_rgba(0,0,0,.9)]">Take your time.</p>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      <section className="relative bg-[#06050a] px-4 sm:px-6 py-14" aria-label="Resume, full pages">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">The full résumé</p>
              <h2 className="font-serif font-black text-white text-2xl sm:text-3xl mt-1">Every page, readable</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {versions.length > 1 && (
                <div role="tablist" aria-label="Resume version" className="flex rounded-lg border border-gold-500/40 overflow-hidden">
                  {versions.map((v, i) => (
                    <button key={v.key} type="button" role="tab" aria-selected={i === active} onClick={() => { if (i !== active) { setDoc(null); setFailed(false); setActive(i); } }}
                      className={`px-4 py-2 text-sm font-mono ${i === active ? 'bg-gold-400 text-black font-semibold' : 'text-gold-300 hover:bg-gold-500/10'}`}>{v.label}</button>
                  ))}
                </div>
              )}
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg border border-gold-500/50 text-gold-300 text-sm font-mono hover:bg-gold-500/10">Open PDF ↗</a>
              <a href={pdfUrl} download={`Taha_Udaipurwala_Resume_${versions[Math.min(active, versions.length - 1)].label.replace(/[^A-Za-z]/g, "")}.pdf`} className="px-4 py-2 rounded-lg bg-gold-400 text-black text-sm font-semibold hover:bg-gold-300">Download</a>
            </div>
          </div>
          {failed && (
            <div className="rounded-xl overflow-hidden border border-gold-500/30 bg-white">
              <iframe src={pdfUrl} title="Resume PDF" className="w-full" style={{ height: '85vh' }} />
            </div>
          )}
          {!failed && !doc && <div className="h-64 grid place-items-center text-neutral-500 font-mono text-sm">Loading the pages…</div>}
          <div ref={readRef} className="space-y-8" />
        </div>
      </section>
    </div>
  );
}
