// Headless experiment that demonstrates the **bone-axis** flip on VRM 0
// models — the second half of issue #26.
//
// Background:
//   PR #27 fixed YAW (worldPointToHeadAngles + lookTarget builder used the
//   wrong forward axis on VRM 0). After that fix the eye `lookAt` target
//   lands correctly in front of Alicia and her eyes track the camera.
//   But the user reported in a follow-up comment:
//     "After checking latest version I see that up/down on following
//      animation for Alicia model is flipped."
//   i.e. the HEAD bone tilts the wrong way (looks down when the camera is
//   above, and vice versa) for Alicia (VRM 0.51), while it works correctly
//   for VRM 1.0 models.
//
// What this experiment shows:
//   `VRMUtils.rotateVRM0(vrm)` and our per-preset baseYaw both implement
//   their flip by setting `vrm.scene.rotation.y = π`. That makes Alicia
//   face the camera, but it ALSO mirrors every descendant bone's local X
//   axis in world space. So when we run
//       head.rotation.x += -headPitchCur * (π/180)
//   on Alicia, the rotation happens around (-1, 0, 0) in world coords
//   instead of (+1, 0, 0) — visually flipping the pitch direction.
//
//   The fix: multiply the X (and Z) component of any bone rotation by
//   axisFlip = (faceFrontSign === -1 ? -1 : 1). Y is untouched (rotation
//   around the world up-axis is unaffected by the scene's Y rotation).
//
// Run:
//   node experiments/follow-camera-pitch-bone-axis.mjs

const PI = Math.PI;

// Rotate vector v around unit axis k by angle θ (Rodrigues' formula).
function rotateAroundAxis(v, axis, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const dot = axis.x * v.x + axis.y * v.y + axis.z * v.z;
  const cross = {
    x: axis.y * v.z - axis.z * v.y,
    y: axis.z * v.x - axis.x * v.z,
    z: axis.x * v.y - axis.y * v.x,
  };
  return {
    x: v.x * c + cross.x * s + axis.x * dot * (1 - c),
    y: v.y * c + cross.y * s + axis.y * dot * (1 - c),
    z: v.z * c + cross.z * s + axis.z * dot * (1 - c),
  };
}

// World-space orientation of the head bone's local X axis given that the
// scene root is rotated by `headWorldYaw` around Y.
function headLocalXInWorld(headWorldYaw) {
  return {
    x: Math.cos(headWorldYaw),
    y: 0,
    z: -Math.sin(headWorldYaw),
  };
}

// Direction the face points BEFORE we apply head.rotation.x.
//   VRM 1 (no scene rotation): face = local +Z = world +Z = (0, 0, 1).
//   VRM 0 (scene π around Y): face = local -Z = world (0, 0, +1).
// Either way, both characters are facing +Z (toward the camera) at
// head.rotation = identity — that's the whole point of rotateVRM0.
const FACE_INITIAL = { x: 0, y: 0, z: 1 };

function describe(name, faceFrontZ, headWorldYaw, headPitchDeg) {
  const axisFlip = Math.sign(faceFrontZ) === -1 ? -1 : 1;
  const localX = headLocalXInWorld(headWorldYaw);

  // OLD code (PR #27): no axisFlip on the head.rotation.x assignment.
  const oldRotX = -headPitchDeg * (PI / 180);
  const oldFace = rotateAroundAxis(FACE_INITIAL, localX, oldRotX);

  // NEW code: multiply by axisFlip so the world-space rotation matches.
  const newRotX = -axisFlip * headPitchDeg * (PI / 180);
  const newFace = rotateAroundAxis(FACE_INITIAL, localX, newRotX);

  console.log(`\n=== ${name} ===`);
  console.log(`  faceFrontZ        = ${faceFrontZ}`);
  console.log(`  axisFlip          = ${axisFlip}`);
  console.log(`  headWorldYaw      = ${headWorldYaw.toFixed(4)}`);
  console.log(`  localXInWorld     = ${JSON.stringify(localX)}`);
  console.log(
    `  OLD head.rotation.x = ${oldRotX.toFixed(4)}  →  face = ` +
      `(${oldFace.x.toFixed(3)}, ${oldFace.y.toFixed(3)}, ${oldFace.z.toFixed(3)})  ` +
      `[face.y > 0 means UP]`,
  );
  console.log(
    `  NEW head.rotation.x = ${newRotX.toFixed(4)}  →  face = ` +
      `(${newFace.x.toFixed(3)}, ${newFace.y.toFixed(3)}, ${newFace.z.toFixed(3)})  ` +
      `[face.y > 0 means UP]`,
  );
}

console.log(
  '\n--- Camera ABOVE the head (headPitchDeg > 0; head should look UP) ---',
);
// VRM 1: no scene rotation, head local X is world +X.
describe('VRM 1.0 (faceFront=+Z, sceneYaw=0)', +1, 0, 26.57);
// VRM 0 (Alicia): scene rotated π around Y, head local X is world -X.
describe('VRM 0.x (faceFront=-Z, sceneYaw=π)', -1, PI, 26.57);

console.log(
  '\n--- Camera BELOW the head (headPitchDeg < 0; head should look DOWN) ---',
);
describe('VRM 1.0 (faceFront=+Z, sceneYaw=0)', +1, 0, -26.57);
describe('VRM 0.x (faceFront=-Z, sceneYaw=π)', -1, PI, -26.57);

console.log(
  '\nNote: in the OLD column the VRM 0 face.y has the OPPOSITE sign from VRM 1 — that is the bug.',
);
console.log(
  'In the NEW column the face.y signs match — the head looks the correct way for both versions.',
);
