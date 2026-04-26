// randomizers.js — per-group mutation + reset functions.

(function () {
  const BONE_GROUPS = window.ACS_BONE_GROUPS;
  const SCALE_BONES = window.ACS_SCALE_BONES;
  const POSE_PRESETS = window.ACS_POSE_PRESETS;

  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const randHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  // Pick a random rotation value (in radians) inside the anatomical limit
  // for `bone`+`axis`. Falls back to a small range when the bone has no
  // entry in ACS_BONE_LIMITS so unknown rigs still get reasonable values.
  // Issue #28 R2: randomizers must not produce overstretched poses.
  const randBoneRad = (bone, axis, fallbackLo, fallbackHi) => {
    const limFn = window.ACS_boneLimitDeg;
    if (!limFn) return rand(fallbackLo ?? -1, fallbackHi ?? 1);
    const lim = limFn(bone, axis);
    if (lim === null) return 0;
    const [lo, hi] = lim;
    return rand(lo, hi) * Math.PI / 180;
  };

  window.ACS_buildRandomizers = function buildRandomizers(cfg, available) {
    const R = {};

    R.pose = (c) => {
      const keys = Object.keys(POSE_PRESETS);
      c.pose = keys[Math.floor(Math.random() * keys.length)];
    };

    // Each randomizer picks per-axis rotations inside the bone's
    // anatomical limit (issue #28 R2). The legacy fallback ranges in
    // `randBoneRad`'s arguments are kept for non-VRM rigs that lack a
    // limit entry so the behaviour degrades gracefully.
    R.core = (c) => {
      c.rot = { ...(c.rot || {}) };
      for (const b of BONE_GROUPS.core) if (available.bones.has(b)) {
        c.rot[b] = {
          x: randBoneRad(b, 'x', -0.25, 0.25),
          y: randBoneRad(b, 'y', -0.35, 0.35),
          z: randBoneRad(b, 'z', -0.15, 0.15),
        };
      }
    };
    R.eyes = (c) => {
      c.rot = { ...(c.rot || {}) };
      for (const b of BONE_GROUPS.eyes) if (available.bones.has(b)) {
        c.rot[b] = {
          x: randBoneRad(b, 'x', -0.2, 0.2),
          y: randBoneRad(b, 'y', -0.25, 0.25),
          z: 0,
        };
      }
    };
    R.arms = (c) => {
      c.rot = { ...(c.rot || {}) };
      for (const b of [...BONE_GROUPS.armL, ...BONE_GROUPS.armR]) if (available.bones.has(b)) {
        c.rot[b] = {
          x: randBoneRad(b, 'x', -0.8, 0.8),
          y: randBoneRad(b, 'y', -0.8, 0.8),
          z: randBoneRad(b, 'z', -1.4, 1.4),
        };
      }
    };
    R.legs = (c) => {
      c.rot = { ...(c.rot || {}) };
      for (const b of [...BONE_GROUPS.legL, ...BONE_GROUPS.legR]) if (available.bones.has(b)) {
        c.rot[b] = {
          x: randBoneRad(b, 'x', -0.4, 0.4),
          y: randBoneRad(b, 'y', -0.3, 0.3),
          z: randBoneRad(b, 'z', -0.3, 0.3),
        };
      }
    };
    R.fingers = (c) => {
      c.rot = { ...(c.rot || {}) };
      for (const b of [...BONE_GROUPS.fingersL, ...BONE_GROUPS.fingersR]) if (available.bones.has(b)) {
        c.rot[b] = { x: 0, y: 0, z: randBoneRad(b, 'z', -1.3, 1.3) };
      }
    };
    R.proportions = (c) => {
      c.scale = { ...(c.scale || {}) };
      for (const s of SCALE_BONES) if (available.bones.has(s.b)) {
        const v = rand(s.min, s.max);
        c.scale[s.b] = v;
        if (s.mirror && available.bones.has(s.mirror)) c.scale[s.mirror] = v;
      }
    };
    R.expressions = (c) => {
      c.expr = { ...(c.expr || {}) };
      for (const name of available.expressions) {
        // 30% of expressions get a non-zero weight so the face stays legible.
        c.expr[name] = Math.random() < 0.3 ? Math.random() : 0;
      }
    };
    R.lookAt = (c) => {
      c.lookYaw = rand(-45, 45);
      c.lookPitch = rand(-25, 25);
    };
    R.materials = (c) => {
      c.matGlobalTint = randHex();
      c.matTintAmount = rand(0, 0.6);
      c.matSaturation = rand(0.3, 1.6);
      c.matEmissive = randHex();
      c.matEmissiveAmount = rand(0, 0.5);
      c.matPerMesh = { ...(c.matPerMesh || {}) };
      for (const m of available.meshes) c.matPerMesh[m.key] = { color: randHex() };
    };
    R.lights = (c) => {
      c.keyColor = randHex(); c.keyIntensity = rand(0.3, 2.0);
      c.fillColor = randHex(); c.fillIntensity = rand(0.1, 1.2);
      c.rimColor = randHex(); c.rimIntensity = rand(0.1, 1.5);
      c.ambientColor = randHex(); c.ambientIntensity = rand(0.1, 1.0);
    };
    R.scene = (c) => {
      c.bg = randHex();
      c.groundOpacity = rand(0, 1);
    };
    R.camera = (c) => {
      c.cameraFov = rand(18, 55);
      c.cameraDist = rand(1.3, 4.5);
      c.cameraHeight = rand(0.6, 1.8);
    };
    R.svgCamera = (c) => {
      c.svgCamFov = rand(18, 55);
      c.svgCamDist = rand(1.3, 4.5);
      c.svgCamHeight = rand(0.6, 1.8);
    };
    R.behaviour = (c) => {
      c.autoRotate = Math.random() < 0.5;
      c.showFPS = Math.random() < 0.5;
      // experimentalJointControls intentionally NOT randomized — it's a UX
      // toggle the user opts into; flipping it during a Randomize-all
      // sweep would surprise users.
    };
    R.idle = (c) => {
      c.idleBreath = Math.random() < 0.7;
      c.idleBreathAmt = rand(0.003, 0.02);
      c.idleBlink = Math.random() < 0.8;
      c.idleBlinkFreq = rand(0.15, 0.6);
      c.idleGaze = Math.random() < 0.6;
      c.idleGazeAmt = rand(0.2, 1.0);
      c.idleMicroHead = Math.random() < 0.5;
      c.lookFollowCamera = Math.random() < 0.7;
      c.lookFollowMouse = Math.random() < 0.35;
      c.lookRandom = Math.random() < 0.45;
      c.lookCameraEyes = Math.random() < 0.85;
      c.lookCameraHead = Math.random() < 0.65;
      c.lookCameraEyesAmount = rand(0.3, 1.0);
      c.lookCameraHeadAmount = rand(0.1, 0.7);
      c.lookMouseEyes = Math.random() < 0.85;
      c.lookMouseHead = Math.random() < 0.35;
      c.lookMouseEyesAmount = rand(0.3, 1.0);
      c.lookMouseHeadAmount = rand(0.1, 0.5);
      c.lookRandomEyes = Math.random() < 0.85;
      c.lookRandomHead = Math.random() < 0.7;
      c.lookRandomEyesAmount = rand(0.3, 1.0);
      c.lookRandomHeadAmount = rand(0.1, 0.8);
      c.lookSmoothing = rand(1.5, 6);
      c.lookHeadSmoothing = rand(0.8, 3);
      c.lookConeYaw = rand(50, 90);
      c.lookConePitch = rand(25, 60);
      c.lookConeFadeDeg = rand(4, 30);
      c.lookEyeFollowAngle = rand(10, 40);
      c.lookEyeFollowAmount = rand(0, 0.5);
      c.lookHeadFollowAngle = rand(10, 40);
      c.lookHeadFollowAmount = rand(0, 0.7);
      c.lookRandomMinInterval = rand(0.4, 1.5);
      c.lookRandomMaxInterval = c.lookRandomMinInterval + rand(0.8, 3.0);
    };
    R.character = (c) => {
      c.charPos = { x: rand(-0.4, 0.4), y: rand(-0.2, 0.2) };
      c.charInertia = Math.random() < 0.7;
      c.charSpringK = rand(2, 10);
      c.charDamping = rand(2, 8);
    };
    R.debug = (c) => {
      c.debugBoneHelpers = Math.random() < 0.4;
      c.debugAxes = Math.random() < 0.4;
      c.debugGrid = Math.random() < 0.4;
      c.debugSpringBones = Math.random() < 0.3;
      c.debugWireframe = Math.random() < 0.3;
      c.debugMeshOnly = Math.random() < 0.3;
      const modes = window.ACS_MTOON_DEBUG_MODES;
      c.debugMToonMode = modes[Math.floor(Math.random() * modes.length)];
    };
    R.animation = (c) => {
      const presets = window.ACS_ANIMATION_PRESETS.filter(p => p.url);
      if (presets.length) {
        const pick = presets[Math.floor(Math.random() * presets.length)];
        c.animationUrl = pick.url;
        c.animationPresetId = pick.id;
      }
      c.animationTimeScale = rand(0.3, 1.6);
    };
    R.gestures = (c) => {
      const names = Object.keys(window.ACS_GESTURE_PRESETS);
      c.gesture = names[Math.floor(Math.random() * names.length)];
      c.gestureNonce = (c.gestureNonce || 0) + 1;
      const easings = Object.keys(window.ACS_EASINGS);
      c.gestureEasing = easings[Math.floor(Math.random() * easings.length)];
      const moods = Object.keys(window.ACS_MOOD_PRESETS);
      c.mood = moods[Math.floor(Math.random() * moods.length)];
      c.exprTransitionMs = 200 + Math.random() * 800;
      c.exprTransitionEasing = easings[Math.floor(Math.random() * easings.length)];
    };
    R.textMotion = (c) => {
      const prompts = [
        'walk',
        'slow walk then turn left',
        'run',
        'turn right',
        'happy walk',
        'wave',
      ];
      c.textMotionPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      c.textMotionModel = window.ACS_TEXT_MOTION_MODEL_ID || 'gr00t-browser-adapter-v0';
      if (c.textMotionEnabled) c.textMotionNonce = (c.textMotionNonce || 0) + 1;
    };
    R.ipaSpeech = (c) => {
      const prompts = [
        'Hello avatar',
        'International phonetic alphabet',
        'My mouth moves',
        'Physics and airflow',
        'Text to speech animation',
      ];
      c.ipaSpeechText = prompts[Math.floor(Math.random() * prompts.length)];
      c.ipaSpeechModel = window.ACS_IPA_SPEECH_MODEL_ID || 'ipa-speech-browser-adapter-v0';
      if (c.ipaSpeechEnabled) c.ipaSpeechNonce = (c.ipaSpeechNonce || 0) + 1;
    };
    R.svg = (c) => {
      c.svgYaw = rand(-180, 180);
      c.svgPitch = rand(-40, 40);
      c.svgBg = randHex();
      c.svgStroke = randHex();
      c.svgStrokeWidth = rand(0, 1.5);
      c.svgQuality = rand(0.4, 1.0);
    };

    return R;
  };

  window.ACS_buildResetters = function buildResetters(defaults) {
    return {
      pose:        (c) => { c.pose = defaults.pose; },
      core:        (c) => { c.rot = { ...c.rot }; for (const b of BONE_GROUPS.core) delete c.rot[b]; },
      eyes:        (c) => { c.rot = { ...c.rot }; for (const b of BONE_GROUPS.eyes) delete c.rot[b]; },
      arms:        (c) => { c.rot = { ...c.rot }; for (const b of [...BONE_GROUPS.armL, ...BONE_GROUPS.armR]) delete c.rot[b]; },
      legs:        (c) => { c.rot = { ...c.rot }; for (const b of [...BONE_GROUPS.legL, ...BONE_GROUPS.legR]) delete c.rot[b]; },
      fingers:     (c) => { c.rot = { ...c.rot }; for (const b of [...BONE_GROUPS.fingersL, ...BONE_GROUPS.fingersR]) delete c.rot[b]; },
      proportions: (c) => { c.scale = {}; },
      expressions: (c) => { c.expr = {}; },
      lookAt:      (c) => { c.lookYaw = 0; c.lookPitch = 0; },
      materials:   (c) => {
        c.matGlobalTint = defaults.matGlobalTint;
        c.matTintAmount = defaults.matTintAmount;
        c.matSaturation = defaults.matSaturation;
        c.matEmissive = defaults.matEmissive;
        c.matEmissiveAmount = defaults.matEmissiveAmount;
        c.matPerMesh = {};
      },
      lights: (c) => {
        c.keyColor = defaults.keyColor; c.keyIntensity = defaults.keyIntensity;
        c.fillColor = defaults.fillColor; c.fillIntensity = defaults.fillIntensity;
        c.rimColor = defaults.rimColor; c.rimIntensity = defaults.rimIntensity;
        c.ambientColor = defaults.ambientColor; c.ambientIntensity = defaults.ambientIntensity;
      },
      scene:       (c) => { c.bg = defaults.bg; c.groundOpacity = defaults.groundOpacity; },
      camera:      (c) => { c.cameraFov = defaults.cameraFov; c.cameraDist = defaults.cameraDist; c.cameraHeight = defaults.cameraHeight; c.cameraInertia = defaults.cameraInertia; },
      svgCamera:   (c) => { c.svgCamFov = defaults.svgCamFov; c.svgCamDist = defaults.svgCamDist; c.svgCamHeight = defaults.svgCamHeight; },
      behaviour:   (c) => {
        c.autoRotate = defaults.autoRotate;
        c.showFPS = defaults.showFPS;
        c.experimentalJointControls = defaults.experimentalJointControls;
        c.jointControlSize = defaults.jointControlSize;
        c.jointControlSelected = defaults.jointControlSelected;
      },
      idle:        (c) => {
        c.idleBreath = defaults.idleBreath; c.idleBreathAmt = defaults.idleBreathAmt;
        c.idleBlink = defaults.idleBlink; c.idleBlinkFreq = defaults.idleBlinkFreq;
        c.idleGaze = defaults.idleGaze; c.idleGazeAmt = defaults.idleGazeAmt;
        c.idleMicroHead = defaults.idleMicroHead;
        c.lookFollowCamera = defaults.lookFollowCamera;
        c.lookFollowMouse = defaults.lookFollowMouse;
        c.lookRandom = defaults.lookRandom;
        c.lookCameraEyes = defaults.lookCameraEyes;
        c.lookCameraHead = defaults.lookCameraHead;
        c.lookCameraEyesAmount = defaults.lookCameraEyesAmount;
        c.lookCameraHeadAmount = defaults.lookCameraHeadAmount;
        c.lookMouseEyes = defaults.lookMouseEyes;
        c.lookMouseHead = defaults.lookMouseHead;
        c.lookMouseEyesAmount = defaults.lookMouseEyesAmount;
        c.lookMouseHeadAmount = defaults.lookMouseHeadAmount;
        c.lookRandomEyes = defaults.lookRandomEyes;
        c.lookRandomHead = defaults.lookRandomHead;
        c.lookRandomEyesAmount = defaults.lookRandomEyesAmount;
        c.lookRandomHeadAmount = defaults.lookRandomHeadAmount;
        c.lookSmoothing = defaults.lookSmoothing;
        c.lookHeadSmoothing = defaults.lookHeadSmoothing;
        c.lookConeYaw = defaults.lookConeYaw;
        c.lookConePitch = defaults.lookConePitch;
        c.lookConeFadeDeg = defaults.lookConeFadeDeg;
        c.lookEyeFollowAngle = defaults.lookEyeFollowAngle;
        c.lookEyeFollowAmount = defaults.lookEyeFollowAmount;
        c.lookHeadFollowAngle = defaults.lookHeadFollowAngle;
        c.lookHeadFollowAmount = defaults.lookHeadFollowAmount;
        c.lookRandomMinInterval = defaults.lookRandomMinInterval;
        c.lookRandomMaxInterval = defaults.lookRandomMaxInterval;
      },
      character:   (c) => {
        c.charPos = { x: defaults.charPos.x, y: defaults.charPos.y };
        c.charInertia = defaults.charInertia;
        c.charSpringK = defaults.charSpringK;
        c.charDamping = defaults.charDamping;
      },
      debug:       (c) => {
        c.debugBoneHelpers = defaults.debugBoneHelpers; c.debugAxes = defaults.debugAxes;
        c.debugGrid = defaults.debugGrid; c.debugSpringBones = defaults.debugSpringBones;
        c.debugWireframe = defaults.debugWireframe; c.debugMeshOnly = defaults.debugMeshOnly;
        c.debugMToonMode = defaults.debugMToonMode;
      },
      animation:   (c) => {
        c.animationUrl = defaults.animationUrl;
        c.animationPresetId = defaults.animationPresetId;
        c.animationTimeScale = defaults.animationTimeScale;
      },
      gestures:    (c) => {
        c.gesture = defaults.gesture;
        c.gestureNonce = defaults.gestureNonce;
        c.gestureEasing = defaults.gestureEasing;
        c.mood = defaults.mood;
        c.exprTransitionMs = defaults.exprTransitionMs;
        c.exprTransitionEasing = defaults.exprTransitionEasing;
      },
      textMotion:  (c) => {
        c.textMotionEnabled = defaults.textMotionEnabled;
        c.textMotionPrompt = defaults.textMotionPrompt;
        c.textMotionNonce = defaults.textMotionNonce;
        c.textMotionModel = defaults.textMotionModel;
      },
      ipaSpeech:  (c) => {
        c.ipaSpeechEnabled = defaults.ipaSpeechEnabled;
        c.ipaSpeechText = defaults.ipaSpeechText;
        c.ipaSpeechNonce = defaults.ipaSpeechNonce;
        c.ipaSpeechModel = defaults.ipaSpeechModel;
      },
      svg:         (c) => {
        c.svgYaw = defaults.svgYaw;
        c.svgPitch = defaults.svgPitch;
        c.svgBg = defaults.svgBg;
        c.svgStroke = defaults.svgStroke;
        c.svgStrokeWidth = defaults.svgStrokeWidth;
        c.svgQuality = defaults.svgQuality;
      },
    };
  };
})();
