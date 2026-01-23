/* eslint-disable max-lines-per-function, complexity */
import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  useGLTF,
  OrbitControls,
  useAnimations,
  Html,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import '../styles/avatar3d.css';

const DEFAULT_CONFIG = {
  skinColor: '#fce4d8',
  hairColor: '#8b5a3c',
  eyeColor: '#4a90d9',
  clothesColor: '#ffffff',
  clothesSecondaryColor: '#1a3a5c',
  blinkInterval: 3000,
  animationSpeed: 1,
  enableIdleAnimation: true,
  enableRandomBlink: true,
  enableLOD: true,
  enableShadows: true,
  showBackground: true,
  cameraPosition: [0, 0.3, 2.2],
  modelScale: 1,
};

const ANIMATIONS = ['idle', 'happy', 'wave', 'nod', 'thinking', 'surprised'];

// Enhanced Cherry blossom background scene with more detail
function CherryBlossomBackground({ showBackground }) {
  const petalRefs = useRef([]);
  const petalCount = 50;
  const treeRef = useRef();

  // Create petal positions with more variety
  const petals = useMemo(
    () =>
      Array.from({ length: petalCount }, () => ({
        position: [
          (Math.random() - 0.5) * 12,
          Math.random() * 8 + 2,
          -3 - Math.random() * 4,
        ],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        speed: 0.2 + Math.random() * 0.3,
        rotSpeed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        size: 0.02 + Math.random() * 0.02,
      })),
    []
  );

  useFrame((state) => {
    if (!showBackground) {
      return;
    }
    const t = state.clock.getElapsedTime();

    petalRefs.current.forEach((petal, i) => {
      if (petal) {
        const data = petals[i];
        // Falling motion with looping
        petal.position.y =
          ((data.position[1] - t * data.speed * 0.5 + 20) % 10) - 2;
        // Swaying motion
        petal.position.x =
          data.position[0] + Math.sin(t * 0.3 + data.phase) * 0.5;
        // Rotation
        petal.rotation.x = t * data.rotSpeed * 0.5;
        petal.rotation.z = Math.sin(t * 0.2 + data.phase) * 0.5;
      }
    });

    // Subtle tree sway
    if (treeRef.current) {
      treeRef.current.rotation.z = Math.sin(t * 0.2) * 0.01;
    }
  });

  if (!showBackground) {
    return null;
  }

  return (
    <group>
      {/* Sky gradient background - larger for fullscreen */}
      <mesh position={[0, 3, -8]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshBasicMaterial color="#6bc5e8" />
      </mesh>

      {/* Gradient overlay for sky */}
      <mesh position={[0, 0, -7.9]}>
        <planeGeometry args={[30, 20]} />
        <meshBasicMaterial color="#a8dff0" transparent opacity={0.5} />
      </mesh>

      {/* Distant cityscape silhouette */}
      <group position={[0, -2, -6]}>
        {[...Array(15)].map((_, i) => (
          <mesh key={i} position={[(i - 7) * 1.5, 0.5 + Math.random() * 1, 0]}>
            <boxGeometry
              args={[0.8 + Math.random() * 0.5, 1 + Math.random() * 2, 0.3]}
            />
            <meshStandardMaterial color="#c4d4e4" transparent opacity={0.3} />
          </mesh>
        ))}
      </group>

      {/* Bridge/fence in middle ground */}
      <group position={[0, -1.2, -3]}>
        {/* Main rail */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[15, 0.05, 0.05]} />
          <meshStandardMaterial color="#d4c8b8" />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[15, 0.05, 0.05]} />
          <meshStandardMaterial color="#d4c8b8" />
        </mesh>
        {/* Fence posts */}
        {[...Array(20)].map((_, i) => (
          <mesh key={i} position={[(i - 10) * 0.8, -0.1, 0]}>
            <boxGeometry args={[0.03, 0.35, 0.03]} />
            <meshStandardMaterial color="#c8b8a8" />
          </mesh>
        ))}
      </group>

      {/* Cherry blossom trees - left side with more detail */}
      <group ref={treeRef} position={[-4, -1.5, -5]}>
        {/* Main trunk */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.12, 0.2, 4, 12]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
        {/* Branches */}
        <mesh position={[-0.5, 3, 0]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.05, 0.08, 1.5, 8]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
        <mesh position={[0.4, 3.2, 0]} rotation={[0, 0, -0.4]}>
          <cylinderGeometry args={[0.04, 0.07, 1.2, 8]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>

        {/* Blossom clusters - multiple layers for volume */}
        {[
          { pos: [-0.8, 3.5, 0], size: 0.8 },
          { pos: [0.6, 3.8, 0.2], size: 0.7 },
          { pos: [0, 4.2, -0.2], size: 0.9 },
          { pos: [-0.4, 3, 0.3], size: 0.6 },
          { pos: [0.5, 3.3, -0.3], size: 0.55 },
          { pos: [-0.2, 4, 0.1], size: 0.75 },
          { pos: [0.3, 2.8, 0], size: 0.5 },
        ].map((cluster, i) => (
          <group key={i} position={cluster.pos}>
            <mesh>
              <sphereGeometry args={[cluster.size, 16, 16]} />
              <meshStandardMaterial color="#ffb7c5" transparent opacity={0.9} />
            </mesh>
            <mesh position={[0.1, 0.1, 0.1]}>
              <sphereGeometry args={[cluster.size * 0.7, 12, 12]} />
              <meshStandardMaterial color="#ffc8d4" transparent opacity={0.7} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Cherry blossom trees - right side */}
      <group position={[4.5, -1.5, -5.5]}>
        <mesh position={[0, 2, 0]}>
          <cylinderGeometry args={[0.15, 0.25, 5, 12]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
        <mesh position={[-0.6, 4, 0]} rotation={[0, 0, 0.6]}>
          <cylinderGeometry args={[0.06, 0.1, 2, 8]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
        <mesh position={[0.5, 4.3, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.05, 0.08, 1.5, 8]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>

        {[
          { pos: [-1, 4.5, 0], size: 0.9 },
          { pos: [0.7, 5, 0.1], size: 0.8 },
          { pos: [0, 5.5, -0.1], size: 1.0 },
          { pos: [-0.5, 3.8, 0.2], size: 0.65 },
          { pos: [0.6, 4.2, -0.2], size: 0.6 },
          { pos: [0, 4.8, 0], size: 0.85 },
          { pos: [-0.3, 5.2, 0.15], size: 0.7 },
          { pos: [0.4, 3.5, 0], size: 0.55 },
        ].map((cluster, i) => (
          <group key={i} position={cluster.pos}>
            <mesh>
              <sphereGeometry args={[cluster.size, 16, 16]} />
              <meshStandardMaterial
                color="#ffb7c5"
                transparent
                opacity={0.88}
              />
            </mesh>
            <mesh position={[-0.1, 0.1, 0.1]}>
              <sphereGeometry args={[cluster.size * 0.65, 12, 12]} />
              <meshStandardMaterial
                color="#ffd0dc"
                transparent
                opacity={0.65}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Falling petals - more of them */}
      {petals.map((petal, i) => (
        <mesh
          key={i}
          ref={(el) => (petalRefs.current[i] = el)}
          position={petal.position}
          rotation={petal.rotation}
        >
          <sphereGeometry args={[petal.size, 6, 6]} />
          <meshStandardMaterial color="#ffb7c5" transparent opacity={0.8} />
        </mesh>
      ))}

      {/* Ground with grass hint */}
      <mesh position={[0, -2, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#90b080" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// Custom hook for procedural avatar animations
function useProceduralAnimations(refs, config, isBlinking, mouthState) {
  const { groupRef, leftEyeRef, rightEyeRef, mouthRef, rightArmRef, hairRef } =
    refs;

  // Idle breathing animation
  useFrame((state) => {
    if (groupRef.current && config.enableIdleAnimation) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.015;
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.008;
    }
  });

  // Blinking animation
  useFrame(() => {
    if (leftEyeRef.current && rightEyeRef.current) {
      const scaleY = isBlinking ? 0.1 : 1;
      leftEyeRef.current.scale.y = THREE.MathUtils.lerp(
        leftEyeRef.current.scale.y,
        scaleY,
        0.3
      );
      rightEyeRef.current.scale.y = THREE.MathUtils.lerp(
        rightEyeRef.current.scale.y,
        scaleY,
        0.3
      );
    }
  });

  // Mouth animation for talking
  useFrame((state) => {
    if (mouthRef.current) {
      const t = state.clock.getElapsedTime();
      if (mouthState === 'talking') {
        mouthRef.current.scale.y = 0.8 + Math.sin(t * 15) * 0.4;
      } else {
        mouthRef.current.scale.y = THREE.MathUtils.lerp(
          mouthRef.current.scale.y,
          1,
          0.1
        );
      }
    }
  });

  // Right arm animation (touching hair pose)
  useFrame((state) => {
    if (rightArmRef.current && config.enableIdleAnimation) {
      const t = state.clock.getElapsedTime();
      rightArmRef.current.rotation.z = -0.8 + Math.sin(t * 0.5) * 0.03;
    }
  });

  // Hair sway animation
  useFrame((state) => {
    if (hairRef.current && config.enableIdleAnimation) {
      const t = state.clock.getElapsedTime();
      hairRef.current.rotation.z = Math.sin(t * 0.4) * 0.015;
    }
  });
}

// Highly detailed anime-style head
function AnimeHead({
  skinColor,
  hairColor,
  eyeColor,
  leftEyeRef,
  rightEyeRef,
  hairRef,
}) {
  const skinMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 }),
    [skinColor]
  );
  const hairMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.7 }),
    [hairColor]
  );
  const eyeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.3 }),
    [eyeColor]
  );

  // Hair highlight color
  const hairHighlight = useMemo(() => {
    const color = new THREE.Color(hairColor);
    if (typeof color.offsetHSL === 'function') {
      color.offsetHSL(0, 0, 0.2);
    }
    return color;
  }, [hairColor]);

  const hairShadow = useMemo(() => {
    const color = new THREE.Color(hairColor);
    if (typeof color.offsetHSL === 'function') {
      color.offsetHSL(0, 0, -0.15);
    }
    return color;
  }, [hairColor]);

  return (
    <group position={[0, 0.95, 0]}>
      {/* Face - anime oval shape with pointed chin */}
      <mesh material={skinMaterial}>
        <sphereGeometry args={[0.3, 32, 32]} />
      </mesh>

      {/* Chin extension for anime face shape */}
      <mesh position={[0, -0.18, 0.06]} material={skinMaterial}>
        <sphereGeometry args={[0.2, 24, 24]} />
      </mesh>

      {/* Cheeks for rounder anime look */}
      <mesh position={[-0.12, -0.05, 0.18]} material={skinMaterial}>
        <sphereGeometry args={[0.12, 16, 16]} />
      </mesh>
      <mesh position={[0.12, -0.05, 0.18]} material={skinMaterial}>
        <sphereGeometry args={[0.12, 16, 16]} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.28, 0, 0]} material={skinMaterial}>
        <sphereGeometry args={[0.05, 12, 12]} />
      </mesh>
      <mesh position={[0.28, 0, 0]} material={skinMaterial}>
        <sphereGeometry args={[0.05, 12, 12]} />
      </mesh>

      {/* Hair group */}
      <group ref={hairRef}>
        {/* Hair back - main volume */}
        <mesh position={[0, 0.05, -0.1]} material={hairMaterial}>
          <sphereGeometry args={[0.35, 32, 32]} />
        </mesh>

        {/* Long flowing hair - back strands */}
        <group>
          {/* Left hair strand */}
          <mesh position={[-0.22, -0.35, -0.05]}>
            <capsuleGeometry args={[0.09, 0.7, 12, 20]} />
            <meshStandardMaterial color={hairColor} roughness={0.7} />
          </mesh>
          <mesh position={[-0.28, -0.8, -0.05]}>
            <capsuleGeometry args={[0.07, 0.5, 10, 16]} />
            <meshStandardMaterial color={hairShadow} roughness={0.7} />
          </mesh>

          {/* Right hair strand */}
          <mesh position={[0.22, -0.35, -0.05]}>
            <capsuleGeometry args={[0.09, 0.7, 12, 20]} />
            <meshStandardMaterial color={hairColor} roughness={0.7} />
          </mesh>
          <mesh position={[0.28, -0.8, -0.05]}>
            <capsuleGeometry args={[0.07, 0.5, 10, 16]} />
            <meshStandardMaterial color={hairShadow} roughness={0.7} />
          </mesh>

          {/* Center back hair */}
          <mesh position={[0, -0.45, -0.12]}>
            <capsuleGeometry args={[0.14, 0.8, 12, 20]} />
            <meshStandardMaterial color={hairColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.9, -0.12]}>
            <capsuleGeometry args={[0.1, 0.5, 10, 16]} />
            <meshStandardMaterial color={hairShadow} roughness={0.7} />
          </mesh>
        </group>

        {/* Bangs - more detailed */}
        <mesh position={[0, 0.18, 0.2]} material={hairMaterial}>
          <boxGeometry args={[0.5, 0.18, 0.14]} />
        </mesh>

        {/* Side bangs with taper */}
        <mesh position={[-0.24, 0.08, 0.14]} rotation={[0, 0.3, 0.1]}>
          <boxGeometry args={[0.1, 0.3, 0.12]} />
          <meshStandardMaterial color={hairColor} roughness={0.7} />
        </mesh>
        <mesh position={[0.24, 0.08, 0.14]} rotation={[0, -0.3, -0.1]}>
          <boxGeometry args={[0.1, 0.3, 0.12]} />
          <meshStandardMaterial color={hairColor} roughness={0.7} />
        </mesh>

        {/* Bang strands for detail */}
        <mesh position={[-0.1, 0.15, 0.23]} rotation={[0, 0, 0.05]}>
          <boxGeometry args={[0.06, 0.15, 0.04]} />
          <meshStandardMaterial color={hairShadow} roughness={0.7} />
        </mesh>
        <mesh position={[0.1, 0.15, 0.23]} rotation={[0, 0, -0.05]}>
          <boxGeometry args={[0.06, 0.15, 0.04]} />
          <meshStandardMaterial color={hairShadow} roughness={0.7} />
        </mesh>

        {/* Hair highlight streaks */}
        <mesh position={[-0.12, 0.2, 0.22]}>
          <boxGeometry args={[0.025, 0.14, 0.025]} />
          <meshStandardMaterial color={hairHighlight} roughness={0.5} />
        </mesh>
        <mesh position={[0.1, 0.19, 0.22]}>
          <boxGeometry args={[0.02, 0.12, 0.02]} />
          <meshStandardMaterial color={hairHighlight} roughness={0.5} />
        </mesh>

        {/* Extra hair volume top */}
        <mesh position={[0, 0.28, 0]}>
          <sphereGeometry args={[0.28, 24, 24]} />
          <meshStandardMaterial color={hairColor} roughness={0.7} />
        </mesh>

        {/* Ahoge (hair antenna) */}
        <mesh position={[0, 0.42, 0.05]} rotation={[0.4, 0, 0.15]}>
          <coneGeometry args={[0.025, 0.18, 10]} />
          <meshStandardMaterial color={hairColor} roughness={0.6} />
        </mesh>
      </group>

      {/* Eyes group - larger anime style */}
      <group position={[0, 0.02, 0.22]}>
        {/* Left eye */}
        <group position={[-0.1, 0, 0]}>
          {/* Eye white */}
          <mesh>
            <sphereGeometry args={[0.06, 20, 20]} />
            <meshStandardMaterial color="white" roughness={0.2} />
          </mesh>
          {/* Iris */}
          <mesh
            ref={leftEyeRef}
            position={[0, 0, 0.035]}
            material={eyeMaterial}
          >
            <sphereGeometry args={[0.045, 20, 20]} />
          </mesh>
          {/* Pupil */}
          <mesh position={[0, 0, 0.055]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.2} />
          </mesh>
          {/* Main eye highlight */}
          <mesh position={[0.02, 0.02, 0.065]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial
              color="white"
              emissive="white"
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Secondary highlight */}
          <mesh position={[-0.015, -0.015, 0.06]}>
            <sphereGeometry args={[0.006, 6, 6]} />
            <meshStandardMaterial
              color="white"
              emissive="white"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>

        {/* Right eye */}
        <group position={[0.1, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.06, 20, 20]} />
            <meshStandardMaterial color="white" roughness={0.2} />
          </mesh>
          <mesh
            ref={rightEyeRef}
            position={[0, 0, 0.035]}
            material={eyeMaterial}
          >
            <sphereGeometry args={[0.045, 20, 20]} />
          </mesh>
          <mesh position={[0, 0, 0.055]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.2} />
          </mesh>
          <mesh position={[-0.02, 0.02, 0.065]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial
              color="white"
              emissive="white"
              emissiveIntensity={0.3}
            />
          </mesh>
          <mesh position={[0.015, -0.015, 0.06]}>
            <sphereGeometry args={[0.006, 6, 6]} />
            <meshStandardMaterial
              color="white"
              emissive="white"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      </group>

      {/* Eyebrows */}
      <mesh position={[-0.1, 0.12, 0.24]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.07, 0.018, 0.012]} />
        <meshStandardMaterial color={hairColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.1, 0.12, 0.24]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.07, 0.018, 0.012]} />
        <meshStandardMaterial color={hairColor} roughness={0.8} />
      </mesh>

      {/* Nose - subtle */}
      <mesh position={[0, -0.06, 0.28]}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Blush */}
      <mesh position={[-0.16, -0.06, 0.22]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial
          color="#ffb6c1"
          transparent
          opacity={0.35}
          roughness={0.8}
        />
      </mesh>
      <mesh position={[0.16, -0.06, 0.22]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial
          color="#ffb6c1"
          transparent
          opacity={0.35}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}

// Anime mouth component
function AnimeMouth({ mouthRef, skinColor: _skinColor }) {
  return (
    <group position={[0, 0.78, 0.24]}>
      <mesh ref={mouthRef}>
        <boxGeometry args={[0.055, 0.022, 0.012]} />
        <meshStandardMaterial color="#cc6666" roughness={0.5} />
      </mesh>
    </group>
  );
}

// Detailed Sailor uniform body
function SailorUniformBody({
  skinColor,
  clothesColor,
  clothesSecondaryColor,
  rightArmRef,
}) {
  const skinMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 }),
    [skinColor]
  );
  const whiteMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.5 }),
    [clothesColor]
  );
  const navyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: clothesSecondaryColor,
        roughness: 0.6,
      }),
    [clothesSecondaryColor]
  );

  return (
    <group position={[0, 0.2, 0]}>
      {/* Neck */}
      <mesh position={[0, 0.38, 0]} material={skinMaterial}>
        <cylinderGeometry args={[0.065, 0.075, 0.18, 20]} />
      </mesh>

      {/* Torso - white sailor top */}
      <mesh position={[0, 0.1, 0]} material={whiteMaterial}>
        <capsuleGeometry args={[0.2, 0.28, 12, 20]} />
      </mesh>

      {/* Sailor collar - back */}
      <mesh position={[0, 0.28, -0.06]} material={navyMaterial}>
        <boxGeometry args={[0.45, 0.18, 0.12]} />
      </mesh>

      {/* Collar V-shape front pieces */}
      <mesh
        position={[-0.12, 0.22, 0.14]}
        rotation={[0, 0.45, 0]}
        material={navyMaterial}
      >
        <boxGeometry args={[0.18, 0.14, 0.025]} />
      </mesh>
      <mesh
        position={[0.12, 0.22, 0.14]}
        rotation={[0, -0.45, 0]}
        material={navyMaterial}
      >
        <boxGeometry args={[0.18, 0.14, 0.025]} />
      </mesh>

      {/* White collar stripes */}
      <mesh position={[0, 0.28, -0.02]}>
        <boxGeometry args={[0.42, 0.025, 0.1]} />
        <meshStandardMaterial color={clothesColor} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.255, -0.02]}>
        <boxGeometry args={[0.42, 0.02, 0.1]} />
        <meshStandardMaterial color={clothesColor} roughness={0.5} />
      </mesh>

      {/* Red bow */}
      <group position={[0, 0.18, 0.17]}>
        {/* Bow loops */}
        <mesh position={[-0.045, 0, 0]} rotation={[0, 0, 0.35]}>
          <boxGeometry args={[0.07, 0.035, 0.025]} />
          <meshStandardMaterial color="#cc3333" roughness={0.4} />
        </mesh>
        <mesh position={[0.045, 0, 0]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.07, 0.035, 0.025]} />
          <meshStandardMaterial color="#cc3333" roughness={0.4} />
        </mesh>
        {/* Bow center knot */}
        <mesh>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshStandardMaterial color="#dd4444" roughness={0.4} />
        </mesh>
        {/* Bow tail */}
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.035, 0.15, 0.015]} />
          <meshStandardMaterial color="#cc3333" roughness={0.4} />
        </mesh>
      </group>

      {/* Skirt */}
      <mesh position={[0, -0.18, 0]} material={navyMaterial}>
        <cylinderGeometry args={[0.17, 0.28, 0.3, 20]} />
      </mesh>

      {/* Arms */}
      {/* Left arm - down pose */}
      <group position={[-0.28, 0.12, 0]} rotation={[0, 0, 0.25]}>
        {/* Upper arm with sleeve */}
        <mesh material={whiteMaterial}>
          <capsuleGeometry args={[0.045, 0.22, 10, 18]} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.2, 0]} material={skinMaterial}>
          <sphereGeometry args={[0.04, 12, 12]} />
        </mesh>
      </group>

      {/* Right arm - raised touching hair */}
      <group
        ref={rightArmRef}
        position={[0.28, 0.18, 0]}
        rotation={[0.35, 0, -0.85]}
      >
        <mesh material={whiteMaterial}>
          <capsuleGeometry args={[0.045, 0.25, 10, 18]} />
        </mesh>
        {/* Hand near hair */}
        <mesh position={[0, 0.2, 0]} material={skinMaterial}>
          <sphereGeometry args={[0.04, 12, 12]} />
        </mesh>
      </group>

      {/* Bag strap */}
      <mesh position={[0.22, 0.12, 0.1]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.025, 0.35, 0.015]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Procedural anime avatar
function ProceduralAnimeAvatar({ config, isBlinking, mouthState }) {
  const groupRef = useRef();
  const leftEyeRef = useRef();
  const rightEyeRef = useRef();
  const mouthRef = useRef();
  const rightArmRef = useRef();
  const hairRef = useRef();

  useProceduralAnimations(
    { groupRef, leftEyeRef, rightEyeRef, mouthRef, rightArmRef, hairRef },
    config,
    isBlinking,
    mouthState
  );

  return (
    <group ref={groupRef} scale={config.modelScale} position={[0, -0.4, 0]}>
      <AnimeHead
        skinColor={config.skinColor}
        hairColor={config.hairColor}
        eyeColor={config.eyeColor}
        leftEyeRef={leftEyeRef}
        rightEyeRef={rightEyeRef}
        hairRef={hairRef}
      />
      <AnimeMouth mouthRef={mouthRef} skinColor={config.skinColor} />
      <SailorUniformBody
        skinColor={config.skinColor}
        clothesColor={config.clothesColor}
        clothesSecondaryColor={config.clothesSecondaryColor}
        rightArmRef={rightArmRef}
      />
    </group>
  );
}

// Helper to apply color to mesh based on naming conventions
function applyMaterialColor(child, config) {
  const materialName = child.material?.name?.toLowerCase() || '';
  const meshName = child.name?.toLowerCase() || '';

  if (
    materialName.includes('skin') ||
    meshName.includes('skin') ||
    meshName.includes('face') ||
    meshName.includes('head')
  ) {
    child.material.color = new THREE.Color(config.skinColor);
  } else if (materialName.includes('hair') || meshName.includes('hair')) {
    child.material.color = new THREE.Color(config.hairColor);
  } else if (
    materialName.includes('eye') ||
    meshName.includes('eye') ||
    meshName.includes('iris')
  ) {
    child.material.color = new THREE.Color(config.eyeColor);
  } else if (
    materialName.includes('cloth') ||
    materialName.includes('shirt') ||
    materialName.includes('dress') ||
    meshName.includes('body') ||
    meshName.includes('torso')
  ) {
    child.material.color = new THREE.Color(config.clothesColor);
  }
}

// GLB/GLTF model avatar with skeleton animation support
function ModelAvatar({
  modelUrl,
  config,
  currentAnimation,
  isBlinking,
  mouthState,
  onLoadError,
}) {
  const group = useRef();
  const { scene, animations } = useGLTF(modelUrl, true, true, (error) => {
    console.error('Error loading model:', error);
    if (onLoadError) {
      onLoadError(error);
    }
  });

  const { actions } = useAnimations(animations, group);
  const [morphTargets, setMorphTargets] = useState({});

  const clonedScene = useMemo(() => {
    const clone = scene.clone();

    clone.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          child.material = child.material.clone();
        }
        applyMaterialColor(child, config);

        if (child.morphTargetInfluences && child.morphTargetDictionary) {
          setMorphTargets((prev) => ({
            ...prev,
            [child.name]: {
              mesh: child,
              dictionary: child.morphTargetDictionary,
              influences: child.morphTargetInfluences,
            },
          }));
        }

        if (config.enableShadows) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      }
    });

    return clone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scene,
    config.skinColor,
    config.hairColor,
    config.eyeColor,
    config.clothesColor,
    config.enableShadows,
  ]);

  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) {
      return;
    }

    const animName = Object.keys(actions).find((name) =>
      name.toLowerCase().includes(currentAnimation.toLowerCase())
    );

    if (animName && actions[animName]) {
      Object.values(actions).forEach((action) => {
        if (action !== actions[animName]) {
          action.fadeOut(0.3);
        }
      });
      actions[animName]
        .reset()
        .setEffectiveTimeScale(config.animationSpeed)
        .fadeIn(0.3)
        .play();
    } else if (actions.idle) {
      actions.idle
        .reset()
        .setEffectiveTimeScale(config.animationSpeed)
        .fadeIn(0.3)
        .play();
    }
  }, [currentAnimation, actions, config.animationSpeed]);

  useFrame(() => {
    Object.values(morphTargets).forEach(({ mesh, dictionary }) => {
      const blinkNames = ['blink', 'eyeclose', 'eye_close', 'eyesclosed'];
      blinkNames.forEach((blinkName) => {
        if (dictionary[blinkName] !== undefined) {
          const targetValue = isBlinking ? 1 : 0;
          mesh.morphTargetInfluences[dictionary[blinkName]] =
            THREE.MathUtils.lerp(
              mesh.morphTargetInfluences[dictionary[blinkName]],
              targetValue,
              0.3
            );
        }
      });

      const mouthNames = ['mouth_open', 'mouthopen', 'jaw_open', 'viseme_aa'];
      mouthNames.forEach((mouthName) => {
        if (dictionary[mouthName] !== undefined) {
          const targetValue =
            mouthState === 'talking' ? 0.3 + Math.random() * 0.4 : 0;
          mesh.morphTargetInfluences[dictionary[mouthName]] =
            THREE.MathUtils.lerp(
              mesh.morphTargetInfluences[dictionary[mouthName]],
              targetValue,
              0.2
            );
        }
      });
    });
  });

  return (
    <group ref={group} scale={config.modelScale}>
      <primitive object={clonedScene} />
    </group>
  );
}

// LOD (Level of Detail) wrapper
function LODWrapper({ children, config }) {
  const { camera } = useThree();
  const groupRef = useRef();

  useFrame(() => {
    if (!config.enableLOD || !groupRef.current) {
      return;
    }
    camera.position.distanceTo(groupRef.current.position);
  });

  return <group ref={groupRef}>{children}</group>;
}

// Loading indicator
function LoadingIndicator() {
  return (
    <Html center>
      <div className="avatar3d-loading">
        <div className="avatar3d-spinner"></div>
        <p>Loading avatar...</p>
      </div>
    </Html>
  );
}

// Scene setup with enhanced lighting
function Scene({ children, config }) {
  return (
    <>
      {/* Ambient light for general illumination */}
      <ambientLight intensity={0.5} />

      {/* Main key light */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.9}
        castShadow={config.enableShadows}
        shadow-mapSize={[2048, 2048]}
      />

      {/* Fill light from the left */}
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />

      {/* Rim light from behind */}
      <directionalLight position={[0, 5, -3]} intensity={0.4} />

      {/* Front soft light for face */}
      <directionalLight position={[0, 2, 4]} intensity={0.35} />

      <CherryBlossomBackground showBackground={config.showBackground} />
      {children}
    </>
  );
}

// Main Avatar3D component
export function Avatar3D({
  config = {},
  isTalking = false,
  currentAnimation = 'idle',
  modelUrl = null,
}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthState, setMouthState] = useState('normal');
  const [modelError, setModelError] = useState(null);

  useEffect(() => {
    if (!mergedConfig.enableRandomBlink) {
      return;
    }

    const scheduleNextBlink = () => {
      const variance = Math.random() * 2000 - 1000;
      const interval = mergedConfig.blinkInterval + variance;

      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        scheduleNextBlink();
      }, interval);
    };

    const timeoutId = scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, [mergedConfig.blinkInterval, mergedConfig.enableRandomBlink]);

  useEffect(() => {
    setMouthState(isTalking ? 'talking' : 'normal');
  }, [isTalking]);

  const handleModelError = (error) => {
    console.error('Failed to load 3D model:', error);
    setModelError(error);
  };

  return (
    <div className="avatar3d-container">
      <Canvas
        shadows={mergedConfig.enableShadows}
        camera={{
          position: mergedConfig.cameraPosition,
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene config={mergedConfig}>
          <Suspense fallback={<LoadingIndicator />}>
            <LODWrapper config={mergedConfig}>
              {modelUrl && !modelError ? (
                <ModelAvatar
                  modelUrl={modelUrl}
                  config={mergedConfig}
                  currentAnimation={currentAnimation}
                  isBlinking={isBlinking}
                  mouthState={mouthState}
                  onLoadError={handleModelError}
                />
              ) : (
                <ProceduralAnimeAvatar
                  config={mergedConfig}
                  isBlinking={isBlinking}
                  mouthState={mouthState}
                />
              )}
            </LODWrapper>
          </Suspense>
        </Scene>
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={1.2}
          maxDistance={8}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0.4, 0]}
        />
        <PerspectiveCamera makeDefault position={mergedConfig.cameraPosition} />
      </Canvas>
    </div>
  );
}

Avatar3D.ANIMATIONS = ANIMATIONS;
Avatar3D.DEFAULT_CONFIG = DEFAULT_CONFIG;

export default Avatar3D;
