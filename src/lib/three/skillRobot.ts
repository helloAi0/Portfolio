/**
 * A robot work-cell for the Skills page. Every skill domain is a module cartridge on a rotating turntable;
 * a six-axis-style arm (analytic two-link IK, yaw + shoulder + elbow) reaches over the module that faces you,
 * scans it with a laser and lights its skill chips. Chips are the real skills: brightness = self-rated level.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface BayDomain { name: string; levels: number[] }

function labelSprite(text: string) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const g = c.getContext('2d')!; g.font = '700 64px "Cinzel", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(120,220,255,.9)'; g.shadowBlur = 20; g.fillStyle = '#e8fbff'; g.fillText(text.toUpperCase().slice(0, 22), 512, 84);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(4.4, 0.69, 1); return s;
}

export function createSkillRobot(opts: { canvas: HTMLCanvasElement; domains: BayDomain[]; narrow: boolean }) {
  const { canvas, domains } = opts;
  let narrow = opts.narrow;
  const n = domains.length;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.fog = new THREE.FogExp2(0x060a14, 0.035);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 8, 6); scene.add(key);
  const rim = new THREE.PointLight(0x4fd8ff, 30, 30); rim.position.set(-6, 3, -4); scene.add(rim);

  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa7b8, metalness: 0.9, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0f1522, metalness: 0.8, roughness: 0.45 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xf3c969, metalness: 1, roughness: 0.25, emissive: 0x6a4a08, emissiveIntensity: 0.35 });
  const cyan = new THREE.Color(0x4fd8ff), gold = new THREE.Color(0xf3c969);

  // floor: grid + rings
  const grid = new THREE.GridHelper(40, 40, 0x1d6f86, 0x0f2a3a); (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.5; grid.position.y = -0.02; scene.add(grid);
  const R = 3.7;
  const floorRing = new THREE.Mesh(new THREE.TorusGeometry(R + 1.3, 0.02, 8, 160), new THREE.MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.6 })); floorRing.rotation.x = Math.PI / 2; scene.add(floorRing);

  // turntable with gear teeth
  const table = new THREE.Group(); scene.add(table);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.2, R + 1.2, 0.18, 96), dark); disc.position.y = 0.09; table.add(disc);
  const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.2, 0.3), steel, 72);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2; e.set(0, a, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(Math.sin(a) * (R + 1.28), 0.1, Math.cos(a) * (R + 1.28)), q, new THREE.Vector3(1, 1, 1)); teeth.setMatrixAt(i, m4); }
  table.add(teeth);
  const step = (Math.PI * 2) / Math.max(n, 3);
  const modW = Math.min(1.6, 2 * R * Math.sin(step / 2) * 0.66);

  type Mod = { g: THREE.Group; top: THREE.Mesh; chips: THREE.Mesh[]; label: THREE.Sprite; levels: number[] };
  const mods: Mod[] = domains.map((d, i) => {
    const g = new THREE.Group(); const a = i * step; g.position.set(Math.sin(a) * R, 0.18, Math.cos(a) * R); g.rotation.y = a; table.add(g);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(modW * 0.5, modW * 0.56, 0.9, 6), dark); body.position.y = 0.45; g.add(body);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(modW * 0.5, 0.025, 8, 6), goldM); trim.rotation.x = Math.PI / 2; trim.rotation.z = Math.PI / 6; trim.position.y = 0.9; g.add(trim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(modW * 0.42, modW * 0.42, 0.05, 6), new THREE.MeshStandardMaterial({ color: 0x0b2a35, emissive: cyan, emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.3 })); top.position.y = 0.93; g.add(top);
    const chips: THREE.Mesh[] = [];
    const cnt = Math.min(12, d.levels.length);
    for (let k = 0; k < cnt; k++) {
      const lvl = d.levels[k] || 1;
      const chip = new THREE.Mesh(new THREE.BoxGeometry(modW * 0.34, 0.1, modW * 0.34), new THREE.MeshStandardMaterial({ color: 0x0c1220, emissive: gold, emissiveIntensity: 0.12 + lvl * 0.28, metalness: 0.6, roughness: 0.35 }));
      chip.position.set((k % 2 ? 1 : -1) * modW * 0.2, 1.05 + Math.floor(k / 2) * 0.15, 0); g.add(chip); chips.push(chip);
    }
    const label = labelSprite(d.name); label.position.set(0, 2.9 + Math.min(6, Math.ceil(cnt / 2)) * 0.1, 0); g.add(label);
    return { g, top, chips, label, levels: d.levels };
  });

  // arm
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 0.5, 40), dark); base.position.y = 0.43; scene.add(base);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.03, 8, 60), goldM); baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.68; scene.add(baseRing);
  const SH = 1.5, L1 = 2.3, L2 = 2.1;
  const yaw = new THREE.Group(); yaw.position.set(0, 0.68, 0); scene.add(yaw);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, SH - 0.68, 32), steel); column.position.y = (SH - 0.68) / 2; yaw.add(column);
  const shoulder = new THREE.Group(); shoulder.position.y = SH - 0.68; yaw.add(shoulder);
  const jointA = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.7, 28), goldM); jointA.rotation.z = Math.PI / 2; shoulder.add(jointA);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, L1), steel); upper.position.z = L1 / 2; shoulder.add(upper);
  const elbow = new THREE.Group(); elbow.position.z = L1; shoulder.add(elbow);
  const jointB = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.55, 28), goldM); jointB.rotation.z = Math.PI / 2; elbow.add(jointB);
  const fore = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, L2), steel); fore.position.z = L2 / 2; elbow.add(fore);
  const wrist = new THREE.Group(); wrist.position.z = L2; elbow.add(wrist);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), dark); wrist.add(hand);
  const fingers = [-1, 1].map((s) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.34), goldM); f.position.set(s * 0.14, 0, 0.26); wrist.add(f); return f; });
  const lamp = new THREE.PointLight(0x4fd8ff, 6, 6); wrist.add(lamp);

  // laser
  const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]);
  const laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.9 })); scene.add(laser);
  const scan = new THREE.Mesh(new THREE.TorusGeometry(modW * 0.62, 0.012, 6, 48), new THREE.MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.85 })); scan.rotation.x = Math.PI / 2; scene.add(scan);

  // dust
  const N = 260, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 26; sp[i * 3 + 1] = Math.random() * 9; sp[i * 3 + 2] = (Math.random() - 0.5) * 26; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.05, color: 0x7fe4ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(dust);

  let target = 0, cur = 0;
  function resize() { const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  const tip = new THREE.Vector3(), tgt = new THREE.Vector3(), look = new THREE.Vector3(), mTmp = new THREE.Vector3();
  let yawC = 0, a1C = 0.6, a2C = 1.2;
  const clock = new THREE.Clock(); let raf = 0, running = true;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    cur += (target - cur) * Math.min(1, dt * 5);
    table.rotation.y = -cur * step;
    const act = Math.max(0, Math.min(n - 1, Math.round(cur)));
    const fr = Math.abs(cur - Math.round(cur)); // 0 at rest, up to 0.5 while turning
    mods.forEach((m, i) => {
      const on = i === act ? 1 - Math.min(1, fr * 2.4) : 0;
      m.g.position.y = 0.18 + on * 0.22;
      (m.top.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + on * 1.4;
      (m.label.material as THREE.SpriteMaterial).opacity = 0.2 + on * 0.8;
      m.chips.forEach((c, k) => { const lv = m.levels[k] || 1; (c.material as THREE.MeshStandardMaterial).emissiveIntensity = (0.12 + lv * 0.28) * (0.45 + on * 0.9) * (0.85 + 0.15 * Math.sin(t * 3 + k)); });
    });

    // arm target: above the facing module (world), with a reach sweep while the table turns
    const mod = mods[act];
    mod.g.getWorldPosition(mTmp);
    tgt.set(mTmp.x + Math.sin(t * 1.3) * 0.12, mTmp.y + 1.5 + Math.min(6, Math.ceil(mod.chips.length / 2)) * 0.15, mTmp.z + 0.1);
    const dx = tgt.x, dz = tgt.z, dy = tgt.y - 0.68 - (SH - 0.68);
    const yawT = Math.atan2(dx, dz);
    const d0 = Math.hypot(Math.hypot(dx, dz), dy);
    const dd = Math.min(L1 + L2 - 0.05, Math.max(0.9, d0));
    const gam = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - dd * dd) / (2 * L1 * L2))));
    const a1T = Math.atan2(dy, Math.hypot(dx, dz)) + Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd))));
    const a2T = Math.PI - gam;
    const k = Math.min(1, dt * 6);
    yawC += (yawT - yawC) * k; a1C += (a1T - a1C) * k; a2C += (a2T - a2C) * k;
    yaw.rotation.y = yawC; shoulder.rotation.x = -a1C; elbow.rotation.x = a2C; wrist.rotation.x = -(a2C - a1C) * 0.5 - 0.35;
    const open = 0.08 + 0.07 * (0.5 + 0.5 * Math.sin(t * 2.2));
    fingers[0].position.x = -0.06 - open; fingers[1].position.x = 0.06 + open;
    wrist.getWorldPosition(tip);
    const lp = laser.geometry.attributes.position as THREE.BufferAttribute;
    lp.setXYZ(0, tip.x, tip.y - 0.05, tip.z); lp.setXYZ(1, mTmp.x, mTmp.y + 0.95, mTmp.z); lp.needsUpdate = true;
    scan.position.set(mTmp.x, mTmp.y + 0.95 + ((t * 0.7) % 1) * (0.35 + mod.chips.length * 0.09), mTmp.z);
    (scan.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - Math.min(1, fr * 3));
    (laser.material as THREE.LineBasicMaterial).opacity = 0.9 * (1 - Math.min(1, fr * 3));
    lamp.intensity = 4 + 3 * Math.sin(t * 5);
    floorRing.rotation.z += dt * 0.1; dust.rotation.y += dt * 0.02;

    const orbit = Math.sin(t * 0.18) * 1.3;
    if (narrow) { camera.position.set(orbit - 4, 8, 17.5); look.set(0, -3.2, 0.5); } else { camera.position.set(orbit - 9, 6.4, 12); look.set(5.8, 1.0, 1.0); }
    camera.lookAt(look);
    renderer.render(scene, camera);
  }
  frame();

  return {
    setPos(p: number) { target = Math.max(0, Math.min(n - 1, p)); },
    setNarrow(v: boolean) { narrow = v; },
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { (x as THREE.SpriteMaterial).map?.dispose?.(); x.dispose(); }); });
      pm.dispose(); renderer.dispose();
    },
  };
}
