/**
 * Stand-alone robotics lab + hologram for the About page header. Same world as the home hero's second act
 * (roboticsWorld.ts), with its own renderer, scroll-scrubbed from 0 to 1.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
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
  // Post-processing (skipped on low-power devices): selective-looking bloom on the bright cyan elements and a light depth of field
  // that keeps the hologram sharp while the far arms and floor soften.
  let composer: EffectComposer | null = null, bokeh: BokehPass | null = null, bloom: UnrealBloomPass | null = null;
  if (!lowPower) {
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bokeh = new BokehPass(scene, camera, { focus: 8, aperture: 0.00012, maxblur: 0.012 });
      composer.addPass(bokeh);
      bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.7, 0.62);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    } catch { composer = null; }
  }
  const focusP = new THREE.Vector3();
  let target = reducedMotion ? 0.45 : 0, now = target, time = 0, last = performance.now(), raf = 0, paused = false, disposed = false;
  const pT = new THREE.Vector2(), pN = new THREE.Vector2();
  function frame(dt: number) {
    time += dt;
    now += (target - now) * (1 - Math.pow(0.0025, dt)); pN.lerp(pT, 1 - Math.pow(0.01, dt));
    world.placeCamera(camera, now, pN, narrow); world.update(time, dt, now, camera, pN);
    if (composer && bokeh) {
      focusP.set(1.7, 2.2, 0); (bokeh.uniforms as unknown as { focus: { value: number } }).focus.value = camera.position.distanceTo(focusP);
      composer.render(dt);
    } else renderer.render(scene, camera);
    opts.onFrame?.({ q: now, labels: world.labels(camera, w, h, now) });
  }
  function loop(t: number) { if (disposed) return; raf = requestAnimationFrame(loop); if (paused) { last = t; return; } const dt = Math.min(0.05, (t - last) / 1000); last = t; frame(dt); }
  if (reducedMotion) frame(0.016); else raf = requestAnimationFrame(loop);
  return {
    setScroll(p) { if (!reducedMotion) target = clamp01(p); },
    setPointer(x, y) { if (!reducedMotion) pT.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))); },
    resize(nw, nh) { w = Math.max(1, nw); h = Math.max(1, nh); renderer.setSize(w, h, false); composer?.setSize(w, h); bloom?.resolution.set(w, h); world.setViewport(h); camera.aspect = w / h; narrow = w / h < 0.8; camera.fov = narrow ? 62 : 48; camera.updateProjectionMatrix(); if (reducedMotion) frame(0.016); },
    setPaused(p) { paused = p; if (!p) last = performance.now(); },
    dispose() { disposed = true; cancelAnimationFrame(raf); world.dispose(); composer?.dispose(); envTex.dispose(); pmrem.dispose(); envScene.dispose(); renderer.dispose(); },
  };
}
