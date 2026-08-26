# Why preset-manager does not currently use dsh-std

Record ID: `SRC-2026-08-26-PRESET-MANAGER-DSH-STD-WHY-NOT`

Status: User-authorized architecture boundary based on current implementation evidence. It supersedes the earlier provisional direction toward a new dsh-std session-grouping capability, without rewriting that historical record.

## Source and decision

The user questioned whether preset-manager needs dsh-std involvement because a grouping API would be easy to make tightly dependent on the current Harness design, compatibility-poor, and unnecessarily coupled to the dsh-std lifecycle. After the current dependency boundary was investigated, the user requested that this why-not be preserved through the intent-package flow.

The current decision is therefore: **preset-manager remains a target-specific DeepSeek Harness plugin and does not introduce or consume a new dsh-std capability for preset grouping.** Its Harness compatibility work remains attributable through this package's state and versioned realization locks.

## Evidence checked

- The browser implementation directly consumes Harness connection, remote, session, workspace, slot and conversation services. It calls Harness preset/settings/session APIs and relies on Harness-specific blank-session reuse and session-list mirroring.
- The grouping occupant consumes an owner-provided Harness contract: official session projection, project/session row renderers, overflow rendering, rename/fork/archive callbacks, expansion and drag semantics.
- The current integration is a tracked patch to `@deepseek-ai/dsh-client-ui-workspace`, applied only after an absent/already-applied/conflicting check. It is already explicit about the target and compatibility boundary.
- Existing dsh-std `SidebarView` only contributes a session-scoped secondary-sidebar view and explicitly does not own host chrome, layout or feature state. It cannot express alternate session-browser grouping.
- No second host, independent implementation or cross-product consumer of preset-manager was found. The current manifest and implementation target the Harness Web GUI only.

## Why not dsh-std now

Introducing a portable capability now would require choosing public semantics for preset data, workspace/session lifecycle, settings authority, official row rendering/actions, grouping, expansion, drag and session creation before any second implementation demonstrates which parts are actually portable.

That would turn current Harness behavior into a dsh-std compatibility promise and add adapter discovery, negotiation, activation and disposal to preset-manager's lifecycle. It would not remove the need to maintain the Harness integration; it would relocate that maintenance behind a larger ABI whose stability has no present consumer evidence.

The intent package already admits a more direct compatibility strategy: state preserves the user-visible requirements, while a realization lock binds one concrete Harness baseline and implementation. When Harness changes, an Agent may regenerate or replace that lock without pretending the old internal API is portable.

## Reopen conditions

Reconsider a dsh-std capability only when evidence supplies at least one of the following:

- a second real host needs the same preset/session-grouping capability;
- a second independent implementation exposes a stable semantic intersection;
- preset-manager is explicitly required to run across products rather than only across Harness revisions; or
- an existing dsh-std capability grows to cover the need without importing Harness row, lifecycle or service semantics into its public ABI.

Until then, compatibility changes belong to the Harness-specific extension contract and the intent package's realization lifecycle, not to dsh-std.
