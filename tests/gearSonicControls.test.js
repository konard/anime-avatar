import { beforeAll, describe, expect, it } from 'vitest';

describe('GEAR-SONIC-inspired opt-in studio controls', () => {
  beforeAll(async () => {
    await import('../public/new/src/constants.js');
    await import('../public/new/src/defaults.js');
    await import('../public/new/src/apply.js');
  });

  it('keeps floor grid and mouse force disabled by default', () => {
    expect(window.ACS_DEFAULTS.floorGridEnabled).toBe(false);
    expect(window.ACS_DEFAULTS.mouseForceEnabled).toBe(false);
    expect(window.ACS_FLOOR_GRID_STYLES.map((style) => style.id)).toContain(
      window.ACS_DEFAULTS.floorGridStyle
    );
  });

  it('converts pointer drag state into a procedural body-force delta', () => {
    const delta = window.ACS_mouseForceDelta(
      {
        active: true,
        delta: { x: 0.35, y: -0.2 },
        targetBone: 'chest',
      },
      {
        mouseForceEnabled: true,
        mouseForceStrength: 0.8,
      }
    );

    expect(delta.active).toBe(true);
    expect(delta.rot.chest.z).not.toBe(0);
    expect(delta.rot.hips.y).not.toBe(0);
    expect(delta.exprs.surprised).toBeGreaterThan(0);
  });
});
