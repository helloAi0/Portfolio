/**
 * A robot work-cell for the Skills page. Every skill domain is a module cartridge on a conveyor belt;
 * a six-axis-style arm (analytic two-link IK, yaw + shoulder + elbow) reaches over the module that faces you,
 * scans it with a laser and lights its skill chips. Chips are the real skills: brightness = self-rated level.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface BayDomain { name: string; levels: number[] }

function labelSprite(text: string, sub: string) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 220;
  const g = c.getContext('2d')!; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 18; g.font = '700 74px "Cinzel", Georgia, serif'; g.fillStyle = '#ffffff'; g.fillText(text.toUpperCase().slice(0, 20), 512, 80);
  g.shadowBlur = 8; g.font = '600 40px "JetBrains Mono", monospace'; g.fillStyle = '#7fe4ff'; g.fillText(sub.toUpperCase(), 512, 160);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(4.4, 0.95, 1); return s;
}

export function createSkillRobot(opts: { canvas: HTMLCanvasElement; domains: BayDomain[]; narrow: boolean}) {
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

  // floor grid
  const grid = new THREE.GridHelper(60, 60, 0x1d6f86, 0x0f2a3a); (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.45; grid.position.y = -0.02; scene.add(grid);

  // conveyor: modules ride a belt past the arm, so any number of domains fits (only the nearest few are drawn)
  const BZ = 3.0, SP = 2.3, VIS = 6;
  const modW = 1.5;
  const beltLen = 44;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(beltLen, 0.14, 2.0), dark); belt.position.set(0, 0.07, BZ); scene.add(belt);
  for (const sgn of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(beltLen, 0.12, 0.08), steel); rail.position.set(0, 0.2, BZ + sgn * 1.04); scene.add(rail); const gl = new THREE.Mesh(new THREE.BoxGeometry(beltLen, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x4fd8ff })); gl.position.set(0, 0.27, BZ + sgn * 1.04); scene.add(gl); }
  const SL = 0.55, slatCount = Math.ceil(26 / SL);
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.03, 1.7), steel, slatCount); belt.add(slats); slats.position.set(0, 0.09, 0);
  const sm4 = new THREE.Matrix4();

  type Mod = { g: THREE.Group; top: THREE.Mesh; chips: THREE.Mesh[]; label: THREE.Sprite; levels: number[] };
  const mods: Mod[] = domains.map((d, i) => {
    const g = new THREE.Group(); g.position.set(i * SP, 0.14, BZ); scene.add(g);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(modW * 0.5, modW * 0.56, 0.9, 6), dark); body.position.y = 0.45; g.add(body);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(modW * 0.5, 0.025, 8, 6), goldM); trim.rotation.x = Math.PI / 2; trim.rotation.z = Math.PI / 6; trim.position.y = 0.9; g.add(trim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(modW * 0.42, modW * 0.42, 0.05, 6), new THREE.MeshStandardMaterial({ color: 0x0b2a35, emissive: cyan, emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.3 })); top.position.y = 0.93; g.add(top);
    const chips: THREE.Mesh[] = [];
    const cnt = Math.min(12, d.levels.length);
    for (let k = 0; k < cnt; k++) {
      const lvl = d.levels[k] || 1, ang = (k / Math.max(cnt, 1)) * Math.PI * 2, rr = cnt === 1 ? 0 : modW * 0.27, h = 0.18 + lvl * 0.16;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.09, h, 0.09), new THREE.MeshStandardMaterial({ color: 0x0c1220, emissive: gold, emissiveIntensity: 0.15 + lvl * 0.3, metalness: 0.5, roughness: 0.3 }));
      bar.position.set(Math.cos(ang) * rr, 0.95 + h / 2, Math.sin(ang) * rr); g.add(bar); chips.push(bar);
    }
    for (let k = 0; k < 24; k++) { const a2 = (k / 24) * Math.PI * 2; const tk = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, k % 6 === 0 ? 0.08 : 0.04), goldM); tk.position.set(Math.cos(a2) * modW * 0.47, 0.9, Math.sin(a2) * modW * 0.47); tk.rotation.y = -a2; g.add(tk); }
    const label = labelSprite(d.name, `${d.levels.length} skill${d.levels.length === 1 ? '' : 's'}`); label.position.set(0, 2.6, 0); g.add(label);
    return { g, top, chips, label, levels: d.levels };
  });

  // arm: plinth, bolted base, J1 turret, J2 shoulder housing, tapered links with bands, J3 elbow, J4 wrist, flange + gripper
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 2.2), dark); plinth.position.y = 0.33; scene.add(plinth);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 6), steel); bolt.position.set(Math.cos(a) * 0.98, 0.5, Math.sin(a) * 0.98); scene.add(bolt); }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.3, 40), steel); base.position.y = 0.63; scene.add(base);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.03, 8, 60), goldM); baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.8; scene.add(baseRing);
  const SH = 1.6, L1 = 2.3, L2 = 2.1;
  const yaw = new THREE.Group(); yaw.position.set(0, 0.8, 0); scene.add(yaw);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.55, SH - 0.8, 32), steel); column.position.y = (SH - 0.8) / 2; yaw.add(column);
  const shoulder = new THREE.Group(); shoulder.position.y = SH - 0.8; yaw.add(shoulder);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.62, 0.62), steel); shoulder.add(housing);
  const capA = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 32), goldM); capA.rotation.z = Math.PI / 2; shoulder.add(capA);
  const link = (len: number, r0: number, r1: number, parent: THREE.Group) => {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 24), steel); body.rotation.x = Math.PI / 2; body.position.z = len / 2; parent.add(body);
    for (const f of [0.3, 0.55, 0.8]) { const band = new THREE.Mesh(new THREE.TorusGeometry(r0 + (r1 - r0) * f + 0.015, 0.018, 6, 28), dark); band.position.z = len * f; parent.add(band); }
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(r0 * 0.55, r0 * 0.55, 0.5, 20), dark); motor.position.set(0, r0 + 0.12, len * 0.2); parent.add(motor);
  };
  link(L1, 0.2, 0.15, shoulder);
  const elbow = new THREE.Group(); elbow.position.z = L1; shoulder.add(elbow);
  const capB = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 28), goldM); capB.rotation.z = Math.PI / 2; elbow.add(capB);
  link(L2, 0.15, 0.1, elbow);
  const wrist = new THREE.Group(); wrist.position.z = L2; elbow.add(wrist);
  const capC = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 24), goldM); capC.rotation.z = Math.PI / 2; wrist.add(capC);
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 24), steel); flange.rotation.x = Math.PI / 2; flange.position.z = 0.2; wrist.add(flange);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.08), dark); rail.position.z = 0.28; wrist.add(rail);
  const fingers = [-1, 1].map((sg) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.3), goldM); f.position.set(sg * 0.14, 0, 0.44); wrist.add(f); return f; });
  const lamp = new THREE.PointLight(0x4fd8ff, 6, 6); wrist.add(lamp);
  // reach line from the base to the belt, like a drawing dimension
  const dim = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, 0.02, BZ - 1.1)]), new THREE.LineDashedMaterial({ color: 0x7fe4ff, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.7 })); dim.computeLineDistances(); scene.add(dim);

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
    const act = Math.max(0, Math.min(n - 1, Math.round(cur)));
    const fr = Math.abs(cur - Math.round(cur)); // 0 at rest, up to 0.5 while turning
    // belt slats slide with the scroll
    const off = ((cur * SP) % SL + SL) % SL;
    for (let i = 0; i < slatCount; i++) { sm4.makeTranslation(-13 + i * SL - off, 0, 0); slats.setMatrixAt(i, sm4); }
    slats.instanceMatrix.needsUpdate = true;
    mods.forEach((m, i) => {
      const dist = i - cur;
      m.g.position.x = dist * SP; m.g.visible = Math.abs(dist) < VIS;
      const on = i === act ? 1 - Math.min(1, fr * 2.4) : 0;
      m.g.position.y = 0.14 + on * 0.22;
      (m.top.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + on * 1.4;
      (m.label.material as THREE.SpriteMaterial).opacity = Math.max(0, on * 1 - 0.0);
      m.label.visible = on > 0.05;
      m.chips.forEach((c, k) => { const lv = m.levels[k] || 1; (c.material as THREE.MeshStandardMaterial).emissiveIntensity = (0.12 + lv * 0.28) * (0.45 + on * 0.9) * (0.85 + 0.15 * Math.sin(t * 3 + k)); });
    });

    // arm target: above the facing module (world), with a reach sweep while the table turns
    const mod = mods[act];
    mTmp.copy(mod.g.position);
    tgt.set(Math.max(-1.6, Math.min(1.6, mTmp.x)) + Math.sin(t * 1.3) * 0.1, mTmp.y + 1.9, mTmp.z + 0.1);
    const dx = tgt.x, dz = tgt.z, dy = tgt.y - SH;
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
    scan.position.set(mTmp.x, mTmp.y + 0.95 + ((t * 0.7) % 1) * 0.9, mTmp.z);
    (scan.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - Math.min(1, fr * 3));
    (laser.material as THREE.LineBasicMaterial).opacity = 0.9 * (1 - Math.min(1, fr * 3));
    lamp.intensity = 4 + 3 * Math.sin(t * 5);
    dust.rotation.y += dt * 0.02;

    const orbit = Math.sin(t * 0.18) * 1.3;
    if (narrow) { camera.position.set(orbit, 6.5, 15); look.set(0, -2.4, 1.5); } else { camera.position.set(orbit - 3.5, 5.2, 12.5); look.set(3.6, 1.0, 2.0); }
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
