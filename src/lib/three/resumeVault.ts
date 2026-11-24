/**
 * The Vault: the owner's own resume PDF as a lit object in a dark gold chamber.
 * Scroll story (p = 0..1): the light drops and the resume rises on its pedestal inside three turning rings,
 * the camera orbits it, a shock ring rolls out, the pages fan open like a hand of cards, then they fold back
 * and the camera pushes in until the first page fills the screen and can be read.
 * Nothing on the pages is invented: the textures are the pages of the uploaded PDF. The orbiting words, when present,
 * are skill names already published on the site.
 */
import * as THREE from 'three';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const CARD_H = 3.6;

export interface VaultControl {
  setPos: (p: number) => void;
  setPages: (pages: HTMLCanvasElement[], ratio: number) => void;
  setNarrow: (v: boolean) => void;
  setPointer: (x: number, y: number) => void;
  dispose: () => void;
}

function radialTexture(stops: [number, string][]) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function verticalTexture(stops: [number, string][]) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256;
  const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sheenTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 32;
  const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, 'rgba(255,244,214,0.85)'); gr.addColorStop(0.58, 'rgba(255,240,200,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 32);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function wordTexture(text: string) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d')!;
  g.font = '600 44px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(255,200,90,0.9)'; g.shadowBlur = 18; g.fillStyle = '#ffe7b0'; g.fillText(text.slice(0, 22), 256, 48);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function backTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 724;
  const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 512, 724); gr.addColorStop(0, '#16110a'); gr.addColorStop(1, '#0a0806');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 724);
  g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(34, 34, 444, 656); g.lineWidth = 1; g.strokeRect(46, 46, 420, 632);
  g.fillStyle = '#e0b44a'; g.textAlign = 'center'; g.font = '700 64px Georgia, serif'; g.fillText('LAMO', 256, 380);
  g.font = '600 16px "Courier New", monospace'; g.fillStyle = '#a88535'; g.fillText('P R O J E C T', 256, 330);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createResumeVault(opts: { canvas: HTMLCanvasElement; tags: string[]; narrow: boolean }): VaultControl {
  const { canvas } = opts;
  let narrow = opts.narrow;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05040a);
  scene.fog = new THREE.FogExp2(0x05040a, 0.045);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);

  // lighting: warm key from above, cold rim from behind, a little ambient
  scene.add(new THREE.AmbientLight(0x6a5a40, 0.5));
  const key = new THREE.SpotLight(0xffd98a, 260, 40, 0.42, 0.55, 1.4); key.position.set(0, 12, 3); key.target.position.set(0, 1.5, 0); scene.add(key, key.target);
  const rim = new THREE.PointLight(0x6f8cff, 10, 30, 1.6); rim.position.set(-6, 4, -6); scene.add(rim);
  const warm = new THREE.PointLight(0xffb34a, 30, 22, 1.6); warm.position.set(5, 2, 5); scene.add(warm);

  // floor: dark disc with a gold-lit centre, plus a raised round platform
  const floorTex = radialTexture([[0, 'rgba(255,200,100,0.55)'], [0.35, 'rgba(120,80,20,0.25)'], [1, 'rgba(5,4,10,0)']]);
  const glowFloor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glowFloor.rotation.x = -Math.PI / 2; glowFloor.position.y = 0.02; scene.add(glowFloor);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x0b0a10, roughness: 0.35, metalness: 0.7 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b44a, metalness: 0.9, roughness: 0.25, emissive: 0x3a2a08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15110a, metalness: 0.8, roughness: 0.3 });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 0.34, 64), dark); platform.position.y = 0.17; scene.add(platform);
  const platRim = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.05, 12, 96), gold); platRim.rotation.x = Math.PI / 2; platRim.position.y = 0.35; scene.add(platRim);
  // engraved notches around the platform
  const notchG = new THREE.BoxGeometry(0.06, 0.02, 0.28);
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; const nb = new THREE.Mesh(notchG, gold); nb.position.set(Math.cos(a) * 2.78, 0.35, Math.sin(a) * 2.78); nb.rotation.y = -a; scene.add(nb); }

  // turning rings
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf3c969, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const rings = [2.5, 3.1, 3.7].map((r, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.01 + i * 0.003, 8, 200), ringMat.clone()); m.position.y = 2.1; scene.add(m); return m; });
  const arcs = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(4.3 + i * 0.5, 0.014, 8, 160, Math.PI * 1.2), ringMat.clone()); m.position.y = 2.1; scene.add(m); return m; });
  const shock = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 160), ringMat.clone()); shock.rotation.x = Math.PI / 2; shock.position.y = 0.4; scene.add(shock);

  // light beam
  const beamTex = verticalTexture([[0, 'rgba(255,220,140,0)'], [0.25, 'rgba(255,214,120,0.22)'], [1, 'rgba(255,200,90,0.0)']]);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 3.0, 11, 48, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.9 }));
  beam.position.y = 5.8; scene.add(beam);

  // the resume: gold frame, the sheet, a moving sheen, a dark back
  const card = new THREE.Group(); scene.add(card);
  const sheetMat = new THREE.MeshBasicMaterial({ color: 0x909090, toneMapped: false });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sheetMat); sheet.position.z = 0.02; card.add(sheet);
  const sheenMap = sheenTexture();
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: sheenMap, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  sheen.position.z = 0.03; card.add(sheen);
  const frame = new THREE.Group(); card.add(frame);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: backTexture(), toneMapped: false })); back.rotation.y = Math.PI; back.position.z = -0.065; card.add(back);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.06), dark); slab.position.z = -0.03; card.add(slab);

  // the other pages, stacked behind page 1 until the fan opens
  const deck = new THREE.Group(); scene.add(deck);
  let pageMeshes: THREE.Mesh[] = []; let pageTextures: THREE.CanvasTexture[] = []; let nPages = 1; let ratio = 0.707; let cardW = CARD_H * ratio;

  const disposePages = () => { pageTextures.forEach((t) => t.dispose()); pageMeshes.forEach((m) => { deck.remove(m); (m.material as THREE.Material).dispose(); m.geometry.dispose(); }); pageMeshes = []; pageTextures = []; };
  const buildFrame = () => {
    frame.clear();
    const t = 0.09, d = 0.1;
    const bars: [number, number, number, number][] = [[0, CARD_H / 2 + t / 2, cardW + t * 2, t], [0, -CARD_H / 2 - t / 2, cardW + t * 2, t], [-cardW / 2 - t / 2, 0, t, CARD_H], [cardW / 2 + t / 2, 0, t, CARD_H]];
    bars.forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gold); b.position.set(x, y, -0.005); frame.add(b); });
  };
  const layoutCard = () => {
    cardW = CARD_H * ratio;
    [sheet, sheen, back].forEach((m) => m.scale.set(cardW, CARD_H, 1));
    slab.scale.set(cardW, CARD_H, 1); buildFrame();
  };
  const setPages = (pages: HTMLCanvasElement[], r: number) => {
    disposePages(); ratio = r || 0.707; nPages = Math.max(1, pages.length); layoutCard();
    pages.forEach((c, i) => {
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; pageTextures.push(tex);
      if (i === 0) { sheetMat.map = tex; sheetMat.needsUpdate = true; return; }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(cardW, CARD_H), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide, color: 0x909090 }));
      m.visible = false; deck.add(m); pageMeshes.push(m);
    });
  };
  layoutCard();

  // orbiting words (published skill names only)
  const words = opts.tags.slice(0, 14).map((text, i, arr) => {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(text), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    spr.scale.set(1.5, 0.28, 1); scene.add(spr); return { spr, a0: (i / arr.length) * Math.PI * 2, r: 4.0 + (i % 3) * 0.45, y: 1.0 + (i % 5) * 0.55 };
  });

  // dust
  const M = narrow ? 260 : 620; const pos = new Float32Array(M * 3);
  for (let i = 0; i < M; i++) { const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 11; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 9; pos[i * 3 + 2] = Math.sin(a) * r; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe2a0, size: 0.06, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  let target = 0, shown = 0, raf = 0, disposed = false, visible = true;
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  const clock = new THREE.Clock();
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 58 : 42; camera.updateProjectionMatrix();
  };
  const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; });
  io.observe(canvas);
  const onVis = () => { if (document.hidden) clock.stop(); else clock.start(); };
  document.addEventListener('visibilitychange', onVis);

  const look = new THREE.Vector3();
  const tick = () => {
    if (disposed) return; raf = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    shown += (target - shown) * 0.075; const p = shown;
    ptr.sx += (ptr.x - ptr.sx) * 0.05; ptr.sy += (ptr.y - ptr.sy) * 0.05;

    // phases
    const rise = sm(0.0, 0.12, p), orbit = sm(0.1, 0.4, p), face = sm(0.34, 0.5, p);
    const fan = sm(0.5, 0.62, p) * (1 - sm(0.76, 0.84, p));
    const push = sm(0.82, 1.0, p);
    const stageFade = 1 - sm(0.8, 0.96, p);

    const camAngle = lerp(0.9, 0, orbit) + (1 - face) * Math.sin(t * 0.2) * 0.06;
    // card pose
    const cy = lerp(0.9, 2.15, rise) + Math.sin(t * 1.1) * 0.06 * (1 - push);
    const ry = lerp(0.6, 0, face) + Math.sin(t * 0.5) * 0.12 * (1 - face) + ptr.sx * 0.12 * (1 - push);
    const rx = lerp(0.12, 0, face) + ptr.sy * -0.06 * (1 - push);
    card.position.set(0, cy, 0); card.rotation.set(rx, ry, 0);
    const sc = narrow ? lerp(0.82, 0.9, rise) : 1; card.scale.setScalar(sc);
    sheetMat.color.setScalar(lerp(0.55, 1, clamp(rise * 0.6 + face * 0.6 + push)));
    sheet.visible = true;

    // pages fanning out around the card
    const mid = (nPages - 1) / 2;
    pageMeshes.forEach((m, k) => {
      const i = k + 1; const o = i - mid;
      m.visible = fan > 0.01;
      const spread = (narrow ? 1.5 : 2.5) * fan;
      m.position.set(card.position.x + o * spread * 0.62 + 0, cy + Math.sin(t * 0.9 + i) * 0.05 * fan, -Math.abs(o) * 0.35 * fan - 0.02 * i);
      m.rotation.set(0, -o * 0.3 * fan + ry * (1 - fan), 0);
      m.scale.setScalar(sc * lerp(0.98, 1, fan));
    });
    // page 1 slides to its slot in the fan too
    const o0 = 0 - mid; const f1 = fan;
    card.position.x = o0 * (narrow ? 1.5 : 2.5) * 0.62 * f1;
    card.position.z = -Math.abs(o0) * 0.35 * f1;
    card.rotation.y += -o0 * 0.3 * f1;

    // rings, beam, shock
    rings.forEach((r, i) => { r.rotation.x = Math.PI / 2 + Math.sin(t * 0.4 + i) * 0.5 * (1 - face * 0.6); r.rotation.y = t * (0.35 + i * 0.22) * (i % 2 ? -1 : 1); r.position.y = cy; (r.material as THREE.MeshBasicMaterial).opacity = 0.7 * stageFade * rise * (1 - face * 0.75); });
    arcs.forEach((a, i) => { a.rotation.x = Math.PI / 2; a.rotation.z = t * (0.25 + i * 0.15) * (i ? -1 : 1); a.position.y = 0.45 + i * 0.05; (a.material as THREE.MeshBasicMaterial).opacity = 0.6 * stageFade; });
    const sw = sm(0.44, 0.62, p); shock.scale.setScalar(1 + sw * 11); (shock.material as THREE.MeshBasicMaterial).opacity = (1 - sw) * clamp(sw * 12) * 0.9;
    (beam.material as THREE.MeshBasicMaterial).opacity = (0.55 + Math.sin(t * 0.8) * 0.12) * stageFade * (0.4 + rise * 0.6);
    key.intensity = 260 * (0.35 + rise * 0.65) * (1 - push * 0.4);
    glowFloor.material.opacity = stageFade;
    platform.visible = platRim.visible = stageFade > 0.02;

    // sheen sweep during the turn
    const sweep = sm(0.3, 0.5, p); (sheen.material as THREE.MeshBasicMaterial).opacity = sweep * (1 - sm(0.5, 0.56, p)) ? 1 : 0; sheenMap.offset.x = lerp(0.6, -0.6, sweep);

    // words orbit while the card turns, then drift away
    const wv = sm(0.16, 0.3, p) * (1 - sm(0.56, 0.7, p));
    words.forEach((w, i) => { const a = w.a0 + t * 0.22; w.spr.position.set(Math.cos(a) * w.r, w.y + Math.sin(t * 0.7 + i) * 0.12, Math.sin(a) * w.r); const dcam = w.spr.position.distanceTo(camera.position); (w.spr.material as THREE.SpriteMaterial).opacity = wv * sm(3.5, 7, dcam) * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(a - camAngle))); });

    // camera: orbit, front, wider for the fan, push in to read
    const dist = narrow ? 11 : 9;
    const radius = lerp(dist * 1.15, dist * 0.78, orbit) + fan * (narrow ? 5.5 : 4.2);
    const camH = lerp(1.2, 2.6, orbit) * (1 - push) + 2.15 * push;
    const fillDist = (CARD_H / 2 * sc) / Math.tan((camera.fov * Math.PI) / 360) / (camera.aspect < 1 ? Math.min(1, camera.aspect * 1.25) * 0.92 : 0.72);
    const fillZ = Math.max(fillDist, cardW * sc * 0.5 / (Math.tan((camera.fov * Math.PI) / 360) * camera.aspect) / 0.92);
    const r2 = lerp(radius, fillZ, push);
    const a2 = camAngle * (1 - push);
    camera.position.set(Math.sin(a2) * r2 + ptr.sx * 0.5 * (1 - push), camH + ptr.sy * -0.3 * (1 - push), Math.cos(a2) * r2);
    look.set(0, lerp(1.7, 2.15, rise), 0); camera.lookAt(look);

    dust.rotation.y = t * 0.03; dust.position.y = Math.sin(t * 0.3) * 0.3; (dust.material as THREE.PointsMaterial).opacity = 0.75 * stageFade + 0.15;
    renderer.render(scene, camera);
  };
  resize(); window.addEventListener('resize', resize); tick();

  return {
    setPos: (p) => { target = p; },
    setPages,
    setNarrow: (v) => { narrow = v; resize(); },
    setPointer: (x, y) => { ptr.x = x; ptr.y = y; },
    dispose: () => {
      disposed = true; cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis);
      disposePages();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => { (x as any).map?.dispose?.(); x.dispose(); }); });
      renderer.dispose();
    },
  };
}
