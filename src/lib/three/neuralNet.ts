/**
 * A living neural network you fly through as you scroll. Five layers of nodes, every node wired to the next
 * layer, signals pulsing forward along the wires. The last layer is labelled with the fields the owner works in.
 * Purely visual (it is a picture of a network, not a trained model).
 */
import * as THREE from 'three';

export const OUTPUT_LABELS = ['AI', 'MACHINE LEARNING', 'DEEP LEARNING', 'NEURAL NETWORKS', 'ROBOTICS', 'AGENTIC AI'];
const SIZES = [5, 8, 9, 8, OUTPUT_LABELS.length];
const GAP = 6.5;

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const ease = (t: number) => t * t * (3 - 2 * t);

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.25, 'rgba(255,201,51,.65)'); gr.addColorStop(1, 'rgba(255,170,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill();
  return new THREE.CanvasTexture(c);
}
function labelSprite(text: string) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 160;
  const g = c.getContext('2d')!;
  g.font = '700 64px "Cinzel", Georgia, serif'; const w = g.measureText(text).width + 90;
  g.fillStyle = 'rgba(14,10,40,.82)'; g.strokeStyle = '#f3c969'; g.lineWidth = 4;
  const x = (768 - w) / 2, r = 40; g.beginPath(); g.roundRect(x, 20, w, 120, r); g.fill(); g.stroke();
  g.fillStyle = '#fff3c4'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 384, 82);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(m); s.scale.set(3.4, 0.71, 1); return s;
}

export function createNeuralNet(opts: { canvas: HTMLCanvasElement; reduceMotion: boolean }) {
  const { canvas } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07061a, 0.03);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 120);
  const glow = glowTexture();
  const dot = dotTexture();
  const rand = rng(7);

  // nodes
  const layers: THREE.Vector3[][] = SIZES.map((n, li) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + li * 0.7 + rand() * 0.4;
    const last = li === SIZES.length - 1;
    const rad = last ? 3.4 : 1.2 + rand() * 2.4;
    return new THREE.Vector3(Math.cos(a) * rad, Math.sin(a) * rad * (last ? 0.62 : 0.75), -li * GAP + (rand() - 0.5) * 1.2);
  }));
  const flat = layers.flat();
  const layerOf = SIZES.flatMap((n, li) => Array(n).fill(li));

  const nodeGeo = new THREE.BufferGeometry().setFromPoints(flat);
  const nodeColors = new Float32Array(flat.length * 3);
  nodeGeo.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));
  const nodes = new THREE.Points(nodeGeo, new THREE.PointsMaterial({ size: 1.1, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  scene.add(nodes);
  const cores = new THREE.Points(nodeGeo, new THREE.PointsMaterial({ size: 0.22, map: dot, alphaTest: 0.4, color: 0xfff3c4, transparent: true, depthWrite: false, sizeAttenuation: true }));
  scene.add(cores);

  // wires
  const edges: [THREE.Vector3, THREE.Vector3][] = [];
  for (let l = 0; l < layers.length - 1; l++) for (const a of layers[l]) for (const b of layers[l + 1]) edges.push([a, b]);
  const lp: number[] = []; edges.forEach(([a, b]) => lp.push(a.x, a.y, a.z, b.x, b.y, b.z));
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x7a5cff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })));

  // pulses (signals)
  const phase = edges.map(() => rand());
  const speed = edges.map(() => 0.25 + rand() * 0.35);
  const pp = new Float32Array(edges.length * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pulses = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.18, map: glow, color: 0xffd45a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  pulses.frustumCulled = false; scene.add(pulses);

  // labels on the output layer
  const labels = layers[layers.length - 1].map((v, i) => { const s = labelSprite(OUTPUT_LABELS[i]); s.position.set(v.x * 1.0, v.y * 1.0 + 0.7, v.z); scene.add(s); return s; });

  // dust
  const dp = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) { dp[i * 3] = (rand() - 0.5) * 24; dp[i * 3 + 1] = (rand() - 0.5) * 14; dp[i * 3 + 2] = 10 - rand() * 52; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.05, color: 0xb9a8ff, transparent: true, opacity: 0.6, depthWrite: false })));

  let progress = 0, smooth = 0;
  const zEnd = -(SIZES.length - 1) * GAP;
  function resize() {
    const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  const clock = new THREE.Clock(); let raf = 0, running = true;
  const look = new THREE.Vector3();
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    smooth += (progress - smooth) * Math.min(1, dt * 5);
    const e = ease(smooth);
    const camZ = 9 + (zEnd + 9.5 - 9) * e;
    const swirl = 1 - Math.pow(smooth, 3);
    camera.position.set(Math.sin(smooth * 5) * 1.8 * swirl, Math.cos(smooth * 3.4) * 0.9 * swirl, camZ);
    look.set(Math.sin(smooth * 5 + 0.6) * 0.8 * swirl, 0, camZ - 7); camera.lookAt(look);

    const boost = 1 + smooth * 1.5;
    for (let i = 0; i < edges.length; i++) {
      const f = (phase[i] + t * speed[i] * boost) % 1; const [a, b] = edges[i];
      pp[i * 3] = a.x + (b.x - a.x) * f; pp[i * 3 + 1] = a.y + (b.y - a.y) * f; pp[i * 3 + 2] = a.z + (b.z - a.z) * f;
    }
    (pg.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    for (let i = 0; i < flat.length; i++) {
      const wave = 0.55 + 0.45 * Math.sin(t * 2.2 - layerOf[i] * 1.1 + i);
      const lit = layerOf[i] === SIZES.length - 1 ? 0.7 + 0.3 * Math.sin(t * 3 + i) : wave;
      nodeColors[i * 3] = lit; nodeColors[i * 3 + 1] = lit * 0.78; nodeColors[i * 3 + 2] = lit * 0.25;
    }
    (nodeGeo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    labels.forEach((s, i) => { (s.material as THREE.SpriteMaterial).opacity = smooth > 0.62 ? Math.min(1, (smooth - 0.62) / 0.2) * (1 - 0.7 * Math.min(1, Math.max(0, (smooth - 0.86) / 0.1))) : 0; s.position.y = layers[layers.length - 1][i].y + 0.7 + Math.sin(t * 1.4 + i) * 0.05; });
    renderer.render(scene, camera);
  }
  frame();

  return {
    setProgress(p: number) { progress = Math.max(0, Math.min(1, p)); },
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { (x as THREE.SpriteMaterial).map?.dispose?.(); x.dispose(); }); });
      glow.dispose(); dot.dispose(); renderer.dispose();
    },
  };
}
