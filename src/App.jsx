import React, { useState, useCallback } from 'react';
import Avatar from './components/Avatar.jsx';
import Avatar3D from './components/Avatar3D.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';
import { useAnimationCycle } from './hooks/useAnimationCycle.js';

const INITIAL_CONFIG = {
  skinColor: '#ffd5c8',
  hairColor: '#2d1b4e',
  eyeColor: '#6b5ce7',
  clothesColor: '#ff6b9d',
  blinkInterval: 3000,
  animationSpeed: 1,
  enableIdleAnimation: true,
  enableRandomBlink: true,
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
            <Avatar
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
