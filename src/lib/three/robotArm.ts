/**
 * A simulated 6-DOF articulated arm with live inverse kinematics.
 *
 * The solver is damped least squares (Levenberg-Marquardt style) on a numerical 6x6 Jacobian:
 * three rows for tip position, three for tool-axis alignment. It runs in the browser every frame.
 * Joint limits are enforced, targets beyond the reachable sphere are clamped (and reported), and
 * the Yoshikawa manipulability index is computed from the position Jacobian so near-singular
 * poses are visible. This is a simulation (no hardware), like a Gazebo or Isaac Sim scene in a page.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface ArmTelemetry {
  q: number[];            // joint angles, degrees
  tip: [number, number, number];
  target: [number, number, number];
  manipulability: number; // 0..1 (normalised Yoshikawa index)
  clamped: boolean;       // target was outside the workspace
  error: number;          // tip-to-target distance
}

export interface ArmOptions {
  canvas: HTMLCanvasElement;
  reduceMotion: boolean;
  onTelemetry?: (t: ArmTelemetry) => void;
}

const LIM: [number, number][] = [
  [-Math.PI, Math.PI], [-0.35, 2.2], [0.05, 2.7], [-Math.PI, Math.PI], [-1.9, 1.9], [-Math.PI, Math.PI],
];
const L0 = 0.6, L1 = 1.3, L2 = 1.1, L3 = 0.14, L4 = 0.26, TOOL = 0.34;
const REACH = L1 + L2 + L3 + L4 + TOOL; // from the shoulder

function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-9;
    for (let k = c; k <= n; k++) M[c][k] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r) => r[n]);
}

export function createRobotArm(opts: ArmOptions) {
  const { canvas } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const look = new THREE.Vector3(0, 1.7, 0);

  scene.add(new THREE.HemisphereLight(0x9a8cff, 0x120c33, 0.6));
  const key = new THREE.DirectionalLight(0xfff0d0, 1.6); key.position.set(3, 6, 5); scene.add(key);
  const rim = new THREE.PointLight(0xffb12e, 40, 14); rim.position.set(-3, 1.2, -2); scene.add(rim);
  const under = new THREE.PointLight(0xffc933, 14, 6); under.position.set(0, 0.2, 0.4); scene.add(under);

  // ---- materials
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xf2f4ff, roughness: 0.28, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1740, roughness: 0.4, metalness: 0.7 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc933, roughness: 0.25, metalness: 1, emissive: 0x6a4300, emissiveIntensity: 0.5 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffd45a });

  // ---- pad
  const pad = new THREE.Group();
  const ringMat = (c: number, o: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.012, 8, 128), ringMat(0xffc933, 0.5));
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.05, 8, 128, Math.PI * 1.5), ringMat(0x7a5cff, 0.8));
  const r3 = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.01, 8, 96), ringMat(0xffc933, 0.4));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 64), new THREE.MeshBasicMaterial({ color: 0x2a1d6b, transparent: true, opacity: 0.8 }));
  [r1, r2, r3, disc].forEach((m) => { m.rotation.x = -Math.PI / 2; pad.add(m); });
  r1.position.y = r2.position.y = r3.position.y = 0.01; disc.position.y = 0.005;
  const ticks = new THREE.Group();
  for (let i = 0; i < 72; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, i % 6 === 0 ? 0.22 : 0.1), glow);
    const a = (i / 72) * Math.PI * 2; t.position.set(Math.cos(a) * 2.35, 0.012, Math.sin(a) * 2.35); t.rotation.y = -a; ticks.add(t);
  }
  pad.add(ticks);
  scene.add(pad);

  // workspace sphere (the set of points the tip can reach), faint
  const shoulderY = 0.25 + L0 * 0.0 + 0.35;
  const ws = new THREE.Mesh(new THREE.SphereGeometry(REACH, 32, 16), new THREE.MeshBasicMaterial({ color: 0x7a5cff, wireframe: true, transparent: true, opacity: 0.035 }));
  ws.position.set(0, shoulderY, 0); scene.add(ws);

  // ---- arm hierarchy (links along +Y, zero pose = straight up)
  const arm = new THREE.Group(); scene.add(arm);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.74, 0.25, 48), dark); base.position.y = 0.125; arm.add(base);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.025, 8, 64), gold); baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.25; arm.add(baseRing);

  const j1 = new THREE.Group(); j1.position.y = 0.25; arm.add(j1);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.35, 40), shell); turret.position.y = 0.175; j1.add(turret);

  const j2 = new THREE.Group(); j2.position.y = 0.35; j1.add(j2);
  const hub = (parent: THREE.Object3D, r: number, len: number) => {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 32), shell); h.rotation.x = Math.PI / 2; parent.add(h);
    const c1 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, len + 0.06, 24), gold); c1.rotation.x = Math.PI / 2; parent.add(c1);
  };
  hub(j2, 0.3, 0.55);
  const link = (parent: THREE.Object3D, len: number, r: number) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - r * 1.2, 12, 24), shell); m.position.y = len / 2; parent.add(m);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r + 0.012, 0.012, 8, 32), gold); band.rotation.x = Math.PI / 2; band.position.y = len * 0.3; parent.add(band);
  };
  link(j2, L1, 0.2);
  const j3 = new THREE.Group(); j3.position.y = L1; j2.add(j3);
  hub(j3, 0.25, 0.5);
  link(j3, L2, 0.16);
  const j4 = new THREE.Group(); j4.position.y = L2; j3.add(j4);
  const wr = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, L3 + 0.1, 24), dark); wr.position.y = (L3 + 0.1) / 2 - 0.05; j4.add(wr);
  const j5 = new THREE.Group(); j5.position.y = L3; j4.add(j5);
  hub(j5, 0.11, 0.3);
  const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, L4, 20), shell); fore.position.y = L4 / 2; j5.add(fore);
  const j6 = new THREE.Group(); j6.position.y = L4; j5.add(j6);
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 24), gold); flange.position.y = 0.025; j6.add(flange);
  // gripper
  const fingers: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.035, TOOL - 0.06, 0.07), dark); f.position.set(s * 0.07, 0.05 + (TOOL - 0.06) / 2, 0); j6.add(f); fingers.push(f);
  }
  const tip = new THREE.Object3D(); tip.position.y = TOOL; j6.add(tip);
  const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), glow); tip.add(tipGlow);

  const joints = [j1, j2, j3, j4, j5, j6];
  const axes: ('y' | 'z')[] = ['y', 'z', 'z', 'y', 'z', 'y'];
  const q = [0, 0.35, 0.9, 0, 0.4, 0]; // near-upright start
  const apply = (qq: number[]) => joints.forEach((j, i) => { j.rotation[axes[i]] = qq[i]; });
  apply(q);

  // ---- target marker, trail
  const marker = new THREE.Group();
  const mk = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshBasicMaterial({ color: 0xffc933, wireframe: true }));
  const mkc = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), glow);
  const mkr = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.006, 6, 48), ringMat(0xffc933, 0.8));
  marker.add(mk, mkc, mkr); scene.add(marker);
  const TRAIL = 60;
  const trailPos = new Float32Array(TRAIL * 3);
  const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffc933, transparent: true, opacity: 0.55 }));
  trail.frustumCulled = false; scene.add(trail);
  let trailN = 0;
  const tether = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.4 }));
  scene.add(tether);

  // dust
  const N = 120; const dp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { dp[i * 3] = (Math.random() - 0.5) * 8; dp[i * 3 + 1] = Math.random() * 5; dp[i * 3 + 2] = (Math.random() - 0.5) * 6; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffc933, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(dust);

  // ---- kinematics
  const tmp = new THREE.Vector3(), tq = new THREE.Quaternion();
  const shoulder = new THREE.Vector3();
  const target = new THREE.Vector3(0, 2, 1.4);
  function fk(qq: number[], tgt: THREE.Vector3, dir: THREE.Vector3): number[] {
    apply(qq); arm.updateMatrixWorld(true);
    tip.getWorldPosition(tmp);
    const f = [tmp.x - tgt.x, tmp.y - tgt.y, tmp.z - tgt.z];
    tip.getWorldQuaternion(tq);
    const a = new THREE.Vector3(0, 1, 0).applyQuaternion(tq);
    const c = new THREE.Vector3().crossVectors(a, dir).multiplyScalar(0.3);
    return [...f, c.x, c.y, c.z];
  }
  let manip = 0, err = 0, clamped = false;
  function ikStep(tgt: THREE.Vector3, iters: number, maxStep: number) {
    j2.getWorldPosition(shoulder);
    const dir = new THREE.Vector3().subVectors(tgt, shoulder).normalize();
    for (let it = 0; it < iters; it++) {
      const f0 = fk(q, tgt, dir);
      const eps = 1e-3;
      const J: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));
      for (let c = 0; c < 6; c++) {
        const qq = q.slice(); qq[c] += eps;
        const f1 = fk(qq, tgt, dir);
        for (let r = 0; r < 6; r++) J[r][c] = (f1[r] - f0[r]) / eps;
      }
      // manipulability from the position block
      const JP = [J[0], J[1], J[2]];
      const m = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
      const G = JP.map((a) => JP.map((b) => m(a, b)));
      const det = G[0][0] * (G[1][1] * G[2][2] - G[1][2] * G[2][1]) - G[0][1] * (G[1][0] * G[2][2] - G[1][2] * G[2][0]) + G[0][2] * (G[1][0] * G[2][1] - G[1][1] * G[2][0]);
      manip = Math.min(1, Math.sqrt(Math.max(det, 0)) / 3.2);
      const lam = 0.12 + 0.35 * (1 - manip); // more damping near singularities
      const JJt = J.map((a) => J.map((b) => m(a, b)));
      for (let i = 0; i < 6; i++) JJt[i][i] += lam * lam;
      const y = solve(JJt, f0.map((v) => -v));
      for (let c = 0; c < 6; c++) {
        let dq = 0; for (let r = 0; r < 6; r++) dq += J[r][c] * y[r];
        dq = Math.max(-maxStep, Math.min(maxStep, dq));
        q[c] = Math.max(LIM[c][0], Math.min(LIM[c][1], q[c] + dq));
      }
      err = Math.hypot(f0[0], f0[1], f0[2]);
    }
    apply(q); arm.updateMatrixWorld(true);
  }

  // ---- input
  let px = 0.35, py = 0.1, lastMove = -10;
  const onMove = (e: PointerEvent) => { px = (e.clientX / window.innerWidth) * 2 - 1; py = 1 - (e.clientY / window.innerHeight) * 2; lastMove = performance.now() / 1000; };
  window.addEventListener('pointermove', onMove);

  function resize() {
    const w = canvas.clientWidth || 600, h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = 10.2 / Math.min(1, camera.aspect * 1.05);
    camera.position.set(3.2, 3.6, dist); camera.lookAt(look); camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  // ---- loop
  const clock = new THREE.Clock();
  const t0 = performance.now();
  let raf = 0, riseT = 0, telemT = 0, running = true;
  let rise = opts.reduceMotion ? 1 : 0;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  const raw = new THREE.Vector3();
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    riseT = (performance.now() - t0) / 1000; rise = opts.reduceMotion ? 1 : Math.min(1, riseT / 2.2);
    const e = ease(rise);
    arm.position.y = -1.4 * (1 - e);
    arm.scale.setScalar(0.6 + 0.4 * e);
    pad.rotation.y = t * 0.08; ticks.rotation.y = -t * 0.25; r2.rotation.z = -t * 0.5;
    under.intensity = 8 + 10 * e;
    dust.rotation.y = t * 0.03;
    const dpos = dg.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) { let y = dpos.getY(i) + dt * 0.25; if (y > 5) y = 0; dpos.setY(i, y); }
    dpos.needsUpdate = true;

    // target: pointer on a vertical window in front of the arm, or a Lissajous when idle
    const idle = opts.reduceMotion || performance.now() / 1000 - lastMove > 3;
    if (idle) raw.set(1.7 * Math.sin(t * 0.7), 2.0 + 0.8 * Math.sin(t * 1.1), 1.0 + 0.7 * Math.cos(t * 0.5));
    else raw.set(px * 2.4, 1.9 + py * 1.5, 1.2);
    if (rise < 1) raw.set(0, 3.2, 0.2); // while it rises it stands tall
    j2.getWorldPosition(shoulder);
    tmp.subVectors(raw, shoulder);
    clamped = tmp.length() > REACH * 0.96;
    if (clamped) tmp.setLength(REACH * 0.96);
    target.copy(shoulder).add(tmp);
    marker.position.lerp(target, 0.35); marker.rotation.y += dt; marker.rotation.x += dt * 0.6; mkr.rotation.x = Math.PI / 2;
    (mkr.material as THREE.MeshBasicMaterial).color.set(clamped ? 0xff6a5a : 0xffc933);

    const k = Math.min(4, Math.max(1, (dt * 60)));
    ikStep(marker.position, Math.round(3 * k), 0.09);
    tip.getWorldPosition(tmp);
    // open/close gripper with proximity
    const g = 0.07 + 0.04 * Math.sin(t * 2);
    fingers[0].position.x = -g; fingers[1].position.x = g;
    // trail
    trailPos.copyWithin(3, 0, (TRAIL - 1) * 3); trailPos[0] = tmp.x; trailPos[1] = tmp.y; trailPos[2] = tmp.z; trailN = Math.min(TRAIL, trailN + 1);
    trailGeo.setDrawRange(0, trailN); (trailGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    const tp = tether.geometry.getAttribute('position') as THREE.BufferAttribute; tp.setXYZ(0, tmp.x, tmp.y, tmp.z); tp.setXYZ(1, marker.position.x, marker.position.y, marker.position.z); tp.needsUpdate = true; tether.computeLineDistances();

    telemT += dt;
    if (opts.onTelemetry && telemT > 0.08) {
      telemT = 0;
      opts.onTelemetry({ q: q.map((v) => (v * 180) / Math.PI), tip: [tmp.x, tmp.y - 0.25, tmp.z], target: [marker.position.x, marker.position.y - 0.25, marker.position.z], manipulability: manip, clamped, error: err });
    }
    renderer.render(scene, camera);
  }
  frame();

  return {
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose()); });
      envTex.dispose(); pmrem.dispose(); renderer.dispose();
    },
  };
}
