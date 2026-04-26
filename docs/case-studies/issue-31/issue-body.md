# Issue #31 body

Source: https://github.com/konard/anime-avatar/issues/31

Title: Support text to motion using https://github.com/NVlabs/GR00T-WholeBodyControl for avatar studio (new engine)

Labels: documentation, enhancement

Created: 2026-04-26T15:10:31Z

Updated: 2026-04-26T15:10:59Z

Author: konard

```text
That should be simple experimental feature, that will use the model running in browser (it should fail if not enough resources on specific browser/device, but it should always show how much resources are available on device and how much required).

So it should be switch to turn it on/off and small text area in editor where I will be able to type `walk`, `turn` and so on.

The result should be generated animation in the virtual world/scene.

We need to collect data related about the issue to this repository, make sure we compile that data to `./docs/case-studies/issue-{id}` folder, and use it to do deep case study analysis (also make sure to search online for additional facts and data), list of each and all requirements from the issue, and propose possible solutions and solution plans for each requirement (we should also check known existing components/libraries, that solve similar problem or can help in solutions).
```

## Latest owner clarification

Source: https://github.com/konard/anime-avatar/issues/31#issuecomment-4322532888

Created: 2026-04-26T16:57:36Z

```text
Double check we support most of features of https://nvlabs.github.io/GEAR-SONIC/demo.html, generation of animation, ability to apply force on the body using mouse (switchable), reference animations, also robot model (if VRM, or support the format it is in, and use direct link without copying the model).

Also make it possible to switch on infinite grid on the floor with different styles.

All features are turned off by default, and can be turned on, and should be applicable to all our anime models as well.

Reuse as much libraries this demo has as possible for these features.

We need to collect data related about the issue to this repository, make sure we compile that data to `./docs/case-studies/issue-{id}` folder, and use it to do deep case study analysis (also make sure to search online for additional facts and data), list of each and all requirements from the issue, and propose possible solutions and solution plans for each requirement (we should also check known existing components/libraries, that solve similar problem or can help in solutions).
```
