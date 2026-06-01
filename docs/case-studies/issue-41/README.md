# Case study: Issue #41 — Promote the new Avatar Studio to `/` and archive the previous version at `/archive`

> Issue: https://github.com/konard/anime-avatar/issues/41
>
> Prepared PR: https://github.com/konard/anime-avatar/pull/42

This folder collects the data for issue #41, the requirement inventory, the
online research that constrained the design, the alternatives considered, and
the implementation plan that was executed.

Contents:

- `issue-body.json` — captured issue details (title, body, author, labels).
- `issue-comments.json` — captured issue comments. The issue had **no**
  comments at the time of capture (`[]`).
- `screenshots/01-studio-at-root.png` — browser verification that the Avatar
  Studio now loads at the top-level path `/`.
- `screenshots/02-archive-at-archive.png` — browser verification that the
  previous React component demo now loads at `/archive`.

## 1. Issue summary

The owner asks to **reorganize the code and docs** so that:

1. The new avatar studio that previously lived at `/new` becomes available at
   the **top level `/`**.
2. The **previous version** (the React component demo that lived at `/`) is
   **archived at `/archive`**.

On top of the reorganization, the issue carries the project's standing
meta-requirements (repeated across issues #25, #26, #28, #31, #36, #39):

3. Update **all code and docs** and keep the code aligned with the
   [code architecture principles](https://github.com/link-foundation/code-architecture-principles).
4. Compile issue-related data into `./docs/case-studies/issue-41`.
5. Perform a deep case-study analysis, **including online research**.
6. Produce a **list of every requirement** with **proposed solutions / plans**,
   and check for **existing components/libraries** that solve the same problem.
7. Plan and execute everything **in this single pull request** until every
   requirement is fully addressed.

## 2. Starting state (what "before" looked like)

The repository hosted **two distinct applications** that were both produced by a
single `npm run build` and deployed to GitHub Pages under the base
`/anime-avatar/`:

| Path       | App                        | Source                                                          | Build model                                                                 |
| ---------- | -------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `/` (root) | React component demo       | `src/` + root `index.html`, `test-*.html`                       | Vite + Rollup bundle (`@vitejs/plugin-react`), output to `dist/`.           |
| `/new`     | Avatar Studio (standalone) | `public/new/` (`index.html`, `src/`, `vendor/`, `svgWorker.js`) | **No build** — loads React, Babel (in-browser JSX), and Three.js from CDNs. |

How `/new` was served before:

- **Production:** Vite copies everything under `publicDir` (`public/`) into
  `dist/` verbatim, so `public/new/` became `dist/new/`, served at
  `/anime-avatar/new/`. (Vite docs: public-dir files are "copied to the root of
  the dist directory as-is" — https://vite.dev/guide/assets.html.)
- **Development:** a small Vite plugin (`serve-new-index`) rewrote
  `/new`, `/new/`, `/anime-avatar/new` and `/anime-avatar/new/` to
  `/anime-avatar/new/index.html`.

The two apps are genuinely different technologies — one is a bundled React
component library, the other is a self-contained CDN/Babel studio — so the
reorganization is a **routing / file-layout** change, not a code merge.

## 3. Online research

The reorganization is fully determined by how Vite resolves multi-page inputs,
the public directory, and the base path. Sources consulted:

| Fact                                                                                                                    | Source                                               | Impact on the design                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-page apps are configured by listing multiple `.html` files in `build.rollupOptions.input`; each is a build entry. | https://vite.dev/guide/build.html                    | The previous app's HTML entries can be moved under `archive/` and re-listed as inputs so they build to `dist/archive/*`.                       |
| `publicDir` files are served at `/` in dev and **copied to the root of `dist/` as-is** in build.                        | https://vite.dev/guide/assets.html                   | Moving the studio from `public/new/` to the `public/` **root** makes it land at `dist/` root → served at the top-level `/anime-avatar/`.       |
| Public assets must be referenced by **root-absolute path**, not imported from JS.                                       | https://vite.dev/guide/assets.html                   | The studio already references its helpers relatively from its own `index.html`; renaming its folder is enough, no JS import graph is involved. |
| The `base` option rewrites all asset paths for sub-path deploys like GitHub Pages.                                      | https://vite.dev/guide/build.html (Public Base Path) | `base: '/anime-avatar/'` is preserved; the studio's CDN + relative paths and the archive's bundled assets both resolve correctly under it.     |

Existing components / libraries / patterns evaluated for the "two apps, one
deploy" problem:

- **Vite multi-page input + `publicDir` copy (chosen).** Native to the existing
  toolchain, no new dependencies. The bundled app is a Rollup multi-page build;
  the no-build studio is a static `publicDir` payload. This matches Vite's own
  documented capabilities and keeps a single `npm run build`.
- **Two separate Vite projects / a monorepo (e.g. workspaces, Turborepo,
  Nx).** Rejected: heavyweight for a two-page static site; would fragment the
  single CI/deploy pipeline and the shared tooling (ESLint/Prettier/Vitest).
- **A client-side router (React Router) with a single SPA shell.** Rejected: the
  two apps use different runtimes (bundled React vs. in-browser Babel + CDN
  React); forcing them under one router would mean rewriting the studio.
- **An HTTP redirect from `/new` → `/`.** Considered as an optional
  compatibility shim. Not required by the issue (which asks to _move_ the studio,
  not keep `/new`), and a redirect file adds a path that contradicts "single
  source of truth". Documented the move in the README instead.

## 4. Requirement inventory

| #   | Requirement                                                           | Implementation response                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | The new Avatar Studio (was `/new`) is available at the top level `/`. | Moved `public/new/index.html` → `public/index.html`, `public/new/vendor` → `public/vendor`, `public/new/svgWorker.js` → `public/svgWorker.js`, and the studio modules to `public/studio/`. publicDir copy now lands the studio at `dist/` root. |
| R2  | The previous version is archived at `/archive`.                       | Moved the React app's HTML entries to `archive/index.html` and `archive/test-*.html`, and pointed `build.rollupOptions.input` at them so they build to `dist/archive/*`.                                                                        |
| R3  | Local `npm run dev` mirrors the deployed layout.                      | Replaced the `serve-new-index` plugin with `serve-site-layout`, which serves the studio at `/` and the React app at `/archive`.                                                                                                                 |
| R4  | All code and docs are updated.                                        | Updated `vite.config.js`, the 9 test files + 1 experiment that referenced `public/new/src`, `README.md` (site layout, screenshots, test-page paths, project structure) and `ROADMAP.md`.                                                        |
| R5  | Code stays aligned with the architecture principles.                  | See §6 — the change improves Single Source of Truth, Clear Naming, Configuration vs. Code, and Principle of Least Surprise without breaking any contracts.                                                                                      |
| R6  | Issue data compiled into `docs/case-studies/issue-41`.                | This folder: issue body/comments JSON, this analysis, and verification screenshots.                                                                                                                                                             |
| R7  | Deep analysis with online research + alternatives + plan.             | §3 (research + libraries) and §5 (plan) below.                                                                                                                                                                                                  |
| R8  | Everything verified and done in this single PR.                       | §7 records the build/test/lint/browser verification; all done on PR #42.                                                                                                                                                                        |

## 5. Implementation plan (executed)

1. **Relocate the studio to the public root.** `git mv` the studio files out of
   `public/new/` into `public/`, renaming the studio's `src/` folder to
   `studio/` to avoid colliding with the bundled app's `/src` module graph in
   dev (a request for `/anime-avatar/src/...` is resolved by Vite against the
   project's `src/`, so the studio's own `src/` had to be renamed). Update the
   `<script src="src/...">` tags in `public/index.html` to `studio/...`.
2. **Relocate the previous app to `/archive`.** Create `archive/`, `git mv` the
   root `index.html` and the three `test-*.html` entries into it. Their
   `<script src="/src/...">` tags stay root-absolute and keep resolving to the
   shared `src/` source.
3. **Update `vite.config.js`.** Re-point `build.rollupOptions.input` at the
   `archive/*.html` entries (the studio needs no Rollup input — it is a
   `publicDir` payload). Replace `serve-new-index` with `serve-site-layout` so
   dev mirrors the deploy.
4. **Update references.** Rewrite `public/new/src` → `public/studio` in the 9
   test files and the bone-limit experiment.
5. **Update docs.** README site-layout table, screenshots, test-page paths, and
   project structure; ROADMAP entry for issue #41.
6. **Verify.** `npm run build`, `npm test`, `npm run lint`, `npm run
format:check`, plus a real-browser check of `/` and `/archive` in both dev
   (`npm run dev`) and the production preview (`npm run preview`).

## 6. Alignment with the code architecture principles

- **Single Source of Truth** — each app now has exactly one home: the studio in
  `public/`, the previous app in `src/` + `archive/`. The duplicate "studio is
  at `/new` but is the project's real front end" ambiguity is removed.
- **Clear Naming / Principle of Least Surprise** — the top-level `/` serves the
  current product (the studio), and `/archive` self-describes as the prior
  version. `public/studio/` names the studio's source for what it is.
- **Configuration vs. Code** — the dev/deploy path layout lives in
  `vite.config.js` (configuration), not scattered through the apps.
- **Backwards Compatibility / Stable Contracts** — `base: '/anime-avatar/'` is
  unchanged, the studio's runtime (CDN React/Babel/Three, libarchive worker) is
  byte-for-byte the same, and the previous app's component API in `src/` is
  untouched. Only URLs moved, and the move is documented in the README.
- **Separation of Concerns** — the no-build static studio and the Vite-bundled
  React library remain independent; the reorganization does not entangle them.

## 7. Verification

All checks were run on the branch for PR #42:

| Check                   | Command                | Result                                                                                                                                                |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build        | `npm run build`        | Succeeds. `dist/index.html` is the studio; `dist/archive/index.html` is the previous app; `dist/studio/`, `dist/vendor/`, `dist/svgWorker.js` copied. |
| Unit tests              | `npm test`             | 11 files / 149 tests pass (after updating `public/studio` import paths).                                                                              |
| Lint                    | `npm run lint`         | 0 errors (8 pre-existing `max-lines-per-function` warnings in `src/`).                                                                                |
| Formatting              | `npm run format:check` | Passes.                                                                                                                                               |
| Dev routing             | `npm run dev`          | `/anime-avatar/` → studio, `/anime-avatar/archive` → previous app.                                                                                    |
| Production preview      | `npm run preview`      | Same routing from the built `dist/`; studio/vendor assets return 200.                                                                                 |
| Browser (studio at `/`) | Playwright             | `screenshots/01-studio-at-root.png` — studio renders, only a benign `favicon.ico` 404.                                                                |
| Browser (`/archive`)    | Playwright             | `screenshots/02-archive-at-archive.png` — previous React avatar renders.                                                                              |
