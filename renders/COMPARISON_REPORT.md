# Avatar Render Comparison Report

Generated: 2026-01-24T20:10:53.443Z

## Summary

| Model | Mode | Difference | Target | Status |
| ----- | ---- | ---------- | ------ | ------ |
| Alice | 2D   | 45.88%     | ≤10%   | ⚠️ WIP |
| Alice | 3D   | 69.31%     | ≤10%   | ⚠️ WIP |

## Comparison Method

Images are compared using **direct pixel comparison**:

1. The render is taken at viewport size matching reference dimensions
2. If dimensions differ, the render is center-cropped/padded to match
3. Pixel comparison is performed using pixelmatch with 0.1 threshold

Render-level alignment is achieved through URL parameters:

- `cameraY`, `cameraZ` for 3D camera positioning
- `viewportCenterY` for 2D SVG viewport centering
- `scale` for zoom level

## Visual Comparison

### Alice 2D (SVG)

| Reference                                                | Render                         | Diff                       |
| -------------------------------------------------------- | ------------------------------ | -------------------------- |
| ![Reference](../reference-images/alice/2d-reference.png) | ![Render](alice-2d-render.png) | ![Diff](alice-2d-diff.png) |

### Alice 3D (WebGL)

| Reference                                                | Render                         | Diff                       |
| -------------------------------------------------------- | ------------------------------ | -------------------------- |
| ![Reference](../reference-images/alice/3d-reference.png) | ![Render](alice-3d-render.png) | ![Diff](alice-3d-diff.png) |

## Details

The goal is to achieve ≤10% difference between rendered avatars and reference images.
Current renders are procedural (SVG/WebGL) approximations of the detailed anime reference artwork.

### Files Generated

- `alice-2d-render.png` - Original render output
- `alice-2d-diff.png` - Pixel difference visualization
- `alice-3d-render.png` - Original render output
- `alice-3d-diff.png` - Pixel difference visualization

### Reference Images

- `reference-images/alice/2d-reference.png` - Alice 2D target
- `reference-images/alice/3d-reference.png` - Alice 3D target

## How to Improve

1. Adjust render parameters (cameraY, cameraZ, scale) to better match framing
2. Match eye proportions more closely to reference
3. Improve hair silhouette and shading
4. Add more detailed facial features
5. Refine clothing details and shading
