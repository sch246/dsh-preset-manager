window.__ModuleLoader__.load({
	id: "dsh-preset-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/**
		* `presetManager` namespace dictionaries: the preset-group tree (group rows,
		* session rows, management menus, rename dialog) and the shadow new-session
		* chip. Product copy is Simplified Chinese; runtime wire errors pass through
		* untranslated by policy (see DESIGN.md §5).
		*/
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"group.ungrouped": "未分组",
			"session.new": "新会话",
			"tree.aria": "预设分组",
			"empty.none": "暂无会话",
			"empty.noMatches": "无匹配结果",
			"empty.loading": "正在加载预设…",
			"empty.error": "预设名单加载失败",
			"retry": "重试",
			"sessions.expand": "展开其余 {n} 个会话",
			"sessions.collapse": "收起",
			"sessions.count.one": "{n} 个会话",
			"sessions.count.other": "{n} 个会话",
			"preset.broken": "不可用",
			"preset.hidden": "已隐藏",
			"preset.actions.aria": "预设“{name}”的操作",
			"preset.start.aria": "以预设“{name}”开始新会话",
			"menu.rename": "重命名",
			"menu.hide": "隐藏",
			"menu.unhide": "取消隐藏",
			"hide.rejected": "默认预设不能被隐藏，请先将另一个预设设为默认",
			"action.failed": "操作失败，请重试",
			"start.noWorkspace": "没有可用的工作区，无法新建会话",
			"rename.title": "重命名预设",
			"rename.hint": "只改显示名称与说明，不影响预设文件与 id",
			"field.name": "显示名称",
			"field.description": "说明",
			"seat.hint": "新会话预设",
			"seat.noDescription": "无说明",
			"seat.default": "默认",
			"seat.setDefault": "设为默认",
			"seat.unsetDefault": "取消默认",
			"time.now": "刚刚",
			"time.minutes": "{n}分钟",
			"time.hours": "{n}小时",
			"time.days": "{n}天",
			"time.months": "{n}个月",
			"time.years": "{n}年",
			"time.ago": "{t}前"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"group.ungrouped": "Ungrouped",
			"session.new": "New Session",
			"tree.aria": "Preset groups",
			"empty.none": "No sessions yet",
			"empty.noMatches": "No matches",
			"empty.loading": "Loading presets…",
			"empty.error": "Failed to load presets",
			"retry": "Retry",
			"sessions.expand": "Show {n} more sessions",
			"sessions.collapse": "Show less",
			"sessions.count.one": "{n} session",
			"sessions.count.other": "{n} sessions",
			"preset.broken": "Broken",
			"preset.hidden": "Hidden",
			"preset.actions.aria": "Preset actions for {name}",
			"preset.start.aria": "Start a new session with {name}",
			"menu.rename": "Rename",
			"menu.hide": "Hide",
			"menu.unhide": "Unhide",
			"hide.rejected": "The default preset cannot be hidden. Set another preset as default first.",
			"action.failed": "Action failed, please retry",
			"start.noWorkspace": "No workspace available to start a session",
			"rename.title": "Rename preset",
			"rename.hint": "Display name and description only; preset files and id are untouched",
			"field.name": "Display name",
			"field.description": "Description",
			"seat.hint": "Preset for the new session",
			"seat.noDescription": "No description",
			"seat.default": "Default",
			"seat.setDefault": "Set as default",
			"seat.unsetDefault": "Clear default",
			"time.now": "now",
			"time.minutes": "{n}min",
			"time.hours": "{n}h",
			"time.days": "{n}d",
			"time.months": "{n}mo",
			"time.years": "{n}y",
			"time.ago": "{t} ago"
		};
		/**
		* Fold and order the Host roster with the plugin's display state. Presets in
		* the complete managed order lead; Host additions not reconciled yet follow
		* in Host order.
		* @param presets - the Host roster with explicit-user-default flags projected.
		* @param state - the plugin store snapshot (`order` + `hidden` + `overrides`).
		* @returns one entry per preset, display facts resolved.
		*/
		function deriveRoster(presets, state) {
			const hidden = new Set(Array.isArray(state.hidden) ? state.hidden : []);
			const byId = new Map(presets.map((preset) => [preset.id, preset]));
			const ordered = [];
			const seen = /* @__PURE__ */ new Set();
			for (const id of state.order) {
				const preset = byId.get(id);
				if (preset === void 0 || seen.has(id)) continue;
				ordered.push(preset);
				seen.add(id);
			}
			for (const preset of presets) {
				if (seen.has(preset.id)) continue;
				ordered.push(preset);
				seen.add(preset.id);
			}
			return ordered.map((preset) => {
				const override = state.overrides?.[preset.id];
				return {
					id: preset.id,
					trust: preset.trust,
					isDefault: preset.isDefault,
					hidden: hidden.has(preset.id),
					broken: preset.broken !== void 0,
					displayName: override?.name ?? preset.name ?? preset.id,
					description: override?.description ?? preset.description
				};
			});
		}
		/**
		* Reconcile the complete order and independent hidden set so I1 and I2 hold:
		* - ids that no longer exist drop out; duplicates collapse (I2, deletion);
		* - preset ids the roster gained append at the end in roster order (I2, new);
		* - the default preset is removed from hidden (I1);
		* - a fresh v2 installation starts with `initialized:false`: every existing
		*   Host preset is appended visible, regardless of how many already exist;
		* - an old v1 snapshot has neither schema nor hidden: ids outside its visible
		*   `order` migrate to hidden while retaining a deterministic full order;
		* - the already-deployed intermediate complete-order model has `hidden` but
		*   no schema marker, so it upgrades in place without changing visibility.
		* Pure: returns the next state facts, never writes.
		* @param presets - the current roster.
		* @param stored - the hydrated store core, possibly an old whole-object snapshot.
		* @returns a current, initialized schema with reconciled order and hidden ids.
		*/
		function reconcile(presets, stored) {
			const order = Array.isArray(stored.order) ? stored.order.filter((id) => typeof id === "string") : [];
			const storedHidden = Array.isArray(stored.hidden) ? stored.hidden.filter((id) => typeof id === "string") : void 0;
			const legacyVisibleOrder = stored.schemaVersion !== 2 && storedHidden === void 0;
			const existing = new Set(presets.map((preset) => preset.id));
			const next = [];
			const seen = /* @__PURE__ */ new Set();
			for (const id of order) {
				if (!existing.has(id) || seen.has(id)) continue;
				next.push(id);
				seen.add(id);
			}
			const appended = [];
			for (const preset of presets) {
				if (seen.has(preset.id)) continue;
				next.push(preset.id);
				appended.push(preset.id);
				seen.add(preset.id);
			}
			const defaultId = presets.find((preset) => preset.isDefault)?.id;
			const hiddenSource = legacyVisibleOrder ? appended : storedHidden ?? [];
			const nextHidden = [];
			const hiddenSeen = /* @__PURE__ */ new Set();
			for (const id of hiddenSource) {
				if (!existing.has(id) || id === defaultId || hiddenSeen.has(id)) continue;
				nextHidden.push(id);
				hiddenSeen.add(id);
			}
			return {
				schemaVersion: 2,
				initialized: true,
				order: next,
				hidden: nextHidden
			};
		}
		/**
		* Plan a hide: I1 makes hiding the default preset impossible, so the plan
		* rejects it and the controller turns the rejection into a message instead
		* of touching visibility or settings.
		* @param presets - the current roster.
		* @param hidden - the stored hidden ids.
		* @param id - the preset to hide.
		* @returns the next hidden ids, or the rejection reason.
		*/
		function planHide(presets, hidden, id) {
			if (presets.some((preset) => preset.id === id && preset.isDefault)) return {
				ok: false,
				reason: "default"
			};
			return {
				ok: true,
				hidden: [...hidden.filter((existing) => existing !== id), id]
			};
		}
		/**
		* Plan an unhide: remove only the visibility marker; the complete order never
		* moved, so the preset returns to its prior position.
		* @param hidden - the stored hidden ids.
		* @param id - the preset to unhide.
		* @returns the next hidden ids.
		*/
		function planUnhide(hidden, id) {
			return hidden.filter((existing) => existing !== id);
		}
		/**
		* I3: when no preset is an explicit user default and the list has just become
		* empty, the user field must be unset so new sessions can use fallbacks.
		* @param presets - the current roster.
		* @param order - the complete current order.
		* @param nextHidden - hidden ids after the pending write.
		* @returns true when the controller must also `settings.mutate` unset the default.
		*/
		function shouldUnsetDefault(presets, order, nextHidden) {
			if (presets.some((preset) => preset.isDefault)) return false;
			const existing = new Set(presets.map((preset) => preset.id));
			const hidden = new Set(nextHidden);
			return !order.some((id) => existing.has(id) && !hidden.has(id));
		}
		/**
		* Derive the preset group tree.
		*
		* Layout: visible preset groups in `order` order → hidden preset groups
		* pinned after all visible ones (roster order) → the ungrouped bucket last
		* (workspace-browser convention). Sessions land in the group of their
		* `agentPreset`; sessions without one, or whose preset left the roster, go
		* ungrouped. Group titles and session titles filter against `query`; a group
		* stays while its title or any session matches.
		* @param list - the sessions list snapshot (`current` feeds blank visibility).
		* @param roster - derived roster entries (`deriveRoster`).
		* @param order - the stored visible order.
		* @param sessionNodes - official workspace projection (visibility and live status already resolved).
		* @param query - the browser's normalized search query ('' while idle).
		* @returns group sections in render order.
		*/
		function derivePresetGroups(list, sessionNodes, roster, order, query) {
			const q = query.trim().toLowerCase();
			const membersByPreset = /* @__PURE__ */ new Map();
			for (const node of sessionNodes) {
				const summary = list.byId[node.id];
				if (summary === void 0) continue;
				const projectedPreset = summary.projectionValues?.agentPreset;
				const presetId = typeof projectedPreset === "string" && roster.some((entry) => entry.id === projectedPreset) ? projectedPreset : void 0;
				const bucket = membersByPreset.get(presetId);
				if (bucket === void 0) membersByPreset.set(presetId, [node]);
				else bucket.push(node);
			}
			const filtered = (sessions) => q === "" ? [...sessions] : sessions.filter((session) => session.title.toLowerCase().includes(q));
			const titleMatches = (label, sessions) => q === "" || label.toLowerCase().includes(q) || sessions.some((session) => session.title.toLowerCase().includes(q));
			const rosterById = new Map(roster.map((entry) => [entry.id, entry]));
			const groups = [];
			const pushGroup = (entry, key, hidden) => {
				const label = entry === void 0 ? "Ungrouped" : entry.displayName;
				const bucketKey = key === "" ? void 0 : key;
				const members = membersByPreset.get(bucketKey) ?? [];
				if (entry !== void 0 && !titleMatches(label, members)) return;
				const sessions = filtered(members);
				if (key === "" && sessions.length === 0) return;
				groups.push({
					key,
					presetId: key === "" ? void 0 : key,
					label,
					description: entry?.description,
					hidden,
					broken: entry?.broken === true,
					sessionCount: sessions.length,
					sessions
				});
			};
			for (const id of order) {
				const entry = rosterById.get(id);
				if (entry === void 0 || entry.hidden) continue;
				pushGroup(entry, id, false);
			}
			const ordered = new Set(order);
			for (const id of order) {
				const entry = rosterById.get(id);
				if (entry === void 0 || !entry.hidden) continue;
				pushGroup(entry, entry.id, true);
			}
			for (const entry of roster) {
				if (!entry.hidden || ordered.has(entry.id)) continue;
				pushGroup(entry, entry.id, true);
			}
			pushGroup(void 0, "", false);
			return groups;
		}
		//#endregion
		//#region src/client/styles.ts
		/** Plugin-owned styling; official Workspace rows keep their own CSS authority. */
		const CSS = `
.pm-root { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.pm-list {
  display: flex; flex-direction: column; padding: 0 var(--dsw-sidebar-inline-padding)
    calc(var(--dsw-session-list-edge-inset) + 4px); overflow-y: auto; min-height: 0; flex: 1;
}
.pm-status, .pm-empty {
  padding: 10px 12px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary);
}
.pm-empty { color: var(--dsw-alias-label-dimmed); }
.pm-retry {
  border: none; background: transparent; padding: 0; font-size: 12px; line-height: 18px;
  color: var(--dsw-alias-state-business-primary); cursor: pointer;
}
.pm-notice {
  flex: none; margin: 0 var(--dsw-sidebar-inline-padding) 6px; padding: 6px 12px;
  font-size: 12px; line-height: 18px; border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px; color: var(--dsw-alias-state-warn-primary);
}
.pm-meta-items { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.pm-badge {
  flex: none; padding: 0 6px; border-radius: 8px; font-size: 11px; line-height: 16px;
  color: var(--dsw-alias-label-tertiary); border: 1px solid var(--dsw-alias-border-l2);
}
.pm-badge-broken { color: var(--dsw-alias-state-error-primary); }
.pm-group-count { flex: none; font-size: 12px; line-height: 20px; color: var(--dsw-alias-label-tertiary); }
.pm-action-contents { display: contents; }
.pm-icon-button {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border: none; background: transparent; padding: 0;
  border-radius: 4px; color: var(--dsw-alias-label-tertiary); cursor: pointer;
}
.pm-icon-button:hover { color: var(--dsw-alias-label-primary); }
.pm-icon-button:disabled { color: var(--dsw-alias-label-quaternary); cursor: default; }
.pm-seat-root { display: inline-flex; flex-direction: column; align-items: flex-start; min-width: 0; }
.pm-seat {
  display: inline-flex; align-items: center; gap: 4px; max-width: min(100%, 240px);
  min-height: 28px; padding: 0 8px; border: none; border-radius: 16px;
  background: transparent; color: var(--dsw-alias-label-primary); font-size: 13px;
  line-height: 20px; font-weight: 500; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; cursor: pointer;
}
.pm-seat:not(:disabled):hover, .pm-seat[aria-expanded='true'] { background: var(--dsw-alias-interactive-bg-hover); }
.pm-seat:disabled { cursor: default; color: var(--dsw-alias-label-quaternary); }
.pm-seat-icon, .pm-seat-chevron { flex: none; }
.pm-seat-icon { color: var(--dsw-alias-label-primary); }
.pm-seat-chevron { color: var(--dsw-alias-label-caption); }
.pm-seat-notice {
  margin-top: 2px; padding: 2px 8px; font-size: 11px; line-height: 16px;
  color: var(--dsw-alias-state-error-primary);
}
.pm-menu-item { display: flex; flex-direction: column; gap: 2px; max-width: 280px; }
.pm-menu-item-heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pm-menu-item-name { font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); }
.pm-menu-item-default, .pm-menu-item-default-action {
  flex: none; font-size: 11px; line-height: 16px; color: var(--dsw-alias-state-business-primary);
}
.pm-menu-item-default-action { display: none; }
.pm-menu-item-default-candidate:hover .pm-menu-item-default,
button:hover .pm-menu-item-default-candidate .pm-menu-item-default,
button:focus-visible .pm-menu-item-default-candidate .pm-menu-item-default { display: none; }
.pm-menu-item-default-candidate:hover .pm-menu-item-default-action,
button:hover .pm-menu-item-default-candidate .pm-menu-item-default-action,
button:focus-visible .pm-menu-item-default-candidate .pm-menu-item-default-action { display: inline; }
.pm-menu-item-desc {
  font-size: 12px; line-height: 16px; color: var(--dsw-alias-label-caption); white-space: normal;
}
.pm-rename-hint { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.pm-rename-fields { margin-top: 12px; }
.pm-rename-field { display: flex; flex-direction: column; gap: 4px; }
.pm-rename-field + .pm-rename-field { margin-top: 10px; }
.pm-rename-label { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.pm-rename-input, .pm-rename-textarea {
  width: 100%; box-sizing: border-box; padding: 6px 8px;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px;
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary);
  font-size: 13px; line-height: 20px; outline: none;
}
.pm-rename-input:focus, .pm-rename-textarea:focus { border-color: var(--dsw-alias-state-business-primary); }
.pm-rename-textarea { min-height: 72px; font-family: inherit; resize: vertical; }
`;
		/** The injected style element id, for diagnostics and HMR disposal. */
		const STYLE_ELEMENT_ID = "dsh-preset-manager-styles";
		/** Class names for the plugin-only decorations and dialogs. */
		const css = {
			root: "pm-root",
			list: "pm-list",
			status: "pm-status",
			empty: "pm-empty",
			retry: "pm-retry",
			notice: "pm-notice",
			metaItems: "pm-meta-items",
			badge: "pm-badge",
			badgeBroken: "pm-badge-broken",
			groupCount: "pm-group-count",
			actionContents: "pm-action-contents",
			iconButton: "pm-icon-button",
			seatRoot: "pm-seat-root",
			seat: "pm-seat",
			seatIcon: "pm-seat-icon",
			seatChevron: "pm-seat-chevron",
			seatNotice: "pm-seat-notice",
			menuItem: "pm-menu-item",
			menuItemHeading: "pm-menu-item-heading",
			menuItemName: "pm-menu-item-name",
			menuItemDesc: "pm-menu-item-desc",
			menuItemDefault: "pm-menu-item-default",
			menuItemDefaultAction: "pm-menu-item-default-action",
			menuItemDefaultCandidate: "pm-menu-item-default-candidate",
			renameHint: "pm-rename-hint",
			renameFields: "pm-rename-fields",
			renameField: "pm-rename-field",
			renameLabel: "pm-rename-label",
			renameInput: "pm-rename-input",
			renameTextarea: "pm-rename-textarea"
		};
		/** Install the plugin stylesheet once. */
		function installStyles() {
			if (document.getElementById("dsh-preset-manager-styles") !== null) return () => {};
			const style = document.createElement("style");
			style.id = STYLE_ELEMENT_ID;
			style.dataset.plugin = "dsh-preset-manager";
			style.textContent = CSS;
			document.head.appendChild(style);
			return () => {
				style.remove();
			};
		}
		installStyles();
		//#endregion
		//#region src/client/PresetMenu.tsx
		/**
		* The preset management menu (⋯): rename, and hide/unhide. The same menu
		* component serves both visible and hidden groups.
		*/
		/**
		* Render the management menu.
		* @param props - menu actions.
		* @returns the anchor button with its portal menu.
		*/
		function PresetMenu({ label, hidden, onRename, onHide, onUnhide, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const close = () => {
				setOpen(false);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: close,
				items: [{
					id: "rename",
					label: t("menu.rename")
				}, hidden ? {
					id: "unhide",
					label: t("menu.unhide")
				} : {
					id: "hide",
					label: t("menu.hide")
				}],
				onSelect: (id) => {
					close();
					if (id === "rename") onRename();
					else if (id === "hide") onHide();
					else onUnhide();
				},
				align: "end",
				dense: true,
				portal: true,
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: css.iconButton,
					"aria-label": t("preset.actions.aria", { name: label }),
					"aria-haspopup": "menu",
					"aria-expanded": open,
					onClick: () => {
						setOpen((value) => !value);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, {})
				})
			});
		}
		//#endregion
		//#region src/client/PresetRowDecorations.tsx
		/** Preset-only seats rendered inside the official Workspace project row. */
		/** Preset facts occupying the official project row's trailing metadata seat. */
		function PresetRowMeta({ group, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: css.metaItems,
				children: [
					group.broken && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${css.badge} ${css.badgeBroken}`,
						children: t("preset.broken")
					}),
					group.hidden && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: css.badge,
						children: t("preset.hidden")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: css.groupCount,
						children: group.sessionCount === 1 ? t("sessions.count.one", { n: group.sessionCount }) : t("sessions.count.other", { n: group.sessionCount })
					})
				]
			});
		}
		/** Preset management controls occupying the official project row action seat. */
		function PresetRowActions({ group, workspaces, onStartSession, onRename, onHide, onUnhide, t }) {
			const [plusOpen, setPlusOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: css.actionContents,
				onClick: (event) => {
					event.stopPropagation();
				},
				children: [workspaces.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open: plusOpen,
					onClose: () => {
						setPlusOpen(false);
					},
					items: workspaces.map((workspace) => ({
						id: workspace.id,
						label: workspace.title
					})),
					onSelect: (workspaceId) => {
						setPlusOpen(false);
						onStartSession(workspaceId);
					},
					align: "end",
					dense: true,
					portal: true,
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: css.iconButton,
						"aria-label": t("preset.start.aria", { name: group.label }),
						title: t("preset.start.aria", { name: group.label }),
						"aria-haspopup": "menu",
						"aria-expanded": plusOpen,
						disabled: group.broken,
						onClick: () => {
							setPlusOpen((value) => !value);
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
					})
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: css.iconButton,
					"aria-label": t("preset.start.aria", { name: group.label }),
					title: t("preset.start.aria", { name: group.label }),
					disabled: group.broken,
					onClick: () => {
						onStartSession(void 0);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetMenu, {
					label: group.label,
					hidden: group.hidden,
					onRename,
					onHide,
					onUnhide,
					t
				})]
			});
		}
		//#endregion
		//#region src/client/RenameDialog.tsx
		/**
		* The rename dialog: display name + description overrides. Confirming writes
		* only the plugin store (`overrides`); preset files and ids are untouched.
		*/
		/**
		* Render the rename modal.
		* @param props - target entry and callbacks.
		* @returns the modal.
		*/
		function RenameDialog({ entry, onConfirm, onClose, t }) {
			const [name, setName] = (0, react.useState)(entry.displayName);
			const [description, setDescription] = (0, react.useState)(entry.description ?? "");
			const composing = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				setName(entry.displayName);
				setDescription(entry.description ?? "");
			}, [entry]);
			const blocked = name.trim() === "";
			const confirm = () => {
				if (blocked) return;
				onConfirm({
					name: name.trim(),
					description: description.trim()
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				closeLabel: t("close"),
				title: t("rename.title"),
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: onClose,
					children: t("cancel")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: blocked,
					onClick: confirm,
					children: t("save")
				})] }),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: css.renameHint,
					children: t("rename.hint")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: css.renameFields,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.renameField,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: css.renameLabel,
							htmlFor: "pm-rename-name",
							children: t("field.name")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: "pm-rename-name",
							className: css.renameInput,
							value: name,
							autoFocus: true,
							onFocus: (e) => {
								e.target.select();
							},
							onChange: (e) => {
								setName(e.target.value);
							},
							onCompositionStart: () => {
								composing.current = true;
							},
							onCompositionEnd: () => {
								composing.current = false;
							},
							onKeyDown: (e) => {
								if (e.key === "Enter" && !composing.current) {
									e.preventDefault();
									confirm();
								}
							}
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.renameField,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: css.renameLabel,
							htmlFor: "pm-rename-desc",
							children: t("field.description")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							id: "pm-rename-desc",
							className: css.renameTextarea,
							value: description,
							rows: 4,
							onChange: (e) => {
								setDescription(e.target.value);
							}
						})]
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/PresetGroups.tsx
		/**
		* The preset-group tree filling the patched `sidebar.workspaces.presetGroups`
		* child slot: visible preset groups in `order` order, hidden groups dimmed
		* and pinned at the end, and the ungrouped bucket last. Rows manage the
		* whole display layer (drag / hide / unhide / rename / new session)
		* through the injected face; all derivation stays in roster.ts.
		*/
		/** Session rows visible per group before the local overflow control. */
		const COLLAPSED_SESSION_LIMIT = 5;
		/** Accept native drops at document level while a row drag is active (mirror of the workspace browser). */
		function useNativeDragAcceptance(active) {
			(0, react.useEffect)(() => {
				if (!active) return;
				const acceptDrag = (event) => {
					event.preventDefault();
					if (event.dataTransfer !== null) event.dataTransfer.dropEffect = "move";
				};
				const acceptDrop = (event) => {
					event.preventDefault();
				};
				document.addEventListener("dragover", acceptDrag);
				document.addEventListener("drop", acceptDrop);
				return () => {
					document.removeEventListener("dragover", acceptDrag);
					document.removeEventListener("drop", acceptDrop);
				};
			}, [active]);
		}
		/**
		* Render the preset group tree.
		* @param props - composed slot props.
		* @returns the tree element.
		*/
		function PresetGroups({ query, rows, sessionActions, useSessions, useSessionPendingInteraction, useWorkspaces, useStore, actions, useRoster, load, open, startSessionByPreset, hide, unhide, rename, t }) {
			const list = useSessions((snapshot) => snapshot);
			const workspaceItems = useWorkspaces((snapshot) => snapshot.items);
			const archivedSessionIds = useWorkspaces((snapshot) => snapshot.archivedSessionIds);
			const pendingInteractions = useSessionPendingInteraction((snapshot) => snapshot);
			const state = useStore((snapshot) => snapshot);
			const rosterSnapshot = useRoster((snapshot) => snapshot);
			const [expandedGroups, setExpandedGroups] = (0, react.useState)([]);
			const [expandedSessionGroups, setExpandedSessionGroups] = (0, react.useState)([]);
			const [drag, setDrag] = (0, react.useState)(null);
			const dropCommitted = (0, react.useRef)(false);
			const [notice, setNotice] = (0, react.useState)(null);
			const noticeTimer = (0, react.useRef)(void 0);
			const [renameTarget, setRenameTarget] = (0, react.useState)(null);
			const expandedInitialized = (0, react.useRef)(false);
			useNativeDragAcceptance(drag !== null);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			(0, react.useEffect)(() => () => {
				window.clearTimeout(noticeTimer.current);
			}, []);
			const showNotice = (key) => {
				setNotice(key);
				window.clearTimeout(noticeTimer.current);
				noticeTimer.current = window.setTimeout(() => {
					setNotice(null);
				}, 4e3);
			};
			const roster = (0, react.useMemo)(() => deriveRoster(rosterSnapshot.presets, state), [rosterSnapshot.presets, state]);
			const sessionNodes = (0, react.useMemo)(() => rows.deriveSessions(list, archivedSessionIds, pendingInteractions), [
				rows,
				list,
				archivedSessionIds,
				pendingInteractions
			]);
			const groups = (0, react.useMemo)(() => derivePresetGroups(list, sessionNodes, roster, state.order, query), [
				list,
				sessionNodes,
				roster,
				state.order,
				query
			]);
			const workspaceBySession = (0, react.useMemo)(() => {
				const map = /* @__PURE__ */ new Map();
				for (const workspace of workspaceItems) for (const sessionId of workspace.sessionIds) if (!map.has(sessionId)) map.set(sessionId, workspace.title);
				return map;
			}, [workspaceItems]);
			const workspaceLabelOf = (sessionId) => {
				const listed = workspaceBySession.get(sessionId);
				if (listed !== void 0) return listed;
				const cwd = list.byId[sessionId]?.cwd;
				return cwd === void 0 || cwd === "" ? void 0 : rows.workspaceLabel(cwd);
			};
			const workspaceChoices = (0, react.useMemo)(() => workspaceItems.map((workspace) => ({
				id: workspace.workspaceId,
				title: workspace.title
			})), [workspaceItems]);
			(0, react.useEffect)(() => {
				if (list.phase !== "ready" || expandedInitialized.current || groups.length === 0) return;
				expandedInitialized.current = true;
				const currentGroup = groups.find((group) => group.sessions.some((node) => node.id === list.current))?.key;
				setExpandedGroups(currentGroup === void 0 ? [] : [currentGroup]);
			}, [list, groups]);
			const commitDrag = (active, over) => {
				if (dropCommitted.current) return;
				dropCommitted.current = true;
				setDrag(null);
				const source = state.order;
				const sourceIndex = source.indexOf(active.sourceId);
				if (sourceIndex === -1) return;
				const targetIndex = source.indexOf(over.id);
				if (targetIndex === -1) return;
				const anchor = over.half === "before" ? over.id : source[targetIndex + 1];
				if (anchor === active.sourceId) return;
				const anchorIndex = anchor === void 0 ? source.length : source.indexOf(anchor);
				if (anchorIndex === sourceIndex || anchorIndex === sourceIndex + 1) return;
				const next = source.filter((id) => id !== active.sourceId);
				const insertAt = anchor === void 0 ? next.length : next.indexOf(anchor);
				next.splice(insertAt === -1 ? next.length : insertAt, 0, active.sourceId);
				actions.setOrder(next);
			};
			const now = Date.now();
			const toggle = (key) => {
				setExpandedGroups((keys) => keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]);
			};
			const run = (promise) => {
				promise.then((key) => {
					if (key !== void 0) showNotice(key);
				});
			};
			let status = null;
			if (groups.length === 0) {
				if (rosterSnapshot.status === "error") status = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: css.status,
					children: [
						t("empty.error"),
						" ",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: css.retry,
							onClick: () => {
								load();
							},
							children: t("retry")
						})
					]
				});
				else if (rosterSnapshot.status !== "ready") status = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: css.status,
					children: t("empty.loading")
				});
				else if (query.trim() !== "") status = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: css.empty,
					children: t("empty.noMatches")
				});
				else status = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: css.empty,
					children: t("empty.none")
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: css.root,
				children: [
					notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: css.notice,
						role: "status",
						children: t(notice)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.list,
						role: "tree",
						"aria-label": t("tree.aria"),
						children: [status, groups.map((group) => {
							const expanded = expandedGroups.includes(group.key);
							const overflowExpanded = expandedSessionGroups.includes(group.key);
							const shown = !expanded ? [] : overflowExpanded ? group.sessions : group.sessions.slice(0, COLLAPSED_SESSION_LIMIT);
							const entry = group.presetId === void 0 ? void 0 : roster.find((r) => r.id === group.presetId);
							const marker = drag !== null && drag.over?.id === group.key ? drag.over.half : null;
							const canDrag = group.presetId !== void 0 && !group.hidden;
							const row = {
								key: group.key,
								workspaceId: void 0,
								cwd: void 0,
								createdAt: void 0,
								label: group.label,
								sessionCount: group.sessionCount,
								expanded,
								containsCurrent: group.sessions.some((node) => node.id === list.current),
								sessions: expanded ? group.sessions : []
							};
							const projectRow = rows.renderProjectRow({
								group: row,
								label: group.presetId === void 0 ? t("group.ungrouped") : group.label,
								muted: group.hidden,
								meta: group.presetId === void 0 ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetRowMeta, {
									group,
									t
								}),
								rowActions: group.presetId === void 0 ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetRowActions, {
									group,
									workspaces: workspaceChoices,
									onStartSession: (workspaceId) => {
										startSessionByPreset(group.presetId, workspaceId).then((key) => {
											if (key !== void 0) showNotice(key);
										});
									},
									onRename: () => {
										if (entry !== void 0) setRenameTarget(entry);
									},
									onHide: () => {
										run(hide(state, group.presetId));
									},
									onUnhide: () => {
										unhide(state, group.presetId);
									},
									t
								}),
								...canDrag ? { drag: {
									start: () => {
										dropCommitted.current = false;
										setDrag({
											sourceId: group.key,
											over: null
										});
									},
									end: () => {
										if (drag !== null && drag.over !== null) commitDrag(drag, drag.over);
										else setDrag(null);
										dropCommitted.current = false;
									}
								} } : {},
								onToggle: () => {
									if (expanded) setExpandedSessionGroups((keys) => keys.filter((key) => key !== group.key));
									toggle(group.key);
								}
							});
							const sessionRows = shown.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: rows.renderSessionRow({
								node,
								currentId: list.current,
								now,
								meta: workspaceLabelOf(node.id),
								onOpen: open,
								...sessionActions
							}) }, node.id));
							const overflow = expanded && group.sessions.length > COLLAPSED_SESSION_LIMIT ? rows.renderSessionOverflow({
								expanded: overflowExpanded,
								remaining: group.sessions.length - COLLAPSED_SESSION_LIMIT,
								onToggle: () => {
									setExpandedSessionGroups((keys) => keys.includes(group.key) ? keys.filter((key) => key !== group.key) : [...keys, group.key]);
								}
							}) : null;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: rows.renderProjectGroup({
								...canDrag ? { drag: {
									active: drag !== null,
									marker,
									hover: (half) => {
										setDrag((active) => active === null ? active : {
											...active,
											over: {
												id: group.key,
												half
											}
										});
									},
									drop: (half) => {
										if (drag !== null) commitDrag(drag, {
											id: group.key,
											half
										});
									}
								} } : {},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									projectRow,
									sessionRows,
									overflow
								] })
							}) }, group.key);
						})]
					}),
					renameTarget !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RenameDialog, {
						entry: renameTarget,
						onClose: () => {
							setRenameTarget(null);
						},
						onConfirm: (override) => {
							rename(renameTarget.id, override);
							setRenameTarget(null);
						},
						t
					}, renameTarget.id)
				]
			});
		}
		//#endregion
		//#region src/client/seat-menu.ts
		/**
		* Classify a hero-menu pick without coupling preset selection to default writes.
		* @param currentId - preset currently selected for the new session.
		* @param defaultId - explicit user-default preset, when one exists.
		* @param pickedId - menu row the user selected.
		* @returns the single business action for this pick.
		*/
		function classifySeatPick(currentId, defaultId, pickedId) {
			if (pickedId !== currentId) return "select";
			return pickedId === defaultId ? "unset-default" : "set-default";
		}
		/**
		* Project the visible hero menu and its default/action labels.
		* @param roster - display roster derived from Host presets and plugin state.
		* @param currentId - preset currently selected for the new session.
		* @returns visible, healthy options in roster order.
		*/
		function projectSeatOptions(roster, currentId) {
			return roster.filter((entry) => !entry.hidden && !entry.broken).map((entry) => ({
				id: entry.id,
				trust: entry.trust,
				displayName: entry.displayName,
				description: entry.description,
				isDefault: entry.isDefault,
				defaultAction: entry.id === currentId ? entry.isDefault ? "unset-default" : "set-default" : void 0
			}));
		}
		//#endregion
		//#region src/client/SeatChip.tsx
		/**
		* The shadow new-session preset chip (priority -1 over the official
		* `conversation.hero.agentPreset` entry; uninstalling the plugin restores
		* the official chip). The selection follows the current Session;
		* the roster is the plugin's derived list: only visible (ordered) presets,
		* display overrides applied, opened by the explicit-default → recent Session
		* → managed-order priority. Repeating the selected row sets or clears the
		* explicit user default.
		*/
		/**
		* Render the shadow new-session chip.
		* @param props - composed slot props.
		* @returns the chip, or null when no selectable preset remains.
		*/
		function SeatChip({ useRoster, useStore, useSeat, load, sync, select, setDefault, unsetDefault, t }) {
			const rosterSnapshot = useRoster((snapshot) => snapshot);
			const state = useStore((s) => s);
			const seat = useSeat((snapshot) => snapshot);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			const roster = (0, react.useMemo)(() => deriveRoster(rosterSnapshot.presets, state), [rosterSnapshot.presets, state]);
			(0, react.useEffect)(() => {
				if (rosterSnapshot.status === "ready") sync(roster);
			}, [
				rosterSnapshot.status,
				roster,
				sync
			]);
			const options = (0, react.useMemo)(() => projectSeatOptions(roster, seat.current), [roster, seat.current]);
			const chosen = options.find((option) => option.id === seat.current);
			const defaultId = options.find((option) => option.isDefault)?.id;
			const [open, setOpen] = (0, react.useState)(false);
			const [notice, setNotice] = (0, react.useState)(null);
			const [defaultBusy, setDefaultBusy] = (0, react.useState)(false);
			if (chosen === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: css.seatRoot,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
						open,
						onClose: () => {
							setOpen(false);
						},
						items: options.map((option) => ({
							id: option.id,
							label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: `${css.menuItem}${option.defaultAction !== void 0 ? ` ${css.menuItemDefaultCandidate}` : ""}`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: css.menuItemHeading,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: css.menuItemName,
											children: option.displayName
										}),
										option.isDefault && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: css.menuItemDefault,
											children: t("seat.default")
										}),
										option.defaultAction !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: css.menuItemDefaultAction,
											children: t(option.defaultAction === "set-default" ? "seat.setDefault" : "seat.unsetDefault")
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: css.menuItemDesc,
									children: option.description ?? t("seat.noDescription")
								})]
							})
						})),
						selectedId: chosen.id,
						onSelect: (id) => {
							setOpen(false);
							const action = classifySeatPick(chosen.id, defaultId, id);
							setNotice(null);
							if (action === "select") {
								select(id);
								return;
							}
							setDefaultBusy(true);
							(action === "set-default" ? setDefault(id) : unsetDefault(id)).then((failure) => {
								setNotice(failure ?? null);
							}).catch(() => {
								setNotice("action.failed");
							}).finally(() => {
								setDefaultBusy(false);
							});
						},
						align: "start",
						portal: true,
						anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: css.seat,
							"aria-haspopup": "menu",
							"aria-expanded": open,
							title: seat.error ?? t("seat.hint"),
							disabled: seat.busy || defaultBusy,
							onClick: () => {
								setOpen((value) => !value);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, { className: css.seatIcon }),
								chosen.displayName,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: css.seatChevron })
							]
						})
					}),
					seat.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: css.seatNotice,
						role: "alert",
						children: seat.error
					}),
					notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: css.seatNotice,
						role: "alert",
						children: t(notice)
					})
				]
			});
		}
		//#endregion
		//#region src/client/start-session.ts
		/**
		* Start a blank Session with one preset in an explicitly chosen Workspace.
		* @param actions - public Workspace, preset, seat, and Session operations.
		* @param presetId - requested preset identity.
		* @param workspaceId - explicit target from the row popup.
		* @returns a visible failure key, or undefined after navigation.
		*/
		async function startPresetSession(actions, presetId, workspaceId) {
			if (workspaceId === void 0) return "start.noWorkspace";
			try {
				const sessionId = await actions.connectWorkspace(workspaceId);
				const selected = await actions.selectPreset(sessionId, presetId);
				if (!selected.ok) {
					console.warn("preset selection failed:", selected);
					return "action.failed";
				}
				actions.acceptSelection(sessionId, selected.value);
				actions.open(sessionId);
				return;
			} catch (error) {
				console.warn("preset session start failed:", error);
				return "action.failed";
			}
		}
		//#endregion
		//#region src/client/stores.ts
		/**
		* The plugin's viewing store: complete order, independent hidden ids, and
		* display overrides. Module level exports the factory only (a module-level handle
		* would pin the store identity across plugin reloads); both registrations
		* (the preset tree and the shadow seat chip) receive the same handle, so the
		* framework resolves ONE root instance they share.
		*/
		/**
		* Create the preset manager store handle.
		* @returns the store handle (spec + type + identity + factory in one).
		*/
		function createPresetManagerStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					schemaVersion: 2,
					initialized: false,
					order: [],
					hidden: [],
					overrides: {}
				}),
				persist: "dsh.presetManager.v1",
				actions: {
					setOrder: (d, order) => {
						d.order = order;
					},
					setHidden: (d, hidden) => {
						d.hidden = hidden;
					},
					reconcileState: (d, presets) => {
						const next = reconcile(presets, d);
						d.schemaVersion = next.schemaVersion;
						d.initialized = next.initialized;
						d.order = next.order;
						d.hidden = next.hidden;
						if (d.overrides === void 0 || d.overrides === null || Array.isArray(d.overrides)) d.overrides = {};
					},
					ensureDefaultVisible: (d, id) => {
						if (!Array.isArray(d.hidden) || !d.hidden.includes(id)) return;
						d.hidden = d.hidden.filter((existing) => existing !== id);
					},
					setOverride: (d, id, override) => {
						if (d.overrides === void 0 || d.overrides === null || Array.isArray(d.overrides)) d.overrides = {};
						d.overrides[id] = {
							...d.overrides[id],
							...override
						};
					}
				}
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** The agent-preset settings namespace on the host wire (stable official name). */
		const AGENT_PRESET_SETTINGS_NS = "agent-presets";
		/** Dictionary namespace owned by this plugin. */
		const NS = "presetManager";
		/** Human text for a rejected wire call (transport rejects or refuses). */
		function messageOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/** Read only the raw user layer; the resolved value may contain a deployment fallback. */
		function explicitUserDefault(settings) {
			const snapshot = settings.getSnapshot();
			if (snapshot.status === "idle" || snapshot.status === "loading") throw new Error("agent-preset settings are not ready");
			const user = (snapshot.view?.namespaces.find((candidate) => candidate.ns === AGENT_PRESET_SETTINGS_NS))?.user;
			if (typeof user !== "object" || user === null || Array.isArray(user)) return void 0;
			const value = user.default;
			return typeof value === "string" ? value : void 0;
		}
		/** Replace the Host fallback flag with the explicit user-default projection. */
		function projectExplicitDefault(presets, explicitDefaultId) {
			return presets.map((preset) => ({
				...preset,
				isDefault: preset.id === explicitDefaultId
			}));
		}
		/** Persist one preset as the explicit user default. */
		async function writeDefaultPreset(remote, settings, id) {
			try {
				const response = await remote.settings.update(AGENT_PRESET_SETTINGS_NS, { default: id }, void 0);
				if (!response.ok) return response.error.message;
				settings.acceptView(response.value);
				return;
			} catch (error) {
				return messageOf(error);
			}
		}
		/** Clear the user default so selection can fall back to the recent Session. */
		async function clearDefaultPreset(remote, settings) {
			try {
				const response = await remote.settings.mutate(AGENT_PRESET_SETTINGS_NS, [{
					op: "unset",
					path: ["default"]
				}], void 0);
				if (!response.ok) return response.error.message;
				settings.acceptView(response.value);
				return;
			} catch (error) {
				return messageOf(error);
			}
		}
		/**
		* Roster lifecycle, default projection, and management sequencing. Pure
		* decisions live in roster.ts; this controller reserves full reads and
		* reconcile for lifecycle refreshes while settings writes and mirror updates
		* project onto the held roster (DESIGN.md §4.2).
		*/
		var RosterController = class {
			remote;
			settings;
			/** Roster snapshot shared by the tree and the shadow chip. */
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({
				status: "idle",
				error: null,
				presets: []
			});
			generation = 0;
			constructor(remote, settings) {
				this.remote = remote;
				this.settings = settings;
			}
			set(patch) {
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
			/** Project the mirrored user default without invalidating roster identity or managed state. */
			projectDefault(actions) {
				const settingsSnapshot = this.settings.getSnapshot();
				if (settingsSnapshot.status === "idle" || settingsSnapshot.status === "loading") return;
				const explicitDefaultId = explicitUserDefault(this.settings);
				const before = this.store.getSnapshot();
				if (explicitDefaultId !== void 0 && before.presets.some((preset) => preset.id === explicitDefaultId)) actions?.ensureDefaultVisible(explicitDefaultId);
				let changed = false;
				const presets = before.presets.map((preset) => {
					const isDefault = preset.id === explicitDefaultId;
					if (preset.isDefault === isDefault) return preset;
					changed = true;
					return {
						...preset,
						isDefault
					};
				});
				if (changed) this.set({ presets });
			}
			/** Read roster and explicit user default, then reconcile the stored order (I1/I2). */
			async load(actions) {
				const generation = ++this.generation;
				this.set({
					status: "loading",
					error: null
				});
				let presets;
				try {
					const [response] = await Promise.all([this.remote.agentPresets.list(), this.settings.ensure()]);
					if (!response.ok) throw new Error(response.error.message);
					presets = projectExplicitDefault(response.value.presets, explicitUserDefault(this.settings));
				} catch (error) {
					if (generation !== this.generation) return;
					this.set({
						status: "error",
						error: messageOf(error),
						presets: []
					});
					return;
				}
				if (generation !== this.generation) return;
				actions?.reconcileState(presets);
				this.set({
					status: "ready",
					error: null,
					presets
				});
			}
			/** Set one visible hero-menu preset as the user default. */
			async setDefault(id) {
				const { presets } = this.store.getSnapshot();
				if (!presets.some((preset) => preset.id === id)) return "action.failed";
				if (await writeDefaultPreset(this.remote, this.settings, id) !== void 0) return "action.failed";
			}
			/** Clear the explicit user default without changing the selected preset. */
			async unsetDefault(id) {
				const { presets } = this.store.getSnapshot();
				if (!presets.some((preset) => preset.id === id && preset.isDefault)) return "action.failed";
				if (await clearDefaultPreset(this.remote, this.settings) !== void 0) return "action.failed";
			}
			/** Hide a preset; the default one is rejected (I1), and I3 may unset the default. */
			async hide(actions, state, id) {
				const { presets } = this.store.getSnapshot();
				const plan = planHide(presets, state.hidden ?? [], id);
				if (!plan.ok) return "hide.rejected";
				actions.setHidden(plan.hidden);
				if (shouldUnsetDefault(presets, state.order, plan.hidden)) {
					const failure = await clearDefaultPreset(this.remote, this.settings);
					if (failure !== void 0) console.warn("preset default unset failed:", failure);
				}
			}
			/** Unhide without moving the preset's stable order position. */
			async unhide(actions, state, id) {
				actions.setHidden(planUnhide(state.hidden ?? [], id));
			}
			/** Write the display name/description override (store only). */
			async rename(actions, id, override) {
				actions.setOverride(id, override);
			}
		};
		/** Keeps the hero selection attached to the current Session. */
		var SeatController = class {
			remote;
			currentSession;
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({
				current: "",
				error: null,
				busy: false
			});
			roster = [];
			sessionId;
			/** A choice belongs to one page; an unbound choice follows its first Session. */
			manualSelection;
			/** Successful Remote result while the Session list projection catches up. */
			appliedSelection;
			flight;
			disposed = false;
			generation = 0;
			constructor(remote, currentSession) {
				this.remote = remote;
				this.currentSession = currentSession;
			}
			set(patch) {
				if (this.disposed) return;
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
			/** Read the current Session and retire choices belonging to the previous page. */
			session() {
				const session = this.currentSession();
				if (session?.id !== this.sessionId) {
					this.generation++;
					if (this.sessionId !== void 0) this.manualSelection = void 0;
					this.appliedSelection = void 0;
					this.sessionId = session?.id;
					this.set({
						current: presetOf(session) ?? "",
						error: null,
						busy: false
					});
				}
				return session;
			}
			/** Refresh the selectable roster without replacing a manual choice on this page. */
			sync(roster) {
				this.roster = roster.filter((entry) => !entry.hidden && !entry.broken);
				if (!this.roster.some((entry) => entry.id === this.manualSelection)) this.manualSelection = void 0;
				this.apply();
			}
			/** Apply a manual choice to this blank Session, or retain it until a Session exists. */
			async select(id) {
				this.session();
				if (this.store.getSnapshot().busy) return;
				this.manualSelection = id;
				this.set({ error: null });
				await this.apply();
			}
			/** Preserve the current Session's selection while setting or clearing the default. */
			retainSelection(id) {
				this.session();
				this.manualSelection = id;
			}
			/** Adopt the exact Session already selected by the preset-group start operation. */
			acceptSelection(sessionId, id) {
				this.generation++;
				this.sessionId = sessionId;
				this.manualSelection = id;
				this.appliedSelection = {
					id,
					previous: void 0
				};
				this.set({
					current: id,
					error: null,
					busy: false
				});
			}
			/** Reconcile the displayed preset and apply an initial or manual choice once. */
			async apply() {
				if (this.disposed) return;
				const session = this.session();
				const projected = presetOf(session);
				if (this.appliedSelection !== void 0 && (projected === this.appliedSelection.id || this.appliedSelection.previous !== void 0 && projected !== this.appliedSelection.previous)) this.appliedSelection = void 0;
				const actual = session?.blank ? this.appliedSelection?.id ?? projected : projected;
				const desired = this.manualSelection ?? this.roster.find((entry) => entry.isDefault)?.id ?? (this.roster.some((entry) => entry.id === actual) ? actual : void 0) ?? this.roster[0]?.id;
				if (session === void 0) {
					this.set({
						current: desired ?? "",
						busy: false
					});
					return;
				}
				if (!session.blank) {
					this.manualSelection = void 0;
					this.set({
						current: actual ?? "",
						busy: false
					});
					return;
				}
				if (this.flight !== void 0) {
					this.set({
						current: actual ?? "",
						busy: true
					});
					await this.flight;
					return this.apply();
				}
				if (desired === void 0 || desired === actual || this.store.getSnapshot().error !== null) {
					this.set({
						current: actual ?? "",
						busy: false
					});
					return;
				}
				this.set({
					current: actual ?? "",
					busy: true
				});
				const generation = this.generation;
				const flight = Promise.resolve().then(async () => {
					try {
						const response = await this.remote.agentPresets.select(session.id, desired);
						if (this.disposed || generation !== this.generation || this.currentSession()?.id !== session.id) return;
						if (!response.ok) throw new Error(response.error.message);
						this.manualSelection = response.value;
						this.appliedSelection = {
							id: response.value,
							previous: projected
						};
						this.set({
							current: response.value,
							busy: false
						});
					} catch (error) {
						if (this.disposed || generation !== this.generation || this.currentSession()?.id !== session.id) return;
						this.manualSelection = void 0;
						this.set({
							current: this.appliedSelection?.id ?? presetOf(this.currentSession()) ?? "",
							busy: false,
							error: messageOf(error)
						});
					}
				});
				this.flight = flight;
				await flight;
				if (this.flight === flight) this.flight = void 0;
			}
			/** Ignore late Remote responses after this plugin scope is released. */
			dispose() {
				this.disposed = true;
			}
		};
		/** Current agent-preset projection carried by one Session list row. */
		function presetOf(session) {
			const value = session?.projectionValues?.agentPreset;
			return typeof value === "string" ? value : void 0;
		}
		/** Required services (cordis fiber inject); the inner scope adds conversation/sessions/workspaces. */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.agentPresets",
			"remote.settings",
			"settingsScope",
			"sessions",
			"uiWorkspace"
		];
		/**
		* Register the preset tree (once the patched slot is declared) and the
		* shadow seat chip (in the conversation scope).
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const settings = ctx.settingsScope.describe();
			const controller = new RosterController(ctx.remote, settings);
			const presetStore = createPresetManagerStore();
			let currentActions;
			let startSessionByPreset = async () => "action.failed";
			let seatRef;
			startSessionByPreset = async (id, workspaceId) => {
				return startPresetSession({
					connectWorkspace: (target) => ctx.uiWorkspace.connectWorkspace(target),
					selectPreset: (sessionId, presetId) => ctx.remote.agentPresets.select(sessionId, presetId),
					acceptSelection: (sessionId, selected) => seatRef?.acceptSelection(sessionId, selected),
					open: (sessionId) => ctx.sessions.open(sessionId)
				}, id, workspaceId);
			};
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-preset-manager: dictionaries");
			ctx.effect(() => settings.subscribe(() => {
				const snapshot = settings.getSnapshot();
				if (snapshot.status === "ready" || snapshot.status === "unavailable") controller.projectDefault(currentActions);
			}), "dsh-preset-manager: default projection");
			ctx.effect(() => ctx.on("connection/reset", () => {
				controller.load(currentActions);
			}), "dsh-preset-manager: roster connection refresh");
			const treeInjected = (actions) => {
				currentActions = actions;
				controller.projectDefault(actions);
				return {
					hooks: { roster: controller.store },
					load: () => controller.load(actions),
					open: (sessionId) => {
						ctx.sessions.open(sessionId);
					},
					startSessionByPreset: (id, workspaceId) => startSessionByPreset(id, workspaceId),
					hide: (state, id) => controller.hide(actions, state, id),
					unhide: (state, id) => controller.unhide(actions, state, id),
					rename: (id, override) => controller.rename(actions, id, override)
				};
			};
			ctx.slots.inject("sidebar.workspaces.presetGroups", () => ctx.slots.register({
				name: "sidebar.workspaces.presetGroups",
				store: presetStore,
				inject: treeInjected,
				locale: NS
			}, PresetGroups));
			ctx.inject([
				"slots",
				"conversation",
				"sessions",
				"remote",
				"remote.agentPresets"
			], (scope) => {
				const seatCtl = new SeatController(scope.remote, () => {
					const state = scope.sessions.list.getSnapshot();
					const summary = state.current === void 0 ? void 0 : state.byId[state.current];
					return summary === void 0 ? void 0 : {
						id: summary.id,
						blank: summary.blank,
						...summary.projectionValues === void 0 ? {} : { projectionValues: summary.projectionValues }
					};
				});
				seatRef = seatCtl;
				scope.effect(() => {
					const stop = scope.sessions.list.subscribe(() => {
						seatCtl.apply();
					});
					const seatInjected = (actions) => {
						currentActions = actions;
						controller.projectDefault(actions);
						return {
							hooks: {
								seat: seatCtl.store,
								roster: controller.store
							},
							load: () => controller.load(actions),
							sync: (roster) => {
								seatCtl.sync(roster);
							},
							select: (id) => seatCtl.select(id),
							setDefault: (id) => {
								seatCtl.retainSelection(id);
								return controller.setDefault(id);
							},
							unsetDefault: (id) => {
								seatCtl.retainSelection(id);
								return controller.unsetDefault(id);
							}
						};
					};
					const chip = scope.slots.register({
						name: "conversation.hero.agentPreset",
						priority: -1,
						store: presetStore,
						inject: seatInjected,
						locale: NS
					}, SeatChip);
					return () => {
						stop();
						seatCtl.dispose();
						chip();
						if (seatRef === seatCtl) seatRef = void 0;
					};
				}, "dsh-preset-manager: shadow seat chip");
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map