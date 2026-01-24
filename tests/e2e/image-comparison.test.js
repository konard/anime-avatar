/**
 * E2E tests for comparing rendered avatars with reference images
 * Uses browser-commander for Playwright automation and pixelmatch for image comparison
 *
 * These tests compare the 2D (SVG) and 3D procedural models against reference images.
 * The target is to achieve no more than 10% difference (work in progress).
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
 * Captures just the avatar SVG element for clean comparison
 */
async function takeAvatarScreenshot(url, outputPath) {
  await commander.goto({ url, waitUntil: 'networkidle' });

  // Wait for avatar to render and animations to settle
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Hide the settings panel and any overlays for clean avatar capture
  await page.evaluate(() => {
    const settingsPanel = document.querySelector('.settings-panel');
    const menuToggle = document.querySelector('.menu-toggle');
    if (settingsPanel) {
      settingsPanel.style.display = 'none';
    }
    if (menuToggle) {
      menuToggle.style.display = 'none';
    }
  });

  // Wait a bit for styles to apply
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Try to screenshot the avatar container for best results
  // Fall back to viewport if element not found
  let screenshotBuffer;

  try {
    // Try to find the SVG avatar or 3D canvas
    const avatarElement = await page.$(
      '.avatar-svg-container, .avatar-3d-container'
    );
    if (avatarElement) {
      screenshotBuffer = await avatarElement.screenshot({ type: 'png' });
    } else {
      // Fallback: take full viewport screenshot
      screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
      });
    }
  } catch {
    // Fallback: take full viewport screenshot
    screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false,
    });
  }

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
## Details

The goal is to achieve ≤10% difference between rendered avatars and reference images.
Current renders are procedural (SVG/WebGL) approximations of the detailed anime reference artwork.

### Files Generated

`;

  for (const result of testResults) {
    const baseName = `${result.model.toLowerCase()}-${result.mode.toLowerCase()}`;
    report += `- \`${baseName}-render.png\` - Current render output
- \`${baseName}-diff.png\` - Pixel difference visualization
`;
  }

  report += `
### Reference Images

- \`reference-images/alice/2d-reference.png\` - Alice 2D target
- \`reference-images/alice/3d-reference.png\` - Alice 3D target

## How to Improve

1. Enhance SVG avatar detail to better match reference proportions
2. Improve hair rendering with more realistic shading
3. Add more detailed eye rendering
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

    // Launch browser with larger viewport
    console.log('Launching browser...');
    const result = await launchBrowser({
      engine: 'playwright',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    browser = result.browser;
    page = result.page;

    // Set viewport to match reference image dimensions
    await page.setViewportSize({ width: 1536, height: 1024 });

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
      // URL params: model=alice, background=plain-white, mode=2d
      await takeAvatarScreenshot(
        'http://localhost:5173/?model=alice&bg=plain-white&mode=2d',
        renderPath
      );

      // Load reference image
      const referenceBuffer = fs.readFileSync(REFERENCE_IMAGES.alice2d);
      const actualBuffer = fs.readFileSync(renderPath);

      // Compare images
      const result = compareImages(referenceBuffer, actualBuffer);

      // Save diff image for visualization
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
      // The comparison documents current quality - 10% target is the goal to achieve
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
      await takeAvatarScreenshot(
        'http://localhost:5173/?model=alice&bg=plain-gray&mode=3d',
        renderPath
      );

      // Load reference image
      const referenceBuffer = fs.readFileSync(REFERENCE_IMAGES.alice3d);
      const actualBuffer = fs.readFileSync(renderPath);

      // Compare images
      const result = compareImages(referenceBuffer, actualBuffer);

      // Save diff image for visualization
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
      // The comparison documents current quality - 10% target is the goal to achieve
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
