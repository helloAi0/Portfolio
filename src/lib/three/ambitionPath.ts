/**
 * Ambitions as engineering: a steel truss tower that builds itself as you scroll, with a luminous path spiralling
 * up around it. Each goal is a landing pad on the path; the marker climbs from pad to pad and everything below it
 * lights up (a clipping plane at the marker's height), so progress is literally "built so far".
 */
import * as THREE from 'three';

export interface PathMilestone { label: string }

function labelSprite(text: string) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
  const g = c.getContext('2d')!; g.font = '600 46px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(243,201,105,.9)'; g.shadowBlur = 16; g.fillStyle = '#fff3c4'; g.fillText(text.toUpperCase().slice(0, 30), 512, 66);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(6, 0.75, 1); return s;
}

export function createAmbitionPath(opts: { canvas: HTMLCanvasElement; milestones: PathMilestone[]; narrow: boolean; onTelemetry?: (t: { elev: number; pct: number; top: number }) => void }) {
  const { canvas, milestones } = opts;
  let narrow = opts.narrow;
  const n = milestones.length;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07060f, 0.018);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 300);
  scene.add(new THREE.AmbientLight(0x8877cc, 0.7));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.4); sun.position.set(6, 14, 8); scene.add(sun);

  const H = Math.max(14, n * 7), RAD = 5.4, TURNS = Math.max(1.5, n * 0.75);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 240; i++) { const s = i / 240, a = s * TURNS * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a) * RAD, 0.4 + s * H, Math.cos(a) * RAD)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const dimLine = new THREE.LineBasicMaterial({ color: 0x4a4468, transparent: true, opacity: 0.55 });
  const litLine = new THREE.LineBasicMaterial({ color: 0xf3c969, transparent: true, opacity: 0.95, clippingPlanes: [plane] });

  // truss tower: 4 corner columns, rings and X braces every 1.4 units
  const seg: number[] = []; const W = 1.7, step = 1.4, top = H + 3;
  const corners = [[-W, -W], [W, -W], [W, W], [-W, W]];
  for (const [x, z] of corners) seg.push(x, 0, z, x, top, z);
  for (let y = 0; y < top; y += step) {
    for (let k = 0; k < 4; k++) {
      const [x1, z1] = corners[k], [x2, z2] = corners[(k + 1) % 4];
      seg.push(x1, y, z1, x2, y, z2);
      seg.push(x1, y, z1, x2, Math.min(top, y + step), z2, x2, y, z2, x1, Math.min(top, y + step), z1);
    }
  }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  scene.add(new THREE.LineSegments(tg, dimLine)); scene.add(new THREE.LineSegments(tg, litLine));

  // path: ribbon + stepping tiles
  const tube = (mat: THREE.Material) => new THREE.Mesh(new THREE.TubeGeometry(curve, 600, 0.05, 6, false), mat);
  scene.add(tube(new THREE.MeshBasicMaterial({ color: 0x4a4468, transparent: true, opacity: 0.7 })));
  scene.add(tube(new THREE.MeshBasicMaterial({ color: 0xf3c969, clippingPlanes: [plane] })));
  const TILES = 140; const tileGeo = new THREE.BoxGeometry(0.9, 0.08, 0.5);
  const mkTiles = (mat: THREE.Material) => {
    const im = new THREE.InstancedMesh(tileGeo, mat, TILES); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < TILES; i++) { const u = (i + 0.5) / TILES, p = curve.getPointAt(u), t = curve.getTangentAt(u); q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(t.x, 0, t.z).normalize()); m.compose(p.clone().setY(p.y - 0.08), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m); }
    return im;
  };
  scene.add(mkTiles(new THREE.MeshBasicMaterial({ color: 0x2a2640, transparent: true, opacity: 0.8 })));
  scene.add(mkTiles(new THREE.MeshStandardMaterial({ color: 0xf3c969, emissive: 0xc88a10, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.3, clippingPlanes: [plane] })));

  // milestone pads
  const us = milestones.map((_, i) => (n === 1 ? 0.5 : 0.1 + 0.78 * (i / (n - 1))));
  const pads = milestones.map((m, i) => {
    const p = curve.getPointAt(us[i]);
    const g = new THREE.Group(); g.position.copy(p); scene.add(g);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0x1a1830, metalness: 0.8, roughness: 0.35, emissive: 0xf3c969, emissiveIntensity: 0.12 })); g.add(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf3c969 })); ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI / 6; ring.position.y = 0.12; g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = 2.1; g.add(beam);
    const lab = labelSprite(`${i + 1} · ${m.label}`); lab.position.y = 4.6; g.add(lab);
    return { g, pad, ring, beam, lab };
  });

  // floor plates inside the tower at every landing, like slabs poured level by level
  const plateMat = new THREE.MeshBasicMaterial({ color: 0xf3c969, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
  milestones.forEach((_, i) => { const y = curve.getPointAt(us[i]).y - 0.1; const pl = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, W * 2), plateMat); pl.rotation.x = Math.PI / 2; pl.position.y = y; scene.add(pl); });
  // tower crane on the roof: the structure is still going up
  const crane = new THREE.Group(); crane.position.set(0, top, 0); scene.add(crane);
  const cm: number[] = []; const CH = 3.2;
  for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [0.25, 0.25], [-0.25, 0.25]]) cm.push(x, 0, z, x, CH, z);
  for (let y = 0; y < CH; y += 0.5) cm.push(-0.25, y, -0.25, 0.25, y + 0.5, -0.25, 0.25, y, 0.25, -0.25, y + 0.5, 0.25);
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cm, 3));
  crane.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0xf3c969 })));
  const jib = new THREE.Group(); jib.position.y = CH; crane.add(jib);
  const jm: number[] = [-1.6, 0, 0, 4.2, 0, 0, -1.6, 0.35, 0, 4.2, 0, 0, -1.6, 0, 0, -1.6, 0.35, 0, 0, 0.9, 0, 4.2, 0, 0, 0, 0.9, 0, -1.6, 0, 0, 0, 0, 0, 0, 0.9, 0];
  const jg = new THREE.BufferGeometry(); jg.setAttribute('position', new THREE.Float32BufferAttribute(jm, 3));
  jib.add(new THREE.LineSegments(jg, new THREE.LineBasicMaterial({ color: 0xf3c969 })));
  const cw = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a1830, metalness: 0.8, roughness: 0.4 })); cw.position.set(-1.5, -0.05, 0); jib.add(cw);
  const hookLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(3.2, 0, 0), new THREE.Vector3(3.2, -2, 0)]), new THREE.LineBasicMaterial({ color: 0xfff3c4 })); jib.add(hookLine);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x7fe4ff })); hook.position.set(3.2, -2.1, 0); jib.add(hook);

  // beacon at the very top
  const beacon = new THREE.Group(); beacon.position.set(0, top + CH + 3, 0); scene.add(beacon);
  const oct = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), new THREE.MeshBasicMaterial({ color: 0xfff3c4, wireframe: true })); beacon.add(oct);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: 0xf3c969, emissive: 0xf3c969, emissiveIntensity: 1.2 })); beacon.add(core);
  const bring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.02, 8, 80), new THREE.MeshBasicMaterial({ color: 0x7fe4ff })); beacon.add(bring);
  const bring2 = bring.clone(); bring2.rotation.x = Math.PI / 2; beacon.add(bring2);
  const bl = new THREE.PointLight(0xf3c969, 40, 30); beacon.add(bl);

  // marker
  const marker = new THREE.Group(); scene.add(marker);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 18), new THREE.MeshBasicMaterial({ color: 0xffffff })); marker.add(orb);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), new THREE.MeshBasicMaterial({ color: 0xf3c969, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); marker.add(halo);
  const mlight = new THREE.PointLight(0xffd45a, 14, 12); marker.add(mlight);

  // dust
  const N = 400, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 40; sp[i * 3 + 1] = Math.random() * (top + 10); sp[i * 3 + 2] = (Math.random() - 0.5) * 40; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.07, color: 0xcbbcff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })));
  const floor = new THREE.GridHelper(60, 60, 0x4a4468, 0x1c1a30); scene.add(floor);

  let target = 0, cur = 0, lastTel = 0;
  const uAt = (pos: number) => { const i0 = Math.max(0, Math.min(n - 1, Math.floor(pos))), i1 = Math.min(n - 1, i0 + 1); return us[i0] + (us[i1] - us[i0]) * (pos - i0); };
  function resize() { const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);

  const look = new THREE.Vector3(), P = new THREE.Vector3(), out = new THREE.Vector3(), right = new THREE.Vector3();
  const clock = new THREE.Clock(); let raf = 0, running = true;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    cur += (target - cur) * Math.min(1, dt * 4);
    const u = uAt(cur); curve.getPointAt(u, P);
    marker.position.copy(P).add(new THREE.Vector3(0, 0.45, 0)); halo.scale.setScalar(1 + 0.15 * Math.sin(t * 4));
    plane.constant = P.y + 0.3;
    out.set(P.x, 0, P.z).normalize();
    right.set(out.z, 0, -out.x);
    const dist = narrow ? 17 : 13.5;
    camera.position.set(P.x + out.x * dist, P.y + 3.2 + (narrow ? 2 : 0), P.z + out.z * dist);
    look.set(0, P.y + (narrow ? -3.4 : 0.6), 0).addScaledVector(right, narrow ? 0 : 4.2).addScaledVector(out, 3);
    camera.lookAt(look);
    pads.forEach((p, i) => {
      const reached = us[i] <= u + 0.004; const near = Math.max(0, 1 - Math.abs(cur - i));
      (p.pad.material as THREE.MeshStandardMaterial).emissiveIntensity = reached ? 0.5 + near * 0.9 : 0.1;
      (p.ring.material as THREE.MeshBasicMaterial).color.setHex(reached ? 0xfff3c4 : 0x6a5f8a);
      (p.beam.material as THREE.MeshBasicMaterial).opacity = (reached ? 0.25 : 0.06) + near * 0.4;
      (p.lab.material as THREE.SpriteMaterial).opacity = 0.25 + near * 0.75;
      p.ring.rotation.z += dt * 0.3 * (1 + near);
    });
    jib.rotation.y += dt * 0.12; hook.position.y = -2.1 + Math.sin(t * 0.8) * 0.5; hookLine.scale.y = 1 + Math.sin(t * 0.8) * 0.25;
    if (opts.onTelemetry && t - lastTel > 0.1) { lastTel = t; opts.onTelemetry({ elev: P.y, pct: Math.min(100, (P.y / (top + 0.4)) * 100), top }); }
    oct.rotation.y += dt * 0.6; oct.rotation.x += dt * 0.3; core.rotation.y -= dt; bring.rotation.z += dt * 0.5; bring2.rotation.y += dt * 0.4;
    bl.intensity = 28 + 14 * Math.sin(t * 2);
    renderer.render(scene, camera);
  }
  frame();

  return {
    setPos(p: number) { target = Math.max(0, Math.min(n - 1, p)); },
    setNarrow(v: boolean) { narrow = v; },
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { (x as THREE.SpriteMaterial).map?.dispose?.(); x.dispose(); }); });
      renderer.dispose();
    },
  };
}
