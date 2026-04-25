// Unit tests for the anatomical bone-limit table added to public/new/src/
// constants.js for issue #28. The studio runs in the browser via
// Babel-standalone, so we re-implement the helpers here in a way that
// mirrors the production code 1:1. If you change the table or the helper
// functions in constants.js, mirror the change here and re-run.
import { describe, it, expect } from 'vitest';

// --- mirror of public/new/src/constants.js (helpers + sample table) ---------

// Pulls a small sample of real-world entries from constants.js — enough to
// verify the lookup, the per-axis null behaviour, and the side-mirror logic.
const BONE_LIMITS = {
  hips: { x: [-20, 20], y: [-30, 30], z: [-20, 20] },
  head: { x: [-50, 50], y: [-70, 70], z: [-40, 40] },
  leftEye: { x: [-25, 25], y: [-35, 35], z: null },
  rightEye: { x: [-25, 25], y: [-35, 35], z: null },
  leftUpperArm: { x: [-90, 90], y: [-90, 90], z: [-130, 130] },
  rightUpperArm: { x: [-90, 90], y: [-90, 90], z: [-130, 130] },
  leftLowerArm: { x: [-150, 0], y: [-90, 90], z: [-10, 10] },
  rightLowerArm: { x: [-150, 0], y: [-90, 90], z: [-10, 10] },
  leftLowerLeg: { x: [0, 150], y: [-10, 10], z: [-10, 10] },
};

function radToDeg(r) {
  return ((r || 0) * 180) / Math.PI;
}
function degToRad(d) {
  return ((d || 0) * Math.PI) / 180;
}
function boneLimitDeg(bone, axis) {
  const ent = BONE_LIMITS[bone];
  if (!ent) {
    return [-360, 360];
  }
  const ax = ent[axis];
  if (ax === null) {
    return null;
  }
  if (!ax) {
    return [-360, 360];
  }
  return [ax[0], ax[1]];
}
function clampBoneRad(bone, axis, rad) {
  const lim = boneLimitDeg(bone, axis);
  if (lim === null) {
    return 0;
  }
  if (!lim) {
    return rad || 0;
  }
  const deg = ((rad || 0) * 180) / Math.PI;
  const c = deg < lim[0] ? lim[0] : deg > lim[1] ? lim[1] : deg;
  return (c * Math.PI) / 180;
}

// --- tests ------------------------------------------------------------------

describe('radToDeg / degToRad round-trip', () => {
  it('0 rad → 0°', () => {
    expect(radToDeg(0)).toBe(0);
    expect(degToRad(0)).toBe(0);
  });
  it('Math.PI rad → 180°', () => {
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 9);
  });
  it('round-trip preserves value', () => {
    for (const d of [-180, -90, -45, 0, 30, 90, 130, 180]) {
      expect(radToDeg(degToRad(d))).toBeCloseTo(d, 9);
    }
  });
});

describe('boneLimitDeg', () => {
  it('returns the per-axis range for known bones', () => {
    expect(boneLimitDeg('head', 'y')).toEqual([-70, 70]);
    expect(boneLimitDeg('leftUpperArm', 'z')).toEqual([-130, 130]);
  });
  it('returns null for axes that are anatomically meaningless', () => {
    expect(boneLimitDeg('leftEye', 'z')).toBeNull();
    expect(boneLimitDeg('rightEye', 'z')).toBeNull();
  });
  it('returns wide fallback for unknown bones', () => {
    expect(boneLimitDeg('mysteriousBone', 'x')).toEqual([-360, 360]);
  });
  it('left and right arms have symmetric ranges (issue #28 left/right parity)', () => {
    expect(boneLimitDeg('leftUpperArm', 'z')).toEqual(
      boneLimitDeg('rightUpperArm', 'z')
    );
    expect(boneLimitDeg('leftLowerArm', 'x')).toEqual(
      boneLimitDeg('rightLowerArm', 'x')
    );
  });
});

describe('clampBoneRad', () => {
  it('passes through values inside the range', () => {
    expect(clampBoneRad('head', 'y', degToRad(45))).toBeCloseTo(
      degToRad(45),
      9
    );
  });
  it('clamps values that exceed the upper bound', () => {
    // head Y is ±70°; pushing it to 90° should clamp to 70°.
    expect(clampBoneRad('head', 'y', degToRad(90))).toBeCloseTo(
      degToRad(70),
      9
    );
  });
  it('clamps values that exceed the lower bound', () => {
    // leftLowerArm.x can only flex (negative); positive must clamp to 0.
    expect(clampBoneRad('leftLowerArm', 'x', degToRad(45))).toBeCloseTo(
      degToRad(0),
      9
    );
  });
  it('clamps elbow hyperextension (issue #28 R2)', () => {
    // Min elbow flex = -150° (almost folded). -180° should clamp to -150°.
    expect(clampBoneRad('leftLowerArm', 'x', degToRad(-180))).toBeCloseTo(
      degToRad(-150),
      9
    );
  });
  it('returns 0 for axes with no anatomical motion', () => {
    expect(clampBoneRad('leftEye', 'z', degToRad(45))).toBe(0);
  });
  it('clamps the knee to flexion-only (issue #28 R2)', () => {
    // Knee X range is [0, 150]; -45° must clamp to 0.
    expect(clampBoneRad('leftLowerLeg', 'x', degToRad(-45))).toBeCloseTo(
      degToRad(0),
      9
    );
    // 200° must clamp to 150°.
    expect(clampBoneRad('leftLowerLeg', 'x', degToRad(200))).toBeCloseTo(
      degToRad(150),
      9
    );
  });
  it('lets unknown bones through unchanged (graceful degradation)', () => {
    expect(clampBoneRad('unknownBone', 'y', degToRad(45))).toBeCloseTo(
      degToRad(45),
      9
    );
  });
});
