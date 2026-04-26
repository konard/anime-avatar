# Case study: Issue #31 - Browser motion generation and GEAR-SONIC parity

> Issue: https://github.com/konard/anime-avatar/issues/31
>
> Prepared PR: https://github.com/konard/anime-avatar/pull/35
>
> Prior related PRs: https://github.com/konard/anime-avatar/pull/32, https://github.com/konard/anime-avatar/pull/34

## Summary

Issue #31 originally asked for an opt-in browser text-to-motion experiment for
the new avatar studio. Two follow-up owner comments broadened the scope:

1. Cover the main interaction ideas in the GEAR-SONIC demo: generated/reference
   motions, mouse force on the body, the GEAR-SONIC robot model, and an
   infinite floor grid with multiple styles.
2. **No fake animations made by code.** Use the real GEAR-SONIC reference
   motion data (downloaded from URL, not copied), the real robot model
   (loaded from URL alongside our VRMs), and a real neural network for text
   generation. Everything must be configurable and switchable, not faked.

This PR addresses comment #2 by replacing the procedural-only path with a real
pipeline that fetches recorded motion clips and the G1 robot mesh directly from
the GEAR-SONIC demo URLs at run time, and adds a real text→motion HTTP backend
client. The procedural mappings remain only as a graceful fallback when the
fetches fail (e.g. CORS blocked, offline, or the user has not configured a
backend).

## Requirement inventory

| #   | Requirement                                                                 | Status in PR #35                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Generate animation in the browser from text commands.                       | Procedural fallback retained; **real generation** runs through `ACS_generateGearSonicMotion`, which POSTs to a configurable backend.                                                                                                                  |
| R2  | Fail when resources are insufficient and show available/required resources. | Existing resource detector preserved; backend failures and HTTP errors are surfaced verbatim in the editor status block.                                                                                                                              |
| R3  | Feature must be switchable and off by default.                              | Every new toggle (`gearSonicReferenceEnabled`, `gearSonicBackendEnabled`, `gearSonicRobotEnabled`) defaults to `false`.                                                                                                                               |
| R4  | Support commands such as `walk` and `turn`.                                 | Existing walk/run/turn/wave mappings preserved; reference clips are _also_ selectable directly by id.                                                                                                                                                 |
| R5  | Use the real GEAR-SONIC reference animations (not fake / not copied).       | New `gearSonic.js` fetches `assets/motions/<id>.json` from `nvlabs.github.io/GEAR-SONIC` (configurable base URL) and retargets the 29-DOF G1 angles to VRM bones.                                                                                     |
| R6  | Apply force on the body using mouse, switchable.                            | `mouseForceEnabled` toggle drives a procedural force layer (existing). Off by default.                                                                                                                                                                |
| R7  | Make force applicable to all anime models.                                  | Implemented on VRM humanoid bones rather than mesh-specific helpers.                                                                                                                                                                                  |
| R8  | Real GEAR-SONIC robot model, loaded by URL alongside the VRMs.              | New `ACS_loadGearSonicRobotModel` fetches `assets/robot/scene.xml` + the 36 STL meshes from the demo URL and rebuilds the bone tree in Three.js. Same time index drives both the VRM avatar and the robot.                                            |
| R9  | Add switchable infinite floor grid with different styles.                   | Existing `floorGridEnabled` + `floorGridStyle` (sonic / violet / blueprint).                                                                                                                                                                          |
| R10 | Reuse demo libraries / data as much as practical.                           | Reuses Three.js (`GridHelper`, `STLLoader`), the demo's published reference motion JSONs, and the demo's MJCF + STL robot assets.                                                                                                                     |
| R11 | Real neural network for text-to-motion (not procedural).                    | `ACS_generateGearSonicMotion` POSTs to a Kimodo-style `/api/generate` backend (the same shape the GEAR-SONIC demo uses). The hosted NVIDIA backend is private, so a backend URL must be supplied; the UI surfaces the missing-backend status clearly. |
| R12 | Compile case-study data under `docs/case-studies/issue-31`.                 | This folder contains issue text, comments, motion index, and this analysis.                                                                                                                                                                           |

## What changed in PR #35

```
public/new/index.html              import STLLoader; load gearSonic.js
public/new/src/gearSonic.js        new — real GEAR-SONIC fetcher / loader / backend client
public/new/src/defaults.js         new cfg keys for reference / backend / robot toggles
public/new/src/apply.js            stepTextMotion uses the fetched motion when available
public/new/src/Editor.jsx          new "GEAR-SONIC reference clips" / "backend" / "robot" sub-sections
tests/gearSonicReference.test.js   15 unit tests covering retarget + backend client
docs/case-studies/issue-31/        updated case study (this file)
```

## How the real reference motion path works

1. The user enables **Use real clip** under _Text to Motion → GEAR-SONIC
   reference clips_, optionally picks a specific clip id (otherwise the prompt
   resolves it via the existing reference table), and clicks _Run_.
2. `apply.js → stepTextMotion` notices the toggle, calls
   `ACS_fetchGearSonicReferenceMotion(id)`, and stores the result on
   `s.textMotion.motion`. Cache hits are instantaneous; misses fire one
   `fetch` against
   `${baseURL}/assets/motions/${id}.json`.
3. While the fetch is in flight the procedural delta keeps playing so the
   avatar never freezes. Once the JSON arrives, `ACS_gearSonicReferenceDelta`
   takes over: it linearly interpolates the 29-DOF `joint_pos` matrix between
   adjacent frames at the clip's native fps, normalises to the G1 stand pose
   (`policy.js → DEFAULT_ANGLES_MJ`), and routes each joint angle to the
   matching VRM bone via `G1_BONE_MAP`.
4. If a `s.gearSonicRobot` is also loaded (R8), the editor's per-frame tick
   calls `ACS_driveGearSonicRobot` with the same `(motion, t)` pair so the
   robot mirrors the avatar's pose.
5. If the fetch fails the status block reports the verbatim error
   (`GEAR-SONIC fetch failed: 403 Forbidden`, network error, etc.) and the
   procedural delta keeps playing — the user can disable the toggle to silence
   the message.

## How the real robot model path works

1. The user enables **Robot on** under _GEAR-SONIC robot model_. The editor's
   `useEffect` calls `ACS_loadGearSonicRobotModel(THREE, opts)` which:
   - fetches `${baseURL}/assets/robot/scene.xml` (a real MJCF document),
   - parses every `<mesh file="…STL"/>` element and fetches each STL from
     `${baseURL}/assets/robot/meshes/`,
   - builds a Three.js `Group` whose hierarchy mirrors the MJCF body tree.
2. We deliberately do **not** load MuJoCo WASM (12 MiB) — the visual
   hierarchy is enough to play recorded reference motions because the joint
   axes are encoded in `G1_BODY_DRIVE`. Physics simulation is a documented
   follow-up if we want full demo parity.
3. Progress (`Loading G1 meshes 18/36…`) is reported in the UI; failures
   bubble up verbatim. The robot is removed from the scene when the toggle
   is switched off.

## How the real text→motion backend path works

The GEAR-SONIC demo's text generator is **not** a browser model — it POSTs to
a Kimodo-hosted server that runs a diffusion model and returns the same JSON
shape as a reference motion. We mirror this in `ACS_generateGearSonicMotion`:

- `POST {backendURL}/api/generate` with
  `{prompt, duration, diffusion_steps}`.
- On success the response (`{joint_pos, root_pos, root_quat, fps, frames}`)
  is wrapped into a generated motion and pushed into the editor's playback
  state, so the avatar (and robot, if loaded) play the generated clip.
- On failure (no backend, HTTP error, network error, malformed payload) the
  result is surfaced through `gearSonicGenStatus` so the user can see what
  is missing.

The hosted demo backend is not freely accessible from arbitrary origins, so
the editor leaves the URL empty by default and shows
`No GEAR-SONIC text-to-motion backend configured. Set
ACS_GEAR_SONIC_BACKEND_URL to a Kimodo-compatible /api/generate endpoint.`
when the user clicks _Generate via backend_ without supplying one.

## GEAR-SONIC demo reference data

Demo page: https://nvlabs.github.io/GEAR-SONIC/demo.html

Asset URLs we now consume directly (no copy in this repo):

- `assets/motions/index.json` — motion catalogue (also embedded as
  `gear-sonic-motion-index.json` so the editor can list clips before the
  network call resolves).
- `assets/motions/<id>.json` — recorded clips. Schema:
  `{name, display, fps, frames, joint_pos[F][29], root_pos[F][3], root_quat[F][4]}`.
  `root_quat` is `[w,x,y,z]` in MuJoCo convention.
- `assets/robot/scene.xml` — MJCF for the Unitree G1 (29-DOF) body tree.
- `assets/robot/meshes/*.STL` — 36 binary STL link meshes (pelvis through
  rubber hands).

The reference motion catalogue contains the public clips listed in the
table below; full details remain in
`docs/case-studies/issue-31/gear-sonic-motion-index.json`.

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

## Test plan

Automated:

- `tests/gearSonicReference.test.js` — 15 unit tests covering the index
  catalogue, fetch + cache, retargeting onto VRM bones, frame looping,
  HTTP error handling, payload validation, and the backend client
  (no-backend / empty-prompt / OK / HTTP error / network error / custom
  base URL paths).
- `tests/textMotion.test.js`, `tests/gearSonicControls.test.js`,
  `tests/ipaSpeech.test.js` — existing coverage retained.
- `public/new/src/tests-registry.js` — browser smoke tests for the floor
  grid and mouse-force defaults retained.

Manual reproduction:

1. Open `/anime-avatar/new/?view=editor`.
2. _Scene → Floor grid_ — verify it draws a multi-style infinite-grid floor.
3. _Character → Mouse force_ — toggle on, click and drag inside the stage.
4. _Text to Motion → Enabled_ — type `walk` or pick a reference button, click
   _Run_. The procedural fallback should play immediately.
5. _Text to Motion → GEAR-SONIC reference clips → Use real clip_ — toggle on,
   confirm the status block shows
   `GEAR-SONIC: ready (reference) — Playing Squat (424 frames @ 50 fps)`.
6. _GEAR-SONIC robot model → Robot on_ — wait for the "Loading G1 meshes" status
   to finish, the G1 robot appears next to the VRM and shares the motion.
7. _GEAR-SONIC text→motion backend → Backend URL_ — set to your own server,
   toggle on, click _Generate via backend_, see the new clip play.
8. Click the _Reset all_ button: every new feature returns to off.

## Sources

- GEAR-SONIC demo: https://nvlabs.github.io/GEAR-SONIC/demo.html
- GEAR-SONIC demo controller: https://nvlabs.github.io/GEAR-SONIC/js/demo.js?v=2
- GEAR-SONIC viewer code: https://nvlabs.github.io/GEAR-SONIC/js/viewer.js
- GEAR-SONIC policy code: https://nvlabs.github.io/GEAR-SONIC/js/policy.js?v=2
- GEAR-SONIC reference motion index: https://nvlabs.github.io/GEAR-SONIC/assets/motions/index.json
- GEAR-SONIC robot scene XML: https://nvlabs.github.io/GEAR-SONIC/assets/robot/scene.xml
- GR00T WBC documentation: https://nvlabs.github.io/GR00T-WholeBodyControl/
- Kinematic Planner ONNX Model Reference: https://nvlabs.github.io/GR00T-WholeBodyControl/references/planner_onnx.html
- Three.js STLLoader: https://threejs.org/docs/#examples/en/loaders/STLLoader
- MJCF spec: https://mujoco.readthedocs.io/en/stable/XMLreference.html
