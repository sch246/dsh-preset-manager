# Preset manager intent

Status: user-grounded intent with a candidate realization. Candidate.4 binds the committed plugin source, deployed Host patch and observed root-workspace and historical-session behavior while keeping implementation acceptance incomplete.

## Intent

Provide a DeepSeek Harness plugin named preset manager that makes a large preset roster easier to browse and use: group sidebar sessions by preset, manage the preset display projection, choose a default, and reduce noise in new-session preset selection without breaking existing sessions.

The plugin should feel like a native extension of the existing workspace and new-conversation surfaces rather than a parallel browser with subtly different session semantics.

## Desired effects

### P1. Browse sessions by preset

- The official view-options menu offers a preset grouping mode alongside existing modes.
- Sessions are grouped under their agent preset; sessions with no resolvable preset remain discoverable in an ungrouped fallback.
- Its structure, styling, search, expansion, session status, interaction and row behavior reuse the official “按工作区” experience as far as practical.
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
- Hover or keyboard focus exposes “设为默认” or “取消默认” on the current option as applicable, and a failed default write remains visible in the new-conversation surface.
- Starting from a preset allows the user to choose a workspace, then enters the ordinary create-conversation interface with that workspace and preset already selected. Compatibility with the host creation flow is preferred over a parallel creation experience.

### P4. Preserve the host's presentation authority

- Official Harness components remain responsible for session projection, rows, runtime status, expansion and drag semantics.
- Preset-manager-owned UI is limited to preset grouping, decorations and preset actions unless a later user decision changes that boundary.
- Reuse must not remove ordinary session-row capabilities. Rename, fork, archive and the row overflow entry remain available in preset grouping mode.
- Removing or disabling the plugin restores the official new-conversation preset selector.

### P5. Maintain and remove owned target effects safely

- Installation detects whether the required Harness compatibility change is absent, already present or conflicting before modifying the target.
- An upgrade conflict stops for investigation instead of force-applying a patch.
- Uninstall removes the plugin and only reverses the exact compatibility contribution it installed when current target drift makes that safe; unrelated later changes are preserved.
- Every logical compatibility intervention is marked next to the governed source region. Shared generated catalogs are rebuilt from remaining source contributions after install or uninstall and are not statically claimed by this package.

## Observable acceptance

- `PM-001`: In a running supported Harness profile, selecting “按预设” displays preset groups, workspace-labelled official session rows and an ungrouped fallback where applicable; existing non-preset grouping modes still work. Each row keeps its title on the left and a compact grey block on the right whose workspace label precedes the rightmost relative time with visible spacing; at narrow width, a long label truncates without displacing or hiding the time.
- `PM-002`: Reorder, hide/unhide and display-rename operations survive reload according to P2; the new-conversation selector marks, sets and clears the explicit user default, preserves its pending selection when clearing, and falls back through the recent Session preset then managed order; long descriptions wrap in the editor, accepted line breaks survive the data path, and an external user-default change is reflected without moving the preset or creating contradictory state.
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

## Resources and current reality

- Repository: `https://github.com/sch246/dsh-preset-manager.git`.
- Last committed local source baseline: `44c3a9eaecfe1c3fe4aaaf160436f8d673b7dca1`.
- The source tree contains a substantial later v4 implementation across design, source, generated output, patching and lifecycle scripts. Until a realization lock binds a committed source identity, those bytes remain current reality rather than an immutable realization identity.
- At initial reconstruction, protocol 0.2 structural validation and both TypeScript no-emit checks passed. That mechanical observation did not include build, installation, browser or uninstall evidence.
- The user subsequently tested the current creation flow and reported that it satisfies the observable requirement to reach the official creation interface with workspace and preset preselected.
- The user selected the new-conversation selector as the sole preset-manager default-write entry and removed the sidebar star from the intended interaction. The selector distinguishes selection from default writes: a different option selects, the current non-default option sets the explicit user default on a repeated choice, and the current explicit default clears that setting on a repeated choice while preserving the pending selection. With no explicit user default, the recent Session preset then the managed-order first visible preset supply the fallback.
- The user reported that managed sidebar ordering did not affect the new-conversation selector. Inspection confirmed that the sidebar consumes the existing complete order while selector roster derivation retained Host order. The state already required both surfaces to share one order, so this is a realization mismatch rather than a new state authority.
- The user observed that starting PTC from a preset group and choosing the `root` workspace opened a reused blank Session under the Host default. Runtime evidence first showed the Host opening before selection, then exposed both a root-handler scope mismatch and a Host lookup that resumes the deleted historical preset before processing the requested replacement. The selected repair binds the start handler from root services, connects the workspace, selects the preset on the resulting Session through a Session-id BFF that can repair blank cold Sessions, and opens only after selection succeeds; started Sessions remain locked and seat reconciliation remains optional and conversation-scoped.
- The user observed that historical Sessions did not populate preset groups. Their persisted headers contain preset identity, but older derived projection-cache records can lack the later-added `agentPreset` row. The selected repair treats a cache cut as complete only when every currently registered client-visible projection is usable, refreshes incomplete bounded cold reads from the complete log, and requires a one-time maintenance pass for historical logs outside the ordinary list budget.
- The session-action mismatch has a source-level repair: the owner contract requires rename, fork and archive callbacks and preset rows pass them to the official renderer. Earlier mechanical checks and a clean patch reversal do not replace live deployed menu confirmation, which remains outstanding.
- The user clarified that the preset Session row's workspace label belongs before relative time inside one right-aligned metadata block. The Host patch gives the label the shrinkable, ellipsized position and keeps time non-shrinking; deployed ordinary-width, narrow-width and hover observation remains outstanding.
- The draft.22 source repair's Host patch has digest `sha256:0484bfaab562180c1d9fe12c709c21bb8ac4bb95dacb284ffec5dd6eacd0e45e` against official Harness base `cd5ef8148158c3a752a658978873241fdf8e2bbc`. It has no deployment receipt or realization lock; candidate.4 remains the historical deployed patch identity.
- Local compatibility target: `/root/deepseek-harness`; this path is bootstrap evidence, not a portable package requirement.
- Candidate.4 selects committed plugin source `21c3ad6fc9cf11228a8630f4dab3fc51d33eb9b1`, Host patch digest `sha256:c1c016096d03ad699831008a5472a69182765584efe6df7884a4820c8bac70a0`, and official Harness `origin/master` base `cd5ef8148158c3a752a658978873241fdf8e2bbc`. The dirty local assembly is deployment evidence only; it is not represented as a publishable Harness commit. The receipt records every owned source region and the generated catalogs rebuilt by setup and uninstall.
- The last three candidates remain historical evidence for earlier compatibility regions and source identities. Setup and uninstall regenerate shared catalogs from the current source tree.

## Implementation hints

- The current design uses a two-sided DSH bundle, `sidebar.workspaces.presetGroups`, a shadow registration for `conversation.hero.agentPreset`, official preset/settings/session APIs, and a bounded `ui-workspace` patch.
- The complete `order` + independent `hidden` + explicit user default in official settings is the selected state model. The new-conversation selector owns set and clear operations; the sidebar has no parallel default control. Deployment fallback remains separate, and the selector uses the recent Session preset then managed order when the user default is absent. Equivalent future realizations may differ if they continue to satisfy P1–P5.
- Local persistence currently uses `dsh.presetManager.v1` with a versioned schema. This is a migration constraint for existing users, not necessarily the only future storage mechanism.

## Open tensions

- Candidate.4 binds draft.20 to the committed source identity, exact Host patch, deployment receipt, validation commands, historical projection counts and a live root-workspace PTC start.
- The user's postscript exposed a session-row overflow mismatch. A source repair exists, but PM-004 still needs a deployed interaction check before it is accepted.
- The row metadata order and long-label truncation need deployed observation at ordinary and narrow sidebar widths; mechanical patch checks do not accept PM-001.
- The exact UX for no-workspace creation failure, broken presets, large preset lists and error recovery is not explicit enough to treat as accepted.
- The new-conversation default marker, repeat-selection action and visible write failure require deployed interaction evidence before they are accepted.
- Runtime, current-source drift maintenance and owned uninstall evidence remain absent from this package.
