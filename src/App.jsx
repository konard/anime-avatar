import React, { useState, useCallback } from 'react';
import AvatarSVG from './components/AvatarSVG.jsx';
import Avatar3D from './components/Avatar3D.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';
import { useAnimationCycle } from './hooks/useAnimationCycle.js';

const INITIAL_CONFIG = {
  // Colors matching reference image - school girl with brown hair
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
  // Render mode: 'svg' (new), 'css' (legacy), or '3d'
  renderMode: 'svg',
  // 3D specific settings
  enable3D: false,
  enableLOD: true,
  enableShadows: true,
  modelScale: 1,
  modelUrl: null,
};

function App() {
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [isTalking, setIsTalking] = useState(false);

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Anime Avatar</h1>
        <p>Configurable AI Avatar with Animations</p>
      </header>

      <main className="main-content">
        <section className="avatar-section">
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
        </section>

        <aside>
          <ConfigPanel
            config={config}
            onConfigChange={handleConfigChange}
            onAnimationTrigger={handleAnimationTrigger}
            isTalking={isTalking}
            onTalkingToggle={handleTalkingToggle}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
