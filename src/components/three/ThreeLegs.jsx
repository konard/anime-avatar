/* eslint-disable prefer-arrow-callback */
// ThreeLegs.jsx - Modular 3D legs component
import React, { useMemo, forwardRef } from 'react';
import * as THREE from 'three';
import { getDetailLevel3D } from './utils.js';

/**
 * 3D legs component with shoes and socks
 * Can be rendered and tested independently
 */
const ThreeLegs = forwardRef(function ThreeLegs(
  {
    skinColor = '#fad5c5',
    clothesSecondaryColor: _clothesSecondaryColor = '#1a3a5c',
    detailLevel = 10,
    position = [0, -0.5, 0],
    leftLegRef,
    rightLegRef,
  },
  ref
) {
  const details = getDetailLevel3D(detailLevel, 'legs');
  const segments = details.segments;

  // Materials with memoization
  const skinMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.55 }),
    [skinColor]
  );

  const sockMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }),
    []
  );

  const shoeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.6 }),
    []
  );

  if (segments === 0) {
    return null;
  }

  return (
    <group ref={ref} position={position}>
      {/* Left leg */}
      <group ref={leftLegRef} position={[-0.1, 0, 0]}>
        {/* Upper leg (thigh - covered by skirt) */}
        <mesh position={[0, 0.1, 0]} material={skinMaterial}>
          <capsuleGeometry
            args={[
              0.06,
              0.2,
              Math.max(6, segments / 3),
              Math.max(10, segments - 8),
            ]}
          />
        </mesh>

        {/* Lower leg (shin) */}
        <mesh position={[0, -0.2, 0]} material={skinMaterial}>
          <capsuleGeometry
            args={[
              0.05,
              0.25,
              Math.max(6, segments / 3),
              Math.max(10, segments - 8),
            ]}
          />
        </mesh>

        {/* Sock */}
        {details.hasSocks && (
          <mesh position={[0, -0.38, 0]} material={sockMaterial}>
            <capsuleGeometry
              args={[
                0.052,
                0.12,
                Math.max(6, segments / 3),
                Math.max(10, segments - 8),
              ]}
            />
          </mesh>
        )}

        {/* Shoe */}
        {details.hasShoes && (
          <group position={[0, -0.52, 0.03]}>
            <mesh material={shoeMaterial}>
              <boxGeometry args={[0.08, 0.06, 0.14]} />
            </mesh>
            {/* Shoe front */}
            <mesh position={[0, -0.01, 0.05]} material={shoeMaterial}>
              <sphereGeometry args={[0.04, 10, 10]} />
            </mesh>
          </group>
        )}
      </group>

      {/* Right leg */}
      <group ref={rightLegRef} position={[0.1, 0, 0]}>
        {/* Upper leg (thigh - covered by skirt) */}
        <mesh position={[0, 0.1, 0]} material={skinMaterial}>
          <capsuleGeometry
            args={[
              0.06,
              0.2,
              Math.max(6, segments / 3),
              Math.max(10, segments - 8),
            ]}
          />
        </mesh>

        {/* Lower leg (shin) */}
        <mesh position={[0, -0.2, 0]} material={skinMaterial}>
          <capsuleGeometry
            args={[
              0.05,
              0.25,
              Math.max(6, segments / 3),
              Math.max(10, segments - 8),
            ]}
          />
        </mesh>

        {/* Sock */}
        {details.hasSocks && (
          <mesh position={[0, -0.38, 0]} material={sockMaterial}>
            <capsuleGeometry
              args={[
                0.052,
                0.12,
                Math.max(6, segments / 3),
                Math.max(10, segments - 8),
              ]}
            />
          </mesh>
        )}

        {/* Shoe */}
        {details.hasShoes && (
          <group position={[0, -0.52, 0.03]}>
            <mesh material={shoeMaterial}>
              <boxGeometry args={[0.08, 0.06, 0.14]} />
            </mesh>
            {/* Shoe front */}
            <mesh position={[0, -0.01, 0.05]} material={shoeMaterial}>
              <sphereGeometry args={[0.04, 10, 10]} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
});

export default ThreeLegs;
