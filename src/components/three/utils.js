/* eslint-disable max-lines-per-function */
// Utility functions for 3D avatar components
import * as THREE from 'three';

/**
 * Adjust color brightness
 * @param {string} hex - Hex color value
 * @param {number} amount - Amount to adjust (-1 to 1, represents percentage change)
 * @returns {THREE.Color} Adjusted THREE.Color object
 */
export function adjustColor(hex, amount) {
  const color = new THREE.Color(hex);
  if (typeof color.offsetHSL === 'function') {
    color.offsetHSL(0, 0, amount);
  }
  return color;
}

/**
 * Create a standard material with common settings
 * @param {string} color - Hex color
 * @param {object} options - Additional material options
 * @returns {THREE.MeshStandardMaterial}
 */
export function createMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    ...options,
  });
}

/**
 * Get the number of shapes to use based on detail level
 * Detail levels: 1 = minimal, 2-10 = increasing detail
 * @param {number} detailLevel - The detail level (1-10)
 * @param {string} component - The component type
 * @returns {object} Shape budget for the component
 */
export function getDetailLevel3D(detailLevel, component) {
  const levels = {
    // Level 1: Just head sphere and sky
    1: {
      head: { segments: 8, hasEyes: false, hasNose: false, hasMouth: false },
      hair: { segments: 0, hasStrands: false, hasHighlights: false },
      eyes: { segments: 0 },
      body: { segments: 0, hasArms: false, hasClothes: false },
      legs: { segments: 0 },
      background: { segments: 4, hasTrees: false, hasPetals: false },
    },
    // Level 2-3: Basic features
    2: {
      head: { segments: 12, hasEyes: false, hasNose: false, hasMouth: false },
      hair: { segments: 8, hasStrands: false, hasHighlights: false },
      eyes: { segments: 0 },
      body: { segments: 0, hasArms: false, hasClothes: false },
      legs: { segments: 0 },
      background: { segments: 6, hasTrees: false, hasPetals: false },
    },
    3: {
      head: { segments: 16, hasEyes: true, hasNose: false, hasMouth: false },
      hair: { segments: 10, hasStrands: false, hasHighlights: false },
      eyes: { segments: 8 },
      body: { segments: 0, hasArms: false, hasClothes: false },
      legs: { segments: 0 },
      background: { segments: 8, hasTrees: false, hasPetals: false },
    },
    // Level 4-5: Add more facial features
    4: {
      head: { segments: 20, hasEyes: true, hasNose: false, hasMouth: true },
      hair: { segments: 12, hasStrands: false, hasHighlights: false },
      eyes: { segments: 12 },
      body: { segments: 0, hasArms: false, hasClothes: false },
      legs: { segments: 0 },
      background: { segments: 10, hasTrees: true, hasPetals: false },
    },
    5: {
      head: {
        segments: 24,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasCheeks: false,
      },
      hair: { segments: 16, hasStrands: true, hasHighlights: false },
      eyes: { segments: 16, hasIrisDetail: true },
      body: { segments: 12, hasArms: false, hasClothes: true },
      legs: { segments: 0 },
      background: { segments: 12, hasTrees: true, hasPetals: true },
    },
    // Level 6-7: Add body and more detail
    6: {
      head: {
        segments: 28,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasCheeks: true,
        hasBlush: true,
      },
      hair: { segments: 20, hasStrands: true, hasHighlights: true },
      eyes: { segments: 20, hasIrisDetail: true, hasHighlights: true },
      body: { segments: 16, hasArms: true, hasClothes: true },
      legs: { segments: 0 },
      background: { segments: 14, hasTrees: true, hasPetals: true },
    },
    7: {
      head: {
        segments: 32,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasCheeks: true,
        hasBlush: true,
        hasEars: true,
      },
      hair: {
        segments: 24,
        hasStrands: true,
        hasHighlights: true,
        hasAhoge: true,
      },
      eyes: {
        segments: 24,
        hasIrisDetail: true,
        hasHighlights: true,
        hasEyelashes: true,
      },
      body: { segments: 20, hasArms: true, hasClothes: true, hasCollar: true },
      legs: { segments: 12 },
      background: {
        segments: 16,
        hasTrees: true,
        hasPetals: true,
        hasCity: true,
      },
    },
    // Level 8-9: High detail
    8: {
      head: {
        segments: 32,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasCheeks: true,
        hasBlush: true,
        hasEars: true,
        hasChin: true,
      },
      hair: {
        segments: 28,
        hasStrands: true,
        hasHighlights: true,
        hasAhoge: true,
        hasFlowingStrands: true,
      },
      eyes: {
        segments: 28,
        hasIrisDetail: true,
        hasHighlights: true,
        hasEyelashes: true,
        hasReflections: true,
      },
      body: {
        segments: 24,
        hasArms: true,
        hasClothes: true,
        hasCollar: true,
        hasBow: true,
      },
      legs: { segments: 16, hasShoes: true },
      background: {
        segments: 18,
        hasTrees: true,
        hasPetals: true,
        hasCity: true,
        hasFence: true,
      },
    },
    9: {
      head: {
        segments: 32,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasCheeks: true,
        hasBlush: true,
        hasEars: true,
        hasChin: true,
        hasShadows: true,
      },
      hair: {
        segments: 32,
        hasStrands: true,
        hasHighlights: true,
        hasAhoge: true,
        hasFlowingStrands: true,
        hasShadows: true,
      },
      eyes: {
        segments: 32,
        hasIrisDetail: true,
        hasHighlights: true,
        hasEyelashes: true,
        hasReflections: true,
        hasSparkles: true,
      },
      body: {
        segments: 28,
        hasArms: true,
        hasClothes: true,
        hasCollar: true,
        hasBow: true,
        hasSkirt: true,
      },
      legs: { segments: 20, hasShoes: true, hasDetails: true },
      background: {
        segments: 20,
        hasTrees: true,
        hasPetals: true,
        hasCity: true,
        hasFence: true,
      },
    },
    // Level 10: Maximum detail
    10: {
      head: {
        segments: 32,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasCheeks: true,
        hasBlush: true,
        hasEars: true,
        hasChin: true,
        hasShadows: true,
        hasHighlights: true,
      },
      hair: {
        segments: 32,
        hasStrands: true,
        hasHighlights: true,
        hasAhoge: true,
        hasFlowingStrands: true,
        hasShadows: true,
        hasShine: true,
      },
      eyes: {
        segments: 32,
        hasIrisDetail: true,
        hasHighlights: true,
        hasEyelashes: true,
        hasReflections: true,
        hasSparkles: true,
        hasPatterns: true,
      },
      body: {
        segments: 32,
        hasArms: true,
        hasClothes: true,
        hasCollar: true,
        hasBow: true,
        hasSkirt: true,
        hasBag: true,
      },
      legs: { segments: 24, hasShoes: true, hasDetails: true, hasSocks: true },
      background: {
        segments: 24,
        hasTrees: true,
        hasPetals: true,
        hasCity: true,
        hasFence: true,
        petalCount: 50,
      },
    },
  };

  const level = Math.min(10, Math.max(1, detailLevel || 10));
  return levels[level][component] || levels[10][component];
}

/**
 * Default configuration for 3D avatar components
 */
export const DEFAULT_CONFIG = {
  skinColor: '#fad5c5',
  hairColor: '#b07850',
  eyeColor: '#4a90c2',
  clothesColor: '#ffffff',
  clothesSecondaryColor: '#1a3a5c',
  detailLevel: 10,
  blinkInterval: 3000,
  animationSpeed: 1,
  enableIdleAnimation: true,
  enableRandomBlink: true,
  enableLOD: true,
  enableShadows: true,
  showBackground: true,
  showLegs: true, // Legs enabled by default
  // Camera position: zoomed in on head/upper body
  // y=0.6 centers on face, z=1.8 brings camera closer for better detail
  // These can be overridden by cameraY and cameraZ URL params for render-level alignment
  cameraY: 0.6,
  cameraZ: 1.8,
  modelScale: 1,
  characterScale: 1,
  characterModel: 'school-girl',
  backgroundModel: 'cherry-blossom-road',
};
