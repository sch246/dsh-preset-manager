# Preset manager intent

## Map entry

Use the [installation and maintenance route](#installation-and-maintenance-route) and [removal route](#removal-route) for the selected deployment. The existing protocol 0.2 selection remains unchanged.

## Intent

Provide a DeepSeek Harness plugin named preset manager that makes a large preset roster easier to browse and use: group sidebar sessions by preset, manage the preset display projection, choose a default, and reduce noise in new-session preset selection without breaking existing sessions.

The plugin should feel like a native extension of the existing workspace and new-conversation surfaces rather than a parallel browser with subtly different session semantics.

## Desired effects

### P1. Browse sessions by preset

- The official view-options menu offers a preset grouping mode alongside existing modes.
- Sessions are grouped under their agent preset; sessions with no resolvable preset remain discoverable in an ungrouped fallback.
- Its structure, styling, search, expansion, session status, interaction and row behavior reuse the official “按工作区” experience as far as practical.
- Selecting “最近更新” derives each applicable Session order from the currently visible Sessions and their current update times, newest first. Selecting the already-active option performs the same refresh, so a restored or replaced Session set cannot remain behind an older browser-local order snapshot.
- Session rows identify their workspace in the existing compact grey metadata area on the right, not in the title area. The right-aligned block presents the workspace label before relative time with a visible gap; a long label truncates before it can shrink, displace or hide the relative-time item. Rows retain the ordinary overflow actions, including rename, fork and archive.

### P2. Manage one coherent preset display projection

- All existing presets have one stable complete order.
- Visibility is independent of order: hiding does not destroy position, and unhiding restores the preset to that position.
- Hidden presets disappear from new-session choices and are shown grey at the end of the preset management list.
- The new-conversation selector marks the explicit user default stored in official settings. A user default cannot remain hidden; a deployment fallback does not masquerade as an explicit user choice.
- Display-name and description overrides affect presentation without changing preset identity or source files.
- The description editor accommodates long text through a multi-line control or automatic wrapping. If it accepts explicit line breaks, they remain intact in stored description data.
- First installation, stored-schema migration, later host additions/removals and externally changed defaults reconcile without inventing a second order, visibility or default authority.

### P3. Provide direct, predictable actions

- A user can reorder preset groups, hide or unhide a preset, edit its display name and description, and start a session with that preset from the group surface. Preset-group rows do not contain a default control.
- The new-conversation selector uses the same visible ordering and display overrides, marks the explicit user default, and is the only preset-manager UI that writes it. Choosing a different option changes only the pending session; choosing the current non-default option again sets it as the user default, while choosing the current user default again clears that default and keeps the pending selection.
- A manual selection made after the new-conversation page opens remains current for that page and is not replaced by an asynchronous default refresh.
- Without an explicit user default, the current or recently reused Session preset is selected when usable; otherwise the selector uses the first visible healthy preset in managed order.
- Setting, clearing or externally changing the explicit user default updates only its projection. It does not invalidate or reload the preset roster, publish roster loading state, reconcile unchanged managed order or visibility, or visibly rebuild a mounted preset-group Session tree.
- Hover or keyboard focus exposes “设为默认” or “取消默认” on the current option as applicable, and a failed default write remains visible in the new-conversation surface.
- Starting from a preset allows the user to choose a workspace, then enters the ordinary create-conversation interface with that workspace and preset already selected. Compatibility with the host creation flow is preferred over a parallel creation experience.

### P4. Preserve the host's presentation authority

- Official Harness components remain responsible for session projection, rows, runtime status, expansion and drag semantics. Sessions can be reordered within their preset group, including hidden presets and the ungrouped fallback; the current browser retains that order across reloads, and the selected ordering mode governs activity promotion.
- Preset-manager-owned UI is limited to preset grouping, decorations and preset actions unless a later user decision changes that boundary.
- Reuse must not remove ordinary session-row capabilities. Rename, fork, archive and the row overflow entry remain available in preset grouping mode.
- Removing or disabling the plugin restores the official new-conversation preset selector.

### P5. Maintain and remove owned target effects safely

- Installation detects whether the required Harness compatibility change is absent, already present or conflicting before modifying the target.
- An upgrade conflict stops for investigation instead of force-applying a patch.
- Uninstall removes the plugin and only reverses the exact compatibility contribution it installed when current target drift makes that safe; unrelated later changes are preserved.
- Every logical compatibility intervention is marked next to the governed source region. Shared generated catalogs are rebuilt from remaining source contributions after install or uninstall and are not statically claimed by this package.

## Observable acceptance

- `PM-001`: In a running supported Harness profile, selecting “按预设” displays preset groups, workspace-labelled official session rows and an ungrouped fallback where applicable; existing non-preset grouping modes still work. Selecting or reselecting “最近更新” orders the current rows within each applicable group by descending `updatedAt`, including after the deployed Session set has been restored or replaced. Each row keeps its title on the left and a compact grey block on the right whose workspace label precedes the rightmost relative time with visible spacing; at narrow width, a long label truncates without displacing or hiding the time.
- `PM-002`: Reorder, hide/unhide and display-rename operations survive reload according to P2; the new-conversation selector marks, sets and clears the explicit user default, preserves its pending selection when clearing, and falls back through the recent Session preset then managed order. Set, clear and external default changes remain responsive with preset grouping mounted, do not put the roster into loading, and leave group expansion, scroll position and Session rows stable. Long descriptions wrap in the editor, accepted line breaks survive the data path, and an external user-default change is reflected without moving the preset or creating contradictory state.
- `PM-003`: The preset `+` action allows workspace selection and reaches the ordinary create-conversation interface with workspace and preset preselected; hidden presets do not appear in the selector and visible presets follow the managed order.
- `PM-004`: In preset mode, each session row still exposes and successfully performs the ordinary rename, fork and archive actions through its overflow surface.
- `PM-005`: STATE is the only behavior authority. The plugin removes code tests that would restate implementation semantics as a second authority; real Web UI observation with real settings persistence, including refresh and service restart, evaluates the implementation directly against STATE.
- `PM-006`: Typecheck and build are mechanical completeness checks against a declared Harness baseline, not behavior acceptance; the compatibility patch passes a forward-or-already-applied check without partial target mutation.
- `PM-007`: A recorded install → target-drift inspection → uninstall exercise removes owned effects, restores the official selector, preserves an unrelated target modification, verifies nearby source-region ownership markers, and re-synthesizes shared generated catalogs from the remaining source contributions.

## Constraints and permissions

- Existing target and plugin working-tree changes belong to their authors. Do not discard, overwrite or silently absorb them into an intent lock.
- Do not describe compilation, unit tests, clean patch application or Agent confidence as proof of the complete user-visible experience.
- Do not modify preset files or preset ids when applying display renames.
- Do not add target RPC merely to bypass the current integration boundary without a separately investigated and authorized design revision.
- Harness source changes are allowed as an explicit compatibility realization, but their ownership, target baseline, maintenance and uninstall path must remain attributable.
- Preset grouping remains a Harness-specific extension contract. Do not introduce or depend on a new dsh-std capability merely to hide Harness compatibility work behind another lifecycle and ABI.
- Installing, restarting `dsh-web`, pushing, or changing the target Harness checkout requires explicit user authority for that action.

## Non-goals

Deleting presets and cascading deletion of their sessions are not part of the plugin. The user initially described that possibility and then explicitly withdrew it: “如果没有删除就算了，不需要删除功能了”. Existing preset definitions and historical sessions must therefore remain intact.

Cross-browser synchronization of local display order, visibility and overrides is not implemented or established as a current requirement. Preset file editing, preset-id changes and a general replacement for the official settings page are also outside the reconstructed scope.

Cross-product portability through dsh-std is not a current requirement. Reconsider that boundary only after a second real host or independent implementation exposes a portable semantic intersection, an explicit cross-product requirement appears, or an existing standard capability can satisfy the need without exporting Harness-specific row, service or lifecycle semantics.

## Workspace entry and path migration

The repository root is a private development workspace. The installable package is [packages/dsh-preset-manager](../../packages/dsh-preset-manager/package.json); `.intent/`, scripts, documentation and Host patches remain repository-owned. Replace old repository-root local package links with the absolute `packages/dsh-preset-manager` path through the selected profile plugin transaction; the root is no longer a runtime package. Package name, version, Bundle identity and `dsh.presetManager.v1` storage stay unchanged.

`node scripts/plugin.mjs setup`, `inspect`, and `remove` inspect without mutation. `setup --install` and `remove --remove` select the operations below. Bash wrappers keep the same defaults; on Windows run the Node entry with Git Bash available for the existing Host patch scripts. No script restarts a service.

`DSH_CHECKOUT=/absolute/harness node scripts/build.mjs build` builds only this package; `typecheck` checks both compiler faces. Install TypeScript 5.9.3 and tsdown 0.22.14 in the private workspace, or select an existing installed tools directory with `DSH_BUILD_TOOLS=/absolute/node_modules`. Build scripts invoke Node directly, never install tools, and create only local dependency directories with leaf links. The workspace records pnpm 10.17.1 for deliberate dependency management.

## Installation and maintenance route

Use the full desired effects above when realizing a different Host; [DESIGN.md](../../DESIGN.md) explains this revision's implementation but does not replace those effects. The current source has an alpha.2 patch and build route; historical evidence is kept in LOG. Select the actual checkout, Home and profile and inspect local changes, existing preset contributions and `dsh-preset-manager.patch-state` in its Git metadata. The alpha.2 baseline is a known input, not a permanent version gate.

From this repository root, with the selected checkout's build dependencies installed:

```sh
DSH_CHECKOUT=/absolute/harness DSH_HOME=/absolute/dsh-home DSH_PROFILE=web node scripts/plugin.mjs setup --install
```

[Setup](../../scripts/setup.sh) applies or recognizes the [tracked patch](../../patches/harness-groupby-preset.patch), checks source markers, regenerates shared Client/Cordis catalogs, records ownership, builds Host, ui-workspace declarations, api-remotes and ui-workspace bundles, runs the [plugin build](../../scripts/build.sh), and links package/row `dsh-preset-manager` into the profile. Its `dsh.client` browser contribution uses a no-op Host identity entry. All operations use the explicit Home/profile and the selected checkout built CLI.

Check dependency, profile lockfile, resolved link, Bundle membership and one served browser contribution together. Setup records patch ownership before catalog generation and rejects a missing built CLI before changing source. Later failures can still leave an incomplete install. Inspect the phase and existing diff before retrying, preserving original ownership evidence.

On an upstream change, inspect official Workspace row/Session projection ownership, the preset grouping seat, cold Session preset selection, projection-cache completeness and recent-order refresh before reusing the patch. Native alpha.2 row actions and `composeAgent()` are already reused. Remove superseded adaptation when upstream provides equivalent behavior; keep the official selector fallback and avoid a second row renderer or default settings owner. Preset and Skill-manager adaptations may both touch generator mappings, while sidebar plugins consume related slots; compose source and regenerate shared catalogs instead of installing by precedence.

When historical sessions are missing from groups, distinguish missing derived projection rows from missing durable preset identity. For logs beyond the normal cold-read budget, the [bounded maintenance rationale](../logs/2026-08-31-historical-preset-projection-cache-mismatch.md) explains why ordinary listing cannot complete the backfill. Investigate the selected Host’s maintenance controls and corpus size before choosing a bounded pass; if temporarily raising a profile budget, restore it after observing completion. No ready-made backfill command is retained here. Preserve authoritative logs. When a restored Session set has wrong recency, refresh the existing “最近更新” projection rather than rewriting timestamps or deleting all browser state.

Verification follows the changed effects: typecheck/build establish mechanical completeness; PM-001–007 govern real grouping, selector, persistence, failure and removal observations. In particular, recheck overflow actions, narrow-row metadata, default-only updates with a mounted group tree and blank cold-session selection after related Host changes. A map-only edit uses JSON/link checks; the existing policy against tests that copy implementation semantics does not require running build for prose changes or remove the target Host's relevant checks.

## Removal route

```sh
DSH_CHECKOUT=/absolute/harness DSH_HOME=/absolute/dsh-home DSH_PROFILE=web node scripts/plugin.mjs remove --remove
```

[Uninstall](../../scripts/uninstall.sh) reverses only the exact patch it owns, regenerates shared catalogs and rebuilds affected faces; pre-existing or drifted Host source is preserved while profile removal is still attempted. A failed profile transaction exits unsuccessfully; verify package/Bundle absence separately and reconcile any remaining effects before claiming removal. Preserve official settings, preset definitions, historical Sessions and browser-local display data unless deletion was separately requested. Observe restoration of the official selector and preservation of unrelated modifications under PM-007. Activation uses the selected deployment's existing restart authority; neither script restarts it.

## Implementation hints

- The current design uses a two-sided DSH bundle, `sidebar.workspaces.presetGroups`, a shadow registration for `conversation.hero.agentPreset`, official preset/settings/session APIs, and a bounded `ui-workspace` patch.
- The complete `order` + independent `hidden` + explicit user default in official settings is the selected state model. The new-conversation selector owns set and clear operations; the sidebar has no parallel default control. Deployment fallback remains separate, and the selector uses the recent Session preset then managed order when the user default is absent. Equivalent future realizations may differ if they continue to satisfy P1–P5.
- A default-only settings change projects the returned or mirrored user-layer default onto the current roster without refreshing roster identity. Initial load and connection recovery remain the refresh owners for roster lifecycle changes.
- Local persistence currently uses `dsh.presetManager.v1` with a versioned schema. This is a migration constraint for existing users, not necessarily the only future storage mechanism.

Default inspection compares the selected profile dependency with its exact root lock importer, checks the installed package realpath and identity and the Bundle count, and reports any patch receipt summary. Installation consistency and matching this candidate package path are separate observations. Missing target variables report not-inspected; the lock reader uses the selected checkout CLI's installed js-yaml dependency.
