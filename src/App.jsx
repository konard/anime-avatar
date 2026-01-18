import React, { useState, useCallback } from 'react';
import Avatar from './components/Avatar.jsx';
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
          <Avatar
            config={config}
            isTalking={isTalking}
            currentAnimation={currentAnimation}
          />
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
