import React, { useState } from 'react';
import AvatarSVG from '../components/AvatarSVG.jsx';
import { useAnimationCycle } from '../hooks/useAnimationCycle.js';
import '../styles/index.css';

const PRESETS = [
  {
    name: 'Schoolgirl',
    skin: '#fad5c5',
    hair: '#b07850',
    eye: '#4a90c2',
    clothes: '#ffffff',
    clothesSecondary: '#1a3a5c',
  },
  {
    name: 'Blonde',
    skin: '#ffe4c4',
    hair: '#f0c050',
    eye: '#00bfff',
    clothes: '#ffffff',
    clothesSecondary: '#1a3a5c',
  },
  {
    name: 'Dark',
    skin: '#e0b090',
    hair: '#2a1a0a',
    eye: '#5a4030',
    clothes: '#ffffff',
    clothesSecondary: '#1a3a5c',
  },
  {
    name: 'Pink',
    skin: '#ffd5c8',
    hair: '#ff69b4',
    eye: '#ff1493',
    clothes: '#ffffff',
    clothesSecondary: '#ff6b9d',
  },
];

const ANIMATIONS = ['happy', 'wave', 'nod', 'thinking', 'surprised'];

const INITIAL_CONFIG = {
  skinColor: '#fad5c5',
  hairColor: '#b07850',
  eyeColor: '#4a90c2',
  clothesColor: '#ffffff',
  clothesSecondaryColor: '#1a3a5c',
  blinkInterval: 3000,
  animationSpeed: 1,
  enableIdleAnimation: true,
  enableRandomBlink: true,
  showBackground: true,
  enable3D: false,
};

export function Test2D() {
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [isTalking, setIsTalking] = useState(false);

  const { currentAnimation, triggerAnimation } = useAnimationCycle({
    enabled: config.enableIdleAnimation,
    minInterval: 8000,
    maxInterval: 20000,
    animationDuration: 1500,
  });

  const handleChange = (key, value) => setConfig({ ...config, [key]: value });

  const applyPreset = (preset) =>
    setConfig({
      ...config,
      skinColor: preset.skin,
      hairColor: preset.hair,
      eyeColor: preset.eye,
      clothesColor: preset.clothes,
      clothesSecondaryColor: preset.clothesSecondary || '#1a3a5c',
    });

  return (
    <div className="app">
      <header className="app-header">
        <h1>2D SVG Avatar Test</h1>
        <p>Testing SVG-based 2D rendering</p>
      </header>

      <main className="main-content">
        <section className="avatar-section">
          <AvatarSVG
            config={config}
            isTalking={isTalking}
            currentAnimation={currentAnimation}
          />
        </section>

        <aside>
          <div className="config-section">
            <h2>2D Avatar Controls</h2>

            <div className="config-group">
              <h3>Background</h3>
              <div className="config-item checkbox-group">
                <input
                  type="checkbox"
                  id="showBackground"
                  checked={config.showBackground}
                  onChange={(e) =>
                    handleChange('showBackground', e.target.checked)
                  }
                />
                <label htmlFor="showBackground">
                  Show Cherry Blossom Background
                </label>
              </div>
            </div>

            <div className="config-group">
              <h3>Colors</h3>
              <div className="config-item">
                <label>Skin Color</label>
                <input
                  type="color"
                  value={config.skinColor}
                  onChange={(e) => handleChange('skinColor', e.target.value)}
                />
              </div>
              <div className="config-item">
                <label>Hair Color</label>
                <input
                  type="color"
                  value={config.hairColor}
                  onChange={(e) => handleChange('hairColor', e.target.value)}
                />
              </div>
              <div className="config-item">
                <label>Eye Color</label>
                <input
                  type="color"
                  value={config.eyeColor}
                  onChange={(e) => handleChange('eyeColor', e.target.value)}
                />
              </div>
            </div>

            <div className="config-group">
              <h3>Trigger Animation</h3>
              <div className="button-group">
                {ANIMATIONS.map((anim) => (
                  <button
                    key={anim}
                    className="btn btn-secondary"
                    onClick={() => triggerAnimation(anim)}
                  >
                    {anim.charAt(0).toUpperCase() + anim.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="config-group">
              <h3>Speaking Mode</h3>
              <div className="button-group">
                <button
                  className={`btn ${isTalking ? 'btn-active' : 'btn-primary'}`}
                  onClick={() => setIsTalking(!isTalking)}
                >
                  {isTalking ? 'Stop Talking' : 'Start Talking'}
                </button>
              </div>
              <div className="status-indicator" style={{ marginTop: '10px' }}>
                <span
                  className={`status-dot ${isTalking ? 'talking' : ''}`}
                ></span>
                <span>{isTalking ? 'Speaking...' : 'Silent'}</span>
              </div>
            </div>

            <div className="config-group">
              <h3>Presets</h3>
              <div className="button-group">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    className="btn btn-secondary"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="config-group">
              <h3>Navigation</h3>
              <div className="button-group">
                <a href="/" className="btn btn-secondary">
                  Main App
                </a>
                <a href="/test-3d.html" className="btn btn-secondary">
                  Test 3D
                </a>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default Test2D;
