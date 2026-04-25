title: `Follow camera` eyes and head animation for Alicia is broken in new avatar studio
state: OPEN
author: konard (Konstantin Diachenko)
labels: bug
comments: 0
assignees:
projects:
milestone:
number: 26
--
Double check all relative animations and configurations for Alicia model, for every other model default eyes and head follow animation works, but for Alicia it looks like direction of rotation is flipped.

Previously initial model rotation was fixed, but not all other interactions that depend on it or related to it. I want to be 100% sure every VRM model for anime characters will just work fine with our viewer/editor.

We need to download all logs and data related about the issue to this repository, make sure we compile that data to `./docs/case-studies/issue-{id}` folder, and use it to do deep case study analysis (also make sure to search online for additional facts and data), in which we will reconstruct timeline/sequence of events, list of each and all requirements from the issue, find root causes of the each problem, and propose possible solutions and solution plans for each requirement (we should also check known existing components/libraries, that solve similar problem or can help in solutions).

If there is not enough data to find actual root cause, add debug output and verbose mode if not present, that will allow us to find root cause on next iteration.

If issue related to any other repository/project, where we can report issues on GitHub, please do so. Each issue must contain reproducible examples, workarounds and suggestions for fix the issue in code.
