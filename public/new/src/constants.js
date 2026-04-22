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
  { id:'none',   label:'— none —',          url:'', credit:'' },
  { id:'samba',  label:'Samba Dancing',     url:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/fbx/Samba%20Dancing.fbx',
                 credit:'Mixamo · three.js examples', license:'Mixamo terms (free use with your avatar)' },
  { id:'mixamo', label:'Mixamo Idle',       url:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/fbx/mixamo.fbx',
                 credit:'Mixamo · three.js examples', license:'Mixamo terms (free use with your avatar)' },
];

// Publicly-hosted VRM models with permissive licenses for testing. All of
// them are reachable via CORS-enabled CDNs. Each entry carries its credit
// string; the actual license lives in the VRM meta (we still render it).
window.ACS_VRM_PRESETS = [
  { id:'pixiv',   label:'pixiv VRM1 sample (CC-ish / VRM license)',
                  url:window.ACS_DEFAULT_VRM_URL,
                  credit:'pixiv Inc.', license:'VRM Public License 1.0' },
  { id:'seed',    label:'Seed-san (VirtualCast · VRM Public License 1.0)',
                  url:'https://cdn.jsdelivr.net/gh/vrm-c/vrm-specification@master/samples/Seed-san/vrm/Seed-san.vrm',
                  credit:'VirtualCast, Inc.', license:'VRM Public License 1.0' },
  { id:'alicia',  label:'Alicia Solid (Dwango / Nikoni Commons)',
                  url:'https://cdn.jsdelivr.net/gh/vrm-c/UniVRM@master/Tests/Models/Alicia_vrm-0.51/AliciaSolid_vrm-0.51.vrm',
                  credit:'© DWANGO Co., Ltd. / Nikoni Commons',
                  license:'Niconi Commons Attribution (requires credit)' },
];

// MToon debug modes (see three-vrm materials-debug example).
window.ACS_MTOON_DEBUG_MODES = ['none', 'normal', 'litShadeRate', 'uv'];

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
