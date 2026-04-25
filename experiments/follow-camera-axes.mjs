// Headless experiment that mimics applyLookAt's worldPointToHeadAngles +
// the lookTarget construction for both a VRM1 model and a VRM0 model
// (Alicia-like, scene rotated π around Y). Verifies that current code is
// correct for VRM1 but broken for VRM0, and that the proposed fix works.
//
// Run with: node experiments/follow-camera-axes.mjs
//
// We do not pull in three.js — the math is small enough to write directly
// using simple Y-rotation helpers.

const sin = Math.sin, cos = Math.cos, PI = Math.PI, atan2 = Math.atan2;

function rotY(v, ang) {
  const c = cos(ang), s = sin(ang);
  return { x: c * v.x + s * v.z, y: v.y, z: -s * v.x + c * v.z };
}
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function len(v) { return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); }

function describe(name, faceFrontZ, sceneYaw, cameraWorld) {
  // Head world position assumed at (0, 1.5, 0). Head world rotation is
  // sceneYaw around Y (no extra parent rotation for this experiment).
  const headWorld = { x: 0, y: 1.5, z: 0 };
  const headWorldYaw = sceneYaw;
  // Transform world camera into head-local: subtract head world pos, rotate
  // by inverse of head world Y rotation.
  const rel = sub(cameraWorld, headWorld);
  const local = rotY(rel, -headWorldYaw);

  // OLD formula (assumes faceFront=+Z).
  const oldYaw = atan2(local.x, local.z) * 180 / PI;
  const oldPitch = atan2(local.y, Math.hypot(local.x, local.z)) * 180 / PI;

  // NEW formula: pick forward sign from faceFrontZ.
  const fz = Math.sign(faceFrontZ) || 1;
  const newYaw = atan2(local.x * fz, local.z * fz) * 180 / PI;
  const newPitch = oldPitch;

  // Build a target at (yaw=+90°, dist=5) using OLD formula and NEW formula.
  const dist = 5;
  const yawR = newYaw * PI / 180; // use the new yaw to test target placement
  const pitchR = 0;
  const oldLocalTarget = {
    x: sin(yawR) * cos(pitchR) * dist,
    y: sin(pitchR) * dist,
    z: cos(yawR) * cos(pitchR) * dist,
  };
  const newLocalTarget = {
    x: fz * sin(yawR) * cos(pitchR) * dist,
    y: sin(pitchR) * dist,
    z: fz * cos(yawR) * cos(pitchR) * dist,
  };
  // Apply head.matrixWorld (Y rotation by sceneYaw, then translate by head pos).
  const oldWorldTarget = add(rotY(oldLocalTarget, headWorldYaw), headWorld);
  const newWorldTarget = add(rotY(newLocalTarget, headWorldYaw), headWorld);

  console.log(`\n=== ${name} ===`);
  console.log(`  cameraWorld     = ${JSON.stringify(cameraWorld)}`);
  console.log(`  faceFrontZ      = ${faceFrontZ}`);
  console.log(`  sceneYaw (rad)  = ${sceneYaw.toFixed(4)}`);
  console.log(`  headLocalCamera = ${JSON.stringify(local)}`);
  console.log(`  OLD yaw deg     = ${oldYaw.toFixed(2)}  pitch deg = ${oldPitch.toFixed(2)}`);
  console.log(`  NEW yaw deg     = ${newYaw.toFixed(2)}  pitch deg = ${newPitch.toFixed(2)}`);
  console.log(`  OLD lookTarget world = ${JSON.stringify(oldWorldTarget)}`);
  console.log(`  NEW lookTarget world = ${JSON.stringify(newWorldTarget)}`);
}

console.log('\n--- Camera in front of model (world +Z direction) ---');
describe('VRM1 model (faceFront=+Z, sceneYaw=0)', +1, 0, { x: 0, y: 1.5, z: 3 });
describe('VRM0 model (faceFront=-Z, sceneYaw=π)', -1, PI, { x: 0, y: 1.5, z: 3 });

console.log('\n--- Camera to the right of model (world +X) ---');
describe('VRM1 model (faceFront=+Z, sceneYaw=0)', +1, 0, { x: 3, y: 1.5, z: 0 });
describe('VRM0 model (faceFront=-Z, sceneYaw=π)', -1, PI, { x: 3, y: 1.5, z: 0 });

console.log('\n--- Camera above & in front (yaw=0, pitch>0) ---');
describe('VRM1 model (faceFront=+Z, sceneYaw=0)', +1, 0, { x: 0, y: 3, z: 3 });
describe('VRM0 model (faceFront=-Z, sceneYaw=π)', -1, PI, { x: 0, y: 3, z: 3 });

console.log('\n--- Camera to the left of model (world -X) ---');
describe('VRM1 model (faceFront=+Z, sceneYaw=0)', +1, 0, { x: -3, y: 1.5, z: 0 });
describe('VRM0 model (faceFront=-Z, sceneYaw=π)', -1, Math.PI, { x: -3, y: 1.5, z: 0 });
