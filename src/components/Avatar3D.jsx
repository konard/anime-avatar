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
  skinColor: '#fad5c5',
  hairColor: '#b07850',
  eyeColor: '#4a90c2',
  clothesColor: '#ffffff',
  clothesSecondaryColor: '#1a3a5c',
  blinkInterval: 3000,
  animationSpeed: 1,
  enableIdleAnimation: true,
  enableRandomBlink: true,
  enableLOD: true,
  enableShadows: true,
  showBackground: true,
  cameraPosition: [0, 0.5, 2.5],
  modelScale: 1,
};

const ANIMATIONS = ['idle', 'happy', 'wave', 'nod', 'thinking', 'surprised'];

// Cherry blossom background scene
function CherryBlossomBackground({ showBackground }) {
  const petalRefs = useRef([]);
  const petalCount = 30;

  // Create petal positions
  const petals = useMemo(
    () =>
      Array.from({ length: petalCount }, () => ({
        position: [
          (Math.random() - 0.5) * 10,
          Math.random() * 6 + 2,
          -2 - Math.random() * 3,
        ],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        speed: 0.3 + Math.random() * 0.3,
        rotSpeed: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
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
        // Falling motion
        petal.position.y = ((data.position[1] - t * data.speed * 0.3) % 8) + 2;
        // Swaying motion
        petal.position.x =
          data.position[0] + Math.sin(t * 0.5 + data.phase) * 0.3;
        // Rotation
        petal.rotation.x = t * data.rotSpeed;
        petal.rotation.z = Math.sin(t * 0.3 + data.phase) * 0.3;
      }
    });
  });

  if (!showBackground) {
    return null;
  }

  return (
    <group>
      {/* Sky gradient background plane */}
      <mesh position={[0, 2, -6]} receiveShadow>
        <planeGeometry args={[20, 12]} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>

      {/* Cherry blossom trees - stylized */}
      <group position={[-3, 0, -4]}>
        {/* Tree trunk */}
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 3, 8]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
        {/* Blossom clusters */}
        {[
          [-0.5, 2.5, 0],
          [0.5, 2.8, 0.2],
          [0, 3.2, -0.2],
          [-0.3, 2.2, 0.3],
          [0.4, 2.4, -0.3],
        ].map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.6 + i * 0.1, 16, 16]} />
            <meshStandardMaterial color="#ffb7c5" transparent opacity={0.9} />
          </mesh>
        ))}
      </group>

      {/* Right tree */}
      <group position={[3.5, 0, -4.5]}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.12, 0.18, 4, 8]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
        {[
          [-0.4, 3, 0],
          [0.4, 3.3, 0.1],
          [0, 3.7, -0.1],
          [-0.2, 2.6, 0.2],
          [0.3, 2.9, -0.2],
          [0, 4, 0],
        ].map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.5 + i * 0.08, 16, 16]} />
            <meshStandardMaterial color="#ffc0cb" transparent opacity={0.85} />
          </mesh>
        ))}
      </group>

      {/* Falling petals */}
      {petals.map((petal, i) => (
        <mesh
          key={i}
          ref={(el) => (petalRefs.current[i] = el)}
          position={petal.position}
          rotation={petal.rotation}
        >
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#ffb7c5" transparent opacity={0.8} />
        </mesh>
      ))}

      {/* Ground hint */}
      <mesh position={[0, -1.5, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15, 8]} />
        <meshStandardMaterial color="#90b080" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// Custom hook for procedural avatar animations
function useProceduralAnimations(refs, config, isBlinking, mouthState) {
  const { groupRef, leftEyeRef, rightEyeRef, mouthRef, rightArmRef } = refs;

  useFrame((state) => {
    if (groupRef.current && config.enableIdleAnimation) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.01;
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.01;
    }
  });

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
      rightArmRef.current.rotation.z = -0.8 + Math.sin(t * 0.5) * 0.05;
    }
  });
}

// Anime-style head with detailed features
function AnimeHead({
  skinColor,
  hairColor,
  eyeColor,
  leftEyeRef,
  rightEyeRef,
  isBlinking: _isBlinking,
}) {
  const skinMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: skinColor }),
    [skinColor]
  );
  const hairMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: hairColor }),
    [hairColor]
  );
  const eyeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: eyeColor }),
    [eyeColor]
  );

  // Hair highlight color
  const hairHighlight = useMemo(() => {
    const color = new THREE.Color(hairColor);
    // Check if offsetHSL exists (might not in test environments)
    if (typeof color.offsetHSL === 'function') {
      color.offsetHSL(0, 0, 0.15);
    }
    return color;
  }, [hairColor]);

  return (
    <group position={[0, 0.9, 0]}>
      {/* Face - slightly oval anime style */}
      <mesh material={skinMaterial}>
        <sphereGeometry args={[0.28, 32, 32]} />
      </mesh>

      {/* Chin extension for anime face shape */}
      <mesh position={[0, -0.15, 0.05]} material={skinMaterial}>
        <sphereGeometry args={[0.18, 16, 16]} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.26, 0, 0]} material={skinMaterial}>
        <sphereGeometry args={[0.05, 8, 8]} />
      </mesh>
      <mesh position={[0.26, 0, 0]} material={skinMaterial}>
        <sphereGeometry args={[0.05, 8, 8]} />
      </mesh>

      {/* Hair back */}
      <mesh position={[0, 0.05, -0.08]} material={hairMaterial}>
        <sphereGeometry args={[0.32, 32, 32]} />
      </mesh>

      {/* Long hair - back strands */}
      <group>
        {/* Left hair strand */}
        <mesh position={[-0.2, -0.3, -0.05]} material={hairMaterial}>
          <capsuleGeometry args={[0.08, 0.6, 8, 16]} />
        </mesh>
        <mesh position={[-0.25, -0.7, -0.05]} material={hairMaterial}>
          <capsuleGeometry args={[0.06, 0.4, 8, 16]} />
        </mesh>

        {/* Right hair strand */}
        <mesh position={[0.2, -0.3, -0.05]} material={hairMaterial}>
          <capsuleGeometry args={[0.08, 0.6, 8, 16]} />
        </mesh>
        <mesh position={[0.25, -0.7, -0.05]} material={hairMaterial}>
          <capsuleGeometry args={[0.06, 0.4, 8, 16]} />
        </mesh>

        {/* Center back hair */}
        <mesh position={[0, -0.4, -0.1]} material={hairMaterial}>
          <capsuleGeometry args={[0.12, 0.7, 8, 16]} />
        </mesh>
      </group>

      {/* Bangs */}
      <mesh position={[0, 0.15, 0.18]} material={hairMaterial}>
        <boxGeometry args={[0.45, 0.15, 0.12]} />
      </mesh>

      {/* Side bangs */}
      <mesh
        position={[-0.22, 0.05, 0.12]}
        rotation={[0, 0.3, 0]}
        material={hairMaterial}
      >
        <boxGeometry args={[0.08, 0.25, 0.1]} />
      </mesh>
      <mesh
        position={[0.22, 0.05, 0.12]}
        rotation={[0, -0.3, 0]}
        material={hairMaterial}
      >
        <boxGeometry args={[0.08, 0.25, 0.1]} />
      </mesh>

      {/* Hair highlight streaks */}
      <mesh position={[-0.1, 0.18, 0.2]}>
        <boxGeometry args={[0.02, 0.12, 0.02]} />
        <meshStandardMaterial color={hairHighlight} />
      </mesh>
      <mesh position={[0.08, 0.17, 0.2]}>
        <boxGeometry args={[0.02, 0.1, 0.02]} />
        <meshStandardMaterial color={hairHighlight} />
      </mesh>

      {/* Ahoge (hair antenna) */}
      <mesh position={[0, 0.35, 0.05]} rotation={[0.3, 0, 0.1]}>
        <coneGeometry args={[0.02, 0.15, 8]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>

      {/* Eyes group */}
      <group position={[0, 0.02, 0.2]}>
        {/* Left eye */}
        <group position={[-0.1, 0, 0]}>
          {/* Eye white */}
          <mesh>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshStandardMaterial color="white" />
          </mesh>
          {/* Iris */}
          <mesh ref={leftEyeRef} position={[0, 0, 0.03]} material={eyeMaterial}>
            <sphereGeometry args={[0.04, 16, 16]} />
          </mesh>
          {/* Pupil */}
          <mesh position={[0, 0, 0.05]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          {/* Eye highlight */}
          <mesh position={[0.015, 0.015, 0.06]}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </group>

        {/* Right eye */}
        <group position={[0.1, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh
            ref={rightEyeRef}
            position={[0, 0, 0.03]}
            material={eyeMaterial}
          >
            <sphereGeometry args={[0.04, 16, 16]} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          <mesh position={[-0.015, 0.015, 0.06]}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </group>
      </group>

      {/* Eyebrows */}
      <mesh position={[-0.1, 0.1, 0.22]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.06, 0.015, 0.01]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>
      <mesh position={[0.1, 0.1, 0.22]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.06, 0.015, 0.01]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>

      {/* Nose - subtle */}
      <mesh position={[0, -0.05, 0.25]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Blush */}
      <mesh position={[-0.15, -0.05, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#ffb6c1" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0.15, -0.05, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#ffb6c1" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// Anime mouth component
function AnimeMouth({ mouthRef, skinColor: _skinColor }) {
  return (
    <group position={[0, 0.75, 0.22]}>
      <mesh ref={mouthRef}>
        <boxGeometry args={[0.05, 0.02, 0.01]} />
        <meshStandardMaterial color="#cc6666" />
      </mesh>
    </group>
  );
}

// Sailor uniform body
function SailorUniformBody({
  skinColor,
  clothesColor,
  clothesSecondaryColor,
  rightArmRef,
}) {
  const skinMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: skinColor }),
    [skinColor]
  );
  const whiteMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: clothesColor }),
    [clothesColor]
  );
  const navyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: clothesSecondaryColor }),
    [clothesSecondaryColor]
  );

  return (
    <group position={[0, 0.2, 0]}>
      {/* Neck */}
      <mesh position={[0, 0.35, 0]} material={skinMaterial}>
        <cylinderGeometry args={[0.06, 0.07, 0.15, 16]} />
      </mesh>

      {/* Torso - white top */}
      <mesh position={[0, 0.1, 0]} material={whiteMaterial}>
        <capsuleGeometry args={[0.18, 0.25, 8, 16]} />
      </mesh>

      {/* Sailor collar */}
      <mesh position={[0, 0.25, -0.05]} material={navyMaterial}>
        <boxGeometry args={[0.4, 0.15, 0.1]} />
      </mesh>

      {/* Collar V-shape front */}
      <mesh
        position={[-0.1, 0.2, 0.12]}
        rotation={[0, 0.4, 0]}
        material={navyMaterial}
      >
        <boxGeometry args={[0.15, 0.12, 0.02]} />
      </mesh>
      <mesh
        position={[0.1, 0.2, 0.12]}
        rotation={[0, -0.4, 0]}
        material={navyMaterial}
      >
        <boxGeometry args={[0.15, 0.12, 0.02]} />
      </mesh>

      {/* Collar stripes */}
      <mesh position={[0, 0.25, -0.02]}>
        <boxGeometry args={[0.38, 0.02, 0.08]} />
        <meshStandardMaterial color={clothesColor} />
      </mesh>

      {/* Red bow */}
      <group position={[0, 0.15, 0.15]}>
        <mesh position={[-0.04, 0, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.06, 0.03, 0.02]} />
          <meshStandardMaterial color="#cc3333" />
        </mesh>
        <mesh position={[0.04, 0, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.06, 0.03, 0.02]} />
          <meshStandardMaterial color="#cc3333" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#dd4444" />
        </mesh>
        {/* Bow tail */}
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.03, 0.12, 0.01]} />
          <meshStandardMaterial color="#cc3333" />
        </mesh>
      </group>

      {/* Skirt */}
      <mesh position={[0, -0.15, 0]} material={navyMaterial}>
        <cylinderGeometry args={[0.15, 0.25, 0.25, 16]} />
      </mesh>

      {/* Arms */}
      {/* Left arm - down */}
      <group position={[-0.25, 0.1, 0]} rotation={[0, 0, 0.2]}>
        <mesh material={whiteMaterial}>
          <capsuleGeometry args={[0.04, 0.2, 8, 16]} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.18, 0]} material={skinMaterial}>
          <sphereGeometry args={[0.035, 8, 8]} />
        </mesh>
      </group>

      {/* Right arm - raised touching hair */}
      <group
        ref={rightArmRef}
        position={[0.25, 0.15, 0]}
        rotation={[0.3, 0, -0.8]}
      >
        <mesh material={whiteMaterial}>
          <capsuleGeometry args={[0.04, 0.22, 8, 16]} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, 0.18, 0]} material={skinMaterial}>
          <sphereGeometry args={[0.035, 8, 8]} />
        </mesh>
      </group>

      {/* Bag strap */}
      <mesh position={[0.2, 0.1, 0.08]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.02, 0.3, 0.01]} />
        <meshStandardMaterial color="#333333" />
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

  useProceduralAnimations(
    { groupRef, leftEyeRef, rightEyeRef, mouthRef, rightArmRef },
    config,
    isBlinking,
    mouthState
  );

  return (
    <group ref={groupRef} scale={config.modelScale} position={[0, -0.3, 0]}>
      <AnimeHead
        skinColor={config.skinColor}
        hairColor={config.hairColor}
        eyeColor={config.eyeColor}
        leftEyeRef={leftEyeRef}
        rightEyeRef={rightEyeRef}
        isBlinking={isBlinking}
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
    // We intentionally list specific config properties to avoid re-cloning on unrelated changes
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

// Scene setup with lighting
function Scene({ children, config }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        castShadow={config.enableShadows}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      <directionalLight position={[0, 5, 2]} intensity={0.4} />
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
          fov: 50,
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
          minDistance={1.5}
          maxDistance={10}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0.5, 0]}
        />
        <PerspectiveCamera makeDefault position={mergedConfig.cameraPosition} />
      </Canvas>
    </div>
  );
}

Avatar3D.ANIMATIONS = ANIMATIONS;
Avatar3D.DEFAULT_CONFIG = DEFAULT_CONFIG;

export default Avatar3D;
