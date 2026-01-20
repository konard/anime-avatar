import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_OPTIONS = {
  animations: ['idle', 'happy', 'wave', 'nod', 'thinking', 'surprised'],
  minInterval: 5000,
  maxInterval: 15000,
  animationDuration: 1000,
  enabled: true,
  excludeFromCycle: ['idle'],
};

export function useAnimationCycle(options = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const [currentAnimation, setCurrentAnimation] = useState('idle');
  const [isManualAnimation, setIsManualAnimation] = useState(false);
  const timeoutRef = useRef(null);
  const animationTimeoutRef = useRef(null);

  const getRandomAnimation = useCallback(() => {
    const cycleAnimations = mergedOptions.animations.filter(
      (anim) => !mergedOptions.excludeFromCycle.includes(anim)
    );
    const randomIndex = Math.floor(Math.random() * cycleAnimations.length);
    return cycleAnimations[randomIndex];
  }, [mergedOptions.animations, mergedOptions.excludeFromCycle]);

  const getRandomInterval = useCallback(
    () =>
      Math.random() * (mergedOptions.maxInterval - mergedOptions.minInterval) +
      mergedOptions.minInterval,
    [mergedOptions.minInterval, mergedOptions.maxInterval]
  );

  const triggerAnimation = useCallback(
    (animation) => {
      setIsManualAnimation(true);
      setCurrentAnimation(animation);

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      animationTimeoutRef.current = setTimeout(() => {
        setCurrentAnimation('idle');
        setIsManualAnimation(false);
      }, mergedOptions.animationDuration);
    },
    [mergedOptions.animationDuration]
  );

  useEffect(() => {
    if (!mergedOptions.enabled || isManualAnimation) {
      return;
    }

    const scheduleNextAnimation = () => {
      const interval = getRandomInterval();

      timeoutRef.current = setTimeout(() => {
        const animation = getRandomAnimation();
        setCurrentAnimation(animation);

        animationTimeoutRef.current = setTimeout(() => {
          setCurrentAnimation('idle');
          scheduleNextAnimation();
        }, mergedOptions.animationDuration);
      }, interval);
    };

    scheduleNextAnimation();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [
    mergedOptions.enabled,
    mergedOptions.animationDuration,
    isManualAnimation,
    getRandomAnimation,
    getRandomInterval,
  ]);

  return {
    currentAnimation,
    triggerAnimation,
    setCurrentAnimation,
  };
}

export default useAnimationCycle;
