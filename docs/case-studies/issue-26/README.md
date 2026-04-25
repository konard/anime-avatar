# Case study: Issue #26 — `Follow camera` eyes and head animation for Alicia is broken in new avatar studio

> Source: https://github.com/konard/anime-avatar/issues/26

## Summary

Alicia Solid (a VRM 0.51 model) is the only shipped preset whose face/eye `Follow camera` direction is reversed: when the orbit camera moves to the model's right, her head and eyes try to look to her _left_, and vice versa. Other presets (pixiv VRM 1, Seed-san VRM 1) track the camera correctly.

Issue #19 previously baked a 180° Y rotation onto Alicia's `vrm.scene` (the `flipped: true` / `baseYaw: π` workaround) so she would load facing the camera. That fix solved the visible "back of the head on load" symptom but did **not** rewrite the look-at math, which still assumed VRM 1's head-local axis convention (face along +Z). For VRM 0.x models the head bone's face-front is local **-Z** (`vrm.lookAt.faceFront = (0, 0, -1)` per the three-vrm loader plugin), so every world-space gaze target was being placed _behind_ Alicia's head and her yaw inputs were sign-flipped.

## Timeline

- **2026-04-22** — Issue #19 ("New avatar studio issues") opens, listing eight problems. R1 is "Alicia loads back-facing".
- **2026-04-25 13:07Z** — Commit `f651e77` (PR #20) ships the `flipped: true` per-preset flag for Alicia and rewrites the per-frame autoRotate-off branch to preserve `baseYaw`. Alicia loads facing the camera. Other look-at math is untouched.
- **2026-04-25 14:55Z** — Issue #26 opens: `Follow camera` eyes/head for Alicia direction-flipped.
- **2026-04-25 14:55Z** — PR #27 opens (this branch).
- **2026-04-25 (later that day)** — This case study added; root cause traced to the head-local forward-axis assumption in `worldPointToHeadAngles` and `applyLookAt`'s target-construction code in `public/new/src/apply.js`.

## Reproductions

The studio code lives entirely under `public/new/src/`. All reproductions assume `npm run dev` and a browser pointed at `/anime-avatar/new/`.

### R1 — Alicia head-follow direction is reversed

1. Open `/anime-avatar/new/?view=editor`.
2. In **VRM Source → Preset**, pick `Alicia Solid (Dwango / Nikoni Commons)`.
3. In **Idle Animation → Gaze sources** the `Follow camera` source is on by default with both `eyes` and `head` chips enabled.
4. Orbit the camera around the model (drag in the empty stage area). Observe: Alicia's head turns the **wrong** way — when the camera ends up on her right (world +X), her head and eyes drift toward her left, and vice versa. With a VRM 1 preset (pixiv / Seed-san) the same drag turns the head correctly toward the camera.

### R2 — Alicia eye `lookAt` target sits behind her head

Run in the browser console after the model loads:

```js
const s = window.__acsB.getState();
const t = s.lookTarget?.position;
console.log({ headWorldZ: 0, lookTargetWorldZ: t?.z });
// BEFORE FIX: lookTargetWorldZ ≈ -5 (target placed behind the model on world -Z)
// AFTER FIX:  lookTargetWorldZ ≈ +5 (target placed in front)
```

The VRM library's `VRMLookAtBoneApplier` then rotates the eye bones toward whatever direction the target sits in — behind the head means the eyes get cranked to maxed-out angles (or the head rotation cone gates the source out entirely, per R1).

### R3 — Headless math reproduction (no browser needed)

`experiments/follow-camera-axes.mjs` re-implements the math and prints both the buggy and fixed yaw for the same camera positions. Run with `node experiments/follow-camera-axes.mjs`. Highlights:

| camera position           | model     | OLD yaw | NEW yaw |
| ------------------------- | --------- | ------- | ------- |
| in front (world +Z)       | VRM 1     | 0°      | 0°      |
| in front (world +Z)       | VRM 0 (π) | -180°   | 0°      |
| right of model (world +X) | VRM 1     | +90°    | +90°    |
| right of model (world +X) | VRM 0 (π) | -90°    | +90°    |
| left of model (world -X)  | VRM 1     | -90°    | -90°    |
| left of model (world -X)  | VRM 0 (π) | +90°    | -90°    |

VRM 0 with the OLD formula produces yaw values either out of the front cone (in-front case → -180°, gated to 0) or sign-flipped (left/right cases).

## Requirements (from the issue)

| #   | Requirement                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `Follow camera` eyes + head must follow the camera in the **correct direction** for Alicia, and for every other VRM model — VRM 0.x or VRM 1.0 — without per-preset flags. |
| R2  | All other interactions that depend on the head-local axis convention must be audited (eye `lookAt` target placement, head bone yaw application, etc.).                     |
| R3  | If data is insufficient to find the root cause, add verbose logging / debug output so the next iteration can pinpoint it.                                                  |
| R4  | Compile this case study into `docs/case-studies/issue-{id}` with timeline, requirement list, root causes, solutions, and library research.                                 |
| R5  | If any upstream library bug is implicated, file an issue against it with a reproducible example and a workaround.                                                          |

## Root causes

### RC1 — `worldPointToHeadAngles` assumes face-forward is head-local +Z

`public/new/src/apply.js` (pre-fix, lines 268-285):

```js
function worldPointToHeadAngles(s, THREE, worldPoint) {
  const head = s.vrm?.humanoid?.getNormalizedBoneNode('head');
  if (!head) return { yaw: 0, pitch: 0 };
  const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
  const local = worldPoint.clone().applyMatrix4(inv);
  const yaw = (Math.atan2(local.x, local.z) * 180) / Math.PI; // ← assumes +Z forward
  ...
}
```

For a VRM 0.x model, the head bone's local **-Z** is forward (the same convention the upstream `@pixiv/three-vrm` library captures in `vrm.lookAt.faceFront = (0, 0, -1)`, set by `VRMLookAtLoaderPlugin._v0Import`). The `head.matrixWorld.invert()` math is correct as a coordinate transform, but interpreting `local.z` as "forward distance" only works for VRM 1 models. For VRM 0 the sign is reversed, so a target dead-ahead returns yaw=±180° (gated out of the front cone) and a target to the model's right returns yaw=−90° (drives the head the wrong way).

### RC2 — `applyLookAt` builds the lookTarget assuming +Z forward

Same file, lines 434-448 (pre-fix):

```js
const local = new THREE.Vector3(
  Math.sin(yawR) * Math.cos(pitchR) * dist,
  Math.sin(pitchR) * dist,
  Math.cos(yawR) * Math.cos(pitchR) * dist // ← target placed at head-local +Z
);
const world = local.applyMatrix4(head0.matrixWorld);
```

Even when our smoothed yaw was 0, we placed the look-target at `head-local (0, 0, 5)`. For VRM 1 that's "5 m in front of the face". For VRM 0 it's "5 m _behind_ the head" — and `vrm.lookAt` then rotates the eye bones toward that point, which is the worst-case direction.

### RC3 — `baseYaw` resolution doesn't track `metaVersion`

`Editor.jsx` only set `baseYaw = π` when a matched preset declared `flipped: true`. Any VRM 0.x file loaded by URL or drag-drop without an explicit `flipped` flag would have `vrm.scene.rotation.y` set to `π` once by `VRMUtils.rotateVRM0()` and then immediately clobbered to `0` by our preset-resolution code, putting the model back-facing.

## Solutions implemented in this PR

1. **`getFaceFrontSign(vrm)` helper** in `public/new/src/apply.js`. Reads `vrm.lookAt.faceFront.z` (signed by `VRMLookAtLoaderPlugin._v0Import`) and falls back to `vrm.meta.metaVersion === '0' ? -1 : 1`. Single source of truth for "which way is forward in head-local space".
2. **`worldPointToHeadAngles` multiplies `local.x`/`local.z` by `getFaceFrontSign(vrm)`** before `atan2`. Pitch is unchanged (the up axis is +Y in both versions). Yaw now reads 0 when the target is in front for both VRM 0 and VRM 1.
3. **Look-target construction multiplies its head-local x/z output by the same sign**, so the world-space target lands in front of the model for both VRM 0 and VRM 1.
4. **`Editor.jsx` baseYaw fallback** now uses `vrm.meta?.metaVersion === '0' ? Math.PI : 0` as the default and only overrides when the matched preset has an explicit `baseYaw` / `flipped`. VRM 0.x models loaded outside the preset list (URL, drag-drop) now face the camera.
5. **Verbose look-at debug** — new `cfg.debugLookAt` toggle (Debug → "LookAt verbose" in the UI; programmatic `window.ACS_setLookAtDebug(true)`). Throttled to ~2 Hz; logs `metaVersion`, `faceFrontSign`, `faceFront`, `baseYaw`, scene rotation, head world position, camera world + head-local position, smoothed eye + head angles, and the lookAt target world position. Off by default.
6. **Unit tests** in `tests/lookAt.test.js` cover both VRM versions for `getFaceFrontSign`, `worldPointToHeadAngles` (camera in front / right / left / above), `buildLookTargetWorld`, and a yaw → target → yaw round-trip. 26 new test cases, all green.
7. **Headless reproduction script** at `experiments/follow-camera-axes.mjs` so the bug and the fix can be verified without a browser.

## Existing components / libraries reviewed

- `@pixiv/three-vrm` (v2.1.1, in `public/new/index.html`) — already loaded. We now reuse its `vrm.lookAt.faceFront` instead of duplicating the convention. The library's own `VRMLookAt` and `VRMLookAtBoneApplier` use exactly the same sign-flip internally for their built-in lookAt, so our code is consistent with theirs.
- `@pixiv/three-vrm` `VRMUtils.rotateVRM0` — confirms `vrm.scene.rotation.y = Math.PI` for VRM 0 models. We leave that call in place; the new `baseYaw` derivation re-applies the same value so the autoRotate-off branch can't clobber it later.
- `three.js` `Object3D.matrixWorld` / `Matrix4.invert` — used as-is. The matrix math is correct; the bug was in the post-transform interpretation, not in the transform itself.

## Related-repo issue triage

This is an in-tree bug, not a `@pixiv/three-vrm` regression. The library exposes `vrm.lookAt.faceFront` precisely so consumers can implement their own world↔head-local math without re-encoding the version difference. The library's own README and migration guide both note that VRM 0.x ships face-back-facing and that consumers should call `VRMUtils.rotateVRM0` plus respect `lookAt.faceFront`. We were doing the first half but not the second.

No upstream issue is needed.

## Verification

`npm test` (54 passing, including 26 new look-at tests in `tests/lookAt.test.js`).

`node experiments/follow-camera-axes.mjs` prints the OLD vs NEW yaw for both VRM 0 and VRM 1.

`npm run dev` → `/anime-avatar/new/`:

1. Default pixiv preset (VRM 1) — camera-follow tracks correctly (regression check).
2. Pick **Alicia Solid** preset → loads facing forward (issue #19 still good).
3. Programmatically place camera at world (2.5, 1.4, 0) (model's right):
   - Before fix: head yaw ~0° (cone-gated out, head doesn't move) or ~−39° (wrong direction).
   - After fix: head yaw ~+39°, look-target at world (~+5, 1.4, 0). Head visibly turns toward the camera.
4. Toggle **Debug → LookAt verbose** → console shows `faceFrontSign: -1` for Alicia and `+1` for VRM 1 models, with the smoothed angles + target updates ~2 Hz.

## Screenshots

- `docs/screenshots/issue-26/01-pixiv-vrm1-default.png` — VRM 1 model loads facing camera (regression check).
- `docs/screenshots/issue-26/02-alicia-default-front.png` — Alicia loads facing camera (issue #19 still good).
- `docs/screenshots/issue-26/03-alicia-camera-right-AFTER-fix.png` — Alicia's head turned toward the camera after orbit to the model's right (issue #26 fixed).
- `docs/screenshots/issue-26/04-alicia-camera-right-AFTER-fix-detail.png` — close detail of Alicia following the camera correctly.

---

## Follow-up: pitch is _also_ flipped on Alicia (2026-04-25)

After PR #27 shipped, the issue author reopened #26 with a comment:

> "After checking latest version I see that up/down on following animation for Alicia model is flipped. Double check in all other places all orientations are correct."

Yaw was now correct, but **pitch** (looking up/down) tracked _the opposite_ direction of the camera for Alicia only. The eye `lookAt` was visually fine (PR #27 fixed the target builder), but the head bone itself tipped DOWN when the camera moved above and UP when the camera moved below.

### RC4 — Scene rotation π mirrors the head bone's local X axis in world space

Visual evidence (`alicia-camera-above.png` before fix): camera at `(0, 4, 2)`, smoothed `headPitchCur ≈ +21°`, `head.rotation.x = -0.378`. Result: top of Alicia's head visible (face tilted DOWN, away from camera). Same setup on the pixiv VRM 1 sample tilts the face UP toward the camera as expected.

`VRMUtils.rotateVRM0(vrm)` (and our matching per-preset `baseYaw`) implement the front-facing flip by setting `vrm.scene.rotation.y = π` once at load time. That rotation propagates to every descendant — including the head bone, whose normalized world matrix axes for Alicia were measured at:

| axis       | VRM 1 (pixiv)    | VRM 0 (Alicia)   |
| ---------- | ---------------- | ---------------- |
| local +X → | world ≈ (+1,0,0) | world ≈ (-1,0,0) |
| local +Y → | world ≈ (0,+1,0) | world ≈ (0,+1,0) |
| local +Z → | world ≈ (0,0,+1) | world ≈ (0,0,-1) |

Y is preserved (rotation around the world up-axis is invariant under a Y-axis scene rotation). X and Z are mirrored — which is exactly what `faceFront.z` flipping captures for the look-at math. But the head-bone rotation update was still doing

```js
head.rotation.x += -idle.headPitchCur * (Math.PI / 180);
```

without any sign correction. For VRM 1 that rotates around world `(+1, 0, 0)` (looks UP, correct). For Alicia that rotates around world `(-1, 0, 0)` — the same numeric `α` produces the OPPOSITE world rotation (looks DOWN).

The same mirror affected:

- **All cfg/pose/gesture rotations applied to humanoid bones** (`pose.thinker = { head: { x: 0.2 }, leftUpperArm: { z: -1.3 }, ... }`). On Alicia "thinker" raised both arms straight up instead of dropping them to the sides — z was firing in reverse.
- **Idle breath** (`spine.rotation.x += ...`) and **idle micro-head jitter** (`head.rotation.x += ...`) — symmetric noise so the bug was invisible, but inconsistent in direction.
- **Legacy `applyHeadFollowFromAngles`** — same line as the new pitch-apply.

### Solution — `getBoneAxisFlip(vrm)` helper, X/Z multiplied for VRM 0

`public/new/src/apply.js` now derives a separate sign just for bone-axis mirroring:

```js
function getBoneAxisFlip(vrm) {
  return getFaceFrontSign(vrm) === -1 ? -1 : 1;
}
```

It coincides with `getFaceFrontSign` for our presets but is logically distinct (face-front axis vs scene-rotation-induced bone mirroring) — splitting the helpers makes the intent at each call-site readable.

The flip is applied at four call-sites:

1. **Main bone loop** (after the anatomical clamp). Every cfg/pose/gesture-derived `rx, rz` gets multiplied by `axisFlip` before the `Euler → quaternion → multiply` step. Y is left alone.
2. **Idle breath** — `spine.rotation.x` and `chest.rotation.x` deltas multiply by `axisFlip`.
3. **Idle micro-head** — `head.rotation.x` jitter multiplies by `axisFlip` (Y unchanged).
4. **Follow-camera head pitch** (both the new `applyLookAt` integrator and the legacy `applyHeadFollowFromAngles` that's still on the path for non-camera sources):

```js
head.rotation.x += -axisFlip * idle.headPitchCur * (Math.PI / 180);
```

Yaw is unchanged — it already worked because `worldPointToHeadAngles` produces a yaw that's already in the world's "right means yaw>0" convention via `fz`, and rotating around the head bone's local Y is the same world-space rotation either way (Y axis is preserved).

### Verification

- **Headless math** — `node experiments/follow-camera-pitch-bone-axis.mjs` rotates a unit face vector through both versions' head.rotation.x with and without the flip. Without the flip the VRM 0 face.y has the OPPOSITE sign from VRM 1 (the bug). With the flip the signs match.
- **Unit tests** — 11 new cases in `tests/lookAt.test.js` cover `getBoneAxisFlip` (VRM 0 vs VRM 1 vs missing meta), the bone-rotation flip's X/Z-only behaviour, its idempotency under double-application, and a Rodrigues rotation test that confirms both versions' final face direction matches after the head pitch is applied. Total `npm test` is now 87 passing.
- **Browser** — `npm run dev` + `/anime-avatar/new/?view=editor`:
  1. Pick Alicia preset.
  2. Programmatically position camera at `(0, 4, 2)` (above + slightly in front).
     Before fix: top of head visible (face tilted DOWN). After fix: face tilted UP, eyes visible from the high angle.
  3. Camera at `(0, 0, 2)` (below). Before fix: face tilted UP (away from camera). After fix: face tilted DOWN, chin tucked, looking down at the low camera.
  4. Camera at `(2.5, 1.35, 0)` (model's right). Yaw still correct (PR #27 regression check).
  5. Same checks against the pixiv VRM 1 sample — head still pitches correctly (no regression).

### Reviewed for completeness

These call-sites in the studio use a humanoid bone's `rotation.x` or `.z` directly and now handle the VRM 0 mirror correctly:

- `apply.js` main bone loop (cfg + pose + gesture)
- `apply.js` idle breath (spine, chest)
- `apply.js` idle micro-head
- `apply.js` `applyLookAt` head bone update
- `apply.js` `applyHeadFollowFromAngles` (legacy code path)

Animations driven by an FBX `AnimationMixer` are exempt — the mixer owns those bones' rotations and our pose/gesture/follow code skips them when `animActive`. Mixamo retargeting (`animations.js`) writes raw rotations from FBX clips, which were already authored in the model's own coordinate frame — they don't need our flip and won't get one (the mixer path bypasses both the bone loop and the head-follow update).

### Screenshots (after the pitch fix)

- `docs/screenshots/issue-26/05-alicia-pitch-camera-above-AFTER-fix.png` — face tilts UP toward a camera at `(0, 4, 2)`.
- `docs/screenshots/issue-26/06-alicia-pitch-camera-below-AFTER-fix.png` — face tilts DOWN toward a camera at `(0, 0, 2)`.
- `docs/screenshots/issue-26/07-pixiv-pitch-camera-above-AFTER-fix.png` — VRM 1 regression check; pixiv still tilts UP correctly.
