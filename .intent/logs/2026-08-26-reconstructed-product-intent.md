# Reconstructed product intent

Record ID: `SRC-2026-08-26-PRESET-MANAGER-RECONSTRUCTION`

Status: Agent reconstruction from the current working tree, Git history and target integration. It is implementation archaeology and a candidate interpretation, not a quotation or user approval.

## Investigated reality

The repository implements a two-sided DeepSeek Harness plugin. Its node side establishes bundle identity; its browser side registers a preset-group view and shadows the new-conversation preset selector. A target Harness patch adds the preset grouping extension point and supplies official session projection and row-rendering seats.

The current uncommitted implementation has evolved beyond local `HEAD`. It uses one complete stable preset order, an independent hidden set, official settings as the default-preset authority, and local display-name/description overrides. Reconciliation distinguishes first installation, older stored schemas, added/removed presets and externally changed defaults.

The observed user-visible surface includes:

- a third “按预设” choice in the official workspace view menu;
- preset groups containing official session rows plus preset-specific decorations and actions;
- drag ordering, default star, hide/unhide, display rename and create-session actions;
- a new-conversation preset selector filtered and ordered by the same visible projection;
- local persistence of display order, hidden state and overrides.

The current setup and uninstall scripts also attempt to own the Harness patch lifecycle: they distinguish absent, already-applied and conflicting patches, record the installed patch digest, and reverse only the recorded unchanged patch before removing the plugin.

## Reconstructed desired effects

The narrowest coherent intent that explains the implementation is:

1. Browse Harness sessions by agent preset without degrading the official session-row behavior.
2. Manage the preset display projection through stable order, independent visibility, one host-authoritative default, and local display overrides.
3. Keep all preset-facing entry points synchronized enough that grouping, default choice and new-session selection do not present contradictory projections.
4. Install as an external plugin with an explicit, bounded compatibility change to Harness, and remove owned effects without overwriting unrelated target changes.

## Evidence boundary

These effects are supported by design and code shape, not by a preserved user statement. Existing tests can establish pure reconciliation and grouping behavior. Builds, patch checks and runtime observations can establish implementation evidence. None of them can establish that this reconstruction exactly matches the user's original intent.

The current dirty working tree also cannot be sealed honestly as a Git reference-backed realization. A later Agent must first validate and commit the intended implementation bytes, then create a subsequent lock that references that immutable implementation commit.
