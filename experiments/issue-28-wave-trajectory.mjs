// Headless trajectory verification for issue #28 wave gesture.
// Replicates the bone math inside `gestures.js` + `apply.js` and walks the
// gesture through its entire t∈[0,1] window, sampling the resulting RIGHT
// HAND world position every 0.02 seconds. Asserts that the hand never
// enters a sphere around the head/neck.
//
// The "user said the hand goes through the neck" feedback in PR #29 was
// caused by `rightUpperArm.z = -2.27 rad (-130°)`, which swung the arm past
// vertical and across the body. This script catches that regression in CI.
//
// Run with: node experiments/issue-28-wave-trajectory.mjs

// VRM1 rest-pose joint offsets (taken from the pixiv VRM1 sample skeleton).
// All measurements in meters.
const SHOULDER = { x: -0.180, y: 1.380, z: -0.025 };  // right shoulder world pos
const HEAD     = { x:  0.000, y: 1.510, z: -0.025 };  // approximate head centre
const NECK     = { x:  0.000, y: 1.330, z: -0.030 };
const UPPER_ARM_LEN = 0.27;
const FOREARM_LEN   = 0.25;
const HAND_LEN      = 0.18;
const HEAD_RADIUS   = 0.16;  // generous head+hair envelope
const NECK_RADIUS   = 0.10;

// --- 4×4 matrix utilities (column-major like three.js) -------------------
function matMul(a, b) {
  const out = new Array(16).fill(0);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      for (let k = 0; k < 4; k++)
        out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
function matFromEulerXYZ(x, y, z) {
  // three.js EulerOrder.XYZ ⇒ R = Rx * Ry * Rz (applied right-to-left).
  const cx = Math.cos(x), sx = Math.sin(x);
  const cy = Math.cos(y), sy = Math.sin(y);
  const cz = Math.cos(z), sz = Math.sin(z);
  // Direct from three.js Matrix4.makeRotationFromEuler('XYZ').
  const m = new Array(16).fill(0);
  m[15] = 1;
  m[0]  =  cy * cz;
  m[4]  = -cy * sz;
  m[8]  =  sy;
  m[1]  =  cx * sz + sx * sy * cz;
  m[5]  =  cx * cz - sx * sy * sz;
  m[9]  = -sx * cy;
  m[2]  =  sx * sz - cx * sy * cz;
  m[6]  =  sx * cz + cx * sy * sz;
  m[10] =  cx * cy;
  return m;
}
function matFromTranslation(x, y, z) {
  const m = new Array(16).fill(0);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}
function transformPoint(m, p) {
  const x = m[0] * p.x + m[4] * p.y + m[8]  * p.z + m[12];
  const y = m[1] * p.x + m[5] * p.y + m[9]  * p.z + m[13];
  const z = m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14];
  return { x, y, z };
}

// --- Gesture math (mirror of gestures.js — KEEP IN SYNC) -----------------
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function sustained(t) {
  if (t < 0.2) return easeInOut(t / 0.2);
  if (t < 0.8) return 1;
  return easeInOut((1 - t) / 0.2);
}
function waveDelta(t, amp = 1.0) {
  const up = sustained(t);
  return {
    rightUpperArm: {
      x: -0.30 * up * amp,
      y: -0.20 * up * amp,
      z: -1.30 * up * amp,
    },
    rightLowerArm: {
      x: -1.40 * up * amp,
      y: -0.20 * up * amp,
      z:  0,
    },
    rightHand: {
      x: 0,
      y: 0,
      z: Math.sin(t * Math.PI * 6) * 0.45 * up * amp,
    },
  };
}

// --- Forward kinematics ---------------------------------------------------
// In VRM normalized humanoid space, each bone has its own local frame
// rooted at its joint origin. The right arm chain in REST pose extends
// along +X (T-pose), so each segment-vector is (segLen, 0, 0). At runtime
// each bone's quaternion rotates its child relative to the parent's frame.
//
// We approximate the actual VRM rig with these segment lengths and parent
// transforms. The numbers are calibrated against the in-browser probe
// (which reads the live three-vrm normalized bones).
function handWorldAt(t) {
  const d = waveDelta(t);

  // Shoulder world transform: rest-pose translation, no rotation (we treat
  // the right shoulder origin as fixed in world space).
  const shoulderM = matFromTranslation(SHOULDER.x, SHOULDER.y, SHOULDER.z);

  // Upper arm: rotate around its origin. After rotation, translate forward
  // along its (rotated) +X axis to get the elbow.
  const upperRotM = matFromEulerXYZ(d.rightUpperArm.x, d.rightUpperArm.y, d.rightUpperArm.z);
  const upperM = matMul(shoulderM, upperRotM);
  const elbow = transformPoint(upperM, { x: -UPPER_ARM_LEN, y: 0, z: 0 });

  // Forearm: chained off the elbow. The elbow's frame is the upper arm's
  // local frame translated to the elbow. We translate by upperLen along +X
  // first, then apply the forearm rotation in that frame.
  const elbowFrameM = matMul(upperM, matFromTranslation(-UPPER_ARM_LEN, 0, 0));
  const lowerRotM = matFromEulerXYZ(d.rightLowerArm.x, d.rightLowerArm.y, d.rightLowerArm.z);
  const lowerM = matMul(elbowFrameM, lowerRotM);
  const wrist = transformPoint(lowerM, { x: -FOREARM_LEN, y: 0, z: 0 });

  // Hand: chained off the wrist.
  const wristFrameM = matMul(lowerM, matFromTranslation(-FOREARM_LEN, 0, 0));
  const handRotM = matFromEulerXYZ(d.rightHand.x, d.rightHand.y, d.rightHand.z);
  const handM = matMul(wristFrameM, handRotM);
  const hand = transformPoint(handM, { x: -HAND_LEN, y: 0, z: 0 });

  return { elbow, wrist, hand };
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Walk the gesture from t=0 to t=1 in 0.02 increments and check collisions.
const samples = [];
let minHeadDist = Infinity, minNeckDist = Infinity;
let minHeadDistT = 0, minNeckDistT = 0;
for (let t = 0; t <= 1.0001; t += 0.02) {
  const fk = handWorldAt(t);
  const dh = dist(fk.hand, HEAD);
  const dn = dist(fk.hand, NECK);
  if (dh < minHeadDist) { minHeadDist = dh; minHeadDistT = t; }
  if (dn < minNeckDist) { minNeckDist = dn; minNeckDistT = t; }
  samples.push({ t: t.toFixed(2), hand: fk.hand, dh, dn });
}

console.log('t    | hand x   | hand y   | hand z   | dist→head | dist→neck');
console.log('---- | -------- | -------- | -------- | --------- | ---------');
for (const s of samples.filter((_, i) => i % 5 === 0)) {
  console.log(
    `${s.t} | ${s.hand.x.toFixed(3).padStart(8)} | ${s.hand.y.toFixed(3).padStart(8)} | ${s.hand.z.toFixed(3).padStart(8)} | ${s.dh.toFixed(3).padStart(9)} | ${s.dn.toFixed(3).padStart(9)}`,
  );
}
console.log(`\nMinimum hand→head distance: ${minHeadDist.toFixed(3)} m at t=${minHeadDistT.toFixed(2)}`);
console.log(`Minimum hand→neck distance: ${minNeckDist.toFixed(3)} m at t=${minNeckDistT.toFixed(2)}`);

// Assertions — if any fails, exit non-zero so CI catches it.
let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); failed++; }
  else      { console.log(`OK:   ${msg}`); }
}
assert(minHeadDist >= HEAD_RADIUS,
       `hand stays at least ${HEAD_RADIUS}m from head centre (got ${minHeadDist.toFixed(3)}m)`);
assert(minNeckDist >= NECK_RADIUS,
       `hand stays at least ${NECK_RADIUS}m from neck centre (got ${minNeckDist.toFixed(3)}m)`);

// At peak (t≈0.5) the hand should be ABOVE shoulder height.
const peak = handWorldAt(0.5).hand;
assert(peak.y > SHOULDER.y,
       `at peak (t=0.5) hand is above shoulder (y=${peak.y.toFixed(3)} > ${SHOULDER.y})`);

// At peak the hand should remain on the SAME side as the right shoulder
// (negative X for the right side). Crossing well past the centerline is
// the original bug — the buggy `rightUpperArm.z = -2.27` value produced
// hand x ≈ +0.17 (across the body to the LEFT of head), causing the hand
// to clip into the head/neck mesh.
assert(peak.x <= 0.05,
       `at peak (t=0.5) hand has not crossed past the body centerline (x=${peak.x.toFixed(3)} <= 0.05)`);

if (failed) { console.error(`\n${failed} assertion(s) failed.`); process.exit(1); }
console.log('\nAll wave-trajectory assertions OK.');
