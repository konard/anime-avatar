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
