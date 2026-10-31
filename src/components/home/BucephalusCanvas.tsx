'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function BucephalusCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 600;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08090c, 0.045);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.5);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Group for entire imperial monument
    const monumentGroup = new THREE.Group();
    scene.add(monumentGroup);

    // 1. Materials: Imperial Bronze & Antique Gold
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: false,
    });

    const bronzeMaterial = new THREE.MeshStandardMaterial({
      color: 0x8c6834,
      metalness: 0.75,
      roughness: 0.4,
    });

    const darkMarbleMaterial = new THREE.MeshStandardMaterial({
      color: 0x141820,
      metalness: 0.2,
      roughness: 0.6,
    });

    // 2. Bucephalus Monumental Sculpture (Stylized Architectural Equine Bust)
    // Pedestal Plinth (Stepped ancient Macedonian plinth)
    const base1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 2.2), darkMarbleMaterial);
    base1.position.y = -1.6;
    monumentGroup.add(base1);

    const base2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 1.8), bronzeMaterial);
    base2.position.y = -1.4;
    monumentGroup.add(base2);

    const base3 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.8, 16), darkMarbleMaterial);
    base3.position.y = -0.9;
    monumentGroup.add(base3);

    // Architectural Bronze Ring
    const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.04, 16, 48), goldMaterial);
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = -0.55;
    monumentGroup.add(goldRing);

    // Bucephalus Warhorse Bust - Procedural Imperial Geometric Construction
    const horseGroup = new THREE.Group();
    horseGroup.position.y = 0.2;

    // Muscular arched chest / neck
    const chestGeo = new THREE.CylinderGeometry(0.38, 0.58, 1.4, 8);
    const chest = new THREE.Mesh(chestGeo, bronzeMaterial);
    chest.rotation.z = -0.35;
    chest.position.set(-0.25, -0.1, 0);
    horseGroup.add(chest);

    // Head (Cranium & Muzzle)
    const headGeo = new THREE.ConeGeometry(0.32, 1.1, 7);
    const head = new THREE.Mesh(headGeo, goldMaterial);
    head.rotation.z = 1.15;
    head.rotation.x = 0.05;
    head.position.set(0.35, 0.55, 0);
    horseGroup.add(head);

    // Forehead crest (Alexander's Macedonian star crown / brow armor)
    const browGeo = new THREE.BoxGeometry(0.3, 0.12, 0.45);
    const brow = new THREE.Mesh(browGeo, goldMaterial);
    brow.position.set(0.25, 0.8, 0);
    horseGroup.add(brow);

    // Alert Warhorse Ears
    const earGeo = new THREE.ConeGeometry(0.08, 0.35, 4);
    const leftEar = new THREE.Mesh(earGeo, goldMaterial);
    leftEar.position.set(0.05, 1.1, 0.15);
    leftEar.rotation.z = -0.2;
    leftEar.rotation.x = 0.2;
    horseGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, goldMaterial);
    rightEar.position.set(0.05, 1.1, -0.15);
    rightEar.rotation.z = -0.2;
    rightEar.rotation.x = -0.2;
    horseGroup.add(rightEar);

    // Dynamic Flowing Mane (Macedonian charging mane)
    for (let i = 0; i < 6; i++) {
      const maneFeather = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.35, 0.18),
        goldMaterial
      );
      maneFeather.position.set(-0.25 - i * 0.07, 0.7 - i * 0.18, 0);
      maneFeather.rotation.z = -0.6 - i * 0.1;
      horseGroup.add(maneFeather);
    }

    monumentGroup.add(horseGroup);

    // 3. Background Colonnade (Silhouette Macedonian architectural columns)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x0f1218,
      roughness: 0.8,
      metalness: 0.1,
    });

    const pillarsGroup = new THREE.Group();
    for (let x = -4; x <= 4; x += 2.6) {
      if (Math.abs(x) < 1.5) continue; // Leave center open
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 6, 12), pillarMat);
      column.position.set(x, 0.5, -3.2);
      pillarsGroup.add(column);
    }
    scene.add(pillarsGroup);

    // 4. Atmospheric Celestial Particles / Golden Embers
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 12;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      particleSpeeds[i] = 0.005 + Math.random() * 0.01;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xd4af37,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Lighting Setup (Cinematic key, fill, rim)
    const ambientLight = new THREE.AmbientLight(0xfff4d6, 0.4);
    scene.add(ambientLight);

    const keyGoldLight = new THREE.DirectionalLight(0xffe28a, 2.2);
    keyGoldLight.position.set(4, 5, 4);
    scene.add(keyGoldLight);

    const rimBlueBronzeLight = new THREE.PointLight(0x7393b3, 1.8, 12);
    rimBlueBronzeLight.position.set(-4, 2, -3);
    scene.add(rimBlueBronzeLight);

    const warmUnderGlow = new THREE.PointLight(0xd4af37, 1.5, 6);
    warmUnderGlow.position.set(0, -1.8, 1.5);
    scene.add(warmUnderGlow);

    // 6. Interactive Mouse & Parallax Controller
    const targetRotation = { x: 0, y: 0 };
    const currentRotation = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetRotation.y = x * 0.6;
      targetRotation.x = y * 0.3;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    setIsLoaded(true);

    // 7. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth damped rotation tracking
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.05;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05;

      // Subtle monumental breathing motion
      monumentGroup.rotation.y = currentRotation.y + Math.sin(elapsedTime * 0.5) * 0.06;
      monumentGroup.rotation.x = currentRotation.x + Math.sin(elapsedTime * 0.8) * 0.02;
      monumentGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.04;

      // Animate celestial particles upward
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += particleSpeeds[i];
        if (positions[i * 3 + 1] > 4) {
          positions[i * 3 + 1] = -4;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      renderer.dispose();
      particleGeo.dispose();
      goldMaterial.dispose();
      bronzeMaterial.dispose();
      darkMarbleMaterial.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[480px] sm:h-[560px] lg:h-[640px] flex items-center justify-center overflow-hidden">
      {/* Three.js WebGL Container */}
      {hasWebGL ? (
        <div
          ref={mountRef}
          className={`w-full h-full cursor-grab active:cursor-grabbing transition-opacity duration-1000 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        /* Lightweight Fallback for unsupported devices */
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-imperial-900 to-imperial-950 border border-gold-500/20 rounded-lg">
          <div className="w-32 h-32 rounded-full border-2 border-gold-400/40 flex items-center justify-center bg-gold-500/10 mb-4 shadow-imperial-gold">
            <span className="font-serif text-5xl font-black text-gold-300">Β</span>
          </div>
          <h3 className="font-serif text-xl font-bold text-white mb-2">BUCEPHALUS CITADEL</h3>
          <p className="text-xs text-neutral-400 max-w-sm font-mono">
            Monumental forward exploration • Alexander’s warhorse emblem • Imperial engineering architecture
          </p>
        </div>
      )}

      {/* Atmospheric ambient vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#08090c] via-transparent to-[#08090c]/80" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#08090c] via-transparent to-[#08090c]" />

      {/* Interactive 3D Hint pill */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-none flex items-center space-x-2 px-3 py-1 rounded-full bg-imperial-900/80 border border-gold-500/30 text-[10px] font-mono text-gold-300/90 shadow-lg backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-ping" />
        <span>Bucephalus Monument • Interactive Parallax Canvas</span>
      </div>
    </div>
  );
}
