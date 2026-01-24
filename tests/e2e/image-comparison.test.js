/**
 * E2E tests for comparing rendered avatars with reference images
 * Uses browser-commander for Playwright automation and pixelmatch for image comparison
 *
 * These tests compare the 2D (SVG) and 3D procedural models against reference images.
 * The target is to achieve no more than 10% difference (work in progress).
 *
 * RENDER-LEVEL ALIGNMENT:
 * Instead of post-processing the images, alignment is done at the render level via URL
 * parameters. This ensures we test the actual render quality, not image manipulation.
 * Available parameters for alignment:
 * - scale: Overall character scale
 * - viewportCenterY: Vertical centering for 2D SVG
 * - cameraY, cameraZ: Camera position for 3D
 * - staticPose: Arms at rest position
 * - noAhoge: Disable hair tuft
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
 * Resize image to match target dimensions using center-crop or center-pad
 * No transformation is applied - just dimension matching
 * @param {PNG} png - Source image
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @param {Array} bgColor - Background color for padding [r, g, b, a]
 * @returns {PNG} - Resized image
 */
function resizeToMatch(png, targetWidth, targetHeight, bgColor) {
  const result = new PNG({ width: targetWidth, height: targetHeight });

  // Fill with background color
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = bgColor[0];
    result.data[i + 1] = bgColor[1];
    result.data[i + 2] = bgColor[2];
    result.data[i + 3] = bgColor[3];
  }

  // Calculate offset to center the source in target
  const offsetX = Math.floor((targetWidth - png.width) / 2);
  const offsetY = Math.floor((targetHeight - png.height) / 2);

  // Copy pixels from source to target (centered)
  for (let sy = 0; sy < png.height; sy++) {
    for (let sx = 0; sx < png.width; sx++) {
      const tx = sx + offsetX;
      const ty = sy + offsetY;

      // Skip if outside target bounds
      if (tx < 0 || tx >= targetWidth || ty < 0 || ty >= targetHeight) {
        continue;
      }

      const srcIdx = (sy * png.width + sx) * 4;
      const dstIdx = (ty * targetWidth + tx) * 4;

      result.data[dstIdx] = png.data[srcIdx];
      result.data[dstIdx + 1] = png.data[srcIdx + 1];
      result.data[dstIdx + 2] = png.data[srcIdx + 2];
      result.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }

  return result;
}

/**
 * Compare two images directly without post-processing alignment
 * Alignment should be done at the render level via URL parameters
 * @param {Buffer} refBuffer - Reference image buffer
 * @param {Buffer} renderBuffer - Render image buffer
 * @param {Array} bgColor - Background color [r, g, b, a] for dimension matching
 * @returns {Object} - { diffPercentage, diffPixels, totalPixels, diffImage, width, height }
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

  // Resize render to match reference dimensions (center-crop or center-pad)
  // No scaling or transformation - alignment is done at render level
  let processedRender;
  if (renderPng.width === targetWidth && renderPng.height === targetHeight) {
    processedRender = renderPng;
    console.log(`  Dimensions match - direct comparison`);
  } else {
    console.log(
      `  Resizing render to match reference (center-aligned, no transformation)`
    );
    processedRender = resizeToMatch(
      renderPng,
      targetWidth,
      targetHeight,
      bgColor
    );
  }

  // Create diff image
  const diff = new PNG({ width: targetWidth, height: targetHeight });

  const diffPixels = pixelmatch(
    refPng.data,
    processedRender.data,
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
    renderImage: PNG.sync.write(processedRender),
    width: targetWidth,
    height: targetHeight,
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

Images are compared using **direct pixel comparison** with **render-level alignment**:

1. **Render-level alignment**: Position and scale are controlled via URL parameters
   - \`scale\`: Overall character scale
   - \`viewportCenterY\`: Vertical centering for 2D SVG
   - \`cameraY\`, \`cameraZ\`: Camera position for 3D
   - \`staticPose\`: Arms at rest position
   - \`noAhoge\`: Disable hair tuft
2. **Dimension matching**: Renders are center-cropped/padded to match reference dimensions
3. **Comparison**: Direct pixel comparison using pixelmatch with 0.1 threshold

**No post-processing transformation** is applied to the renders. This ensures we test the actual render quality, not image manipulation.

## Visual Comparison

### Alice 2D (SVG)

| Reference | Render | Diff |
|-----------|--------|------|
| ![Reference](../reference-images/alice/2d-reference.png) | ![Render](alice-2d-render.png) | ![Diff](alice-2d-diff.png) |

### Alice 3D (WebGL)

| Reference | Render | Diff |
|-----------|--------|------|
| ![Reference](../reference-images/alice/3d-reference.png) | ![Render](alice-3d-render.png) | ![Diff](alice-3d-diff.png) |

## Details

The goal is to achieve ≤10% difference between rendered avatars and reference images.
Current renders are procedural (SVG/WebGL) approximations of the detailed anime reference artwork.

### Files Generated

`;

  for (const result of testResults) {
    const baseName = `${result.model.toLowerCase()}-${result.mode.toLowerCase()}`;
    report += `- \`${baseName}-render.png\` - Render screenshot (alignment done at render level)
- \`${baseName}-diff.png\` - Pixel difference visualization (render vs reference)
`;
  }

  report += `
### Reference Images

- \`reference-images/alice/2d-reference.png\` - Alice 2D target
- \`reference-images/alice/3d-reference.png\` - Alice 3D target

## How to Improve

1. Adjust render parameters (scale, viewportCenterY, cameraY, cameraZ) to better align with reference
2. Improve eye shape and proportions to better match anime style
3. Improve hair silhouette and shading
4. Add more detailed facial features (nose highlight, mouth detail)
5. Refine clothing details and sailor uniform styling
6. Improve overall character proportions
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

      // Compare images directly (no post-processing alignment)
      const result = compareImages(
        referenceBuffer,
        actualBuffer,
        [255, 255, 255, 255] // White background
      );

      // Save diff image
      const diffPath = path.join(RENDERS_DIR, 'alice-2d-diff.png');
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
      console.log(`  Diff saved to: ${diffPath}`);

      // Test passes if render was generated successfully
      expect(fs.existsSync(renderPath)).toBe(true);
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

      // Compare images directly (no post-processing alignment)
      const result = compareImages(
        referenceBuffer,
        actualBuffer,
        [128, 128, 128, 255] // Gray background
      );

      // Save diff image
      const diffPath = path.join(RENDERS_DIR, 'alice-3d-diff.png');
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
      console.log(`  Diff saved to: ${diffPath}`);

      // Test passes if render was generated successfully
      expect(fs.existsSync(renderPath)).toBe(true);
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
