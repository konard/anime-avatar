/* eslint-disable max-lines-per-function, prefer-arrow-callback */
// ThreeBackground.jsx - Modular 3D background component with cherry blossoms
import React, { useRef, useMemo, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { getDetailLevel3D } from './utils.js';

/**
 * Enhanced background scene with cherry blossoms or plain colors
 * Can be rendered and tested independently
 */
const ThreeBackground = forwardRef(function ThreeBackground(
  {
    showBackground = true,
    detailLevel = 10,
    backgroundModel = 'cherry-blossom-road',
  },
  ref
) {
  const petalRefs = useRef([]);
  const treeRef = useRef();
  const details = getDetailLevel3D(detailLevel, 'background');
  const segments = details.segments;
  const petalCount = details.petalCount || 50;

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
    [petalCount]
  );

  useFrame((state) => {
    if (!showBackground) {
      return;
    }
    const t = state.clock.getElapsedTime();

    petalRefs.current.forEach((petal, i) => {
      if (petal && petals[i]) {
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

  if (!showBackground || segments === 0) {
    return null;
  }

  // Plain background modes
  if (backgroundModel === 'plain-white') {
    return (
      <group ref={ref}>
        <mesh position={[0, 0, -8]}>
          <planeGeometry args={[30, 30]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    );
  }

  if (backgroundModel === 'plain-gray') {
    return (
      <group ref={ref}>
        <mesh position={[0, 0, -8]}>
          <planeGeometry args={[30, 30]} />
          <meshBasicMaterial color="#808080" />
        </mesh>
      </group>
    );
  }

  // Cherry blossom road (default)
  return (
    <group ref={ref}>
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
      {details.hasCity && (
        <group position={[0, -2, -6]}>
          {[...Array(15)].map((_, i) => (
            <mesh
              key={i}
              position={[(i - 7) * 1.5, 0.5 + Math.random() * 1, 0]}
            >
              <boxGeometry
                args={[0.8 + Math.random() * 0.5, 1 + Math.random() * 2, 0.3]}
              />
              <meshStandardMaterial color="#c4d4e4" transparent opacity={0.3} />
            </mesh>
          ))}
        </group>
      )}

      {/* Bridge/fence in middle ground */}
      {details.hasFence && (
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
      )}

      {/* Cherry blossom trees - left side with more detail */}
      {details.hasTrees && (
        <group ref={treeRef} position={[-4, -1.5, -5]}>
          {/* Main trunk */}
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry
              args={[0.12, 0.2, 4, Math.max(8, segments - 4)]}
            />
            <meshStandardMaterial color="#5c4033" />
          </mesh>
          {/* Branches */}
          <mesh position={[-0.5, 3, 0]} rotation={[0, 0, 0.5]}>
            <cylinderGeometry
              args={[0.05, 0.08, 1.5, Math.max(6, segments / 3)]}
            />
            <meshStandardMaterial color="#5c4033" />
          </mesh>
          <mesh position={[0.4, 3.2, 0]} rotation={[0, 0, -0.4]}>
            <cylinderGeometry
              args={[0.04, 0.07, 1.2, Math.max(6, segments / 3)]}
            />
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
                <sphereGeometry
                  args={[
                    cluster.size,
                    Math.max(10, segments - 6),
                    Math.max(10, segments - 6),
                  ]}
                />
                <meshStandardMaterial
                  color="#ffb7c5"
                  transparent
                  opacity={0.9}
                />
              </mesh>
              <mesh position={[0.1, 0.1, 0.1]}>
                <sphereGeometry
                  args={[
                    cluster.size * 0.7,
                    Math.max(8, segments / 2),
                    Math.max(8, segments / 2),
                  ]}
                />
                <meshStandardMaterial
                  color="#ffc8d4"
                  transparent
                  opacity={0.7}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Cherry blossom trees - right side */}
      {details.hasTrees && (
        <group position={[4.5, -1.5, -5.5]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry
              args={[0.15, 0.25, 5, Math.max(8, segments - 4)]}
            />
            <meshStandardMaterial color="#5c4033" />
          </mesh>
          <mesh position={[-0.6, 4, 0]} rotation={[0, 0, 0.6]}>
            <cylinderGeometry
              args={[0.06, 0.1, 2, Math.max(6, segments / 3)]}
            />
            <meshStandardMaterial color="#5c4033" />
          </mesh>
          <mesh position={[0.5, 4.3, 0]} rotation={[0, 0, -0.5]}>
            <cylinderGeometry
              args={[0.05, 0.08, 1.5, Math.max(6, segments / 3)]}
            />
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
                <sphereGeometry
                  args={[
                    cluster.size,
                    Math.max(10, segments - 6),
                    Math.max(10, segments - 6),
                  ]}
                />
                <meshStandardMaterial
                  color="#ffb7c5"
                  transparent
                  opacity={0.88}
                />
              </mesh>
              <mesh position={[-0.1, 0.1, 0.1]}>
                <sphereGeometry
                  args={[
                    cluster.size * 0.65,
                    Math.max(8, segments / 2),
                    Math.max(8, segments / 2),
                  ]}
                />
                <meshStandardMaterial
                  color="#ffd0dc"
                  transparent
                  opacity={0.65}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Falling petals - more of them */}
      {details.hasPetals &&
        petals.map((petal, i) => (
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
});

export default ThreeBackground;
