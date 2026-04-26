# Case study: Issue #31 - Text-to-motion for avatar studio

> Source: https://github.com/konard/anime-avatar/issues/31
>
> PR: https://github.com/konard/anime-avatar/pull/32

## Summary

Issue #31 asks for an experimental text-to-motion control in the new avatar
studio (`public/new/`). The user should be able to enable the feature, type a
short motion prompt such as `walk` or `turn`, see the browser resources
available versus required, and get generated movement in the scene. The issue
also asks for a case-study folder with requirements, research, and solution
plans.

The implementation in this PR lands the browser integration surface now:

- A local `gr00t-browser-adapter-v0` text-motion module parses short commands.
- The parser emits GR00T-style planner intent data: mode, movement direction,
  and facing direction.
- The current runtime turns that intent into procedural VRM bone/root deltas,
  layered through the existing `apply.js` animation stack.
- The editor gets an opt-in Text to Motion section with a toggle, prompt box,
  Run/Stop controls, runtime status, and resource budget display.

This is not a full GR00T ONNX model port. It is the browser-side adapter and
UX required to safely host one later. The current public GR00T WBC docs describe
deployment through Python/C++/TensorRT/CUDA and fixed ONNX planner tensors, not
a browser-ready text model.

## Requirements

| #   | Requirement                                                                         | Status                                                                            |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| R1  | Add a simple experimental text-to-motion feature to the new avatar studio.          | Implemented in `public/new/src/textMotion.js` and `Editor.jsx`.                   |
| R2  | Use a model running in the browser.                                                 | Implemented as local browser adapter `gr00t-browser-adapter-v0`; no server calls. |
| R3  | Fail on devices without enough resources.                                           | Implemented resource evaluation before plan creation.                             |
| R4  | Always show available and required resources.                                       | Implemented in the Text to Motion panel.                                          |
| R5  | Add a switch to turn the feature on/off.                                            | Implemented as `textMotionEnabled`.                                               |
| R6  | Add a small text area where the user can type `walk`, `turn`, and similar commands. | Implemented as `textMotionPrompt`.                                                |
| R7  | Generate animation in the virtual world/scene.                                      | Implemented as procedural full-body/root deltas layered into `apply.js`.          |
| R8  | Compile issue data and case-study analysis under `docs/case-studies/issue-31`.      | Implemented in this folder.                                                       |

## Research

### GR00T Whole-Body Control

The official `NVlabs/GR00T-WholeBodyControl` repository describes a platform
for humanoid whole-body control with a C++ inference stack and SONIC training
stack. Its setup requires Git LFS because large binary assets, including ONNX
models, are stored outside normal Git blobs.

The GR00T WBC documentation describes several relevant ideas:

- The kinematic planner takes current robot state and high-level navigation
  commands, then outputs future whole-body MuJoCo `qpos` frames.
- The documented primary ONNX planner inputs include `context_mujoco_qpos`,
  `target_vel`, `mode`, `movement_direction`, `facing_direction`, and `height`.
- The planner operates in MuJoCo's Z-up coordinate system, with X forward,
  Y left, and Z up.
- The documented deployment path runs a planner thread at 10 Hz and uses
  TensorRT/CUDA graph capture in the native stack.
- Keyboard planner controls map the same user intent we need in the studio:
  slow walk, walk, run, forward/backward, turn left/right, and styled walking.

Implication: the browser UI should store text prompts and planner-like intent,
but a real GR00T planner swap-in needs an ONNX/WebGPU model artifact plus a
VRM-to-G1/SMPL retargeting bridge.

### Browser inference options

ONNX Runtime Web is the best fit for a future ONNX planner in-browser path.
Official docs describe WebGPU as a browser execution provider for heavier
compute and WebAssembly as the smaller default path. They also document that
WebGPU support is experimental and browser-dependent.

Transformers.js is relevant for future text understanding, but the current
issue only requires short imperative commands like `walk` and `turn`. A small
local parser is safer for the first PR because it avoids a large language model
download before the motion planner itself exists.

## Solution Options

### Option A - Browser adapter now, ONNX planner later

Implement a local parser and procedural motion generator behind the same cfg
surface that a real planner will use later.

Pros:

- Works now without shipping huge binary assets.
- Keeps all computation in the browser.
- Can fail fast on weak browsers/devices.
- Gives reviewers the final UI shape and cfg keys.

Cons:

- Motion is procedural, not a real GR00T policy/planner output.

This PR uses Option A.

### Option B - Direct ONNX Runtime Web integration

Load a browser-compatible GR00T planner `.onnx` with ONNX Runtime Web and
WebGPU, feed planner tensors, and retarget output frames to VRM bones.

Pros:

- Closest to the issue's GR00T target.

Cons:

- Needs a browser-suitable model artifact, model hosting, tensor validation,
  qpos-to-VRM retargeting, memory/download policy, and graceful fallback.
- Current GR00T docs focus on native TensorRT/CUDA deployment, not browser
  runtime constraints.

Recommended follow-up after a model artifact is chosen.

### Option C - Server-side GR00T

Run GR00T WBC native stack on a server and stream animation frames to the
studio.

Pros:

- Reuses the native deployment path more directly.

Cons:

- Violates the issue requirement that the model run in-browser.

Not selected.

## Implementation Notes

New cfg keys:

- `textMotionEnabled`
- `textMotionPrompt`
- `textMotionNonce`
- `textMotionModel`

Runtime flow:

1. The editor toggles `textMotionEnabled` and bumps `textMotionNonce` on Run.
2. `ACS_createTextMotionPlan()` checks resources and parses the prompt.
3. The plan carries GR00T-style modes and direction tensors for traceability.
4. `ACS_textMotionDelta()` emits per-frame VRM bone/root deltas.
5. `ACS_applyAll()` layers these deltas with pose, gestures, expressions, and
   the existing anatomical clamps.
6. `ACS_probe()` exposes text-motion state for tests.

## Test Plan

Automated:

- `tests/textMotion.test.js` verifies resource failure, command parsing,
  planner-intent mapping, walk deltas, turn yaw, and unsupported prompts.
- `public/new/src/tests-registry.js` adds in-browser smoke coverage for the
  resource report, GR00T-style plan mapping, and live walk animation.

Manual:

1. Open `/anime-avatar/new/?view=editor`.
2. Enable Text to Motion.
3. Type `walk`, click Run, and observe leg swing/root bob.
4. Type `turn left`, click Run, and observe turn-in-place body/root yaw.
5. Inspect the Text to Motion status panel for available and required resource
   values.

## Sources

- GR00T Whole-Body Control repository: https://github.com/NVlabs/GR00T-WholeBodyControl
- GR00T WBC documentation: https://nvlabs.github.io/GR00T-WholeBodyControl/
- Kinematic Planner ONNX Model Reference: https://nvlabs.github.io/GR00T-WholeBodyControl/references/planner_onnx.html
- Keyboard planner controls: https://nvlabs.github.io/GR00T-WholeBodyControl/tutorials/keyboard.html
- Motion reference data: https://nvlabs.github.io/GR00T-WholeBodyControl/references/motion_reference.html
- ONNX Runtime WebGPU docs: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
- ONNX Runtime Web JavaScript docs: https://onnxruntime.ai/docs/get-started/with-javascript/web.html
- Transformers.js WebGPU overview: https://huggingface.co/blog/transformersjs-v3
