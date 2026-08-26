# Candidate 1 bounded evidence

Observed on 2026-08-26 against source commit `24b69aad6a4f0a6964e68101da70418f0adace5d` and Harness target `b642a10626a950cc95c2d6f839810cb01fe599fe`.

Checked without running test suites, as requested by the user:

- all changed Harness source markers contain compact `region`/`purpose` JSON and balance independently per package, allowing crossing package boundaries;
- 29 preset-manager owner regions and 38 independently owned right-sidebar regions were found across the combined checkout;
- `git apply --check --reverse patches/harness-groupby-preset.patch` succeeds on the current combined Harness worktree;
- lifecycle and build scripts pass `bash -n`;
- both shared client catalogs were regenerated from source and neither catalog path occurs in this static patch;
- non-patch repository changes pass `git diff --check`.

This is discoverability and reversible-patch evidence only; marker balance does not authorize mutation or removal. Candidate 1 remains incomplete for build/test, live profile behavior, the deployed session-action menu, drift recovery, and an owned install/uninstall exercise.
