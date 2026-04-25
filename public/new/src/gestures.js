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
      // VRM1 rest IS T-pose (right arm extends horizontally along +X). On the
      // RIGHT side, NEGATIVE z rotates the arm UP toward vertical; going past
      // -90° swings the arm ACROSS the body and the hand collides with the
      // head/neck. Anatomical "hi" wave keeps the upper arm at-or-just-under
      // vertical, with the forearm bent ~90° forward, hand BESIDE the head
      // — NOT crossing the centerline (issue #28: "hand goes through neck
      // and head").
      //
      // Geometry verified empirically (see
      // experiments/issue-28-wave-trajectory.mjs and the in-browser probe):
      //
      //   rightUpperArm.z = -1.30 rad (~-74°)  → arm raised outward beyond
      //                                            horizontal, NOT all the way
      //                                            to vertical, so the elbow
      //                                            stays on the right of the
      //                                            head, not above it.
      //   rightUpperArm.x = -0.30 rad (~-17°)  → slight forward lean — gesture
      //                                            faces the viewer.
      //   rightUpperArm.y = -0.20 rad (~-11°)  → mild external rotation
      //                                            (turning forearm forward).
      //   rightLowerArm.x = -1.40 rad (~-80°)  → elbow flexion just under 90°,
      //                                            forearm points UP from the
      //                                            elbow, hand ends ~head
      //                                            height beside the face.
      //   rightLowerArm.y = -0.20 rad (~-11°)  → small forearm rotation so the
      //                                            palm faces FORWARD (classic
      //                                            open-palm greeting).
      //   rightHand.z oscillation ±0.45 rad (~±26°) — wrist waves left/right.
      //
      // The hand world-space target sits at roughly (-0.45, 1.55, +0.15) for
      // the default pixiv VRM1 sample — beside the right ear, palm forward,
      // ~0.45m from the head centerline (no collision).
      const up = env;
      out.rot.rightUpperArm = {
        x: -0.30 * up * amp,
        y: -0.20 * up * amp,
        z: -1.30 * up * amp,            // ~-74° — abducted past horizontal
      };
      out.rot.rightLowerArm = {
        x: -1.40 * up * amp,            // elbow flexion ~80°
        y: -0.20 * up * amp,            // palm-forward (supination)
        z:  0,
      };
      // Hand: the actual "wave" — three full side-to-side cycles over the
      // gesture window, ramped by the envelope. ±~26° at the wrist matches
      // a natural greeting wave (oscillates around radial/ulnar deviation).
      const wave = Math.sin(t * Math.PI * 6) * 0.45 * up * amp;
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
