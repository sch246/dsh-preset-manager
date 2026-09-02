# Workspace group marker parse repair evidence

Record ID: `SRC-2026-08-27-WORKSPACE-GROUP-MARKER-PARSE-REPAIR-EVIDENCE`

Status: bounded implementation evidence for `SRC-2026-08-27-WORKSPACE-GROUP-MARKER-PARSE-MISMATCH`. It does not revise STATE, accept the whole realization, or change the selected protocol.

The two ownership locators around `ProjectGroupItem` are now ordinary TypeScript source comments in both the Harness assembly and `patches/harness-groupby-preset.patch`. `ProjectGroupItem` remains the single returned JSX root.

Checked results on 2026-08-27:

- `git apply --reverse --check` accepts the package patch against the assembled Harness checkout.
- preset-manager type checking and all 27 package tests pass.
- all 133 focused ui-workspace tests pass after the correction.
- the wider affected Harness UI run passes 67 test files and 1,026 tests.
- Host type checking, client catalog verification, and the rebuilt ui-workspace bundle pass.
- the user-authorized `dsh-web` restart reaches `active` with HTTP 200 on `127.0.0.1:3082`.

These observations close the parse mismatch. They do not replace the existing user acceptance record for the preset-manager behavior.
