import React, { useState, useCallback, useEffect, useMemo } from 'react';
import AvatarSVG from './components/AvatarSVG.jsx';
import Avatar3D from './components/Avatar3D.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';
import { useAnimationCycle } from './hooks/useAnimationCycle.js';

// Character model presets with specific colors
const CHARACTER_PRESETS = {
  isabella: {
    name: 'Isabella school student girl',
    skinColor: '#fad5c5',
    hairColor: '#b07850',
    eyeColor: '#4a90c2',
    clothesColor: '#ffffff',
    clothesSecondaryColor: '#1a3a5c',
    defaultBackground: 'cherry-blossom-road',
  },
  alice: {
    name: 'Alice school student girl',
    skinColor: '#fde8dc',
    hairColor: '#1a1a2e',
    eyeColor: '#7b68ee',
    clothesColor: '#ffffff',
    clothesSecondaryColor: '#1a3a5c',
    defaultBackground: 'plain-white',
  },
};

/**
 * Parse URL parameters for e2e testing support
 * Supports: ?model=isabella|alice&bg=cherry-blossom-road|plain-white|plain-gray&mode=2d|3d&showLegs=true|false&scale=number
 */
function parseUrlParams() {
  if (typeof window === 'undefined') {
    return {};
  }

  const params = new window.URLSearchParams(window.location.search);
  const result = {};

  const model = params.get('model');
  if (model && CHARACTER_PRESETS[model]) {
    result.characterModel = model;
    const preset = CHARACTER_PRESETS[model];
    result.skinColor = preset.skinColor;
    result.hairColor = preset.hairColor;
    result.eyeColor = preset.eyeColor;
    result.clothesColor = preset.clothesColor;
    result.clothesSecondaryColor = preset.clothesSecondaryColor;
    result.backgroundModel = preset.defaultBackground;
  }

  const bg = params.get('bg');
  if (bg && ['cherry-blossom-road', 'plain-white', 'plain-gray'].includes(bg)) {
    result.backgroundModel = bg;
  }

  const mode = params.get('mode');
  if (mode === '3d') {
    result.enable3D = true;
  } else if (mode === '2d') {
    result.enable3D = false;
  }

  // Support showLegs parameter (default: true)
  const showLegs = params.get('showLegs');
  if (showLegs === 'false' || showLegs === '0') {
    result.showLegs = false;
  } else if (showLegs === 'true' || showLegs === '1') {
    result.showLegs = true;
  }

  // Support scale parameter for character zoom
  const scale = params.get('scale');
  if (scale) {
    const scaleValue = parseFloat(scale);
    if (!isNaN(scaleValue) && scaleValue > 0) {
      result.characterScale = scaleValue;
      result.modelScale = scaleValue;
    }
  }

  return result;
}

const INITIAL_CONFIG = {
  // Colors matching reference image - Isabella (brown hair)
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
  // Detail level: 1 (minimal) to 10 (maximum detail)
  detailLevel: 10,
  // Whether to show full body with legs (enabled by default)
  showLegs: true,
  // Render mode: 'svg' (new), 'css' (legacy), or '3d'
  renderMode: 'svg',
  // 3D specific settings
  enable3D: false,
  enableLOD: true,
  enableShadows: true,
  modelScale: 1,
  modelUrl: null,
  // Character scale for 2D (similar to modelScale for 3D)
  characterScale: 1,
  // Model selection
  characterModel: 'isabella',
  backgroundModel: 'cherry-blossom-road',
};

function App() {
  // Memoize URL params to avoid re-parsing on every render
  const urlParams = useMemo(() => parseUrlParams(), []);

  // Merge URL params with initial config
  const initialConfigWithUrlParams = useMemo(
    () => ({ ...INITIAL_CONFIG, ...urlParams }),
    [urlParams]
  );

  const [config, setConfig] = useState(initialConfigWithUrlParams);
  const [isTalking, setIsTalking] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Update config when URL params change (for e2e testing)
  useEffect(() => {
    if (Object.keys(urlParams).length > 0) {
      setConfig((prev) => ({ ...prev, ...urlParams }));
    }
  }, [urlParams]);

  const { currentAnimation, triggerAnimation } = useAnimationCycle({
    enabled: config.enableIdleAnimation,
    minInterval: 8000,
    maxInterval: 20000,
    animationDuration: 1500,
  });

  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
  }, []);

  const handleAnimationTrigger = useCallback(
    (animation) => {
      triggerAnimation(animation);
    },
    [triggerAnimation]
  );

  const handleTalkingToggle = useCallback(() => {
    setIsTalking((prev) => !prev);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  return (
    <div className="app-fullscreen">
      {/* Fullscreen Avatar Area */}
      <div className="avatar-fullscreen">
        {config.enable3D ? (
          <Avatar3D
            config={config}
            isTalking={isTalking}
            currentAnimation={currentAnimation}
            modelUrl={config.modelUrl}
          />
        ) : (
          <AvatarSVG
            config={config}
            isTalking={isTalking}
            currentAnimation={currentAnimation}
          />
        )}
      </div>

      {/* Mobile Menu Toggle Button */}
      <button
        className={`menu-toggle ${isMenuOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle settings menu"
      >
        <span className="menu-icon"></span>
      </button>

      {/* Settings Panel - Right side, semi-transparent */}
      <aside className={`settings-panel ${isMenuOpen ? 'open' : ''}`}>
        <div className="settings-panel-content">
          <ConfigPanel
            config={config}
            onConfigChange={handleConfigChange}
            onAnimationTrigger={handleAnimationTrigger}
            isTalking={isTalking}
            onTalkingToggle={handleTalkingToggle}
          />
        </div>
      </aside>

      {/* Overlay for mobile when menu is open */}
      {isMenuOpen && <div className="menu-overlay" onClick={toggleMenu}></div>}
    </div>
  );
}

export default App;
