/**
 * A galaxy of the owner's engineering domains. Each domain is a planet; its moons are the real projects filed
 * under it and its sparks are the real skills logged in it, so a bigger world means more work behind it.
 * The camera flies from world to world as the page scrolls.
 */
import * as THREE from 'three';

export interface GalaxyDomain { name: string; projects: number; skills: number; hue: number }

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

function planetTexture(hue: number, seed: number) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!; const r = rng(seed);
  const base = g.createLinearGradient(0, 0, 0, 256);
  base.addColorStop(0, `hsl(${hue} 70% 22%)`); base.addColorStop(0.5, `hsl(${hue} 75% 48%)`); base.addColorStop(1, `hsl(${hue + 20} 70% 18%)`);
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 26; i++) {
    const y = r() * 256, h = 4 + r() * 22;
    g.fillStyle = `hsla(${hue + (r() - 0.5) * 50}, 80%, ${40 + r() * 35}%, ${0.1 + r() * 0.22})`; g.fillRect(0, y, 512, h);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `hsla(${hue + 30}, 90%, 80%, ${0.04 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 512, r() * 256, 10 + r() * 50, 3 + r() * 10, 0, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTexture(hue: number) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `hsla(${hue},95%,75%,.9)`); gr.addColorStop(0.35, `hsla(${hue},90%,55%,.35)`); gr.addColorStop(1, `hsla(${hue},90%,50%,0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function labelSprite(text: string) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const g = c.getContext('2d')!; g.font = '700 70px "Cinzel", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(243,201,105,.8)'; g.shadowBlur = 24; g.fillStyle = '#fff3c4'; g.fillText(text.toUpperCase(), 512, 84);
  const m = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  const s = new THREE.Sprite(m); s.scale.set(8, 1.25, 1); return s;
}

export function createDomainGalaxy(opts: { canvas: HTMLCanvasElement; domains: GalaxyDomain[]; narrow: boolean }) {
  const { canvas, domains } = opts;
  let narrow = opts.narrow;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07061a, 0.012);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  scene.add(new THREE.AmbientLight(0x6a5cc0, 0.45));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.15); sun.position.set(-6, 5, 8); scene.add(sun);

  const rand = rng(11);
  const pos = domains.map((_, i) => new THREE.Vector3(Math.sin(i * 1.15) * 7.5, Math.cos(i * 0.8) * 3, -i * 17));

  type World = { group: THREE.Group; planet: THREE.Mesh; shell: THREE.Mesh; ring: THREE.Mesh; sparks: THREE.Points; moons: { m: THREE.Mesh; r: number; sp: number; ph: number; tilt: number }[]; glow: THREE.Sprite; label: THREE.Sprite; radius: number };
  const worlds: World[] = domains.map((d, i) => {
    const radius = Math.min(2.9, 1.6 + 0.11 * Math.min(12, d.projects + d.skills));
    const group = new THREE.Group(); group.position.copy(pos[i]); scene.add(group);
    const tex = planetTexture(d.hue, 100 + i * 13);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.1, emissive: new THREE.Color(`hsl(${d.hue} 70% 25%)`), emissiveIntensity: 0.12 }));
    group.add(planet);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * 1.1, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(`hsl(${d.hue} 90% 70%)`), wireframe: true, transparent: true, opacity: 0.18 }));
    group.add(shell);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.75, 0.025, 8, 160), new THREE.MeshBasicMaterial({ color: 0xf3c969, transparent: true, opacity: 0.7 }));
    ring.rotation.x = Math.PI / 2 + 0.35; ring.rotation.y = 0.3; group.add(ring);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(d.hue), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(radius * 6); group.add(glow);

    const moons = Array.from({ length: Math.min(10, d.projects) }, (_, k) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), new THREE.MeshStandardMaterial({ color: 0xffd45a, emissive: 0xc88a10, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.6 }));
      group.add(m); return { m, r: radius * (2.1 + (k % 3) * 0.32), sp: 0.35 + rand() * 0.35, ph: rand() * 6.28, tilt: (rand() - 0.5) * 0.9 };
    });
    const n = Math.min(120, d.skills * 6); const sp = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { const a = rand() * 6.28, b = Math.acos(2 * rand() - 1), rr = radius * (1.3 + rand() * 0.35); sp[k * 3] = rr * Math.sin(b) * Math.cos(a); sp[k * 3 + 1] = rr * Math.cos(b); sp[k * 3 + 2] = rr * Math.sin(b) * Math.sin(a); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.09, color: 0xfff3c4, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); group.add(sparks);
    const label = labelSprite(d.name); label.position.set(0, radius + 1.5, 0); group.add(label);
    return { group, planet, shell, ring, sparks, moons, glow, label, radius };
  });

  // hyperlane through every world
  const curve = new THREE.CatmullRomCurve3(pos.length > 1 ? pos : [pos[0], pos[0].clone().add(new THREE.Vector3(0, 0, -1))]);
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(pos.length * 40)), new THREE.LineBasicMaterial({ color: 0xf3c969, transparent: true, opacity: 0.35 })));

  // stars
  const N = 900; const stp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { stp[i * 3] = (rand() - 0.5) * 120; stp[i * 3 + 1] = (rand() - 0.5) * 70; stp[i * 3 + 2] = 20 - rand() * (domains.length * 17 + 60); }
  const stg = new THREE.BufferGeometry(); stg.setAttribute('position', new THREE.BufferAttribute(stp, 3));
  scene.add(new THREE.Points(stg, new THREE.PointsMaterial({ size: 0.12, color: 0xcbbcff, transparent: true, opacity: 0.8, depthWrite: false })));

  let target = 0, cur = 0;
  function resize() { const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  const clock = new THREE.Clock(); let raf = 0, running = true;
  const look = new THREE.Vector3(), camP = new THREE.Vector3();
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    cur += (target - cur) * Math.min(1, dt * 6);
    const i0 = Math.max(0, Math.min(domains.length - 1, Math.floor(cur))), i1 = Math.min(domains.length - 1, i0 + 1), f = cur - i0;
    const lerpV = (a: THREE.Vector3, b: THREE.Vector3) => new THREE.Vector3().lerpVectors(a, b, f);
    const P = lerpV(pos[i0], pos[i1]);
    const swing = Math.sin(f * Math.PI);
    const off = narrow ? new THREE.Vector3(0, 0.8, 26) : new THREE.Vector3(-4.2, 1.2, 16);
    camP.copy(P).add(off).add(new THREE.Vector3(swing * 4, swing * 1.5, 0));
    camera.position.copy(camP);
    look.copy(P).add(narrow ? new THREE.Vector3(0, -5.2, 0) : new THREE.Vector3(-5, 0, 0)); camera.lookAt(look);
    camera.rotation.z += swing * 0.12;

    worlds.forEach((w, i) => {
      const near = Math.max(0, 1 - Math.abs(i - cur));
      w.planet.rotation.y += dt * (0.15 + 0.2 * near); w.shell.rotation.y -= dt * 0.1; w.shell.rotation.x += dt * 0.05; w.sparks.rotation.y += dt * 0.2;
      w.group.scale.setScalar(0.82 + 0.28 * near);
      (w.glow.material as THREE.SpriteMaterial).opacity = 0.35 + 0.65 * near;
      (w.label.material as THREE.SpriteMaterial).opacity = 0.25 + 0.75 * near;
      w.moons.forEach((m) => { const a = t * m.sp + m.ph; m.m.position.set(Math.cos(a) * m.r, Math.sin(a) * m.r * Math.sin(m.tilt), Math.sin(a) * m.r * Math.cos(m.tilt)); });
    });
    renderer.render(scene, camera);
  }
  frame();

  return {
    setPos(p: number) { target = Math.max(0, Math.min(domains.length - 1, p)); },
    setNarrow(v: boolean) { narrow = v; },
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose?.(); x.dispose(); }); });
      renderer.dispose();
    },
  };
}
