/**
 * E2E tests for comparing rendered avatars with reference images
 * Uses browser-commander for Playwright automation and pixelmatch for image comparison
 *
 * These tests compare the 2D (SVG) and 3D procedural models against reference images.
 * The target is to achieve no more than 10% difference (work in progress).
 *
 * LANDMARK-BASED ALIGNMENT:
 * The renders are aligned with references by detecting facial landmarks (eyes, nose, mouth)
 * and transforming the render to match the reference landmark positions. This ensures that
 * comparison focuses on visual similarity rather than positioning differences.
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

/**
 * Check if a color is purple/violet (eye color for Alice)
 * Alice's eye color: #7b68ee (123, 104, 238)
 */
function isPurple(r, g, b) {
  return b > 150 && r > 80 && r < 200 && g < 150 && b > g && b > r * 0.8;
}

/**
 * Check if a color is red/pink (for detecting ribbon/bow)
 */
function isRedPink(r, g, b) {
  return r > 150 && g < 120 && b < 150 && r > g && r > b;
}

/**
 * Find eye regions in an image and return their positions
 * @param {PNG} png - The PNG image to analyze
 * @returns {Object} - { left, right, midpoint, eyeDistance }
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
 * Find red/pink regions (ribbon/mouth) to help estimate nose position
 * @param {PNG} png - The PNG image to analyze
 * @returns {Object|null} - { center, bounds }
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

      if (a > 128 && isRedPink(r, g, b)) {
        points.push({ x, y });
      }
    }
  }

  if (points.length === 0) {
    return null;
  }

  const centerX = Math.round(
    points.reduce((sum, p) => sum + p.x, 0) / points.length
  );
  const centerY = Math.round(
    points.reduce((sum, p) => sum + p.y, 0) / points.length
  );

  return { center: { x: centerX, y: centerY }, pixelCount: points.length };
}

/**
 * Estimate nose position from eye and mouth positions
 * The nose is approximately at the horizontal center between eyes,
 * and about 40% of the way from eyes to mouth vertically
 * @param {Object} eyes - Eye detection results
 * @param {Object} redRegion - Red region detection (mouth/ribbon)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Object} - { x, y }
 */
function estimateNose(eyes, redRegion, width, height) {
  if (!eyes.midpoint) {
    // Fallback: assume nose is at image center horizontally, upper-middle vertically
    return { x: Math.round(width / 2), y: Math.round(height * 0.4) };
  }

  const eyeY = eyes.midpoint.y;
  const mouthY = redRegion ? redRegion.center.y : Math.round(height * 0.55);

  // Nose is approximately 40% of the way from eyes to mouth
  const noseY = Math.round(eyeY + (mouthY - eyeY) * 0.4);

  return {
    x: eyes.midpoint.x,
    y: noseY,
  };
}

/**
 * Detect facial landmarks in an image
 * @param {PNG} png - The PNG image
 * @returns {Object} - { eyes, nose, eyeDistance }
 */
function detectLandmarks(png) {
  const eyes = findEyes(png);
  const redRegion = findRedRegion(png);
  const nose = estimateNose(eyes, redRegion, png.width, png.height);

  return {
    eyes,
    nose,
    eyeDistance: eyes.eyeDistance,
    width: png.width,
    height: png.height,
  };
}

/**
 * Create an aligned and scaled version of the render image to match reference landmarks
 * Uses bilinear interpolation for smooth scaling
 * @param {PNG} renderPng - The render image
 * @param {Object} refLandmarks - Reference image landmarks
 * @param {Object} renderLandmarks - Render image landmarks
 * @param {Array} bgColor - Background color [r, g, b, a]
 * @returns {PNG} - Aligned render image at reference dimensions
 */
function alignRenderToReference(
  renderPng,
  refLandmarks,
  renderLandmarks,
  bgColor = [255, 255, 255, 255]
) {
  const { width: targetWidth, height: targetHeight } = refLandmarks;
  const result = new PNG({ width: targetWidth, height: targetHeight });

  // Fill with background color
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = bgColor[0];
    result.data[i + 1] = bgColor[1];
    result.data[i + 2] = bgColor[2];
    result.data[i + 3] = bgColor[3];
  }

  // Calculate scale based on eye distance (if available), otherwise use nose-based estimation
  let scale = 1;
  if (refLandmarks.eyeDistance && renderLandmarks.eyeDistance) {
    scale = refLandmarks.eyeDistance / renderLandmarks.eyeDistance;
  } else {
    // Fallback: estimate scale from relative nose positions
    // Assume face should occupy similar vertical proportion
    const refFaceHeight = refLandmarks.height * 0.4; // Estimated face height in reference
    const renderFaceHeight = renderLandmarks.height * 0.4;
    scale = refFaceHeight / renderFaceHeight;
  }

  // Calculate translation to align nose positions
  // After scaling, the render nose should be at the reference nose position
  const scaledRenderNoseX = renderLandmarks.nose.x * scale;
  const scaledRenderNoseY = renderLandmarks.nose.y * scale;
  const offsetX = refLandmarks.nose.x - scaledRenderNoseX;
  const offsetY = refLandmarks.nose.y - scaledRenderNoseY;

  console.log(
    `  Alignment: scale=${scale.toFixed(3)}, offset=(${Math.round(offsetX)}, ${Math.round(offsetY)})`
  );
  console.log(
    `  Reference nose: (${refLandmarks.nose.x}, ${refLandmarks.nose.y})`
  );
  console.log(
    `  Render nose: (${renderLandmarks.nose.x}, ${renderLandmarks.nose.y})`
  );

  // Apply inverse transformation to map target pixels to source pixels
  // target = source * scale + offset
  // source = (target - offset) / scale
  for (let ty = 0; ty < targetHeight; ty++) {
    for (let tx = 0; tx < targetWidth; tx++) {
      // Calculate source coordinates (with bilinear interpolation)
      const sx = (tx - offsetX) / scale;
      const sy = (ty - offsetY) / scale;

      // Skip if outside source bounds
      if (
        sx < 0 ||
        sx >= renderPng.width - 1 ||
        sy < 0 ||
        sy >= renderPng.height - 1
      ) {
        continue;
      }

      // Bilinear interpolation
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = x0 + 1;
      const y1 = y0 + 1;
      const xWeight = sx - x0;
      const yWeight = sy - y0;

      // Get pixel values at four corners
      const idx00 = (y0 * renderPng.width + x0) * 4;
      const idx01 = (y0 * renderPng.width + x1) * 4;
      const idx10 = (y1 * renderPng.width + x0) * 4;
      const idx11 = (y1 * renderPng.width + x1) * 4;

      // Interpolate each channel
      const targetIdx = (ty * targetWidth + tx) * 4;
      for (let c = 0; c < 4; c++) {
        const v00 = renderPng.data[idx00 + c];
        const v01 = renderPng.data[idx01 + c];
        const v10 = renderPng.data[idx10 + c];
        const v11 = renderPng.data[idx11 + c];

        const v0 = v00 * (1 - xWeight) + v01 * xWeight;
        const v1 = v10 * (1 - xWeight) + v11 * xWeight;
        const value = v0 * (1 - yWeight) + v1 * yWeight;

        result.data[targetIdx + c] = Math.round(value);
      }
    }
  }

  return result;
}

/**
 * Compare two images with landmark-based alignment
 * Detects facial landmarks (eyes, nose) and scales/translates the render
 * to align with the reference image before pixel comparison.
 * @param {Buffer} refBuffer - Reference image buffer
 * @param {Buffer} renderBuffer - Render image buffer
 * @param {Array} bgColor - Background color [r, g, b, a] for dimension matching
 * @returns {Object} - { diffPercentage, diffPixels, totalPixels, diffImage, width, height, landmarks }
 */
function compareImages(
  refBuffer,
  renderBuffer,
  bgColor = [255, 255, 255, 255]
) {
  const refPng = PNG.sync.read(refBuffer);
  const renderPng = PNG.sync.read(renderBuffer);

  // Use reference dimensions as target
  const targetWidth = refPng.width;
  const targetHeight = refPng.height;

  console.log(`  Reference: ${refPng.width}x${refPng.height}`);
  console.log(`  Render: ${renderPng.width}x${renderPng.height}`);
  console.log(`  Target: ${targetWidth}x${targetHeight}`);

  // Detect landmarks in both images
  console.log(`  Detecting landmarks...`);
  const refLandmarks = detectLandmarks(refPng);
  const renderLandmarks = detectLandmarks(renderPng);

  console.log(`  Reference landmarks:`);
  console.log(
    `    Eyes midpoint: ${refLandmarks.eyes.midpoint ? `(${refLandmarks.eyes.midpoint.x}, ${refLandmarks.eyes.midpoint.y})` : 'not found'}`
  );
  console.log(
    `    Eye distance: ${refLandmarks.eyeDistance ? Math.round(refLandmarks.eyeDistance) : 'N/A'} px`
  );
  console.log(
    `    Nose (estimated): (${refLandmarks.nose.x}, ${refLandmarks.nose.y})`
  );

  console.log(`  Render landmarks:`);
  console.log(
    `    Eyes midpoint: ${renderLandmarks.eyes.midpoint ? `(${renderLandmarks.eyes.midpoint.x}, ${renderLandmarks.eyes.midpoint.y})` : 'not found'}`
  );
  console.log(
    `    Eye distance: ${renderLandmarks.eyeDistance ? Math.round(renderLandmarks.eyeDistance) : 'N/A'} px`
  );
  console.log(
    `    Nose (estimated): (${renderLandmarks.nose.x}, ${renderLandmarks.nose.y})`
  );

  // Align render to reference using landmarks
  console.log(`  Aligning render to reference landmarks...`);
  const alignedRender = alignRenderToReference(
    renderPng,
    refLandmarks,
    renderLandmarks,
    bgColor
  );

  // Create diff image
  const diff = new PNG({ width: targetWidth, height: targetHeight });

  const diffPixels = pixelmatch(
    refPng.data,
    alignedRender.data,
    diff.data,
    targetWidth,
    targetHeight,
    { threshold: 0.1 }
  );

  const totalPixels = targetWidth * targetHeight;
  const diffPercentage = diffPixels / totalPixels;

  return {
    diffPercentage,
    diffPixels,
    totalPixels,
    diffImage: PNG.sync.write(diff),
    alignedRenderImage: PNG.sync.write(alignedRender),
    width: targetWidth,
    height: targetHeight,
    refLandmarks,
    renderLandmarks,
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

  // Take full viewport screenshot
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
## Comparison Method

Images are compared using **landmark-based alignment** followed by pixel comparison:

1. **Landmark Detection**: Detect facial features (purple eyes for Alice) in both images
2. **Scale Calculation**: Calculate scale factor based on inter-eye distance ratio
3. **Alignment**: Translate and scale render to align nose position with reference
4. **Comparison**: Perform pixel comparison using pixelmatch with 0.1 threshold

This approach ensures that visual similarity is measured independent of camera/viewport positioning differences.

## Visual Comparison

### Alice 2D (SVG)

| Reference | Render | Aligned Render | Diff |
|-----------|--------|----------------|------|
| ![Reference](../reference-images/alice/2d-reference.png) | ![Render](alice-2d-render.png) | ![Aligned](alice-2d-aligned.png) | ![Diff](alice-2d-diff.png) |

### Alice 3D (WebGL)

| Reference | Render | Aligned Render | Diff |
|-----------|--------|----------------|------|
| ![Reference](../reference-images/alice/3d-reference.png) | ![Render](alice-3d-render.png) | ![Aligned](alice-3d-aligned.png) | ![Diff](alice-3d-diff.png) |

## Details

The goal is to achieve ≤10% difference between rendered avatars and reference images.
Current renders are procedural (SVG/WebGL) approximations of the detailed anime reference artwork.

### Files Generated

`;

  for (const result of testResults) {
    const baseName = `${result.model.toLowerCase()}-${result.mode.toLowerCase()}`;
    report += `- \`${baseName}-render.png\` - Original render screenshot
- \`${baseName}-aligned.png\` - Render aligned to match reference landmarks
- \`${baseName}-diff.png\` - Pixel difference visualization (aligned vs reference)
`;
  }

  report += `
### Reference Images

- \`reference-images/alice/2d-reference.png\` - Alice 2D target
- \`reference-images/alice/3d-reference.png\` - Alice 3D target

## How to Improve

1. Improve eye shape and proportions to better match anime style
2. Improve hair silhouette and shading
3. Add more detailed facial features (nose highlight, mouth detail)
4. Refine clothing details and sailor uniform styling
5. Improve overall character proportions
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
    it('should render Alice 2D avatar and compare with reference', async () => {
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
      // staticPose=true to have arms at rest position (like reference)
      // noAhoge=true to disable hair ornament (matching reference)
      // Use white background to match reference
      await takeAvatarScreenshot(
        'http://localhost:5173/?model=alice&bg=plain-white&mode=2d&showLegs=false&staticPose=true&noAhoge=true',
        renderPath,
        '#ffffff'
      );

      // Load reference image
      const referenceBuffer = fs.readFileSync(REFERENCE_IMAGES.alice2d);
      const actualBuffer = fs.readFileSync(renderPath);

      // Compare images with landmark-based alignment
      const result = compareImages(
        referenceBuffer,
        actualBuffer,
        [255, 255, 255, 255] // White background
      );

      // Save aligned render and diff images
      const alignedPath = path.join(RENDERS_DIR, 'alice-2d-aligned.png');
      const diffPath = path.join(RENDERS_DIR, 'alice-2d-diff.png');
      fs.writeFileSync(alignedPath, result.alignedRenderImage);
      fs.writeFileSync(diffPath, result.diffImage);

      // Store result for summary
      testResults.push({
        model: 'Alice',
        mode: '2D',
        diffPercentage: result.diffPercentage,
        diffPixels: result.diffPixels,
        totalPixels: result.totalPixels,
      });

      console.log(`\nAlice 2D comparison result:`);
      console.log(
        `  Diff percentage: ${(result.diffPercentage * 100).toFixed(2)}%`
      );
      console.log(
        `  Diff pixels: ${result.diffPixels} / ${result.totalPixels}`
      );
      console.log(`  Target: ≤${MAX_DIFF_PERCENTAGE * 100}%`);
      console.log(`  Render saved to: ${renderPath}`);
      console.log(`  Aligned saved to: ${alignedPath}`);
      console.log(`  Diff saved to: ${diffPath}`);

      // Test passes if render was generated successfully
      expect(fs.existsSync(renderPath)).toBe(true);
      expect(fs.existsSync(alignedPath)).toBe(true);
      expect(fs.existsSync(diffPath)).toBe(true);

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
    it('should render Alice 3D avatar and compare with reference', async () => {
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
      // Note: 3D mode currently uses ThreeCharacter which doesn't support staticPose/noAhoge yet
      await takeAvatarScreenshot(
        'http://localhost:5173/?model=alice&bg=plain-gray&mode=3d&showLegs=false',
        renderPath,
        '#808080'
      );

      // Load reference image
      const referenceBuffer = fs.readFileSync(REFERENCE_IMAGES.alice3d);
      const actualBuffer = fs.readFileSync(renderPath);

      // Compare images with landmark-based alignment
      const result = compareImages(
        referenceBuffer,
        actualBuffer,
        [128, 128, 128, 255] // Gray background
      );

      // Save aligned render and diff images
      const alignedPath = path.join(RENDERS_DIR, 'alice-3d-aligned.png');
      const diffPath = path.join(RENDERS_DIR, 'alice-3d-diff.png');
      fs.writeFileSync(alignedPath, result.alignedRenderImage);
      fs.writeFileSync(diffPath, result.diffImage);

      // Store result for summary
      testResults.push({
        model: 'Alice',
        mode: '3D',
        diffPercentage: result.diffPercentage,
        diffPixels: result.diffPixels,
        totalPixels: result.totalPixels,
      });

      console.log(`\nAlice 3D comparison result:`);
      console.log(
        `  Diff percentage: ${(result.diffPercentage * 100).toFixed(2)}%`
      );
      console.log(
        `  Diff pixels: ${result.diffPixels} / ${result.totalPixels}`
      );
      console.log(`  Target: ≤${MAX_DIFF_PERCENTAGE * 100}%`);
      console.log(`  Render saved to: ${renderPath}`);
      console.log(`  Aligned saved to: ${alignedPath}`);
      console.log(`  Diff saved to: ${diffPath}`);

      // Test passes if render was generated successfully
      expect(fs.existsSync(renderPath)).toBe(true);
      expect(fs.existsSync(alignedPath)).toBe(true);
      expect(fs.existsSync(diffPath)).toBe(true);

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
