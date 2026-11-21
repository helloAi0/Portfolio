/**
 * A wireframe globe turned to Kolkata, with a pulsing pin and signal arcs to real cities.
 * Decorative: the arcs only say "a message can reach me from anywhere".
 */
import * as THREE from 'three';

const KOLKATA = { lat: 22.5726, lon: 88.3639 };
const CITIES: [number, number][] = [[28.61, 77.21], [19.08, 72.88], [51.51, -0.13], [40.71, -74.0], [37.77, -122.42], [1.35, 103.82], [35.68, 139.69], [52.52, 13.4], [25.2, 55.27], [-33.87, 151.21], [12.97, 77.59], [48.86, 2.35]];
const R = 2;
const ll = (lat: number, lon: number, r = R) => { const a = (lat * Math.PI) / 180, b = (lon * Math.PI) / 180; return new THREE.Vector3(r * Math.cos(a) * Math.sin(b), r * Math.sin(a), r * Math.cos(a) * Math.cos(b)); };

export function createContactGlobe(opts: { canvas: HTMLCanvasElement }) {
  const { canvas } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50); camera.position.set(0, 0, 8.2);
  const globe = new THREE.Group(); scene.add(globe);

  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 64, 48), new THREE.MeshBasicMaterial({ color: 0x07080f })));
  // graticule
  const seg: number[] = [];
  for (let lat = -75; lat <= 75; lat += 15) { for (let lon = 0; lon < 360; lon += 4) { const a = ll(lat, lon), b = ll(lat, lon + 4); seg.push(a.x, a.y, a.z, b.x, b.y, b.z); } }
  for (let lon = 0; lon < 360; lon += 15) { for (let lat = -90; lat < 90; lat += 4) { const a = ll(lat, lon), b = ll(lat + 4, lon); seg.push(a.x, a.y, a.z, b.x, b.y, b.z); } }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  globe.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xf3c969, transparent: true, opacity: 0.22 })));
  // atmosphere
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 48, 32), new THREE.MeshBasicMaterial({ color: 0xf3c969, transparent: true, opacity: 0.06, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(atm);

  // cities
  const dots = new THREE.Group(); globe.add(dots);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
  CITIES.forEach(([la, lo]) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), dotMat); d.position.copy(ll(la, lo, R * 1.003)); dots.add(d); });

  // arcs from Kolkata
  const K = ll(KOLKATA.lat, KOLKATA.lon);
  const ARC = 48;
  const arcs = CITIES.map(([la, lo], i) => {
    const B = ll(la, lo), mid = K.clone().add(B).multiplyScalar(0.5); const h = 1 + Math.min(0.9, K.distanceTo(B) * 0.22);
    mid.normalize().multiplyScalar(R * h);
    const curve = new THREE.QuadraticBezierCurve3(K.clone(), mid, B);
    const pts = curve.getPoints(ARC);
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.85 })); globe.add(line);
    return { line, g, off: i * 0.55 };
  });

  // pin and pulse
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })); pin.position.copy(K.clone().multiplyScalar(1.003)); globe.add(pin);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.8 }));
  beam.position.copy(K.clone().normalize().multiplyScalar(R + 0.33)); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), K.clone().normalize()); globe.add(beam);
  const pulses = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.115, 48), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); m.position.copy(K.clone().multiplyScalar(1.004)); m.lookAt(K.clone().multiplyScalar(2)); globe.add(m); return { m, i }; });

  // stars
  const SN = 260, sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) { const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), r = 14 + Math.random() * 6; sp[i * 3] = r * Math.sin(b) * Math.cos(a); sp[i * 3 + 1] = r * Math.cos(b); sp[i * 3 + 2] = r * Math.sin(b) * Math.sin(a) - 4; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xfff3c4, transparent: true, opacity: 0.6 })));

  function resize() { const w = canvas.clientWidth || 600, h = canvas.clientHeight || 600; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);
  const mouse = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => { mouse.x = (e.clientX / window.innerWidth - 0.5) * 2; mouse.y = (e.clientY / window.innerHeight - 0.5) * 2; };
  window.addEventListener('pointermove', onMove, { passive: true });

  const clock = new THREE.Clock(); let raf = 0, running = true, spin = 2.4; // starts turned away, swings round to Kolkata
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const t = clock.elapsedTime; clock.getDelta();
    spin += (0 - spin) * 0.035;
    globe.rotation.y = -(KOLKATA.lon * Math.PI) / 180 + spin + Math.sin(t * 0.3) * 0.22 + mouse.x * 0.25;
    globe.rotation.x = (KOLKATA.lat * Math.PI) / 180 * 0.9 + mouse.y * 0.12;
    atm.rotation.copy(globe.rotation);
    arcs.forEach((a) => { const k = ((t * 0.35 + a.off) % 3) / 2; const count = Math.max(0, Math.min(ARC + 1, Math.floor(Math.min(1, k) * (ARC + 1)))); a.g.setDrawRange(0, count); (a.line.material as THREE.LineBasicMaterial).opacity = k > 1 ? Math.max(0, 1 - (k - 1) * 2) * 0.85 : 0.85; });
    pulses.forEach(({ m, i }) => { const k = ((t * 0.6 + i / 3) % 1); m.scale.setScalar(1 + k * 6); (m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8; });
    renderer.render(scene, camera);
  }
  frame();
  return {
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose()); });
      renderer.dispose();
    },
  };
}
