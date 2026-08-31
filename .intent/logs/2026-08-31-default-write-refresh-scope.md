# Default write refresh scope

Date: 2026-08-31

## Authority

The user reported that setting and clearing the explicit preset default feels slow, especially while the sidebar is grouped by preset. The user directed a plugin-local repair when official Harness code does not need to change.

Runtime-path inspection established that the official settings write response already contains the updated user-layer view. A default change therefore changes the explicit-default projection only; it does not invalidate the preset roster, managed order, visibility state or Session grouping. The current plugin instead starts overlapping full roster loads, publishes loading state, reconciles unchanged local state and rebuilds the mounted preset tree. This is a realization mismatch owned by the plugin Client.

## Required behavior

- Setting or clearing the explicit user default preserves the pending preset selection and changes the default marker without reloading the preset roster.
- A default-only change does not publish roster loading state, reconcile unchanged order or visibility, or rewrite the preset-manager local store.
- An external user-default change updates the same projection without treating the preset roster or Session grouping as stale.
- Genuine roster lifecycle events, such as initial load or connection recovery, may still refresh the roster.
- While preset grouping is mounted, default actions leave group expansion, scroll position and rendered Session rows stable apart from the default-dependent affordance.
- No official Harness source, RPC or Host patch change is required for this repair.

## Acceptance boundary

STATE remains the behavior authority. Acceptance requires operating set and clear in the real Web UI with preset grouping both mounted and unmounted, observing real settings persistence, and confirming that the preset tree does not enter loading or visibly rebuild. Type checking and building establish only mechanical completeness.
