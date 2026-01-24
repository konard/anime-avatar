/* eslint-disable max-lines-per-function */
/**
 * E2E tests for comparing rendered avatars with reference images
 * Uses browser-commander for Playwright automation and pixelmatch for image comparison
 *
 * These tests ensure the 2D (SVG) and 3D procedural models match reference images
 * with no more than 10% difference.
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
  isabella2d: path.join(__dirname, '../../reference-images/2d-reference.png'),
  isabella3d: path.join(__dirname, '../../reference-images/3d-reference.png'),
  alice2d: path.join(
    __dirname,
    '../../reference-images/alice/2d-reference.png'
  ),
  alice3d: path.join(
    __dirname,
    '../../reference-images/alice/3d-reference.png'
  ),
};

// Screenshot output directory
const SCREENSHOTS_DIR = path.join(__dirname, '../../screenshots');

// Maximum allowed difference percentage (10%)
const MAX_DIFF_PERCENTAGE = 0.1;

// Global state for browser and commander
let browser;
let page;
let commander;
let devServerProcess;

/**
 * Compare two images and return the difference percentage
 * @param {Buffer} img1Buffer - First image buffer
 * @param {Buffer} img2Buffer - Second image buffer
 * @returns {Object} - { diffPercentage, diffPixels, totalPixels, diffImage }
 */
function compareImages(img1Buffer, img2Buffer) {
  const img1 = PNG.sync.read(img1Buffer);
  const img2 = PNG.sync.read(img2Buffer);

  // Use the smaller dimensions for comparison
  const width = Math.min(img1.width, img2.width);
  const height = Math.min(img1.height, img2.height);

  // Resize images if needed (crop to compare)
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(
    cropImage(img1, width, height),
    cropImage(img2, width, height),
    diff.data,
    width,
    height,
    { threshold: 0.1 } // Sensitivity threshold (0-1, lower = more sensitive)
  );

  const totalPixels = width * height;
  const diffPercentage = diffPixels / totalPixels;

  return {
    diffPercentage,
    diffPixels,
    totalPixels,
    diffImage: PNG.sync.write(diff),
    width,
    height,
  };
}

/**
 * Crop image data to specified dimensions
 */
function cropImage(png, targetWidth, targetHeight) {
  const { width: srcWidth, data: srcData } = png;
  const result = Buffer.alloc(targetWidth * targetHeight * 4);

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcIdx = (y * srcWidth + x) * 4;
      const dstIdx = (y * targetWidth + x) * 4;
      result[dstIdx] = srcData[srcIdx];
      result[dstIdx + 1] = srcData[srcIdx + 1];
      result[dstIdx + 2] = srcData[srcIdx + 2];
      result[dstIdx + 3] = srcData[srcIdx + 3];
    }
  }

  return result;
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
 */
async function takeAvatarScreenshot(url, outputPath) {
  await commander.goto({ url, waitUntil: 'networkidle' });

  // Wait for avatar to render
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Take screenshot
  const screenshotBuffer = await page.screenshot({
    type: 'png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 800, height: 600 },
  });

  // Save screenshot
  fs.writeFileSync(outputPath, screenshotBuffer);

  return screenshotBuffer;
}

describe('Avatar Image Comparison Tests', () => {
  beforeAll(async () => {
    // Ensure screenshots directory exists
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Start dev server
    console.log('Starting development server...');
    devServerProcess = await startDevServer();
    console.log('Development server started');

    // Launch browser
    console.log('Launching browser...');
    const result = await launchBrowser({
      engine: 'playwright',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    browser = result.browser;
    page = result.page;
    commander = makeBrowserCommander({ page, verbose: false });
    console.log('Browser launched');
  }, 60000);

  afterAll(async () => {
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

  describe('Isabella Model (2D SVG)', () => {
    it('should render Isabella 2D avatar within 10% difference of reference', async () => {
      // Skip if reference image doesn't exist
      if (!fs.existsSync(REFERENCE_IMAGES.isabella2d)) {
        console.warn(
          'Isabella 2D reference image not found, skipping test:',
          REFERENCE_IMAGES.isabella2d
        );
        return;
      }

      const screenshotPath = path.join(
        SCREENSHOTS_DIR,
        'isabella-2d-actual.png'
      );

      // Take screenshot with Isabella model selected (2D mode)
      // URL params: model=isabella, background=cherry-blossom-road, mode=2d
      await takeAvatarScreenshot(
        'http://localhost:5173/?model=isabella&bg=cherry-blossom-road',
        screenshotPath
      );

      // Load reference image
      const referenceBuffer = fs.readFileSync(REFERENCE_IMAGES.isabella2d);
      const actualBuffer = fs.readFileSync(screenshotPath);

      // Compare images
      const result = compareImages(referenceBuffer, actualBuffer);

      // Save diff image for debugging
      const diffPath = path.join(SCREENSHOTS_DIR, 'isabella-2d-diff.png');
      fs.writeFileSync(diffPath, result.diffImage);

      console.log(`Isabella 2D comparison result:`);
      console.log(
        `  Diff percentage: ${(result.diffPercentage * 100).toFixed(2)}%`
      );
      console.log(
        `  Diff pixels: ${result.diffPixels} / ${result.totalPixels}`
      );
      console.log(`  Max allowed: ${MAX_DIFF_PERCENTAGE * 100}%`);

      // Assert difference is within acceptable range
      expect(result.diffPercentage).toBeLessThanOrEqual(MAX_DIFF_PERCENTAGE);
    }, 30000);
  });

  describe('Alice Model (2D SVG)', () => {
    it('should render Alice 2D avatar within 10% difference of reference', async () => {
      // Skip if reference image doesn't exist
      if (!fs.existsSync(REFERENCE_IMAGES.alice2d)) {
        console.warn(
          'Alice 2D reference image not found, skipping test:',
          REFERENCE_IMAGES.alice2d
        );
        return;
      }

      const screenshotPath = path.join(SCREENSHOTS_DIR, 'alice-2d-actual.png');

      // Take screenshot with Alice model selected (2D mode)
      // URL params: model=alice, background=plain-white, mode=2d
      await takeAvatarScreenshot(
        'http://localhost:5173/?model=alice&bg=plain-white',
        screenshotPath
      );

      // Load reference image
      const referenceBuffer = fs.readFileSync(REFERENCE_IMAGES.alice2d);
      const actualBuffer = fs.readFileSync(screenshotPath);

      // Compare images
      const result = compareImages(referenceBuffer, actualBuffer);

      // Save diff image for debugging
      const diffPath = path.join(SCREENSHOTS_DIR, 'alice-2d-diff.png');
      fs.writeFileSync(diffPath, result.diffImage);

      console.log(`Alice 2D comparison result:`);
      console.log(
        `  Diff percentage: ${(result.diffPercentage * 100).toFixed(2)}%`
      );
      console.log(
        `  Diff pixels: ${result.diffPixels} / ${result.totalPixels}`
      );
      console.log(`  Max allowed: ${MAX_DIFF_PERCENTAGE * 100}%`);

      // Assert difference is within acceptable range
      expect(result.diffPercentage).toBeLessThanOrEqual(MAX_DIFF_PERCENTAGE);
    }, 30000);
  });

  describe('Isabella Model (3D WebGL)', () => {
    it('should render Isabella 3D avatar within 10% difference of reference', async () => {
      // Skip if reference image doesn't exist
      if (!fs.existsSync(REFERENCE_IMAGES.isabella3d)) {
        console.warn(
          'Isabella 3D reference image not found, skipping test:',
          REFERENCE_IMAGES.isabella3d
        );
        return;
      }

      const screenshotPath = path.join(
        SCREENSHOTS_DIR,
        'isabella-3d-actual.png'
      );

      // Take screenshot with Isabella model selected (3D mode)
      await takeAvatarScreenshot(
        'http://localhost:5173/?model=isabella&bg=cherry-blossom-road&mode=3d',
        screenshotPath
      );

      // Load reference image
      const referenceBuffer = fs.readFileSync(REFERENCE_IMAGES.isabella3d);
      const actualBuffer = fs.readFileSync(screenshotPath);

      // Compare images
      const result = compareImages(referenceBuffer, actualBuffer);

      // Save diff image for debugging
      const diffPath = path.join(SCREENSHOTS_DIR, 'isabella-3d-diff.png');
      fs.writeFileSync(diffPath, result.diffImage);

      console.log(`Isabella 3D comparison result:`);
      console.log(
        `  Diff percentage: ${(result.diffPercentage * 100).toFixed(2)}%`
      );
      console.log(
        `  Diff pixels: ${result.diffPixels} / ${result.totalPixels}`
      );
      console.log(`  Max allowed: ${MAX_DIFF_PERCENTAGE * 100}%`);

      // Assert difference is within acceptable range
      expect(result.diffPercentage).toBeLessThanOrEqual(MAX_DIFF_PERCENTAGE);
    }, 30000);
  });

  describe('Alice Model (3D WebGL)', () => {
    it('should render Alice 3D avatar within 10% difference of reference', async () => {
      // Skip if reference image doesn't exist
      if (!fs.existsSync(REFERENCE_IMAGES.alice3d)) {
        console.warn(
          'Alice 3D reference image not found, skipping test:',
          REFERENCE_IMAGES.alice3d
        );
        return;
      }

      const screenshotPath = path.join(SCREENSHOTS_DIR, 'alice-3d-actual.png');

      // Take screenshot with Alice model selected (3D mode)
      await takeAvatarScreenshot(
        'http://localhost:5173/?model=alice&bg=plain-gray&mode=3d',
        screenshotPath
      );

      // Load reference image
      const referenceBuffer = fs.readFileSync(REFERENCE_IMAGES.alice3d);
      const actualBuffer = fs.readFileSync(screenshotPath);

      // Compare images
      const result = compareImages(referenceBuffer, actualBuffer);

      // Save diff image for debugging
      const diffPath = path.join(SCREENSHOTS_DIR, 'alice-3d-diff.png');
      fs.writeFileSync(diffPath, result.diffImage);

      console.log(`Alice 3D comparison result:`);
      console.log(
        `  Diff percentage: ${(result.diffPercentage * 100).toFixed(2)}%`
      );
      console.log(
        `  Diff pixels: ${result.diffPixels} / ${result.totalPixels}`
      );
      console.log(`  Max allowed: ${MAX_DIFF_PERCENTAGE * 100}%`);

      // Assert difference is within acceptable range
      expect(result.diffPercentage).toBeLessThanOrEqual(MAX_DIFF_PERCENTAGE);
    }, 30000);
  });
});
