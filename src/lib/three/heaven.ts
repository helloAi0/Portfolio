/**
 * Honors in heaven: the camera climbs through cloud layers into warm light. Every honor sits at its own height as a
 * laurel wreath around a star, with light shafts falling through the clouds. With no honors yet it is one wreath
 * and a slow drift upward, so the "coming soon" page is still alive.
 */
import * as THREE from 'three';

const STEP = 16;

function cloudTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 9; i++) {
    const x = 70 + Math.random() * 116, y = 90 + Math.random() * 76, r = 40 + Math.random() * 46;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(c);
}
function glowTexture(inner: string) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.35, 'rgba(255,214,120,0.35)'); gr.addColorStop(1, 'rgba(255,214,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function rayTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, 'rgba(255,240,200,0.9)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const v = g.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.2, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = v; g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

export function createHeaven(opts: { canvas: HTMLCanvasElement; count: number; narrow: boolean }) {
  const { canvas } = opts;
  let narrow = opts.narrow;
  const n = Math.max(1, opts.count);
  const H = n * STEP + 30;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const low = new THREE.Color(0x141c44), mid = new THREE.Color(0x5a63b8), high = new THREE.Color(0xf0c88a), bg = new THREE.Color();
  scene.background = bg;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  scene.add(new THREE.AmbientLight(0xfff0d0, 1.0));
  const sunL = new THREE.DirectionalLight(0xfff4d6, 1.6); sunL.position.set(6, 20, 8); scene.add(sunL);

  // clouds in layers, so the camera passes through them
  const ctex = cloudTexture();
  const clouds: { s: THREE.Sprite; sp: number; x0: number }[] = [];
  for (let y = -4; y < H; y += 3.2) {
    const k = 3 + ((y * 7) | 0) % 3;
    for (let i = 0; i < k; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex, transparent: true, opacity: 0.3 + Math.random() * 0.25, depthWrite: false, color: new THREE.Color().setHSL(0.1 + Math.random() * 0.06, 0.35, 0.78 + Math.random() * 0.1) }));
      const sc = 9 + Math.random() * 12; s.scale.set(sc * 1.4, sc, 1);
      const x0 = (Math.random() - 0.5) * 44; s.position.set(x0, y + Math.random() * 2, -6 - Math.random() * 26 + (Math.random() < 0.25 ? 28 : 0));
      scene.add(s); clouds.push({ s, sp: 0.15 + Math.random() * 0.25, x0 });
    }
  }

  // light shafts
  const rtex = rayTexture();
  const rays: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5 + Math.random() * 6, H * 0.9), new THREE.MeshBasicMaterial({ map: rtex, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(-20 + i * 7 + Math.random() * 3, H * 0.55, -14 - Math.random() * 6); m.rotation.z = -0.25 + Math.random() * 0.1; scene.add(m); rays.push(m);
  }

  // the light above
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,1)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sun.scale.set(70, 70, 1); sun.position.set(0, H + 6, -30); scene.add(sun);

  // laurel + star for each honor
  const leafGeo = new THREE.SphereGeometry(0.3, 10, 8); leafGeo.scale(1, 0.38, 0.16);
  const gold = new THREE.MeshStandardMaterial({ color: 0xf3c969, emissive: 0xb07a10, emissiveIntensity: 0.55, metalness: 0.9, roughness: 0.28 });
  const glow = glowTexture('rgba(255,255,255,0.95)');
  const wreaths = Array.from({ length: n }, (_, i) => {
    const g = new THREE.Group(); g.position.set(narrow ? 0 : -3.2, 6 + i * STEP, 0); scene.add(g);
    const side = (dir: number) => {
      for (let k = 0; k < 15; k++) {
        const phi = Math.PI * (0.12 + (k / 14) * 0.78), R = 2.6;
        for (const out of [-1, 1]) {
          const leaf = new THREE.Mesh(leafGeo, gold);
          leaf.position.set(dir * R * Math.sin(phi) + dir * out * 0.12 * Math.cos(phi), -R * Math.cos(phi) + out * 0.12 * Math.sin(phi), 0);
          leaf.rotation.z = Math.atan2(Math.sin(phi), dir * Math.cos(phi)) + out * dir * 0.55;
          leaf.scale.setScalar(1.3 - (k / 14) * 0.35); g.add(leaf);
        }
      }
    };
    side(1); side(-1);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe9a8, emissiveIntensity: 1.2 })); star.scale.y = 1.5; g.add(star);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(8, 8, 1); g.add(halo);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.03, 8, 80), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.7 })); g.add(ring);
    return { g, star, halo, ring };
  });

  // golden motes rising
  const N = 360, sp = new Float32Array(N * 3), sv = new Float32Array(N);
  for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 36; sp[i * 3 + 1] = Math.random() * H; sp[i * 3 + 2] = (Math.random() - 0.5) * 20; sv[i] = 0.3 + Math.random() * 0.8; }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: false, color: 0xffe08a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(motes);

  let target = 0, cur = 0;
  function resize() { const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);
  const clock = new THREE.Clock(); let raf = 0, running = true;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    cur += (target - cur) * Math.min(1, dt * 4);
    const drift = opts.count === 0 ? Math.sin(t * 0.25) * 0.6 : 0;
    const camY = 6 + cur * STEP + drift;
    camera.position.set(narrow ? 0 : 1.5 + Math.sin(t * 0.2) * 0.5, camY, narrow ? 15 : 12);
    camera.lookAt(narrow ? 0 : -1.5, camY + (narrow ? 2.8 : 0.4), 0);
    const f = Math.min(1, camY / H);
    if (f < 0.5) bg.copy(low).lerp(mid, f * 2); else bg.copy(mid).lerp(high, (f - 0.5) * 2);
    clouds.forEach((c, i) => { c.s.position.x = c.x0 + Math.sin(t * c.sp + i) * 3; });
    rays.forEach((r, i) => { (r.material as THREE.MeshBasicMaterial).opacity = 0.1 + 0.08 * (0.5 + 0.5 * Math.sin(t * 0.5 + i)); });
    wreaths.forEach((w, i) => {
      const near = Math.max(0, 1 - Math.abs(cur - i));
      w.g.rotation.y = Math.sin(t * 0.4 + i) * 0.25; w.star.rotation.y += dt * 1.2; w.ring.rotation.x = t * 0.2; w.ring.rotation.y = t * 0.15;
      w.halo.scale.setScalar(6 + near * 2 + Math.sin(t * 2 + i) * 0.4); (w.halo.material as THREE.SpriteMaterial).opacity = 0.25 + near * 0.45;
      w.g.position.y = 6 + i * STEP + Math.sin(t * 0.9 + i) * 0.25;
    });
    const pa = mg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) { let y = pa.getY(i) + sv[i] * dt; if (y > H) y = 0; pa.setY(i, y); }
    pa.needsUpdate = true;
    renderer.render(scene, camera);
  }
  frame();
  return {
    setPos(p: number) { target = Math.max(0, Math.min(Math.max(0, n - 1), p)); },
    setNarrow(v: boolean) { narrow = v; },
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { (x as THREE.SpriteMaterial).map?.dispose?.(); x.dispose(); }); });
      renderer.dispose();
    },
  };
}
