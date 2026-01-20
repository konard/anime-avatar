import React, { useState, useEffect } from 'react';
import '../styles/avatar.css';

const DEFAULT_CONFIG = {
  skinColor: '#ffd5c8',
  hairColor: '#2d1b4e',
  eyeColor: '#6b5ce7',
  clothesColor: '#ff6b9d',
  blinkInterval: 3000,
  animationSpeed: 1,
  enableIdleAnimation: true,
  enableRandomBlink: true,
};

const ANIMATIONS = ['idle', 'happy', 'wave', 'nod', 'thinking', 'surprised'];

export function Avatar({
  config = {},
  isTalking = false,
  currentAnimation = null,
}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [isBlinking, setIsBlinking] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState('idle');
  const [mouthState, setMouthState] = useState('normal');

  // Handle blinking
  useEffect(() => {
    if (!mergedConfig.enableRandomBlink) {
      return;
    }

    const scheduleNextBlink = () => {
      const variance = Math.random() * 2000 - 1000;
      const interval = mergedConfig.blinkInterval + variance;

      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        scheduleNextBlink();
      }, interval);
    };

    const timeoutId = scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, [mergedConfig.blinkInterval, mergedConfig.enableRandomBlink]);

  // Handle current animation
  useEffect(() => {
    if (currentAnimation && ANIMATIONS.includes(currentAnimation)) {
      setActiveAnimation(currentAnimation);
    } else if (mergedConfig.enableIdleAnimation) {
      setActiveAnimation('idle');
    }
  }, [currentAnimation, mergedConfig.enableIdleAnimation]);

  // Handle talking state
  useEffect(() => {
    if (isTalking) {
      setMouthState('talking');
    } else {
      setMouthState('normal');
    }
  }, [isTalking]);

  const cssVars = {
    '--skin-color': mergedConfig.skinColor,
    '--hair-color': mergedConfig.hairColor,
    '--eye-color': mergedConfig.eyeColor,
    '--clothes-color': mergedConfig.clothesColor,
    '--animation-speed': mergedConfig.animationSpeed,
  };

  return (
    <div className="avatar-container" style={cssVars}>
      <div className={`avatar ${activeAnimation}`}>
        {/* Hair back layer */}
        <div className="avatar-hair-back" />

        {/* Ears */}
        <div className="avatar-ear" />
        <div className="avatar-ear" />

        {/* Head */}
        <div className="avatar-head" />

        {/* Hair front (bangs) */}
        <div className="avatar-hair-front" />

        {/* Hair strands */}
        <div className="avatar-hair-strand" />
        <div className="avatar-hair-strand" />

        {/* Eyebrows */}
        <div className="avatar-eyebrows">
          <div className="avatar-eyebrow" />
          <div className="avatar-eyebrow" />
        </div>

        {/* Eyes */}
        <div className="avatar-eyes">
          <div className={`avatar-eye ${isBlinking ? 'blinking' : ''}`}>
            <div className="avatar-eyelid" />
            <div className="avatar-eye-iris" />
            <div className="avatar-eye-pupil" />
            <div className="avatar-eye-highlight" />
            <div className="avatar-eye-highlight-small" />
          </div>
          <div className={`avatar-eye ${isBlinking ? 'blinking' : ''}`}>
            <div className="avatar-eyelid" />
            <div className="avatar-eye-iris" />
            <div className="avatar-eye-pupil" />
            <div className="avatar-eye-highlight" />
            <div className="avatar-eye-highlight-small" />
          </div>
        </div>

        {/* Blush */}
        <div className="avatar-blush" />
        <div className="avatar-blush" />

        {/* Nose */}
        <div className="avatar-nose" />

        {/* Mouth */}
        <div className={`avatar-mouth ${mouthState}`}>
          <div className="avatar-mouth-shape" />
        </div>

        {/* Neck */}
        <div className="avatar-neck" />

        {/* Collar */}
        <div className="avatar-collar" />

        {/* Body */}
        <div className="avatar-body">
          <div className="avatar-torso" />
          <div className="avatar-arm">
            <div className="avatar-hand" />
          </div>
          <div className="avatar-arm">
            <div className="avatar-hand" />
          </div>
        </div>
      </div>
    </div>
  );
}

Avatar.ANIMATIONS = ANIMATIONS;
Avatar.DEFAULT_CONFIG = DEFAULT_CONFIG;

export default Avatar;
