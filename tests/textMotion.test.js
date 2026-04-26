import { beforeAll, describe, expect, it } from 'vitest';

const GOOD_RESOURCES = {
  memoryMb: 4096,
  cpuCores: 8,
  wasm: true,
  webgl: true,
  webgpu: true,
};

describe('experimental text-to-motion browser adapter', () => {
  beforeAll(async () => {
    await import('../public/new/src/textMotion.js');
  });

  it('reports insufficient resources instead of creating a plan', () => {
    const plan = window.ACS_createTextMotionPlan('walk', {
      available: {
        memoryMb: 128,
        cpuCores: 1,
        wasm: true,
        webgl: false,
        webgpu: false,
      },
    });

    expect(plan.ok).toBe(false);
    expect(plan.status).toBe('insufficient-resources');
    expect(plan.reason).toContain('WebGL unavailable');
    expect(plan.reason).toContain('CPU cores 1 < 2');
  });

  it('parses walk and turn text into GR00T-style planner intents', () => {
    const plan = window.ACS_createTextMotionPlan('walk then turn left', {
      available: GOOD_RESOURCES,
    });

    expect(plan.ok).toBe(true);
    expect(plan.commands.map((command) => command.type)).toEqual([
      'walk',
      'turnLeft',
    ]);
    expect(plan.gr00tPlanner.modes).toEqual([2, 2]);
    expect(plan.gr00tPlanner.movementDirections[0]).toEqual([1, 0, 0]);
    expect(plan.gr00tPlanner.facingDirections[1][1]).toBeGreaterThan(0);
  });

  it('maps GEAR-SONIC reference motion prompts into planner metadata', () => {
    const plan = window.ACS_createTextMotionPlan('squat then standing kick', {
      available: GOOD_RESOURCES,
    });

    expect(plan.ok).toBe(true);
    expect(plan.commands.map((command) => command.type)).toEqual([
      'squat',
      'kick',
    ]);
    expect(plan.gearSonicPlanner.modes).toEqual([4, 0]);
    expect(plan.gearSonicPlanner.heights[0]).toBeGreaterThan(0);
    expect(plan.gearSonicPlanner.references[0]).toBe('squat_001__A359');
    expect(window.ACS_TEXT_MOTION_REFERENCE_PROMPTS.length).toBeGreaterThan(3);
  });

  it('generates leg and root deltas for a walk prompt', () => {
    const plan = window.ACS_createTextMotionPlan('walk', {
      available: GOOD_RESOURCES,
    });
    const delta = window.ACS_textMotionDelta(plan, 0.25);

    expect(delta.active).toBe(true);
    expect(delta.rot.leftUpperLeg).toBeDefined();
    expect(delta.rot.rightUpperLeg).toBeDefined();
    expect(Math.abs(delta.root.y)).toBeGreaterThan(0);
  });

  it('generates a yaw delta for turn right', () => {
    const plan = window.ACS_createTextMotionPlan('turn right', {
      available: GOOD_RESOURCES,
    });
    const delta = window.ACS_textMotionDelta(plan, 0.9);

    expect(delta.active).toBe(true);
    expect(delta.root.yaw).toBeLessThan(0);
    expect(delta.rot.hips.y).toBeLessThan(0);
  });

  it('fails unsupported prompts with a useful reason', () => {
    const plan = window.ACS_createTextMotionPlan('make tea', {
      available: GOOD_RESOURCES,
    });

    expect(plan.ok).toBe(false);
    expect(plan.status).toBe('unsupported-prompt');
    expect(plan.reason).toContain('walk');
  });

  it('generates body deltas for GEAR-SONIC squat and kick prompts', () => {
    const squat = window.ACS_createTextMotionPlan('squat', {
      available: GOOD_RESOURCES,
    });
    const squatDelta = window.ACS_textMotionDelta(squat, 0.7);

    expect(squatDelta.active).toBe(true);
    expect(squatDelta.rot.leftLowerLeg.x).toBeGreaterThan(0);
    expect(squatDelta.rot.rightLowerLeg.x).toBeGreaterThan(0);
    expect(squatDelta.root.y).toBeLessThan(0);

    const kick = window.ACS_createTextMotionPlan('standing kick', {
      available: GOOD_RESOURCES,
    });
    const kickDelta = window.ACS_textMotionDelta(kick, 0.45);

    expect(kickDelta.active).toBe(true);
    expect(kickDelta.rot.rightUpperLeg.x).toBeGreaterThan(0);
    expect(kickDelta.rot.leftUpperArm.x).toBeDefined();
  });
});
