// Headless reproduction script for issue #28 anatomical bone limits.
// Run with `node experiments/issue-28-bone-limits.mjs`. Useful for sanity-
// checking the table without booting the studio: prints, for each major
// joint, what a "hyper-extended" preset is clamped to.
//
// The studio's runtime exposes the same API as `window.ACS_clampBoneRad` /
// `window.ACS_boneLimitDeg` from `public/new/src/constants.js`. We mirror a
// minimal slice here so this script is self-contained.

const BONE_LIMITS = {
  hips: { x: [-20, 20], y: [-30, 30], z: [-20, 20] },
  spine: { x: [-30, 60], y: [-45, 45], z: [-30, 30] },
  chest: { x: [-20, 45], y: [-30, 30], z: [-25, 25] },
  upperChest: { x: [-15, 30], y: [-25, 25], z: [-20, 20] },
  neck: { x: [-45, 45], y: [-50, 50], z: [-30, 30] },
  head: { x: [-50, 50], y: [-70, 70], z: [-40, 40] },
  jaw: { x: [0, 35], y: [-10, 10], z: [-10, 10] },
  leftEye: { x: [-25, 25], y: [-35, 35], z: null },
  rightEye: { x: [-25, 25], y: [-35, 35], z: null },
  leftShoulder: { x: [-20, 20], y: [-30, 30], z: [-30, 30] },
  rightShoulder: { x: [-20, 20], y: [-30, 30], z: [-30, 30] },
  leftUpperArm: { x: [-90, 90], y: [-90, 90], z: [-130, 130] },
  rightUpperArm: { x: [-90, 90], y: [-90, 90], z: [-130, 130] },
  leftLowerArm: { x: [-150, 0], y: [-90, 90], z: [-10, 10] },
  rightLowerArm: { x: [-150, 0], y: [-90, 90], z: [-10, 10] },
  leftHand: { x: [-80, 80], y: [-60, 60], z: [-30, 30] },
  rightHand: { x: [-80, 80], y: [-60, 60], z: [-30, 30] },
  leftUpperLeg: { x: [-30, 120], y: [-45, 45], z: [-45, 45] },
  rightUpperLeg: { x: [-30, 120], y: [-45, 45], z: [-45, 45] },
  leftLowerLeg: { x: [0, 150], y: [-10, 10], z: [-10, 10] },
  rightLowerLeg: { x: [0, 150], y: [-10, 10], z: [-10, 10] },
};

const radToDeg = (r) => ((r || 0) * 180) / Math.PI;
const degToRad = (d) => ((d || 0) * Math.PI) / 180;

function boneLimitDeg(bone, axis) {
  const ent = BONE_LIMITS[bone];
  if (!ent) return [-360, 360];
  const ax = ent[axis];
  if (ax === null) return null;
  if (!ax) return [-360, 360];
  return [ax[0], ax[1]];
}

function clampBoneRad(bone, axis, rad) {
  const lim = boneLimitDeg(bone, axis);
  if (lim === null) return 0;
  if (!lim) return rad || 0;
  const deg = ((rad || 0) * 180) / Math.PI;
  const c = deg < lim[0] ? lim[0] : deg > lim[1] ? lim[1] : deg;
  return (c * Math.PI) / 180;
}

// "Hyper" pose — every axis pushed to ±π. Issue #28 R2 expects every
// component to clamp to the anatomical range below.
const hyperPose = {
  hips: { x: Math.PI, y: -Math.PI, z: Math.PI },
  head: { x: Math.PI, y: -Math.PI, z: Math.PI },
  leftUpperArm: { x: Math.PI, y: -Math.PI, z: Math.PI },
  leftLowerArm: { x: -Math.PI, y: Math.PI, z: -Math.PI },
  leftLowerLeg: { x: -Math.PI, y: 0, z: 0 },
  leftEye: { x: Math.PI, y: -Math.PI, z: Math.PI },
};

const fmt = (deg) => (Math.abs(deg) < 0.01 ? '0°' : `${deg.toFixed(1)}°`);
console.log('Bone | axis | input°    | clamped° | range');
console.log('---- | ---- | ---------:| --------:| -----');
for (const [bone, eul] of Object.entries(hyperPose)) {
  for (const ax of ['x', 'y', 'z']) {
    const inDeg = radToDeg(eul[ax] ?? 0);
    const lim = boneLimitDeg(bone, ax);
    const outDeg = radToDeg(clampBoneRad(bone, ax, eul[ax] ?? 0));
    const limStr = lim === null ? 'null' : `[${lim[0]}, ${lim[1]}]`;
    console.log(`${bone} | ${ax} | ${fmt(inDeg).padStart(8)} | ${fmt(outDeg).padStart(8)} | ${limStr}`);
  }
}

// Quick assertions so a regression in the table fails CI noisily when the
// script is included in npm test in the future.
function assertEq(actual, expected, label) {
  if (Math.abs(actual - expected) > 0.001) {
    console.error(`FAIL: ${label} got ${actual}, expected ${expected}`);
    process.exit(1);
  }
}
assertEq(radToDeg(clampBoneRad('leftLowerArm', 'x', -Math.PI)), -150, 'elbow hyperextension');
assertEq(radToDeg(clampBoneRad('leftLowerLeg', 'x', -Math.PI / 2)), 0, 'knee back-bend');
assertEq(clampBoneRad('leftEye', 'z', Math.PI), 0, 'eye Z forced to 0');
assertEq(radToDeg(clampBoneRad('head', 'y', Math.PI)), 70, 'head yaw clamp');
console.log('\nAll anatomical clamps OK.');
