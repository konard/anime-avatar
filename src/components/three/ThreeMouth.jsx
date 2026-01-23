/* eslint-disable prefer-arrow-callback */
// ThreeMouth.jsx - Modular 3D mouth component with anime-style features
import React, { forwardRef } from 'react';

/**
 * Anime-style 3D mouth component
 * Can be rendered and tested independently
 */
const ThreeMouth = forwardRef(function ThreeMouth(
  {
    skinColor: _skinColor = '#fad5c5',
    mouthState = 'normal',
    position = [0, 0.78, 0.24],
  },
  mouthRef
) {
  return (
    <group position={position}>
      {mouthState === 'talking' ? (
        // Talking mouth - open
        <group ref={mouthRef}>
          <mesh>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#c46666" roughness={0.5} />
          </mesh>
          {/* Tongue hint */}
          <mesh position={[0, -0.015, 0.01]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#dd8888" roughness={0.6} />
          </mesh>
        </group>
      ) : (
        // Normal closed/smiling mouth
        <mesh ref={mouthRef}>
          <boxGeometry args={[0.055, 0.022, 0.012]} />
          <meshStandardMaterial color="#cc6666" roughness={0.5} />
        </mesh>
      )}
    </group>
  );
});

export default ThreeMouth;
