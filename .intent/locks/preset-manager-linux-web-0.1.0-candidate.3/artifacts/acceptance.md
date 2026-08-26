# Candidate 3 bounded evidence

Observed on 2026-08-26 against source commit `e82f6dcf83fab6e795b0bc5c4abf7fdfcfc14095` and official Harness remote target `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`.

Checked without running test suites, as requested by the user:

- all changed Harness source markers use a package token plus ordinary `(purpose: ...)` commentary and balance independently per package, allowing crossing package boundaries;
- 29 preset-manager owner regions and 38 independently owned right-sidebar regions were found across the combined checkout;
- the patch passes forward applicability in a detached clean `b150a551` worktree, both alone and after right-sidebar;
- the patch passes exact reverse applicability on the current combined local assembly worktree;
- lifecycle and build scripts pass `bash -n`;
- both shared client catalogs were regenerated from source and neither catalog path occurs in this static patch;
- non-patch repository changes pass `git diff --check`.

This is discoverability and remote-baseline applicability evidence only; purpose prose and marker balance do not authorize mutation or removal. Candidate 3 remains incomplete for build/test, live profile behavior, the deployed session-action menu, drift recovery, and an owned install/uninstall exercise.
