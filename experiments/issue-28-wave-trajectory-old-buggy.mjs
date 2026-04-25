// SAME AS issue-28-wave-trajectory.mjs but with the ORIGINAL buggy wave
// values (rightUpperArm.z = -2.27 rad ≈ -130°). Run this to confirm the
// original gesture was indeed unsafe — should fail the head-distance
// assertion.

const SHOULDER = { x: -0.180, y: 1.380, z: -0.025 };
const HEAD     = { x:  0.000, y: 1.510, z: -0.025 };
const NECK     = { x:  0.000, y: 1.330, z: -0.030 };
const UPPER_ARM_LEN = 0.27;
const FOREARM_LEN   = 0.25;
const HAND_LEN      = 0.18;
const HEAD_RADIUS   = 0.16;
const NECK_RADIUS   = 0.10;

function matMul(a, b) {
  const out = new Array(16).fill(0);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      for (let k = 0; k < 4; k++)
        out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
function matFromEulerXYZ(x, y, z) {
  const cx = Math.cos(x), sx = Math.sin(x);
  const cy = Math.cos(y), sy = Math.sin(y);
  const cz = Math.cos(z), sz = Math.sin(z);
  const m = new Array(16).fill(0);
  m[15] = 1;
  m[0]  =  cy * cz;       m[4]  = -cy * sz;       m[8]  =  sy;
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
  return {
    x: m[0] * p.x + m[4] * p.y + m[8]  * p.z + m[12],
    y: m[1] * p.x + m[5] * p.y + m[9]  * p.z + m[13],
    z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14],
  };
}
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function sustained(t) {
  if (t < 0.2) return easeInOut(t / 0.2);
  if (t < 0.8) return 1;
  return easeInOut((1 - t) / 0.2);
}
// ORIGINAL BUGGY VALUES (commit 3c358ba):
function waveDeltaBuggy(t, amp = 1.0) {
  const up = sustained(t);
  return {
    rightUpperArm: { x: -0.25 * up * amp, y: 0,                z: -2.27 * up * amp },
    rightLowerArm: { x: -1.55 * up * amp, y: 0,                z:  0 },
    rightHand:     { x:  0,                y: 0,
                     z: Math.sin(t * Math.PI * 6) * 0.6 * up * amp },
  };
}
function handWorldAt(t) {
  const d = waveDeltaBuggy(t);
  const shoulderM = matFromTranslation(SHOULDER.x, SHOULDER.y, SHOULDER.z);
  const upperRotM = matFromEulerXYZ(d.rightUpperArm.x, d.rightUpperArm.y, d.rightUpperArm.z);
  const upperM = matMul(shoulderM, upperRotM);
  const elbow = transformPoint(upperM, { x: -UPPER_ARM_LEN, y: 0, z: 0 });
  const elbowFrameM = matMul(upperM, matFromTranslation(-UPPER_ARM_LEN, 0, 0));
  const lowerRotM = matFromEulerXYZ(d.rightLowerArm.x, d.rightLowerArm.y, d.rightLowerArm.z);
  const lowerM = matMul(elbowFrameM, lowerRotM);
  const wrist = transformPoint(lowerM, { x: -FOREARM_LEN, y: 0, z: 0 });
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

let minHeadDist = Infinity, minNeckDist = Infinity, minPx = Infinity, maxPx = -Infinity;
let minHeadDistT = 0;
const samples = [];
for (let t = 0; t <= 1.0001; t += 0.02) {
  const fk = handWorldAt(t);
  const dh = dist(fk.hand, HEAD);
  const dn = dist(fk.hand, NECK);
  if (dh < minHeadDist) { minHeadDist = dh; minHeadDistT = t; }
  if (dn < minNeckDist) minNeckDist = dn;
  if (fk.hand.x < minPx) minPx = fk.hand.x;
  if (fk.hand.x > maxPx) maxPx = fk.hand.x;
  samples.push({ t: t.toFixed(2), hand: fk.hand, dh, dn });
}
console.log('=== ORIGINAL BUGGY WAVE GESTURE (rightUpperArm.z = -2.27 rad / -130°) ===');
console.log('t    | hand x   | hand y   | hand z   | dist→head | dist→neck');
console.log('---- | -------- | -------- | -------- | --------- | ---------');
for (const s of samples.filter((_, i) => i % 5 === 0)) {
  console.log(
    `${s.t} | ${s.hand.x.toFixed(3).padStart(8)} | ${s.hand.y.toFixed(3).padStart(8)} | ${s.hand.z.toFixed(3).padStart(8)} | ${s.dh.toFixed(3).padStart(9)} | ${s.dn.toFixed(3).padStart(9)}`,
  );
}
console.log(`\nMinimum hand→head distance: ${minHeadDist.toFixed(3)} m at t=${minHeadDistT.toFixed(2)}`);
console.log(`Minimum hand→neck distance: ${minNeckDist.toFixed(3)} m`);
console.log(`Hand x range during gesture: [${minPx.toFixed(3)}, ${maxPx.toFixed(3)}]`);
if (minHeadDist < HEAD_RADIUS) {
  console.log(`\n*** Hand passes WITHIN ${HEAD_RADIUS}m of head centre — original bug confirmed ***`);
} else if (maxPx > 0.10) {
  console.log(`\n*** Hand crosses past body centerline (max x=${maxPx.toFixed(3)}) — original bug confirmed ***`);
} else {
  console.log(`\n(Trajectory clears head/neck spheres but may still look unnatural.)`);
}
