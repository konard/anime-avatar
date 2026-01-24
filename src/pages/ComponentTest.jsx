/* eslint-disable max-lines-per-function */
// ComponentTest.jsx - Component testing page with dropdown selector
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import {
  ThreeHead,
  ThreeBody,
  ThreeLegs,
  ThreeBackground,
  ThreeCharacter,
  DEFAULT_CONFIG,
} from '../components/three/index.js';
import {
  SVGHead,
  SVGFace,
  SVGEyes,
  SVGHair,
  SVGBody,
  SVGLegs,
  SVGBackground,
  SVGCharacter,
} from '../components/svg/index.js';

// Available components
const COMPONENTS_3D = [
  { name: 'ThreeCharacter', label: 'Full Character (3D)' },
  { name: 'ThreeHead', label: 'Head (3D)' },
  { name: 'ThreeBody', label: 'Body (3D)' },
  { name: 'ThreeLegs', label: 'Legs (3D)' },
  { name: 'ThreeBackground', label: 'Background (3D)' },
];

const COMPONENTS_2D = [
  { name: 'SVGCharacter', label: 'Full Character (2D)' },
  { name: 'SVGHead', label: 'Head (2D)' },
  { name: 'SVGFace', label: 'Face (2D)' },
  { name: 'SVGEyes', label: 'Eyes (2D)' },
  { name: 'SVGHair', label: 'Hair (2D)' },
  { name: 'SVGBody', label: 'Body (2D)' },
  { name: 'SVGLegs', label: 'Legs (2D)' },
  { name: 'SVGBackground', label: 'Background (2D)' },
];

// 3D Component renderer
function Render3DComponent({ componentName, config }) {
  switch (componentName) {
    case 'ThreeCharacter':
      return <ThreeCharacter config={config} position={[0, -0.4, 0]} />;
    case 'ThreeHead':
      return (
        <ThreeHead
          skinColor={config.skinColor}
          hairColor={config.hairColor}
          eyeColor={config.eyeColor}
          detailLevel={config.detailLevel}
          position={[0, 0, 0]}
        />
      );
    case 'ThreeBody':
      return (
        <ThreeBody
          skinColor={config.skinColor}
          clothesColor={config.clothesColor}
          clothesSecondaryColor={config.clothesSecondaryColor}
          detailLevel={config.detailLevel}
          position={[0, 0, 0]}
        />
      );
    case 'ThreeLegs':
      return (
        <ThreeLegs
          skinColor={config.skinColor}
          clothesSecondaryColor={config.clothesSecondaryColor}
          detailLevel={config.detailLevel}
          position={[0, 0, 0]}
        />
      );
    case 'ThreeBackground':
      return (
        <ThreeBackground
          showBackground={true}
          detailLevel={config.detailLevel}
        />
      );
    default:
      return null;
  }
}

// 2D Component renderer
function Render2DComponent({ componentName, config }) {
  const detailLevel = config.detailLevel || 10;

  switch (componentName) {
    case 'SVGCharacter':
      return <SVGCharacter config={config} />;
    case 'SVGHead':
      return <SVGHead config={config} detailLevel={detailLevel} />;
    case 'SVGFace':
      return <SVGFace config={config} detailLevel={detailLevel} />;
    case 'SVGEyes':
      return <SVGEyes config={config} detailLevel={detailLevel} />;
    case 'SVGHair':
      return <SVGHair config={config} detailLevel={detailLevel} />;
    case 'SVGBody':
      return <SVGBody config={config} detailLevel={detailLevel} />;
    case 'SVGLegs':
      return <SVGLegs config={config} detailLevel={detailLevel} />;
    case 'SVGBackground':
      return <SVGBackground config={config} detailLevel={detailLevel} />;
    default:
      return null;
  }
}

// Loading indicator for 3D
function LoadingIndicator() {
  return (
    <Html center>
      <div style={{ color: 'white', textAlign: 'center' }}>
        <div>Loading...</div>
      </div>
    </Html>
  );
}

// Main Component Test Page
export default function ComponentTest() {
  const [renderMode, setRenderMode] = useState('3D');
  const [selectedComponent, setSelectedComponent] = useState('ThreeCharacter');
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG });

  const components = renderMode === '3D' ? COMPONENTS_3D : COMPONENTS_2D;

  // Update selected component when switching modes
  const handleModeChange = (mode) => {
    setRenderMode(mode);
    if (mode === '3D') {
      setSelectedComponent('ThreeCharacter');
    } else {
      setSelectedComponent('SVGCharacter');
    }
  };

  // Config update handler
  const updateConfig = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      style={{ display: 'flex', height: '100vh', backgroundColor: '#1a1a2e' }}
    >
      {/* Settings Panel */}
      <div
        style={{
          width: '320px',
          padding: '20px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          overflowY: 'auto',
          color: 'white',
        }}
      >
        <h2 style={{ marginBottom: '20px', fontSize: '18px' }}>
          Component Tester
        </h2>

        {/* Render Mode Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
            }}
          >
            Render Mode
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleModeChange('3D')}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: renderMode === '3D' ? '#4a90c2' : '#333',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              3D
            </button>
            <button
              onClick={() => handleModeChange('2D')}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: renderMode === '2D' ? '#4a90c2' : '#333',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              2D SVG
            </button>
          </div>
        </div>

        {/* Component Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
            }}
          >
            Component
          </label>
          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {components.map((comp) => (
              <option key={comp.name} value={comp.name}>
                {comp.label}
              </option>
            ))}
          </select>
        </div>

        {/* Detail Level Slider */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
            }}
          >
            Detail Level: {config.detailLevel}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={config.detailLevel}
            onChange={(e) =>
              updateConfig('detailLevel', parseInt(e.target.value))
            }
            style={{ width: '100%' }}
          />
        </div>

        {/* Color Controls */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
            }}
          >
            Skin Color
          </label>
          <input
            type="color"
            value={config.skinColor}
            onChange={(e) => updateConfig('skinColor', e.target.value)}
            style={{ width: '100%', height: '40px', cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
            }}
          >
            Hair Color
          </label>
          <input
            type="color"
            value={config.hairColor}
            onChange={(e) => updateConfig('hairColor', e.target.value)}
            style={{ width: '100%', height: '40px', cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
            }}
          >
            Eye Color
          </label>
          <input
            type="color"
            value={config.eyeColor}
            onChange={(e) => updateConfig('eyeColor', e.target.value)}
            style={{ width: '100%', height: '40px', cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
            }}
          >
            Clothes Color
          </label>
          <input
            type="color"
            value={config.clothesColor}
            onChange={(e) => updateConfig('clothesColor', e.target.value)}
            style={{ width: '100%', height: '40px', cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
            }}
          >
            Secondary Color
          </label>
          <input
            type="color"
            value={config.clothesSecondaryColor}
            onChange={(e) =>
              updateConfig('clothesSecondaryColor', e.target.value)
            }
            style={{ width: '100%', height: '40px', cursor: 'pointer' }}
          />
        </div>

        {/* Toggle Controls */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={config.showBackground}
              onChange={(e) => updateConfig('showBackground', e.target.checked)}
            />
            Show Background
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={config.showLegs}
              onChange={(e) => updateConfig('showLegs', e.target.checked)}
            />
            Show Legs (Full Body)
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={config.enableIdleAnimation}
              onChange={(e) =>
                updateConfig('enableIdleAnimation', e.target.checked)
              }
            />
            Enable Idle Animation
          </label>
        </div>

        {/* Reset button */}
        <button
          onClick={() => setConfig({ ...DEFAULT_CONFIG })}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#cc3333',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Reset to Defaults
        </button>
      </div>

      {/* Preview Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {renderMode === '3D' ? (
          <Canvas
            shadows
            camera={{
              position: [0, 0.3, 2.5],
              fov: 45,
              near: 0.1,
              far: 100,
            }}
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={0.9} castShadow />
            <directionalLight position={[-5, 3, -5]} intensity={0.3} />
            <directionalLight position={[0, 2, 4]} intensity={0.35} />

            <Suspense fallback={<LoadingIndicator />}>
              <Render3DComponent
                componentName={selectedComponent}
                config={config}
              />
            </Suspense>

            <OrbitControls
              enablePan={true}
              enableZoom={true}
              minDistance={0.5}
              maxDistance={10}
            />
          </Canvas>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#2a2a4a',
            }}
          >
            <div
              style={{
                width: '400px',
                height: config.showLegs ? '1050px' : '600px',
                maxHeight: '90vh',
                overflow: 'hidden',
              }}
            >
              <svg
                viewBox={`0 0 400 ${config.showLegs ? 1050 : 600}`}
                style={{ width: '100%', height: '100%' }}
              >
                <rect
                  width="400"
                  height={config.showLegs ? 1050 : 600}
                  fill="#6bc5e8"
                />
                <Render2DComponent
                  componentName={selectedComponent}
                  config={config}
                />
              </svg>
            </div>
          </div>
        )}

        {/* Component Info */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '10px 20px',
            borderRadius: '8px',
            color: 'white',
          }}
        >
          <strong>{selectedComponent}</strong>
          <span style={{ opacity: 0.7, marginLeft: '10px' }}>
            Detail Level: {config.detailLevel}
          </span>
        </div>
      </div>
    </div>
  );
}
