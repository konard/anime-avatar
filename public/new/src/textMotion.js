// textMotion.js - experimental browser-side text-to-motion adapter.
//
// This is intentionally small and local: it maps short text commands onto a
// GR00T-style planner intent (mode, movement direction, facing direction) and
// produces procedural VRM bone deltas in the browser. The real
// GR00T/GEAR-SONIC ONNX planners can replace the createPlan/delta path later
// without changing the editor cfg shape.

(function () {
  const MODEL_ID = 'gear-sonic-browser-adapter-v1';
  const REQUIRED = {
    model: MODEL_ID,
    memoryMb: 256,
    cpuCores: 2,
    wasm: true,
    webgl: true,
    webgpu: false,
    onnxModelMb: 0,
  };

  const COMMAND_DEFS = [
    {
      type: 'slowWalk',
      label: 'Slow walk',
      match: /\b(slow\s+walk|stroll|careful)\b/,
      duration: 2.8,
      stepHz: 1.2,
      speed: 0.35,
      amp: 0.65,
      gr00tMode: 1,
      movementDirection: [1, 0, 0],
      facingDirection: [1, 0, 0],
    },
    {
      type: 'run',
      label: 'Run',
      match: /\b(run|jog|sprint)\b/,
      duration: 1.35,
      stepHz: 2.55,
      speed: 1.25,
      amp: 1.25,
      gr00tMode: 3,
      movementDirection: [1, 0, 0],
      facingDirection: [1, 0, 0],
    },
    {
      type: 'happyWalk',
      label: 'Happy walk',
      match: /\b(happy|dance|bouncy)\b/,
      duration: 1.8,
      stepHz: 1.8,
      speed: 0.85,
      amp: 1.15,
      gr00tMode: 4,
      movementDirection: [1, 0, 0],
      facingDirection: [1, 0, 0],
      expr: 'happy',
    },
    {
      type: 'stealth',
      label: 'Stealth walk',
      match: /\b(stealth|sneak|creep)\b/,
      duration: 2.4,
      stepHz: 1.0,
      speed: 0.45,
      amp: 0.45,
      gr00tMode: 5,
      movementDirection: [1, 0, 0],
      facingDirection: [1, 0, 0],
    },
    {
      type: 'injured',
      label: 'Injured walk',
      match: /\b(injured|limp)\b/,
      duration: 2.2,
      stepHz: 1.1,
      speed: 0.35,
      amp: 0.55,
      gr00tMode: 6,
      movementDirection: [1, 0, 0],
      facingDirection: [1, 0, 0],
      expr: 'sad',
    },
    {
      type: 'squat',
      label: 'Squat',
      match: /\b(squat|duck|low\s+stance)\b/,
      duration: 1.6,
      stepHz: 0,
      speed: 0,
      amp: 1.0,
      gr00tMode: 4,
      movementDirection: [0, 0, 0],
      facingDirection: [1, 0, 0],
      height: 0.55,
      referenceId: 'squat_001__A359',
    },
    {
      type: 'lunge',
      label: 'Forward lunge',
      match: /\b(lunge|deep\s+lunge)\b/,
      duration: 1.8,
      stepHz: 0,
      speed: 0,
      amp: 1.0,
      gr00tMode: 4,
      movementDirection: [1, 0, 0],
      facingDirection: [1, 0, 0],
      height: 0.62,
      referenceId: 'forward_lunge_R_001__A359_M',
    },
    {
      type: 'kick',
      label: 'Standing kick',
      match: /\b(kick|standing\s+kick)\b/,
      duration: 1.35,
      stepHz: 0,
      speed: 0,
      amp: 1.0,
      gr00tMode: 0,
      movementDirection: [0, 0, 0],
      facingDirection: [1, 0, 0],
      referenceId: 'neutral_kick_R_001__A543',
    },
    {
      type: 'macarena',
      label: 'Macarena',
      match: /\b(macarena|party\s+dance)\b/,
      duration: 2.4,
      stepHz: 1.2,
      speed: 0,
      amp: 1.0,
      gr00tMode: 23,
      movementDirection: [0, 0, 0],
      facingDirection: [1, 0, 0],
      expr: 'happy',
      referenceId: 'macarena_001__A545',
    },
    {
      type: 'spinWalk',
      label: '360 spin walk',
      match: /\b(360|spin\s+walk|spin)\b/,
      duration: 2.2,
      stepHz: 1.35,
      speed: 0.5,
      amp: 0.9,
      gr00tMode: 2,
      turn: Math.PI * 2,
      movementDirection: [1, 0, 0],
      facingDirection: [1, 0, 0],
      referenceId: 'walking_quip_360_R_002__A428',
    },
    {
      type: 'walk',
      label: 'Walk',
      match: /\b(walk|forward|go)\b/,
      duration: 2.0,
      stepHz: 1.55,
      speed: 0.75,
      amp: 0.9,
      gr00tMode: 2,
      movementDirection: [1, 0, 0],
      facingDirection: [1, 0, 0],
    },
    {
      type: 'turnLeft',
      label: 'Turn left',
      match: /\b(turn|rotate|face)\s+(left|counterclockwise|ccw)\b|\bleft\s+turn\b/,
      duration: 1.8,
      stepHz: 1.4,
      speed: 0,
      amp: 0.7,
      gr00tMode: 2,
      turn: Math.PI / 3,
      movementDirection: [0, 0, 0],
      facingDirection: [0.5, 0.866, 0],
    },
    {
      type: 'turnRight',
      label: 'Turn right',
      match: /\b(turn|rotate|face)\s+(right|clockwise|cw)\b|\bright\s+turn\b|\bturn\b/,
      duration: 1.8,
      stepHz: 1.4,
      speed: 0,
      amp: 0.7,
      gr00tMode: 2,
      turn: -Math.PI / 3,
      movementDirection: [0, 0, 0],
      facingDirection: [0.5, -0.866, 0],
    },
    {
      type: 'wave',
      label: 'Wave',
      match: /\b(wave|hello|hi)\b/,
      duration: 2.4,
      stepHz: 0,
      speed: 0,
      amp: 1.0,
      gr00tMode: 0,
      movementDirection: [0, 0, 0],
      facingDirection: [1, 0, 0],
      expr: 'happy',
    },
    {
      type: 'idle',
      label: 'Idle',
      match: /\b(idle|stop|stand|halt)\b/,
      duration: 1.4,
      stepHz: 0,
      speed: 0,
      amp: 0,
      gr00tMode: 0,
      movementDirection: [0, 0, 0],
      facingDirection: [1, 0, 0],
    },
  ];
  const LOOPING_TYPES = new Set([
    'slowWalk',
    'walk',
    'run',
    'happyWalk',
    'stealth',
    'injured',
    'spinWalk',
    'macarena',
  ]);
  const REFERENCE_PROMPTS = [
    { prompt: 'squat', label: 'Squat', referenceId: 'squat_001__A359' },
    { prompt: 'standing kick', label: 'Standing Kick R', referenceId: 'neutral_kick_R_001__A543' },
    { prompt: 'lunge', label: 'Forward Lunge L', referenceId: 'forward_lunge_R_001__A359_M' },
    { prompt: 'macarena', label: 'Macarena 1', referenceId: 'macarena_001__A545' },
    { prompt: 'spin walk', label: '360 Spin Walk 1', referenceId: 'walking_quip_360_R_002__A428' },
  ];

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smooth01 = (v) => {
    const t = clamp01(v);
    return t * t * (3 - 2 * t);
  };
  const envelope = (u) => {
    if (u < 0.15) return smooth01(u / 0.15);
    if (u > 0.85) return smooth01((1 - u) / 0.15);
    return 1;
  };
  const addRot = (rot, bone, vals) => {
    rot[bone] = rot[bone] || { x: 0, y: 0, z: 0 };
    rot[bone].x += vals.x || 0;
    rot[bone].y += vals.y || 0;
    rot[bone].z += vals.z || 0;
  };

  function detectWebGL(doc) {
    if (!doc?.createElement) return false;
    try {
      const canvas = doc.createElement('canvas');
      return !!(
        canvas.getContext?.('webgl2') ||
        canvas.getContext?.('webgl') ||
        canvas.getContext?.('experimental-webgl')
      );
    } catch {
      return false;
    }
  }

  function detectResources(env) {
    const scope = env || window;
    const nav = scope.navigator || {};
    const perfMemory = scope.performance?.memory;
    const heapMb = perfMemory?.jsHeapSizeLimit
      ? Math.round(perfMemory.jsHeapSizeLimit / 1024 / 1024)
      : null;
    const deviceMb = nav.deviceMemory ? Math.round(nav.deviceMemory * 1024) : null;
    return {
      memoryMb: heapMb || deviceMb || null,
      cpuCores: nav.hardwareConcurrency || null,
      wasm: typeof scope.WebAssembly !== 'undefined' || typeof WebAssembly !== 'undefined',
      webgl: detectWebGL(scope.document),
      webgpu: !!nav.gpu,
      userAgent: nav.userAgent || '',
    };
  }

  function evaluateResources(available, required = REQUIRED) {
    const problems = [];
    if (required.wasm && !available.wasm) problems.push('WebAssembly unavailable');
    if (required.webgl && !available.webgl) problems.push('WebGL unavailable');
    if (
      available.cpuCores != null &&
      available.cpuCores < required.cpuCores
    ) {
      problems.push(`CPU cores ${available.cpuCores} < ${required.cpuCores}`);
    }
    if (
      available.memoryMb != null &&
      available.memoryMb < required.memoryMb
    ) {
      problems.push(`memory ${available.memoryMb} MiB < ${required.memoryMb} MiB`);
    }
    return {
      ok: problems.length === 0,
      problems,
      required,
      available,
    };
  }

  function normalizePrompt(prompt) {
    return String(prompt || '')
      .toLowerCase()
      .replace(/[^\w\s-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function commandForSegment(segment) {
    for (const def of COMMAND_DEFS) {
      if (def.match.test(segment)) {
        return {
          type: def.type,
          label: def.label,
          duration: def.duration,
          stepHz: def.stepHz,
          speed: def.speed,
          amp: def.amp,
          gr00tMode: def.gr00tMode,
          movementDirection: [...def.movementDirection],
          facingDirection: [...def.facingDirection],
          turn: def.turn || 0,
          expr: def.expr || '',
          height: def.height ?? -1,
          referenceId: def.referenceId || '',
        };
      }
    }
    return null;
  }

  function parsePrompt(prompt) {
    const normalized = normalizePrompt(prompt);
    if (!normalized) return { normalized, commands: [] };
    const parts = normalized
      .split(/\b(?:then|and)\b|[,;]+/g)
      .map(s => s.trim())
      .filter(Boolean);
    const commands = [];
    for (const part of parts.length ? parts : [normalized]) {
      const command = commandForSegment(part);
      if (command) commands.push(command);
    }
    if (!commands.length) {
      const command = commandForSegment(normalized);
      if (command) commands.push(command);
    }
    return { normalized, commands };
  }

  function createPlan(prompt, options = {}) {
    const required = options.required || REQUIRED;
    const available = options.available || detectResources(options.env);
    const resources = evaluateResources(available, required);
    if (!resources.ok) {
      return {
        ok: false,
        status: 'insufficient-resources',
        prompt: String(prompt || ''),
        resources,
        reason: resources.problems.join('; '),
      };
    }

    const parsed = parsePrompt(prompt);
    if (!parsed.commands.length) {
      return {
        ok: false,
        status: 'unsupported-prompt',
        prompt: String(prompt || ''),
        resources,
        reason: 'Use a supported command such as walk, run, turn left, squat, kick, lunge, macarena, wave, or stop.',
      };
    }

    const duration = parsed.commands.reduce((sum, command) => sum + command.duration, 0);
    const loop = parsed.commands.some(command => LOOPING_TYPES.has(command.type));
    const planner = {
      modes: parsed.commands.map(command => command.gr00tMode),
      movementDirections: parsed.commands.map(command => command.movementDirection),
      facingDirections: parsed.commands.map(command => command.facingDirection),
      heights: parsed.commands.map(command => command.height ?? -1),
      references: parsed.commands.map(command => command.referenceId || ''),
    };
    return {
      ok: true,
      status: 'ready',
      model: MODEL_ID,
      prompt: String(prompt || ''),
      normalized: parsed.normalized,
      commands: parsed.commands,
      duration,
      loop,
      resources,
      gearSonicPlanner: planner,
      gr00tPlanner: planner,
    };
  }

  function commandAt(plan, t) {
    if (!plan?.commands?.length) return null;
    let local = plan.loop ? (t % plan.duration) : Math.min(t, plan.duration);
    for (const command of plan.commands) {
      if (local <= command.duration) return { command, local };
      local -= command.duration;
    }
    const command = plan.commands[plan.commands.length - 1];
    return { command, local: command.duration };
  }

  function applyWalkCycle(out, command, local, env) {
    const phase = local * Math.PI * 2 * command.stepHz;
    const stride = Math.sin(phase);
    const other = Math.sin(phase + Math.PI);
    const liftL = Math.max(0, -stride);
    const liftR = Math.max(0, -other);
    const amp = command.amp * env;
    const legSwing = 0.48 * amp;
    const knee = 0.68 * amp;
    const armSwing = 0.35 * amp;

    addRot(out.rot, 'leftUpperLeg', { x: legSwing * stride });
    addRot(out.rot, 'rightUpperLeg', { x: legSwing * other });
    addRot(out.rot, 'leftLowerLeg', { x: knee * liftL });
    addRot(out.rot, 'rightLowerLeg', { x: knee * liftR });
    addRot(out.rot, 'leftFoot', { x: -0.16 * stride * amp });
    addRot(out.rot, 'rightFoot', { x: -0.16 * other * amp });
    addRot(out.rot, 'leftUpperArm', { x: -armSwing * stride, z: -0.04 * amp });
    addRot(out.rot, 'rightUpperArm', { x: -armSwing * other, z: 0.04 * amp });
    addRot(out.rot, 'spine', { x: 0.025 * Math.abs(stride) * amp, z: 0.025 * stride * amp });
    addRot(out.rot, 'hips', { y: 0.055 * stride * amp, z: -0.035 * stride * amp });

    if (command.type === 'happyWalk') {
      addRot(out.rot, 'head', { z: 0.05 * Math.sin(phase * 0.5) * amp });
      out.exprs[command.expr] = 0.45 * env;
    } else if (command.expr) {
      out.exprs[command.expr] = 0.35 * env;
    }

    out.root.x += Math.sin(local * Math.PI * 2 / command.duration) * 0.07 * command.amp;
    out.root.y += Math.abs(stride) * 0.025 * command.amp;
  }

  function applyTurn(out, command, local, env) {
    const phase = local * Math.PI * 2 * command.stepHz;
    const step = Math.sin(phase);
    const amp = command.amp * env;
    addRot(out.rot, 'leftUpperLeg', { x: 0.22 * step * amp, z: 0.10 * Math.sign(command.turn) * amp });
    addRot(out.rot, 'rightUpperLeg', { x: -0.22 * step * amp, z: 0.10 * Math.sign(command.turn) * amp });
    addRot(out.rot, 'hips', { y: command.turn * 0.22 * env });
    addRot(out.rot, 'spine', { y: command.turn * 0.16 * env });
    addRot(out.rot, 'head', { y: command.turn * 0.10 * env });
    out.root.yaw += command.turn * 0.75 * env;
    out.root.y += Math.abs(step) * 0.012;
  }

  function applyWave(out, command, local, env) {
    const phase = local * Math.PI * 6;
    const amp = command.amp * env;
    addRot(out.rot, 'rightUpperArm', { x: -0.3 * amp, y: -0.2 * amp, z: -1.25 * amp });
    addRot(out.rot, 'rightLowerArm', { x: -1.25 * amp, y: -0.2 * amp });
    addRot(out.rot, 'rightHand', { z: Math.sin(phase) * 0.45 * amp });
    addRot(out.rot, 'head', { y: -0.08 * amp, z: -0.06 * amp });
    out.exprs[command.expr || 'happy'] = 0.55 * env;
  }

  function applySquat(out, command, local, env) {
    const hold = Math.sin(clamp01(local / command.duration) * Math.PI);
    const amp = command.amp * Math.max(env, hold);
    addRot(out.rot, 'hips', { x: -0.28 * amp });
    addRot(out.rot, 'spine', { x: 0.20 * amp });
    addRot(out.rot, 'chest', { x: 0.12 * amp });
    addRot(out.rot, 'leftUpperLeg', { x: 0.95 * amp, z: -0.10 * amp });
    addRot(out.rot, 'rightUpperLeg', { x: 0.95 * amp, z: 0.10 * amp });
    addRot(out.rot, 'leftLowerLeg', { x: 1.35 * amp });
    addRot(out.rot, 'rightLowerLeg', { x: 1.35 * amp });
    addRot(out.rot, 'leftFoot', { x: -0.45 * amp });
    addRot(out.rot, 'rightFoot', { x: -0.45 * amp });
    addRot(out.rot, 'leftUpperArm', { x: -0.25 * amp, z: -0.25 * amp });
    addRot(out.rot, 'rightUpperArm', { x: -0.25 * amp, z: 0.25 * amp });
    out.root.y -= 0.12 * amp;
  }

  function applyLunge(out, command, local, env) {
    const amp = command.amp * env;
    const reach = Math.sin(clamp01(local / command.duration) * Math.PI);
    addRot(out.rot, 'hips', { x: -0.14 * amp, y: 0.08 * amp });
    addRot(out.rot, 'spine', { x: 0.14 * amp, z: -0.06 * amp });
    addRot(out.rot, 'leftUpperLeg', { x: 0.95 * amp });
    addRot(out.rot, 'leftLowerLeg', { x: 1.15 * amp });
    addRot(out.rot, 'rightUpperLeg', { x: -0.40 * amp });
    addRot(out.rot, 'rightLowerLeg', { x: 0.35 * amp });
    addRot(out.rot, 'leftFoot', { x: -0.22 * amp });
    addRot(out.rot, 'rightFoot', { x: 0.18 * amp });
    addRot(out.rot, 'leftUpperArm', { x: -0.45 * amp });
    addRot(out.rot, 'rightUpperArm', { x: 0.30 * amp });
    out.root.x += 0.08 * reach;
    out.root.y -= 0.06 * amp;
  }

  function applyKick(out, command, local, env) {
    const u = clamp01(local / command.duration);
    const snap = Math.sin(u * Math.PI);
    const recoil = Math.sin(u * Math.PI * 2) * 0.25;
    const amp = command.amp * Math.max(env, snap);
    addRot(out.rot, 'hips', { y: -0.08 * amp, z: -0.04 * amp });
    addRot(out.rot, 'spine', { x: -0.08 * amp, z: 0.08 * amp });
    addRot(out.rot, 'rightUpperLeg', { x: 1.05 * amp + recoil });
    addRot(out.rot, 'rightLowerLeg', { x: 0.45 * amp });
    addRot(out.rot, 'rightFoot', { x: -0.22 * amp });
    addRot(out.rot, 'leftUpperLeg', { x: -0.18 * amp, z: -0.08 * amp });
    addRot(out.rot, 'leftLowerLeg', { x: 0.22 * amp });
    addRot(out.rot, 'leftUpperArm', { x: -0.42 * amp, z: -0.08 * amp });
    addRot(out.rot, 'rightUpperArm', { x: 0.30 * amp, z: 0.08 * amp });
    out.root.y += 0.02 * snap;
    out.exprs.surprised = 0.20 * amp;
  }

  function applyMacarena(out, command, local, env) {
    const u = clamp01(local / command.duration);
    const amp = command.amp * env;
    const beat = Math.floor(u * 8) % 4;
    const sway = Math.sin(local * Math.PI * 2 * command.stepHz);
    const left = beat === 0 || beat === 2 ? 1 : 0.45;
    const right = beat === 1 || beat === 3 ? 1 : 0.45;
    addRot(out.rot, 'leftUpperArm', { x: -0.75 * left * amp, y: 0.16 * amp, z: -0.35 * amp });
    addRot(out.rot, 'leftLowerArm', { x: -0.55 * left * amp, y: -0.25 * amp });
    addRot(out.rot, 'rightUpperArm', { x: -0.75 * right * amp, y: -0.16 * amp, z: 0.35 * amp });
    addRot(out.rot, 'rightLowerArm', { x: -0.55 * right * amp, y: 0.25 * amp });
    addRot(out.rot, 'hips', { y: 0.15 * sway * amp, z: 0.07 * sway * amp });
    addRot(out.rot, 'spine', { z: -0.08 * sway * amp });
    addRot(out.rot, 'head', { z: 0.06 * Math.sin(local * Math.PI * 2) * amp });
    out.root.y += Math.abs(sway) * 0.015 * amp;
    out.exprs[command.expr || 'happy'] = 0.5 * env;
  }

  function applySpinWalk(out, command, local, env) {
    applyWalkCycle(out, command, local, env);
    const u = clamp01(local / command.duration);
    out.root.yaw += command.turn * smooth01(u) * env;
    addRot(out.rot, 'hips', { y: 0.20 * Math.sin(u * Math.PI * 2) * env });
    addRot(out.rot, 'head', { y: 0.18 * Math.sin(u * Math.PI * 2 + Math.PI / 4) * env });
  }

  function deltaAt(plan, t) {
    const out = { active: false, rot: {}, exprs: {}, root: { x: 0, y: 0, yaw: 0 } };
    if (!plan?.ok || !plan.commands?.length) return out;
    if (!plan.loop && t > plan.duration) return out;

    const current = commandAt(plan, t);
    if (!current) return out;
    const { command, local } = current;
    const u = command.duration ? clamp01(local / command.duration) : 1;
    const env = command.type === 'idle' ? 0 : envelope(u);
    out.active = true;

    if (['slowWalk', 'walk', 'run', 'happyWalk', 'stealth', 'injured'].includes(command.type)) {
      applyWalkCycle(out, command, local, env);
    } else if (command.type === 'turnLeft' || command.type === 'turnRight') {
      applyTurn(out, command, local, env);
    } else if (command.type === 'wave') {
      applyWave(out, command, local, env);
    } else if (command.type === 'squat') {
      applySquat(out, command, local, env);
    } else if (command.type === 'lunge') {
      applyLunge(out, command, local, env);
    } else if (command.type === 'kick') {
      applyKick(out, command, local, env);
    } else if (command.type === 'macarena') {
      applyMacarena(out, command, local, env);
    } else if (command.type === 'spinWalk') {
      applySpinWalk(out, command, local, env);
    }

    return out;
  }

  function resourceReport(env) {
    return evaluateResources(detectResources(env), REQUIRED);
  }

  window.ACS_TEXT_MOTION_MODEL_ID = MODEL_ID;
  window.ACS_TEXT_MOTION_REQUIRED = REQUIRED;
  window.ACS_TEXT_MOTION_COMMANDS = COMMAND_DEFS.map(({ type, label, gr00tMode }) => ({
    type,
    label,
    gr00tMode,
  }));
  window.ACS_TEXT_MOTION_REFERENCE_PROMPTS = REFERENCE_PROMPTS;
  window.ACS_detectTextMotionResources = detectResources;
  window.ACS_evaluateTextMotionResources = evaluateResources;
  window.ACS_getTextMotionResourceReport = resourceReport;
  window.ACS_parseTextMotionPrompt = parsePrompt;
  window.ACS_createTextMotionPlan = createPlan;
  window.ACS_textMotionDelta = deltaAt;
})();
