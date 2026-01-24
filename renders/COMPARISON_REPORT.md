# Avatar Render Comparison Report

Generated: 2026-01-24T19:51:02.214Z

## Summary

| Model | Mode | Difference | Target | Status |
| ----- | ---- | ---------- | ------ | ------ |
| Alice | 2D   | 41.54%     | ≤10%   | ⚠️ WIP |
| Alice | 3D   | 64.20%     | ≤10%   | ⚠️ WIP |

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

- `alice-2d-render.png` - Original render output
- `alice-2d-aligned.png` - Render aligned to reference landmarks
- `alice-2d-diff.png` - Pixel difference visualization (aligned)
- `alice-3d-render.png` - Original render output
- `alice-3d-aligned.png` - Render aligned to reference landmarks
- `alice-3d-diff.png` - Pixel difference visualization (aligned)

### Reference Images

- `reference-images/alice/2d-reference.png` - Alice 2D target
- `reference-images/alice/3d-reference.png` - Alice 3D target

## How to Improve

1. Match eye proportions more closely to reference
2. Improve hair silhouette and shading
3. Add more detailed facial features
4. Refine clothing details and shading
