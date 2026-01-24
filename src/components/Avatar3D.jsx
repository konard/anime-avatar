/* eslint-disable complexity */
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
import {
  ThreeCharacter,
  ThreeBackground,
  DEFAULT_CONFIG,
} from './three/index.js';

const ANIMATIONS = ['idle', 'happy', 'wave', 'nod', 'thinking', 'surprised'];

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

      <ThreeBackground
        showBackground={config.showBackground}
        detailLevel={config.detailLevel}
        backgroundModel={config.backgroundModel}
      />
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
                <ThreeCharacter
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
