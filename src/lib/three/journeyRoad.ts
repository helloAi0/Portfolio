/**
 * The Long Road. The journey is a path across a night landscape drawn as a topographic map (glowing contour lines).
 * Every real record is a cairn beside the road, in date order. A lantern walks it as you scroll; the road behind
 * the lantern is lit and marked with footprints, the road ahead is still a dashed line to the expected graduation.
 */
import * as THREE from 'three';

export interface RoadEvent { kind: string; label: string; future: boolean }

const KIND_COLOR: Record<string, number> = { Education: 0xf3c969, Project: 0x4fd8ff, Certificate: 0xb79cff, Achievement: 0x7dffb0, Post: 0xff8fb8, Target: 0xffffff };

// shared with the terrain shader, so the road always sits exactly on the ground
const roadX = (z: number) => 9 * Math.sin(z * 0.012) + 5 * Math.sin(z * 0.031 + 1.2);
const climb = (z: number) => -z * 0.03;

const GLSL_HEIGHT = /* glsl */ `
float roadX(float z){ return 9.0*sin(z*0.012)+5.0*sin(z*0.031+1.2); }
float climb(float z){ return -z*0.03; }
float heightAt(vec2 p){
  float dx = abs(p.x - roadX(p.y));
  float n = 2.2*sin(p.x*0.11+p.y*0.05)+1.6*sin(p.x*0.23-p.y*0.09+1.3)+0.8*sin(p.x*0.5+p.y*0.37);
  float wall = smoothstep(2.0, 18.0, dx);
  return climb(p.y) + wall*(n + 0.3*min(dx, 45.0));
}`;

function labelSprite(text: string, hex: number) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d')!; g.font = '600 42px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#' + hex.toString(16).padStart(6, '0'); g.shadowBlur = 18; g.fillStyle = '#ffffff'; g.fillText(text.toUpperCase().slice(0, 14), 256, 50);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(3.4, 0.64, 1); return s;
}

export function createJourneyRoad(opts: { canvas: HTMLCanvasElement; events: RoadEvent[]; narrow: boolean }) {
  const { canvas, events } = opts;
  let narrow = opts.narrow;
  const n = events.length;
  const SP = 11;
  const L = (n + 1) * SP;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const BG = new THREE.Color(0x05060d);
  renderer.setClearColor(BG);
  const scene = new THREE.Scene();
  scene.background = BG;
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  scene.add(new THREE.AmbientLight(0x6a6ab0, 0.8));
  const moon = new THREE.DirectionalLight(0xbcd0ff, 1.2); moon.position.set(-20, 30, 10); scene.add(moon);

  const at = (s: number) => { const z = -s; return new THREE.Vector3(roadX(z), climb(z), z); };

  // terrain as contour lines
  const uniforms = { uPos: { value: new THREE.Vector3() }, uTime: { value: 0 }, uBg: { value: BG.clone() } };
  const terrainMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `${GLSL_HEIGHT}
      varying float vH; varying float vD; varying vec3 vW;
      void main(){ vec4 w = modelMatrix*vec4(position,1.0); w.y = heightAt(w.xz); vW = w.xyz; vH = w.y; vD = distance(cameraPosition, w.xyz); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${GLSL_HEIGHT}
      varying float vH; varying float vD; varying vec3 vW; uniform vec3 uPos; uniform float uTime; uniform vec3 uBg;
      float line(float v, float w){ float f = abs(fract(v-0.5)-0.5)/fwidth(v); return 1.0 - smoothstep(0.0, w, f); }
      void main(){
        float major = line(vH*0.25, 2.2), minor = line(vH*1.0, 1.3);
        float d = distance(vW.xz, uPos.xz);
        float lantern = exp(-d*d/420.0);
        float roadBand = 1.0 - smoothstep(1.2, 2.6, abs(vW.x - roadX(vW.z)));
        vec3 base = vec3(0.025,0.03,0.06);
        vec3 gold = vec3(0.96,0.78,0.36), cyan = vec3(0.3,0.75,0.95);
        vec3 col = base + minor*cyan*(0.22+0.5*lantern) + major*gold*(0.8+0.6*lantern) + roadBand*vec3(0.05,0.045,0.03);
        float fog = 1.0 - exp(-pow(vD*0.011, 2.0));
        gl_FragColor = vec4(mix(col, uBg, fog), 1.0);
      }`,
    extensions: { derivatives: true } as never,
  });
  const GW = 150, GD = 240;
  const tgeo = new THREE.PlaneGeometry(GW, GD, GW, GD); tgeo.rotateX(-Math.PI / 2);
  const terrain = new THREE.Mesh(tgeo, terrainMat); terrain.frustumCulled = false; scene.add(terrain);

  // road: dashed ahead, lit behind
  const pts: THREE.Vector3[] = [];
  for (let s = -6; s <= L + 14; s += 2) pts.push(at(s).add(new THREE.Vector3(0, 0.06, 0)));
  const curve = new THREE.CatmullRomCurve3(pts);
  const dashed = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(pts.length * 4)), new THREE.LineDashedMaterial({ color: 0x8f86b8, dashSize: 0.7, gapSize: 0.6, transparent: true, opacity: 0.8 })); dashed.computeLineDistances(); scene.add(dashed);
  const TUB = Math.ceil(L / 1.2);
  const tubeGeo = new THREE.TubeGeometry(curve, TUB, 0.09, 5, false);
  const tube = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: 0xf3c969 })); scene.add(tube);
  const tubeIdx = tubeGeo.index!.count;

  // footprints
  const FS = 1.0, FN = Math.ceil(L / FS);
  const prints = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.03, 0.42), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.85 }), FN);
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < FN; i++) { const s = i * FS, p = at(s), p2 = at(s + 0.5); const ang = Math.atan2(p2.x - p.x, p2.z - p.z); q.setFromAxisAngle(up, ang); const side = i % 2 ? 1 : -1; m.compose(new THREE.Vector3(p.x + Math.cos(ang) * side * 0.22, p.y + 0.05, p.z - Math.sin(ang) * side * 0.22), q, new THREE.Vector3(1, 1, 1)); prints.setMatrixAt(i, m); } }
  prints.count = 0; scene.add(prints);

  // cairns
  const stone = new THREE.MeshStandardMaterial({ color: 0x1c2030, roughness: 0.9, metalness: 0.2 });
  const marks = events.map((e, i) => {
    const col = KIND_COLOR[e.kind] ?? 0xf3c969;
    const s = (i + 1) * SP, p = at(s); const side = i % 2 ? 2.6 : -2.6;
    const g = new THREE.Group(); g.position.set(p.x + side, p.y, p.z); scene.add(g);
    [[0.7, 0.4], [0.5, 0.95], [0.32, 1.4]].forEach(([r, y], k) => { const st = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), stone); st.position.set(k * 0.04, y, 0); st.rotation.set(k, k * 2, 0); g.add(st); });
    const isT = e.kind === 'Target';
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, isT ? 0.35 : 0.14, isT ? 40 : 7, 10, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = isT ? 20 : 4.2; g.add(beam);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.035, 8, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; g.add(ring);
    const light = new THREE.PointLight(col, 0, 14); light.position.y = 2.4; g.add(light);
    const lab = labelSprite(e.label, col); lab.position.y = 3.2; g.add(lab);
    return { g, beam, ring, light, lab, s };
  });

  // lantern
  const walker = new THREE.Group(); scene.add(walker);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })); orb.position.y = 1.3; walker.add(orb);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), new THREE.MeshBasicMaterial({ color: 0xf3c969, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.y = 1.3; walker.add(halo);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 4, 10), new THREE.MeshStandardMaterial({ color: 0x0c0e18, roughness: 0.8 })); body.position.y = 0.62; walker.add(body);
  const wl = new THREE.PointLight(0xffd990, 30, 22); wl.position.y = 1.5; walker.add(wl);

  // distant ridges
  const ridgeMat = terrainMat;
  for (let i = 0; i < Math.ceil(L / 45) + 3; i++) {
    const s = i * 45 + 10, side = i % 2 ? 1 : -1, z = -s - 20;
    const h = 22 + ((i * 37) % 17), r = 18 + ((i * 53) % 14);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 6, true), new THREE.MeshBasicMaterial({ color: 0x0a0c18 })); cone.position.set(roadX(z) + side * (70 + ((i * 29) % 40)), climb(z) + h / 2 - 3, z); scene.add(cone);
    const wire = new THREE.Mesh(new THREE.ConeGeometry(r * 1.001, h, 7, 6, true), new THREE.MeshBasicMaterial({ color: 0x3a3558, wireframe: true, transparent: true, opacity: 0.5 })); wire.position.copy(cone.position); scene.add(wire);
  }
  void ridgeMat;

  // stars + embers
  const SN = 700, sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) { const a = Math.random() * 6.283, el = 0.1 + Math.random() * 1.2, r = 300; sp[i * 3] = Math.cos(a) * Math.cos(el) * r; sp[i * 3 + 1] = Math.sin(el) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(el) * r; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.4, color: 0xdfe6ff, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false })); scene.add(stars);
  const EN = 160, ep = new Float32Array(EN * 3), ev = new Float32Array(EN);
  for (let i = 0; i < EN; i++) { ep[i * 3] = (Math.random() - 0.5) * 30; ep[i * 3 + 1] = Math.random() * 10; ep[i * 3 + 2] = (Math.random() - 0.5) * 30; ev[i] = 0.2 + Math.random() * 0.5; }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, color: 0xffd78a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(embers);

  let target = 0, cur = 0;
  const posToS = (p: number) => (p + 1) * SP;
  function resize() { const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);

  const P = new THREE.Vector3(), P2 = new THREE.Vector3(), T = new THREE.Vector3(), Rv = new THREE.Vector3(), look = new THREE.Vector3(), cp = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const clock = new THREE.Clock(); let raf = 0, running = true;
  let camS = posToS(0);
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    cur += (target - cur) * Math.min(1, dt * 4);
    const s = posToS(cur);
    camS += (s - camS) * Math.min(1, dt * 3);
    P.copy(at(s)); P2.copy(at(s + 1.5)); T.subVectors(P2, P).setY(0).normalize(); Rv.set(-T.z, 0, T.x);
    walker.position.copy(P); walker.rotation.y = Math.atan2(T.x, T.z);
    walker.position.y += Math.abs(Math.sin(t * 5)) * 0.05;
    halo.scale.setScalar(1 + 0.15 * Math.sin(t * 3)); wl.intensity = 26 + 6 * Math.sin(t * 7);
    uniforms.uPos.value.copy(P); uniforms.uTime.value = t;
    terrain.position.set(Math.round(P.x), 0, Math.round(P.z) - GD * 0.32);

    tube.geometry.setDrawRange(0, Math.floor(tubeIdx * Math.min(1, (s + 6) / (L + 20))));
    prints.count = Math.min(FN, Math.floor(s / FS));
    marks.forEach((m, i) => {
      const reached = m.s <= s + 0.5, near = Math.max(0, 1 - Math.abs(cur - i));
      (m.beam.material as THREE.MeshBasicMaterial).opacity = (reached ? 0.35 : 0.08) + near * 0.4;
      (m.ring.material as THREE.MeshBasicMaterial).opacity = reached ? 0.95 : 0.3;
      m.light.intensity = reached ? 6 + near * 14 : 0;
      (m.lab.material as THREE.SpriteMaterial).opacity = Math.max(0.12, near);
      m.ring.rotation.z += dt * 0.4;
    });
    stars.position.copy(P);
    embers.position.set(P.x, P.y, P.z);
    const ea = eg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < EN; i++) { let y = ea.getY(i) + ev[i] * dt; if (y > 10) y = 0; ea.setY(i, y); ea.setX(i, ea.getX(i) + Math.sin(t + i) * dt * 0.2); }
    ea.needsUpdate = true;

    // camera behind and above the walker, looking ahead; offset so the walker sits right of centre (text is on the left)
    const sway = Math.sin(t * 0.5) * 0.5;
    P2.copy(at(camS));
    cp.copy(P2).addScaledVector(T, narrow ? -11 : -8).addScaledVector(UP, narrow ? 5.4 : 3.4).addScaledVector(Rv, sway - 1);
    camera.position.copy(cp);
    look.copy(P).addScaledVector(T, narrow ? 12 : 9).addScaledVector(UP, narrow ? -4.2 : 1.6).addScaledVector(Rv, narrow ? 0 : -3.4);
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
      renderer.dispose();
    },
  };
}
