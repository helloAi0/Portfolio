/**
 * The Academy: a long hall of books where the camera walks forward, arch by arch. Every certificate hangs under its
 * own arch as a parchment with a ribbon and a gold seal, and a mortarboard floats above the first arch. With no
 * certificates yet it is the same hall with one blank parchment, so the "coming soon" page is still alive.
 */
import * as THREE from 'three';

const STEP = 18;
const HALL = 7; // half width

export interface AcademyItem { title: string; org: string }

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  const words = text.split(' '); let line = ''; const lines: string[] = [];
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((l, i) => g.fillText(l, x, y + i * lh));
  return Math.min(lines.length, maxLines);
}

function parchment(item: AcademyItem | null) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 512;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 768, 512); bg.addColorStop(0, '#f3e6c4'); bg.addColorStop(1, '#e6d3a3');
  g.fillStyle = bg; g.fillRect(0, 0, 768, 512);
  g.strokeStyle = '#9a7326'; g.lineWidth = 6; g.strokeRect(22, 22, 724, 468);
  g.lineWidth = 2; g.strokeRect(36, 36, 696, 440);
  g.textAlign = 'center'; g.fillStyle = '#4a3410';
  g.font = '600 22px Georgia, serif'; g.fillText(item ? 'CERTIFICATE' : 'CERTIFICATES', 384, 96);
  if (item) {
    g.font = '700 46px Georgia, serif';
    const used = wrap(g, item.title, 384, 190, 600, 54, 3);
    g.font = 'italic 26px Georgia, serif'; g.fillStyle = '#6b4d17';
    g.fillText(item.org.slice(0, 48), 384, 190 + used * 54 + 28);
  } else {
    g.font = '700 54px Georgia, serif'; g.fillText('Coming soon', 384, 230);
    g.strokeStyle = 'rgba(74,52,16,0.35)'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(170, 300 + i * 36); g.lineTo(598, 300 + i * 36); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

function spineTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  const pal = ['#5b1f2a', '#1f3b5b', '#2f5b3a', '#6b4d17', '#3b2a5b', '#7a3b1f', '#18424a', '#4a1f3b'];
  let x = 0;
  while (x < 512) {
    const w = 10 + Math.random() * 16; const col = pal[(Math.random() * pal.length) | 0];
    g.fillStyle = col; g.fillRect(x, 0, w, 256);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + w - 2, 0, 2, 256);
    g.fillStyle = 'rgba(240,200,110,0.7)'; g.fillRect(x + 2, 40 + Math.random() * 20, w - 6, 3); g.fillRect(x + 2, 190 + Math.random() * 20, w - 6, 3);
    x += w;
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function mortarboard() {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b44a, metalness: 0.8, roughness: 0.3, emissive: 0x3a2a08 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.4), black); top.rotation.y = Math.PI / 4; g.add(top);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.7, 28), black); cap.position.y = -0.4; g.add(cap);
  const btn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), gold); btn.position.y = 0.1; g.add(btn);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 6), gold); cord.position.set(0.9, -0.5, 0.9); g.add(cord);
  const tas = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.34, 10), gold); tas.position.set(0.9, -1.2, 0.9); g.add(tas);
  const strand = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.025, 6, 40, Math.PI), gold); strand.rotation.set(0, Math.PI / 4, 0); strand.position.set(0, 0.07, 0); g.add(strand);
  return g;
}

export function createAcademy(opts: { canvas: HTMLCanvasElement; items: AcademyItem[]; narrow: boolean }) {
  const { canvas, items } = opts;
  let narrow = opts.narrow;
  const n = Math.max(1, items.length);
  const len = n * STEP + 40;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f24);
  scene.fog = new THREE.Fog(0x0b0f24, 18, 70);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  scene.add(new THREE.AmbientLight(0x8d9ad8, 0.9));
  const key = new THREE.DirectionalLight(0xffe2b0, 0.9); key.position.set(3, 10, 6); scene.add(key);

  // floor: dark polished tile
  const fc = document.createElement('canvas'); fc.width = fc.height = 128;
  { const g = fc.getContext('2d')!; g.fillStyle = '#10163a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#161d48'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); g.strokeStyle = 'rgba(224,180,74,0.5)'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128); }
  const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(HALL, len / 2 / 1.0);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL * 2, len + 40), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.35, metalness: 0.4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -len / 2 + 10); scene.add(floor);

  // book walls
  const st = spineTexture(); st.repeat.set(len / 12, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: st, roughness: 0.8 });
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 12, len + 40), wallMat);
    wall.position.set(sx * (HALL + 0.7), 6, -len / 2 + 10); scene.add(wall);
    for (let y = 2; y <= 10; y += 2.6) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, len + 40), new THREE.MeshStandardMaterial({ color: 0x2a1c0c, roughness: 0.7 }));
      shelf.position.set(sx * (HALL - 0.1), y, -len / 2 + 10); scene.add(shelf);
    }
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALL * 2 + 4, len + 40), new THREE.MeshBasicMaterial({ color: 0x070a1a })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 12, -len / 2 + 10); scene.add(ceil);

  // arches + certificates
  const stone = new THREE.MeshStandardMaterial({ color: 0xc9b37a, roughness: 0.55, metalness: 0.2 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xe0b44a, metalness: 0.85, roughness: 0.28, emissive: 0x3a2a08 });
  const red = new THREE.MeshStandardMaterial({ color: 0x9a1f2e, roughness: 0.6 });
  const holders: { g: THREE.Group; z: number }[] = [];
  const lights: THREE.PointLight[] = [];
  for (let i = 0; i < n; i++) {
    const z = -i * STEP - 14;
    for (const sx of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 9, 20), stone); col.position.set(sx * 5.2, 4.5, z); scene.add(col);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.5), goldM); cap.position.set(sx * 5.2, 9.1, z); scene.add(cap);
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.4, 12, 48, Math.PI), stone); arch.position.set(0, 9.2, z); scene.add(arch);
    const pl = new THREE.PointLight(0xffd68a, 28, 26, 1.6); pl.position.set(0, 7, z + 4); scene.add(pl); lights.push(pl);

    const grp = new THREE.Group(); grp.position.set(0, 4.4, z);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshStandardMaterial({ map: parchment(items[i] || null), roughness: 0.9, side: THREE.DoubleSide }));
    grp.add(sheet);
    for (const sy of [-1, 1]) { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 6.5, 16), goldM); rod.rotation.z = Math.PI / 2; rod.position.y = sy * 2.1; grp.add(rod); }
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.2, 0.04), red); rib.position.set(2.2, 0, 0.03); grp.add(rib);
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 28), goldM); seal.rotation.x = Math.PI / 2; seal.position.set(2.2, -1.2, 0.08); grp.add(seal);
    const sring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 28), goldM); sring.position.set(2.2, -1.2, 0.14); grp.add(sring);
    scene.add(grp); holders.push({ g: grp, z });
  }
  // the mortarboard floats over the first arch
  const cap = mortarboard(); cap.position.set(0, 10.6, -14); cap.scale.setScalar(1.3); scene.add(cap);

  // dust in the light
  const M = 420; const pos = new Float32Array(M * 3);
  for (let i = 0; i < M; i++) { pos[i * 3] = (Math.random() - 0.5) * HALL * 2; pos[i * 3 + 1] = Math.random() * 11; pos[i * 3 + 2] = -Math.random() * (len + 20); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffe2a0, size: 0.09, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(motes);

  let cur = 0, shown = 0, raf = 0, disposed = false;
  const clock = new THREE.Clock();
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 66 : 52; camera.updateProjectionMatrix();
  };
  const tick = () => {
    if (disposed) return; raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    shown += (cur - shown) * 0.08;
    const z0 = -shown * STEP + 2;
    camera.position.set(Math.sin(t * 0.3) * 0.5 + (narrow ? 0 : -2.2), 4.6 + Math.sin(t * 0.5) * 0.15, z0 + (n === 1 ? Math.sin(t * 0.2) * 0.8 : 0));
    camera.lookAt(narrow ? 0 : 0.6, 4.6, z0 - 14);
    holders.forEach(({ g }, i) => { g.rotation.y = Math.sin(t * 0.6 + i) * 0.12; g.position.y = 4.4 + Math.sin(t * 0.9 + i * 1.7) * 0.18; });
    cap.rotation.y = t * 0.5; cap.position.y = 10.6 + Math.sin(t * 0.8) * 0.3;
    lights.forEach((l, i) => { l.intensity = 22 + Math.max(0, 8 - Math.abs(i - shown) * 6) + Math.sin(t * 2 + i) * 1.5; });
    motes.position.y = Math.sin(t * 0.2) * 0.4;
    renderer.render(scene, camera);
  };
  resize(); window.addEventListener('resize', resize); tick();
  return {
    setPos: (p: number) => { cur = p; },
    setNarrow: (v: boolean) => { narrow = v; },
    dispose: () => { disposed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => x.dispose()); }); renderer.dispose(); },
  };
}
