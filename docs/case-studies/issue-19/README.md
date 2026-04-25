# Case study: Issue #19 — New avatar studio issues

> Source: https://github.com/konard/anime-avatar/issues/19

## Timeline

- **2026-04-22** — Issue #19 opened by @konard listing eight separate user-visible problems with the new avatar studio at `/new`. A follow-up comment added a ninth requirement (auto-convert GitHub blob/raw URLs for FBX as well).
- **2026-04-22** — PR #20 opened (draft) on branch `issue-19-83a0493ae64c` to track the AI-driven solution.
- **2026-04-23 & 2026-04-25** — AI work sessions executed; this branch carries the fix set described below.

## Reproductions

The studio code lives entirely under `public/new/src/` and is loaded as a static React-via-CDN single-page app (see `public/new/index.html` + `vite.config.js`). All reproductions below assume `npm run dev` and a browser pointed at `/new`.

### R1 — Alicia Solid faces away from the camera

1. Open `/new`.
2. In **VRM Source → Preset**, pick `Alicia Solid (Dwango / Nikoni Commons)`.
3. Observe: the model loads with its back to the camera (we see the back of the head and dress).

The other shipped presets (pixiv VRM1, Seed-san) load facing the camera correctly, so this is per-model.

### R2 — `github.com/.../blob/...` URL fails to load

1. Open the URL field in **VRM Source**.
2. Paste `https://github.com/V-Sekai/three-vrm-1-sandbox-mixamo/blob/master/three-vrm-girl-1.0-beta.vrm`.
3. Click **Load**. Observe: a loading error overlay (HTML returned instead of binary, parser fails).

Same for `.fbx` URLs from GitHub blob/raw URLs (see Konstantin's issue comment).

### R3 — Loading error overlay never goes away

1. In the URL box paste any non-existent URL (e.g. `https://example.com/no.vrm`).
2. Click **Load**. The "Error: …" overlay appears and remains until the user successfully loads another VRM.

### R4 — Tests auto-run on view open / page load

1. Open `/new?view=tests` in a browser.
2. The tests start running immediately, with no chance to stop before the first one fires.
3. Stop button does nothing once running tests begin (the in-flight test still completes synchronously, and `stopRef.current` is read only between iterations — but more importantly the user perceives "Stop is dead").
4. The list jumps to the bottom on every test status update so the user cannot scroll up to inspect a failure.

### R5 — Split view shows on mobile

On a 360-wide viewport (`/new?view=split`), the split view tries to render both panes side-by-side and produces a cramped layout.

### R6 — Editor / Tests on mobile show their own internal title

`Editor` drawer and `Tests` panel both render their own title row. On mobile that's redundant given the top toolbar already labels the active pane.

### R7 — Copyright always shown

`AttributionOverlay` renders whenever any credit is found, regardless of whether the VRM 1.0 `creditNotation` is `unnecessary` or whether the file is CC0/public-domain.

### R8 — FBX metadata never shown

`AnimationMetaView` only knows about preset/url labels and the runtime clip duration. The FBX itself contains a `Documents` section with creator, software, etc. that we do not surface anywhere.

## Requirements (from the issue + comment)

| #   | Requirement                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Alicia Solid model is loaded back-facing. Add a per-preset "flipped" / `baseYaw` configuration; default it for Alicia.                                                                                                         |
| R2  | `https://github.com/<o>/<r>/blob/<rev>/<path>` and `…/raw/refs/heads/<rev>/<path>` URLs (for both `.vrm` and `.fbx`) must be auto-rewritten to a downloadable raw URL. Once a working raw URL is found, add it to the presets. |
| R3  | The loading-error overlay must auto-hide after a timeout.                                                                                                                                                                      |
| R4  | Tests view must not auto-run on open or after page refresh. The Stop button must actually stop the run. The progress list must be scrollable without the auto-bottom snap fighting the user.                                   |
| R5  | Split view must not show on mobile.                                                                                                                                                                                            |
| R6  | On mobile, Editor and Tests should be full-screen with no internal title (the top buttons label them).                                                                                                                         |
| R7  | Copyright is shown only when VRM/FBX metadata enforces it (VRM 1.0 `creditNotation === 'required'` or VRM 0.x CC-BY-style licences, or preset-level `attributionRequired: true`).                                              |
| R8  | If the FBX has metadata (FBX `Documents.Properties70` / loader `userData`), display it at the end of the animation panel like the VRM meta view.                                                                               |

## Root causes

| #   | Root cause                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `loadVRMBuffer` calls `VRMUtils.rotateVRM0` (which only rotates models tagged as VRM 0.x) and then sets `vrm.scene.rotation.y = 0`. Inside the per-frame tick, the `else` branch of `c.autoRotate` sets `s.vrm.scene.rotation.y = 0` _every frame_, clobbering any one-time bake. So even when we know Alicia needs a Y-rotation we cannot persist it.                                                                                                               |
| R2  | We pass the URL the user typed straight into `fetch`. GitHub returns the HTML of the blob page, which then fails GLB / FBX parsing with a generic error.                                                                                                                                                                                                                                                                                                             |
| R3  | The error overlay reads `status === 'error'`. Nothing transitions back to `'loaded'` or any other state without another successful load.                                                                                                                                                                                                                                                                                                                             |
| R4  | `TestsPanel` has `autoRun = true` as default, and nobody passes `autoRun={false}` from `App.jsx`. Stop sets `stopRef.current = true` but the loop already passes it onto the next iteration; if the user is fast they hit Stop before the loop has resumed and it does work — but UI doesn't reflect it. The log container always scrolls to bottom on every status change because of `if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;`. |
| R5  | `App.jsx` says `const eff = view; // no degrade — split works even on narrow, as a tall sheet`.                                                                                                                                                                                                                                                                                                                                                                      |
| R6  | `ConfigDrawer` always renders a title row; same for `TestsPanel`.                                                                                                                                                                                                                                                                                                                                                                                                    |
| R7  | `AttributionOverlay` shows when _any_ credit can be derived, with no policy gate.                                                                                                                                                                                                                                                                                                                                                                                    |
| R8  | `loadAnimationFromBuffer` does not capture FBX userData/Documents, so we have nothing to display.                                                                                                                                                                                                                                                                                                                                                                    |

## Solutions implemented in this PR

- **R1** — `constants.js` gets a per-preset `flipped: true` flag (Alicia) and an optional `baseYaw` (radians). The Editor stores `s.baseYaw`, applies it once on load, and the autoRotate-off branch sets `rotation.y = baseYaw` instead of `0` so the bake survives every frame.
- **R2** — `animations.js` (renamed concept) gets a `ACS_normalizeModelURL` helper that rewrites:
  - `https://github.com/{o}/{r}/blob/{rev}/{path}` → `https://raw.githubusercontent.com/{o}/{r}/{rev}/{path}`
  - `https://github.com/{o}/{r}/raw/{rev}/{path}` and `…/raw/refs/heads/{rev}/…` → the same raw URL.
    Editor's URL load + animation load + drag-drop URL paths all run through it. The verified working raw URLs from `V-Sekai/three-vrm-1-sandbox-mixamo` are added as presets (`vsekai-girl` and `gangnam`).
- **R3** — A `useEffect` in Editor.jsx clears `error` and resets status to `'loaded'` (or `'idle'`) eight seconds after an error first appears. Manually clicking another preset / URL also clears it immediately (already the case).
- **R4** — `App.jsx` passes `autoRun={false}` to `TestsPanel`. The list autoscrolls to the bottom **only** if the user is already pinned within ~16 px of the bottom (standard "stick" behaviour). Stop now also triggers a state flush so the UI immediately disables the running spinner.
- **R5** — On mobile, `eff = view === 'split' ? 'tests' : view` so split degrades to tests-only.
- **R6** — `ConfigDrawer` accepts `hideTitle` and `TestsPanel` accepts `hideHeader`; both are set on mobile.
- **R7** — `attributionRequired(meta, preset)` central helper — returns true when `meta.creditNotation === 'required'`, when the licence string starts with `CC-BY` (still requires attribution), or when the preset declared it. Otherwise the overlay simply does not render.
- **R8** — `loadAnimationFromBuffer` and `loadAnimationFromURL` capture `asset.userData?.fbxTree?.GlobalSettings`, `asset.userData?.fbxTree?.Documents`, and the loader-attached `creator` / `originalApplication` if present. `AnimationMetaView` adds an "FBX Metadata" pairs block at the end.

## Existing components / libraries reviewed

- `@pixiv/three-vrm` — already used for VRM loading; provides `VRMUtils.rotateVRM0` (used) and `vrm.meta.creditNotation` (now used).
- `three.js` `FBXLoader` — exposes `userData.fbxTree` with the parsed FBX tree (which is where Documents/GlobalSettings live).
- `react` — split-on-resize handled by existing `useIsMobile` (`(max-width: 720px)`).
- No new libraries added; all fixes are in-tree.

## Related-repo issue triage

Both URL forms are **GitHub UX features**, not bugs of upstream `V-Sekai/three-vrm-1-sandbox-mixamo`. We do not need to file an issue against them — the repo is correctly hosting the files; the failure is on the consumer side, where we should rewrite the URLs.

The earlier work sessions surfaced no other upstream bugs. If a future session triggers a real upstream regression (e.g. `three-vrm` `rotateVRM0` no-op for a specific file), file an issue with: (a) the file URL, (b) the failing line in `loadVRMBuffer`, (c) the workaround we shipped (`flipped: true`).

## Verification

`npm run dev` → `/new`:

1. Pick Alicia Solid → faces camera.
2. Paste `https://github.com/V-Sekai/three-vrm-1-sandbox-mixamo/blob/master/three-vrm-girl-1.0-beta.vrm` → loads.
3. Paste `https://github.com/V-Sekai/three-vrm-1-sandbox-mixamo/blob/master/Gangnam%20Style.fbx` (after a model is loaded) → animation plays.
4. Trigger an error with bad URL → overlay disappears after timeout.
5. Open `/new?view=tests` → no auto-run; click ▶ → runs; click Stop mid-run → stops within current iteration.
6. Resize browser to <720 px wide → split view collapses to tests view; Editor / Tests panes have no title.
7. Load a VRM whose meta has `creditNotation === 'unnecessary'` → no overlay; load Alicia → overlay shown.
8. Load any FBX → metadata pairs appear under the animation section.
