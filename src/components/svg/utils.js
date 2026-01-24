/* eslint-disable max-lines-per-function */
// Utility functions for SVG avatar components

/**
 * Adjust color brightness
 * @param {string} hex - Hex color value
 * @param {number} amount - Amount to adjust (-255 to 255)
 * @returns {string} Adjusted hex color
 */
export function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Get the number of shapes to use based on detail level
 * Detail levels: 1 = minimal (circle face + sky), 2-10 = increasing detail
 * @param {number} detailLevel - The detail level (1-10)
 * @param {string} component - The component type
 * @returns {object} Shape budget for the component
 */
export function getDetailLevel(detailLevel, component) {
  const levels = {
    // Level 1: Just face circle and background
    1: {
      face: { shapes: 1, hasEyes: false, hasNose: false, hasMouth: false },
      hair: { shapes: 0, hasStrands: false, hasHighlights: false },
      eyes: { shapes: 0 },
      body: { shapes: 0, hasArms: false, hasClothes: false },
      legs: { shapes: 0 },
      background: { shapes: 1, hasTrees: false, hasPetals: false },
    },
    // Level 2: Face + basic background
    2: {
      face: { shapes: 2, hasEyes: false, hasNose: false, hasMouth: false },
      hair: { shapes: 1, hasStrands: false, hasHighlights: false },
      eyes: { shapes: 0 },
      body: { shapes: 0, hasArms: false, hasClothes: false },
      legs: { shapes: 0 },
      background: { shapes: 2, hasTrees: false, hasPetals: false },
    },
    // Level 3: Add simple hair
    3: {
      face: { shapes: 3, hasEyes: true, hasNose: false, hasMouth: false },
      hair: { shapes: 3, hasStrands: false, hasHighlights: false },
      eyes: { shapes: 2 },
      body: { shapes: 0, hasArms: false, hasClothes: false },
      legs: { shapes: 0 },
      background: { shapes: 3, hasTrees: false, hasPetals: false },
    },
    // Level 4: Add eyes
    4: {
      face: { shapes: 4, hasEyes: true, hasNose: false, hasMouth: true },
      hair: { shapes: 4, hasStrands: false, hasHighlights: false },
      eyes: { shapes: 4 },
      body: { shapes: 0, hasArms: false, hasClothes: false },
      legs: { shapes: 0 },
      background: { shapes: 4, hasTrees: true, hasPetals: false },
    },
    // Level 5: Add nose and mouth
    5: {
      face: { shapes: 6, hasEyes: true, hasNose: true, hasMouth: true },
      hair: { shapes: 6, hasStrands: true, hasHighlights: false },
      eyes: { shapes: 6, hasIrisDetail: true },
      body: { shapes: 2, hasArms: false, hasClothes: true },
      legs: { shapes: 0 },
      background: { shapes: 6, hasTrees: true, hasPetals: true },
    },
    // Level 6: Add body with simple clothes
    6: {
      face: {
        shapes: 8,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasBlush: true,
      },
      hair: { shapes: 8, hasStrands: true, hasHighlights: true },
      eyes: { shapes: 8, hasIrisDetail: true, hasHighlights: true },
      body: { shapes: 4, hasArms: true, hasClothes: true },
      legs: { shapes: 0 },
      background: {
        shapes: 8,
        hasTrees: true,
        hasPetals: true,
        hasCity: false,
      },
    },
    // Level 7: Add arms and more detail
    7: {
      face: {
        shapes: 10,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasBlush: true,
        hasEars: true,
      },
      hair: {
        shapes: 10,
        hasStrands: true,
        hasHighlights: true,
        hasAhoge: true,
      },
      eyes: {
        shapes: 10,
        hasIrisDetail: true,
        hasHighlights: true,
        hasEyelashes: true,
      },
      body: { shapes: 6, hasArms: true, hasClothes: true, hasCollar: true },
      legs: { shapes: 2 },
      background: {
        shapes: 10,
        hasTrees: true,
        hasPetals: true,
        hasCity: true,
        hasFence: true,
      },
    },
    // Level 8: Add legs (like Genshin Impact)
    8: {
      face: {
        shapes: 12,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasBlush: true,
        hasEars: true,
      },
      hair: {
        shapes: 12,
        hasStrands: true,
        hasHighlights: true,
        hasAhoge: true,
        hasFlowingStrands: true,
      },
      eyes: {
        shapes: 12,
        hasIrisDetail: true,
        hasHighlights: true,
        hasEyelashes: true,
        hasReflections: true,
      },
      body: {
        shapes: 8,
        hasArms: true,
        hasClothes: true,
        hasCollar: true,
        hasBow: true,
        hasSkirt: true,
      },
      legs: { shapes: 4, hasShoes: true },
      background: {
        shapes: 12,
        hasTrees: true,
        hasPetals: true,
        hasCity: true,
        hasFence: true,
      },
    },
    // Level 9: High detail
    9: {
      face: {
        shapes: 16,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasBlush: true,
        hasEars: true,
        hasShadows: true,
      },
      hair: {
        shapes: 16,
        hasStrands: true,
        hasHighlights: true,
        hasAhoge: true,
        hasFlowingStrands: true,
        hasShadows: true,
      },
      eyes: {
        shapes: 16,
        hasIrisDetail: true,
        hasHighlights: true,
        hasEyelashes: true,
        hasReflections: true,
        hasPatterns: true,
      },
      body: {
        shapes: 10,
        hasArms: true,
        hasClothes: true,
        hasCollar: true,
        hasBow: true,
        hasSkirt: true,
        hasDetails: true,
      },
      legs: { shapes: 6, hasShoes: true, hasDetails: true },
      background: {
        shapes: 14,
        hasTrees: true,
        hasPetals: true,
        hasCity: true,
        hasFence: true,
        hasClouds: true,
      },
    },
    // Level 10: Maximum detail (reference image quality)
    10: {
      face: {
        shapes: 20,
        hasEyes: true,
        hasNose: true,
        hasMouth: true,
        hasBlush: true,
        hasEars: true,
        hasShadows: true,
        hasHighlights: true,
      },
      hair: {
        shapes: 20,
        hasStrands: true,
        hasHighlights: true,
        hasAhoge: true,
        hasFlowingStrands: true,
        hasShadows: true,
        hasShine: true,
      },
      eyes: {
        shapes: 20,
        hasIrisDetail: true,
        hasHighlights: true,
        hasEyelashes: true,
        hasReflections: true,
        hasPatterns: true,
        hasSparkles: true,
      },
      body: {
        shapes: 14,
        hasArms: true,
        hasClothes: true,
        hasCollar: true,
        hasBow: true,
        hasSkirt: true,
        hasDetails: true,
        hasBag: true,
      },
      legs: { shapes: 8, hasShoes: true, hasDetails: true, hasSocks: true },
      background: {
        shapes: 18,
        hasTrees: true,
        hasPetals: true,
        hasCity: true,
        hasFence: true,
        hasClouds: true,
        hasPowerLines: true,
      },
    },
  };

  // Default to level 10 if out of range
  const level = Math.min(10, Math.max(1, detailLevel || 10));
  return levels[level][component] || levels[10][component];
}

/**
 * Default configuration for avatar components
 */
export const DEFAULT_CONFIG = {
  skinColor: '#fad5c5',
  hairColor: '#b07850',
  eyeColor: '#4a90c2',
  clothesColor: '#ffffff',
  clothesSecondaryColor: '#1a3a5c',
  detailLevel: 10,
  enableAnimations: true,
  showLegs: true, // Legs enabled by default
  showBackground: true,
  characterScale: 1,
  characterModel: 'school-girl',
  backgroundModel: 'cherry-blossom-road',
};
