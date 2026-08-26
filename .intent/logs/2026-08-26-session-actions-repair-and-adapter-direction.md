# Session actions repair and adapter direction

Record ID: `SRC-2026-08-26-PRESET-MANAGER-SESSION-ACTIONS-REPAIR`

Status: Agent diagnosis and bounded implementation evidence, plus a user-proposed architecture direction. It does not claim live runtime acceptance or select a new dsh-std ABI.

## Reproduced mismatch

A focused ui-workspace component regression test selected preset grouping and inspected the owner share delivered to `sidebar.workspaces.presetGroups`. Before the fix, `sessionActions` was absent. The official `SessionNodeItem` only renders rename, fork and archive menu entries when the corresponding callbacks exist, so the whole session-row overflow surface disappeared in preset mode.

This confirmed the user's postscript as an implementation mismatch rather than an intentional product simplification.

## Repair

The Harness-side owner contract now requires a `PresetSessionActions` share containing non-optional rename, fork and archive callbacks. `WorkspaceBrowser` supplies its existing official actions at the preset render site, and `PresetGroups` spreads them into every official session-row renderer call.

The contract makes omission a type error; the component regression test also asserts all three functions are present. The repository-owned Harness patch was regenerated from the corrected target diff and passes reverse-application checking against the current target.

## Bounded verification

The following checks passed on the current dirty working trees:

- focused ui-workspace component suite: 45 tests;
- preset-manager suite: 27 tests, including preservation of newline characters in description overrides;
- preset-manager host and client TypeScript checks;
- ui-workspace bundle build and preset-manager full build;
- protocol 0.2 structural validation and reverse patch check.

No plugin installation, service restart or live row-menu interaction was performed. PM-004 therefore has a source-level repair and regression evidence but still needs deployed user-visible confirmation.

The broader Harness `test:gui` run exposed four unrelated settings/remote-browser failures and then failed to exit; it was stopped after producing no further output. The complete affected ui-workspace suite was run separately and passed 133 tests. Replay Web smoke was attempted but did not reach browser execution because the repository-wide host build is already blocked by unrelated core test type errors in `agent.spec.ts` and `repair.spec.ts`.

## User-proposed adapter direction

The user observed:

> 其实这个所需要的官方代码介入，我感觉也能通过扩展前面的std来实现（）

Investigation supports the direction with one qualification: existing dsh-std `SidebarView` cannot represent alternate session grouping. A new portable session-grouping or official-row-host capability is needed. Its portable layer should carry opaque group/session facts and required behavior, while `adapter-dsh` owns the mapping to Harness projection, row seats, actions, availability and lifecycle.

The current direct patch remains a working transitional mapping and the evidence base for designing that contract. Migration should not move Harness-private slot names, React nodes or Session types into the portable ABI.
