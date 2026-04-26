// defaults.js — the cfg shape + which cfg keys each group owns.

window.ACS_DEFAULTS = {
  vrmUrl: window.ACS_DEFAULT_VRM_URL,
  vrmPreset: 'pixiv',  // which ACS_VRM_PRESETS entry is selected (or 'custom')

  // Pose: 'rest' means no extra rotation on top of the VRM's shipped rest pose.
  pose: 'rest',

  rot: {},           // boneName -> {x,y,z} extra rotation (radians)
  scale: {},         // boneName -> number (1 = rest)
  expr: {},          // expression name -> 0..1 (user-controlled baseline)

  lookYaw: 0,        // degrees (manual override bias)
  lookPitch: 0,
  // Three independent idle eye-animation layers (combine cleanly):
  //   lookFollowCamera — eyes track the active 3D camera (default ON).
  //   lookFollowMouse  — eyes follow the pointer NDC (default OFF).
  //   lookRandom       — eyes drift between random points (default OFF).
  // If all three are off, only manual yaw/pitch sliders are used.
  // Default: follow camera on, mouse + random off.
  lookFollowCamera: true,
  lookFollowMouse: false,
  lookRandom: false,
  // For each follow source, toggle whether the movement is carried by the
  // EYES and/or HEAD. `...EyesAmount` (0..1) and `...HeadAmount` (0..1) are
  // INDEPENDENT scalars — they do NOT sum to 1. At 1.0/1.0 the eyes and
  // head both track the full target angle (perfect sync). At 0.65/0.35 the
  // eyes take 65% and the head a gentle 35%. At 0/1 the head does all the
  // work and the eyes stay centered. Gives complete control of the gaze-
  // carrying mix per source.
  lookCameraEyes: true,
  lookCameraHead: true,
  lookCameraEyesAmount: 1.0,   // 100%
  lookCameraHeadAmount: 0.40,  // 40%
  lookMouseEyes: true,
  lookMouseHead: true,
  lookMouseEyesAmount: 1.0,
  lookMouseHeadAmount: 0.25,
  lookRandomEyes: true,
  lookRandomHead: true,
  lookRandomEyesAmount: 1.0,
  lookRandomHeadAmount: 0.45,
  // Eye-movement smoothing (higher = snappier tracking). Eyes flick fast to
  // targets; the head lags far behind via lookHeadSmoothing.
  lookSmoothing: 13.9,
  // The total front cone the character will glance inside. Defaults to a
  // wide ±110° yaw / ±80° pitch — generous but still keeps the head from
  // cranking around backwards.
  lookConeYaw: 110,
  lookConePitch: 80,
  // Soft cone edge: sources fade in/out over this many degrees of the cone
  // boundary so a camera sweeping past the character's shoulder doesn't
  // cause an instant snap of the gaze.
  lookConeFadeDeg: 18,
  // "Head follow fallback" — once the final gaze exceeds this angle (deg),
  // the head contribution gets an additional boost by this amount (added on
  // top of each source's lookXxxHeadAmount). Lets the head lean in only
  // for big gazes while staying subtle for small ones.
  lookHeadFollowAngle: 30,
  lookHeadFollowAmount: 0.35,
  // "Eye follow fallback" — same idea for the eyes. Multiplies the eye
  // contribution by (1 + amount) once the target angle exceeds this
  // threshold, so the eyes snap more aggressively for far targets.
  lookEyeFollowAngle: 25,
  lookEyeFollowAmount: 0.25,
  // How fast the head bone itself chases its target (lower = slower, more
  // natural). Head moves an order of magnitude slower than the eyes so the
  // motion reads organically — eyes snap, head drifts.
  lookHeadSmoothing: 1.6,
  // Random saccade params (only used when lookRandom is on). Gentle by
  // default so eyes drift rather than snap between targets.
  lookRandomMinInterval: 1.4,
  lookRandomMaxInterval: 4.0,
  // Idle breath / blink kept in the Idle section — see below.

  matGlobalTint: '#ffffff',
  matTintAmount: 0,
  matSaturation: 1.0,
  matEmissive: '#000000',
  matEmissiveAmount: 0,
  matPerMesh: {},    // materialKey -> { color }

  bg: '#141026',
  groundOpacity: 0.35,

  keyColor: '#fff4e0',  keyIntensity: 1.15,
  fillColor: '#b8d4ff', fillIntensity: 0.55,
  rimColor: '#ffc8dd',  rimIntensity: 0.85,
  ambientColor: '#ffffff', ambientIntensity: 0.45,

  // 3D camera — live OrbitControls writes back into these.
  cameraFov: 28,
  cameraDist: 2.6,
  cameraHeight: 1.35,
  cameraInertia: true,

  // 2D/SVG snapshot camera — independent.
  svgCamFov: 28,
  svgCamDist: 2.6,
  svgCamHeight: 1.35,

  autoRotate: false,
  mirrorArms: false,
  showFPS: true,

  // EXPERIMENTAL: in-viewport joint rotation gizmo. Off by default — see
  // issue #28. When `experimentalJointControls` is on, hovering over a
  // humanoid bone (desktop) or tapping near it (mobile) selects it; a
  // three.js TransformControls in 'rotate' mode is attached to the
  // selected bone, showing colored rings (R/G/B = X/Y/Z). Drag a ring to
  // rotate that joint. Rotations are clamped to the anatomical limits
  // table just like every other rotation pathway.
  experimentalJointControls: false,
  jointControlSize: 0.4,        // gizmo screen-size multiplier
  jointControlSelected: '',     // empty → pick automatically; otherwise bone name

  // Idle animation bundle. Curves are ease-in-out sine so nothing snaps.
  idleBreath: true,
  idleBreathAmt: 0.008,
  idleBlink: true,
  idleBlinkFreq: 0.35,
  idleGaze: true,       // random-mode saccades
  idleGazeAmt: 0.6,
  idleMicroHead: true,

  // Character root translation — driven by Ctrl+drag, with spring physics.
  charPos: { x: 0, y: 0 },
  charInertia: true,
  charSpringK: 6.0,
  charDamping: 4.0,

  // Debug helpers — off by default.
  debugBoneHelpers: false,
  debugAxes: false,
  debugGrid: false,
  debugSpringBones: false,
  debugWireframe: false,
  debugMeshOnly: false,
  debugMToonMode: 'none',
  // Verbose look-at log: every ~debugLookAtPeriod seconds the engine
  // prints faceFront sign, head-local camera position, smoothed eyes/head
  // angles, and the world-space look target. Used to diagnose VRM 0 vs
  // VRM 1 forward-axis bugs (issue #26 — Alicia head-follow flipped).
  debugLookAt: false,
  debugLookAtPeriod: 0.5,

  // Humanoid animation (Mixamo FBX / VRM-A). Mixer runs independently of pose/rot.
  animationUrl: '',
  animationPresetId: 'none',
  animationTimeScale: 1.0,

  // Mood: a high-level "vibe" multiplier that biases gesture amplitude and
  // overlays a subtle background expression blend.
  mood: 'neutral',

  // Gesture trigger: writing a new value (+ a timestamp change) plays it once.
  gesture: '',         // 'wave' | 'nod' | 'shake' | 'bow' | ''
  gestureNonce: 0,     // bump to replay the same gesture
  gestureEasing: 'easeInOut', // applies to envelope shape

  // EXPERIMENTAL: browser-side text-to-motion adapter. The prompt is parsed
  // locally into a GR00T-style planner intent and procedural VRM bone deltas.
  // `textMotionNonce` bumps when the user wants to replay the same prompt.
  textMotionEnabled: false,
  textMotionPrompt: 'walk',
  textMotionNonce: 0,
  textMotionModel: 'gr00t-browser-adapter-v0',

  // EXPERIMENTAL: English text -> IPA -> mouth animation. The adapter is
  // local and deterministic; it drives VRM mouth expressions and the jaw
  // bone from IPA-derived visemes.
  ipaSpeechEnabled: false,
  ipaSpeechText: 'Hello avatar',
  ipaSpeechNonce: 0,
  ipaSpeechModel: 'ipa-speech-browser-adapter-v0',

  // Expression blend-transition duration (seconds) + easing. Changing any
  // slider or mood triggers a cross-fade over this duration.
  exprTransitionMs: 450,
  exprTransitionEasing: 'easeInOut',

  // Attribution overlay (baked into the stage, not dismissable).
  attributionEnabled: true,  // master toggle for *tests* only (never for UI).

  svgLivePreview: false,
  svgYaw: 0,
  svgPitch: 0,
  svgWidth: 900,
  svgHeight: 1200,
  svgBg: '#0b0818',
  svgStroke: '#000000',
  svgStrokeWidth: 0,
  svgQuality: 0.5,
};

window.ACS_GROUP_CFG_KEYS = {
  pose: ['pose'],
  core: [],
  eyes: [],
  arms: [],
  legs: [],
  fingers: [],
  proportions: [],
  expressions: [],
  lookAt: ['lookYaw','lookPitch'],
  materials: ['matGlobalTint','matTintAmount','matSaturation','matEmissive','matEmissiveAmount'],
  lights: ['keyColor','keyIntensity','fillColor','fillIntensity','rimColor','rimIntensity','ambientColor','ambientIntensity'],
  scene: ['bg','groundOpacity'],
  camera: ['cameraFov','cameraDist','cameraHeight','cameraInertia'],
  svgCamera: ['svgCamFov','svgCamDist','svgCamHeight'],
  behaviour: ['autoRotate','showFPS','experimentalJointControls','jointControlSize','jointControlSelected'],
  idle: ['idleBreath','idleBreathAmt','idleBlink','idleBlinkFreq','idleGaze','idleGazeAmt','idleMicroHead',
         'lookFollowCamera','lookFollowMouse','lookRandom',
         'lookCameraEyes','lookCameraHead','lookCameraEyesAmount','lookCameraHeadAmount',
         'lookMouseEyes','lookMouseHead','lookMouseEyesAmount','lookMouseHeadAmount',
         'lookRandomEyes','lookRandomHead','lookRandomEyesAmount','lookRandomHeadAmount',
         'lookSmoothing','lookHeadSmoothing','lookConeYaw','lookConePitch','lookConeFadeDeg',
         'lookEyeFollowAngle','lookEyeFollowAmount',
         'lookHeadFollowAngle','lookHeadFollowAmount',
         'lookRandomMinInterval','lookRandomMaxInterval'],
  character: ['charPos','charInertia','charSpringK','charDamping'],
  debug: ['debugBoneHelpers','debugAxes','debugGrid','debugSpringBones','debugWireframe','debugMeshOnly','debugMToonMode','debugLookAt','debugLookAtPeriod'],
  animation: ['animationUrl','animationPresetId','animationTimeScale'],
  gestures: ['gesture','gestureNonce','gestureEasing','mood','exprTransitionMs','exprTransitionEasing'],
  textMotion: ['textMotionEnabled','textMotionPrompt','textMotionNonce','textMotionModel'],
  ipaSpeech: ['ipaSpeechEnabled','ipaSpeechText','ipaSpeechNonce','ipaSpeechModel'],
  svg: ['svgLivePreview','svgYaw','svgPitch','svgBg','svgStroke','svgStrokeWidth','svgQuality'],
};
