/**
 * DEPRECATED: This approach was replaced by render-level alignment.
 *
 * Analyze facial landmarks in reference and render images.
 * This script helps identify the approximate positions of:
 * - Eyes (purple/violet colored regions)
 * - Nose (center of face, between eyes and mouth)
 * - Mouth (red/pink region below nose)
 *
 * NOTE: Alignment is now achieved through render parameters (cameraY, cameraZ, scale)
 * rather than post-processing image transformations.
 *
 * Usage: node experiments/analyze-landmarks.js
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
 * Check if a color is close to target (with tolerance)
 */
function colorMatch(r, g, b, targetR, targetG, targetB, tolerance = 40) {
  return (
    Math.abs(r - targetR) < tolerance &&
    Math.abs(g - targetG) < tolerance &&
    Math.abs(b - targetB) < tolerance
  );
}

/**
 * Check if color is purple/violet (eye color for Alice)
 */
function isPurple(r, g, b) {
  // Purple/violet: high R, low-mid G, high B, with R roughly equal to B
  // Alice's eye color: #7b68ee (123, 104, 238)
  return b > 150 && r > 80 && r < 200 && g < 150 && b > g && b > r * 0.8;
}

/**
 * Check if color is red/pink (mouth color)
 */
function isRedPink(r, g, b) {
  // Red/pink: high R, low-mid G, low-mid B
  return r > 150 && g < 120 && b < 150 && r > g && r > b;
}

/**
 * Check if color is skin tone
 */
function isSkinTone(r, g, b) {
  // Skin tone: high R, medium-high G, medium B
  return r > 180 && g > 140 && g < 220 && b > 100 && b < 200 && r > g && g > b;
}

/**
 * Find regions of a specific color type in the image
 */
function findColorRegions(png, colorChecker, label) {
  const { width, height, data } = png;
  const points = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > 128 && colorChecker(r, g, b)) {
        points.push({ x, y, r, g, b });
      }
    }
  }

  if (points.length === 0) {
    return null;
  }

  // Calculate bounding box and center
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  const centerX = Math.round((minX + maxX) / 2);
  const centerY = Math.round((minY + maxY) / 2);

  return {
    label,
    center: { x: centerX, y: centerY },
    bounds: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY },
    pixelCount: points.length,
  };
}

/**
 * Find left and right eye regions separately
 */
function findEyes(png) {
  const { width, height, data } = png;
  const leftPoints = [];
  const rightPoints = [];
  const midX = width / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > 128 && isPurple(r, g, b)) {
        if (x < midX) {
          leftPoints.push({ x, y });
        } else {
          rightPoints.push({ x, y });
        }
      }
    }
  }

  const calcCenter = (points) => {
    if (points.length === 0) {
      return null;
    }
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    return {
      x: Math.round(sumX / points.length),
      y: Math.round(sumY / points.length),
    };
  };

  const leftCenter = calcCenter(leftPoints);
  const rightCenter = calcCenter(rightPoints);

  return {
    left: leftCenter
      ? { center: leftCenter, pixelCount: leftPoints.length }
      : null,
    right: rightCenter
      ? { center: rightCenter, pixelCount: rightPoints.length }
      : null,
    midpoint:
      leftCenter && rightCenter
        ? {
            x: Math.round((leftCenter.x + rightCenter.x) / 2),
            y: Math.round((leftCenter.y + rightCenter.y) / 2),
          }
        : null,
    eyeDistance:
      leftCenter && rightCenter
        ? Math.sqrt(
            Math.pow(rightCenter.x - leftCenter.x, 2) +
              Math.pow(rightCenter.y - leftCenter.y, 2)
          )
        : null,
  };
}

/**
 * Estimate nose position based on face geometry
 * Nose is typically between eyes and mouth, slightly below eye level
 */
function estimateNose(eyes, mouth, width, height) {
  if (!eyes.midpoint) {
    // If no eyes found, estimate from image center
    return { x: Math.round(width / 2), y: Math.round(height * 0.4) };
  }

  const eyeY = eyes.midpoint.y;
  const mouthY = mouth ? mouth.center.y : Math.round(height * 0.55);

  // Nose is approximately 1/3 of the way from eyes to mouth
  const noseY = Math.round(eyeY + (mouthY - eyeY) * 0.4);

  return {
    x: eyes.midpoint.x,
    y: noseY,
    estimated: true,
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

  // Find eyes
  const eyes = findEyes(png);
  console.log('\n  EYES (Purple regions):');
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

  // Find mouth
  const mouth = findColorRegions(png, isRedPink, 'mouth');
  console.log('\n  MOUTH (Red/Pink region):');
  if (mouth) {
    console.log(`    Center: (${mouth.center.x}, ${mouth.center.y})`);
    console.log(
      `    Bounds: ${mouth.bounds.width}x${mouth.bounds.height} at (${mouth.bounds.minX}, ${mouth.bounds.minY})`
    );
    console.log(`    Pixel count: ${mouth.pixelCount}`);
  } else {
    console.log('    NOT FOUND');
  }

  // Estimate nose
  const nose = estimateNose(eyes, mouth, png.width, png.height);
  console.log('\n  NOSE (Estimated from geometry):');
  console.log(
    `    Center: (${nose.x}, ${nose.y})${nose.estimated ? ' [estimated]' : ''}`
  );

  // Calculate relative positions (as percentage of image)
  console.log('\n  RELATIVE POSITIONS (% of image):');
  if (eyes.midpoint) {
    console.log(
      `    Eyes: (${((eyes.midpoint.x / png.width) * 100).toFixed(1)}%, ${((eyes.midpoint.y / png.height) * 100).toFixed(1)}%)`
    );
  }
  console.log(
    `    Nose: (${((nose.x / png.width) * 100).toFixed(1)}%, ${((nose.y / png.height) * 100).toFixed(1)}%)`
  );
  if (mouth) {
    console.log(
      `    Mouth: (${((mouth.center.x / png.width) * 100).toFixed(1)}%, ${((mouth.center.y / png.height) * 100).toFixed(1)}%)`
    );
  }

  return {
    width: png.width,
    height: png.height,
    eyes,
    nose,
    mouth,
  };
}

// Main analysis
console.log('FACIAL LANDMARK ANALYSIS');
console.log('========================\n');

const results = {};

// Analyze all images
for (const [key, path] of Object.entries(IMAGES)) {
  const label = key.replace('ref', 'Reference ').replace('render', 'Render ');
  results[key] = analyzeImage(path, label);
}

// Compare reference vs render
console.log(`\n${'='.repeat(60)}`);
console.log('COMPARISON SUMMARY');
console.log('='.repeat(60));

function compareImages(refKey, renderKey, mode) {
  const ref = results[refKey];
  const render = results[renderKey];

  console.log(`\n${mode.toUpperCase()} Mode Comparison:`);

  if (!ref || !render) {
    console.log('  Cannot compare - missing data');
    return;
  }

  // Eye position comparison
  if (ref.eyes.midpoint && render.eyes.midpoint) {
    const refEyeRel = {
      x: ref.eyes.midpoint.x / ref.width,
      y: ref.eyes.midpoint.y / ref.height,
    };
    const renderEyeRel = {
      x: render.eyes.midpoint.x / render.width,
      y: render.eyes.midpoint.y / render.height,
    };

    console.log('  Eyes midpoint offset (relative):');
    console.log(
      `    X offset: ${((renderEyeRel.x - refEyeRel.x) * 100).toFixed(1)}%`
    );
    console.log(
      `    Y offset: ${((renderEyeRel.y - refEyeRel.y) * 100).toFixed(1)}%`
    );

    // Eye distance ratio (scale)
    if (ref.eyes.eyeDistance && render.eyes.eyeDistance) {
      const refEyeDistRel = ref.eyes.eyeDistance / ref.width;
      const renderEyeDistRel = render.eyes.eyeDistance / render.width;
      const scaleRatio = renderEyeDistRel / refEyeDistRel;
      console.log(`  Eye distance scale ratio: ${scaleRatio.toFixed(2)}x`);
      console.log(
        `    (${scaleRatio > 1 ? 'render eyes are wider apart' : 'render eyes are closer together'})`
      );
    }
  }

  // Nose position comparison
  const refNoseRel = {
    x: ref.nose.x / ref.width,
    y: ref.nose.y / ref.height,
  };
  const renderNoseRel = {
    x: render.nose.x / render.width,
    y: render.nose.y / render.height,
  };

  console.log('  Nose center offset (relative):');
  console.log(
    `    X offset: ${((renderNoseRel.x - refNoseRel.x) * 100).toFixed(1)}%`
  );
  console.log(
    `    Y offset: ${((renderNoseRel.y - refNoseRel.y) * 100).toFixed(1)}%`
  );

  // Mouth position comparison
  if (ref.mouth && render.mouth) {
    const refMouthRel = {
      x: ref.mouth.center.x / ref.width,
      y: ref.mouth.center.y / ref.height,
    };
    const renderMouthRel = {
      x: render.mouth.center.x / render.width,
      y: render.mouth.center.y / render.height,
    };

    console.log('  Mouth center offset (relative):');
    console.log(
      `    X offset: ${((renderMouthRel.x - refMouthRel.x) * 100).toFixed(1)}%`
    );
    console.log(
      `    Y offset: ${((renderMouthRel.y - refMouthRel.y) * 100).toFixed(1)}%`
    );
  }
}

compareImages('ref2d', 'render2d', '2D');
compareImages('ref3d', 'render3d', '3D');

console.log(`\n${'='.repeat(60)}`);
console.log('RECOMMENDATIONS');
console.log('='.repeat(60));
console.log(`
Based on the analysis, the image comparison should:
1. Align images by the NOSE CENTER (most stable facial landmark)
2. Scale images so EYE DISTANCE matches
3. After alignment, compare using pixelmatch

The offset values above indicate how much the render needs to be shifted/scaled
to align with the reference image landmarks.
`);
