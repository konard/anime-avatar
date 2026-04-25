// Unit tests for the face-front-aware look-at math added to public/new/src/apply.js
// to fix issue #26. The studio runs in the browser via Babel-standalone, so we
// re-implement the two pure functions here in a way that mirrors the production
// code 1:1 (same names, same signatures, same constants). If you change the
// formulas in apply.js, mirror the change here and re-run.
import { describe, it, expect } from 'vitest';

// --- mirror of public/new/src/apply.js --------------------------------------
function getFaceFrontSign(vrm) {
  const ff = vrm?.lookAt?.faceFront;
  if (ff && typeof ff.z === 'number' && ff.z !== 0) {
    return Math.sign(ff.z);
  }
  if (vrm?.meta?.metaVersion === '0') {
    return -1;
  }
  return 1;
}

// Sign applied to X/Z components of any user/preset/gesture/follow rotation
// pushed into a humanoid bone. Mirrors public/new/src/apply.js — matches
// faceFrontSign for our VRM 0/1 presets but is logically distinct (it
// tracks scene-rotation-induced bone-axis mirroring, not face-front axis).
function getBoneAxisFlip(vrm) {
  return getFaceFrontSign(vrm) === -1 ? -1 : 1;
}

// World→head-local angles (yaw, pitch). headWorldYaw is in radians; we model
// the head as a node at (0, 1.5, 0) rotated by headWorldYaw around Y so the
// matrix-invert math reduces to a Y rotation.
function worldPointToHeadAngles({ vrm, headWorld, headWorldYaw, worldPoint }) {
  const dx = worldPoint.x - headWorld.x;
  const dy = worldPoint.y - headWorld.y;
  const dz = worldPoint.z - headWorld.z;
  const c = Math.cos(-headWorldYaw),
    s = Math.sin(-headWorldYaw);
  const lx = c * dx + s * dz;
  const ly = dy;
  const lz = -s * dx + c * dz;
  const fz = getFaceFrontSign(vrm);
  const yaw = (Math.atan2(lx * fz, lz * fz) * 180) / Math.PI;
  const pitch = (Math.atan2(ly, Math.sqrt(lx * lx + lz * lz)) * 180) / Math.PI;
  return { yaw, pitch, local: { x: lx, y: ly, z: lz } };
}

// World-space lookTarget for a desired (yaw, pitch) at distance d. Same
// face-front sign keeps the target in front of the model in BOTH VRM versions.
function buildLookTargetWorld({
  vrm,
  headWorld,
  headWorldYaw,
  yawDeg,
  pitchDeg,
  dist = 5,
}) {
  const yawR = (yawDeg * Math.PI) / 180;
  const pitchR = (pitchDeg * Math.PI) / 180;
  const fz = getFaceFrontSign(vrm);
  const lx = fz * Math.sin(yawR) * Math.cos(pitchR) * dist;
  const ly = Math.sin(pitchR) * dist;
  const lz = fz * Math.cos(yawR) * Math.cos(pitchR) * dist;
  // Apply head's world matrix: rotate by headWorldYaw around Y, then translate.
  const c = Math.cos(headWorldYaw),
    s = Math.sin(headWorldYaw);
  return {
    x: c * lx + s * lz + headWorld.x,
    y: ly + headWorld.y,
    z: -s * lx + c * lz + headWorld.z,
  };
}

// --- fixtures ---------------------------------------------------------------
const vrm1 = {
  meta: { metaVersion: '1.0' },
  lookAt: { faceFront: { x: 0, y: 0, z: 1 } },
};
const vrm0 = {
  meta: { metaVersion: '0' },
  lookAt: { faceFront: { x: 0, y: 0, z: -1 } },
};
const vrm0NoFaceFront = { meta: { metaVersion: '0' } };

const head = { x: 0, y: 1.5, z: 0 };
const APPROX = 1e-6;

// --- tests ------------------------------------------------------------------
describe('getFaceFrontSign', () => {
  it('returns +1 for VRM 1.0 models', () => {
    expect(getFaceFrontSign(vrm1)).toBe(1);
  });

  it('returns -1 for VRM 0.x models with explicit faceFront', () => {
    expect(getFaceFrontSign(vrm0)).toBe(-1);
  });

  it('falls back to -1 when faceFront is missing but metaVersion === "0"', () => {
    expect(getFaceFrontSign(vrm0NoFaceFront)).toBe(-1);
  });

  it('returns +1 when nothing is known', () => {
    expect(getFaceFrontSign({ meta: {} })).toBe(1);
    expect(getFaceFrontSign(undefined)).toBe(1);
  });
});

describe('worldPointToHeadAngles — VRM 1.0 (faceFront +Z)', () => {
  // VRM 1 sits at scene rotation 0, so headWorldYaw = 0.
  it('camera in front (world +Z) → yaw≈0', () => {
    const { yaw, pitch } = worldPointToHeadAngles({
      vrm: vrm1,
      headWorld: head,
      headWorldYaw: 0,
      worldPoint: { x: 0, y: 1.5, z: 3 },
    });
    expect(yaw).toBeCloseTo(0, 5);
    expect(pitch).toBeCloseTo(0, 5);
  });

  it('camera to the right (world +X) → yaw=+90°', () => {
    const { yaw } = worldPointToHeadAngles({
      vrm: vrm1,
      headWorld: head,
      headWorldYaw: 0,
      worldPoint: { x: 3, y: 1.5, z: 0 },
    });
    expect(yaw).toBeCloseTo(90, 5);
  });

  it('camera to the left (world -X) → yaw=-90°', () => {
    const { yaw } = worldPointToHeadAngles({
      vrm: vrm1,
      headWorld: head,
      headWorldYaw: 0,
      worldPoint: { x: -3, y: 1.5, z: 0 },
    });
    expect(yaw).toBeCloseTo(-90, 5);
  });

  it('camera above & in front → pitch>0', () => {
    const { yaw, pitch } = worldPointToHeadAngles({
      vrm: vrm1,
      headWorld: head,
      headWorldYaw: 0,
      worldPoint: { x: 0, y: 3, z: 3 },
    });
    expect(yaw).toBeCloseTo(0, 5);
    expect(pitch).toBeGreaterThan(0);
  });
});

describe('worldPointToHeadAngles — VRM 0.x (faceFront -Z, scene rotated π)', () => {
  // VRM 0 needs scene.rotation.y = π (rotateVRM0 + our baseYaw).
  const yaw0 = Math.PI;

  it('camera in front (world +Z) → yaw≈0 (was -180° before fix)', () => {
    const { yaw, pitch } = worldPointToHeadAngles({
      vrm: vrm0,
      headWorld: head,
      headWorldYaw: yaw0,
      worldPoint: { x: 0, y: 1.5, z: 3 },
    });
    expect(yaw).toBeCloseTo(0, 5);
    expect(pitch).toBeCloseTo(0, 5);
  });

  it('camera to the right (world +X) → yaw=+90° (was -90° before fix)', () => {
    const { yaw } = worldPointToHeadAngles({
      vrm: vrm0,
      headWorld: head,
      headWorldYaw: yaw0,
      worldPoint: { x: 3, y: 1.5, z: 0 },
    });
    expect(yaw).toBeCloseTo(90, 5);
  });

  it('camera to the left (world -X) → yaw=-90° (was +90° before fix)', () => {
    const { yaw } = worldPointToHeadAngles({
      vrm: vrm0,
      headWorld: head,
      headWorldYaw: yaw0,
      worldPoint: { x: -3, y: 1.5, z: 0 },
    });
    expect(yaw).toBeCloseTo(-90, 5);
  });

  it('camera above & in front → pitch>0 (sign of pitch unchanged across versions)', () => {
    const { pitch } = worldPointToHeadAngles({
      vrm: vrm0,
      headWorld: head,
      headWorldYaw: yaw0,
      worldPoint: { x: 0, y: 3, z: 3 },
    });
    expect(pitch).toBeGreaterThan(0);
  });

  it('falls back correctly when faceFront is missing (uses metaVersion)', () => {
    const { yaw } = worldPointToHeadAngles({
      vrm: vrm0NoFaceFront,
      headWorld: head,
      headWorldYaw: yaw0,
      worldPoint: { x: 0, y: 1.5, z: 3 },
    });
    expect(yaw).toBeCloseTo(0, 5);
  });
});

describe('buildLookTargetWorld — keeps target in front of model', () => {
  it('VRM 1.0 with yaw=0 puts target at world +Z', () => {
    const w = buildLookTargetWorld({
      vrm: vrm1,
      headWorld: head,
      headWorldYaw: 0,
      yawDeg: 0,
      pitchDeg: 0,
    });
    expect(w.z).toBeCloseTo(5, 5);
    expect(w.x).toBeCloseTo(0, 5);
  });

  it('VRM 0.x with scene rotated π and yaw=0 puts target at world +Z (was -Z before fix)', () => {
    const w = buildLookTargetWorld({
      vrm: vrm0,
      headWorld: head,
      headWorldYaw: Math.PI,
      yawDeg: 0,
      pitchDeg: 0,
    });
    expect(w.z).toBeCloseTo(5, 5);
    expect(w.x).toBeCloseTo(0, 5);
  });

  it('VRM 0.x with yaw=+90° puts target at world +X (camera-to-the-right round-trip)', () => {
    const w = buildLookTargetWorld({
      vrm: vrm0,
      headWorld: head,
      headWorldYaw: Math.PI,
      yawDeg: 90,
      pitchDeg: 0,
    });
    expect(w.x).toBeCloseTo(5, 5);
    expect(Math.abs(w.z)).toBeLessThan(APPROX);
  });
});

describe('round-trip: angle → target → angle is identity', () => {
  for (const [name, vrm, headYaw] of [
    ['VRM 1', vrm1, 0],
    ['VRM 0', vrm0, Math.PI],
  ]) {
    for (const yaw of [-60, -30, 0, 30, 60]) {
      it(`${name}: yaw=${yaw}° survives target placement`, () => {
        const target = buildLookTargetWorld({
          vrm,
          headWorld: head,
          headWorldYaw: headYaw,
          yawDeg: yaw,
          pitchDeg: 0,
        });
        const { yaw: yawBack } = worldPointToHeadAngles({
          vrm,
          headWorld: head,
          headWorldYaw: headYaw,
          worldPoint: target,
        });
        expect(yawBack).toBeCloseTo(yaw, 5);
      });
    }
  }
});

// --- Issue #26 follow-up: pitch sign on the head bone ----------------------
// The follow-camera path stores headPitch in `idle.headPitchCur` and applies
// `head.rotation.x += -axisFlip * headPitch * (π/180)`. The mathematical
// claim we test here: for the same world target above the head, the FINAL
// rotation applied to the head bone produces the same world-space "look up"
// effect for both VRM 0 and VRM 1.
//
// We model the head bone as a node attached to a parent that is rotated by
// `headWorldYaw` around Y. `head.rotation.x = α` rotates the head bone
// around its local X axis. In world coordinates, that local X axis is
// (cos(headWorldYaw), 0, sin(headWorldYaw)) — i.e. world +X for VRM 1
// (headWorldYaw=0) and world -X for VRM 0 (headWorldYaw=π). Applying the
// same world-equivalent rotation through these two axes requires opposite
// signs on α — exactly what `axisFlip` provides.
describe('head pitch follow-camera sign for VRM 0 vs VRM 1', () => {
  // The smoothed angle the studio computes for "camera 26.57° above head".
  const headPitchDeg = 26.57;

  it('VRM 1 applies head.rotation.x = -headPitch (looks UP toward camera)', () => {
    const axisFlip = getBoneAxisFlip(vrm1);
    expect(axisFlip).toBe(1);
    const rotX = -axisFlip * headPitchDeg * (Math.PI / 180);
    expect(rotX).toBeCloseTo(-(headPitchDeg * Math.PI) / 180, 8);
    expect(rotX).toBeLessThan(0);
  });

  it('VRM 0 applies head.rotation.x = +headPitch (also looks UP toward camera)', () => {
    const axisFlip = getBoneAxisFlip(vrm0);
    expect(axisFlip).toBe(-1);
    const rotX = -axisFlip * headPitchDeg * (Math.PI / 180);
    // Sign flipped relative to VRM 1: the head's local X axis is mirrored
    // in world space, so the same world-effect requires the opposite local α.
    expect(rotX).toBeCloseTo((headPitchDeg * Math.PI) / 180, 8);
    expect(rotX).toBeGreaterThan(0);
  });

  // Independent verification: roll the head's face direction through both
  // versions' head.rotation.x and check it ends up tilted UP (positive world Y)
  // in both cases, by the same amount.
  function rotateAroundAxis(v, axis, ang) {
    // Rodrigues formula.
    const c = Math.cos(ang),
      s = Math.sin(ang);
    const k = axis;
    const dot = k.x * v.x + k.y * v.y + k.z * v.z;
    const cross = {
      x: k.y * v.z - k.z * v.y,
      y: k.z * v.x - k.x * v.z,
      z: k.x * v.y - k.y * v.x,
    };
    return {
      x: v.x * c + cross.x * s + k.x * dot * (1 - c),
      y: v.y * c + cross.y * s + k.y * dot * (1 - c),
      z: v.z * c + cross.z * s + k.z * dot * (1 - c),
    };
  }

  it('the rotation produces the same world-space face tilt-up for both VRM versions', () => {
    const expected = (headPitchDeg * Math.PI) / 180;

    for (const [vrm, headWorldYaw] of [
      [vrm1, 0],
      [vrm0, Math.PI],
    ]) {
      const axisFlip = getBoneAxisFlip(vrm);
      const localXAxis = {
        x: Math.cos(headWorldYaw),
        y: 0,
        z: -Math.sin(headWorldYaw),
      };
      // Initial face direction in world space: VRM 1 face = (0,0,+1) (head
      // local +Z = world +Z), VRM 0 face = (0,0,+1) too (head local -Z
      // mirrored by parent π = world +Z).
      const face0 = { x: 0, y: 0, z: 1 };
      const rotX = -axisFlip * headPitchDeg * (Math.PI / 180);
      const face1 = rotateAroundAxis(face0, localXAxis, rotX);
      // Face should now have y > 0 (looking up) and roughly equal magnitude
      // for both versions.
      expect(face1.y).toBeCloseTo(Math.sin(expected), 8);
      expect(face1.z).toBeCloseTo(Math.cos(expected), 8);
    }
  });
});

// --- Bone-axis flip: pose / gesture rotations applied to humanoid bones ---
// The same scene-π rotation that mirrors head.rotation.x also mirrors every
// other humanoid bone's local X and Z axes. Pose presets (e.g. thinker
// `head: {x: 0.2}` = head down) and gesture deltas (e.g. nod
// `head.x = sin(t)`) are written in VRM 1 conventions — they need their
// X/Z components flipped before being applied to a VRM 0 bone, otherwise
// they produce the OPPOSITE visual motion. This is the symptom Alicia hit
// on the "thinker" pose (both arms went UP instead of arms-down + chin-up).
describe('getBoneAxisFlip', () => {
  it('returns +1 for VRM 1.0 models (no scene rotation)', () => {
    expect(getBoneAxisFlip(vrm1)).toBe(1);
  });

  it('returns -1 for VRM 0.x models (scene rotated π by VRMUtils.rotateVRM0)', () => {
    expect(getBoneAxisFlip(vrm0)).toBe(-1);
  });

  it('falls back to -1 when faceFront is missing but metaVersion === "0"', () => {
    expect(getBoneAxisFlip(vrm0NoFaceFront)).toBe(-1);
  });

  it('returns +1 when nothing is known (safe default for unknown models)', () => {
    expect(getBoneAxisFlip({ meta: {} })).toBe(1);
    expect(getBoneAxisFlip(undefined)).toBe(1);
  });
});

describe('bone rotation flip — preset/cfg X/Z mirror across VRM versions', () => {
  // Thinker preset: { head: { x: 0.2 }, ... }. The VRM 1 author intent:
  // tip head down by 0.2 rad. After the flip we should pass -0.2 rad to
  // Alicia's head bone — which, applied around her mirrored local X axis,
  // produces the same world-space "tip down" rotation.
  function applyFlip(vrm, rot) {
    const f = getBoneAxisFlip(vrm);
    return { x: (rot.x || 0) * f, y: rot.y || 0, z: (rot.z || 0) * f };
  }

  it('passes user rotations unchanged for VRM 1.0', () => {
    const r = applyFlip(vrm1, { x: 0.2, y: -0.1, z: 0.05 });
    expect(r).toEqual({ x: 0.2, y: -0.1, z: 0.05 });
  });

  it('flips X and Z (but not Y) for VRM 0.x', () => {
    const r = applyFlip(vrm0, { x: 0.2, y: -0.1, z: 0.05 });
    expect(r.x).toBeCloseTo(-0.2);
    expect(r.y).toBeCloseTo(-0.1); // Y rotation around world up — unaffected.
    expect(r.z).toBeCloseTo(-0.05);
  });

  it('handles missing components as zero', () => {
    const r1 = applyFlip(vrm0, {});
    // -0 vs +0 don't matter visually; compare magnitudes.
    expect(Math.abs(r1.x)).toBe(0);
    expect(Math.abs(r1.y)).toBe(0);
    expect(Math.abs(r1.z)).toBe(0);
    const r2 = applyFlip(vrm0, { y: 0.3 });
    expect(Math.abs(r2.x)).toBe(0);
    expect(r2.y).toBeCloseTo(0.3);
    expect(Math.abs(r2.z)).toBe(0);
  });

  // Roundtrip: applying the flip twice cancels out — invariant for any vrm.
  it('flip is its own inverse (involution) for both VRM versions', () => {
    for (const vrm of [vrm1, vrm0]) {
      const original = { x: 0.7, y: -0.4, z: 0.15 };
      const once = applyFlip(vrm, original);
      const twice = applyFlip(vrm, once);
      expect(twice.x).toBeCloseTo(original.x);
      expect(twice.y).toBeCloseTo(original.y);
      expect(twice.z).toBeCloseTo(original.z);
    }
  });
});
