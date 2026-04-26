# Case study: Issue #31 - Browser motion generation and GEAR-SONIC parity

> Issue: https://github.com/konard/anime-avatar/issues/31
>
> Prepared PR: https://github.com/konard/anime-avatar/pull/34
>
> Prior related PR: https://github.com/konard/anime-avatar/pull/32

## Summary

Issue #31 originally asked for an opt-in browser text-to-motion experiment for
the new avatar studio. A later owner comment broadened the target to cover the
main interaction ideas in the GEAR-SONIC demo: generated/reference motions,
mouse force on the body, a robot-model investigation, and an infinite floor grid
with styles. The implementation keeps the existing VRM/Three.js editor model and
adds browser-safe approximations that work across the anime VRM presets.

This branch extends the already-merged text-motion adapter with:

- GEAR-SONIC reference-prompt buttons and procedural mappings for squat, lunge,
  standing kick, macarena, and 360 spin walk.
- Planner metadata under `gearSonicPlanner`, while preserving the existing
  `gr00tPlanner` compatibility field.
- A switchable mouse-force layer that bends the VRM torso/head/limbs from a
  pointer drag and shows an in-scene force arrow.
- A switchable large floor grid with SONIC green, studio violet, and blueprint
  styles.
- Tests for the new prompt mappings, default-off controls, floor grid, and
  mouse-force deltas.

## Requirement inventory

| #   | Requirement                                                                 | Status in this branch                                                                                 |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| R1  | Generate animation in the browser from text commands.                       | Implemented through `gear-sonic-browser-adapter-v1` in `public/new/src/textMotion.js`.                |
| R2  | Fail when resources are insufficient and show available/required resources. | Existing resource checks preserved from PR #32.                                                       |
| R3  | Feature must be switchable and off by default.                              | Text motion, mouse force, and floor grid default to off.                                              |
| R4  | Support commands such as `walk` and `turn`.                                 | Existing walk/run/turn/wave mappings preserved.                                                       |
| R5  | Cover GEAR-SONIC reference animations.                                      | Added reference prompts for squat, kick, lunge, macarena, and spin walk.                              |
| R6  | Apply force on the body using mouse, switchable.                            | Added `mouseForceEnabled`, pointer drag state, force arrow, and procedural VRM body-force deltas.     |
| R7  | Make force applicable to all anime models.                                  | Implemented on VRM humanoid bones rather than model-specific meshes.                                  |
| R8  | Investigate/support the GEAR-SONIC robot model directly if feasible.        | Investigated. The demo robot is MJCF XML plus STL meshes, not VRM/GLB; direct loading remains a plan. |
| R9  | Add switchable infinite floor grid with different styles.                   | Added `floorGridEnabled`, `floorGridStyle`, and `floorGridSize`.                                      |
| R10 | Reuse demo libraries as much as practical.                                  | Reuses Three.js patterns. MuJoCo/ONNX remain documented follow-ups because the editor runtime is VRM. |
| R11 | Compile case-study data under `docs/case-studies/issue-31`.                 | This folder contains issue text, comments, research, requirements, and solution plans.                |

## GEAR-SONIC demo findings

The demo page at https://nvlabs.github.io/GEAR-SONIC/demo.html loads a Three.js
scene, local ONNX Runtime Web, MuJoCo WASM, `js/demo.js`, `js/viewer.js`, and
`js/policy.js`. Its UI exposes:

- Reference Motion list loaded from `assets/motions/index.json`.
- Text generation through a Kimodo backend, not a fully local browser model.
- Physics and policy toggles.
- Camera follow.
- Drag-to-push interaction on robot bodies.

The downloaded demo script shows these relevant implementation details:

- `viewer.loadScene()` fetches `assets/robot/scene.xml` and mesh files from
  `assets/robot/meshes/`, then builds a MuJoCo model in WASM memory.
- The visible floor uses a plane plus fine and coarse `THREE.GridHelper`
  overlays.
- Drag-to-push raycasts robot geoms, stores a local body anchor, and applies a
  spring force plus torque through MuJoCo `xfrc_applied`.
- The policy loader creates ONNX Runtime Web sessions for
  `assets/policy/model_encoder.onnx` and `assets/policy/model_decoder.onnx`,
  preferring WebGPU and falling back to WASM.

The reference motion index is preserved in
`docs/case-studies/issue-31/gear-sonic-motion-index.json` and contains these
public clip names:

| Display name    | Demo id                               | Frames | FPS |
| --------------- | ------------------------------------- | ------ | --- |
| Party Dance 1   | `dance_in_da_party_001__A464`         | 497    | 50  |
| Party Dance 2   | `dance_in_da_party_001__A464_M`       | 497    | 50  |
| Forward Lunge L | `forward_lunge_R_001__A359_M`         | 399    | 50  |
| Macarena 1      | `macarena_001__A545`                  | 1375   | 50  |
| Macarena 2      | `macarena_001__A545_M`                | 1375   | 50  |
| Standing Kick R | `neutral_kick_R_001__A543`            | 165    | 50  |
| Standing Kick L | `neutral_kick_R_001__A543_M`          | 165    | 50  |
| Squat           | `squat_001__A359`                     | 424    | 50  |
| Deep Lunge L    | `tired_forward_lunge_R_001__A359_M`   | 810    | 50  |
| One-Leg Jump R  | `tired_one_leg_jumping_R_001__A359`   | 500    | 50  |
| One-Leg Jump L  | `tired_one_leg_jumping_R_001__A359_M` | 500    | 50  |
| 360 Spin Walk 1 | `walking_quip_360_R_002__A428`        | 455    | 50  |
| 360 Spin Walk 2 | `walking_quip_360_R_002__A428_M`      | 455    | 50  |

## Solution plan by area

### Text and reference motion

The current practical solution is a browser adapter: parse short prompts into
planner-like intent and generate procedural VRM bone deltas. This avoids shipping
large native assets while keeping the UI and config surface ready for a real
ONNX/WebGPU planner.

Follow-up path: load a browser-compatible SONIC/GR00T ONNX artifact with ONNX
Runtime Web and retarget qpos/reference frames to VRM humanoid bones.

### Mouse force

The demo's true force model requires MuJoCo body IDs and `xfrc_applied`. The
VRM editor does not simulate rigid bodies, so this branch implements the same UX
idea as a procedural force layer: pointer drag near a humanoid bone bends the
torso/head/limbs, shifts the root slightly, and renders a force arrow. It stays
model-independent because it targets VRM humanoid bones.

Follow-up path: if the editor later hosts physics bodies, map pointer anchors to
colliders and apply physical impulses instead of animation deltas.

### Robot model

The demo robot is not a single VRM/GLB asset. It is MuJoCo MJCF XML plus mesh
files, loaded into a MuJoCo WASM virtual filesystem. Direct support would require
a new loader path, coordinate-system conversion, material handling, and clear
separation from VRM-only controls. This branch documents the asset format and
does not copy the robot model into the repo.

Follow-up path: add a "MuJoCo/MJCF scene" mode that can load `scene.xml` by URL
and rewrite relative mesh paths. Keep it separate from VRM editing.

### Floor grid

The demo uses `THREE.GridHelper` overlays, which fit this editor directly. This
branch adds an opt-in large grid that reads as infinite at normal avatar camera
distances and provides multiple styles.

## Test plan

Automated:

- `tests/textMotion.test.js` covers resource failure, legacy walk/turn mappings,
  GEAR-SONIC reference prompt mappings, and generated deltas for squat/kick.
- `tests/gearSonicControls.test.js` covers default-off controls and the pure
  mouse-force delta helper.
- `public/new/src/tests-registry.js` adds browser smoke tests for floor grid and
  mouse-force state.

Manual:

1. Open `/anime-avatar/new/?view=editor`.
2. Enable Text to Motion, click Squat/Kick/Lunge/Macarena/Spin Walk, then Run.
3. Enable Mouse force in Character and drag near the avatar body.
4. Enable Floor grid in Scene and switch grid styles.
5. Confirm all three features are disabled again after Reset all.

## Sources

- GEAR-SONIC demo: https://nvlabs.github.io/GEAR-SONIC/demo.html
- GEAR-SONIC demo controller: https://nvlabs.github.io/GEAR-SONIC/js/demo.js?v=2
- GEAR-SONIC viewer code: https://nvlabs.github.io/GEAR-SONIC/js/viewer.js
- GEAR-SONIC policy code: https://nvlabs.github.io/GEAR-SONIC/js/policy.js?v=2
- GEAR-SONIC reference motion index: https://nvlabs.github.io/GEAR-SONIC/assets/motions/index.json
- GR00T WBC documentation: https://nvlabs.github.io/GR00T-WholeBodyControl/
- Kinematic Planner ONNX Model Reference: https://nvlabs.github.io/GR00T-WholeBodyControl/references/planner_onnx.html
- ONNX Runtime Web JavaScript docs: https://onnxruntime.ai/docs/get-started/with-javascript/web.html
- ONNX Runtime WebGPU docs: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
