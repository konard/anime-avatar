/* eslint-disable max-lines-per-function, complexity, prefer-arrow-callback */
// ThreeHead.jsx - Modular 3D head component with anime-style features
import React, { useMemo, forwardRef } from 'react';
import * as THREE from 'three';
import { adjustColor, getDetailLevel3D } from './utils.js';

/**
 * Enhanced anime-style 3D head component
 * Can be rendered and tested independently
 */
const ThreeHead = forwardRef(function ThreeHead(
  {
    skinColor = '#fad5c5',
    hairColor = '#b07850',
    eyeColor = '#4a90c2',
    detailLevel = 10,
    leftEyeRef,
    rightEyeRef,
    hairRef,
    position = [0, 0.95, 0],
  },
  ref
) {
  const details = getDetailLevel3D(detailLevel, 'head');
  const eyeDetails = getDetailLevel3D(detailLevel, 'eyes');
  const segments = details.segments;

  // Materials with memoization
  const skinMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.5 }),
    [skinColor]
  );

  const hairMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.65 }),
    [hairColor]
  );

  const eyeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.3 }),
    [eyeColor]
  );

  // Hair color variations
  const hairHighlight = useMemo(() => adjustColor(hairColor, 0.2), [hairColor]);
  const hairShadow = useMemo(() => adjustColor(hairColor, -0.15), [hairColor]);

  // Blush color
  const blushColor = useMemo(() => new THREE.Color('#ffb6c1'), []);

  return (
    <group ref={ref} position={position}>
      {/* Main face - anime oval shape */}
      <mesh material={skinMaterial}>
        <sphereGeometry args={[0.3, segments, segments]} />
      </mesh>

      {/* Chin extension for anime face shape */}
      {details.hasChin && (
        <mesh position={[0, -0.18, 0.06]} material={skinMaterial}>
          <sphereGeometry
            args={[0.2, Math.max(16, segments - 8), Math.max(16, segments - 8)]}
          />
        </mesh>
      )}

      {/* Enhanced cheeks for rounder anime look */}
      {details.hasCheeks && (
        <>
          <mesh position={[-0.12, -0.05, 0.18]} material={skinMaterial}>
            <sphereGeometry
              args={[
                0.12,
                Math.max(12, segments - 12),
                Math.max(12, segments - 12),
              ]}
            />
          </mesh>
          <mesh position={[0.12, -0.05, 0.18]} material={skinMaterial}>
            <sphereGeometry
              args={[
                0.12,
                Math.max(12, segments - 12),
                Math.max(12, segments - 12),
              ]}
            />
          </mesh>
        </>
      )}

      {/* Ears */}
      {details.hasEars && (
        <>
          <mesh position={[-0.28, 0, 0]} material={skinMaterial}>
            <sphereGeometry args={[0.05, 12, 12]} />
          </mesh>
          <mesh position={[0.28, 0, 0]} material={skinMaterial}>
            <sphereGeometry args={[0.05, 12, 12]} />
          </mesh>
          {/* Inner ear detail */}
          <mesh position={[-0.28, 0, 0.02]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial
              color={adjustColor(skinColor, -0.1)}
              roughness={0.6}
            />
          </mesh>
          <mesh position={[0.28, 0, 0.02]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial
              color={adjustColor(skinColor, -0.1)}
              roughness={0.6}
            />
          </mesh>
        </>
      )}

      {/* Hair group */}
      <group ref={hairRef}>
        {/* Hair back - main volume */}
        <mesh position={[0, 0.05, -0.1]} material={hairMaterial}>
          <sphereGeometry args={[0.35, segments, segments]} />
        </mesh>

        {/* Long flowing hair - back strands */}
        <group>
          {/* Left hair strand */}
          <mesh position={[-0.22, -0.35, -0.05]}>
            <capsuleGeometry
              args={[
                0.09,
                0.7,
                Math.max(8, segments / 3),
                Math.max(12, segments - 12),
              ]}
            />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>
          <mesh position={[-0.28, -0.8, -0.05]}>
            <capsuleGeometry
              args={[
                0.07,
                0.5,
                Math.max(6, segments / 4),
                Math.max(10, segments - 16),
              ]}
            />
            <meshStandardMaterial color={hairShadow} roughness={0.7} />
          </mesh>

          {/* Right hair strand */}
          <mesh position={[0.22, -0.35, -0.05]}>
            <capsuleGeometry
              args={[
                0.09,
                0.7,
                Math.max(8, segments / 3),
                Math.max(12, segments - 12),
              ]}
            />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>
          <mesh position={[0.28, -0.8, -0.05]}>
            <capsuleGeometry
              args={[
                0.07,
                0.5,
                Math.max(6, segments / 4),
                Math.max(10, segments - 16),
              ]}
            />
            <meshStandardMaterial color={hairShadow} roughness={0.7} />
          </mesh>

          {/* Center back hair */}
          <mesh position={[0, -0.45, -0.12]}>
            <capsuleGeometry
              args={[
                0.14,
                0.8,
                Math.max(8, segments / 3),
                Math.max(12, segments - 12),
              ]}
            />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.9, -0.12]}>
            <capsuleGeometry
              args={[
                0.1,
                0.5,
                Math.max(6, segments / 4),
                Math.max(10, segments - 16),
              ]}
            />
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
          <meshStandardMaterial color={hairColor} roughness={0.65} />
        </mesh>
        <mesh position={[0.24, 0.08, 0.14]} rotation={[0, -0.3, -0.1]}>
          <boxGeometry args={[0.1, 0.3, 0.12]} />
          <meshStandardMaterial color={hairColor} roughness={0.65} />
        </mesh>

        {/* Bang strands for detail */}
        <mesh position={[-0.1, 0.15, 0.23]} rotation={[0, 0, 0.05]}>
          <boxGeometry args={[0.06, 0.15, 0.04]} />
          <meshStandardMaterial color={hairShadow} roughness={0.65} />
        </mesh>
        <mesh position={[0.1, 0.15, 0.23]} rotation={[0, 0, -0.05]}>
          <boxGeometry args={[0.06, 0.15, 0.04]} />
          <meshStandardMaterial color={hairShadow} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.12, 0.24]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.05, 0.18, 0.035]} />
          <meshStandardMaterial color={hairShadow} roughness={0.65} />
        </mesh>

        {/* Hair highlight streaks */}
        {details.hasHighlights && (
          <>
            <mesh position={[-0.12, 0.2, 0.22]}>
              <boxGeometry args={[0.025, 0.14, 0.025]} />
              <meshStandardMaterial color={hairHighlight} roughness={0.5} />
            </mesh>
            <mesh position={[0.1, 0.19, 0.22]}>
              <boxGeometry args={[0.02, 0.12, 0.02]} />
              <meshStandardMaterial color={hairHighlight} roughness={0.5} />
            </mesh>
            <mesh position={[0.02, 0.21, 0.22]}>
              <boxGeometry args={[0.018, 0.11, 0.018]} />
              <meshStandardMaterial color={hairHighlight} roughness={0.5} />
            </mesh>
          </>
        )}

        {/* Extra hair volume top */}
        <mesh position={[0, 0.28, 0]}>
          <sphereGeometry
            args={[
              0.28,
              Math.max(16, segments - 8),
              Math.max(16, segments - 8),
            ]}
          />
          <meshStandardMaterial color={hairColor} roughness={0.65} />
        </mesh>

        {/* Ahoge (hair antenna) */}
        <mesh position={[0, 0.42, 0.05]} rotation={[0.4, 0, 0.15]}>
          <coneGeometry args={[0.025, 0.18, Math.max(8, segments / 3)]} />
          <meshStandardMaterial color={hairColor} roughness={0.6} />
        </mesh>
      </group>

      {/* Eyes group - larger anime style */}
      {details.hasEyes && (
        <group position={[0, 0.02, 0.22]}>
          {/* Left eye */}
          <group position={[-0.1, 0, 0]}>
            {/* Eye white */}
            <mesh>
              <sphereGeometry
                args={[
                  0.06,
                  Math.max(16, segments - 8),
                  Math.max(16, segments - 8),
                ]}
              />
              <meshStandardMaterial color="white" roughness={0.2} />
            </mesh>
            {/* Iris with gradient effect */}
            <mesh
              ref={leftEyeRef}
              position={[0, 0, 0.035]}
              material={eyeMaterial}
            >
              <sphereGeometry
                args={[
                  0.045,
                  Math.max(16, segments - 8),
                  Math.max(16, segments - 8),
                ]}
              />
            </mesh>
            {/* Iris ring detail */}
            {eyeDetails.hasIrisDetail && (
              <mesh position={[0, 0, 0.04]}>
                <ringGeometry
                  args={[0.035, 0.044, Math.max(16, segments - 8)]}
                />
                <meshBasicMaterial
                  color={adjustColor(eyeColor, -0.2)}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
            {/* Pupil */}
            <mesh position={[0, 0, 0.055]}>
              <sphereGeometry args={[0.022, 12, 12]} />
              <meshStandardMaterial color="#1a1a2e" roughness={0.2} />
            </mesh>
            {/* Main eye highlight */}
            {eyeDetails.hasHighlights && (
              <>
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
              </>
            )}
            {/* Sparkle effects */}
            {eyeDetails.hasSparkles && (
              <>
                <mesh position={[0.025, 0.018, 0.068]}>
                  <sphereGeometry args={[0.004, 6, 6]} />
                  <meshStandardMaterial
                    color="white"
                    emissive="white"
                    emissiveIntensity={0.5}
                  />
                </mesh>
                <mesh position={[-0.02, 0.012, 0.062]}>
                  <sphereGeometry args={[0.003, 6, 6]} />
                  <meshStandardMaterial
                    color="white"
                    emissive="white"
                    emissiveIntensity={0.4}
                  />
                </mesh>
              </>
            )}
          </group>

          {/* Right eye */}
          <group position={[0.1, 0, 0]}>
            <mesh>
              <sphereGeometry
                args={[
                  0.06,
                  Math.max(16, segments - 8),
                  Math.max(16, segments - 8),
                ]}
              />
              <meshStandardMaterial color="white" roughness={0.2} />
            </mesh>
            <mesh
              ref={rightEyeRef}
              position={[0, 0, 0.035]}
              material={eyeMaterial}
            >
              <sphereGeometry
                args={[
                  0.045,
                  Math.max(16, segments - 8),
                  Math.max(16, segments - 8),
                ]}
              />
            </mesh>
            {eyeDetails.hasIrisDetail && (
              <mesh position={[0, 0, 0.04]}>
                <ringGeometry
                  args={[0.035, 0.044, Math.max(16, segments - 8)]}
                />
                <meshBasicMaterial
                  color={adjustColor(eyeColor, -0.2)}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
            <mesh position={[0, 0, 0.055]}>
              <sphereGeometry args={[0.022, 12, 12]} />
              <meshStandardMaterial color="#1a1a2e" roughness={0.2} />
            </mesh>
            {eyeDetails.hasHighlights && (
              <>
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
              </>
            )}
            {eyeDetails.hasSparkles && (
              <>
                <mesh position={[-0.025, 0.018, 0.068]}>
                  <sphereGeometry args={[0.004, 6, 6]} />
                  <meshStandardMaterial
                    color="white"
                    emissive="white"
                    emissiveIntensity={0.5}
                  />
                </mesh>
                <mesh position={[0.02, 0.012, 0.062]}>
                  <sphereGeometry args={[0.003, 6, 6]} />
                  <meshStandardMaterial
                    color="white"
                    emissive="white"
                    emissiveIntensity={0.4}
                  />
                </mesh>
              </>
            )}
          </group>
        </group>
      )}

      {/* Eyebrows */}
      {details.hasEyes && (
        <>
          <mesh position={[-0.1, 0.12, 0.24]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.07, 0.018, 0.012]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
          <mesh position={[0.1, 0.12, 0.24]} rotation={[0, 0, -0.1]}>
            <boxGeometry args={[0.07, 0.018, 0.012]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
        </>
      )}

      {/* Nose - subtle */}
      {details.hasNose && (
        <>
          <mesh position={[0, -0.06, 0.28]}>
            <sphereGeometry args={[0.018, 10, 10]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
          {/* Nose highlight */}
          {details.hasHighlights && (
            <mesh position={[0, -0.055, 0.295]}>
              <sphereGeometry args={[0.006, 6, 6]} />
              <meshStandardMaterial
                color={adjustColor(skinColor, 0.15)}
                roughness={0.4}
              />
            </mesh>
          )}
        </>
      )}

      {/* Blush */}
      {details.hasBlush && (
        <>
          <mesh position={[-0.16, -0.06, 0.22]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial
              color={blushColor}
              transparent
              opacity={0.35}
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0.16, -0.06, 0.22]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial
              color={blushColor}
              transparent
              opacity={0.35}
              roughness={0.8}
            />
          </mesh>
        </>
      )}
    </group>
  );
});

export default ThreeHead;
