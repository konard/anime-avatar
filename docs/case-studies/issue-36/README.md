# Case study: Issue #36 — Text-to-model generation (TRELLIS) and a centralized multi-format model selector

> Issue: https://github.com/konard/anime-avatar/issues/36
>
> Prepared PR: https://github.com/konard/anime-avatar/pull/37
>
> Related prior PRs touching the model selector / studio: #32, #34, #35

## 1. Issue summary

The owner pasted a URL — `https://microsoft.github.io/TRELLIS.2` — and asked
for two things on top of it:

1. **Text-to-model generation** — let the avatar studio create new VRM (or
   "VRM-like") models from a text prompt, hooking into a TRELLIS / TRELLIS.2
   style backend.
2. **A centralized model selector** — today the studio's preset dropdown is
   VRM-only (`window.ACS_VRM_PRESETS` →
   `public/new/src/Editor.jsx:1014` "VRM Source"). Once the studio supports
   more formats (GLB, PLY, USDZ, gaussian splats), there should be a **single**
   selector that lets the user pick a model regardless of format, and a URL
   field that accepts any of the supported formats so users can paste their
   own.

There are no follow-up comments on the issue at the time of capture (`gh api
repos/konard/anime-avatar/issues/36/comments` returned `[]`).

## 2. What TRELLIS / TRELLIS.2 actually is

Sources:
- TRELLIS landing page: https://microsoft.github.io/TRELLIS/
- TRELLIS source: https://github.com/microsoft/TRELLIS
- TRELLIS.2 source: https://github.com/microsoft/TRELLIS.2
- TRELLIS.2 model card: https://huggingface.co/microsoft/TRELLIS.2-4B
- TRELLIS image-large model card: https://huggingface.co/microsoft/TRELLIS-image-large
- TRELLIS Hugging Face Space: https://huggingface.co/spaces/microsoft/TRELLIS
- TRELLIS.2 Hugging Face Space: https://huggingface.co/spaces/microsoft/TRELLIS.2
- Paper "Structured 3D Latents for Scalable and Versatile 3D Generation"
  (CVPR'25 spotlight): https://arxiv.org/abs/2412.01506
- NVIDIA NIM TRELLIS card: https://build.nvidia.com/microsoft/trellis/modelcard
- Trellis 3D AI hosted service: https://trellis3d.net/
- Trellis 2 hosted demo: https://trellis2.com/

Key facts that constrain the design:

| Fact                                                                                        | Source                                              | Impact on this issue                                                                                                                       |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| TRELLIS is a **server-side** model. Minimum 16 GB GPU (TRELLIS.2 needs 24 GB), Linux + CUDA. | TRELLIS README, TRELLIS.2-4B model card             | We **cannot** run inference in the browser. The studio needs an HTTP backend, exactly like issue #31's GEAR-SONIC text→motion pattern.    |
| TRELLIS.2 is **image-only**; only the original TRELLIS has text→3D variants.                | TRELLIS.2 README, TRELLIS-text-base / -large cards  | A pure text→model UI must hit the original TRELLIS text variants (or pipe text → image via DALL·E etc., then to TRELLIS.2).                |
| Output is a **mesh + PBR materials**, exported as **GLB** (and intermediate Gaussian/voxel). | TRELLIS.2 model card, TRELLIS landing page          | Output is **not VRM** — GLB has no humanoid bone map, no MToon, no spring bones. The studio needs to either render GLB directly or rig.    |
| TRELLIS / TRELLIS.2 weights and code are **MIT-licensed**.                                  | TRELLIS GitHub, TRELLIS.2-4B model card             | Free to integrate; submodules (e.g. `diff-gaussian-rasterization`) carry separate licences and only matter for self-hosting the backend.   |
| Hugging Face Inference API is **not** available for these models — only Spaces.             | TRELLIS-image-large card                            | Production calls go through `@gradio/client` against a (typically rate-limited) Space, or a self-hosted Gradio/FastAPI server, or NIM.     |
| The official Spaces are queue-based Gradio apps; CORS is permissive for the JS client.      | https://www.gradio.app/guides/getting-started-with-the-js-client | Browser → Space is feasible via `@gradio/client`, but the user must accept queue waits and shared GPU limits.            |

Implication: text→model is a **hosted backend feature** — exactly the same
shape as the GEAR-SONIC `/api/generate` integration the studio already
supports for text→motion (`public/new/src/gearSonic.js`).

## 3. Existing studio surface this issue extends

The avatar studio already has the building blocks:

| Concern                | Today                                                                                    | Reference                                            |
| ---------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Preset list            | `window.ACS_VRM_PRESETS` — id, label, url, credit, license, flipped, attributionRequired | `public/new/src/constants.js:349`                    |
| Selector UI            | `S.Select` "Preset" + `S.Row "URL"` + Local file (`.vrm,.glb,.gltf,.fbx`)               | `public/new/src/Editor.jsx:1014` "VRM Source"        |
| URL load               | `loadVRMFromURL(url)` → `ACS_normalizeModelURL` → `ACS_fetchVRMCached` → `loadVRMBuffer` | `public/new/src/Editor.jsx:478`                      |
| Buffer load            | `loadVRMBuffer(buf, name)` — `GLTFLoader` + `VRMLoaderPlugin`, fails with "No VRM extension in file" if the file is plain GLB | `public/new/src/Editor.jsx:349` |
| GitHub URL helper      | `ACS_normalizeModelURL` rewrites `github.com/.../blob/...` → `raw.githubusercontent.com` | `public/new/src/constants.js:373`                    |
| Animation preset list  | `window.ACS_ANIMATION_PRESETS` — same shape, used by `S.Section "Animation"`             | `public/new/src/constants.js:319`                    |
| Robot preset (issue #31) | `ACS_loadGearSonicRobotModel` — mesh-only model loaded by URL, lives next to the VRM   | `public/new/src/gearSonic.js`                        |
| Backend client pattern | `ACS_generateGearSonicMotion(prompt, {backendURL, …})` — POST `/api/generate`, surface error verbatim, never fake | `public/new/src/gearSonic.js` |

Three observations matter:

1. **Loader is hard-wired to VRM.** `loadVRMBuffer` throws `'No VRM extension
   in file'` when the GLB has no `VRMC_*` extension. To accept generic
   GLB/PLY we have to branch on file type.
2. **Selector is a flat list.** A unified selector needs to surface the
   underlying format so the user knows what they're picking, and so the
   loader can dispatch.
3. **Backend wiring exists.** The GEAR-SONIC / Kimodo text-to-motion path is
   the template: configurable backend URL, off by default, surfacing
   `ok/status/reason` shapes verbatim — never faking results.

## 4. Requirement inventory

| #   | Requirement                                                                              | Where it comes from                | Notes                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Support **text→model** generation via TRELLIS / TRELLIS.2.                               | Issue body sentence 1              | Must be off-by-default and configurable, mirroring the issue #31 backend pattern.                                                                                        |
| R2  | Be honest when generation cannot run — never fake a result.                              | Repo precedent (issue #31, PR #35) | Surface verbatim error: missing backend URL, HTTP error, queue timeout, GPU OOM.                                                                                          |
| R3  | Be **switchable and off by default**, applicable to all anime models.                    | Repo precedent                     | Existing `gearSonic*Enabled` toggles set the bar.                                                                                                                        |
| R4  | One **centralized model selector** instead of separate VRM / robot dropdowns.            | Issue body sentence 2              | Single `<select>` listing every model regardless of format. Picking an item resolves into the right loader internally.                                                   |
| R5  | The selector must support **multiple formats by URL** (VRM, GLB, glTF, FBX, PLY, …).     | Issue body sentence 2              | URL field must accept any of those extensions; format detected from extension or HTTP `Content-Type`.                                                                    |
| R6  | Must be **easy to use** — UX parity with current VRM picker.                             | Issue body sentence 2              | Keep "Preset / URL / Local file" pattern; show format and license in the dropdown row.                                                                                    |
| R7  | Compile case-study data under `docs/case-studies/issue-36`.                              | Issue body paragraph 3             | This document; also `issue-body.md`, `issue-body.json`, `issue-comments.json`.                                                                                            |
| R8  | Search online for additional facts and check existing components/libraries.              | Issue body paragraph 3             | Done in §2 (TRELLIS) and §6 (libraries).                                                                                                                                  |

## 5. Format support matrix

| Format       | Has skeleton/rig? | Loadable in browser today                     | Animation source                       | Selector behaviour                                                          |
| ------------ | ----------------- | --------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| **VRM 0.x**  | Yes (humanoid)    | `GLTFLoader` + `VRMLoaderPlugin`              | Mixamo FBX, GEAR-SONIC, gestures       | Existing `loadVRMBuffer` path                                              |
| **VRM 1.0**  | Yes (humanoid)    | `GLTFLoader` + `VRMLoaderPlugin`              | Mixamo FBX, GEAR-SONIC, gestures       | Existing `loadVRMBuffer` path                                              |
| **GLB / glTF** with skin | Possibly | `GLTFLoader` only                             | Embedded clips; bone-map heuristic     | New: load as `gltf.scene`, render directly. No VRM features (expressions). |
| **GLB / glTF** mesh-only | No       | `GLTFLoader` only                             | None unless re-rigged                  | New: load as static prop. Disable expression / pose UI.                    |
| **FBX**      | Maybe (Mixamo)    | `FBXLoader`                                   | Embedded                                | Existing path is **animation-only**; treat as model when no VRM is loaded.  |
| **PLY** (mesh) | No              | `PLYLoader` (three.js addon)                  | None                                   | Static prop. Common output of TRELLIS pre-mesh extraction.                  |
| **PLY** (gaussian splat) | n/a   | Needs a third-party splat renderer (e.g. `@mkkellogg/gaussian-splats-3d`) | n/a            | Optional; keep for follow-up issue.                                         |
| **USDZ**     | Sometimes         | Three.js `USDZLoader` (experimental)          | Limited                                 | Optional; keep for follow-up.                                               |
| **OBJ**      | No                | `OBJLoader`                                   | None                                   | Static prop.                                                                |

The minimum to honour R5 without scope creep is **VRM + GLB/glTF + FBX +
PLY (mesh) + OBJ**, all of which ship with three.js core/addons (already
loaded in `public/new/index.html`).

## 6. Existing libraries and components we should reuse

| Need                                | Library                                                                                  | Why it fits                                                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GLB/glTF parsing                    | `three/addons/loaders/GLTFLoader.js`                                                     | Already imported (`public/new/index.html:38`).                                                                                              |
| VRM parsing                         | `@pixiv/three-vrm` `VRMLoaderPlugin`                                                     | Already imported. Re-use as a parser plugin only when the file actually has `VRMC_*` extension.                                              |
| FBX parsing                         | `three/addons/loaders/FBXLoader.js`                                                      | Already imported.                                                                                                                          |
| PLY parsing                         | `three/addons/loaders/PLYLoader.js`                                                      | Three.js core addon — same CDN bundle. ([three-vrm rendering guide](https://threejs.org/docs/#examples/en/loaders/PLYLoader))               |
| OBJ parsing                         | `three/addons/loaders/OBJLoader.js`                                                      | Three.js core addon.                                                                                                                       |
| GLB → VRM auto-rig (optional R5+)   | `gltf2vrm` (https://github.com/JustinBenito/gltf2vrm)                                    | Browser-side bone mapping; fits TRELLIS GLB output if we want to drive expressions/poses on it. Treat as nice-to-have follow-up.            |
| Hugging Face Space client           | `@gradio/client` (https://www.gradio.app/docs/js-client)                                 | Browser-friendly, handles queue + token auth. Used to call `microsoft/TRELLIS` or `microsoft/TRELLIS.2` Spaces directly.                     |
| TRELLIS production endpoint         | NVIDIA NIM TRELLIS (https://build.nvidia.com/microsoft/trellis/modelcard)                | Authenticated alternative to public Spaces; documented endpoint.                                                                            |
| Self-host backend reference         | TRELLIS / TRELLIS.2 `app.py` Gradio file                                                 | Can be wrapped behind FastAPI to expose `POST /api/generate` returning `{glbUrl}` or a binary GLB.                                          |
| Gaussian splat viewer (optional)    | `@mkkellogg/gaussian-splats-3d` or `three.js` ports of `gsplat.js`                       | Defer until issue explicitly asks for it.                                                                                                  |
| Existing repo pattern               | `public/new/src/gearSonic.js` (text→motion backend client)                               | Same shape: configurable URL, off by default, error surfacing.                                                                              |

## 7. Solution plan per requirement

### R1 + R2 + R3 — Text-to-model backend integration

Mirror the GEAR-SONIC text→motion architecture. New module
`public/new/src/textToModel.js` exposing:

```js
window.ACS_DEFAULT_TEXT_TO_MODEL_BACKEND_URL = '';     // empty by default
window.ACS_TEXT_TO_MODEL_PROVIDERS = [
  { id: 'trellis-text',      label: 'TRELLIS text→3D (Microsoft, MIT)',
    endpoint: 'POST {backendURL}/api/generate',
    inputs: ['prompt'], output: 'glb',
    credit: 'Microsoft Research', license: 'MIT' },
  { id: 'trellis-image',     label: 'TRELLIS.2 image→3D (Microsoft, MIT)',
    endpoint: 'POST {backendURL}/api/generate',
    inputs: ['imageUrl'], output: 'glb',
    credit: 'Microsoft Research', license: 'MIT' },
  { id: 'gradio-space',      label: 'Hugging Face Gradio Space (URL configurable)',
    transport: '@gradio/client', inputs: ['prompt'], output: 'glb' },
  { id: 'nvidia-nim-trellis', label: 'NVIDIA NIM TRELLIS',
    endpoint: 'POST {backendURL}/v1/...', inputs: ['imageUrl'], output: 'glb' },
];

window.ACS_generateModelFromText = async function(prompt, opts) {
  // POSTs to opts.backendURL || ACS_DEFAULT_TEXT_TO_MODEL_BACKEND_URL.
  // Returns { ok, status: 'no-backend' | 'http-error' | 'ok',
  //           reason, glbBlob, glbUrl, format, frames? }.
  // NEVER fakes a result. Empty backendURL → status='no-backend'.
};
```

Editor.jsx exposes a new `S.Section "Text to Model"` mirroring the
existing `S.Section "Text to Motion"`:

- Toggle `textToModelEnabled` (default `false`).
- `<input>` for prompt + `<button>Generate</button>`.
- Provider `<Select>` from `ACS_TEXT_TO_MODEL_PROVIDERS`.
- Backend URL `<input>` (saved into cfg, persisted via `exportCfg`).
- Status block with verbatim error / queue position / `Generated X.glb
  (4.2 MB) — 12.4 s`.

`cfg` keys (added to `defaults.js`, all `false`/`''` by default):

```js
textToModelEnabled: false,
textToModelProviderId: 'trellis-text',
textToModelBackendURL: '',
textToModelPrompt: '',
textToModelLastResultURL: '',   // populated after a successful run
```

When generation succeeds, the resulting GLB is loaded through the new
unified loader (R4) so it shows up in the same scene as the VRM.

### R4 + R5 + R6 — Centralized multi-format model selector

#### Data model

Replace `ACS_VRM_PRESETS` with `ACS_MODEL_PRESETS` (a superset). Keep
the old name as an alias for backwards compatibility:

```js
window.ACS_MODEL_PRESETS = [
  // Existing humanoids
  { id:'pixiv',   label:'pixiv VRM1 sample', url:'…', format:'vrm',
                  kind:'humanoid', credit:'pixiv Inc.', license:'VRM Public License 1.0' },
  { id:'alicia',  label:'Alicia Solid',       url:'…', format:'vrm',
                  kind:'humanoid', flipped:true, attributionRequired:true,
                  credit:'© DWANGO', license:'Niconi Commons Attribution' },
  { id:'seed',    label:'Seed-san',           url:'…', format:'vrm',
                  kind:'humanoid', credit:'VirtualCast',  license:'VRM Public License 1.0' },
  { id:'vsekai',  label:'three-vrm girl 1.0β',url:'…', format:'vrm',
                  kind:'humanoid', credit:'V-Sekai community', license:'See repository' },

  // GEAR-SONIC robot, currently loaded separately (PR #35).
  { id:'g1-robot', label:'Unitree G1 (GEAR-SONIC demo)',
                   url:'https://nvlabs.github.io/GEAR-SONIC/assets/robot/scene.xml',
                   format:'mjcf', kind:'robot',
                   credit:'NVIDIA / Unitree', license:'See demo' },

  // TRELLIS / community samples (placeholder slots — populate when assets land).
  { id:'trellis-sample-glb', label:'TRELLIS sample (image→GLB)',
                   url:'https://example/trellis-sample.glb',
                   format:'glb', kind:'prop',
                   credit:'Microsoft Research', license:'MIT' },
];
window.ACS_VRM_PRESETS = window.ACS_MODEL_PRESETS.filter(p => p.format === 'vrm');
```

#### Loader dispatcher

New `public/new/src/modelLoader.js`:

```js
window.ACS_detectModelFormat = function(url, contentType, hint) {
  if (hint) return hint;                                // explicit beats sniffing
  const ext = (url.split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
  if (ext === 'vrm')             return 'vrm';
  if (ext === 'glb' || ext === 'gltf') return 'glb';
  if (ext === 'fbx')             return 'fbx';
  if (ext === 'ply')             return 'ply';
  if (ext === 'obj')             return 'obj';
  if (ext === 'xml' && /scene\.xml$/i.test(url)) return 'mjcf';
  if (contentType?.includes('model/gltf-binary')) return 'glb';
  if (contentType?.includes('application/octet-stream')) return 'glb'; // best-effort
  throw new Error(`Unknown model format for ${url}`);
};

window.ACS_loadModelFromURL = async function(url, opts) {
  const fmt  = ACS_detectModelFormat(url, null, opts?.format);
  const buf  = await fetch(ACS_normalizeModelURL(url)).then(r => r.arrayBuffer());
  switch (fmt) {
    case 'vrm':  return loadVRMBuffer(buf, url, opts);   // existing path
    case 'glb':  return loadGLBBuffer(buf, url, opts);   // new (no VRMLoaderPlugin)
    case 'fbx':  return loadFBXBuffer(buf, url, opts);
    case 'ply':  return loadPLYBuffer(buf, url, opts);
    case 'obj':  return loadOBJBuffer(buf, url, opts);
    case 'mjcf': return ACS_loadGearSonicRobotModel(opts.THREE, { sceneURL: url });
  }
};
```

`loadGLBBuffer` is `loadVRMBuffer` minus the `VRMLoaderPlugin.register`
call and the `'No VRM extension in file'` throw — the resulting
`gltf.scene` is added to the same parent group, but expression / humanoid
/ spring features are skipped. The Editor's bone/expression panels switch
to a "no humanoid bones detected" state so the UI degrades gracefully.

#### Selector UI

Replace the current `S.Section "VRM Source"` with `S.Section "Model"`:

```jsx
<S.Section title="Model" testid="io">
  <S.Row label="Preset">
    <S.Select testid="model-preset" value={cfg.modelPresetId}
      onChange={onPresetChange}
      options={ACS_MODEL_PRESETS.map(p => ({
        value: p.id, label: `${p.label}  ·  ${p.format.toUpperCase()}`
      }))} />
  </S.Row>
  <S.Row label="URL">
    <input data-testid="url-input" value={urlInput}
           placeholder="paste any .vrm / .glb / .fbx / .ply / .obj URL" />
    <button data-testid="url-load">Load</button>
  </S.Row>
  <S.Row label="Local file">
    <input type="file" accept=".vrm,.glb,.gltf,.fbx,.ply,.obj" />
  </S.Row>
  <S.Row label="Generate">
    {/* opens the Text-to-Model section pre-focused */}
  </S.Row>
</S.Section>
```

The label suffix (`· VRM`, `· GLB`, …) makes the format obvious without
adding a second column. Any old `vrmPreset` / `vrmUrl` value in user
configs is migrated transparently — `defaults.js` accepts both keys
during a transition window and the new code reads
`cfg.modelPresetId || cfg.vrmPreset` and `cfg.modelUrl || cfg.vrmUrl`.

#### Mode-aware UI

Sections that only make sense for VRM humanoids (Expressions, Pose,
Spring bones, FBX retarget) are wrapped in:

```jsx
{stateRef.current?.modelKind === 'humanoid' && (
  <S.Section title="Expressions">…</S.Section>
)}
```

so loading a GLB prop simply hides them.

### R7 — Case-study folder

This file plus the captured `issue-body.md`, `issue-body.json`, and the
empty `issue-comments.json` already live in
`docs/case-studies/issue-36/`. When the implementation PR adds verified
screenshots they go under `docs/case-studies/issue-36/screenshots/`,
mirroring issue-31.

### R8 — Surveyed libraries

Done — see §6.

## 8. Risks and open questions

| Risk                                                                            | Mitigation                                                                                                                                                            |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TRELLIS Hugging Face Spaces are queue-based and rate-limited.                   | Default backend URL is empty; the user supplies their own (Space, NIM, or self-hosted). Surface queue position from `@gradio/client`.                                  |
| TRELLIS output is a generic GLB without humanoid bones.                         | Render directly via the new `loadGLBBuffer` path; Expressions / Pose UI is mode-gated. Auto-rig to VRM is documented as follow-up using `gltf2vrm`.                    |
| TRELLIS.2 has no text branch — only image-to-3D.                                | Provider list separates `trellis-text` (orig TRELLIS) from `trellis-image` (TRELLIS.2). The UI hides the prompt / image fields based on the provider's `inputs`.       |
| GLB content-type sniffing fails behind some CDNs.                               | `ACS_detectModelFormat` falls back to URL extension; users can also set `format` explicitly per preset.                                                               |
| Some FBX files look like animations, not models — backwards compat risk.         | Keep the existing `S.Section "Animation"` FBX path. The model selector only treats an FBX as a *model* when no VRM is currently loaded (preserves drag-drop semantic). |
| Backwards compatibility for existing `vrmPreset` / `vrmUrl` cfg keys.           | Read both, write both during a transition release. New tests assert the migration.                                                                                    |
| Some browsers block large generated GLBs in object URLs (CSP).                   | Stream the response into an in-memory `ArrayBuffer`; `loadGLBBuffer` works on the buffer directly, no `URL.createObjectURL` round-trip needed.                          |
| TRELLIS "non-commercial" carve-outs in older variants.                           | The flagship MIT-licensed releases (TRELLIS, TRELLIS.2) are fine. Surface the per-provider licence string in the UI status block, same way the VRM meta licence is.    |

## 9. Suggested test plan for the implementation PR

Automated (jsdom):

- `tests/modelLoader.test.js` — `ACS_detectModelFormat` cases (vrm, glb,
  gltf, fbx, ply, obj, mjcf, query strings, content-type fallback,
  unknown).
- `tests/modelLoader.test.js` — dispatcher routes to the right loader,
  surfaces `'No VRM extension in file'` only for `format: 'vrm'`.
- `tests/textToModel.test.js` — `ACS_generateModelFromText`:
  no-backend → `{ ok:false, status:'no-backend' }`; HTTP 500 → status
  surfaced verbatim; OK path returns the GLB blob.
- `tests/modelPresets.test.js` — every entry has `format`, label,
  `kind`; `ACS_VRM_PRESETS` alias filters VRM only.
- `tests/migration.test.js` — old `cfg.vrmPreset` / `cfg.vrmUrl` are
  honoured when the new keys are missing.

Manual reproduction (browser):

1. Open `/anime-avatar/new/?view=editor`.
2. _Model → Preset_ — pick `Alicia Solid`, then `Unitree G1`. Both load
   in the same selector with their format suffix.
3. _Model → URL_ — paste a public Sketchfab GLB URL, click _Load_, the
   prop appears (no humanoid panels).
4. _Text to Model → Enabled_ — switch on, leave backend URL blank,
   prompt `cyberpunk catgirl`, click _Generate_. Status reads
   `No text-to-model backend configured…`. No fake model appears.
5. _Text to Model → Backend URL_ — paste a self-hosted TRELLIS endpoint,
   click _Generate_, confirm the resulting GLB appears in the scene and
   the previous VRM is replaced (or kept side-by-side if the future
   "scene with multiple models" feature is in scope).
6. _Reset all_ — every new toggle returns to off, selector returns to
   the previous default VRM.

## 10. Sources (full list)

- TRELLIS landing: https://microsoft.github.io/TRELLIS/
- TRELLIS source: https://github.com/microsoft/TRELLIS
- TRELLIS.2 source: https://github.com/microsoft/TRELLIS.2
- TRELLIS.2 model card: https://huggingface.co/microsoft/TRELLIS.2-4B
- TRELLIS image-large card: https://huggingface.co/microsoft/TRELLIS-image-large
- TRELLIS Space: https://huggingface.co/spaces/microsoft/TRELLIS
- TRELLIS.2 Space: https://huggingface.co/spaces/microsoft/TRELLIS.2
- Trellis 3D AI: https://trellis3d.net/
- Trellis 2 demo: https://trellis2.com/
- NVIDIA NIM TRELLIS: https://build.nvidia.com/microsoft/trellis/modelcard
- Paper: https://arxiv.org/abs/2412.01506
- Hugging Face Spaces API guide: https://huggingface.co/docs/hub/en/spaces-api-endpoints
- Gradio JS client: https://www.gradio.app/docs/js-client
- three.js loaders index: https://threejs.org/manual/en/loading-3d-models.html
- three.js PLYLoader: https://threejs.org/docs/#examples/en/loaders/PLYLoader
- @pixiv/three-vrm: https://github.com/pixiv/three-vrm
- gltf2vrm: https://github.com/JustinBenito/gltf2vrm
- VRM is GLB + extensions: https://www.deviantart.com/moorbs/journal/VRoid-Studio-to-PMX-Tutorial-757935932
- Avaturn GLB→VRM doc: https://docs.avaturn.me/docs/importing/glb-to-vrm/
- Repo precedent (issue #31 case study): ../issue-31/README.md
