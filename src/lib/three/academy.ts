/**
 * The Academy: a two-storey reading room walked from end to end. Physically based materials (walnut, polished
 * marble, brass, leather, paper), real shadows, a floor that reflects the hall, candle and moon light, light
 * shafts through the skylights, bloom and film grain. Every certificate is shown framed under glass on its own
 * lectern. Nothing is invented: the paper carries only the title and issuer that the owner published.
 * With no certificates it is the same room with one blank sheet, so the "coming soon" page is still alive.
 *
 * All textures are drawn here (no image files), so the page stays small and works offline.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

const BAY = 9;            // metres per bay (also the distance between certificates)
const COL_X = 4.6;        // colonnade / gallery railing line
const WALL_X = 6.0;       // front plane of the bookcases
const GALLERY_Y = 4.7;    // gallery floor
const SPRING_Y = 10.2;    // where the barrel vault starts
const VAULT_R = 6.6;
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

export interface AcademyItem { title: string; org: string }

/* ---------- tiny seeded noise so every load looks the same ---------- */
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function noise2(seed: number, size = 128) {
  const r = rng(seed); const g = new Float32Array(size * size); for (let i = 0; i < g.length; i++) g[i] = r();
  const at = (x: number, y: number) => g[((y % size) + size) % size * size + (((x % size) + size) % size)];
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y); const fx = x - xi, fy = y - yi; const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), u), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), u), v);
  };
}
function fbm(n: (x: number, y: number) => number, x: number, y: number, oct = 5) { let a = 0.5, f = 1, s = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); f *= 2; a *= 0.5; } return s; }
function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c: HTMLCanvasElement, opt: { srgb?: boolean; repeat?: boolean; aniso?: number } = {}) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = opt.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opt.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = opt.aniso ?? 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}

/* ---------- procedural materials ---------- */
function marbleCanvas(size: number, kind: 'white' | 'black', seed: number) {
  const c = canvas(size, size); const g = c.getContext('2d')!; const img = g.createImageData(size, size); const n = noise2(seed, 64); const n2 = noise2(seed + 9, 64);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * 4, v = y / size * 4; const warp = fbm(n, u * 1.3, v * 1.3, 5) * 5.5;
    const vein = Math.pow(1 - Math.abs(Math.sin((u * 1.7 + v * 0.9 + warp) * Math.PI)), kind === 'white' ? 14 : 22);
    const vein2 = Math.pow(1 - Math.abs(Math.sin((u * 0.6 - v * 1.4 + warp * 0.7) * Math.PI)), 30);
    const cloud = fbm(n2, u * 2, v * 2, 5);
    let r, gg, b;
    if (kind === 'white') { const base = 232 - cloud * 26; r = base; gg = base - 1; b = base - 5; const k = vein * 0.55 + vein2 * 0.35; r -= 110 * k; gg -= 110 * k; b -= 104 * k; }
    else { const base = 24 + cloud * 14; r = base; gg = base; b = base + 2; const k = vein * 0.5 + vein2 * 0.8; r += 175 * k; gg += 172 * k; b += 165 * k; }
    const i = (y * size + x) * 4; img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
function floorTexture() {
  const S = 1024; const c = canvas(S * 2, S * 2); const g = c.getContext('2d')!;
  const w1 = marbleCanvas(S, 'white', 3), b1 = marbleCanvas(S, 'black', 5), w2 = marbleCanvas(S, 'white', 7), b2 = marbleCanvas(S, 'black', 11);
  g.drawImage(w1, 0, 0); g.drawImage(b1, S, 0); g.drawImage(b2, 0, S); g.drawImage(w2, S, S);
  g.strokeStyle = '#8a6a2a'; g.lineWidth = 5; g.strokeRect(2, 2, S * 2 - 4, S * 2 - 4); g.beginPath(); g.moveTo(S, 0); g.lineTo(S, S * 2); g.moveTo(0, S); g.lineTo(S * 2, S); g.stroke();
  return tex(c, { repeat: true, aniso: 16 });
}
function woodTexture(seed: number, base: [number, number, number]) {
  const W = 1024, H = 512; const c = canvas(W, H); const g = c.getContext('2d')!; const img = g.createImageData(W, H); const n = noise2(seed, 64);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H; const warp = fbm(n, u * 3, v * 14, 4) * 6; const ring = Math.sin((v * 46 + warp) * Math.PI); const fine = fbm(n, u * 60, v * 3, 3);
    const k = 0.78 + 0.22 * ring * 0.5 + 0.3 * (fine - 0.5); const i = (y * W + x) * 4;
    img.data[i] = base[0] * k; img.data[i + 1] = base[1] * k; img.data[i + 2] = base[2] * k; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
function plasterTexture() {
  const S = 512; const c = canvas(S, S); const g = c.getContext('2d')!; const img = g.createImageData(S, S); const n = noise2(21, 64);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const k = 0.86 + 0.18 * fbm(n, x / S * 6, y / S * 6, 5); const i = (y * S + x) * 4; img.data[i] = 205 * k; img.data[i + 1] = 190 * k; img.data[i + 2] = 160 * k; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}
function carpetTexture() {
  const W = 512, H = 1024; const c = canvas(W, H); const g = c.getContext('2d')!; const img = g.createImageData(W, H); const n = noise2(33, 64);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const weave = ((x >> 1) + (y >> 1)) & 1 ? 1 : 0.86; const m = 0.9 + 0.2 * fbm(n, x / W * 8, y / H * 12, 3); const i = (y * W + x) * 4; const k = weave * m;
    img.data[i] = 112 * k; img.data[i + 1] = 18 * k; img.data[i + 2] = 28 * k; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = '#c9a24a'; g.lineWidth = 10; g.strokeRect(26, 0, W - 52, H + 20); g.lineWidth = 3; g.strokeRect(48, -10, W - 96, H + 40);
  g.fillStyle = 'rgba(201,162,74,.7)';
  for (let y = 40; y < H; y += 128) { g.save(); g.translate(W / 2, y + 40); g.rotate(Math.PI / 4); g.strokeStyle = '#c9a24a'; g.lineWidth = 4; g.strokeRect(-26, -26, 52, 52); g.strokeRect(-14, -14, 28, 28); g.restore(); }
  return tex(c, { repeat: true });
}
const LATIN = ['ANNALES', 'CODEX', 'OPERA', 'HISTORIA', 'PHYSICA', 'MECHANICA', 'GEOMETRIA', 'ASTRONOMIA', 'ALGEBRA', 'LOGICA', 'OPTICA', 'NATURA', 'ENCYCLOPAEDIA', 'THEORIA', 'PRINCIPIA', 'MATHESIS'];
/** 8 different spines side by side; the bump map gives raised bands and embossed panels. */
function spineAtlas() {
  const COLS = 8, CW = 128, H = 1024; const c = canvas(COLS * CW, H); const g = c.getContext('2d')!; const r = rng(77); const n = noise2(5, 64);
  const pal = [[92, 24, 34], [24, 52, 84], [34, 74, 52], [96, 66, 28], [58, 36, 80], [26, 26, 30], [118, 58, 30], [20, 66, 72]];
  for (let k = 0; k < COLS; k++) {
    const x0 = k * CW; const col = pal[k % pal.length]; const img = g.createImageData(CW, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < CW; x++) { const m = 0.78 + 0.34 * fbm(n, (x0 + x) / 20, y / 14, 4); const edge = Math.min(x, CW - 1 - x) < 4 ? 0.55 : 1; const i = (y * CW + x) * 4; img.data[i] = col[0] * m * edge; img.data[i + 1] = col[1] * m * edge; img.data[i + 2] = col[2] * m * edge; img.data[i + 3] = 255; }
    g.putImageData(img, x0, 0);
    // raised bands (gilt line with a dark shadow edge)
    const bands = [80, 250, 420, 640, 820].slice(0, 4 + (k % 2));
    bands.forEach((y, i) => { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x0, y + 7, CW, 5); g.fillStyle = i % 2 ? '#b8923f' : '#d8b25a'; g.fillRect(x0, y, CW, 6); g.fillStyle = 'rgba(255,240,190,.55)'; g.fillRect(x0, y, CW, 1.5); g.fillStyle = '#b8923f'; g.fillRect(x0, y + 22, CW, 2); });
    // title panel with a gilt word
    const py = 290 + (k % 3) * 20; g.fillStyle = 'rgba(14,10,8,.82)'; g.fillRect(x0 + 18, py, CW - 36, 300); g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.strokeRect(x0 + 18, py, CW - 36, 300);
    g.save(); g.translate(x0 + CW / 2, py + 150); g.rotate(-Math.PI / 2); g.fillStyle = '#e6c26a'; g.font = '600 38px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(LATIN[(k * 2 + ((r() * 8) | 0)) % LATIN.length], 0, 0); g.restore();
    g.fillStyle = '#c9a24a'; g.font = '34px Georgia'; g.textAlign = 'center'; g.fillText(['❦', '✦', '❖', '✧'][k % 4], x0 + CW / 2, 960);
  }
  g.fillStyle = '#3a2418'; g.fillRect(0, 0, COLS * CW, 10);
  const t = tex(c, { aniso: 8 }); return t;
}
function paperTexture(item: AcademyItem | null) {
  const W = 2048, H = 1448; const c = canvas(W, H); const g = c.getContext('2d')!; const n = noise2(91, 64);
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const fiber = fbm(n, x / 90, y / 90, 4); const fine = n(x / 3, y / 3); const k = 0.93 + 0.12 * fiber + 0.03 * fine; const i = (y * W + x) * 4; img.data[i] = 244 * k; img.data[i + 1] = 233 * k; img.data[i + 2] = 205 * k; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  // guilloche border
  g.strokeStyle = '#8c6a26'; g.lineWidth = 8; g.strokeRect(54, 54, W - 108, H - 108); g.lineWidth = 2.5; g.strokeRect(82, 82, W - 164, H - 164);
  g.lineWidth = 1.4; g.strokeStyle = 'rgba(140,106,38,.75)';
  for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = 96; x <= W - 96; x += 4) { const y = 108 + Math.sin(x / 26 + k * 2) * 9; x === 96 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.beginPath(); for (let x = 96; x <= W - 96; x += 4) { const y = H - 108 + Math.sin(x / 26 + k * 2) * 9; x === 96 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  g.textAlign = 'center'; g.fillStyle = '#4a3410';
  g.font = '600 52px Georgia, serif'; g.fillText(item ? 'C E R T I F I C A T E' : 'C E R T I F I C A T E S', W / 2, 270);
  g.strokeStyle = '#8c6a26'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 220, 310); g.lineTo(W / 2 + 220, 310); g.stroke();
  const wrapText = (text: string, y: number, maxW: number, lh: number, maxLines: number) => { const words = text.split(' '); const lines: string[] = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); lines.slice(0, maxLines).forEach((l, i) => g.fillText(l, W / 2, y + i * lh)); return Math.min(lines.length, maxLines); };
  if (item) {
    g.font = '700 112px Georgia, serif'; g.fillStyle = '#3d2a0c'; const used = wrapText(item.title, 560, W - 420, 130, 3);
    g.font = 'italic 58px Georgia, serif'; g.fillStyle = '#6b4d17'; g.fillText(item.org.slice(0, 60), W / 2, 560 + used * 130 + 40);
  } else {
    g.font = '700 130px Georgia, serif'; g.fillText('Coming soon', W / 2, 640); g.strokeStyle = 'rgba(74,52,16,.35)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(460, 800 + i * 70); g.lineTo(W - 460, 800 + i * 70); g.stroke(); }
  }
  const t = tex(c, { aniso: 16 }); return t;
}
function dustSprite() { const c = canvas(64, 64); const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,236,190,1)'); gr.addColorStop(0.35, 'rgba(255,220,150,.45)'); gr.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return tex(c, { aniso: 1 }); }
function gradientV(stops: [number, string][]) { const c = canvas(4, 128); const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 0, 128); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); return tex(c, { aniso: 1 }); }
function windowTexture() {
  const W = 512, H = 1024; const c = canvas(W, H); const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#fff4d6'); gr.addColorStop(1, '#ffd48a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#1b1208'; g.lineWidth = 8; for (let x = 0; x <= W; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y <= H; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  return tex(c, { aniso: 4 });
}

/* ---------- geometry helpers ---------- */
function latheProfile(points: [number, number][], seg = 40) { return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg); }
function flutedShaft(r: number, h: number, flutes = 20, depth = 0.025) {
  const g = new THREE.CylinderGeometry(r, r * 1.06, h, flutes * 4, 24, true); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const a = Math.atan2(z, x); const k = 1 - depth * (0.5 + 0.5 * Math.cos(a * flutes)); p.setX(i, x * k); p.setZ(i, z * k); }
  g.computeVertexNormals(); return g;
}
function archSurface(R: number, y0: number, z0: number, z1: number, seg = 40) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI; const x = Math.cos(a) * R, y = y0 + Math.sin(a) * R; pos.push(x, y, z0, x, y, z1); uv.push(i / seg * 3, 0, i / seg * 3, Math.abs(z1 - z0) / 4); }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function createAcademy(opts: { canvas: HTMLCanvasElement; items: AcademyItem[]; narrow: boolean }) {
  const { canvas: cv, items } = opts;
  let narrow = opts.narrow;
  const hi = !narrow;                       // full-quality path: floor reflections, shadows, density
  const n = Math.max(1, items.length);
  const bays = n + 3;                       // one before, one after, plus the lectern bays
  const zOf = (b: number) => -b * BAY;      // bay b is centred here
  const zMin = zOf(bays) - BAY / 2, zMax = BAY * 1.6, hallLen = zMax - zMin, zMid = (zMax + zMin) / 2;
  const lecternZ = (i: number) => zOf(i + 1);

  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, hi ? 2 : 1.5));
  renderer.shadowMap.enabled = hi; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);
  scene.fog = new THREE.FogExp2(0x0a0d18, 0.017);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140);

  // image-based light for the metals and the glass; the rest is lit by real lights below
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.05); scene.environment = envRT.texture; scene.environmentIntensity = 0.18;

  // ---- lights: a fixed set that is moved along the hall, so shaders never recompile ----
  scene.add(new THREE.HemisphereLight(0x3d4c7a, 0x1a1208, 0.45));
  const moon = new THREE.DirectionalLight(0xaec4ff, 0.9); scene.add(moon, moon.target);
  if (hi) { moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); const sc = moon.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 60; moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.03; moon.shadow.radius = 4; }
  const candles = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffb866, 300, 26, 2); scene.add(l); return l; });
  const spots = [0, 1].map(() => { const s = new THREE.SpotLight(0xffe2ae, 55, 14, 0.62, 0.7, 2); scene.add(s, s.target); return s; });

  // ---- materials ----
  const floorT = floorTexture(); floorT.anisotropy = maxAniso; floorT.repeat.set(12.4 / 2.4, hallLen / 2.4);
  const floorMat = new THREE.MeshPhysicalMaterial({ map: floorT, roughness: 0.16, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 0.6 });
  const walnutC = woodTexture(4, [96, 60, 36]); const walnut = tex(walnutC, { repeat: true, aniso: maxAniso }); const walnutBump = tex(walnutC, { repeat: true, srgb: false });
  const woodMat = new THREE.MeshStandardMaterial({ map: walnut, bumpMap: walnutBump, bumpScale: 0.6, roughness: 0.55, metalness: 0 });
  const darkWood = new THREE.MeshStandardMaterial({ map: walnut, color: 0x6a5a4e, roughness: 0.6, metalness: 0 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89a3c, metalness: 1, roughness: 0.26 });
  const marbleT = tex(marbleCanvas(1024, 'white', 14), { repeat: true, aniso: maxAniso });
  const marble = new THREE.MeshPhysicalMaterial({ map: marbleT, roughness: 0.22, clearcoat: 0.4, clearcoatRoughness: 0.2 });
  const plasterT = tex(plasterTexture(), { repeat: true });
  const plaster = new THREE.MeshStandardMaterial({ map: plasterT, roughness: 0.95, side: THREE.BackSide });
  const plasterOut = new THREE.MeshStandardMaterial({ map: plasterT, roughness: 0.95 });
  const carpetT = carpetTexture(); carpetT.repeat.set(1, hallLen / 6);
  const carpetMat = new THREE.MeshStandardMaterial({ map: carpetT, bumpMap: carpetT, bumpScale: 1.4, roughness: 1, metalness: 0 });
  const toDispose: { dispose: () => void }[] = [floorT, walnut, walnutBump, marbleT, plasterT, carpetT, envRT];

  const add = (o: THREE.Object3D, cast = false, receive = true) => { o.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { mm.castShadow = hi && cast; mm.receiveShadow = hi && receive; } }); scene.add(o); return o; };

  // ---- floor, reflection, carpet ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WALL_X * 2 + 1.2, hallLen), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zMid); add(floor, false, true);
  let reflector: Reflector | null = null;
  if (hi) {
    const shader = {
      name: 'SoftMirror', uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, strength: { value: 0.34 } },
      vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; void main(){ vUv = textureMatrix * vec4(position,1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 color; uniform sampler2D tDiffuse; uniform float strength; varying vec4 vUv; void main(){ vec2 p = vUv.xy / vUv.w; vec3 c = texture2D(tDiffuse,p).rgb*0.34; float s=0.0042; c += texture2D(tDiffuse,p+vec2(s,0.)).rgb*0.165; c += texture2D(tDiffuse,p-vec2(s,0.)).rgb*0.165; c += texture2D(tDiffuse,p+vec2(0.,s)).rgb*0.165; c += texture2D(tDiffuse,p-vec2(0.,s)).rgb*0.165; gl_FragColor = vec4(c*color, strength); }',
    };
    const rw = Math.floor(cv.clientWidth * 0.5) || 640, rh = Math.floor(cv.clientHeight * 0.5) || 360;
    reflector = new Reflector(new THREE.PlaneGeometry(WALL_X * 2, hallLen), { clipBias: 0.003, textureWidth: rw, textureHeight: rh, color: new THREE.Color(0xffffff), shader, multisample: 0 });
    reflector.rotation.x = -Math.PI / 2; reflector.position.set(0, 0.004, zMid);
    const rm = reflector.material as THREE.ShaderMaterial; rm.transparent = true; rm.depthWrite = false; rm.toneMapped = false; scene.add(reflector);
  }
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.8, hallLen), carpetMat); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.012, zMid); add(carpet, false, true);

  // ---- structure: vault, ribs, skylights, end window ----
  const vault = new THREE.Mesh(archSurface(VAULT_R, SPRING_Y, zMin, zMax), plaster); vault.receiveShadow = false; scene.add(vault);
  const wallsH = new THREE.Mesh(new THREE.BoxGeometry(0.2, SPRING_Y, hallLen), plasterOut);
  for (const sx of [-1, 1]) { const w = wallsH.clone(); w.position.set(sx * (VAULT_R + 0.1), SPRING_Y / 2, zMid); scene.add(w); }
  const ribGeo = new THREE.TorusGeometry(VAULT_R - 0.05, 0.22, 10, 56, Math.PI);
  const skyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdfe9ff).multiplyScalar(2.4), toneMapped: false });
  const shaftTex = gradientV([[0, 'rgba(190,210,255,0)'], [0.15, 'rgba(190,210,255,0.5)'], [1, 'rgba(190,210,255,0)']]);
  const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const chand: THREE.Group[] = []; const bulbs: THREE.Vector3[] = [];
  for (let b = -2; b <= bays + 1; b++) {
    const z = zOf(b) + BAY / 2;
    const rib = new THREE.Mesh(ribGeo, plasterOut); rib.position.set(0, SPRING_Y, z); add(rib, true, true);
    if (b >= -1 && b <= bays) {
      const zc = zOf(b); const sky = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.2), skyMat); sky.rotation.x = Math.PI / 2; sky.position.set(0, SPRING_Y + VAULT_R - 0.06, zc); scene.add(sky);
      for (const k of [-0.6, 0.6]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 5.2), darkWood); bar.position.set(k, SPRING_Y + VAULT_R - 0.09, zc); scene.add(bar); }
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3.4, 14, 24, 1, true), shaftMat); shaft.position.set(0, SPRING_Y + VAULT_R - 7.2, zc); scene.add(shaft);
      // chandelier: brass hoops with candle flames
      const ch = new THREE.Group(); ch.position.set(0, 11.2, zc);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.6, 6), brass); chain.position.y = 2.3; ch.add(chain);
      [0.9, 0.62].forEach((r, i) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 10, 48), brass); ring.rotation.x = Math.PI / 2; ring.position.y = -i * 0.34; ch.add(ring); });
      const hub = new THREE.Mesh(latheProfile([[0.001, 0.2], [0.12, 0.12], [0.2, 0], [0.1, -0.2], [0.001, -0.5]], 20), brass); ch.add(hub);
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; const r = k % 2 ? 0.62 : 0.9; const y = k % 2 ? -0.34 : 0; const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0xf2e8d0, roughness: 0.6 })); cup.position.set(Math.cos(a) * r, y + 0.1, Math.sin(a) * r); ch.add(cup); bulbs.push(new THREE.Vector3(Math.cos(a) * r, y + 0.26 + 11.2 - 11.2, Math.sin(a) * r).add(new THREE.Vector3(0, 11.2, zc))); }
      scene.add(ch); chand.push(ch);
    }
  }
  const flameGeo = new THREE.SphereGeometry(0.045, 8, 8); flameGeo.scale(1, 1.8, 1);
  const flames = new THREE.InstancedMesh(flameGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc468).multiplyScalar(4), toneMapped: false }), bulbs.length);
  bulbs.forEach((p, i) => { flames.setMatrixAt(i, new THREE.Matrix4().setPosition(p)); }); scene.add(flames);
  // far wall: a tall arched window you walk towards
  const endWin = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 12), new THREE.MeshBasicMaterial({ map: windowTexture(), color: new THREE.Color(0xffffff).multiplyScalar(1.7), toneMapped: false, fog: true }));
  endWin.position.set(0, 7, zMin + 0.3); scene.add(endWin);
  const endWall = new THREE.Mesh(new THREE.PlaneGeometry(WALL_X * 2 + 2, 18), plasterOut); endWall.position.set(0, 9, zMin + 0.2); (endWall.material as THREE.Material).side = THREE.FrontSide; scene.add(endWall); endWall.position.z = zMin + 0.1;
  endWin.position.z = zMin + 0.3;

  // ---- colonnade + gallery ----
  const shaftGeo = flutedShaft(0.32, GALLERY_Y - 0.55, 20, 0.03);
  const baseGeo = latheProfile([[0.52, 0], [0.52, 0.1], [0.44, 0.16], [0.4, 0.22], [0.36, 0.3], [0.001, 0.3]], 32);
  const capGeo = latheProfile([[0.34, 0], [0.4, 0.06], [0.5, 0.14], [0.56, 0.2], [0.58, 0.3], [0.001, 0.3]], 32);
  const abacus = new THREE.BoxGeometry(1.24, 0.12, 1.24);
  const slabGeo = new THREE.BoxGeometry(WALL_X - COL_X + 0.5, 0.28, BAY);
  for (let b = -2; b <= bays + 1; b++) {
    const z = zOf(b) + BAY / 2;
    for (const sx of [-1, 1]) {
      const col = new THREE.Group(); col.position.set(sx * COL_X, 0, z);
      const bs = new THREE.Mesh(baseGeo, marble); col.add(bs);
      const sh = new THREE.Mesh(shaftGeo, marble); sh.position.y = 0.3 + (GALLERY_Y - 0.55) / 2; col.add(sh);
      const cp = new THREE.Mesh(capGeo, marble); cp.position.y = GALLERY_Y - 0.55 + 0.3; col.add(cp);
      const ab = new THREE.Mesh(abacus, marble); ab.position.y = GALLERY_Y - 0.55 + 0.66; col.add(ab);
      add(col, true, true);
      // wall pilaster above the gallery
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.7, SPRING_Y, 0.7), marble); pil.position.set(sx * (WALL_X + 0.35), SPRING_Y / 2, z); add(pil, true, true);
    }
  }
  const slabs = new THREE.InstancedMesh(slabGeo, darkWood, (bays + 4) * 2); let si = 0;
  const trim = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.34, BAY), brass, (bays + 4) * 2); let ti = 0;
  for (let b = -2; b <= bays + 1; b++) for (const sx of [-1, 1]) { const m = new THREE.Matrix4().setPosition(sx * (COL_X + (WALL_X - COL_X) / 2 + 0.25), GALLERY_Y - 0.14, zOf(b)); slabs.setMatrixAt(si++, m); trim.setMatrixAt(ti++, new THREE.Matrix4().setPosition(sx * (COL_X - 0.0), GALLERY_Y - 0.14, zOf(b))); }
  slabs.castShadow = hi; slabs.receiveShadow = hi; scene.add(slabs, trim);
  // brass railing
  const nBal = Math.floor(hallLen / 0.16);
  const bals = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 6), brass, nBal * 2);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, hallLen), brass);
  for (const sx of [-1, 1]) { const r = rail.clone(); r.position.set(sx * COL_X, GALLERY_Y + 0.98, zMid); scene.add(r); const r2 = rail.clone(); r2.scale.set(0.5, 0.6, 1); r2.position.set(sx * COL_X, GALLERY_Y + 0.02, zMid); scene.add(r2); for (let k = 0; k < nBal; k++) bals.setMatrixAt(k + (sx > 0 ? nBal : 0), new THREE.Matrix4().setPosition(sx * COL_X, GALLERY_Y + 0.5, zMin + k * 0.16)); }
  scene.add(bals);

  // ---- bookcases: frames, boards and thousands of real, individually coloured books ----
  const atlas = spineAtlas(); atlas.anisotropy = maxAniso; toDispose.push(atlas);
  const bookMat = new THREE.MeshStandardMaterial({ map: atlas, bumpMap: atlas, bumpScale: 1.6, roughness: 0.72, metalness: 0 });
  bookMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aAtlas;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x = (vMapUv.x + aAtlas) / 8.0;\n#endif\n#ifdef USE_BUMPMAP\nvBumpMapUv.x = (vBumpMapUv.x + aAtlas) / 8.0;\n#endif');
  };
  // a book is three visible faces: spine (+x), top, bottom. Everything else points at the cover strip of the atlas column.
  const bookGeo = (() => { const g = new THREE.BoxGeometry(1, 1, 1); const uv = g.attributes.uv; const idx = g.index!; void idx; for (let f = 0; f < 6; f++) { if (f === 0) continue; for (let k = 0; k < 4; k++) uv.setXY(f * 4 + k, 0.5, 0.012); } return g; })();
  const wood = new THREE.MeshStandardMaterial({ map: walnut, bumpMap: walnutBump, bumpScale: 0.5, roughness: 0.5, color: 0x8a6a52 });
  const tiers = [{ y0: 0.34, shelves: hi ? 9 : 6, step: hi ? 0.42 : 0.62 }, { y0: GALLERY_Y + 0.32, shelves: hi ? 8 : 5, step: hi ? 0.42 : 0.62 }];
  const r = rng(1234); const dummy = new THREE.Object3D(); const color = new THREE.Color();
  for (let b = -1; b <= bays; b++) {
    const z0 = zOf(b) - BAY / 2 + 0.55, z1 = zOf(b) + BAY / 2 - 0.55;
    for (const sx of [-1, 1]) {
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.12, SPRING_Y - 0.6, BAY - 0.6), darkWood); back.position.set(sx * (WALL_X + 0.6), (SPRING_Y - 0.6) / 2 + 0.05, zOf(b)); add(back, false, true);
      const boards: THREE.Matrix4[] = []; const spines: { m: THREE.Matrix4; c: THREE.Color; a: number }[] = [];
      for (const t of tiers) for (let s = 0; s < t.shelves; s++) {
        const y = t.y0 + s * t.step; boards.push(new THREE.Matrix4().setPosition(sx * (WALL_X + 0.32), y - 0.02, zOf(b)));
        let z = z0 + r() * 0.1;
        while (z < z1 - 0.1) {
          const w = (hi ? 0.035 : 0.05) + r() * 0.07; if (r() < 0.04) { z += 0.12 + r() * 0.3; continue; } // a gap now and then
          const h = 0.26 + r() * 0.1, d = 0.22 + r() * 0.08; const lean = r() < 0.03 ? (r() - 0.5) * 0.3 : 0;
          dummy.position.set(sx * (WALL_X + 0.4 - (0.3 - d) * 0.5 + (r() - 0.5) * 0.02 - d / 2 + 0.12), y + h / 2, z + w / 2); dummy.rotation.set(lean, 0, 0); dummy.scale.set(sx > 0 ? d : d, h, w); if (sx < 0) dummy.rotation.y = Math.PI; dummy.updateMatrix();
          const k = 0.75 + r() * 0.4; color.setRGB(k * (0.95 + r() * 0.1), k * (0.95 + r() * 0.1), k); spines.push({ m: dummy.matrix.clone(), c: color.clone(), a: (r() * 8) | 0 });
          z += w + 0.004;
        }
      }
      const bi = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.04, BAY - 0.7), wood, boards.length); boards.forEach((m, i) => bi.setMatrixAt(i, m)); bi.receiveShadow = hi; scene.add(bi);
      const geo = bookGeo.clone(); const att = new Float32Array(spines.length); const mesh = new THREE.InstancedMesh(geo, bookMat, spines.length);
      spines.forEach((s, i) => { mesh.setMatrixAt(i, s.m); mesh.setColorAt(i, s.c); att[i] = s.a; }); geo.setAttribute('aAtlas', new THREE.InstancedBufferAttribute(att, 1)); mesh.receiveShadow = hi; mesh.instanceMatrix.needsUpdate = true; scene.add(mesh);
    }
    // a library ladder leaning on the shelves in a few bays
    if (b >= 0 && b % 2 === 1 && b < bays) {
      const sx = b % 4 === 1 ? -1 : 1; const lad = new THREE.Group();
      for (const dz of [-0.3, 0.3]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.4, 0.05), wood); rail.position.set(0, 2.2, dz); rail.rotation.z = 0.12 * sx; lad.add(rail); }
      for (let k = 0; k < 11; k++) { const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8), wood); rung.rotation.x = Math.PI / 2; rung.position.set(-0.12 * sx * (k * 0.4) / 4.4 * 1, 0.4 + k * 0.38, 0); lad.add(rung); }
      lad.position.set(sx * (WALL_X - 0.5), 0, zOf(b) + 1.5); lad.rotation.y = 0; add(lad, true, true);
    }
  }

  // ---- certificates on lecterns ----
  const holders: { g: THREE.Group; z: number; sheet: THREE.Mesh; glass: THREE.Mesh }[] = [];
  const goldFrame = new THREE.MeshStandardMaterial({ color: 0xd2a645, metalness: 1, roughness: 0.38, envMapIntensity: 0.6 });
  const wax = new THREE.MeshPhysicalMaterial({ color: 0x8a1420, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.4 });
  const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x8a1c2a, roughness: 0.55, metalness: 0.0, side: THREE.DoubleSide });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0, envMapIntensity: 0.5, specularIntensity: 0.5, depthWrite: false });
  const FW = 1.62, FH = FW / 1.414;
  const frameShape = (() => { const s = new THREE.Shape(); const w = FW / 2 + 0.11, h = FH / 2 + 0.11; s.moveTo(-w, -h); s.lineTo(w, -h); s.lineTo(w, h); s.lineTo(-w, h); s.lineTo(-w, -h); const hole = new THREE.Path(); const iw = FW / 2, ih = FH / 2; hole.moveTo(-iw, -ih); hole.lineTo(-iw, ih); hole.lineTo(iw, ih); hole.lineTo(iw, -ih); hole.lineTo(-iw, -ih); s.holes.push(hole); return s; })();
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.045, bevelSegments: 8, curveSegments: 2 });
  const innerFrame = (() => { const s = new THREE.Shape(); const w = FW / 2 + 0.012, h = FH / 2 + 0.012; s.moveTo(-w, -h); s.lineTo(w, -h); s.lineTo(w, h); s.lineTo(-w, h); s.lineTo(-w, -h); const hole = new THREE.Path(); const iw = FW / 2 - 0.02, ih = FH / 2 - 0.02; hole.moveTo(-iw, -ih); hole.lineTo(-iw, ih); hole.lineTo(iw, ih); hole.lineTo(iw, -ih); hole.lineTo(-iw, -ih); s.holes.push(hole); return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }); })();
  const lecternBody = latheProfile([[0.001, 0], [0.34, 0], [0.36, 0.05], [0.28, 0.12], [0.2, 0.2], [0.17, 0.35], [0.2, 0.55], [0.14, 0.62], [0.17, 0.8], [0.24, 0.86], [0.001, 0.86]], 40);
  const n0 = items.length ? items : [null as unknown as AcademyItem];
  n0.forEach((item, i) => {
    const z = lecternZ(i); const g = new THREE.Group(); g.position.set(0, 0, z);
    const body = new THREE.Mesh(lecternBody, woodMat); g.add(body);
    const desk = new THREE.Group(); desk.position.set(0, 0.98, 0); desk.rotation.x = 0.8; g.add(desk);
    const top = new THREE.Mesh(new THREE.BoxGeometry(FW + 0.5, 0.07, FH + 0.4), woodMat); top.position.z = 0; desk.add(top);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(FW + 0.5, 0.06, 0.07), brass); lip.position.set(0, 0.04, (FH + 0.4) / 2 - 0.03); desk.add(lip);
    const frame = new THREE.Mesh(frameGeo, goldFrame); frame.position.set(0, 0.2, -0.0); frame.rotation.x = Math.PI / 2; frame.position.y = 0.045; desk.add(frame);
    const mat = new THREE.Mesh(innerFrame, new THREE.MeshStandardMaterial({ color: 0x1a120a, roughness: 0.8 })); mat.rotation.x = Math.PI / 2; mat.position.y = 0.05; desk.add(mat);
    const pt = paperTexture(item || null); toDispose.push(pt); const bump = pt;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshStandardMaterial({ map: pt, color: 0xb8b8b8, bumpMap: bump, bumpScale: 0.4, roughness: 0.92, metalness: 0, envMapIntensity: 0.3 }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.y = 0.055; desk.add(sheet);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(FW + 0.03, FH + 0.03), glassMat); glass.rotation.x = -Math.PI / 2; glass.position.y = 0.075; desk.add(glass);
    // wax seal and ribbon, lying on the paper
    const seal = new THREE.Group(); seal.position.set(FW * 0.33, 0.062, FH * 0.27); desk.add(seal);
    const blob = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.022, 36), wax); blob.scale.set(1, 1, 0.96); seal.add(blob);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 10, 36), wax); ring.rotation.x = Math.PI / 2; ring.position.y = 0.014; seal.add(ring);
    for (const s of [-1, 1]) { const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.28), ribbonMat); tail.rotation.set(-Math.PI / 2, 0, s * 0.28); tail.position.set(s * 0.045, -0.002, 0.2); seal.add(tail); }
    add(g, true, true);
    // spot: a warm museum light from above and a little in front
    holders.push({ g, z, sheet, glass });
  });

  // ---- floating dust, lit by the shafts ----
  const M = hi ? 900 : 380; const dpos = new Float32Array(M * 3); const dr = rng(9);
  for (let i = 0; i < M; i++) { dpos[i * 3] = (dr() - 0.5) * 11; dpos[i * 3 + 1] = dr() * 14; dpos[i * 3 + 2] = zMin + dr() * hallLen; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dustTex = dustSprite(); toDispose.push(dustTex);
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: dustTex, size: 0.09, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, color: 0xffe2b0 }));
  scene.add(dust);

  // ---- post: bloom, vignette, grain, tone mapping ----
  const size = new THREE.Vector2();
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: hi ? Math.min(4, renderer.capabilities.maxSamples) : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), hi ? 0.35 : 0.25, 0.5, 1.05); composer.addPass(bloom);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float time; uniform vec2 res; varying vec2 vUv; void main(){ vec2 d = vUv - 0.5; float r = dot(d,d); vec3 c; c.r = texture2D(tDiffuse, vUv + d*0.0022*r*4.0).r; c.g = texture2D(tDiffuse, vUv).g; c.b = texture2D(tDiffuse, vUv - d*0.0022*r*4.0).b; c *= 1.0 - smoothstep(0.18, 0.95, r*2.0)*0.6; float n = fract(sin(dot(vUv*res + fract(time)*91.7, vec2(12.9898,78.233)))*43758.5453); c += (n-0.5)*0.022; gl_FragColor = vec4(c,1.0); }',
  });
  composer.addPass(grade); composer.addPass(new OutputPass());

  let cur = 0, shown = 0, raf = 0, disposed = false, visible = true;
  const clock = new THREE.Clock(); const look = new THREE.Vector3();
  const resize = () => {
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); renderer.getDrawingBufferSize(size); grade.uniforms.res.value.copy(size);
    camera.aspect = w / h; camera.fov = w / h < 0.8 ? 58 : 40; camera.updateProjectionMatrix();
  };
  const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; }); io.observe(cv);

  const tick = () => {
    if (disposed) return; raf = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.5); const t = clock.elapsedTime;
    shown += (cur - shown) * (1 - Math.exp(-dt * 3.2));
    const intro = 1 - ease(clamp(shown / 0.5));               // wide establishing shot that settles on the first certificate
    const zc = lecternZ(0) + 4.4 - shown * BAY + intro * 7.5;
    const sway = Math.sin(t * 0.37) * 0.05, bob = Math.sin(t * 0.8) * 0.012;
    const cx = narrow ? 0.15 : 0.95;
    camera.position.set(cx + sway + intro * 0.6, 1.72 + bob + intro * 0.7, zc);
    look.set(narrow ? 0 : -0.05 + sway * 0.4, 1.0 + intro * 0.9, zc - 3.4 - intro * 4);
    camera.lookAt(look);
    // the nearest lectern gets the spotlights, candle light follows the walker
    const idx = clamp(shown, 0, n - 1); const near = Math.round(idx);
    spots.forEach((s, k) => { const h = holders[clamp(near + k - (k ? 0 : 0), 0, holders.length - 1)]; const hz = h ? h.z : lecternZ(0); s.position.set(k ? -1.3 : 1.2, 5.6, hz + 1.8); s.target.position.set(0, 1.2, hz); s.intensity = 55 * (k ? 0.45 : 1); });
    candles.forEach((l, k) => { l.position.set(k === 1 ? 2.2 : -2.2, 8.6, zc - 3 - k * BAY * 0.9); l.intensity = 300 * (1 + Math.sin(t * 7 + k * 2) * 0.04 + Math.sin(t * 13 + k) * 0.02); });
    moon.position.set(3, 22, zc + 4); moon.target.position.set(0, 0, zc - 4);
    chand.forEach((c, i) => { c.rotation.y = Math.sin(t * 0.2 + i) * 0.1; });
    holders.forEach(({ g, glass }, i) => { (glass.material as THREE.MeshPhysicalMaterial).opacity = 0.1; g.rotation.y = Math.sin(t * 0.3 + i) * 0.012; });
    dust.position.y = Math.sin(t * 0.17) * 0.5; dust.rotation.y = t * 0.004;
    grade.uniforms.time.value = t;
    composer.render();
  };
  resize(); window.addEventListener('resize', resize); tick();

  return {
    setPos: (p: number) => { cur = p; },
    setNarrow: (v: boolean) => { narrow = v; },
    dispose: () => {
      disposed = true; cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', resize);
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => { const any = x as THREE.MeshStandardMaterial; any.map?.dispose?.(); x.dispose(); }); });
      toDispose.forEach((t) => t.dispose()); reflector?.dispose?.(); composer.dispose(); rt.dispose(); pmrem.dispose(); renderer.dispose();
    },
  };
}
