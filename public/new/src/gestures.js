// gestures.js — programmatic short-form animations (wave, nod, shake, bow)
// layered on top of the pose/rotation stack. Runs entirely on the CPU: each
// frame a few bone Eulers and a single expression weight get added to the
// deltas that apply.js later applies.
//
// The module is stateless: apply.js owns an `s.gesture` bag and asks
// ACS_runGesture to produce the current bone deltas for a given (name, t).
//
// It also implements ACS_blendExpressions — a cross-fade helper used for
// smooth emotion transitions in apply.js.

(function () {
  const EASINGS = window.ACS_EASINGS;
  const GESTURES = window.ACS_GESTURE_PRESETS;
  const MOODS = window.ACS_MOOD_PRESETS;

  // Bell-shaped envelope — rises 0→1 over the first half, decays back to 0
  // in the second half. Used to shape one-shot gestures cleanly.
  function bell(t, easing = 'sine') {
    const e = EASINGS[easing] || EASINGS.sine;
    if (t < 0.5) return e(t * 2);
    return e((1 - t) * 2);
  }

  // Sustained envelope (ease-in, hold, ease-out) for gestures that have a
  // plateau in the middle. 20% ramp-in, 60% hold, 20% ramp-out.
  function sustained(t, easing = 'easeInOut') {
    const e = EASINGS[easing] || EASINGS.easeInOut;
    if (t < 0.2) return e(t / 0.2);
    if (t < 0.8) return 1;
    return e((1 - t) / 0.2);
  }

  // Compute bone-delta overlays for a gesture at parametric time t∈[0,1].
  // Returns { rot: { boneName: {x,y,z} }, exprs: { name: weight } }.
  window.ACS_gestureDelta = function gestureDelta(name, t, moodName, easing) {
    const mood = MOODS[moodName] || MOODS.neutral;
    const amp = mood.ampScale;
    const out = { rot: {}, exprs: {} };
    const env = sustained(t, easing);

    if (name === 'wave') {
      // VRM1 rest IS T-pose (arms horizontal), so NEGATIVE z on rightUpperArm
      // raises it up above the shoulder (same as pose-preset A vs Cheer).
      //
      // Wave matches the issue-28 reference: the upper arm is raised
      // VERTICALLY (z≈-130°), the elbow is bent ~90° (lowerArm.x≈-90°), the
      // upper arm has a slight forward swing (x≈-15°), and the WAVE itself
      // is the WRIST oscillating side-to-side (rightHand.z) — exactly what a
      // human does when greeting. Previously the oscillation was on the
      // forearm Y axis (forearm twist), which read as a windscreen-wiper
      // rather than a wave.
      const up = env;
      // Upper arm: raise nearly straight up, slight forward bias.
      out.rot.rightUpperArm = {
        x: -0.25 * up * amp,
        y:  0,
        z: -2.27 * up * amp,            // ~-130° — raised over the shoulder
      };
      // Elbow: bent ~90° forward, no oscillation (the forearm stays put).
      out.rot.rightLowerArm = {
        x: -1.55 * up * amp,            // ~-89° elbow flex
        y:  0,
        z:  0,
      };
      // Hand: the actual "wave" — three full side-to-side cycles over the
      // gesture window, ramped by the envelope. ~±35° at the wrist matches
      // the reference frame.
      const wave = Math.sin(t * Math.PI * 6) * 0.6 * up * amp;
      out.rot.rightHand = {
        x:  0,
        y:  0,
        z:  wave,
      };
      // Slight head tilt + look toward the waving arm.
      out.rot.head = { x: 0, y: -0.10 * up, z: -0.08 * up };
      const g = GESTURES.wave;
      if (g.expr) out.exprs[g.expr] = bell(t, easing) * g.exprPeak * (mood.ampScale * 0.9);
      return out;
    }

    if (name === 'nod') {
      // Head pitches down then up — two cycles sine.
      const cycles = 1.5;
      const pitch = Math.sin(t * Math.PI * 2 * cycles) * 0.22 * amp;
      out.rot.head = { x: pitch, y: 0, z: 0 };
      // Tiny neck carry-through (delayed 1 frame — approximated).
      out.rot.neck = { x: pitch * 0.35, y: 0, z: 0 };
      const g = GESTURES.nod;
      if (g.expr) out.exprs[g.expr] = bell(t, easing) * g.exprPeak * amp;
      return out;
    }

    if (name === 'shake') {
      const cycles = 1.5;
      const yaw = Math.sin(t * Math.PI * 2 * cycles) * 0.32 * amp;
      out.rot.head = { x: 0, y: yaw, z: 0 };
      out.rot.neck = { x: 0, y: yaw * 0.35, z: 0 };
      const g = GESTURES.shake;
      if (g.expr) out.exprs[g.expr] = bell(t, easing) * g.exprPeak * amp;
      return out;
    }

    if (name === 'bow') {
      const env2 = sustained(t, easing);
      const pitch = 0.55 * env2 * amp;
      out.rot.spine = { x: pitch * 0.4, y: 0, z: 0 };
      out.rot.chest = { x: pitch * 0.35, y: 0, z: 0 };
      out.rot.head = { x: pitch * 0.2, y: 0, z: 0 };
      return out;
    }

    return out;
  };

  // Cross-fade helper for emotion transitions. `state.fromExpr`, `state.toExpr`,
  // and `state.startedAt` come from apply.js; we advance the blend over
  // `durationMs` and merge the result with the base user weights.
  //
  // Returns a { name: weight } map that should *override* whatever the user
  // set in cfg.expr. Call sites then pass these to VRM.expressionManager.
  window.ACS_blendExpressions = function blendExpressions(fromExpr, toExpr, tNorm, easing) {
    const e = EASINGS[easing] || EASINGS.easeInOut;
    const k = e(Math.min(1, Math.max(0, tNorm)));
    const out = {};
    const keys = new Set([...Object.keys(fromExpr || {}), ...Object.keys(toExpr || {})]);
    for (const name of keys) {
      const a = fromExpr?.[name] ?? 0;
      const b = toExpr?.[name] ?? 0;
      out[name] = a + (b - a) * k;
    }
    return out;
  };
})();
