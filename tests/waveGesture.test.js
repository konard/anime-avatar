// Unit tests for the wave gesture trajectory added in issue #28.
// The original implementation set rightUpperArm.z = -2.27 rad (-130°) which
// swung the arm past vertical and across the body — the user complaint was
// "the hand goes through neck and head". This test guards against that
// regression by validating the rotation magnitudes and (via a simple
// matrix-based forward kinematics chain) the world-space hand trajectory.
//
// IMPORTANT: keep the wave-delta math here in sync with
// public/new/src/gestures.js. The gesture module owns the source of truth
// (it lives in the runtime bundle); this file replicates the same formula
// because vitest runs in node where window.ACS_* doesn't exist.
import { describe, it, expect } from 'vitest';

// --- gesture math (mirror of public/new/src/gestures.js wave branch) -------

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function sustained(t) {
  if (t < 0.2) {
    return easeInOut(t / 0.2);
  }
  if (t < 0.8) {
    return 1;
  }
  return easeInOut((1 - t) / 0.2);
}
function waveDelta(t, amp = 1.0) {
  const up = sustained(t);
  return {
    rightUpperArm: {
      x: -0.3 * up * amp,
      y: -0.2 * up * amp,
      z: -1.3 * up * amp,
    },
    rightLowerArm: {
      x: -1.4 * up * amp,
      y: -0.2 * up * amp,
      z: 0,
    },
    rightHand: {
      x: 0,
      y: 0,
      z: Math.sin(t * Math.PI * 6) * 0.45 * up * amp,
    },
  };
}

// --- forward-kinematics helpers (matches three.js Euler 'XYZ' order) -------

function matMul(a, b) {
  const out = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      for (let k = 0; k < 4; k++) {
        out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
      }
    }
  }
  return out;
}
function matFromEulerXYZ(x, y, z) {
  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);
  const m = new Array(16).fill(0);
  m[15] = 1;
  m[0] = cy * cz;
  m[4] = -cy * sz;
  m[8] = sy;
  m[1] = cx * sz + sx * sy * cz;
  m[5] = cx * cz - sx * sy * sz;
  m[9] = -sx * cy;
  m[2] = sx * sz - cx * sy * cz;
  m[6] = sx * cz + cx * sy * sz;
  m[10] = cx * cy;
  return m;
}
function matFromTranslation(x, y, z) {
  const m = new Array(16).fill(0);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}
function transformPoint(m, p) {
  return {
    x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12],
    y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13],
    z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14],
  };
}

// Approximate joint positions / segment lengths for a standard 1.6m VRM
// avatar (calibrated against the pixiv VRM1 sample). The right arm extends
// along -X in world space (arm raises to character's RIGHT, which is
// negative world X).
const SHOULDER = { x: -0.18, y: 1.38, z: -0.025 };
const HEAD = { x: 0.0, y: 1.51, z: -0.025 };
const NECK = { x: 0.0, y: 1.33, z: -0.03 };
const UPPER_ARM_LEN = 0.27;
const FOREARM_LEN = 0.25;
const HAND_LEN = 0.18;

function handWorldAt(t) {
  const d = waveDelta(t);
  const shoulderM = matFromTranslation(SHOULDER.x, SHOULDER.y, SHOULDER.z);
  const upperRotM = matFromEulerXYZ(
    d.rightUpperArm.x,
    d.rightUpperArm.y,
    d.rightUpperArm.z
  );
  const upperM = matMul(shoulderM, upperRotM);
  const elbowFrameM = matMul(upperM, matFromTranslation(-UPPER_ARM_LEN, 0, 0));
  const lowerRotM = matFromEulerXYZ(
    d.rightLowerArm.x,
    d.rightLowerArm.y,
    d.rightLowerArm.z
  );
  const lowerM = matMul(elbowFrameM, lowerRotM);
  const wristFrameM = matMul(lowerM, matFromTranslation(-FOREARM_LEN, 0, 0));
  const handRotM = matFromEulerXYZ(d.rightHand.x, d.rightHand.y, d.rightHand.z);
  const handM = matMul(wristFrameM, handRotM);
  return transformPoint(handM, { x: -HAND_LEN, y: 0, z: 0 });
}
function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// --- tests ------------------------------------------------------------------

describe('wave gesture rotation magnitudes (issue #28)', () => {
  it('rightUpperArm.z stays under -100° at peak (no swing-past-vertical)', () => {
    // At t=0.5 the envelope is 1.0, so the value equals the constant.
    const d = waveDelta(0.5);
    const zDeg = (d.rightUpperArm.z * 180) / Math.PI;
    // Original buggy value was -130°; new value must stay strictly less
    // negative than -100° so the arm doesn't swing past vertical and
    // across the body.
    expect(zDeg).toBeGreaterThan(-100);
    expect(zDeg).toBeLessThan(-50); // still raised meaningfully
  });

  it('rightLowerArm.x bends elbow ~80° forward (anatomical flexion only)', () => {
    const d = waveDelta(0.5);
    const xDeg = (d.rightLowerArm.x * 180) / Math.PI;
    expect(xDeg).toBeGreaterThan(-100); // not over-flexed
    expect(xDeg).toBeLessThan(-60); // meaningful bend
  });

  it('rightHand.z oscillates between approx ±26°', () => {
    const samples = [];
    for (let t = 0.3; t <= 0.7; t += 0.01) {
      const d = waveDelta(t);
      samples.push((d.rightHand.z * 180) / Math.PI);
    }
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    expect(max).toBeGreaterThan(20);
    expect(min).toBeLessThan(-20);
    expect(max).toBeLessThan(35);
    expect(min).toBeGreaterThan(-35);
  });
});

describe('wave gesture trajectory (issue #28: hand must not go through head/neck)', () => {
  it('hand stays at least 0.20 m from head centre throughout the gesture', () => {
    let minDist = Infinity;
    let minT = 0;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const d = dist(handWorldAt(t), HEAD);
      if (d < minDist) {
        minDist = d;
        minT = t;
      }
    }
    expect(
      minDist,
      `min hand→head distance ${minDist.toFixed(3)} m (at t=${minT.toFixed(2)}) — was 0.27m with the buggy gesture`
    ).toBeGreaterThan(0.2);
  });

  it('hand stays at least 0.20 m from neck centre throughout the gesture', () => {
    let minDist = Infinity;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const d = dist(handWorldAt(t), NECK);
      if (d < minDist) {
        minDist = d;
      }
    }
    expect(minDist).toBeGreaterThan(0.2);
  });

  it('hand never crosses past the body centerline (regression for "hand goes through head")', () => {
    let maxX = -Infinity;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const x = handWorldAt(t).x;
      if (x > maxX) {
        maxX = x;
      }
    }
    // Negative X is on the right side (where the right shoulder lives).
    // The buggy gesture pushed maxX to ≈+0.27. The fixed gesture must
    // keep the hand on the right side at all times.
    expect(
      maxX,
      `max hand X during gesture is ${maxX.toFixed(3)} (was +0.27 with the buggy gesture)`
    ).toBeLessThan(0.05);
  });

  it('hand reaches above shoulder height at the gesture peak', () => {
    const peak = handWorldAt(0.5);
    expect(peak.y).toBeGreaterThan(SHOULDER.y);
  });

  it('rest pose endpoints are anchored back to the rest pose (smooth start/end)', () => {
    const start = handWorldAt(0.0);
    const end = handWorldAt(1.0);
    // At t=0 and t=1 the envelope is 0, so all rotations are zero — the
    // hand should be at the rest-pose wrist position (not crossing the
    // body, comfortably below head height).
    expect(start.x).toBeCloseTo(end.x, 6);
    expect(start.y).toBeCloseTo(end.y, 6);
    expect(start.x).toBeLessThan(0); // rest pose: hand on right side
    expect(start.y).toBeLessThan(HEAD.y); // rest pose: hand below head
  });
});
