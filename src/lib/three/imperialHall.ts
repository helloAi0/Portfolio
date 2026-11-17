/**
 * Imperial Hall: a procedural marble colonnade with a gold laurel wreath, light shafts and
 * drifting gold dust. No external 3D assets (nothing to download, nothing to license), so the
 * scene is tiny. The camera is scroll-scrubbed: scrolling flies the viewer down the hall,
 * through the wreath, toward a glowing gateway.
 *
 * Framework-free on purpose (testable headlessly; the React wrapper only mounts/disposes it).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface HallOptions {
  /** Fewer columns/particles, no MSAA, DPR 1. */
  lowPower: boolean;
  /** Render a single still frame; no loop, no scroll scrubbing. */
  reducedMotion: boolean;
}

export interface HallController {
  setScroll(progress: number): void;
  setPointer(x: number, y: number): void;
  resize(width: number, height: number): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Seeded PRNG so the marble looks identical on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function marbleTexture(base: string, vein: string, seed: number, slabs = false): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  // soft clouds
  for (let i = 0; i < 40; i++) {
    const x = r() * size, y = r() * size, rad = 40 + r() * 120;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(255,255,255,${0.025 + r() * 0.03})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // veins: random walks
  g.strokeStyle = vein;
  for (let v = 0; v < 14; v++) {
    g.globalAlpha = 0.1 + r() * 0.25;
    g.lineWidth = 0.5 + r() * 1.4;
    g.beginPath();
    let x = r() * size, y = r() * size, a = r() * Math.PI * 2;
    g.moveTo(x, y);
    for (let s = 0; s < 40; s++) {
      a += (r() - 0.5) * 0.9;
      x += Math.cos(a) * 14; y += Math.sin(a) * 14;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  if (slabs) {
    g.strokeStyle = 'rgba(212,175,55,0.35)';
    g.lineWidth = 3;
    g.strokeRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function softSprite(inner: string, outer = 'rgba(0,0,0,0)'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function beamTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d')!;
  const v = g.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, 'rgba(255,214,150,0.0)');
  v.addColorStop(0.25, 'rgba(255,214,150,0.55)');
  v.addColorStop(1, 'rgba(255,214,150,0.0)');
  g.fillStyle = v;
  g.fillRect(0, 0, 64, 256);
  // soften the sides
  g.globalCompositeOperation = 'destination-in';
  const h = g.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)');
  h.addColorStop(0.5, 'rgba(0,0,0,1)');
  h.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = h;
  g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Doric-style fluted shaft: a cylinder whose radius is modulated by angle to carve real flutes. */
function flutedShaft(radius: number, height: number, flutes = 20): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius * 0.86, radius, height, 80, 14, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const ang = Math.atan2(z, x);
    const rr = Math.hypot(x, z);
    const carve = 1 - 0.045 * (0.5 + 0.5 * Math.cos(ang * flutes));
    pos.setX(i, x * carve * (rr > 0 ? 1 : 1));
    pos.setZ(i, z * carve);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createImperialHall(canvas: HTMLCanvasElement, opts: HallOptions): HallController {
  const { lowPower, reducedMotion } = opts;
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(o: T): T => { disposables.push(o); return o; };

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: !lowPower, alpha: false, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080b);
  scene.fog = new THREE.FogExp2(0x07080b, lowPower ? 0.05 : 0.036);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envTex = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.28;
  disposables.push({ dispose: () => { envTex.dispose(); pmrem.dispose(); envScene.dispose(); } });

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);

  // ---------- Lighting ----------
  const key = new THREE.DirectionalLight(0xffd9a0, 2.6);
  key.position.set(-7, 11, 8);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0x8fa0c8, 0x2a2018, 0.45));
  const wreathLight = new THREE.PointLight(0xffc860, 14, 14, 1.6);
  wreathLight.position.set(1.7, 2.6, -2.5);
  scene.add(wreathLight);
  const gateLight = new THREE.PointLight(0xffb347, 26, 30, 1.4);
  gateLight.position.set(0, 3, -29);
  scene.add(gateLight);

  // ---------- Materials ----------
  const columnTex = track(marbleTexture('#d8d0c0', '#8d8470', 11));
  columnTex.repeat.set(1, 3);
  const columnMat = track(new THREE.MeshStandardMaterial({ map: columnTex, roughness: 0.42, metalness: 0.02 }));
  const stoneTex = track(marbleTexture('#c9c1b0', '#7d7561', 23));
  const stoneMat = track(new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.55, metalness: 0.02 }));
  const floorTex = track(marbleTexture('#17181d', '#4a4a55', 5, true));
  floorTex.repeat.set(6, 22);
  const floorMat = track(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.22, metalness: 0.35, envMapIntensity: 1.4 }));
  const goldMat = track(new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: 1, roughness: 0.28, envMapIntensity: 2.2 }));

  // ---------- Floor + gold inlay ----------
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(26, 80)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -16);
  scene.add(floor);
  for (const x of [-0.9, 0.9]) {
    const inlay = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.01, 60)), goldMat);
    inlay.position.set(x, 0.006, -14);
    scene.add(inlay);
  }

  // ---------- Colonnade ----------
  const perSide = lowPower ? 7 : 11;
  const spacing = 3.6;
  const z0 = 5;
  const H = 6.2;
  const R = 0.46;
  const shaftGeo = track(flutedShaft(R, H));
  const baseGeo = track(new THREE.CylinderGeometry(R * 1.28, R * 1.34, 0.32, 40));
  const echinusGeo = track(new THREE.CylinderGeometry(R * 1.32, R * 0.9, 0.3, 40));
  const abacusGeo = track(new THREE.BoxGeometry(R * 2.9, 0.26, R * 2.9));
  const total = perSide * 2;
  const shafts = new THREE.InstancedMesh(shaftGeo, columnMat, total);
  const bases = new THREE.InstancedMesh(baseGeo, stoneMat, total);
  const echini = new THREE.InstancedMesh(echinusGeo, stoneMat, total);
  const abaci = new THREE.InstancedMesh(abacusGeo, stoneMat, total);
  const m = new THREE.Matrix4();
  let idx = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < perSide; i++) {
      const x = side * 3.7, z = z0 - i * spacing;
      m.makeTranslation(x, 0.16, z); bases.setMatrixAt(idx, m);
      m.makeTranslation(x, 0.32 + H / 2, z); shafts.setMatrixAt(idx, m);
      m.makeTranslation(x, 0.32 + H + 0.15, z); echini.setMatrixAt(idx, m);
      m.makeTranslation(x, 0.32 + H + 0.43, z); abaci.setMatrixAt(idx, m);
      idx++;
    }
  }
  [shafts, bases, echini, abaci].forEach((im) => { im.instanceMatrix.needsUpdate = true; scene.add(im); });

  // Entablature: long architraves + cross beams (open roof lets light shafts fall through).
  const topY = 0.32 + H + 0.56 + 0.5;
  const hallLen = perSide * spacing;
  const archGeo = track(new THREE.BoxGeometry(1.3, 1.0, hallLen + 1.5));
  for (const side of [-1, 1]) {
    const beam = new THREE.Mesh(archGeo, stoneMat);
    beam.position.set(side * 3.7, topY, z0 - hallLen / 2 + spacing / 2);
    scene.add(beam);
    const cornice = new THREE.Mesh(track(new THREE.BoxGeometry(1.75, 0.18, hallLen + 1.8)), stoneMat);
    cornice.position.set(side * 3.7, topY + 0.58, beam.position.z);
    scene.add(cornice);
    const frieze = new THREE.Mesh(track(new THREE.BoxGeometry(1.34, 0.06, hallLen + 1.5)), goldMat);
    frieze.position.set(side * 3.7, topY - 0.28, beam.position.z);
    scene.add(frieze);
  }
  const crossGeo = track(new THREE.BoxGeometry(7.4, 0.55, 0.7));
  for (let i = 0; i < perSide; i += 2) {
    const beam = new THREE.Mesh(crossGeo, stoneMat);
    beam.position.set(0, topY + 0.2, z0 - i * spacing);
    scene.add(beam);
  }

  // ---------- Temple gateway at the far end ----------
  const endZ = z0 - hallLen - 2;
  for (let s = 0; s < 4; s++) {
    const step = new THREE.Mesh(track(new THREE.BoxGeometry(14 - s * 0.8, 0.28, 3 - s * 0.1)), stoneMat);
    step.position.set(0, 0.14 + s * 0.28, endZ + 1.2 - s * 0.3);
    scene.add(step);
  }
  const wall = new THREE.Mesh(track(new THREE.BoxGeometry(12.5, 11, 0.8)), stoneMat);
  wall.position.set(0, 5.5 + 1.1, endZ - 0.8);
  scene.add(wall);
  const gateGlow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(3.6, 7.2)),
    track(new THREE.MeshBasicMaterial({ map: track(softSprite('rgba(255,240,200,1)', 'rgba(255,196,110,0.8)')), fog: false, toneMapped: false }))
  );
  gateGlow.position.set(0, 4.7, endZ - 0.38);
  scene.add(gateGlow);
  const pedShape = new THREE.Shape();
  pedShape.moveTo(-6.6, 0); pedShape.lineTo(6.6, 0); pedShape.lineTo(0, 2.6); pedShape.closePath();
  const pediment = new THREE.Mesh(track(new THREE.ExtrudeGeometry(pedShape, { depth: 0.8, bevelEnabled: false })), stoneMat);
  pediment.position.set(0, 12.4, endZ - 1.2);
  scene.add(pediment);

  // Front columns flanking the gateway
  for (const x of [-5.2, -2.9, 2.9, 5.2]) {
    const sh = new THREE.Mesh(shaftGeo, columnMat); sh.position.set(x, 1.12 + 0.32 + H / 2, endZ + 0.2); scene.add(sh);
    const bs = new THREE.Mesh(baseGeo, stoneMat); bs.position.set(x, 1.12 + 0.16, endZ + 0.2); scene.add(bs);
    const ec = new THREE.Mesh(echinusGeo, stoneMat); ec.position.set(x, 1.12 + 0.32 + H + 0.15, endZ + 0.2); scene.add(ec);
    const ab = new THREE.Mesh(abacusGeo, stoneMat); ab.position.set(x, 1.12 + 0.32 + H + 0.43, endZ + 0.2); scene.add(ab);
  }

  // ---------- Laurel wreath ----------
  const wreath = new THREE.Group();
  wreath.position.set(1.7, 2.7, -2.5);
  const WR = 1.15;
  const leafGeo = track(new THREE.SphereGeometry(1, 12, 7));
  const berryGeo = track(new THREE.SphereGeometry(0.05, 10, 8));
  const nLeaf = lowPower ? 16 : 24;
  const leaves = new THREE.InstancedMesh(leafGeo, goldMat, nLeaf * 4);
  const berries = new THREE.InstancedMesh(berryGeo, goldMat, nLeaf * 2);
  const dummy = new THREE.Object3D();
  let li = 0, bi = 0;
  for (const dir of [1, -1]) {
    for (let k = 0; k < nLeaf; k++) {
      const t = k / (nLeaf - 1);
      const phi = -Math.PI / 2 + dir * t * Math.PI * 1.02;
      const px = Math.cos(phi) * WR, py = Math.sin(phi) * WR;
      const tx = -Math.sin(phi) * dir, ty = Math.cos(phi) * dir;
      const nx = Math.cos(phi), ny = Math.sin(phi);
      const size = 0.9 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 1.15)) - 0.2 * t;
      for (const sgn of [1, -1]) {
        const tilt = 0.62 * sgn;
        const dx = tx * Math.cos(tilt) + nx * Math.sin(tilt);
        const dy = ty * Math.cos(tilt) + ny * Math.sin(tilt);
        dummy.position.set(px + dx * 0.15 * size, py + dy * 0.15 * size, sgn * 0.01);
        dummy.rotation.set(0, sgn * 0.25, Math.atan2(dy, dx));
        dummy.scale.set(0.2 * size, 0.062 * size, 0.026);
        dummy.updateMatrix();
        leaves.setMatrixAt(li++, dummy.matrix);
      }
      if (k % 3 === 1) {
        dummy.position.set(px + nx * 0.07, py + ny * 0.07, 0.04);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        berries.setMatrixAt(bi++, dummy.matrix);
      }
    }
  }
  leaves.count = li; berries.count = bi;
  wreath.add(leaves, berries);
  const stem = new THREE.Mesh(track(new THREE.TorusGeometry(WR, 0.016, 8, 96)), goldMat);
  wreath.add(stem);
  scene.add(wreath);
  const halo = new THREE.Sprite(track(new THREE.SpriteMaterial({
    map: track(softSprite('rgba(255,205,110,0.55)')), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true,
  })));
  halo.scale.set(7.5, 7.5, 1);
  halo.position.set(1.7, 2.7, -3.1);
  scene.add(halo);

  // ---------- Light shafts ----------
  const beamTex = track(beamTexture());
  const beamMat = track(new THREE.MeshBasicMaterial({
    map: beamTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  }));
  const beamGeo = track(new THREE.PlaneGeometry(1.5, 15));
  const beams: THREE.Mesh[] = [];
  const nBeams = lowPower ? 4 : 8;
  for (let i = 0; i < nBeams; i++) {
    const b = new THREE.Mesh(beamGeo, beamMat);
    b.position.set(-2.2 + (i % 3) * 2.2, 6.5, 3 - i * 4.4);
    b.rotation.set(0, 0.5, 0.42);
    b.scale.set(1 + (i % 2) * 0.6, 1, 1);
    scene.add(b);
    beams.push(b);
  }

  // ---------- Gold dust ----------
  const nDust = lowPower ? 140 : 420;
  const dustPos = new Float32Array(nDust * 3);
  const dr = rng(99);
  for (let i = 0; i < nDust; i++) {
    dustPos[i * 3] = (dr() - 0.5) * 9;
    dustPos[i * 3 + 1] = dr() * 8;
    dustPos[i * 3 + 2] = 7 - dr() * 38;
  }
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, track(new THREE.PointsMaterial({
    map: track(softSprite('rgba(255,224,150,1)')), size: 0.09, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, color: 0xffd98a,
  })));
  scene.add(dust);

  // ---------- Camera rig ----------
  let scrollTarget = 0, scrollNow = 0;
  const pointerTarget = new THREE.Vector2(), pointerNow = new THREE.Vector2();
  let width = 1, height = 1;
  let paused = false, raf = 0, last = performance.now(), time = 0, disposed = false;

  const startZ = 11, endCamZ = endZ + 14;
  function placeCamera(p: number) {
    const e = smooth(p);
    const z = startZ + (endCamZ - startZ) * e;
    // gentle S-curve so the move is a glide, not a rail
    const x = Math.sin(e * Math.PI * 2) * 0.55 + pointerNow.x * 0.55;
    const y = 1.85 + Math.sin(e * Math.PI) * 0.35 + pointerNow.y * 0.22;
    camera.position.set(x, y, z);
    camera.lookAt(pointerNow.x * 0.8 + Math.sin(e * Math.PI * 2) * 0.3, 2.5 + e * 2.2 + pointerNow.y * 0.2, z - 12);
  }

  function renderFrame(dt: number) {
    time += dt;
    scrollNow += (scrollTarget - scrollNow) * (1 - Math.pow(0.0025, dt)); // frame-rate independent damping
    pointerNow.lerp(pointerTarget, 1 - Math.pow(0.01, dt));
    placeCamera(scrollNow);
    wreath.rotation.y = Math.sin(time * 0.45) * 0.38;
    wreath.rotation.x = Math.sin(time * 0.3) * 0.06;
    wreath.position.y = 2.7 + Math.sin(time * 0.8) * 0.06;
    halo.material.opacity = 0.85 + Math.sin(time * 1.3) * 0.12;
    wreathLight.intensity = 14 + Math.sin(time * 2.1) * 1.4;
    beams.forEach((b, i) => { b.position.x += Math.sin(time * 0.2 + i) * 0.0008; });
    const a = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < nDust; i++) {
      let y = a.getY(i) + dt * (0.05 + (i % 7) * 0.012);
      if (y > 8) y = 0;
      a.setY(i, y);
      a.setX(i, a.getX(i) + Math.sin(time * 0.3 + i) * 0.0009);
    }
    a.needsUpdate = true;
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (paused) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    renderFrame(dt);
  }

  if (reducedMotion) {
    time = 1.2;
    scrollNow = scrollTarget = 0.0;
    placeCamera(0);
    renderer.render(scene, camera);
  } else {
    raf = requestAnimationFrame(loop);
  }

  return {
    setScroll(p) { if (!reducedMotion) scrollTarget = clamp01(p); },
    setPointer(x, y) { if (!reducedMotion) pointerTarget.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))); },
    resize(w, h) {
      width = Math.max(1, w); height = Math.max(1, h);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // keep the subject framed on tall/narrow screens
      camera.fov = width / height < 0.8 ? 62 : 48;
      camera.updateProjectionMatrix();
      if (reducedMotion) renderer.render(scene, camera);
    },
    setPaused(p) { paused = p; if (!p) last = performance.now(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      disposables.forEach((d) => { try { d.dispose(); } catch { /* ignore */ } });
      [shafts, bases, echini, abaci, leaves, berries].forEach((im) => im.dispose());
      renderer.dispose();
    },
  };
}
