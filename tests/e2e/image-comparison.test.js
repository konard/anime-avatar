/**
 * E2E tests for comparing rendered avatars with reference images
 * Uses browser-commander for Playwright automation and pixelmatch for image comparison
 *
 * These tests compare the 2D (SVG) and 3D procedural models against reference images.
 * The target is to achieve no more than 10% difference (work in progress).
 *
 * LANDMARK-BASED ALIGNMENT:
 * Images are aligned by facial landmarks (eyes, nose, mouth) before comparison.
 * This ensures that differences reflect actual art style disparities, not framing issues.
 *
 * NOTE: These tests require Playwright browsers to be installed.
 * Run `npx playwright install chromium` before running these tests.
 * To skip these tests, set E2E_SKIP=true environment variable.
 *
 * To run these tests: npm run test:e2e
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { launchBrowser, makeBrowserCommander } from 'browser-commander';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reference image paths
const REFERENCE_IMAGES = {
  alice2d: path.join(
    __dirname,
    '../../reference-images/alice/2d-reference.png'
  ),
  alice3d: path.join(
    __dirname,
    '../../reference-images/alice/3d-reference.png'
  ),
};

// Render output directory (committed to repo to track progress)
const RENDERS_DIR = path.join(__dirname, '../../renders');

// Maximum allowed difference percentage (10% is the target goal)
const MAX_DIFF_PERCENTAGE = 0.1;

// Global state for browser and commander
let browser;
let page;
let commander;
let devServerProcess;

// Store results for summary
const testResults = [];

// ============================================================================
// FACIAL LANDMARK DETECTION
// ============================================================================

/**
 * Check if color is a purple/violet iris color (Alice's eye color)
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {boolean}
 */
function isEyePurple(r, g, b) {
  // Purple/violet: medium R, low-medium G, high B
  // Alice's eyes: #7b68ee type colors
  return (
    r > 80 &&
    r < 200 && // Medium red
    g < 140 && // Low-medium green
    b > 160 && // High blue
    b > r && // Blue dominant over red
    b > g + 50
  ); // Blue significantly higher than green
}

/**
 * Find eye regions in an image by detecting purple iris pixels
 * @param {PNG} png - PNG image object
 * @returns {Object} - { left, right, midpoint, eyeDistance }
 */
function findEyeRegions(png) {
  const { width, height, data } = png;
  const points = [];

  // Collect all purple pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > 128 && isEyePurple(r, g, b)) {
        points.push({ x, y });
      }
    }
  }

  if (points.length < 10) {
    return { left: null, right: null, midpoint: null, eyeDistance: null };
  }

  // Find the Y level where most purple pixels are concentrated (eye level)
  const yHist = {};
  points.forEach((p) => {
    const yBin = Math.floor(p.y / 10) * 10;
    yHist[yBin] = (yHist[yBin] || 0) + 1;
  });

  let maxYBin = 0;
  let maxCount = 0;
  for (const [yBin, count] of Object.entries(yHist)) {
    if (count > maxCount) {
      maxCount = count;
      maxYBin = parseInt(yBin);
    }
  }

  // Filter to points near detected eye level (within 60 pixels)
  const eyeLevelPoints = points.filter((p) => Math.abs(p.y - maxYBin) < 60);

  // Split into left and right eyes by X position
  const midX = width / 2;
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
 * Estimate nose position from eye positions
 * Nose is typically at the horizontal center of eyes, about 35% down toward mouth area
 * @param {Object} eyes - Eye detection result
 * @param {number} imageHeight - Image height
 * @returns {Object|null} - { x, y } or null
 */
function estimateNoseFromEyes(eyes, imageHeight) {
  if (!eyes.midpoint) {
    return null;
  }

  // Estimate nose at ~35% below eye level toward bottom of face
  // For a typical portrait, nose is roughly 15-20% below eyes
  const noseY = Math.round(eyes.midpoint.y + imageHeight * 0.15);

  return {
    x: eyes.midpoint.x,
    y: noseY,
  };
}

/**
 * Calculate alignment parameters to transform render image to match reference
 * @param {Object} refLandmarks - Reference image landmarks { eyes, nose }
 * @param {Object} renderLandmarks - Render image landmarks { eyes, nose }
 * @returns {Object} - { scale, translateX, translateY }
 */
function calculateAlignmentParams(refLandmarks, renderLandmarks) {
  const params = { scale: 1, translateX: 0, translateY: 0 };

  if (!refLandmarks.eyes.eyeDistance || !renderLandmarks.eyes.eyeDistance) {
    return params;
  }

  // Calculate scale factor to match eye distances
  params.scale =
    refLandmarks.eyes.eyeDistance / renderLandmarks.eyes.eyeDistance;

  // Calculate translation to align eye midpoints (after scaling)
  if (refLandmarks.eyes.midpoint && renderLandmarks.eyes.midpoint) {
    const scaledRenderEyeX = renderLandmarks.eyes.midpoint.x * params.scale;
    const scaledRenderEyeY = renderLandmarks.eyes.midpoint.y * params.scale;

    params.translateX = refLandmarks.eyes.midpoint.x - scaledRenderEyeX;
    params.translateY = refLandmarks.eyes.midpoint.y - scaledRenderEyeY;
  }

  return params;
}

// ============================================================================
// IMAGE TRANSFORMATION AND COMPARISON
// ============================================================================

/**
 * Apply scale and translation transform to an image
 * @param {PNG} png - Source PNG image
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @param {Object} params - { scale, translateX, translateY }
 * @param {Array} bgColor - Background color [r, g, b, a] for areas outside source
 * @returns {Buffer} - Transformed image data
 */
function transformImage(
  png,
  targetWidth,
  targetHeight,
  params,
  bgColor = [255, 255, 255, 255]
) {
  const { width: srcWidth, height: srcHeight, data: srcData } = png;
  const { scale, translateX, translateY } = params;
  const result = Buffer.alloc(targetWidth * targetHeight * 4);

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const dstIdx = (y * targetWidth + x) * 4;

      // Inverse transform: find source pixel for this destination pixel
      // dst = src * scale + translate => src = (dst - translate) / scale
      const srcX = Math.round((x - translateX) / scale);
      const srcY = Math.round((y - translateY) / scale);

      if (srcX >= 0 && srcX < srcWidth && srcY >= 0 && srcY < srcHeight) {
        const srcIdx = (srcY * srcWidth + srcX) * 4;
        result[dstIdx] = srcData[srcIdx];
        result[dstIdx + 1] = srcData[srcIdx + 1];
        result[dstIdx + 2] = srcData[srcIdx + 2];
        result[dstIdx + 3] = srcData[srcIdx + 3];
      } else {
        // Outside source bounds - use background color
        result[dstIdx] = bgColor[0];
        result[dstIdx + 1] = bgColor[1];
        result[dstIdx + 2] = bgColor[2];
        result[dstIdx + 3] = bgColor[3];
      }
    }
  }

  return result;
}

/**
 * Compare two images with landmark-based alignment
 * @param {Buffer} refBuffer - Reference image buffer
 * @param {Buffer} renderBuffer - Render image buffer
 * @param {Array} bgColor - Background color for alignment [r, g, b, a]
 * @returns {Object} - { diffPercentage, diffPixels, totalPixels, diffImage, landmarks }
 */
function compareImagesWithAlignment(
  refBuffer,
  renderBuffer,
  bgColor = [255, 255, 255, 255]
) {
  const refPng = PNG.sync.read(refBuffer);
  const renderPng = PNG.sync.read(renderBuffer);

  // Detect landmarks in both images
  const refEyes = findEyeRegions(refPng);
  const renderEyes = findEyeRegions(renderPng);

  const refNose = estimateNoseFromEyes(refEyes, refPng.height);
  const renderNose = estimateNoseFromEyes(renderEyes, renderPng.height);

  const refLandmarks = { eyes: refEyes, nose: refNose };
  const renderLandmarks = { eyes: renderEyes, nose: renderNose };

  // Calculate alignment parameters
  const alignParams = calculateAlignmentParams(refLandmarks, renderLandmarks);

  console.log('  Landmark-based alignment:');
  console.log(
    `    Reference eyes at: (${refEyes.midpoint?.x}, ${refEyes.midpoint?.y}), distance: ${refEyes.eyeDistance?.toFixed(0)}`
  );
  console.log(
    `    Render eyes at: (${renderEyes.midpoint?.x}, ${renderEyes.midpoint?.y}), distance: ${renderEyes.eyeDistance?.toFixed(0)}`
  );
  console.log(
    `    Alignment: scale=${alignParams.scale.toFixed(2)}, translateX=${alignParams.translateX.toFixed(0)}, translateY=${alignParams.translateY.toFixed(0)}`
  );

  // Use reference dimensions as target
  const width = refPng.width;
  const height = refPng.height;

  // Transform render image to align with reference
  const alignedRenderData = transformImage(
    renderPng,
    width,
    height,
    alignParams,
    bgColor
  );

  // Also get reference data in the same format (no transform, just copy)
  const refData = transformImage(
    refPng,
    width,
    height,
    { scale: 1, translateX: 0, translateY: 0 },
    bgColor
  );

  // Create diff image
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(
    refData,
    alignedRenderData,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  const totalPixels = width * height;
  const diffPercentage = diffPixels / totalPixels;

  // Also create an aligned render PNG for saving
  const alignedRenderPng = new PNG({ width, height });
  alignedRenderData.copy(alignedRenderPng.data);

  return {
    diffPercentage,
    diffPixels,
    totalPixels,
    diffImage: PNG.sync.write(diff),
    alignedRenderImage: PNG.sync.write(alignedRenderPng),
    width,
    height,
    landmarks: {
      reference: refLandmarks,
      render: renderLandmarks,
      alignment: alignParams,
    },
  };
}

/**
 * Start the development server
 */
async function startDevServer() {
  const { spawn } = await import('child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'dev', '--', '--host', '0.0.0.0'], {
      cwd: path.join(__dirname, '../..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CI: 'true' },
    });

    let serverStarted = false;

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('localhost') && !serverStarted) {
        serverStarted = true;
        // Wait a bit for server to fully initialize
        setTimeout(() => resolve(proc), 2000);
      }
    });

    proc.stderr.on('data', (data) => {
      console.error('Dev server stderr:', data.toString());
    });

    proc.on('error', reject);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverStarted) {
        proc.kill();
        reject(new Error('Dev server failed to start within 30 seconds'));
      }
    }, 30000);
  });
}

/**
 * Take a screenshot of the avatar at given URL
 * @param {string} url - The URL to navigate to
 * @param {string} outputPath - Path to save the screenshot
 * @param {string} bgColor - Background color for the page (for e2e comparison)
 */
async function takeAvatarScreenshot(url, outputPath, bgColor = '#ffffff') {
  await commander.goto({ url, waitUntil: 'networkidle' });

  // Wait for avatar to render and animations to settle
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Hide the settings panel and any overlays, and set page background for e2e testing
  await page.evaluate((backgroundColor) => {
    const settingsPanel = document.querySelector('.settings-panel');
    const menuToggle = document.querySelector('.menu-toggle');
    if (settingsPanel) {
      settingsPanel.style.display = 'none';
    }
    if (menuToggle) {
      menuToggle.style.display = 'none';
    }

    // Set body and app background to match reference for clean comparison
    document.body.style.background = backgroundColor;
    const appContainer = document.querySelector('.app-fullscreen');
    if (appContainer) {
      appContainer.style.background = backgroundColor;
    }
    const avatarFullscreen = document.querySelector('.avatar-fullscreen');
    if (avatarFullscreen) {
      avatarFullscreen.style.background = backgroundColor;
    }
  }, bgColor);

  // Wait a bit for styles to apply
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Take full viewport screenshot (we'll align based on landmarks)
  const screenshotBuffer = await page.screenshot({
    type: 'png',
    fullPage: false,
  });

  // Save screenshot
  fs.writeFileSync(outputPath, screenshotBuffer);

  return screenshotBuffer;
}

/**
 * Generate a summary report of all test results
 */
function generateSummaryReport() {
  const reportPath = path.join(RENDERS_DIR, 'COMPARISON_REPORT.md');
  const timestamp = new Date().toISOString();

  let report = `# Avatar Render Comparison Report

Generated: ${timestamp}

## Summary

| Model | Mode | Difference | Target | Status |
|-------|------|------------|--------|--------|
`;

  for (const result of testResults) {
    const status =
      result.diffPercentage <= MAX_DIFF_PERCENTAGE ? '✅ Pass' : '⚠️ WIP';
    report += `| ${result.model} | ${result.mode} | ${(result.diffPercentage * 100).toFixed(2)}% | ≤${MAX_DIFF_PERCENTAGE * 100}% | ${status} |\n`;
  }

  report += `
## Alignment Method

Images are compared using **landmark-based alignment**:
1. Eye centers are detected in both reference and render images (using purple iris color)
2. The render image is scaled so eye distances match
3. The render image is translated so eye midpoints align
4. Pixel comparison is performed on the aligned images

This ensures differences reflect actual art style disparities, not framing issues.

## Details

The goal is to achieve ≤10% difference between rendered avatars and reference images.
Current renders are procedural (SVG/WebGL) approximations of the detailed anime reference artwork.

### Files Generated

`;

  for (const result of testResults) {
    const baseName = `${result.model.toLowerCase()}-${result.mode.toLowerCase()}`;
    report += `- \`${baseName}-render.png\` - Original render output
- \`${baseName}-aligned.png\` - Render aligned to reference landmarks
- \`${baseName}-diff.png\` - Pixel difference visualization (aligned)
`;
  }

  report += `
### Reference Images

- \`reference-images/alice/2d-reference.png\` - Alice 2D target
- \`reference-images/alice/3d-reference.png\` - Alice 3D target

## How to Improve

1. Match eye proportions more closely to reference
2. Improve hair silhouette and shading
3. Add more detailed facial features
4. Refine clothing details and shading
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\nComparison report saved to: ${reportPath}`);
}

// Check if e2e tests should be skipped (only via explicit E2E_SKIP flag)
const SKIP_E2E = process.env.E2E_SKIP === 'true';

// Use describe.skip if e2e tests should be explicitly skipped
const describeE2E = SKIP_E2E ? describe.skip : describe;

describeE2E('Avatar Image Comparison Tests', () => {
  beforeAll(async () => {
    // Ensure renders directory exists
    if (!fs.existsSync(RENDERS_DIR)) {
      fs.mkdirSync(RENDERS_DIR, { recursive: true });
    }

    // Start dev server
    console.log('Starting development server...');
    devServerProcess = await startDevServer();
    console.log('Development server started');

    // Launch browser with viewport matching reference image dimensions (portrait orientation)
    console.log('Launching browser...');
    const result = await launchBrowser({
      engine: 'playwright',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    browser = result.browser;
    page = result.page;

    // Set viewport to match reference image dimensions (768x1024 portrait)
    await page.setViewportSize({ width: 768, height: 1024 });

    commander = makeBrowserCommander({ page, verbose: false });
    console.log('Browser launched');
  }, 60000);

  afterAll(async () => {
    // Generate summary report
    if (testResults.length > 0) {
      generateSummaryReport();
    }

    // Clean up
    if (commander) {
      await commander.destroy();
    }
    if (browser) {
      await browser.close();
    }
    if (devServerProcess) {
      devServerProcess.kill('SIGTERM');
    }
  });

  describe('Alice Model (2D SVG)', () => {
    it('should render Alice 2D avatar and compare with reference using landmark alignment', async () => {
      // Skip if reference image doesn't exist
      if (!fs.existsSync(REFERENCE_IMAGES.alice2d)) {
        console.warn(
          'Alice 2D reference image not found, skipping test:',
          REFERENCE_IMAGES.alice2d
        );
        return;
      }

      const renderPath = path.join(RENDERS_DIR, 'alice-2d-render.png');

      // Take screenshot with Alice model selected (2D mode)
      // showLegs=false to match reference image framing (head + upper body only)
      // Use white background to match reference
      await takeAvatarScreenshot(
        'http://localhost:5173/?model=alice&bg=plain-white&mode=2d&showLegs=false',
        renderPath,
        '#ffffff'
      );

      // Load reference image
      const referenceBuffer = fs.readFileSync(REFERENCE_IMAGES.alice2d);
      const actualBuffer = fs.readFileSync(renderPath);

      // Compare images with landmark-based alignment
      // White background for 2D
      const result = compareImagesWithAlignment(
        referenceBuffer,
        actualBuffer,
        [255, 255, 255, 255]
      );

      // Save diff image and aligned render
      const diffPath = path.join(RENDERS_DIR, 'alice-2d-diff.png');
      const alignedPath = path.join(RENDERS_DIR, 'alice-2d-aligned.png');
      fs.writeFileSync(diffPath, result.diffImage);
      fs.writeFileSync(alignedPath, result.alignedRenderImage);

      // Store result for summary
      testResults.push({
        model: 'Alice',
        mode: '2D',
        diffPercentage: result.diffPercentage,
        diffPixels: result.diffPixels,
        totalPixels: result.totalPixels,
      });

      console.log(`\nAlice 2D comparison result (landmark-aligned):`);
      console.log(
        `  Diff percentage: ${(result.diffPercentage * 100).toFixed(2)}%`
      );
      console.log(
        `  Diff pixels: ${result.diffPixels} / ${result.totalPixels}`
      );
      console.log(`  Target: ≤${MAX_DIFF_PERCENTAGE * 100}%`);
      console.log(`  Render saved to: ${renderPath}`);
      console.log(`  Aligned render saved to: ${alignedPath}`);
      console.log(`  Diff saved to: ${diffPath}`);

      // Test passes if render was generated successfully
      expect(fs.existsSync(renderPath)).toBe(true);
      expect(fs.existsSync(diffPath)).toBe(true);
      expect(fs.existsSync(alignedPath)).toBe(true);

      // Log whether we've achieved the target (informational, not blocking)
      if (result.diffPercentage <= MAX_DIFF_PERCENTAGE) {
        console.log(`  ✅ TARGET ACHIEVED!`);
      } else {
        console.log(
          `  ⚠️ Target not yet achieved (${(result.diffPercentage * 100).toFixed(2)}% > ${MAX_DIFF_PERCENTAGE * 100}%)`
        );
      }
    }, 60000);
  });

  describe('Alice Model (3D WebGL)', () => {
    it('should render Alice 3D avatar and compare with reference using landmark alignment', async () => {
      // Skip if reference image doesn't exist
      if (!fs.existsSync(REFERENCE_IMAGES.alice3d)) {
        console.warn(
          'Alice 3D reference image not found, skipping test:',
          REFERENCE_IMAGES.alice3d
        );
        return;
      }

      const renderPath = path.join(RENDERS_DIR, 'alice-3d-render.png');

      // Take screenshot with Alice model selected (3D mode)
      // showLegs=false to match reference image framing (head + upper body only)
      // Use gray background to match reference
      await takeAvatarScreenshot(
        'http://localhost:5173/?model=alice&bg=plain-gray&mode=3d&showLegs=false',
        renderPath,
        '#808080'
      );

      // Load reference image
      const referenceBuffer = fs.readFileSync(REFERENCE_IMAGES.alice3d);
      const actualBuffer = fs.readFileSync(renderPath);

      // Compare images with landmark-based alignment
      // Gray background for 3D (128, 128, 128)
      const result = compareImagesWithAlignment(
        referenceBuffer,
        actualBuffer,
        [128, 128, 128, 255]
      );

      // Save diff image and aligned render
      const diffPath = path.join(RENDERS_DIR, 'alice-3d-diff.png');
      const alignedPath = path.join(RENDERS_DIR, 'alice-3d-aligned.png');
      fs.writeFileSync(diffPath, result.diffImage);
      fs.writeFileSync(alignedPath, result.alignedRenderImage);

      // Store result for summary
      testResults.push({
        model: 'Alice',
        mode: '3D',
        diffPercentage: result.diffPercentage,
        diffPixels: result.diffPixels,
        totalPixels: result.totalPixels,
      });

      console.log(`\nAlice 3D comparison result (landmark-aligned):`);
      console.log(
        `  Diff percentage: ${(result.diffPercentage * 100).toFixed(2)}%`
      );
      console.log(
        `  Diff pixels: ${result.diffPixels} / ${result.totalPixels}`
      );
      console.log(`  Target: ≤${MAX_DIFF_PERCENTAGE * 100}%`);
      console.log(`  Render saved to: ${renderPath}`);
      console.log(`  Aligned render saved to: ${alignedPath}`);
      console.log(`  Diff saved to: ${diffPath}`);

      // Test passes if render was generated successfully
      expect(fs.existsSync(renderPath)).toBe(true);
      expect(fs.existsSync(diffPath)).toBe(true);
      expect(fs.existsSync(alignedPath)).toBe(true);

      // Log whether we've achieved the target (informational, not blocking)
      if (result.diffPercentage <= MAX_DIFF_PERCENTAGE) {
        console.log(`  ✅ TARGET ACHIEVED!`);
      } else {
        console.log(
          `  ⚠️ Target not yet achieved (${(result.diffPercentage * 100).toFixed(2)}% > ${MAX_DIFF_PERCENTAGE * 100}%)`
        );
      }
    }, 60000);
  });
});
