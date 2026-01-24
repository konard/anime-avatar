/* eslint-disable max-lines-per-function, prefer-arrow-callback */
// ThreeBody.jsx - Modular 3D body component with sailor uniform
import React, { useMemo, forwardRef } from 'react';
import * as THREE from 'three';
import { getDetailLevel3D } from './utils.js';

/**
 * Detailed Sailor uniform body component
 * Can be rendered and tested independently
 */
const ThreeBody = forwardRef(function ThreeBody(
  {
    skinColor = '#fad5c5',
    clothesColor = '#ffffff',
    clothesSecondaryColor = '#1a3a5c',
    detailLevel = 10,
    rightArmRef,
    leftArmRef,
    position = [0, 0.2, 0],
  },
  ref
) {
  const details = getDetailLevel3D(detailLevel, 'body');
  const segments = details.segments;

  // Materials with memoization
  const skinMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.55 }),
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
    <group ref={ref} position={position}>
      {/* Neck */}
      <mesh position={[0, 0.38, 0]} material={skinMaterial}>
        <cylinderGeometry
          args={[0.065, 0.075, 0.18, Math.max(16, segments - 8)]}
        />
      </mesh>

      {/* Torso - white sailor top */}
      {details.hasClothes && (
        <mesh position={[0, 0.1, 0]} material={whiteMaterial}>
          <capsuleGeometry
            args={[
              0.2,
              0.28,
              Math.max(8, segments / 3),
              Math.max(16, segments - 8),
            ]}
          />
        </mesh>
      )}

      {/* Sailor collar - back */}
      {details.hasCollar && (
        <>
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
        </>
      )}

      {/* Red bow */}
      {details.hasBow && (
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
      )}

      {/* Skirt */}
      {details.hasSkirt && (
        <mesh position={[0, -0.18, 0]} material={navyMaterial}>
          <cylinderGeometry
            args={[0.17, 0.28, 0.3, Math.max(16, segments - 8)]}
          />
        </mesh>
      )}

      {/* Arms */}
      {details.hasArms && (
        <>
          {/* Left arm - down pose */}
          <group
            ref={leftArmRef}
            position={[-0.28, 0.12, 0]}
            rotation={[0, 0, 0.25]}
          >
            {/* Upper arm with sleeve */}
            <mesh material={whiteMaterial}>
              <capsuleGeometry
                args={[
                  0.045,
                  0.22,
                  Math.max(6, segments / 4),
                  Math.max(12, segments - 12),
                ]}
              />
            </mesh>
            {/* Hand */}
            <mesh position={[0, -0.2, 0]} material={skinMaterial}>
              <sphereGeometry args={[0.04, 12, 12]} />
            </mesh>
            {/* Fingers hint */}
            <mesh position={[0, -0.24, 0.01]} material={skinMaterial}>
              <boxGeometry args={[0.03, 0.04, 0.02]} />
            </mesh>
          </group>

          {/* Right arm - raised touching hair */}
          <group
            ref={rightArmRef}
            position={[0.28, 0.18, 0]}
            rotation={[0.35, 0, -0.85]}
          >
            <mesh material={whiteMaterial}>
              <capsuleGeometry
                args={[
                  0.045,
                  0.25,
                  Math.max(6, segments / 4),
                  Math.max(12, segments - 12),
                ]}
              />
            </mesh>
            {/* Hand near hair */}
            <mesh position={[0, 0.2, 0]} material={skinMaterial}>
              <sphereGeometry args={[0.04, 12, 12]} />
            </mesh>
            {/* Fingers hint */}
            <mesh position={[0, 0.24, 0.01]} material={skinMaterial}>
              <boxGeometry args={[0.03, 0.04, 0.02]} />
            </mesh>
          </group>
        </>
      )}

      {/* Bag strap */}
      {details.hasBag && (
        <mesh position={[0.22, 0.12, 0.1]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.025, 0.35, 0.015]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
});

export default ThreeBody;
