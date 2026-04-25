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

// Publicly-hosted VRM models with permissive licenses for testing. All of
// them are reachable via CORS-enabled CDNs. Each entry carries its credit
// string; the actual license lives in the VRM meta (we still render it).
//
// Per-preset flags:
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
                  license:'Niconi Commons Attribution (requires credit)',
                  flipped:true, attributionRequired:true },
  // Verified raw URL for the V-Sekai sample VRM called out in issue #19. Same
  // repo as the Gangnam Style FBX so they pair naturally.
  { id:'vsekai',  label:'three-vrm girl 1.0β (V-Sekai)',
                  url:'https://raw.githubusercontent.com/V-Sekai/three-vrm-1-sandbox-mixamo/master/three-vrm-girl-1.0-beta.vrm',
                  credit:'V-Sekai community', license:'See repository' },
];

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
