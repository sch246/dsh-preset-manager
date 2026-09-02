# Workspace group marker parse mismatch

Record ID: `SRC-2026-08-27-WORKSPACE-GROUP-MARKER-PARSE-MISMATCH`

Status: checked implementation mismatch and user-authorized repair/restart scope. It does not revise preset-manager intent, accept a realization, or change the selected protocol.

## Checked failure

The current Harness assembly and `patches/harness-groupby-preset.patch` place JSX-form source marker comments as siblings of `ProjectGroupItem` directly inside one `return (` expression in `WorkspaceBrowser.tsx`. That gives the return expression more than one JSX root and causes the Vite/OXC transform to fail at the first `ProjectGroupItem` property. Three ui-workspace suites fail to load before running tests.

The intended region and behavior are otherwise unambiguous: the official workspace group is rendered through `ProjectGroupItem`, and the nearby markers only attribute that compatibility region to this package. The marker representation, not the user-visible grouping contract, is defective.

## Repair boundary

- Keep `ProjectGroupItem` as the single returned JSX root.
- Express the begin/end locators as ordinary source comments that do not become sibling JSX expressions.
- Apply the same correction to the Harness assembly and the package-owned patch.
- Re-run the focused ui-workspace tests, patch reverse check, package checks, composed build and authorized Web restart.

STATE remains unchanged because this is an implementation mismatch against the existing P4/PM-006 requirements. Passing source tests or restart checks will remain bounded implementation evidence rather than complete PM-001 through PM-007 acceptance.
