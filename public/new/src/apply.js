// apply.js — cfg → three.js engine bridge.
// ACS_applyAll runs every frame and pushes cfg into live three.js state.
// Drives idle animations, programmatic gestures, smooth look-at, and
// cross-fading expression blends. Material overrides support MToon's
// shadeColorFactor so per-mesh colors change both the lit and shaded sides.

(function () {
  const HUMANOID_BONES = window.ACS_HUMANOID_BONES;
  const POSE_PRESETS = window.ACS_POSE_PRESETS;
  const EASINGS = window.ACS_EASINGS;
  const MOODS = window.ACS_MOOD_PRESETS;
  const GESTURES = window.ACS_GESTURE_PRESETS;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const easeSin = (t) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * t);

  window.ACS_mergePose = function mergePose(rot, pose) {
    const out = {};
    for (const b of HUMANOID_BONES) out[b] = { x: 0, y: 0, z: 0 };
    for (const [b, r] of Object.entries(pose || {})) {
      if (!out[b]) out[b] = { x: 0, y: 0, z: 0 };
      out[b].x += r.x || 0; out[b].y += r.y || 0; out[b].z += r.z || 0;
    }
    for (const [b, r] of Object.entries(rot || {})) {
      if (!out[b]) out[b] = { x: 0, y: 0, z: 0 };
      out[b].x += r.x || 0; out[b].y += r.y || 0; out[b].z += r.z || 0;
    }
    return out;
  };

  function ensureIdle(s) {
    if (!s.idle) {
      s.idle = {
        t: 0,
        blinkTimer: 0, blinkPhase: 0, blinkNext: 1 + Math.random() * 3,
        gazeTarget: { yaw: 0, pitch: 0 }, gazeCur: { yaw: 0, pitch: 0 }, gazeNext: 0,
        lookYawCur: 0, lookPitchCur: 0, // smoothed eye-target angles
        // Smoothed head-follow angles — what the head bone is actually pushed
        // to each frame. Distinct from lookYawCur so the eye can be snappy
        // while the head still turns gently.
        headYawCur: 0, headPitchCur: 0,
      };
    }
    return s.idle;
  }

  // Gesture lifecycle: when cfg.gestureNonce changes (or gesture name flips to
  // non-empty), start a new playback. `g.t` is elapsed seconds; stops when
  // `t >= duration`.
  function ensureGesture(s) {
    if (!s.gesture) s.gesture = { name: '', nonce: -1, t: 0, duration: 0, easing: 'easeInOut' };
    return s.gesture;
  }

  function ensureTextMotion(s) {
    if (!s.textMotion) {
      s.textMotion = {
        prompt: '',
        nonce: -1,
        t: 0,
        plan: null,
        status: 'idle',
        reason: '',
        active: false,
        rootYaw: 0,
        root: { x: 0, y: 0, yaw: 0 },
        resources: null,
      };
    }
    return s.textMotion;
  }

  function ensureIpaSpeech(s) {
    if (!s.ipaSpeech) {
      s.ipaSpeech = {
        text: '',
        nonce: -1,
        t: 0,
        plan: null,
        status: 'idle',
        reason: '',
        active: false,
        phoneme: '',
        viseme: '',
        mouth: null,
        resources: null,
      };
    }
    return s.ipaSpeech;
  }

  // Emotion transition state: cfg.expr + mood bleed through a cross-fade.
  function ensureEmo(s) {
    if (!s.emo) s.emo = { from: {}, to: {}, started: -Infinity, durationMs: 0, easing: 'easeInOut' };
    return s.emo;
  }

  window.ACS_applyAll = function applyAll(s, c, dt) {
    if (!s.THREE) return;
    const THREE = s.THREE;
    dt = Math.min(dt ?? 0.016, 0.1);
    s.lastDt = dt;

    if (s.scene) {
      if (!s.scene.background || !s.scene.background.isColor) s.scene.background = new THREE.Color(c.bg);
      else s.scene.background.set(c.bg);
    }
    if (s.groundMat) s.groundMat.opacity = c.groundOpacity;

    if (s.lights) {
      s.lights.key.color.set(c.keyColor); s.lights.key.intensity = c.keyIntensity;
      s.lights.fill.color.set(c.fillColor); s.lights.fill.intensity = c.fillIntensity;
      s.lights.rim.color.set(c.rimColor); s.lights.rim.intensity = c.rimIntensity;
      s.lights.ambient.color.set(c.ambientColor); s.lights.ambient.intensity = c.ambientIntensity;
    }
    if (s.camera && Math.abs(s.camera.fov - c.cameraFov) > 0.01) {
      s.camera.fov = c.cameraFov; s.camera.updateProjectionMatrix();
    }
    if (s.controls) s.controls.enableDamping = !!c.cameraInertia;

    applyDebugHelpers(s, c, THREE);

    const vrm = s.vrm;
    if (!vrm) return;

    const animActive = !!s.animation?.action && s.animation.action.isRunning?.();
    const textMotionDelta = stepTextMotion(s, c, dt, animActive);
    const ipaSpeechDelta = stepIpaSpeech(s, c, dt);

    updateCharPos(s, c);
    if (vrm.scene) {
      const textRoot = textMotionDelta?.root || {};
      vrm.scene.position.x = (c.charPos?.x || 0) + (s.charDyn?.offsetX || 0) + (textRoot.x || 0);
      vrm.scene.position.y = (c.charPos?.y || 0) + (s.charDyn?.offsetY || 0) + (textRoot.y || 0);
    }

    // --- Gesture tick (may fully replace the pose if a gesture is active) ---
    const g = ensureGesture(s);
    const gestureName = c.gesture || '';
    const gestureNonce = c.gestureNonce || 0;
    if (gestureName && (g.name !== gestureName || g.nonce !== gestureNonce)) {
      const preset = GESTURES[gestureName];
      if (preset) {
        g.name = gestureName; g.nonce = gestureNonce;
        g.t = 0; g.duration = preset.duration;
        g.easing = c.gestureEasing || 'easeInOut';
      }
    }
    if (g.name && g.duration > 0) g.t += dt;
    const gestureActive = !animActive && g.name && g.t < g.duration;
    let gestureDelta = null;
    if (gestureActive) {
      const tNorm = clamp(g.t / g.duration, 0, 1);
      gestureDelta = window.ACS_gestureDelta(g.name, tNorm, c.mood || 'neutral', g.easing);
    }

    // Bones: rest → rot/pose merge → gesture overlay. If a FBX animation is
    // playing, the mixer owns rotations; we only touch scale + raw bones.
    if (vrm.humanoid) {
      const pose = POSE_PRESETS[c.pose] || {};
      const merged = window.ACS_mergePose(c.rot, pose);
      // For VRM 0 models the scene is pre-rotated π around Y so the model
      // faces the camera. That mirrors every bone's local X and Z axes in
      // world space, so cfg/pose/gesture rotations specified in VRM 1
      // conventions visually fire the OPPOSITE direction unless we flip
      // their X/Z signs here. Y unchanged (rotation around world up-axis).
      const axisFlip = getBoneAxisFlip(vrm);

      for (const b of HUMANOID_BONES) {
        const node = vrm.humanoid.getNormalizedBoneNode(b);
        if (!node) continue;
        const orig = s.originalRest[b];
        if (!orig) continue;

        if (!animActive) {
          node.quaternion.copy(orig.q);
          node.position.copy(orig.p);
        }
        node.scale.copy(orig.s);

        if (!animActive) {
          const r = merged[b];
          let rx = r?.x || 0, ry = r?.y || 0, rz = r?.z || 0;
          if (gestureDelta?.rot?.[b]) {
            rx += gestureDelta.rot[b].x || 0;
            ry += gestureDelta.rot[b].y || 0;
            rz += gestureDelta.rot[b].z || 0;
          }
          if (textMotionDelta?.rot?.[b]) {
            rx += textMotionDelta.rot[b].x || 0;
            ry += textMotionDelta.rot[b].y || 0;
            rz += textMotionDelta.rot[b].z || 0;
          }
          if (ipaSpeechDelta?.rot?.[b]) {
            rx += ipaSpeechDelta.rot[b].x || 0;
            ry += ipaSpeechDelta.rot[b].y || 0;
            rz += ipaSpeechDelta.rot[b].z || 0;
          }
          // Clamp the combined Euler to the bone's anatomical limit. Because
          // the limit table covers VRM humanoid bones we recognize and
          // returns the full ±360° for unknown bones, this is a no-op for
          // any non-humanoid driver and a soft cap everywhere else. Issue
          // #28 R2: stop overstretches before they reach the mesh.
          if (window.ACS_clampBoneRad) {
            rx = window.ACS_clampBoneRad(b, 'x', rx);
            ry = window.ACS_clampBoneRad(b, 'y', ry);
            rz = window.ACS_clampBoneRad(b, 'z', rz);
          }
          // Flip X/Z for VRM 0 (see axisFlip note above). Clamp first so the
          // limit table — written in VRM 1 conventions — still bounds the
          // intended motion before we mirror it.
          rx *= axisFlip;
          rz *= axisFlip;
          if (rx || ry || rz) {
            const e = new THREE.Euler(rx, ry, rz, 'XYZ');
            node.quaternion.multiply(new THREE.Quaternion().setFromEuler(e));
          }
        }
        const sc = c.scale?.[b];
        if (sc && sc !== 1) {
          node.scale.multiplyScalar(sc);
          const rawNode = vrm.humanoid.getRawBoneNode?.(b);
          if (rawNode && rawNode !== node && orig.rawS) rawNode.scale.copy(orig.rawS).multiplyScalar(sc);
        } else {
          const rawNode = vrm.humanoid.getRawBoneNode?.(b);
          if (rawNode && orig.rawS) rawNode.scale.copy(orig.rawS);
        }
      }
    }

    // --- Idle overlay (only when no animation / gesture owns bones) ---------
    const idle = ensureIdle(s);
    idle.t += dt;
    if (!animActive && !gestureActive && vrm.humanoid) {
      // Same X/Z mirroring as the main bone loop above — applies to every
      // bone X-axis rotation we add below (idle breath spine/chest, idle
      // micro head). Y is preserved.
      const axisFlip = getBoneAxisFlip(vrm);
      if (c.idleBreath) {
        const phase = easeSin((idle.t * 0.3) % 1);
        const amt = c.idleBreathAmt ?? 0.008;
        const spine = vrm.humanoid.getNormalizedBoneNode('spine');
        if (spine) spine.rotation.x += (phase - 0.5) * 2 * amt * axisFlip;
        const chest = vrm.humanoid.getNormalizedBoneNode('chest');
        if (chest) chest.rotation.x += (phase - 0.5) * amt * axisFlip;
      }
      if (c.idleMicroHead) {
        const head = vrm.humanoid.getNormalizedBoneNode('head');
        if (head) {
          const phaseX = easeSin((idle.t * 0.17 + 0.3) % 1);
          const phaseY = easeSin((idle.t * 0.11 + 0.6) % 1);
          head.rotation.x += (phaseX - 0.5) * 2 * 0.015 * axisFlip;
          head.rotation.y += (phaseY - 0.5) * 2 * 0.02;
        }
      }
    }

    // --- Expression blend + idle blink ---
    if (vrm.expressionManager) {
      applyExpressions(s, c, vrm, dt, mergeExpressionDeltas(gestureDelta, textMotionDelta, ipaSpeechDelta));
      if (c.idleBlink) stepBlink(vrm, c, idle, dt);
    }

    // --- LookAt ---
    applyLookAt(s, c, idle, dt, THREE, animActive, gestureActive);

    // --- Materials ---
    applyMaterials(s, c, THREE);

    const cvs = s.renderer?.domElement;
    if (cvs) {
      const sat = clamp(c.matSaturation ?? 1, 0, 2);
      cvs.style.filter = `saturate(${sat.toFixed(3)})`;
    }
  };

  function stepTextMotion(s, c, dt, animActive) {
    const tm = ensureTextMotion(s);
    if (!c.textMotionEnabled) {
      tm.status = 'idle';
      tm.active = false;
      tm.reason = '';
      tm.rootYaw = 0;
      tm.root = { x: 0, y: 0, yaw: 0 };
      return null;
    }
    if (animActive) {
      tm.status = 'blocked-animation';
      tm.active = false;
      tm.reason = 'Stop the loaded FBX animation before running text-to-motion.';
      tm.rootYaw = 0;
      tm.root = { x: 0, y: 0, yaw: 0 };
      return null;
    }

    const prompt = c.textMotionPrompt || '';
    const nonce = c.textMotionNonce || 0;
    if (!tm.plan || tm.prompt !== prompt || tm.nonce !== nonce) {
      tm.prompt = prompt;
      tm.nonce = nonce;
      tm.t = 0;
      tm.plan = window.ACS_createTextMotionPlan
        ? window.ACS_createTextMotionPlan(prompt)
        : { ok: false, status: 'missing-model', reason: 'Text motion module is not loaded.' };
      tm.resources = tm.plan.resources || window.ACS_getTextMotionResourceReport?.() || null;
      tm.status = tm.plan.ok ? 'running' : tm.plan.status;
      tm.reason = tm.plan.reason || '';
    }

    if (!tm.plan?.ok) {
      tm.active = false;
      tm.rootYaw = 0;
      tm.root = { x: 0, y: 0, yaw: 0 };
      return null;
    }

    tm.t += dt;
    const delta = window.ACS_textMotionDelta?.(tm.plan, tm.t, dt) || null;
    tm.active = !!delta?.active;
    tm.status = tm.active ? 'running' : 'complete';
    tm.reason = '';
    tm.root = delta?.root || { x: 0, y: 0, yaw: 0 };
    tm.rootYaw = tm.root.yaw || 0;
    return tm.active ? delta : null;
  }

  function stepIpaSpeech(s, c, dt) {
    const speech = ensureIpaSpeech(s);
    if (!c.ipaSpeechEnabled) {
      speech.status = 'idle';
      speech.active = false;
      speech.reason = '';
      speech.phoneme = '';
      speech.viseme = '';
      speech.mouth = null;
      return null;
    }

    const text = c.ipaSpeechText || '';
    const nonce = c.ipaSpeechNonce || 0;
    if (!speech.plan || speech.text !== text || speech.nonce !== nonce) {
      speech.text = text;
      speech.nonce = nonce;
      speech.t = 0;
      speech.plan = window.ACS_createIpaSpeechPlan
        ? window.ACS_createIpaSpeechPlan(text)
        : { ok: false, status: 'missing-model', reason: 'IPA speech module is not loaded.' };
      speech.resources = speech.plan.resources || window.ACS_getIpaSpeechResourceReport?.() || null;
      speech.status = speech.plan.ok ? 'running' : speech.plan.status;
      speech.reason = speech.plan.reason || '';
    }

    if (!speech.plan?.ok) {
      speech.active = false;
      speech.phoneme = '';
      speech.viseme = '';
      speech.mouth = null;
      return null;
    }

    speech.t += dt;
    const delta = window.ACS_ipaSpeechDelta?.(speech.plan, speech.t, dt) || null;
    speech.active = !!delta?.active;
    speech.status = speech.active ? 'running' : 'complete';
    speech.phoneme = delta?.phoneme || '';
    speech.viseme = delta?.viseme || '';
    speech.mouth = delta?.mouth || null;
    return speech.active ? delta : null;
  }

  function mergeExpressionDeltas(...deltas) {
    const exprs = {};
    for (const delta of deltas) {
      if (!delta?.exprs) continue;
      for (const [name, value] of Object.entries(delta.exprs)) {
        exprs[name] = Math.max(exprs[name] || 0, value || 0);
      }
    }
    return Object.keys(exprs).length ? { exprs } : null;
  }

  // Expression cross-fade: combine user cfg.expr with mood background weight,
  // interpolate from the last committed set with configurable easing.
  function applyExpressions(s, c, vrm, dt, gestureDelta) {
    const mood = MOODS[c.mood] || MOODS.neutral;
    const targetBase = { ...(c.expr || {}) };
    // Mood overlays a background expression weight (if not already set).
    if (mood.expr && (targetBase[mood.expr] ?? 0) < mood.exprWeight) {
      targetBase[mood.expr] = mood.exprWeight;
    }
    // Gesture delta contributes an additive expression layer on top.
    const target = { ...targetBase };
    if (gestureDelta?.exprs) {
      for (const [n, v] of Object.entries(gestureDelta.exprs)) {
        target[n] = Math.max(target[n] || 0, v);
      }
    }

    const emo = ensureEmo(s);
    const now = performance.now();
    const dur = Math.max(1, c.exprTransitionMs || 1);
    // If target changed, begin a new cross-fade from the current blend.
    const sig = JSON.stringify(target);
    if (sig !== emo.targetSig) {
      emo.from = emo.lastApplied ? { ...emo.lastApplied } : { ...target };
      emo.to = target;
      emo.targetSig = sig;
      emo.started = now;
      emo.durationMs = dur;
      emo.easing = c.exprTransitionEasing || 'easeInOut';
    }
    const elapsed = now - emo.started;
    const tNorm = Math.min(1, elapsed / emo.durationMs);
    const blend = window.ACS_blendExpressions(emo.from, emo.to, tNorm, emo.easing);
    emo.lastApplied = blend;

    // Apply blend + zero everything else.
    const seen = new Set();
    for (const [name, val] of Object.entries(blend)) {
      try { vrm.expressionManager.setValue(name, val); seen.add(name); } catch {}
    }
    for (const e of (vrm.expressionManager.expressions || [])) {
      const n = e.expressionName || e.name;
      if (!seen.has(n)) {
        try { vrm.expressionManager.setValue(n, 0); } catch {}
      }
    }
  }

  function stepBlink(vrm, c, idle, dt) {
    const freq = Math.max(0.05, c.idleBlinkFreq || 0.35);
    idle.blinkTimer += dt;
    if (idle.blinkPhase === 0 && idle.blinkTimer > idle.blinkNext) {
      idle.blinkPhase = 1; idle.blinkTimer = 0;
    } else if (idle.blinkPhase === 1) {
      const v = easeSin(Math.min(1, idle.blinkTimer / 0.08) * 0.5);
      try { vrm.expressionManager.setValue('blink', Math.max(v, c.expr?.blink || 0)); } catch {}
      if (idle.blinkTimer > 0.08) { idle.blinkPhase = 2; idle.blinkTimer = 0; }
    } else if (idle.blinkPhase === 2) {
      const v = easeSin((1 - Math.min(1, idle.blinkTimer / 0.12)) * 0.5);
      try { vrm.expressionManager.setValue('blink', Math.max(v, c.expr?.blink || 0)); } catch {}
      if (idle.blinkTimer > 0.12) {
        idle.blinkPhase = 0; idle.blinkTimer = 0;
        idle.blinkNext = (1 / freq) * (0.6 + Math.random() * 0.9);
      }
    }
  }

  // VRM 0.x and VRM 1.0 use opposite head-local "forward" axes:
  //   VRM 1.0  → head-local +Z is forward (face points along +Z).
  //   VRM 0.x  → head-local -Z is forward (face points along -Z).
  // three-vrm captures this in `vrm.lookAt.faceFront` (set to (0,0,-1) for
  // VRM 0 by VRMLookAtLoaderPlugin._v0Import). We mirror that sign in our
  // own world↔head-local math so camera/mouse/random gaze targets land in
  // front of the model regardless of which VRM version it shipped as.
  // Without this, every VRM 0 model (e.g. Alicia Solid 0.51) ends up with
  // yaw=±180° for a target in front and the head/eyes turn the wrong way.
  function getFaceFrontSign(vrm) {
    // Prefer the loader-populated faceFront (most accurate — picks up custom
    // "First-Person -> meshAnnotations / faceFront" too if upstream sets it).
    const ff = vrm?.lookAt?.faceFront;
    if (ff && typeof ff.z === 'number' && ff.z !== 0) return Math.sign(ff.z);
    // Fallback: VRM meta version when faceFront is missing for any reason.
    if (vrm?.meta?.metaVersion === '0') return -1;
    return 1;
  }

  // Sign to apply to the X and Z components of any rotation pushed into a
  // VRM humanoid bone. `VRMUtils.rotateVRM0(vrm)` (and our own per-preset
  // baseYaw) make a VRM 0 model face the same world direction as a VRM 1
  // model by rotating `vrm.scene` by π around Y. That scene rotation
  // mirrors every descendant bone's local X and Z axes in world space —
  // so a user-specified `head.rotation.x = +0.2` (intended as "tilt down"
  // in VRM 1 conventions) tilts the head UP on Alicia. Same flip applies
  // to z (lateral head tilt) and to the spine/chest breath wobble.
  // Y rotation is preserved (rotation around the world up-axis behaves
  // the same regardless of which way the body faces).
  //
  // Returns -1 when the X/Z axes are mirrored (VRM 0 + scene π), +1 when
  // they line up (VRM 1, default scene yaw 0). This is the same sign as
  // getFaceFrontSign for our presets, but logically distinct: it tracks
  // the bone-axis mirroring caused by the scene root rotation, not the
  // head-local face-front axis. The two coincide because VRM 0 needs the
  // π scene rotation precisely because its faceFront is -Z.
  function getBoneAxisFlip(vrm) {
    return getFaceFrontSign(vrm) === -1 ? -1 : 1;
  }

  // Take a world-space point and compute yaw/pitch (degrees) relative to
  // the character facing direction. Used by both the camera-follow and
  // mouse-follow modes to feed into the shared smoother + cone clamp +
  // head follow-through.
  //
  // The faceFront sign (`fz`) flips the yaw axis for VRM 0.x models so
  // "target in front of the face" reads as yaw≈0 in BOTH VRM versions.
  function worldPointToHeadAngles(s, THREE, worldPoint) {
    const head = s.vrm?.humanoid?.getNormalizedBoneNode('head');
    if (!head) return { yaw: 0, pitch: 0 };
    const headW = new THREE.Vector3();
    head.getWorldPosition(headW);
    // Transform the point into head-local space so the cone is relative to
    // wherever the character is actually facing (critical when the root is
    // rotated by Ctrl+drag or idle).
    const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
    const local = worldPoint.clone().applyMatrix4(inv);
    const fz = getFaceFrontSign(s.vrm);
    const yaw = Math.atan2(local.x * fz, local.z * fz) * 180 / Math.PI;
    const pitch = Math.atan2(local.y, Math.sqrt(local.x*local.x + local.z*local.z)) * 180 / Math.PI;
    return { yaw, pitch };
  }

  function applyLookAt(s, c, idle, dt, THREE, animActive, gestureActive) {
    const vrm = s.vrm;
    if (!vrm || !vrm.lookAt) return;

    // If user has manually rotated an eye bone, let them win.
    const manualEye = !!(c.rot?.leftEye && (c.rot.leftEye.x || c.rot.leftEye.y || c.rot.leftEye.z))
                   || !!(c.rot?.rightEye && (c.rot.rightEye.x || c.rot.rightEye.y || c.rot.rightEye.z));
    if (manualEye) { vrm.lookAt.target = null; return; }

    const followCamera = !!c.lookFollowCamera;
    const followMouse = !!c.lookFollowMouse;
    const random = !!c.lookRandom;
    const anyIdle = followCamera || followMouse || random;

    // Each source accumulates two independent targets — one that moves the
    // EYES (VRM.lookAt) and one that rotates the HEAD bone. Per-source
    // toggles (lookCameraEyes / lookCameraHead / ...) choose which channels
    // receive the source's yaw/pitch contribution.
    //
    // If a source's target is OUTSIDE the front cone (the character would
    // have to turn around to see it), that source contributes ZERO this
    // frame. The smoother then decays the current angles toward neutral —
    // no snapping at the cone edge, the character just gently returns to
    // looking straight ahead.
    const coneY = c.lookConeYaw || 80;
    const coneP = c.lookConePitch || 50;
    const fade = Math.max(0.5, c.lookConeFadeDeg ?? 18); // degrees of soft-edge
    // coneGate(yaw, pitch) → 0..1 weight. 1 when solidly inside the cone,
    // falls off smoothly across `fade` degrees at the boundary, 0 well
    // outside. Multiplies each source's contribution so the onset of a
    // target entering the cone is never instant.
    const smoothstep = (edge0, edge1, x) => {
      const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };
    const coneGate = (yaw, pitch) => {
      const gy = 1 - smoothstep(coneY - fade, coneY, Math.abs(yaw));
      const gp = 1 - smoothstep(coneP - fade, coneP, Math.abs(pitch));
      return gy * gp;
    };

    // Per-source contribution uses INDEPENDENT eye + head amounts. They do
    // NOT sum to 1 — at (1.0, 1.0) the eyes AND head both track fully (in
    // sync). At (1.0, 0.0) classic eyes-only; at (0.0, 1.0) head carries
    // everything. `contribute` routes a source's target angles into the
    // eye and head accumulators weighted by the soft-cone gate.
    let eyesYaw = c.lookYaw || 0, eyesPitch = c.lookPitch || 0;
    let headYaw = 0, headPitch = 0;
    const contribute = (yaw, pitch, eyesOn, headOn, eyesAmt, headAmt) => {
      const gate = coneGate(yaw, pitch);
      if (gate <= 0) return;
      if (eyesOn && eyesAmt > 0) {
        eyesYaw += yaw * eyesAmt * gate;
        eyesPitch += pitch * eyesAmt * gate;
      }
      if (headOn && headAmt > 0) {
        headYaw += yaw * headAmt * gate;
        headPitch += pitch * headAmt * gate;
      }
    };

    // Layer 1: follow-camera.
    if (followCamera && s.camera) {
      const { yaw, pitch } = worldPointToHeadAngles(s, THREE, s.camera.position);
      contribute(yaw, pitch, !!c.lookCameraEyes, !!c.lookCameraHead,
                 c.lookCameraEyesAmount ?? 1.0, c.lookCameraHeadAmount ?? 0.35);
    }

    // Layer 2: follow-mouse — NDC unprojected into the world. When the
    // camera is also being followed, the mouse adds a delta on top.
    if (followMouse && s.camera) {
      const ndc = s.mouseNDC || { x: 0, y: 0 };
      const vec = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(s.camera);
      const dir = vec.sub(s.camera.position).normalize();
      const hit = s.camera.position.clone().addScaledVector(dir, 3);
      const { yaw, pitch } = worldPointToHeadAngles(s, THREE, hit);
      const eAmt = c.lookMouseEyesAmount ?? 1.0, hAmt = c.lookMouseHeadAmount ?? 0.25;
      if (followCamera) {
        const camAnchor = worldPointToHeadAngles(s, THREE, s.camera.position);
        contribute((yaw - camAnchor.yaw) * 0.5, (pitch - camAnchor.pitch) * 0.5,
                   !!c.lookMouseEyes, !!c.lookMouseHead, eAmt, hAmt);
      } else {
        contribute(yaw, pitch, !!c.lookMouseEyes, !!c.lookMouseHead, eAmt, hAmt);
      }
    }

    // Layer 3: random saccades — generated inside the cone so no gate needed.
    if (random) {
      idle.gazeNext -= dt;
      if (idle.gazeNext <= 0) {
        const amt = c.idleGazeAmt || 0.6;
        idle.gazeTarget.yaw = (Math.random() - 0.5) * coneY * amt;
        idle.gazeTarget.pitch = (Math.random() - 0.5) * coneP * amt;
        const minI = c.lookRandomMinInterval ?? 1.4;
        const maxI = c.lookRandomMaxInterval ?? 4.0;
        idle.gazeNext = minI + Math.random() * (maxI - minI);
      }
      const k = 1 - Math.exp(-(c.lookSmoothing || 3) * dt);
      idle.gazeCur.yaw += (idle.gazeTarget.yaw - idle.gazeCur.yaw) * k;
      idle.gazeCur.pitch += (idle.gazeTarget.pitch - idle.gazeCur.pitch) * k;
      const eOn = !!c.lookRandomEyes, hOn = !!c.lookRandomHead;
      const eAmt = c.lookRandomEyesAmount ?? 0.65, hAmt = c.lookRandomHeadAmount ?? 0.45;
      if (eOn) { eyesYaw += idle.gazeCur.yaw * eAmt; eyesPitch += idle.gazeCur.pitch * eAmt; }
      if (hOn) { headYaw += idle.gazeCur.yaw * hAmt; headPitch += idle.gazeCur.pitch * hAmt; }
    }

    // Global "follow fallbacks" — when the accumulated target exceeds the
    // threshold angle, add an extra multiplicative boost to eyes / head so
    // big gazes feel more committed. Always active (they did nothing before
    // because they were gated by "no head source enabled" — that's fixed).
    const boostY = c.lookEyeFollowAngle ?? 25, boostAmt = c.lookEyeFollowAmount ?? 0;
    const boostYH = c.lookHeadFollowAngle ?? 30, boostAmtH = c.lookHeadFollowAmount ?? 0;
    const eyeMag = Math.max(Math.abs(eyesYaw), Math.abs(eyesPitch));
    const headMag = Math.max(Math.abs(headYaw), Math.abs(headPitch));
    if (boostAmt > 0 && eyeMag > boostY) {
      const over = Math.min(1, (eyeMag - boostY) / Math.max(1, boostY)); // 0..1
      const mult = 1 + boostAmt * over;
      eyesYaw *= mult; eyesPitch *= mult;
    }
    if (boostAmtH > 0 && headMag > boostYH) {
      const over = Math.min(1, (headMag - boostYH) / Math.max(1, boostYH));
      const mult = 1 + boostAmtH * over;
      headYaw *= mult; headPitch *= mult;
    }

    // Gentle clamp inside cone (no-op if we skipped out-of-cone above).
    eyesYaw = clamp(eyesYaw, -coneY, coneY);
    eyesPitch = clamp(eyesPitch, -coneP, coneP);
    headYaw = clamp(headYaw, -coneY, coneY);
    headPitch = clamp(headPitch, -coneP, coneP);

    // Smooth the eye angles (fast, snappy). Used to position VRM.lookAt target.
    const k = 1 - Math.exp(-(c.lookSmoothing || 6) * dt);
    idle.lookYawCur += (eyesYaw - idle.lookYawCur) * k;
    idle.lookPitchCur += (eyesPitch - idle.lookPitchCur) * k;

    // Smooth the head angles (slower, heavier). Applied to head.rotation
    // directly below.
    const hk = 1 - Math.exp(-(c.lookHeadSmoothing || 3.5) * dt);
    idle.headYawCur += (headYaw - idle.headYawCur) * hk;
    idle.headPitchCur += (headPitch - idle.headPitchCur) * hk;

    // Always keep a lookAt target; let the smoother decay to zero naturally.
    // Nulling the target mid-animation causes VRM's eye applier to "pop" its
    // eye bones back to neutral — a visible jump. Instead, we drive the target
    // to the smoothed angles every frame; when they are zero, the target sits
    // directly in front of the head and the eyes look straight without snap.
    //
    // The head-local "forward" axis is +Z for VRM 1.0 and -Z for VRM 0.x —
    // multiplying the local x/z components by the face-front sign keeps the
    // target in front of the model in BOTH versions. Otherwise VRM 0 models
    // (e.g. Alicia) get a target placed BEHIND the head and the lookAt
    // applier rotates the eyes the wrong way (issue #26).
    const head0 = vrm.humanoid?.getNormalizedBoneNode('head');
    if (head0) {
      const dist = 5;
      const yawR = idle.lookYawCur * Math.PI / 180;
      const pitchR = idle.lookPitchCur * Math.PI / 180;
      const fz = getFaceFrontSign(vrm);
      const local = new THREE.Vector3(
        fz * Math.sin(yawR) * Math.cos(pitchR) * dist,
        Math.sin(pitchR) * dist,
        fz * Math.cos(yawR) * Math.cos(pitchR) * dist,
      );
      const world = local.applyMatrix4(head0.matrixWorld);
      if (!s.lookTarget) { s.lookTarget = new THREE.Object3D(); s.scene.add(s.lookTarget); }
      s.lookTarget.position.copy(world);
      vrm.lookAt.target = s.lookTarget;
    }

    // Apply the smoothed HEAD angles directly to the head bone. This is
    // additive on top of pose/idle micro-head AND on top of any gesture
    // delta — the head bone receives the SUM of gesture rotation and
    // look-at rotation, so toggling a "yes" / "no" gesture on top of
    // camera tracking blends smoothly instead of snapping (issue #28 R7).
    // FBX animations still own the head bone exclusively; we only skip
    // when `animActive`.
    //
    // Pitch sign: worldPointToHeadAngles returns positive pitch when the
    // target is above the head. In a VRM 1 model the head bone's local
    // X axis aligns with world +X, so positive `rotation.x` tips the head
    // DOWN — we negate pitch to actually look UP at a point above.
    //
    // Issue #26 (pitch follow-up): VRM 0 models have `vrm.scene.rotation.y`
    // pre-set to π so the model faces the camera, which mirrors every
    // bone's local X (and Z) axis in world space. Without `axisFlip`
    // here, Alicia's head pitches the wrong way (looks DOWN when the
    // camera is above and vice versa). Yaw uses the world up-axis (Y),
    // which the scene rotation does NOT mirror, so it's unaffected.
    if (!animActive) {
      const head = vrm.humanoid?.getNormalizedBoneNode('head');
      if (head) {
        const axisFlip = getBoneAxisFlip(vrm);
        head.rotation.y += idle.headYawCur * (Math.PI / 180);
        head.rotation.x += -axisFlip * idle.headPitchCur * (Math.PI / 180);
      }
    }

    // Verbose look-at debug. Off by default so production users get no
    // console spam; flip cfg.debugLookAt (Debug → "LookAt verbose" toggle)
    // or call window.ACS_setLookAtDebug(true) from the console to surface
    // the per-frame face-front sign, the head-local camera position, the
    // smoothed eyes/head angles, and the final world-space look target.
    // Throttled to ~2 Hz so it's readable.
    if (c.debugLookAt || window.__acsLookAtDebug) {
      idle._dbgT = (idle._dbgT || 0) + dt;
      const period = window.__acsLookAtDebugPeriod || c.debugLookAtPeriod || 0.5;
      if (idle._dbgT >= period) {
        idle._dbgT = 0;
        const head = vrm.humanoid?.getNormalizedBoneNode('head');
        const ff = vrm.lookAt?.faceFront;
        const cam = s.camera ? s.camera.position : null;
        const headW = head ? head.getWorldPosition(new THREE.Vector3()) : null;
        let camLocal = null;
        if (head && cam) {
          const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
          camLocal = cam.clone().applyMatrix4(inv);
        }
        const target = vrm.lookAt?.target?.position;
        // eslint-disable-next-line no-console
        console.log('[ACS lookAt]', {
          metaVersion: vrm.meta?.metaVersion,
          faceFrontSign: getFaceFrontSign(vrm),
          faceFront: ff ? { x: ff.x, y: ff.y, z: ff.z } : null,
          baseYaw: s.baseYaw,
          sceneRotY: vrm.scene?.rotation?.y,
          headWorld: headW ? { x: round3(headW.x), y: round3(headW.y), z: round3(headW.z) } : null,
          cameraWorld: cam ? { x: round3(cam.x), y: round3(cam.y), z: round3(cam.z) } : null,
          cameraHeadLocal: camLocal ? { x: round3(camLocal.x), y: round3(camLocal.y), z: round3(camLocal.z) } : null,
          eyesYawDeg: round3(idle.lookYawCur),
          eyesPitchDeg: round3(idle.lookPitchCur),
          headYawDeg: round3(idle.headYawCur),
          headPitchDeg: round3(idle.headPitchCur),
          lookTargetWorld: target ? { x: round3(target.x), y: round3(target.y), z: round3(target.z) } : null,
        });
      }
    }
  }

  function round3(v) { return Math.round((v ?? 0) * 1000) / 1000; }

  // Programmatic toggle for the per-frame look-at debug log. Pass `true`
  // to enable at the default ~2 Hz, a positive number to set a custom
  // period (seconds), or `false` to turn it off. Independent of cfg so it
  // works from a console without React state mutation; cfg.debugLookAt
  // covers the in-UI path.
  window.ACS_setLookAtDebug = function setLookAtDebug(on) {
    if (typeof on === 'number' && on > 0) {
      window.__acsLookAtDebug = true;
      window.__acsLookAtDebugPeriod = on;
    } else {
      window.__acsLookAtDebug = !!on;
      if (!on) window.__acsLookAtDebugPeriod = 0;
    }
    return window.__acsLookAtDebug;
  };

  // Drive the head bone to follow big gaze swings, but always route the
  // rotation through an exponential smoother so the head itself never snaps.
  // `lookHeadSmoothing` controls the head's lag separately from the eye
  // tracking speed.
  function applyHeadFollowFromAngles(s, c, yawDeg, pitchDeg, animActive, gestureActive) {
    const idle = s.idle; if (!idle) return;
    const thresh = c.lookHeadFollowAngle ?? 15;
    const amt = c.lookHeadFollowAmount ?? 0.4;
    // Target head rotation (deg): only the portion beyond the threshold
    // contributes, scaled by amount. While a gesture/animation owns bones,
    // decay the target back to zero so we don't fight them.
    let targetY = 0, targetX = 0;
    if (!animActive && !gestureActive) {
      targetY = Math.max(0, Math.abs(yawDeg) - thresh) * Math.sign(yawDeg) * amt;
      targetX = Math.max(0, Math.abs(pitchDeg) - thresh) * Math.sign(pitchDeg) * amt;
    }
    // Exponential smoother with the head-specific smoothing constant.
    const dt = Math.min(s.lastDt || 0.016, 0.1);
    const k = 1 - Math.exp(-(c.lookHeadSmoothing ?? 3.5) * dt);
    idle.headYawCur += (targetY - idle.headYawCur) * k;
    idle.headPitchCur += (targetX - idle.headPitchCur) * k;
    if (animActive || gestureActive) return;
    const head = s.vrm.humanoid?.getNormalizedBoneNode('head');
    if (!head) return;
    const axisFlip = getBoneAxisFlip(s.vrm);
    head.rotation.y += idle.headYawCur * (Math.PI / 180);
    head.rotation.x += -axisFlip * idle.headPitchCur * (Math.PI / 180); // see sign note above
  }

  // worldPointToHeadAngles superseded applyHeadFollow (world→head-local).

  function applyMaterials(s, c, THREE) {
    if (!s.originalMats || !s.originalMats.length) return;
    const tintColor = new THREE.Color(c.matGlobalTint || '#ffffff');
    const emissiveColor = new THREE.Color(c.matEmissive || '#000000');
    const sat = clamp(c.matSaturation ?? 1, 0, 2);
    const meshOnly = !!c.debugMeshOnly;
    const wire = !!c.debugWireframe;
    const mtoonMode = c.debugMToonMode || 'none';

    for (const rec of s.originalMats) {
      const m = rec.mat;

      // Base lit color (m.color). MToon multiplies this with the diffuse texture.
      if (m.color && rec.color) {
        if (meshOnly) m.color.setHex(0x808080);
        else {
          m.color.copy(rec.color);
          const per = c.matPerMesh?.[rec.pickerKey] || c.matPerMesh?.[rec.key] || c.matPerMesh?.[rec.meshName];
          if (per?.color) m.color.lerp(new THREE.Color(per.color), 0.85);
          if ((c.matTintAmount || 0) > 0) m.color.lerp(tintColor, c.matTintAmount);
          if (sat !== 1) {
            const hsl = { h: 0, s: 0, l: 0 };
            m.color.getHSL(hsl);
            m.color.setHSL(hsl.h, clamp(hsl.s * sat, 0, 1), hsl.l);
          }
        }
      }

      // MToon shade color — the darker cel-shaded side. Applying the per-mesh
      // override here too makes per-material color changes visibly affect
      // both lit and shaded regions, not just the edge sliver that the lit
      // side happens to show.
      if (m.shadeColorFactor && rec.shadeColor) {
        if (meshOnly) m.shadeColorFactor.setHex(0x404040);
        else {
          m.shadeColorFactor.copy(rec.shadeColor);
          const per = c.matPerMesh?.[rec.pickerKey] || c.matPerMesh?.[rec.key] || c.matPerMesh?.[rec.meshName];
          if (per?.color) m.shadeColorFactor.lerp(new THREE.Color(per.color), 0.85);
          if ((c.matTintAmount || 0) > 0) m.shadeColorFactor.lerp(tintColor, c.matTintAmount);
          if (sat !== 1) {
            const hsl = { h: 0, s: 0, l: 0 };
            m.shadeColorFactor.getHSL(hsl);
            m.shadeColorFactor.setHSL(hsl.h, clamp(hsl.s * sat, 0, 1), hsl.l);
          }
        }
      }

      if (m.emissive && rec.emissive) {
        if (meshOnly) m.emissive.setHex(0x000000);
        else {
          m.emissive.copy(rec.emissive).lerp(emissiveColor, c.matEmissiveAmount || 0);
          m.emissiveIntensity = (rec.emissiveIntensity || 1) + (c.matEmissiveAmount || 0);
        }
      }
      if ('wireframe' in m) m.wireframe = wire;
      if (m.isMToonMaterial) {
        try { m.debugMode = mtoonMode; } catch {}
      }
    }
  }

  function applyDebugHelpers(s, c, THREE) {
    if (c.debugAxes && !s.axesHelper) {
      s.axesHelper = new THREE.AxesHelper(1);
      s.scene.add(s.axesHelper);
    } else if (!c.debugAxes && s.axesHelper) {
      s.scene.remove(s.axesHelper);
      s.axesHelper.dispose?.();
      s.axesHelper = null;
    }
    if (c.debugGrid && !s.gridHelper) {
      s.gridHelper = new THREE.GridHelper(4, 8, 0x8c6eff, 0x332a55);
      s.scene.add(s.gridHelper);
    } else if (!c.debugGrid && s.gridHelper) {
      s.scene.remove(s.gridHelper);
      s.gridHelper.dispose?.();
      s.gridHelper = null;
    }
    if (s.vrm && s.vrm.scene) {
      if (c.debugBoneHelpers && !s.skeletonHelpers?.length) {
        s.skeletonHelpers = [];
        s.vrm.scene.traverse(n => {
          if (n.isSkinnedMesh && n.skeleton) {
            const rootBone = n.skeleton.bones?.[0];
            if (rootBone && !s.skeletonHelpers.some(h => h.rootBone === rootBone)) {
              const h = new THREE.SkeletonHelper(rootBone);
              h.material.linewidth = 2;
              h.rootBone = rootBone;
              s.skeletonHelpers.push(h);
              s.scene.add(h);
            }
          }
        });
      } else if (!c.debugBoneHelpers && s.skeletonHelpers?.length) {
        for (const h of s.skeletonHelpers) { s.scene.remove(h); h.dispose?.(); }
        s.skeletonHelpers = [];
      }
    }
    if (s.springHelperRoot) s.springHelperRoot.visible = !!c.debugSpringBones;
  }

  function updateCharPos(s, c) {
    if (!s.charDyn) s.charDyn = { offsetX: 0, offsetY: 0, velX: 0, velY: 0, dragging: false };
    const d = s.charDyn;
    if (d.dragging || !c.charInertia) return;
    const dt = 0.016;
    const k = c.charSpringK ?? 6;
    const damping = c.charDamping ?? 4;
    const ax = -k * d.offsetX - damping * d.velX;
    const ay = -k * d.offsetY - damping * d.velY;
    d.velX += ax * dt;
    d.velY += ay * dt;
    d.offsetX += d.velX * dt;
    d.offsetY += d.velY * dt;
    if (Math.abs(d.offsetX) < 1e-4 && Math.abs(d.velX) < 1e-4) { d.offsetX = 0; d.velX = 0; }
    if (Math.abs(d.offsetY) < 1e-4 && Math.abs(d.velY) < 1e-4) { d.offsetY = 0; d.velY = 0; }
  }

  window.ACS_probe = function probe(s) {
    const out = { bones: {}, expr: {}, mats: {}, lights: {}, camera: {}, scene: {}, canvas: {}, debug: {}, anim: {}, gesture: {}, textMotion: {}, ipaSpeech: {}, shade: {} };
    if (!s) return out;
    const vrm = s.vrm;
    if (vrm && vrm.humanoid) {
      for (const b of HUMANOID_BONES) {
        const n = vrm.humanoid.getNormalizedBoneNode(b);
        if (!n) continue;
        const q3 = (x) => Math.round(x * 1000) / 1000;
        out.bones[b] = `r(${q3(n.rotation.x)},${q3(n.rotation.y)},${q3(n.rotation.z)}) s(${q3(n.scale.x)},${q3(n.scale.y)},${q3(n.scale.z)})`;
      }
    }
    if (vrm && vrm.expressionManager) {
      for (const e of (vrm.expressionManager.expressions || [])) {
        const n = e.expressionName || e.name;
        try { out.expr[n] = Math.round(vrm.expressionManager.getValue(n) * 1000) / 1000; } catch {}
      }
    }
    if (s.originalMats) {
      let i = 0;
      for (const rec of s.originalMats) {
        const m = rec.mat;
        if (m && m.color) {
          const cc = m.color;
          out.mats['m' + i] = `${rec.meshName}|${m.name||''}|${cc.r.toFixed(3)},${cc.g.toFixed(3)},${cc.b.toFixed(3)}`;
        }
        if (m && m.shadeColorFactor) {
          out.shade['m' + i] = `${m.shadeColorFactor.r.toFixed(3)},${m.shadeColorFactor.g.toFixed(3)},${m.shadeColorFactor.b.toFixed(3)}`;
        }
        i++;
      }
    }
    if (s.lights) {
      const L = (l) => `${'#'+l.color.getHexString()}|${l.intensity.toFixed(3)}`;
      out.lights.key = L(s.lights.key); out.lights.fill = L(s.lights.fill);
      out.lights.rim = L(s.lights.rim); out.lights.ambient = L(s.lights.ambient);
    }
    if (s.camera) out.camera.fov = Math.round(s.camera.fov * 100) / 100;
    if (s.controls) out.camera.inertia = !!s.controls.enableDamping;
    if (s.scene?.background) { try { out.scene.bg = '#' + s.scene.background.getHexString(); } catch {} }
    if (s.groundMat) out.scene.groundOpacity = Math.round(s.groundMat.opacity * 1000) / 1000;
    if (s.renderer) { try { out.canvas.filter = s.renderer.domElement.style.filter || ''; } catch {} }
    if (vrm) {
      out.scene.rootY = Math.round(vrm.scene.rotation.y * 1000) / 1000;
      out.scene.rootX = Math.round(vrm.scene.position.x * 1000) / 1000;
      out.scene.rootPY = Math.round(vrm.scene.position.y * 1000) / 1000;
    }
    out.debug.axes = !!s.axesHelper;
    out.debug.grid = !!s.gridHelper;
    out.debug.bones = (s.skeletonHelpers || []).length;
    out.debug.spring = !!s.springHelperRoot?.visible;
    out.anim.playing = !!s.animation?.action?.isRunning?.();
    out.gesture.name = s.gesture?.name || '';
    out.gesture.t = Math.round((s.gesture?.t || 0) * 100) / 100;
    out.textMotion.status = s.textMotion?.status || 'idle';
    out.textMotion.active = !!s.textMotion?.active;
    out.textMotion.t = Math.round((s.textMotion?.t || 0) * 100) / 100;
    out.textMotion.prompt = s.textMotion?.prompt || '';
    out.textMotion.reason = s.textMotion?.reason || '';
    out.textMotion.plan = (s.textMotion?.plan?.commands || []).map(c => c.type).join(',');
    out.ipaSpeech.status = s.ipaSpeech?.status || 'idle';
    out.ipaSpeech.active = !!s.ipaSpeech?.active;
    out.ipaSpeech.t = Math.round((s.ipaSpeech?.t || 0) * 100) / 100;
    out.ipaSpeech.text = s.ipaSpeech?.text || '';
    out.ipaSpeech.ipa = s.ipaSpeech?.plan?.ipa || '';
    out.ipaSpeech.reason = s.ipaSpeech?.reason || '';
    out.ipaSpeech.phoneme = s.ipaSpeech?.phoneme || '';
    out.ipaSpeech.viseme = s.ipaSpeech?.viseme || '';
    out.ipaSpeech.mouth = s.ipaSpeech?.mouth || null;
    return out;
  };

  window.ACS_fingerprintCanvas = function fingerprintCanvas(s) {
    if (!s || !s.renderer) return null;
    const cvs = s.renderer.domElement;
    const w = cvs.width, h = cvs.height;
    const tmp = document.createElement('canvas');
    tmp.width = 32; tmp.height = 32;
    const ctx = tmp.getContext('2d');
    ctx.drawImage(cvs, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    let r = 0, g = 0, b = 0, a = 0;
    let hash = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i+1]; b += data[i+2]; a += data[i+3];
      hash = ((hash << 5) - hash + data[i] + data[i+1] * 3 + data[i+2] * 7 + data[i+3]) | 0;
    }
    const n = data.length / 4;
    return { w, h, avg: [Math.round(r/n), Math.round(g/n), Math.round(b/n), Math.round(a/n)], hash: hash >>> 0 };
  };
})();
