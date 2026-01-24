/**
 * DEPRECATED: This approach was replaced by render-level alignment.
 *
 * Analyze facial landmarks in reference and render images - Version 2
 * Uses more specific color detection for the anime reference style
 *
 * NOTE: Alignment is now achieved through render parameters (cameraY, cameraZ, scale)
 * rather than post-processing image transformations.
 *
 * Usage: node experiments/analyze-landmarks-v2.js
 */

import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Image paths
const IMAGES = {
  ref2d: path.join(__dirname, '../reference-images/alice/2d-reference.png'),
  ref3d: path.join(__dirname, '../reference-images/alice/3d-reference.png'),
  render2d: path.join(__dirname, '../renders/alice-2d-render.png'),
  render3d: path.join(__dirname, '../renders/alice-3d-render.png'),
};

/**
 * Check if color is a bright purple/violet (eye iris color)
 * Alice's eye color should be bright purple/violet
 */
function isEyePurple(r, g, b) {
  // Bright purple: R ~100-180, G ~50-120, B >180
  // Looking for the distinct purple iris color
  const isViolet =
    r > 80 &&
    r < 200 && // Medium red
    g < 140 && // Low-medium green
    b > 160 && // High blue
    b > r && // Blue dominant over red
    b > g + 50; // Blue significantly higher than green
  return isViolet;
}

/**
 * Check if color is red (bow/ribbon)
 */
function isRed(r, g, b) {
  return r > 180 && g < 80 && b < 80;
}

/**
 * Check if color is skin-like pink/peach (for mouth detection)
 */
function isMouthPink(r, g, b) {
  // Looking for pink-ish mouth color
  return r > 180 && g > 100 && g < 180 && b > 100 && b < 180 && r > g && r > b;
}

/**
 * Check if pixel is likely part of the face (skin-colored)
 */
function isSkinColor(r, g, b) {
  // Light skin tone
  return r > 200 && g > 160 && b > 140 && r > g && g > b * 0.9;
}

/**
 * Check if pixel is white (for detecting white of eyes)
 */
function isWhite(r, g, b) {
  return r > 240 && g > 240 && b > 240;
}

/**
 * Check if pixel is dark (for detecting hair, pupils, etc.)
 */
function isDark(r, g, b) {
  return r < 60 && g < 60 && b < 80;
}

/**
 * Find purple eye regions (iris)
 */
function findEyeRegions(png) {
  const { width, height, data } = png;
  const points = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > 128 && isEyePurple(r, g, b)) {
        points.push({ x, y, r, g, b });
      }
    }
  }

  if (points.length < 10) {
    console.log('    Warning: Very few purple pixels found:', points.length);
    return { left: null, right: null, midpoint: null, eyeDistance: null };
  }

  // Cluster points into left and right eye by X position
  const midX = width / 2;

  // Find the Y range where most purple pixels are (this should be eye level)
  const yHist = {};
  points.forEach((p) => {
    const yBin = Math.floor(p.y / 10) * 10;
    yHist[yBin] = (yHist[yBin] || 0) + 1;
  });

  // Find the Y bin with most purple pixels
  let maxYBin = 0;
  let maxCount = 0;
  for (const [yBin, count] of Object.entries(yHist)) {
    if (count > maxCount) {
      maxCount = count;
      maxYBin = parseInt(yBin);
    }
  }

  console.log(
    `    Eye level detected around Y=${maxYBin} (${maxCount} pixels in bin)`
  );

  // Filter points to only those near the detected eye level (+/- 50 pixels)
  const eyeLevelPoints = points.filter((p) => Math.abs(p.y - maxYBin) < 60);

  console.log(`    Filtered to ${eyeLevelPoints.length} points near eye level`);

  // Split into left and right
  const leftPoints = eyeLevelPoints.filter((p) => p.x < midX);
  const rightPoints = eyeLevelPoints.filter((p) => p.x >= midX);

  const calcCenter = (pts) => {
    if (pts.length === 0) {
      return null;
    }
    const sumX = pts.reduce((sum, p) => sum + p.x, 0);
    const sumY = pts.reduce((sum, p) => sum + p.y, 0);
    return {
      x: Math.round(sumX / pts.length),
      y: Math.round(sumY / pts.length),
    };
  };

  const leftCenter = calcCenter(leftPoints);
  const rightCenter = calcCenter(rightPoints);

  let midpoint = null;
  let eyeDistance = null;

  if (leftCenter && rightCenter) {
    midpoint = {
      x: Math.round((leftCenter.x + rightCenter.x) / 2),
      y: Math.round((leftCenter.y + rightCenter.y) / 2),
    };
    eyeDistance = Math.sqrt(
      Math.pow(rightCenter.x - leftCenter.x, 2) +
        Math.pow(rightCenter.y - leftCenter.y, 2)
    );
  }

  return {
    left: leftCenter
      ? { center: leftCenter, pixelCount: leftPoints.length }
      : null,
    right: rightCenter
      ? { center: rightCenter, pixelCount: rightPoints.length }
      : null,
    midpoint,
    eyeDistance,
  };
}

/**
 * Find red bow/ribbon region
 */
function findRedRegion(png) {
  const { width, height, data } = png;
  const points = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > 128 && isRed(r, g, b)) {
        points.push({ x, y });
      }
    }
  }

  if (points.length === 0) {
    return null;
  }

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  return {
    center: {
      x: Math.round((minX + maxX) / 2),
      y: Math.round((minY + maxY) / 2),
    },
    bounds: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY },
    pixelCount: points.length,
  };
}

/**
 * Estimate face center based on skin color distribution
 */
function findFaceCenter(png) {
  const { width, height, data } = png;
  let minX = width,
    maxX = 0,
    minY = height,
    maxY = 0;
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > 128 && isSkinColor(r, g, b)) {
        if (x < minX) {
          minX = x;
        }
        if (x > maxX) {
          maxX = x;
        }
        if (y < minY) {
          minY = y;
        }
        if (y > maxY) {
          maxY = y;
        }
        count++;
      }
    }
  }

  if (count === 0) {
    return null;
  }

  return {
    center: {
      x: Math.round((minX + maxX) / 2),
      y: Math.round((minY + maxY) / 2),
    },
    bounds: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY },
    pixelCount: count,
  };
}

/**
 * Analyze a single image
 */
function analyzeImage(imagePath, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing: ${label}`);
  console.log(`File: ${path.basename(imagePath)}`);
  console.log(`${'='.repeat(60)}`);

  if (!fs.existsSync(imagePath)) {
    console.log('  File not found!');
    return null;
  }

  const buffer = fs.readFileSync(imagePath);
  const png = PNG.sync.read(buffer);

  console.log(`  Dimensions: ${png.width} x ${png.height}`);

  // Find eyes (purple iris regions)
  console.log('\n  EYES (Purple iris detection):');
  const eyes = findEyeRegions(png);

  if (eyes.left) {
    console.log(
      `    Left eye center: (${eyes.left.center.x}, ${eyes.left.center.y}) - ${eyes.left.pixelCount} pixels`
    );
  } else {
    console.log('    Left eye: NOT FOUND');
  }
  if (eyes.right) {
    console.log(
      `    Right eye center: (${eyes.right.center.x}, ${eyes.right.center.y}) - ${eyes.right.pixelCount} pixels`
    );
  } else {
    console.log('    Right eye: NOT FOUND');
  }
  if (eyes.midpoint) {
    console.log(`    Eyes midpoint: (${eyes.midpoint.x}, ${eyes.midpoint.y})`);
    console.log(`    Eye distance: ${Math.round(eyes.eyeDistance)} pixels`);
  }

  // Find red bow/ribbon
  console.log('\n  RED BOW (Ribbon on uniform):');
  const bow = findRedRegion(png);
  if (bow) {
    console.log(`    Center: (${bow.center.x}, ${bow.center.y})`);
    console.log(`    Size: ${bow.bounds.width}x${bow.bounds.height}`);
  } else {
    console.log('    NOT FOUND');
  }

  // Find face (skin region)
  console.log('\n  FACE (Skin region):');
  const face = findFaceCenter(png);
  if (face) {
    console.log(`    Center: (${face.center.x}, ${face.center.y})`);
    console.log(`    Bounds: ${face.bounds.width}x${face.bounds.height}`);
    console.log(`    Top of face Y: ${face.bounds.minY}`);
  } else {
    console.log('    NOT FOUND');
  }

  // Estimate nose position (between eyes and mouth, closer to eyes)
  let nose = null;
  if (eyes.midpoint && bow) {
    // Nose is roughly 1/3 of the way from eyes to bow
    const noseY = Math.round(
      eyes.midpoint.y + (bow.center.y - eyes.midpoint.y) * 0.35
    );
    nose = {
      x: eyes.midpoint.x,
      y: noseY,
      estimated: true,
    };
  } else if (eyes.midpoint) {
    // If no bow found, estimate nose at 20% below eye level
    nose = {
      x: eyes.midpoint.x,
      y: Math.round(eyes.midpoint.y * 1.15),
      estimated: true,
    };
  }

  if (nose) {
    console.log(`\n  NOSE (Estimated):
    Center: (${nose.x}, ${nose.y})`);
  }

  // Calculate relative positions
  console.log('\n  RELATIVE POSITIONS (% of image height/width):');
  if (eyes.midpoint) {
    console.log(
      `    Eyes Y: ${((eyes.midpoint.y / png.height) * 100).toFixed(1)}%`
    );
    console.log(
      `    Eye distance: ${((eyes.eyeDistance / png.width) * 100).toFixed(1)}% of width`
    );
  }
  if (nose) {
    console.log(`    Nose Y: ${((nose.y / png.height) * 100).toFixed(1)}%`);
  }
  if (bow) {
    console.log(
      `    Bow Y: ${((bow.center.y / png.height) * 100).toFixed(1)}%`
    );
  }

  return {
    width: png.width,
    height: png.height,
    eyes,
    nose,
    bow,
    face,
  };
}

// Main analysis
console.log('FACIAL LANDMARK ANALYSIS V2 - Improved Detection');
console.log('================================================\n');

const results = {};

// Analyze all images
for (const [key, imagePath] of Object.entries(IMAGES)) {
  const label = key.replace('ref', 'Reference ').replace('render', 'Render ');
  results[key] = analyzeImage(imagePath, label);
}

// Calculate alignment parameters
console.log(`\n${'='.repeat(60)}`);
console.log('ALIGNMENT PARAMETERS');
console.log('='.repeat(60));

function calcAlignmentParams(refKey, renderKey, mode) {
  const ref = results[refKey];
  const render = results[renderKey];

  console.log(`\n${mode.toUpperCase()} Mode:`);

  if (!ref || !render) {
    console.log('  Cannot calculate - missing data');
    return null;
  }

  const params = {};

  // Calculate scale factor based on eye distance
  if (ref.eyes.eyeDistance && render.eyes.eyeDistance) {
    params.scaleFactor = ref.eyes.eyeDistance / render.eyes.eyeDistance;
    console.log(
      `  Scale factor (to match eye distance): ${params.scaleFactor.toFixed(2)}x`
    );
  }

  // Calculate translation needed after scaling
  if (ref.eyes.midpoint && render.eyes.midpoint) {
    // After scaling the render by scaleFactor, where would the eyes be?
    const scaledRenderEyeX = render.eyes.midpoint.x * (params.scaleFactor || 1);
    const scaledRenderEyeY = render.eyes.midpoint.y * (params.scaleFactor || 1);

    params.translateX = ref.eyes.midpoint.x - scaledRenderEyeX;
    params.translateY = ref.eyes.midpoint.y - scaledRenderEyeY;

    console.log(`  Translation after scaling:`);
    console.log(`    X: ${params.translateX.toFixed(0)}px`);
    console.log(`    Y: ${params.translateY.toFixed(0)}px`);
  }

  // Nose alignment check
  if (ref.nose && render.nose && params.scaleFactor) {
    const scaledRenderNoseX =
      render.nose.x * params.scaleFactor + (params.translateX || 0);
    const scaledRenderNoseY =
      render.nose.y * params.scaleFactor + (params.translateY || 0);

    const noseOffsetX = ref.nose.x - scaledRenderNoseX;
    const noseOffsetY = ref.nose.y - scaledRenderNoseY;

    console.log(`  Nose offset after eye alignment:`);
    console.log(`    X: ${noseOffsetX.toFixed(0)}px`);
    console.log(`    Y: ${noseOffsetY.toFixed(0)}px`);
  }

  return params;
}

const alignParams2D = calcAlignmentParams('ref2d', 'render2d', '2D');
const alignParams3D = calcAlignmentParams('ref3d', 'render3d', '3D');

console.log(`\n${'='.repeat(60)}`);
console.log('IMPLEMENTATION RECOMMENDATIONS');
console.log('='.repeat(60));
console.log(`
To align images for comparison:

1. Detect eye centers in both reference and render images
2. Scale the render image so eye distances match
3. Translate the scaled render so eye midpoints align
4. Then perform pixel comparison on the aligned images

For the image comparison code:
- Scale render by ${alignParams2D?.scaleFactor?.toFixed(2) || 'N/A'}x for 2D
- Scale render by ${alignParams3D?.scaleFactor?.toFixed(2) || 'N/A'}x for 3D
- After scaling, translate to align eye centers
`);
