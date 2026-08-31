# Preset manager intent

Status: user-grounded intent with a draft, unsealed realization. The user has now supplied the original request verbatim; this state projects its continuing decisions while keeping implementation acceptance incomplete.

## Intent

Provide a DeepSeek Harness plugin named preset manager that makes a large preset roster easier to browse and use: group sidebar sessions by preset, manage the preset display projection, choose a default, and reduce noise in new-session preset selection without breaking existing sessions.

The plugin should feel like a native extension of the existing workspace and new-conversation surfaces rather than a parallel browser with subtly different session semantics.

## Desired effects

### P1. Browse sessions by preset

- The official view-options menu offers a preset grouping mode alongside existing modes.
- Sessions are grouped under their agent preset; sessions with no resolvable preset remain discoverable in an ungrouped fallback.
- Its structure, styling, search, expansion, session status, interaction and row behavior reuse the official “按工作区” experience as far as practical.
- Session rows identify their workspace and retain the ordinary row overflow actions, including rename, fork and archive.

### P2. Manage one coherent preset display projection

- All existing presets have one stable complete order.
- Visibility is independent of order: hiding does not destroy position, and unhiding restores the preset to that position.
- Hidden presets disappear from new-session choices and are shown grey at the end of the preset management list.
- The new-conversation selector marks the Host's current default preset. A default preset cannot remain hidden.
- Display-name and description overrides affect presentation without changing preset identity or source files.
- The description editor accommodates long text through a multi-line control or automatic wrapping. If it accepts explicit line breaks, they remain intact in stored description data.
- First installation, stored-schema migration, later host additions/removals and externally changed defaults reconcile without inventing a second order, visibility or default authority.

### P3. Provide direct, predictable actions

- A user can reorder preset groups, hide or unhide a preset, edit its display name and description, and start a session with that preset from the group surface. Preset-group rows do not contain a default control.
- The new-conversation selector uses the same visible ordering and display overrides, marks the Host default, and is the only preset-manager UI that writes it. Choosing a different option changes only the pending session; choosing the current non-default option again sets it as default, while choosing the current default again performs no write.
- Hover or keyboard focus exposes “设为默认” on the current non-default option, and a failed default write remains visible in the new-conversation surface.
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

- `PM-001`: In a running supported Harness profile, selecting “按预设” displays preset groups, workspace-labelled official session rows and an ungrouped fallback where applicable; existing non-preset grouping modes still work.
- `PM-002`: Reorder, hide/unhide and display-rename operations survive reload according to P2; the new-conversation selector marks the Host default and its repeat-selection default action survives reload; long descriptions wrap in the editor, accepted line breaks survive the data path, and an external official-default change is reflected without moving the preset or creating contradictory state.
- `PM-003`: The preset `+` action allows workspace selection and reaches the ordinary create-conversation interface with workspace and preset preselected; hidden presets do not appear in the selector and visible presets follow the managed order.
- `PM-004`: In preset mode, each session row still exposes and successfully performs the ordinary rename, fork and archive actions through its overflow surface.
- `PM-005`: Pure tests cover first install, schema migration and both sides of the complete-order, default-visible and all-hidden invariants, plus grouping/search/order derivation.
- `PM-006`: Typecheck, tests and build pass against a declared Harness baseline; the compatibility patch passes a forward-or-already-applied check without partial target mutation.
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
- At initial reconstruction, protocol 0.2 structural validation, both TypeScript no-emit checks and the then-current 26 Vitest cases passed. That observation did not include build, installation, browser or uninstall evidence.
- The user subsequently tested the current creation flow and reported that it satisfies the observable requirement to reach the official creation interface with workspace and preset preselected.
- The user selected the new-conversation selector as the sole preset-manager default-write entry and removed the sidebar star from the intended interaction. The selector distinguishes selection from default writes: a different option selects, the current non-default option sets the default on a repeated choice, and the current default is a no-op.
- The session-action mismatch has a source-level repair: the owner contract now requires rename, fork and archive callbacks and preset rows pass them to the official renderer. The focused Harness suite passes 45 tests, preset-manager passes 27 tests, both typechecks and both builds pass, and the regenerated patch reverses cleanly. Live deployed menu confirmation remains outstanding.
- Local compatibility target: `/root/deepseek-harness`; this path is bootstrap evidence, not a portable package requirement.
- Candidate 1 practices compact package-delimited locators for the three compatibility regions and removes generated slot/API catalogs from exclusive patch ownership. Begin lines carry only ordinary `(purpose: ...)` commentary; its receipt carries realization and source-to-generated ownership evidence, while setup and uninstall regenerate the catalogs from the current source tree.
- The reproducible Harness target is official remote commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`. Local `b642a106` is a five-commit-ahead skill-enablement assembly context rather than remote authority; the current patch applies cleanly to `b150a551` both alone and after right-sidebar.

## Implementation hints

- The current design uses a two-sided DSH bundle, `sidebar.workspaces.presetGroups`, a shadow registration for `conversation.hero.agentPreset`, official preset/settings/session APIs, and a bounded `ui-workspace` patch.
- The complete `order` + independent `hidden` + Host-authoritative default model is the selected state model. The new-conversation selector owns the default write; the sidebar has no parallel default control. Equivalent future realizations may differ if they continue to satisfy P1–P5.
- Local persistence currently uses `dsh.presetManager.v1` with a versioned schema. This is a migration constraint for existing users, not necessarily the only future storage mechanism.

## Open tensions

- Candidate 1 is being prepared for the current v4 implementation. Nearby attribution and generated-surface composition are recorded, but the realization is not accepted and its live lifecycle remains unexercised.
- The user's postscript exposed a session-row overflow mismatch. Source and regression evidence now show it repaired, but PM-004 still needs a deployed interaction check before it is accepted.
- The exact UX for no-workspace creation failure, broken presets, large preset lists and error recovery is not explicit enough to treat as accepted.
- The new-conversation default marker, repeat-selection action and visible write failure require deployed interaction evidence before they are accepted.
- Runtime, current-source drift maintenance and owned uninstall evidence remain absent from this package.
