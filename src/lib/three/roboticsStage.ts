/**
 * Stand-alone robotics lab + hologram for the About page header. Same world as the home hero's second act
 * (roboticsWorld.ts), with its own renderer, scroll-scrubbed from 0 to 1.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildRoboticsWorld, type HologramSource, type RoboticsWorld } from './roboticsWorld';

export interface StageLabel { id: string; text: string; x: number; y: number; o: number }
export interface RoboticsStageOptions {
  lowPower: boolean; reducedMotion: boolean; holo?: HologramSource;
  onFrame?: (info: { q: number; labels: StageLabel[] }) => void;
}
export interface RoboticsStageController {
  setScroll(p: number): void; setPointer(x: number, y: number): void; resize(w: number, h: number): void; setPaused(p: boolean): void; dispose(): void;
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function createRoboticsStage(canvas: HTMLCanvasElement, opts: RoboticsStageOptions): RoboticsStageController {
  const { lowPower, reducedMotion } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x03060a);
  scene.fog = new THREE.FogExp2(0x03060a, lowPower ? 0.035 : 0.02);
  const pmrem = new THREE.PMREMGenerator(renderer); const envScene = new RoomEnvironment(); const envTex = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = envTex; scene.environmentIntensity = 0.6;
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
  let narrow = false, w = 1, h = 1;
  let world: RoboticsWorld = buildRoboticsWorld({ lowPower, holo: opts.holo, onTexturesReady: () => { if (reducedMotion) frame(0); } });
  scene.add(world.group);
  if (reducedMotion) world.setStill();
  let target = reducedMotion ? 0.45 : 0, now = target, time = 0, last = performance.now(), raf = 0, paused = false, disposed = false;
  const pT = new THREE.Vector2(), pN = new THREE.Vector2();
  function frame(dt: number) {
    time += dt;
    now += (target - now) * (1 - Math.pow(0.0025, dt)); pN.lerp(pT, 1 - Math.pow(0.01, dt));
    world.placeCamera(camera, now, pN, narrow); world.update(time, dt, now, camera, pN);
    renderer.render(scene, camera);
    opts.onFrame?.({ q: now, labels: world.labels(camera, w, h, now) });
  }
  function loop(t: number) { if (disposed) return; raf = requestAnimationFrame(loop); if (paused) { last = t; return; } const dt = Math.min(0.05, (t - last) / 1000); last = t; frame(dt); }
  if (reducedMotion) frame(0.016); else raf = requestAnimationFrame(loop);
  return {
    setScroll(p) { if (!reducedMotion) target = clamp01(p); },
    setPointer(x, y) { if (!reducedMotion) pT.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))); },
    resize(nw, nh) { w = Math.max(1, nw); h = Math.max(1, nh); renderer.setSize(w, h, false); camera.aspect = w / h; narrow = w / h < 0.8; camera.fov = narrow ? 62 : 48; camera.updateProjectionMatrix(); if (reducedMotion) frame(0.016); },
    setPaused(p) { paused = p; if (!p) last = performance.now(); },
    dispose() { disposed = true; cancelAnimationFrame(raf); world.dispose(); envTex.dispose(); pmrem.dispose(); envScene.dispose(); renderer.dispose(); },
  };
}
