/**
 * Robotics world: the second act of the hero. A dark engineering lab with a polished reflective floor, two articulated
 * industrial arms, a lighting truss, a lidar-style point cloud, and the owner's photo rebuilt as a depth-relief hologram.
 *
 * Realism notes (honest): the hologram is a single photo lifted into relief with a depth map (silhouette volume plus facial shading
 * cues), not a 3D scan. Materials are physically based (metal / ceramic / graphite) and lit by an environment map, no cartoon shading.
 * Framework-free like imperialHall.ts; the caller owns the renderer and camera.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface HologramSource { portraitUrl: string; depthUrl: string; aspect: number; name: string; headline: string }
export interface RoboticsWorld {
  group: THREE.Group;
  lights: THREE.Light[];
  /** q: 0..1 progress through the robotics act. */
  update(time: number, dt: number, q: number, camera: THREE.Camera, pointer: THREE.Vector2): void;
  /** Camera placement for the act (q 0..1). */
  placeCamera(camera: THREE.PerspectiveCamera, q: number, pointer: THREE.Vector2, narrow: boolean): void;
  setStill(): void;
  /** Canvas height in CSS px, used to size the hologram particles. */
  setViewport(h: number): void;
  /** Screen-space callouts anchored on the hologram; o is 0..1 visibility. */
  labels(camera: THREE.Camera, w: number, h: number, q: number): Array<{ id: string; text: string; x: number; y: number; o: number }>;
  /** True once a real bust.glb replaced the depth-relief mesh. */
  readonly usingGlb: boolean;
  dispose(): void;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const CYAN = new THREE.Color(0x35e3ff);
const HX = 1.7; // hologram stands right of centre; the headline copy sits on the left

function glowSprite(inner: string, outer = 'rgba(0,0,0,0)'): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function gridTexture(): THREE.CanvasTexture {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(53,227,255,0.55)'; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2);
  g.strokeStyle = 'rgba(53,227,255,0.16)'; g.lineWidth = 1;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * s / 4, 0); g.lineTo(i * s / 4, s); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function panelTexture(lines: Array<[string, string, string]>): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(6,20,28,0.55)'; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = 'rgba(53,227,255,0.8)'; g.lineWidth = 2; g.strokeRect(2, 2, 508, 156);
  g.fillStyle = 'rgba(53,227,255,0.9)'; g.fillRect(2, 2, 40, 4); g.fillRect(470, 154, 40, 4);
  let y = 40;
  for (const [label, value, color] of lines) {
    g.font = '500 17px ui-monospace, Menlo, monospace'; g.fillStyle = 'rgba(140,220,235,0.75)'; g.fillText(label, 22, y);
    g.font = '600 24px ui-monospace, Menlo, monospace'; g.fillStyle = color; g.fillText(value, 22, y + 28); y += 62;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Particle hologram: every point is a glowing cyan dot; the volume comes from front/back shells and interior slices. */
const CLOUD_VERT = /* glsl */ `
  attribute float aLum; attribute float aEdge; attribute float aLayer; attribute float aSeed;
  uniform float uTime; uniform float uReveal; uniform float uPx; uniform float uSize; uniform float uGlitch;
  varying float vLum; varying float vEdge; varying float vLayer; varying float vVis; varying float vH; varying float vWy;
  void main(){
    vec3 p = position;
    float h = clamp(p.y / 4.3, 0.0, 1.0); vH = h;
    p += vec3(sin(uTime * 1.3 + aSeed * 40.0), cos(uTime * 1.1 + aSeed * 31.0), sin(uTime * 0.9 + aSeed * 17.0)) * 0.006;
    p.x += uGlitch * 0.06 * sin(p.y * 30.0 + uTime * 50.0);
    vec4 wp = modelMatrix * vec4(p, 1.0); vWy = wp.y;
    float k = uReveal * 1.3 - 0.1 - h - aSeed * 0.12;
    vVis = smoothstep(0.0, 0.08, k);
    vLum = aLum; vEdge = aEdge; vLayer = aLayer;
    vec4 mv = viewMatrix * wp;
    gl_PointSize = uSize * uPx * (1.0 + aEdge * 0.7 + (1.0 - aLayer) * 0.25) / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const CLOUD_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime; uniform float uMirror;
  varying float vLum; varying float vEdge; varying float vLayer; varying float vVis; varying float vH; varying float vWy;
  void main(){
    vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
    float dot_ = smoothstep(0.5, 0.05, d);
    float scan = 0.78 + 0.22 * sin(vWy * 60.0 - uTime * 3.0);
    float sweep = smoothstep(0.03, 0.0, abs(fract(uTime * 0.14) * 4.6 - vWy));
    vec3 deep = vec3(0.05, 0.55, 0.85), hot = vec3(0.65, 1.0, 1.0);
    vec3 col = mix(deep, hot, clamp(pow(vLum, 0.6) * 1.1 + vEdge * 0.6 + sweep, 0.0, 1.0)) * scan;
    float bottom = smoothstep(0.0, 0.25, vH);          // the jacket dissolves into light near the pedestal
    float a = dot_ * 1.25 * (0.08 + 0.95 * pow(vLum, 0.9) + vEdge * 0.5 + sweep * 0.6) * (1.0 - vLayer * 0.55) * vVis * bottom;
    if (uMirror > 0.5) a *= 0.22;
    gl_FragColor = vec4(col, a);
  }`;

export function buildRoboticsWorld(opts: { lowPower: boolean; holo?: HologramSource; onTexturesReady?: () => void }): RoboticsWorld {
  const { lowPower, holo } = opts;
  const group = new THREE.Group();
  const lights: THREE.Light[] = [];
  const dispo: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(o: T): T => { dispo.push(o); return o; };
  let dead = false;

  // ---------- Lighting: cool rim lights + a soft warm key, so metal reads as metal
  const key = new THREE.DirectionalLight(0xdfeeff, 1.6); key.position.set(-5, 8, 6); group.add(key); lights.push(key);
  const rimA = new THREE.PointLight(0x35e3ff, 30, 26, 1.7); rimA.position.set(HX + 3.5, 3.2, -2.5); group.add(rimA); lights.push(rimA);
  const rimB = new THREE.PointLight(0x8a5cff, 16, 22, 1.7); rimB.position.set(-4.5, 2.4, -3); group.add(rimB); lights.push(rimB);
  const warm = new THREE.PointLight(0xffb070, 9, 16, 1.8); warm.position.set(-1.5, 3.5, 6); group.add(warm); lights.push(warm);

  // ---------- Floor: polished dark concrete with a faint engineering grid; reflections come from the environment + a mirrored hologram
  const gridTex = track(gridTexture()); gridTex.repeat.set(30, 60);
  const floorMat = track(new THREE.MeshStandardMaterial({ color: 0x0a0e13, roughness: 0.2, metalness: 0.72, envMapIntensity: 0.9, emissive: 0x35e3ff, emissiveMap: gridTex, emissiveIntensity: 0.22, transparent: true, opacity: 0.9, depthWrite: false }));
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(60, 120)), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -20); floor.renderOrder = 1; group.add(floor);

  // ---------- Materials for the arms
  const ceramic = track(new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.34, metalness: 0.12, envMapIntensity: 1.3 }));
  const graphite = track(new THREE.MeshStandardMaterial({ color: 0x181b20, roughness: 0.25, metalness: 0.9, envMapIntensity: 2.2 }));
  const accent = track(new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.4, metalness: 0.3, emissive: 0xff5a00, emissiveIntensity: 0.15 }));
  const chrome = track(new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.12, metalness: 1, envMapIntensity: 2 }));

  // ---------- Industrial 6-axis arms (forward kinematics, pick-and-place motion)
  interface Arm { root: THREE.Group; j: THREE.Object3D[]; phase: number; speed: number }
  const arms: Arm[] = [];
  const rbox = (w: number, h: number, d: number, r: number, m: THREE.Material) => { const g = track(new RoundedBoxGeometry(w, h, d, 3, r)); return new THREE.Mesh(g, m); };
  const cyl = (rt: number, rb: number, h: number, m: THREE.Material, seg = 40) => new THREE.Mesh(track(new THREE.CylinderGeometry(rt, rb, h, seg)), m);
  function makeArm(x: number, z: number, yaw: number, scale: number, phase: number): Arm {
    const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = yaw; root.scale.setScalar(scale);
    const plinth = cyl(0.62, 0.7, 0.18, graphite); plinth.position.y = 0.09; root.add(plinth);
    const j1 = new THREE.Object3D(); j1.position.y = 0.18; root.add(j1);
    const turret = cyl(0.42, 0.5, 0.5, ceramic); turret.position.y = 0.25; j1.add(turret);
    const band = cyl(0.43, 0.43, 0.05, accent); band.position.y = 0.1; j1.add(band);
    const j2 = new THREE.Object3D(); j2.position.set(0, 0.5, 0.0); j1.add(j2);
    const shoulder = cyl(0.3, 0.3, 0.62, graphite, 32); shoulder.rotation.z = Math.PI / 2; j2.add(shoulder);
    const upper = rbox(0.34, 1.5, 0.3, 0.09, ceramic); upper.position.set(0, 0.7, 0); j2.add(upper);
    const stripe = rbox(0.36, 0.08, 0.32, 0.03, accent); stripe.position.set(0, 0.25, 0); j2.add(stripe);
    const j3 = new THREE.Object3D(); j3.position.set(0, 1.45, 0); j2.add(j3);
    const elbow = cyl(0.24, 0.24, 0.55, graphite, 32); elbow.rotation.z = Math.PI / 2; j3.add(elbow);
    const fore = rbox(0.26, 1.25, 0.24, 0.07, ceramic); fore.position.set(0, 0.6, 0); j3.add(fore);
    const hose = new THREE.Mesh(track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.17, 0.05, 0.1), new THREE.Vector3(0.24, 0.6, 0.15), new THREE.Vector3(0.17, 1.2, 0.1)]), 20, 0.018, 8)), graphite); j3.add(hose);
    const j4 = new THREE.Object3D(); j4.position.set(0, 1.25, 0); j3.add(j4);
    const wristA = cyl(0.14, 0.14, 0.26, graphite, 24); wristA.position.y = 0.1; j4.add(wristA);
    const j5 = new THREE.Object3D(); j5.position.set(0, 0.26, 0); j4.add(j5);
    const wristB = cyl(0.12, 0.12, 0.3, ceramic, 24); wristB.rotation.z = Math.PI / 2; j5.add(wristB);
    const j6 = new THREE.Object3D(); j6.position.set(0, 0.2, 0); j5.add(j6);
    const flange = cyl(0.11, 0.11, 0.05, chrome, 24); flange.position.y = 0.03; j6.add(flange);
    for (const s of [-1, 1]) { const f = rbox(0.03, 0.3, 0.07, 0.01, chrome); f.position.set(s * 0.07, 0.22, 0); j6.add(f); }
    const cube = rbox(0.1, 0.1, 0.1, 0.012, accent); cube.position.set(0, 0.26, 0); j6.add(cube);
    const led = (parent: THREE.Object3D, r: number, y: number, rotZ: boolean, color: number) => {
      const t = new THREE.Mesh(track(new THREE.TorusGeometry(r, 0.012, 8, 48)), track(new THREE.MeshBasicMaterial({ color, toneMapped: false })));
      if (rotZ) t.rotation.y = Math.PI / 2; else t.rotation.x = Math.PI / 2; t.position.y = y; parent.add(t);
    };
    led(j1, 0.45, 0.42, false, 0x35e3ff); led(j2, 0.31, 0, true, 0xffa040); led(j3, 0.25, 0, true, 0x35e3ff); led(j4, 0.15, 0.2, false, 0xffa040); led(j5, 0.13, 0, true, 0x35e3ff);
    group.add(root);
    return { root, j: [j1, j2, j3, j4, j5, j6], phase, speed: 0.55 + phase * 0.02 };
  }
  arms.push(makeArm(-4.2, -1.2, 0.5, 1.15, 0.0));
  arms.push(makeArm(7.4, -4.6, -0.7, 1.0, 2.1));
  if (!lowPower) arms.push(makeArm(-9.5, -9, 0.9, 1.2, 4.2));

  const laserA = new THREE.Vector3(), laserB = new THREE.Vector3();
  const laserGeo = track(new THREE.CylinderGeometry(0.006, 0.03, 1, 10, 1, true)); laserGeo.translate(0, 0.5, 0);
  const lasers: THREE.Mesh[] = arms.map((_, i) => {
    const m = new THREE.Mesh(laserGeo, track(new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffb050 : 0x35e3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    m.frustumCulled = false; group.add(m); return m;
  });

  // ---------- Lighting truss with emissive bars
  const truss = new THREE.Group();
  const trussMat = graphite;
  for (const zz of [-3, -9, -15]) {
    const beam = rbox(26, 0.16, 0.16, 0.04, trussMat); beam.position.set(0, 7.2, zz); truss.add(beam);
    for (let i = -5; i <= 5; i++) {
      const bar = new THREE.Mesh(track(new THREE.BoxGeometry(1.2, 0.04, 0.12)), track(new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0x35e3ff : 0xeaf6ff, toneMapped: false })));
      bar.position.set(i * 2.3, 7.08, zz); truss.add(bar);
    }
  }
  for (const xx of [-11, 11]) { const post = rbox(0.18, 7.3, 0.18, 0.04, trussMat); post.position.set(xx, 3.65, -9); truss.add(post); }
  group.add(truss);

  // ---------- Volumetric light shafts from the truss
  const beamCanvas = document.createElement('canvas'); beamCanvas.width = 64; beamCanvas.height = 256;
  { const g = beamCanvas.getContext('2d')!; const v = g.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, 'rgba(120,230,255,0.5)'); v.addColorStop(1, 'rgba(120,230,255,0)'); g.fillStyle = v; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'destination-in'; const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.5, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = h; g.fillRect(0, 0, 64, 256); }
  const beamTex = track(new THREE.CanvasTexture(beamCanvas)); beamTex.colorSpace = THREE.SRGBColorSpace;
  const beamMat = track(new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const beamGeo = track(new THREE.PlaneGeometry(1.6, 7.2));
  const shafts: THREE.Mesh[] = [];
  for (let i = 0; i < (lowPower ? 3 : 6); i++) { const b = new THREE.Mesh(beamGeo, beamMat); b.position.set(-8 + i * 3.6, 3.6, -3 - (i % 3) * 5); b.rotation.set(0, i * 0.7, (i % 2 ? 1 : -1) * 0.08); group.add(b); shafts.push(b); }

  // ---------- Lidar-style point cloud landscape in the distance
  const gx = lowPower ? 90 : 170, gz = lowPower ? 40 : 70, nPts = gx * gz;
  const cloudPos = new Float32Array(nPts * 3), cloudSeed = new Float32Array(nPts);
  for (let i = 0; i < gx; i++) for (let k = 0; k < gz; k++) { const n = i * gz + k; cloudPos[n * 3] = (i / gx - 0.5) * 50; cloudPos[n * 3 + 1] = 0; cloudPos[n * 3 + 2] = -14 - (k / gz) * 30; cloudSeed[n] = (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1; }
  const cloudGeo = track(new THREE.BufferGeometry()); cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3)); cloudGeo.setAttribute('seed', new THREE.BufferAttribute(cloudSeed, 1));
  const cloudMat = track(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
    vertexShader: `uniform float uTime; attribute float seed; varying float vA; varying float vH;
      void main(){ vec3 p = position; float h = (sin(p.x*0.22 + uTime*0.2)*0.5 + sin(p.z*0.3 - uTime*0.15)*0.7 + sin((p.x+p.z)*0.11)*1.4); h = max(h, 0.0) * 1.4 + 0.05; p.y = h;
        float sweep = smoothstep(2.0, 0.0, abs(mod(uTime*5.0, 46.0) - (-p.z - 14.0)));
        vH = h; vA = (0.25 + 0.75*fract(seed*7.0)) * (0.35 + sweep*1.6);
        vec4 mv = modelViewMatrix * vec4(p,1.0); gl_PointSize = (1.4 + sweep*2.4) * (90.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; varying float vH; void main(){ vec2 c = gl_PointCoord - 0.5; float d = smoothstep(0.5, 0.0, length(c)); vec3 col = mix(vec3(0.1,0.55,0.9), vec3(0.4,1.0,1.0), clamp(vH/3.0,0.0,1.0)); gl_FragColor = vec4(col, d * vA * 0.9); }`,
  }));
  const cloud = new THREE.Points(cloudGeo, cloudMat); cloud.frustumCulled = false; group.add(cloud);

  // ---------- Floating motes
  const nMote = lowPower ? 120 : 360; const motePos = new Float32Array(nMote * 3);
  for (let i = 0; i < nMote; i++) { motePos[i * 3] = (Math.random() - 0.5) * 22; motePos[i * 3 + 1] = Math.random() * 7; motePos[i * 3 + 2] = 6 - Math.random() * 26; }
  const moteGeo = track(new THREE.BufferGeometry()); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(moteGeo, track(new THREE.PointsMaterial({ map: track(glowSprite('rgba(170,240,255,1)')), size: 0.07, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x9fefff })));
  group.add(motes);

  // ---------- Hologram stage: emitter disc, rings, data panels, and the hologram itself
  const stage = new THREE.Group(); stage.position.set(HX, 0, 0); group.add(stage);
  const disc = cyl(1.15, 1.25, 0.1, graphite, 64); disc.position.y = 0.05; stage.add(disc);
  const discRing = new THREE.Mesh(track(new THREE.TorusGeometry(1.12, 0.018, 8, 96)), track(new THREE.MeshBasicMaterial({ color: CYAN, toneMapped: false }))); discRing.rotation.x = Math.PI / 2; discRing.position.y = 0.11; stage.add(discRing);
  const pool = new THREE.Mesh(track(new THREE.CircleGeometry(2.2, 48)), track(new THREE.MeshBasicMaterial({ map: track(glowSprite('rgba(53,227,255,0.55)')), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.02; stage.add(pool);
  const ringMat = track(new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const rings: THREE.Mesh[] = [];
  for (const [r, y, w] of [[1.55, 1.0, 0.008], [1.9, 2.0, 0.006], [1.4, 3.0, 0.008]] as const) { const m = new THREE.Mesh(track(new THREE.TorusGeometry(r, w, 6, 120)), ringMat); m.rotation.x = Math.PI / 2; m.position.y = y; stage.add(m); rings.push(m); }
  const tickPts: number[] = []; for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2, r0 = 2.15, r1 = i % 5 === 0 ? 2.4 : 2.28; tickPts.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * r1, 0, Math.sin(a) * r1); }
  const tickGeo = track(new THREE.BufferGeometry()); tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3));
  const ticks = new THREE.LineSegments(tickGeo, track(new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }))); ticks.position.y = 0.12; stage.add(ticks);

  const panelDefs: Array<{ lines: Array<[string, string, string]>; pos: [number, number, number] }> = holo ? [
    { lines: [['IDENTITY', holo.name.toUpperCase(), '#e9fdff'], ['FOCUS', 'AI/ML · ROBOTICS · SECURITY', '#7df0ff']], pos: [-3.2, 3.3, 0.6] },
    { lines: [['MODEL', 'VOLUMETRIC POINT CLOUD', '#e9fdff'], ['SOURCE', 'PHOTO-DERIVED DEPTH', '#7df0ff']], pos: [3.2, 3.6, 0.2] },
  ] : [];
  const panels: THREE.Sprite[] = [];
  for (const d of panelDefs) { const s = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: track(panelTexture(d.lines)), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }))); s.scale.set(2.5, 0.78, 1); s.position.set(...d.pos); stage.add(s); panels.push(s); }

  const holoH = 4.3; const holoW = holoH * (holo?.aspect ?? 0.8);
  const holoUniforms = { uTime: { value: 0 }, uReveal: { value: 0 }, uPx: { value: 700 }, uSize: { value: lowPower ? 0.036 : 0.025 }, uGlitch: { value: 0 } };
  const holoRoot = new THREE.Group(); holoRoot.position.set(0, 0.22, 0); stage.add(holoRoot);
  let cloudBuilt = false;
  function addCloud(pos: number[], lum: number[], edge: number[], layer: number[], seed: number[]) {
    if (dead || cloudBuilt) return; cloudBuilt = true;
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aLum', new THREE.Float32BufferAttribute(lum, 1));
    geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1)); geo.setAttribute('aLayer', new THREE.Float32BufferAttribute(layer, 1)); geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    for (const mf of [0, 1]) {
      const m = track(new THREE.ShaderMaterial({ uniforms: { ...holoUniforms, uMirror: { value: mf } }, vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const pts = new THREE.Points(geo, m); pts.frustumCulled = false; pts.renderOrder = mf ? 3 : 5;
      if (mf) { pts.scale.y = -1; pts.position.y = -0.02; }
      holoRoot.add(pts);
    }
    pointCount = pos.length / 3; opts.onTexturesReady?.();
  }
  let pointCount = 0;
  if (holo) {
    const loader = new THREE.TextureLoader(); const imgs: Record<string, HTMLImageElement> = {};
    const done = () => {
      if (dead || !imgs.p || !imgs.d) return;
      const W = lowPower ? 100 : 176, H = Math.round(W / holo.aspect);
      const read = (im: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(im, 0, 0, W, H); return g.getImageData(0, 0, W, H).data; };
      const ph = read(imgs.p), dp = read(imgs.d);
      const pos: number[] = [], lum: number[] = [], edge: number[] = [], layer: number[] = [], seed: number[] = [];
      const inside = (i: number, j: number) => i >= 0 && j >= 0 && i < W && j < H && ph[(j * W + i) * 4 + 3] > 128;
      let rnd = 7; const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
      const layers = lowPower ? [0, 1] : [0, 0.5, 1];
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        if (!inside(i, j)) continue;
        const k = (j * W + i) * 4; const d = dp[k] / 255;
        const l = (0.299 * ph[k] + 0.587 * ph[k + 1] + 0.114 * ph[k + 2]) / 255;
        const e = (!inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1)) ? 1 : 0;
        const x = (i / (W - 1) - 0.5) * holoW, y = (1 - j / (H - 1)) * holoH;
        const zF = (d - 0.30) * 0.9, thick = 0.25 + 0.95 * d;
        for (const ly of layers) {
          if (ly > 0 && ly < 1 && rand() > 0.3) continue;
          if (ly === 1 && rand() > 0.45) continue;
          pos.push(x + (rand() - 0.5) * 0.02, y + (rand() - 0.5) * 0.02, zF - thick * ly); lum.push(ly === 0 ? l : l * 0.7 + 0.1); edge.push(e); layer.push(ly); seed.push(rand());
        }
      }
      addCloud(pos, lum, edge, layer, seed);
    };
    const load = (url: string, key: 'p' | 'd') => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { imgs[key] = im; done(); }; im.onerror = () => { /* missing image: the world still renders without the hologram */ }; im.src = url; };
    void loader; load(holo.portraitUrl, 'p'); load(holo.depthUrl, 'd');

    // Optional true-3D bust: if /hologram/bust.glb exists its surface is sampled into the particle cloud instead of the photo relief.
    const glbUrl = holo.portraitUrl.replace(/[^/]+$/, 'bust.glb');
    fetch(glbUrl, { method: 'HEAD' }).then(async (r) => {
      if (!r.ok || dead) return;
      const [{ GLTFLoader }, { MeshSurfaceSampler }] = await Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/math/MeshSurfaceSampler.js')]);
      new GLTFLoader().load(glbUrl, (gltf) => {
        if (dead) return;
        const model = gltf.scene; const box = new THREE.Box3().setFromObject(model); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
        const k = holoH / Math.max(size.y, 1e-3); model.scale.setScalar(k); model.position.set(-c.x * k, -box.min.y * k, -c.z * k); model.updateMatrixWorld(true);
        const meshes: THREE.Mesh[] = []; model.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
        if (!meshes.length) return;
        const total = lowPower ? 14000 : 30000, per = Math.floor(total / meshes.length);
        const pos: number[] = [], lum: number[] = [], edge: number[] = [], layer: number[] = [], seed: number[] = [];
        const v = new THREE.Vector3(), n = new THREE.Vector3();
        for (const m of meshes) { const sm = new MeshSurfaceSampler(m).build(); for (let i = 0; i < per; i++) { sm.sample(v, n); v.applyMatrix4(m.matrixWorld); pos.push(v.x, v.y, v.z); lum.push(0.55 + Math.random() * 0.4); edge.push(Math.abs(n.z) < 0.35 ? 1 : 0); layer.push(0); seed.push(Math.random()); } }
        if (cloudBuilt) { // replace the photo-based cloud
          for (const ch of [...holoRoot.children]) holoRoot.remove(ch); cloudBuilt = false;
        }
        usingGlb = true; addCloud(pos, lum, edge, layer, seed);
      }, undefined, () => { /* bad glb: keep the photo cloud */ });
    }).catch(() => { /* no glb */ });
  }

  // ---------- Projection cone and rising light motes: visually connect the pedestal to the bust
  const coneMat = track(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uAmt: { value: 0 } },
    vertexShader: 'varying float vY; varying vec2 vUv; void main(){ vUv = uv; vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'precision highp float; uniform float uTime; uniform float uAmt; varying float vY; varying vec2 vUv; void main(){ float fade = pow(1.0 - vY, 1.6); float streak = 0.55 + 0.45 * sin(vUv.x * 80.0 + uTime * 0.5) * sin(vUv.y * 24.0 - uTime * 2.0); gl_FragColor = vec4(0.2, 0.85, 1.0, fade * streak * 0.11 * uAmt); }',
  }));
  const cone = new THREE.Mesh(track(new THREE.CylinderGeometry(1.2, 1.12, 4.4, 64, 1, true)), coneMat); cone.position.y = 2.3; stage.add(cone);
  const nRise = lowPower ? 90 : 240, risePos = new Float32Array(nRise * 3), riseSeed = new Float32Array(nRise);
  for (let i = 0; i < nRise; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.05; risePos[i * 3] = Math.cos(a) * r; risePos[i * 3 + 1] = Math.random() * 4.2; risePos[i * 3 + 2] = Math.sin(a) * r; riseSeed[i] = Math.random(); }
  const riseGeo = track(new THREE.BufferGeometry()); riseGeo.setAttribute('position', new THREE.BufferAttribute(risePos, 3));
  const rise = new THREE.Points(riseGeo, track(new THREE.PointsMaterial({ map: track(glowSprite('rgba(170,245,255,1)')), size: 0.07, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x7df0ff }))); rise.position.y = 0.12; stage.add(rise);

  let usingGlb = false; let viewH = 800;
  const camTarget = new THREE.Vector3();
  let lastQ = 0;
  const tmpV = new THREE.Vector3();
  const anchors = [
    { id: 'ai', text: 'Agentic AI', at: new THREE.Vector3(-0.95, 3.5, 0.3), from: 0.30, to: 0.45 },
    { id: 'sim', text: 'Robotics Sim', at: new THREE.Vector3(1.0, 2.7, 0.3), from: 0.48, to: 0.62 },
    { id: 'sec', text: 'Security', at: new THREE.Vector3(-0.8, 1.5, 0.4), from: 0.66, to: 0.8 },
  ];
  const state = { still: false };
  return {
    group, lights,
    placeCamera(camera, q, pointer, narrow) {
      const e = smooth(clamp01(q));
      const ang = -0.5 + e * 0.9;                      // slow orbit around the hologram
      const R = (narrow ? 11.5 : 8.6) * (1 - 0.3 * e);   // dolly in as you scroll
      const cx = (narrow ? 0 : HX) + Math.sin(ang) * R * 0.78 + pointer.x * 0.5 - (narrow ? 0 : 2.2);
      const cz = Math.cos(ang) * R + 0.5;
      camera.position.set(cx, 1.7 + e * 0.5 + pointer.y * 0.25, cz);
      camTarget.set((narrow ? 0 : HX) - (narrow ? 0 : 0.6) + pointer.x * 0.4, 1.95 + pointer.y * 0.15, 0);
      camera.lookAt(camTarget);
    },
    update(time, _dt, q, camera, pointer) {
      cloudMat.uniforms.uTime.value = time; holoUniforms.uTime.value = time;
      holoUniforms.uPx.value = (viewH * 0.5) / Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360);
      const reveal = state.still ? 1 : smooth(clamp01((q - 0.1) / 0.34));
      holoUniforms.uReveal.value = reveal;
      holoUniforms.uGlitch.value += (Math.min(1, Math.abs(q - lastQ) * 60) - holoUniforms.uGlitch.value) * 0.2; lastQ = q;
      const reach = smooth(clamp01((q - 0.25) / 0.5));
      for (const a of arms) {
        const t = time * a.speed + a.phase;
        // aim each arm's bend plane at the hologram, then reach further as the scroll advances
        const dx = stage.position.x - a.root.position.x, dz = stage.position.z - a.root.position.z;
        const aim = Math.atan2(dz, -dx) - a.root.rotation.y;
        a.j[0].rotation.y = aim + Math.sin(t * 0.8) * 0.12;
        a.j[1].rotation.z = 0.15 + reach * 0.5 + Math.sin(t) * 0.06;
        a.j[2].rotation.z = 1.15 - reach * 0.75 + Math.sin(t * 1.3 + 1) * 0.08;
        a.j[3].rotation.y = Math.sin(t * 0.7) * 0.5;
        a.j[4].rotation.z = 0.3 + Math.sin(t * 1.1) * 0.2;
        a.j[5].rotation.y = t * 1.5;
      }
      rings.forEach((r, i) => { r.rotation.z = time * (0.25 + i * 0.15) * (i % 2 ? -1 : 1); (r.material as THREE.MeshBasicMaterial).opacity = 0.5 * reveal; });
      ticks.rotation.y = -time * 0.12; (ticks.material as THREE.LineBasicMaterial).opacity = 0.55 * reveal;
      (pool.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.65 * reveal;
      panels.forEach((p, i) => { p.material.opacity = clamp01((reveal - 0.55 - i * 0.1) / 0.3) * (0.85 + Math.sin(time * 2 + i) * 0.08); p.position.y += Math.sin(time * 0.9 + i) * 0.0006; });
      shafts.forEach((b, i) => { b.position.x += Math.sin(time * 0.2 + i) * 0.001; });
      const pa = motePos; for (let i = 0; i < nMote; i++) { let y = pa[i * 3 + 1] + 0.003 + (i % 5) * 0.0006; if (y > 7) y = 0; pa[i * 3 + 1] = y; } moteGeo.attributes.position.needsUpdate = true;
      // the hologram turns a little toward the viewer, so camera movement reveals real parallax in the relief
      const dx = camera.position.x - (stage.position.x), dz = camera.position.z;
      holoRoot.rotation.y = THREE.MathUtils.clamp(Math.atan2(dx, dz) * 0.8 + pointer.x * 0.12, -0.7, 0.7);
      holoRoot.position.y = 0.22 + Math.sin(time * 0.9) * 0.025;
      rimA.intensity = 30 + Math.sin(time * 1.7) * 3;
      coneMat.uniforms.uTime.value = time; coneMat.uniforms.uAmt.value = reveal;
      for (let i = 0; i < nRise; i++) { let y = risePos[i * 3 + 1] + 0.006 + riseSeed[i] * 0.012; if (y > 4.2) y = 0; risePos[i * 3 + 1] = y; } riseGeo.attributes.position.needsUpdate = true;
      (rise.material as THREE.PointsMaterial).opacity = 0.8 * reveal;
      // scanning lasers from each end-effector to a point sweeping up and down the bust
      stage.updateWorldMatrix(true, false);
      const chest = tmpV.set(0, 1.5 + (Math.sin(time * 0.8) * 0.5 + 0.5) * 2.4, 0.25); holoRoot.localToWorld(chest);
      lasers.forEach((L, i) => {
        arms[i].j[5].getWorldPosition(laserA); laserB.copy(chest).add(new THREE.Vector3(Math.sin(time * 1.3 + i) * 0.35, 0, 0));
        const dir = laserB.clone().sub(laserA); const len = dir.length();
        L.position.copy(laserA); L.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); L.scale.set(1, len, 1);
        (L.material as THREE.MeshBasicMaterial).opacity = 0.6 * reveal * (0.7 + 0.3 * Math.sin(time * 9 + i));
      });
    },
    setStill() { state.still = true; },
    setViewport(h) { viewH = h; },
    get usingGlb() { return usingGlb; },
    labels(camera, w, h, q) {
      return anchors.map((a) => {
        tmpV.copy(a.at); holoRoot.localToWorld(tmpV); tmpV.project(camera);
        const o = state.still ? 1 : smooth(clamp01((q - a.from) / (a.to - a.from)));
        return { id: a.id, text: a.text, x: (tmpV.x * 0.5 + 0.5) * w, y: (-tmpV.y * 0.5 + 0.5) * h, o: tmpV.z < 1 ? o : 0 };
      });
    },
    dispose() { dead = true; dispo.forEach((d) => { try { d.dispose(); } catch { /* ignore */ } }); },
  };
}
