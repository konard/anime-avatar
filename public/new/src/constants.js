// constants.js — immutable data shared across the editor.

// Pinned commit so the sample VRM is immutable and not affected by upstream changes.
window.ACS_DEFAULT_VRM_URL =
  'https://raw.githubusercontent.com/pixiv/three-vrm/5a3242b66124386c32b085c6693d9059040e72e5/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

// Full VRM humanoid bone list (VRM 0.x + 1.0 superset).
window.ACS_HUMANOID_BONES = [
  'hips','spine','chest','upperChest','neck','head','jaw',
  'leftEye','rightEye',
  'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
  'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
  'leftUpperLeg','leftLowerLeg','leftFoot','leftToes',
  'rightUpperLeg','rightLowerLeg','rightFoot','rightToes',
  'leftThumbMetacarpal','leftThumbProximal','leftThumbDistal',
  'leftIndexProximal','leftIndexIntermediate','leftIndexDistal',
  'leftMiddleProximal','leftMiddleIntermediate','leftMiddleDistal',
  'leftRingProximal','leftRingIntermediate','leftRingDistal',
  'leftLittleProximal','leftLittleIntermediate','leftLittleDistal',
  'rightThumbMetacarpal','rightThumbProximal','rightThumbDistal',
  'rightIndexProximal','rightIndexIntermediate','rightIndexDistal',
  'rightMiddleProximal','rightMiddleIntermediate','rightMiddleDistal',
  'rightRingProximal','rightRingIntermediate','rightRingDistal',
  'rightLittleProximal','rightLittleIntermediate','rightLittleDistal',
];

const H = window.ACS_HUMANOID_BONES;

window.ACS_BONE_GROUPS = {
  core:    ['hips','spine','chest','upperChest','neck','head','jaw'],
  eyes:    ['leftEye','rightEye'],
  armL:    ['leftShoulder','leftUpperArm','leftLowerArm','leftHand'],
  armR:    ['rightShoulder','rightUpperArm','rightLowerArm','rightHand'],
  legL:    ['leftUpperLeg','leftLowerLeg','leftFoot','leftToes'],
  legR:    ['rightUpperLeg','rightLowerLeg','rightFoot','rightToes'],
  fingersL: H.filter(b => b.startsWith('left') && /(Thumb|Index|Middle|Ring|Little)/.test(b)),
  fingersR: H.filter(b => b.startsWith('right') && /(Thumb|Index|Middle|Ring|Little)/.test(b)),
};

// Anatomical rotation limits, in DEGREES, per VRM humanoid bone, per axis.
// Based on healthy-adult range-of-motion references (Healthline shoulder
// ROM article, PMC PMC7549223 / PMC6555111 normative studies, DSHS WA
// 13-585A range-of-motion chart). Numbers are rounded out generously so
// expressive poses are not clipped.
//
// Sign conventions match the VRM normalized humanoid frame (rest = T-pose
// for VRM 1.0). For arm bones the LEFT and RIGHT sides are mirrored on the
// Z axis (z is the dominant raise/lower axis); we generate the right-side
// entry from the left-side so the table stays compact and consistent.
//
// `null` for an axis means "not anatomically meaningful" — the slider is
// hidden in the editor and the clamp helper returns 0 for that axis.
const _LIM_ARMS_LEFT = {
  // Shoulder is small but meaningful — gives a 30° shrug envelope.
  leftShoulder:  { x: [ -20,  20], y: [ -30,  30], z: [ -30,  30] },
  // Left upper arm: rest = horizontal (T-pose). For the LEFT side, NEGATIVE
  // z drops the arm to the body's side (apose / relaxed presets, max ~-95°
  // straight-down or slightly across the front) and POSITIVE z raises it
  // overhead. Healthy shoulder abduction reaches ~180° from the
  // hanging-down position, which is z=+85° measured from T-pose horizontal
  // (T-pose is already 90° abducted). Pushing past +95° starts swinging
  // the arm ACROSS the head/neck — anatomically possible only with active
  // adduction effort and self-collides with the mesh of any standard
  // humanoid avatar (issue #28: "hand goes through neck and head"). We
  // therefore cap z at ±100° on each side: enough for a vertical-arm
  // cheer/wave with a small overshoot, not enough to clip into the head.
  // For the X axis (shoulder flexion/extension), normal active range is
  // ~-50° (extension behind body) to +180° (forward + up). We allow a
  // generous ±90° so forward-reach poses still work.
  leftUpperArm:  { x: [ -90,  90], y: [ -90,  90], z: [-100, 100] },
  // Elbow only flexes (rotation bends inward toward shoulder, NEGATIVE x
  // on the LEFT side). Healthy ROM is ~0° straight to ~145-150° fully
  // flexed; we round to 150°. The Y axis is forearm pronation/supination
  // (~85°/75° for an adult); ±90° is generous. Z is essentially zero —
  // ±10° tolerance keeps slider behaviour natural without allowing the
  // elbow to hyperextend sideways.
  leftLowerArm:  { x: [-150,   0], y: [ -90,  90], z: [ -10,  10] },
  // Wrist: flexion/extension ±80°, radial/ulnar deviation ±25° on the Y
  // axis (we widen to ±60° so wrist-wave gestures read clearly), small Z
  // twist tolerance.
  leftHand:      { x: [ -80,  80], y: [ -60,  60], z: [ -30,  30] },
};
const _LIM_LEGS_LEFT = {
  leftUpperLeg:  { x: [ -30, 120], y: [ -45,  45], z: [ -45,  45] },
  // Knee only flexes (positive X bends the calf toward the back of the
  // thigh). Tiny tolerance on the other axes.
  leftLowerLeg:  { x: [   0, 150], y: [ -10,  10], z: [ -10,  10] },
  leftFoot:      { x: [ -50,  50], y: [ -30,  30], z: [ -20,  20] },
  leftToes:      { x: [ -30,  60], y: [ -10,  10], z: [ -10,  10] },
};
// Mirror left → right by negating the LEFT-side Z-range and Y-range so the
// limits read naturally in body-relative coordinates ("arm raises up" is
// always negative-z on the LEFT, positive-z on the RIGHT, etc.).
function _mirrorLR(lims) {
  const out = {};
  for (const [b, ax] of Object.entries(lims)) {
    const r = b.replace(/^left/, 'right');
    out[r] = {
      x: ax.x ? [ax.x[0], ax.x[1]] : null,
      y: ax.y ? [-ax.y[1], -ax.y[0]] : null,
      z: ax.z ? [-ax.z[1], -ax.z[0]] : null,
    };
  }
  return out;
}
window.ACS_BONE_LIMITS = {
  // Core / spine
  hips:        { x: [ -20,  20], y: [ -30,  30], z: [ -20,  20] },
  spine:       { x: [ -30,  60], y: [ -45,  45], z: [ -30,  30] },
  chest:       { x: [ -20,  45], y: [ -30,  30], z: [ -25,  25] },
  upperChest:  { x: [ -15,  30], y: [ -25,  25], z: [ -20,  20] },
  neck:        { x: [ -45,  45], y: [ -50,  50], z: [ -30,  30] },
  head:        { x: [ -50,  50], y: [ -70,  70], z: [ -40,  40] },
  jaw:         { x: [   0,  35], y: [ -10,  10], z: [ -10,  10] },
  // Eyes (additional clamp on top of VRM lookAt cone).
  leftEye:     { x: [ -25,  25], y: [ -35,  35], z: null },
  rightEye:    { x: [ -25,  25], y: [ -35,  35], z: null },
  // Arms (left + mirrored right).
  ..._LIM_ARMS_LEFT,
  ..._mirrorLR(_LIM_ARMS_LEFT),
  // Legs (left + mirrored right).
  ..._LIM_LEGS_LEFT,
  ..._mirrorLR(_LIM_LEGS_LEFT),
};
// Fingers all share a flexion-only Z range; the metacarpal is the only one
// with a bit of side-to-side spread. Built procedurally so we don't have to
// list 30 bones by hand.
(function _buildFingerLimits() {
  const FINGERS = ['Thumb','Index','Middle','Ring','Little'];
  const SEGS = ['Metacarpal','Proximal','Intermediate','Distal'];
  const flex = { x: null, y: null, z: [ -10, 100] };
  const meta = { x: [ -10,  20], y: [ -20,  20], z: [ -10,  90] };
  for (const side of ['left','right']) {
    for (const f of FINGERS) {
      for (const s of SEGS) {
        const b = side + f + s;
        if (!window.ACS_HUMANOID_BONES.includes(b)) continue;
        window.ACS_BONE_LIMITS[b] = (s === 'Metacarpal') ? meta : flex;
      }
    }
  }
})();

// Convert radians ↔ degrees with a tiny epsilon so values that round-trip
// through the slider don't drift.
window.ACS_radToDeg = function radToDeg(r) {
  return ((r || 0) * 180 / Math.PI);
};
window.ACS_degToRad = function degToRad(d) {
  return ((d || 0) * Math.PI / 180);
};
window.ACS_clamp = function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
};
// Look up the [min,max] DEGREE range for a single bone+axis. Returns
// `null` when that axis is not anatomically meaningful (caller should hide
// the slider). Returns the FULL [-360, 360] sweep when the bone has no
// entry in ACS_BONE_LIMITS so unknown bones still work.
window.ACS_boneLimitDeg = function boneLimitDeg(bone, axis) {
  const ent = window.ACS_BONE_LIMITS[bone];
  if (!ent) return [-360, 360];
  const ax = ent[axis];
  if (ax === null) return null;
  if (!ax) return [-360, 360];
  return [ax[0], ax[1]];
};
// Clamp a bone Euler component (radians in, radians out) to its
// anatomical range. Used inside apply.js so any cfg.rot — preset, gesture,
// randomizer, manual slider — stays inside biological bounds.
window.ACS_clampBoneRad = function clampBoneRad(bone, axis, rad) {
  const lim = window.ACS_boneLimitDeg(bone, axis);
  if (lim === null) return 0;
  if (!lim) return rad || 0;
  const deg = (rad || 0) * 180 / Math.PI;
  const c = deg < lim[0] ? lim[0] : (deg > lim[1] ? lim[1] : deg);
  return c * Math.PI / 180;
};

window.ACS_SCALE_BONES = [
  { b:'head', label:'Head', min:0.6, max:1.6 },
  { b:'neck', label:'Neck', min:0.5, max:1.8 },
  { b:'chest', label:'Chest', min:0.7, max:1.4 },
  { b:'spine', label:'Torso', min:0.7, max:1.3 },
  { b:'hips', label:'Hips', min:0.7, max:1.3 },
  { b:'leftUpperArm', label:'Upper arm', min:0.6, max:1.5, mirror:'rightUpperArm' },
  { b:'leftLowerArm', label:'Forearm', min:0.6, max:1.5, mirror:'rightLowerArm' },
  { b:'leftHand', label:'Hand', min:0.6, max:1.6, mirror:'rightHand' },
  { b:'leftUpperLeg', label:'Thigh', min:0.6, max:1.5, mirror:'rightUpperLeg' },
  { b:'leftLowerLeg', label:'Calf', min:0.6, max:1.5, mirror:'rightLowerLeg' },
  { b:'leftFoot', label:'Foot', min:0.7, max:1.5, mirror:'rightFoot' },
];

// Pose presets — bone → {x,y,z} Euler radians applied on top of rest pose.
// Signs below assume the VRM1 convention where rest pose is T-pose (arms out
// horizontal) and negative z on leftUpperArm drops the arm down (positive z
// for rightUpperArm is symmetric).
window.ACS_POSE_PRESETS = {
  rest: {},
  // T-pose IS the rest pose in VRM1 — leave arms where they are.
  tpose: {},
  // A-pose: arms drop to ~45° below horizontal.
  apose: { leftUpperArm: { z: -0.8 }, rightUpperArm: { z: 0.8 } },
  // Relaxed idle: arms almost straight down, forearms slightly inward.
  relaxed: {
    leftUpperArm:  { z: -1.25, x: 0.05 },
    rightUpperArm: { z: 1.25, x: 0.05 },
    leftLowerArm:  { y: -0.15 },
    rightLowerArm: { y: 0.15 },
    spine: { x: -0.02 },
  },
  // Wave: right arm raised, forearm bent forward.
  wave: {
    leftUpperArm:  { z: -1.2 },
    rightUpperArm: { z: 0.4, x: -0.3 },
    rightLowerArm: { y: -0.4, x: -1.2 },
  },
  // Peace sign: right forearm lifted in front.
  peace: {
    leftUpperArm:  { z: -1.2 },
    rightUpperArm: { z: 0.9, x: -0.35 },
    rightLowerArm: { y: 0.3, x: -1.3 },
  },
  // Thinker: right hand near chin, head tilted.
  thinker: {
    leftUpperArm:  { z: -1.3 },
    rightUpperArm: { z: 1.1, x: -0.6 },
    rightLowerArm: { y: 0.9, x: -1.5 },
    head: { x: 0.2, y: -0.1 },
    spine: { x: 0.1 },
  },
  // Cheer: arms raised up and out.
  cheer: {
    leftUpperArm:  { z: 1.1, x: -0.2 },
    rightUpperArm: { z: -1.1, x: -0.2 },
    leftLowerArm:  { y: -0.2 },
    rightLowerArm: { y: 0.2 },
    head: { x: -0.1 },
  },
  // Contrapposto: hip shift + weight on one leg.
  contrapposto: {
    hips: { z: -0.08, y: 0.15 },
    spine: { z: 0.04 },
    chest: { z: -0.02 },
    leftUpperLeg:  { x: -0.02, z: -0.04 },
    rightUpperLeg: { x: 0.05, z: 0.02 },
    leftUpperArm:  { z: -1.15 },
    rightUpperArm: { z: 1.2 },
  },
};

window.ACS_STANDARD_EXPRESSIONS = [
  'happy','angry','sad','relaxed','surprised','neutral',
  'aa','ih','ou','ee','oh',
  'blink','blinkLeft','blinkRight',
  'lookUp','lookDown','lookLeft','lookRight',
];

// Mixamo rig-name → VRM humanoid bone name. Used when retargeting Mixamo FBX
// animations onto a VRM — see pixiv/three-vrm humanoidAnimation example.
window.ACS_MIXAMO_RIG_MAP = {
  mixamorigHips: 'hips',
  mixamorigSpine: 'spine',
  mixamorigSpine1: 'chest',
  mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck',
  mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder',
  mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm',
  mixamorigLeftHand: 'leftHand',
  mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
  mixamorigLeftHandThumb2: 'leftThumbProximal',
  mixamorigLeftHandThumb3: 'leftThumbDistal',
  mixamorigLeftHandIndex1: 'leftIndexProximal',
  mixamorigLeftHandIndex2: 'leftIndexIntermediate',
  mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal',
  mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
  mixamorigLeftHandMiddle3: 'leftMiddleDistal',
  mixamorigLeftHandRing1: 'leftRingProximal',
  mixamorigLeftHandRing2: 'leftRingIntermediate',
  mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal',
  mixamorigLeftHandPinky2: 'leftLittleIntermediate',
  mixamorigLeftHandPinky3: 'leftLittleDistal',
  mixamorigRightShoulder: 'rightShoulder',
  mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm',
  mixamorigRightHand: 'rightHand',
  mixamorigRightHandPinky1: 'rightLittleProximal',
  mixamorigRightHandPinky2: 'rightLittleIntermediate',
  mixamorigRightHandPinky3: 'rightLittleDistal',
  mixamorigRightHandRing1: 'rightRingProximal',
  mixamorigRightHandRing2: 'rightRingIntermediate',
  mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal',
  mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
  mixamorigRightHandMiddle3: 'rightMiddleDistal',
  mixamorigRightHandIndex1: 'rightIndexProximal',
  mixamorigRightHandIndex2: 'rightIndexIntermediate',
  mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandThumb1: 'rightThumbMetacarpal',
  mixamorigRightHandThumb2: 'rightThumbProximal',
  mixamorigRightHandThumb3: 'rightThumbDistal',
  mixamorigLeftUpLeg: 'leftUpperLeg',
  mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot',
  mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg',
  mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot',
  mixamorigRightToeBase: 'rightToes',
};

// Publicly-hosted Mixamo-style FBX animations with CORS. Shipped as presets so
// users can try retargeting without hunting for files. Any FBX URL or local
// .fbx file works via the URL box / drag-drop. Source: three.js examples,
// upstream by Mixamo (free for use with your own avatar).
window.ACS_ANIMATION_PRESETS = [
  { id:'none',    label:'— none —',          url:'', credit:'' },
  { id:'samba',   label:'Samba Dancing',     url:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/fbx/Samba%20Dancing.fbx',
                  credit:'Mixamo · three.js examples', license:'Mixamo terms (free use with your avatar)' },
  { id:'mixamo',  label:'Mixamo Idle',       url:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/fbx/mixamo.fbx',
                  credit:'Mixamo · three.js examples', license:'Mixamo terms (free use with your avatar)' },
  // Verified raw URL for the V-Sekai / three-vrm-1-sandbox-mixamo asset called
  // out in issue #19. The repo only hosts the file on its master branch, so we
  // pin to refs/heads/master via the canonical raw.githubusercontent.com host.
  { id:'gangnam', label:'Gangnam Style (V-Sekai / Mixamo)',
                  url:'https://raw.githubusercontent.com/V-Sekai/three-vrm-1-sandbox-mixamo/master/Gangnam%20Style.fbx',
                  credit:'Mixamo · V-Sekai', license:'Mixamo terms (free use with your avatar)' },
];

const ACS_GF2_ART_SOURCE_URL = 'https://gf2exilium.sunborngame.com/main/art';
const ACS_GF2_MMD_MODEL_ARCHIVE_DATA = [
  [134,"Phaetusa","Dorm","Phaetusa(Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Phaetusa(Dorm)_e2901aa602.rar"],
  [133,"Phaetusa","Default","Phaetusa(Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Phaetusa(Default)_75a750bac9.rar"],
  [132,"Phaetusa","Caged in the Evernight Garden","Phaetusa(Caged in the Evernight Garden).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Phaetusa(Caged in the Evernight Garden)_107f807112.rar"],
  [131,"Helen","Starlit Waltz","Helen (Starlit Waltz).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Helen (Starlit Waltz)_588f2e0f1b.rar"],
  [130,"Helen","Dorm","Helen (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Helen (Dorm)_b9b7827b6a.rar"],
  [129,"Helen","Default","Helen (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Helen (Default)_ccf55149db.rar"],
  [128,"Leva","Sultry Tempo","Leva (Sultry Tempo).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Leva (Sultry Tempo)_bb6e25da88.zip"],
  [127,"Dushevnaya","Tomorrow's Savior","Dushevnaya (Tomorrow's Savior).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Dushevnaya (Tomorrow's Savior)_4e6b394bcd.rar"],
  [126,"Lainie","Dorm","Lainie (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lainie (Dorm)_3d5075dba3.rar"],
  [125,"Lainie","Default","Lainie (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lainie (Default)_5dfa04c411.rar"],
  [124,"Lainie","Operation Butterfly","Lainie (Operation Butterfly).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lainie (Operation Butterfly)_13232951cd.rar"],
  [123,"Voymastina","Default","Voymastina(Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Voymastina(Default)_0683150449.rar"],
  [122,"Voymastina","Erwin","Voymastina (Erwin).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Voymastina (Erwin)_39baa91c9b.rar"],
  [121,"Voymastina","Dorm","Voymastina (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Voymastina (Dorm)_26742cc811.rar"],
  [120,"Robella","Enforcer of the Law","Robella(Enforcer of the Law）.rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Robella(Enforcer of the Law）_45beeb5ed2.rar"],
  [119,"Alva","Antje","Alva (Antje).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Alva (Antje)_510d7c453b.rar"],
  [118,"Alva","Default","Alva (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Alva (Default)_3bc3f162a9.rar"],
  [117,"Alva","Dorm","Alva (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Alva (Dorm)_1415cacc9f.rar"],
  [116,"Balthilde","Default","Balthilde (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Balthilde (Default)_691137c385.rar"],
  [115,"Balthilde","Dorm","Balthilde (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Balthilde (Dorm)_4e9d480817.rar"],
  [114,"Lenna","Flying Phantom","Lenna (FlyingPhantom).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lenna (FlyingPhantom)_4d2a680915.rar"],
  [113,"Nikketa","Night on the Silver Bay","Nikketa (NightontheSilverBay).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Nikketa (NightontheSilverBay)_ecb8640f47.rar"],
  [112,"Sakura","Dorm","Sakura(Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Sakura(Dorm)_457ea5e131.rar"],
  [111,"Sakura","Tale of the Butterflies","Sakura (TaleoftheButterflies).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Sakura (TaleoftheButterflies)_0e4338230f.zip"],
  [110,"Sakura","Default","Sakura (Default).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Sakura (Default)_955dd32ac9.zip"],
  [109,"Lewis","Sunscreen Battle","Lewis (Sunscreen Battle).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lewis (Sunscreen Battle)_6ea0388803.rar"],
  [108,"Lewis","Dorm","Lewis (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lewis (Dorm)_53006db910.rar"],
  [107,"Lewis","Default","Lewis (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lewis (Default)_dea01ad77f.rar"],
  [106,"Robella","Future Navigator","Robella (Future Navigator).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Robella (Future Navigator)_d121af8321.zip"],
  [105,"Robella","Dorm","Robella (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Robella (Dorm)_ec456e2f71.rar"],
  [104,"Robella","Default","Robella (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Robella (Default)_27716a2b73.rar"],
  [103,"Springfield","Enjoy the Fragrance","Springfield (Enjoy the Fragrance).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Springfield (Enjoy the Fragrance)_b54c381481.rar"],
  [102,"Qiuhua","Dragon Chef","Qiuhua (Dragon Chef).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Qiuhua (Dragon Chef)_c216b9a70c.rar"],
  [101,"Andoris","Midnight Whisper","Andoris (Midnight Whisper).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Andoris (Midnight Whisper)_1ce10a3764.rar"],
  [100,"Leva","Dorm","Leva (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Leva (Dorm)_2b2fa70f16.rar"],
  [99,"Leva","Diamond Flower","Leva (Diamond Flower).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Leva (Diamond Flower)_1fa90f4fb8.rar"],
  [98,"Leva","Default","Leva (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Leva (Default)_38a7f97acb.rar"],
  [97,"Lenna","Vitality Magic","Lenna (Vitality Magic).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lenna (Vitality Magic)_f2aff2ed87.rar"],
  [96,"Lenna","Dorm","Lenna (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lenna (Dorm)_1797c4b860.rar"],
  [95,"Lenna","Default","Lenna (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lenna (Default)_af84b0706c.rar"],
  [94,"Lind","The Sun Never Rises","Lind (The Sun Never Rises).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lind (The Sun Never Rises)_e643252d01.rar"],
  [93,"Lind","Dorm","Lind (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lind (Dorm)_1e645a189b.rar"],
  [92,"Lind","Default","Lind (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lind (Default)_12dac1ac46.rar"],
  [91,"Florence","Marvelous Yam Pastry","Florence (Marvelous Yam Pastry).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Florence (Marvelous Yam Pastry)_8821b9a96e.rar"],
  [90,"Florence","Dorm","Florence (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Florence (Dorm)_cd21b152c1.rar"],
  [89,"Florence","Default","Florence (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Florence (Default)_1068d784ed.rar"],
  [88,"Tololo","Horizon Cruise","Tololo (Horizon Cruise).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Tololo (Horizon Cruise)_839ea6f16b.rar"],
  [87,"JiangYu","Raindrop-Cleaving Blades","JiangYu (Raindrop-Cleaving Blades).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/JiangYu (Raindrop-Cleaving Blades)_f43f6659a6.rar"],
  [86,"JiangYu","Dorm","JiangYu (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/JiangYu (Dorm)_2f6c6303ae.rar"],
  [85,"JiangYu","Default","JiangYu (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/JiangYu (Default)_91eb1c3e6d.rar"],
  [84,"Belka","Enchanting Imp","Belka (Enchanting Imp).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Belka (Enchanting Imp)_3e0b5b2b91.rar"],
  [83,"Belka","Dorm","Belka (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Belka (Dorm)_bb1f2bd299.rar"],
  [82,"Belka","Default","Belka (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Belka (Default)_f0c481e4d2.rar"],
  [81,"Andoris","Default","Andoris (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Andoris (Default)_1d44d4f840.rar"],
  [80,"Andoris","Dorm","Andoris (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Andoris (Dorm)_d6db0f1112.rar"],
  [79,"Nikketa","DanceLiketheBlazingSun","Nikketa (DanceLiketheBlazingSun).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Nikketa (DanceLiketheBlazingSun)_8d1e2bc15a.rar"],
  [78,"Nikketa","Default","Nikketa (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Nikketa (Default)_67c742fe6e.rar"],
  [77,"Nikketa","Dorm","Nikketa (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Nikketa (Dorm)_9eb03790a3.rar"],
  [76,"Qiuhua","BenevolentHerbalist","Qiuhua (BenevolentHerbalist).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Qiuhua (BenevolentHerbalist)_c12883ee97.rar"],
  [75,"Qiuhua","Default","Qiuhua (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Qiuhua (Default)_fe07ef267d.rar"],
  [74,"Qiuhua","Dorm","Qiuhua (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Qiuhua (Dorm)_f633f0d743.rar"],
  [73,"Springfield","QueenInRadiance","Springfield (QueenInRadiance).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Springfield (QueenInRadiance)_383982fdd7.rar"],
  [72,"Springfield","Dorm","Springfield (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Springfield (Dorm)_bd37ef10e6.rar"],
  [71,"Springfield","Default","Springfield (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Springfield (Default)_1ae0c264aa.rar"],
  [70,"Peri","Dorm","Peri (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Peri (Dorm)_d6925c7a96.rar"],
  [69,"Peri","Default","Peri (Default).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Peri (Default)_aaef1856c6.zip"],
  [68,"Faye","FlurryCrimson","Faye (FlurryCrimson).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Faye (FlurryCrimson)_d8b753ba17.rar"],
  [67,"Faye","Dorm","Faye (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Faye (Dorm)_b5c4a48480.rar"],
  [66,"Faye","Default","Faye (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Faye (Default)_d3bfb51f04.rar"],
  [65,"Zhaohui","SuperspeedChequer","Zhaohui (SuperspeedChequer).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Zhaohui (SuperspeedChequer)_934f618ffe.rar"],
  [64,"Zhaohui","Dorm","Zhaohui (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Zhaohui (Dorm)_1c033aa96a.rar"],
  [63,"Zhaohui","Default","Zhaohui (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Zhaohui (Default)_88d7707dfc.rar"],
  [1,"Yoohee","Default","Yoohee (Default).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Yoohee (Default)_5d9d94a617.zip"],
  [2,"Yoohee","Dorm","Yoohee (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Yoohee (Dorm)_24dc73c5dd.rar"],
  [3,"Yoohee","MiracleSweetheart","Yoohee (MiracleSweetheart).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Yoohee (MiracleSweetheart)_f0888c9b66.rar"],
  [4,"Centaureissi","Default","Centaureissi (Default).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Centaureissi (Default)_79ea1873e7.zip"],
  [5,"Cheeta","Default","Cheeta (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Cheeta (Default)_d4058a68ae.rar"],
  [6,"Cheeta","SparksOnTheCircuit","Cheeta (SparksOnTheCircuit).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Cheeta (SparksOnTheCircuit)_22c8c6294e.rar"],
  [7,"Colphne","TrainingOutfit","Colphne (TrainingOutfit).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Colphne (TrainingOutfit)_b905b4687e.rar"],
  [8,"Colphne","Default","Colphne (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Colphne (Default)_fec89b8f80.rar"],
  [9,"Colphne","SilentHeart","Colphne (SilentHeart).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Colphne (SilentHeart)_8a3c14c4e8.zip"],
  [10,"Daiyan","Default","Daiyan (Default).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Daiyan (Default)_6ed5a3b1bf.zip"],
  [11,"Daiyan","Narcissus","Daiyan (Narcissus).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Daiyan (Narcissus)_919e37c40c.zip"],
  [12,"Dushevnaya","Default","Dushevnaya (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Dushevnaya (Default)_629ddbdf56.rar"],
  [13,"Dushevnaya","Dorm","Dushevnaya (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Dushevnaya (Dorm)_2bd74073e2.rar"],
  [14,"Groza","TrainingOutfit","Groza (TrainingOutfit).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Groza (TrainingOutfit)_43579eca90.rar"],
  [15,"Groza","DawnOfBattle","Groza (DawnOfBattle).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Groza (DawnOfBattle)_9c3596aff2.rar"],
  [16,"Groza","Default","Groza (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Groza (Default)_d9d65f2cf8.rar"],
  [17,"Groza","SangriaSucculent","Groza (SangriaSucculent).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Groza (SangriaSucculent)_a0fab7f3ed.zip"],
  [18,"Klukai","AstralLuminous","Klukai (AstralLuminous).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Klukai (AstralLuminous)_50595d48d9.rar"],
  [19,"Klukai","Default","Klukai (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Klukai (Default)_15a471ec13.rar"],
  [20,"Klukai","Dorm","Klukai (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Klukai (Dorm)_806e2959d6.rar"],
  [21,"Klukai","SpeedStar","Klukai (SpeedStar).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Klukai (SpeedStar)_48b9366d95.rar"],
  [22,"Krolik","TrainingOutfit","Krolik (TrainingOutfit).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Krolik (TrainingOutfit)_bdb6b955b3.rar"],
  [23,"Krolik","Default","Krolik (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Krolik (Default)_7942e6e4c1.rar"],
  [24,"Krolik","PrancingBunny","Krolik (PrancingBunny).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Krolik (PrancingBunny)_03b4bfff01.zip"],
  [25,"Ksenia","Default","Ksenia (Default).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Ksenia (Default)_be45dac8cf.zip"],
  [26,"Littara","Default","Littara (Default).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Littara (Default)_d2cc5b8312.zip"],
  [27,"Lotta","AthleticsRookie","Lotta (AthleticsRookie).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lotta (AthleticsRookie)_a1a01d043a.zip"],
  [28,"Lotta","Default","Lotta (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lotta (Default)_df644097a0.rar"],
  [29,"Lotta","Dorm","Lotta (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Lotta (Dorm)_9d9fc321a1.rar"],
  [30,"Makiatto","BallroomInterlude","Makiatto (BallroomInterlude).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Makiatto (BallroomInterlude)_1418839701.rar"],
  [31,"Makiatto","Default","Makiatto (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Makiatto (Default)_8d321d9d05.rar"],
  [32,"Makiatto","Dorm","Makiatto (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Makiatto (Dorm)_90275d7b70.rar"],
  [33,"Makiatto","EmbroideredBambooBloomingShadows","Makiatto (EmbroideredBambooBloomingShadows).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Makiatto (EmbroideredBambooBloomingShadows)_4475bf92eb.zip"],
  [34,"Mechty","Default","Mechty (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Mechty (Default)_74358771a7.rar"],
  [35,"Mechty","Dorm","Mechty (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Mechty (Dorm)_752c302470.rar"],
  [36,"Mosin-Nagant","Default","Mosin-Nagant (Default).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Mosin-Nagant (Default)_f67e160939.zip"],
  [37,"Nagant","Default","Nagant (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Nagant (Default)_e497dc59ce.rar"],
  [38,"Nemesis","TrainingOutfit","Nemesis (TrainingOutfit).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Nemesis (TrainingOutfit)_ecc90b3016.rar"],
  [39,"Nemesis","Default","Nemesis (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Nemesis (Default)_bf6eb64c43.rar"],
  [40,"Papasha","Default","Papasha (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Papasha (Default)_12a69181f2.rar"],
  [41,"Papasha","Dorm","Papasha (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Papasha (Dorm)_e9b9b3b498.rar"],
  [42,"Peritya","BornHuntress","Peritya (BornHuntress).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Peritya (BornHuntress)_47e80c428d.rar"],
  [43,"Peritya","Default","Peritya (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Peritya (Default)_f820cfa9ea.rar"],
  [44,"Qiongjiu","Default","Qiongjiu (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Qiongjiu (Default)_ca306d1263.rar"],
  [45,"Sabrina","Default","Sabrina (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Sabrina (Default)_a5a42efead.rar"],
  [46,"Sabrina","StrawberryZabaione","Sabrina (StrawberryZabaione).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Sabrina (StrawberryZabaione)_513f45b3a2.rar"],
  [47,"Sharkry","Default","Sharkry (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Sharkry (Default)_47c6f79fc9.rar"],
  [48,"Sharkry","SwimsuitIdol","Sharkry (SwimsuitIdol).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Sharkry (SwimsuitIdol)_ad909c421b.rar"],
  [49,"Suomi","Default","Suomi (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Suomi (Default)_e41db19801.rar"],
  [50,"Suomi","Dorm","Suomi (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Suomi (Dorm)_852ed59b4e.rar"],
  [51,"Suomi","SparklingOcean","Suomi (SparklingOcean).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Suomi (SparklingOcean)_4cd86fa3d9.rar"],
  [52,"Tololo","CelestialRiverAtDusk","Tololo (CelestialRiverAtDusk).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Tololo (CelestialRiverAtDusk)_a7311a6595.rar"],
  [53,"Tololo","Default","Tololo (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Tololo (Default)_d6e89f9af1.rar"],
  [54,"Ullrid","Default","Ullrid (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Ullrid (Default)_a50929a1cd.rar"],
  [55,"Ullrid","Dorm","Ullrid (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Ullrid (Dorm)_5e43872a97.rar"],
  [56,"Vector","Default","Vector (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Vector (Default)_a0af6d2715.rar"],
  [57,"Vector","Dorm","Vector (Dorm).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Vector (Dorm)_dae7a06b44.rar"],
  [58,"Vector","MolotovBunny","Vector (MolotovBunny).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Vector (MolotovBunny)_20bdaf7b3d.zip"],
  [59,"Vector","ViviSometimesHidesHerMolotovs","Vector (ViviSometimesHidesHerMolotovs).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Vector (ViviSometimesHidesHerMolotovs)_4e80b0f0bb.rar"],
  [60,"Vepley","Default","Vepley (Default).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Vepley (Default)_a7d66898cf.rar"],
  [61,"Vepley","SparklingWish","Vepley (SparklingWish).zip","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Vepley (SparklingWish)_5c09742187.zip"],
  [62,"Vepley","SummerEcho","Vepley (SummerEcho).rar","https://gf2-us-cdn.sunborngame.com/prod/website/official_zf/pc/zip/Vepley (SummerEcho)_8c2df2865c.rar"],
];

function _modelPresetSlug(value) {
  return String(value).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

window.ACS_GF2_MMD_MODEL_ARCHIVES = ACS_GF2_MMD_MODEL_ARCHIVE_DATA.map(
  ([officialId, name, typeName, filename, url]) => {
    const format = filename.toLowerCase().endsWith('.zip') ? 'zip' : 'rar';
    return {
      id: `gf2-${officialId}-${_modelPresetSlug(name)}-${_modelPresetSlug(typeName)}`,
      label: `GF2 ${name} (${typeName}) MMD model`,
      url,
      format,
      kind: 'mmd',
      officialId,
      archiveFilename: filename,
      sourceUrl: ACS_GF2_ART_SOURCE_URL,
      credit: "SUNBORN / Girls' Frontline 2: Exilium",
      license: 'Official GF2 Exilium art page download',
    };
  }
);

// Centralized model presets — superset of the original VRM-only list. Issue
// #36 asked for a single selector that lists every model regardless of
// underlying file format (VRM, GLB/glTF, FBX, PLY, OBJ, MJCF, or MMD models
// wrapped in ZIP/RAR archives) so the user picks one entry and the loader
// dispatches by format.
// Each entry carries:
//
//   id         — stable cfg key
//   label      — human-readable name shown in the dropdown
//   url        — direct fetchable URL (any GitHub blob URL is auto-rewritten
//                via ACS_normalizeModelURL before fetch)
//   format     — 'vrm' | 'glb' | 'gltf' | 'fbx' | 'ply' | 'obj' | 'mjcf'
//                | 'zip' | 'rar'
//   kind       — 'humanoid' | 'prop' | 'robot' | 'mmd' (drives mode-aware UI:
//                expression / spring-bone / pose panels are hidden for non-
//                humanoid kinds)
//   credit     — attribution string for the © overlay
//   license    — license string for the © overlay
//
// Per-preset flags (humanoid VRMs only):
//   flipped              — load with a 180° Y-axis bake (model exported back-
//                          facing). The Editor stores this in s.baseYaw so the
//                          per-frame autoRotate-off branch doesn't clobber it.
//                          NOTE: VRM 0.x models auto-bake π via metaVersion in
//                          loadVRMBuffer, so this flag is only needed to OVERRIDE
//                          a VRM 1 file that ships back-facing or to force a
//                          VRM 0 file to load un-rotated (set `flipped:false`).
//   attributionRequired  — surface the on-stage © overlay even if the VRM meta
//                          is silent. Used when the licence (e.g. Niconi
//                          Commons) demands attribution but the file's own
//                          creditNotation isn't 'required'.
window.ACS_MODEL_PRESETS = [
  { id:'pixiv',   label:'pixiv VRM1 sample (CC-ish / VRM license)',
                  url:window.ACS_DEFAULT_VRM_URL,
                  format:'vrm', kind:'humanoid',
                  credit:'pixiv Inc.', license:'VRM Public License 1.0' },
  { id:'seed',    label:'Seed-san (VirtualCast · VRM Public License 1.0)',
                  url:'https://cdn.jsdelivr.net/gh/vrm-c/vrm-specification@master/samples/Seed-san/vrm/Seed-san.vrm',
                  format:'vrm', kind:'humanoid',
                  credit:'VirtualCast, Inc.', license:'VRM Public License 1.0' },
  { id:'alicia',  label:'Alicia Solid (Dwango / Nikoni Commons)',
                  url:'https://cdn.jsdelivr.net/gh/vrm-c/UniVRM@master/Tests/Models/Alicia_vrm-0.51/AliciaSolid_vrm-0.51.vrm',
                  format:'vrm', kind:'humanoid',
                  credit:'© DWANGO Co., Ltd. / Nikoni Commons',
                  license:'Niconi Commons Attribution (requires credit)',
                  flipped:true, attributionRequired:true },
  // Verified raw URL for the V-Sekai sample VRM called out in issue #19. Same
  // repo as the Gangnam Style FBX so they pair naturally.
  { id:'vsekai',  label:'three-vrm girl 1.0β (V-Sekai)',
                  url:'https://raw.githubusercontent.com/V-Sekai/three-vrm-1-sandbox-mixamo/master/three-vrm-girl-1.0-beta.vrm',
                  format:'vrm', kind:'humanoid',
                  credit:'V-Sekai community', license:'See repository' },
  // Khronos sample GLB without a humanoid rig — loads as a static prop so the
  // user can verify the multi-format dispatcher works end-to-end without
  // depending on a TRELLIS backend (issue #36 R5/R6).
  { id:'khronos-duck', label:'Khronos sample Duck (GLB)',
                  url:'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Duck/glTF-Binary/Duck.glb',
                  format:'glb', kind:'prop',
                  credit:'Khronos Group', license:'CC-BY 4.0' },
  { id:'khronos-helmet', label:'Khronos DamagedHelmet (GLB, PBR)',
                  url:'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
                  format:'glb', kind:'prop',
                  credit:'theblueturtle_ / Khronos Group',
                  license:'CC-BY-NC 4.0' },
  // GEAR-SONIC robot — same MJCF + STL pipeline that issue #31 introduced;
  // exposed here so picking it from the unified selector loads it through
  // the same dispatcher (instead of the legacy ACS_loadGearSonicRobotModel
  // toggle, which still works).
  { id:'g1-robot', label:'Unitree G1 (29-DOF, GEAR-SONIC demo)',
                  url:'https://nvlabs.github.io/GEAR-SONIC/assets/robot/scene.xml',
                  format:'mjcf', kind:'robot',
                  credit:'NVIDIA / Unitree Robotics',
                  license:'See https://github.com/NVlabs/GR00T-WholeBodyControl/blob/main/LICENSE' },
  ...window.ACS_GF2_MMD_MODEL_ARCHIVES,
];

// Backwards-compat alias for callers that still reference the VRM-only list
// (e.g. third-party harnesses or older tests). The aliased array is a fresh
// filtered copy so mutating ACS_VRM_PRESETS doesn't reach back into
// ACS_MODEL_PRESETS, but the entry objects are shared by reference so flags
// like `flipped` on the same preset stay in sync.
window.ACS_VRM_PRESETS = window.ACS_MODEL_PRESETS.filter(
  (p) => p.format === 'vrm'
);

// Detect a model file's format from its URL extension first (the common
// case — every preset and most shared links carry a sensible suffix), then
// fall back to the HTTP Content-Type header for opaque CDN URLs. An explicit
// `hint` (e.g. set per-preset) wins over both. Throws when nothing matches —
// callers surface the message in the UI status block instead of silently
// loading the wrong loader.
window.ACS_detectModelFormat = function detectModelFormat(url, contentType, hint) {
  if (hint) return String(hint).toLowerCase();
  const u = (typeof url === 'string') ? url.split(/[?#]/)[0] : '';
  const ext = (u.split('.').pop() || '').toLowerCase();
  if (ext === 'vrm') return 'vrm';
  if (ext === 'glb' || ext === 'gltf') return 'glb';
  if (ext === 'fbx') return 'fbx';
  if (ext === 'ply') return 'ply';
  if (ext === 'obj') return 'obj';
  if (ext === 'xml') return 'mjcf';
  if (ext === 'zip') return 'zip';
  if (ext === 'rar') return 'rar';
  if (typeof contentType === 'string') {
    const ct = contentType.toLowerCase();
    if (ct.includes('model/vrm') || ct.includes('application/vrm')) return 'vrm';
    if (ct.includes('model/gltf-binary')) return 'glb';
    if (ct.includes('model/gltf+json')) return 'glb';
    if (ct.includes('application/zip') || ct.includes('application/x-zip-compressed')) return 'zip';
    if (ct.includes('application/vnd.rar') || ct.includes('application/x-rar-compressed')) return 'rar';
    if (ct.includes('application/octet-stream')) return 'glb';
  }
  throw new Error(`Unknown model format for URL: ${url || '<empty>'}`);
};

// Rewrite a `github.com/<o>/<r>/blob/<rev>/<path>` (or `…/raw/<rev>/<path>` /
// `…/raw/refs/heads/<rev>/<path>`) URL into the equivalent
// `raw.githubusercontent.com/<o>/<r>/<rev>/<path>` URL. Other URLs pass
// through unchanged. Used by the VRM and animation loaders so users can
// paste any GitHub link they happen to have.
window.ACS_normalizeModelURL = function normalizeModelURL(url) {
  if (typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  // /blob/ → raw.githubusercontent.com
  let m = trimmed.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
  // /raw/refs/heads/<branch>/... and /raw/refs/tags/<tag>/...
  m = trimmed.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/raw\/refs\/(?:heads|tags)\/(.+)$/i);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
  // /raw/<rev>/...
  m = trimmed.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/raw\/(.+)$/i);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
  return trimmed;
};

// MToon debug modes (see three-vrm materials-debug example).
window.ACS_MTOON_DEBUG_MODES = ['none', 'normal', 'litShadeRate', 'uv'];

// Opt-in infinite-floor grid styles inspired by the GEAR-SONIC demo floor.
// GridHelper is finite internally, but these large line fields read as an
// infinite floor at normal avatar camera distances.
window.ACS_FLOOR_GRID_STYLES = [
  {
    id: 'sonic',
    label: 'SONIC green',
    size: 80,
    divisions: 80,
    majorDivisions: 20,
    color: 0x6aaa7a,
    secondaryColor: 0x3a6a48,
    opacity: 0.42,
  },
  {
    id: 'violet',
    label: 'Studio violet',
    size: 80,
    divisions: 80,
    majorDivisions: 16,
    color: 0x8c6eff,
    secondaryColor: 0x332a55,
    opacity: 0.38,
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    size: 100,
    divisions: 100,
    majorDivisions: 20,
    color: 0x6ed5ff,
    secondaryColor: 0x1f4058,
    opacity: 0.34,
  },
];

// Programmatic gestures — driven by gestures.js each frame. Each has a
// default duration + mood presets so the same gesture feels different
// depending on the user's selected mood. `expr` is layered in during the
// gesture with a configurable easing curve.
window.ACS_GESTURE_PRESETS = {
  wave: {
    label: 'Wave (hello/hi)',
    duration: 2.4,     // seconds
    expr: 'happy',     // drive this expression to 0.7 at peak
    exprPeak: 0.7,
  },
  nod: {
    label: 'Nod (yes)',
    duration: 1.6,
    expr: 'happy',
    exprPeak: 0.4,
  },
  shake: {
    label: 'Shake (no)',
    duration: 1.8,
    expr: 'sad',
    exprPeak: 0.35,
  },
  bow: {
    label: 'Bow',
    duration: 2.0,
    expr: 'neutral',
    exprPeak: 0.0,
  },
};

// Mood multipliers — scale amplitude/speed of gestures + expressions.
window.ACS_MOOD_PRESETS = {
  neutral: { ampScale: 1.0, speedScale: 1.0, expr: 'neutral', exprWeight: 0.0 },
  happy:   { ampScale: 1.3, speedScale: 1.15, expr: 'happy', exprWeight: 0.55 },
  shy:     { ampScale: 0.55, speedScale: 0.75, expr: 'relaxed', exprWeight: 0.4 },
  excited: { ampScale: 1.6, speedScale: 1.35, expr: 'surprised', exprWeight: 0.5 },
  sad:     { ampScale: 0.65, speedScale: 0.7, expr: 'sad', exprWeight: 0.5 },
  angry:   { ampScale: 1.1, speedScale: 1.2, expr: 'angry', exprWeight: 0.55 },
};

// Easing curves for gesture + expression transitions.
window.ACS_EASINGS = {
  linear:    t => t,
  sine:      t => 0.5 - 0.5 * Math.cos(Math.PI * t),
  quad:      t => t * t,
  cubic:     t => t * t * t,
  easeOut:   t => 1 - Math.pow(1 - t, 3),
  easeInOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  // A classic "out-back" for gestures that overshoot slightly (wave tip).
  backOut:   t => { const c1=1.70158, c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); },
};
