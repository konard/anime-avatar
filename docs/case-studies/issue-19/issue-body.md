# Issue #19 — body snapshot

> Captured 2026-04-25. Original: https://github.com/konard/anime-avatar/issues/19

- Alicia Solid model is flipped entirely (meaning when two over preset models look towards us, we see Alicia back, not front on load). Also if some other models will have similar problem we should have separate configuration for it, and for Alicia by default it should be set.
- Urls like `https://github.com/V-Sekai/three-vrm-1-sandbox-mixamo/blob/master/three-vrm-girl-1.0-beta.vrm` lead to errors, we need to automatically convert them to actually downloadable urls. Also once you will able to access working raw download url, please add it to presets.
- Loading error should be automatically hidden after timeout
- Tests should not be started by default when `Tests` button is clicked, or page loaded with tests view set. We should manually click run tests, and also double check that tests are stoppable, at the moment stop button is not working. Also it is not possible to scroll tests progress, it auto-resets to bottom.
- Split view should not be shown on mobile
- Also Editor and Tests should be full screen on mobile with no title, as buttons Editor and Tests on top would be enough.
- We should show copyright information only if vrm/fbx metadata enforces it.
- If it is possible for fbx file to show its metadata at the end like we do for vrm we should do it.

We need to download all logs and data related about the issue to this repository, make sure we compile that data to `./docs/case-studies/issue-{id}` folder, and use it to do deep case study analysis (also make sure to search online for additional facts and data), in which we will reconstruct timeline/sequence of events, list of each and all requirements from the issue, find root causes of the each problem, and propose possible solutions and solution plans for each requirement (we should also check known existing components/libraries, that solve similar problem or can help in solutions).

If there is not enough data to find actual root cause, add debug output and verbose mode if not present, that will allow us to find root cause on next iteration.

If issue related to any other repository/project, where we can report issues on GitHub, please do so. Each issue must contain reproducible examples, workarounds and suggestions for fix the issue in code.

---

## Comment from @konard, 2026-04-22

Also urls like:

```
https://github.com/V-Sekai/three-vrm-1-sandbox-mixamo/blob/master/Gangnam%20Style.fbx
https://github.com/V-Sekai/three-vrm-1-sandbox-mixamo/raw/refs/heads/master/Gangnam%20Style.fbx
```

Should be supported and automatically converted.
