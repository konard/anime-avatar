/* eslint-disable prefer-arrow-callback */
// ThreeCharacter.jsx - Combined 3D character component
import React, { useRef, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ThreeHead from './ThreeHead.jsx';
import ThreeMouth from './ThreeMouth.jsx';
import ThreeBody from './ThreeBody.jsx';
import ThreeLegs from './ThreeLegs.jsx';

/**
 * Custom hook for procedural avatar animations
 */
function useProceduralAnimations(refs, config, isBlinking, mouthState) {
  const {
    groupRef,
    leftEyeRef,
    rightEyeRef,
    mouthRef,
    rightArmRef,
    leftArmRef,
    hairRef,
    leftLegRef,
    rightLegRef,
  } = refs;

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
        mouthRef.current.scale.x = 1 + Math.sin(t * 12) * 0.15;
      } else {
        mouthRef.current.scale.y = THREE.MathUtils.lerp(
          mouthRef.current.scale.y,
          1,
          0.1
        );
        mouthRef.current.scale.x = THREE.MathUtils.lerp(
          mouthRef.current.scale.x,
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
      rightArmRef.current.rotation.z = -0.85 + Math.sin(t * 0.5) * 0.05;
      rightArmRef.current.rotation.x = 0.35 + Math.sin(t * 0.4) * 0.03;
    }
  });

  // Left arm subtle animation
  useFrame((state) => {
    if (leftArmRef.current && config.enableIdleAnimation) {
      const t = state.clock.getElapsedTime();
      leftArmRef.current.rotation.z = 0.25 + Math.sin(t * 0.6) * 0.02;
    }
  });

  // Hair sway animation
  useFrame((state) => {
    if (hairRef.current && config.enableIdleAnimation) {
      const t = state.clock.getElapsedTime();
      hairRef.current.rotation.z = Math.sin(t * 0.4) * 0.015;
      hairRef.current.rotation.x = Math.sin(t * 0.3) * 0.008;
    }
  });

  // Leg subtle animation
  useFrame((state) => {
    if (config.enableIdleAnimation && config.showLegs) {
      const t = state.clock.getElapsedTime();
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(t * 0.4) * 0.02;
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = Math.sin(t * 0.4 + Math.PI) * 0.02;
      }
    }
  });
}

/**
 * Procedural anime avatar that combines all parts
 * Can be rendered and tested independently
 */
const ThreeCharacter = forwardRef(function ThreeCharacter(
  {
    config,
    isBlinking = false,
    mouthState = 'normal',
    position = [0, -0.4, 0],
  },
  _ref
) {
  const groupRef = useRef();
  const leftEyeRef = useRef();
  const rightEyeRef = useRef();
  const mouthRef = useRef();
  const rightArmRef = useRef();
  const leftArmRef = useRef();
  const hairRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();

  useProceduralAnimations(
    {
      groupRef,
      leftEyeRef,
      rightEyeRef,
      mouthRef,
      rightArmRef,
      leftArmRef,
      hairRef,
      leftLegRef,
      rightLegRef,
    },
    config,
    isBlinking,
    mouthState
  );

  return (
    <group ref={groupRef} scale={config.modelScale} position={position}>
      <ThreeHead
        skinColor={config.skinColor}
        hairColor={config.hairColor}
        eyeColor={config.eyeColor}
        detailLevel={config.detailLevel}
        leftEyeRef={leftEyeRef}
        rightEyeRef={rightEyeRef}
        hairRef={hairRef}
      />
      <ThreeMouth
        mouthRef={mouthRef}
        skinColor={config.skinColor}
        mouthState={mouthState}
      />
      <ThreeBody
        skinColor={config.skinColor}
        clothesColor={config.clothesColor}
        clothesSecondaryColor={config.clothesSecondaryColor}
        detailLevel={config.detailLevel}
        rightArmRef={rightArmRef}
        leftArmRef={leftArmRef}
      />
      {config.showLegs && (
        <ThreeLegs
          skinColor={config.skinColor}
          clothesSecondaryColor={config.clothesSecondaryColor}
          detailLevel={config.detailLevel}
          leftLegRef={leftLegRef}
          rightLegRef={rightLegRef}
        />
      )}
    </group>
  );
});

export default ThreeCharacter;
