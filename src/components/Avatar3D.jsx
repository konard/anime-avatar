import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  useGLTF,
  OrbitControls,
  Environment,
  useAnimations,
  Html,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import '../styles/avatar3d.css';

const DEFAULT_CONFIG = {
  skinColor: '#ffd5c8',
  hairColor: '#2d1b4e',
  eyeColor: '#6b5ce7',
  clothesColor: '#ff6b9d',
  blinkInterval: 3000,
  animationSpeed: 1,
  enableIdleAnimation: true,
  enableRandomBlink: true,
  enableLOD: true,
  enableShadows: true,
  cameraPosition: [0, 0, 3],
  modelScale: 1,
};

const ANIMATIONS = ['idle', 'happy', 'wave', 'nod', 'thinking', 'surprised'];

// Custom hook for procedural avatar animations
function useProceduralAnimations(refs, config, isBlinking, mouthState) {
  const { groupRef, leftEyeRef, rightEyeRef, mouthRef } = refs;

  useFrame((state) => {
    if (groupRef.current && config.enableIdleAnimation) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.02;
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.02;
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
}

// Avatar head subcomponent
function AvatarHead({
  skinMaterial,
  hairMaterial,
  eyeMaterial,
  leftEyeRef,
  rightEyeRef,
}) {
  return (
    <>
      <mesh position={[0, 0.8, 0]} material={skinMaterial}>
        <sphereGeometry args={[0.35, 32, 32]} />
      </mesh>
      <mesh position={[0, 0.9, -0.1]} material={hairMaterial}>
        <sphereGeometry args={[0.38, 32, 32]} />
      </mesh>
      <mesh position={[0, 1.0, 0.15]} material={hairMaterial}>
        <boxGeometry args={[0.5, 0.15, 0.15]} />
      </mesh>
      <mesh position={[-0.12, 0.85, 0.28]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh
        ref={leftEyeRef}
        position={[-0.12, 0.85, 0.33]}
        material={eyeMaterial}
      >
        <sphereGeometry args={[0.035, 16, 16]} />
      </mesh>
      <mesh position={[0.12, 0.85, 0.28]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh
        ref={rightEyeRef}
        position={[0.12, 0.85, 0.33]}
        material={eyeMaterial}
      >
        <sphereGeometry args={[0.035, 16, 16]} />
      </mesh>
    </>
  );
}

// Avatar face details subcomponent
function AvatarFaceDetails({ mouthRef }) {
  return (
    <>
      <mesh position={[0, 0.75, 0.32]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#e8c4b8" />
      </mesh>
      <mesh ref={mouthRef} position={[0, 0.65, 0.3]}>
        <boxGeometry args={[0.1, 0.03, 0.02]} />
        <meshStandardMaterial color="#ff9999" />
      </mesh>
      <mesh position={[-0.2, 0.72, 0.25]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#ffb6c1" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0.2, 0.72, 0.25]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#ffb6c1" transparent opacity={0.5} />
      </mesh>
    </>
  );
}

// Avatar body subcomponent
function AvatarBody({ skinMaterial, clothesMaterial }) {
  return (
    <>
      <mesh position={[0, 0.35, 0]} material={skinMaterial}>
        <cylinderGeometry args={[0.08, 0.1, 0.2, 16]} />
      </mesh>
      <mesh position={[0, 0, 0]} material={clothesMaterial}>
        <capsuleGeometry args={[0.25, 0.4, 8, 16]} />
      </mesh>
      <mesh
        position={[-0.35, 0.1, 0]}
        rotation={[0, 0, 0.3]}
        material={clothesMaterial}
      >
        <capsuleGeometry args={[0.06, 0.3, 8, 16]} />
      </mesh>
      <mesh
        position={[0.35, 0.1, 0]}
        rotation={[0, 0, -0.3]}
        material={clothesMaterial}
      >
        <capsuleGeometry args={[0.06, 0.3, 8, 16]} />
      </mesh>
      <mesh position={[-0.45, -0.1, 0]} material={skinMaterial}>
        <sphereGeometry args={[0.05, 8, 8]} />
      </mesh>
      <mesh position={[0.45, -0.1, 0]} material={skinMaterial}>
        <sphereGeometry args={[0.05, 8, 8]} />
      </mesh>
    </>
  );
}

// Fallback procedural avatar when no model is loaded
function ProceduralAvatar({ config, isBlinking, mouthState }) {
  const groupRef = useRef();
  const leftEyeRef = useRef();
  const rightEyeRef = useRef();
  const mouthRef = useRef();

  const skinMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: config.skinColor }),
    [config.skinColor]
  );
  const hairMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: config.hairColor }),
    [config.hairColor]
  );
  const eyeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: config.eyeColor }),
    [config.eyeColor]
  );
  const clothesMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: config.clothesColor }),
    [config.clothesColor]
  );

  useProceduralAnimations(
    { groupRef, leftEyeRef, rightEyeRef, mouthRef },
    config,
    isBlinking,
    mouthState
  );

  return (
    <group ref={groupRef} scale={config.modelScale}>
      <AvatarHead
        skinMaterial={skinMaterial}
        hairMaterial={hairMaterial}
        eyeMaterial={eyeMaterial}
        leftEyeRef={leftEyeRef}
        rightEyeRef={rightEyeRef}
      />
      <AvatarFaceDetails mouthRef={mouthRef} />
      <AvatarBody
        skinMaterial={skinMaterial}
        clothesMaterial={clothesMaterial}
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
    // LOD logic can be extended here for quality adjustment
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
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow={config.enableShadows}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      <directionalLight position={[0, 5, -5]} intensity={0.5} />
      <Environment preset="studio" />
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
                <ProceduralAvatar
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
