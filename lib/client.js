window.__ModuleLoader__.load({
	id: "dsh-preset-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
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
			"preset.default.aria": "设为默认预设",
			"preset.actions.aria": "预设“{name}”的操作",
			"preset.start.aria": "以预设“{name}”开始新会话",
			"menu.rename": "重命名",
			"menu.hide": "隐藏",
			"menu.unhide": "取消隐藏",
			"hide.rejected": "默认预设不能被隐藏，请先星标另一个预设",
			"action.failed": "操作失败，请重试",
			"start.noWorkspace": "没有可用的工作区，无法新建会话",
			"rename.title": "重命名预设",
			"rename.hint": "只改显示名称与说明，不影响预设文件与 id",
			"field.name": "显示名称",
			"field.description": "说明",
			"seat.hint": "新会话预设",
			"seat.noDescription": "无说明",
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
			"preset.default.aria": "Make default preset",
			"preset.actions.aria": "Preset actions for {name}",
			"preset.start.aria": "Start a new session with {name}",
			"menu.rename": "Rename",
			"menu.hide": "Hide",
			"menu.unhide": "Unhide",
			"hide.rejected": "The default preset cannot be hidden. Star another preset first.",
			"action.failed": "Action failed, please retry",
			"start.noWorkspace": "No workspace available to start a session",
			"rename.title": "Rename preset",
			"rename.hint": "Display name and description only; preset files and id are untouched",
			"field.name": "Display name",
			"field.description": "Description",
			"seat.hint": "Preset for the new session",
			"seat.noDescription": "No description",
			"time.now": "now",
			"time.minutes": "{n}min",
			"time.hours": "{n}h",
			"time.days": "{n}d",
			"time.months": "{n}mo",
			"time.years": "{n}y",
			"time.ago": "{t} ago"
		};
		//#endregion
		//#region src/client/roster.ts
		/**
		* Fold the Host roster with the plugin's display state.
		* @param presets - the Host roster as reported by `agentPreset.list`.
		* @param state - the plugin store snapshot (`order` + `overrides`).
		* @returns one entry per preset, display facts resolved.
		*/
		function deriveRoster(presets, state) {
			const visible = new Set(state.order);
			return presets.map((preset) => {
				const override = state.overrides[preset.id];
				return {
					id: preset.id,
					trust: preset.trust,
					isDefault: preset.isDefault,
					hidden: !visible.has(preset.id),
					broken: preset.broken !== void 0,
					displayName: override?.name ?? preset.name ?? preset.id,
					description: override?.description ?? preset.description
				};
			});
		}
		/**
		* Reconcile `order` against the current roster so I1 and I2 hold:
		* - ids that no longer exist drop out; duplicates collapse (I2, deletion);
		* - preset ids the roster gained append at the end in roster order (I2, new);
		* - the starred (default) preset is appended when outside the list (I1) —
		*   it can never be hidden, and its position is otherwise untouched.
		* Pure: returns the next order, never writes.
		* @param presets - the current roster.
		* @param order - the stored order.
		* @returns the reconciled order.
		*/
		function reconcile(presets, order) {
			const existing = new Set(presets.map((preset) => preset.id));
			const next = [];
			const seen = /* @__PURE__ */ new Set();
			for (const id of order) {
				if (!existing.has(id) || seen.has(id)) continue;
				next.push(id);
				seen.add(id);
			}
			for (const preset of presets) {
				if (seen.has(preset.id)) continue;
				next.push(preset.id);
				seen.add(preset.id);
			}
			const defaultId = presets.find((preset) => preset.isDefault)?.id;
			if (defaultId !== void 0 && !seen.has(defaultId)) next.push(defaultId);
			return next;
		}
		/**
		* Plan a hide: I1 makes hiding the starred preset impossible, so the plan
		* rejects it and the controller turns the rejection into a message instead
		* of touching `order` or settings.
		* @param presets - the current roster.
		* @param order - the stored order.
		* @param id - the preset to hide.
		* @returns the next order, or the rejection reason.
		*/
		function planHide(presets, order, id) {
			if (presets.some((preset) => preset.id === id && preset.isDefault)) return {
				ok: false,
				reason: "default"
			};
			return {
				ok: true,
				order: order.filter((existing) => existing !== id)
			};
		}
		/**
		* Plan an unhide: the preset reappends at the end of the list (hidden
		* positions are deliberately not preserved, DESIGN.md §6.1). No-op for an
		* already-visible preset.
		* @param order - the stored order.
		* @param id - the preset to unhide.
		* @returns the next order.
		*/
		function planUnhide(order, id) {
			return [...order.filter((existing) => existing !== id), id];
		}
		/**
		* I3: when nothing is starred and the list has just become empty, the Host
		* default must be unset so new sessions fall back to the deployment default.
		* @param presets - the current roster.
		* @param nextOrder - the order the write is about to land.
		* @returns true when the controller must also `settings.mutate` unset the default.
		*/
		function shouldUnsetDefault(presets, nextOrder) {
			return nextOrder.length === 0 && !presets.some((preset) => preset.isDefault);
		}
		/** Mirror of the official browser's visibility rule (tree.ts): ordinary sessions visible; blank only when current; subagent children and archived rows hidden. */
		function sessionVisible(session, current, archived) {
			return session.origin !== "subagent" && !archived.has(session.id) && (!session.blank || session.id === current);
		}
		/** A blank row's canonical title never displays; the renderer localizes it. */
		function sessionTitle(session) {
			return session.blank ? "New Session" : session.displayTitle;
		}
		/** Recency comparator: newest first, id as the deterministic tiebreak. */
		function byRecency(a, b) {
			if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
			return a.id < b.id ? -1 : 1;
		}
		function toSessionNode(session) {
			return {
				id: session.id,
				title: sessionTitle(session),
				blank: session.blank,
				running: session.running,
				completed: session.completed === true,
				updatedAt: session.updatedAt
			};
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
		* @param archivedSessionIds - the registry-global archive set.
		* @param query - the browser's normalized search query ('' while idle).
		* @returns group sections in render order.
		*/
		function derivePresetGroups(list, roster, order, archivedSessionIds, query) {
			const q = query.trim().toLowerCase();
			const archived = new Set(archivedSessionIds);
			const membersByPreset = /* @__PURE__ */ new Map();
			for (const id of list.ids) {
				const session = list.byId[id];
				if (session === void 0 || !sessionVisible(session, list.current, archived)) continue;
				const presetId = session.agentPreset !== void 0 && roster.some((entry) => entry.id === session.agentPreset) ? session.agentPreset : void 0;
				const bucket = membersByPreset.get(presetId);
				if (bucket === void 0) membersByPreset.set(presetId, [session]);
				else bucket.push(session);
			}
			const filtered = (sessions) => q === "" ? [...sessions] : sessions.filter((session) => sessionTitle(session).toLowerCase().includes(q));
			const titleMatches = (label, sessions) => q === "" || label.toLowerCase().includes(q) || sessions.some((session) => sessionTitle(session).toLowerCase().includes(q));
			const rosterById = new Map(roster.map((entry) => [entry.id, entry]));
			const groups = [];
			const pushGroup = (entry, key, hidden, isDefault) => {
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
					isDefault,
					broken: entry?.broken === true,
					sessionCount: sessions.length,
					sessions: sessions.sort(byRecency).map(toSessionNode)
				});
			};
			for (const id of order) {
				const entry = rosterById.get(id);
				if (entry === void 0 || entry.hidden) continue;
				pushGroup(entry, id, false, entry.isDefault);
			}
			for (const entry of roster) {
				if (!entry.hidden) continue;
				pushGroup(entry, entry.id, true, entry.isDefault);
			}
			pushGroup(void 0, "", false, false);
			return groups;
		}
		/**
		* Compact relative time for session rows (mirror of the official browser's
		* `relativeTime`, kept here so the plugin bundles no ui-workspace runtime).
		* @param updatedAt - epoch ms of the session's last activity.
		* @param now - current epoch ms (injected for pure rendering).
		* @returns the row's trailing time bucket and magnitude.
		*/
		function relativeTime(updatedAt, now) {
			const MIN = 6e4;
			const HOUR = 36e5;
			const DAY = 864e5;
			const diff = Math.max(0, now - updatedAt);
			if (diff < MIN) return {
				unit: "now",
				n: 0
			};
			if (diff < HOUR) return {
				unit: "minutes",
				n: Math.floor(diff / MIN)
			};
			if (diff < DAY) return {
				unit: "hours",
				n: Math.floor(diff / HOUR)
			};
			if (diff < 30 * DAY) return {
				unit: "days",
				n: Math.floor(diff / DAY)
			};
			if (diff < 365 * DAY) return {
				unit: "months",
				n: Math.floor(diff / (30 * DAY))
			};
			return {
				unit: "years",
				n: Math.floor(diff / (365 * DAY))
			};
		}
		//#endregion
		//#region src/client/styles.ts
		/**
		* The plugin's single stylesheet source: string constants injected into one
		* <style data-plugin="dsh-preset-manager"> tag on first module execution.
		* Only --dsw-* design tokens and semantic aliases are used; no literal
		* colors (AGENTS.md discipline). Class names are scoped with the pm- prefix
		* and exposed through the `css` map (the same call-site shape as a CSS
		* module, without a CSS pipeline).
		*/
		const CSS = `
.pm-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.pm-list {
  display: flex;
  flex-direction: column;
  padding: 0 var(--dsw-sidebar-inline-padding) calc(var(--dsw-session-list-edge-inset) + 4px);
  overflow-y: auto;
  min-height: 0;
  flex: 1;
}

.pm-list > * + * {
  margin-top: 2px;
}

.pm-status {
  padding: 10px 12px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

.pm-overflow {
  align-self: flex-start;
  margin-left: 30px;
  border: none;
  background: transparent;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}

.pm-overflow:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.pm-empty {
  padding: 12px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-dimmed);
}

.pm-retry {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-state-business-primary);
  cursor: pointer;
}

.pm-notice {
  flex: none;
  margin: 0 var(--dsw-sidebar-inline-padding) 6px;
  padding: 6px 12px;
  font-size: 12px;
  line-height: 18px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-state-warn-primary);
}

.pm-group {
  display: flex;
  flex-direction: column;
}

.pm-group > * + * {
  margin-top: 2px;
}

.pm-group-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: default;
}

.pm-group-row:not(.pm-group-row-hidden):hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.pm-group-row.pm-group-drop-before {
  box-shadow: inset 0 2px 0 var(--dsw-alias-state-business-primary);
}

.pm-group-row.pm-group-drop-after {
  box-shadow: inset 0 -2px 0 var(--dsw-alias-state-business-primary);
}

.pm-group-row.pm-group-row-dragging {
  opacity: 0.4;
}

.pm-group-row-hidden {
  opacity: 0.55;
}

.pm-drag-handle {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 20px;
  border: none;
  background: transparent;
  padding: 0;
  color: var(--dsw-alias-label-quaternary);
  cursor: grab;
}

.pm-drag-handle:active {
  cursor: grabbing;
}

.pm-star {
  flex: none;
  border: none;
  background: transparent;
  padding: 0;
  width: 18px;
  height: 20px;
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  color: var(--dsw-alias-label-quaternary);
  cursor: pointer;
}

.pm-star:hover {
  color: var(--dsw-alias-state-warn-primary);
}

.pm-star-active {
  color: var(--dsw-alias-state-warn-primary);
}

.pm-group-label {
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pm-group-desc {
  min-width: 0;
  flex: 1;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pm-badge {
  flex: none;
  padding: 0 6px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  border: 1px solid var(--dsw-alias-border-l2);
}

.pm-badge-broken {
  color: var(--dsw-alias-state-error-primary);
}

.pm-group-count {
  flex: none;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

.pm-icon-button {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  padding: 0;
  border-radius: 4px;
  color: var(--dsw-alias-label-quaternary);
  cursor: pointer;
}

.pm-icon-button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.pm-chevron {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 20px;
  border: none;
  background: transparent;
  padding: 0;
  color: var(--dsw-alias-label-caption);
  cursor: pointer;
}

.pm-chevron-collapsed {
  transform: rotate(-90deg);
}

.pm-session-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  margin-left: 22px;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.pm-session-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.pm-session-row-current {
  background: var(--dsw-alias-interactive-bg-hover);
}

.pm-session-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
}

.pm-session-dot-running {
  background: var(--dsw-alias-state-business-primary);
}

.pm-session-dot-completed {
  background: var(--dsw-alias-state-success-primary);
}

.pm-session-title {
  min-width: 0;
  flex: 1;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pm-session-row-current .pm-session-title {
  color: var(--dsw-alias-label-primary);
}

.pm-session-workspace {
  flex: none;
  max-width: 40%;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pm-session-time {
  flex: none;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
}

/* Shadow seat chip: mirrors the official geometry so the hero row keeps its shape. */
.pm-seat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: min(100%, 240px);
  min-height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.pm-seat:not(:disabled):hover,
.pm-seat[aria-expanded='true'] {
  background: var(--dsw-alias-interactive-bg-hover);
}

.pm-seat:disabled {
  cursor: default;
  color: var(--dsw-alias-label-quaternary);
}

.pm-seat-icon {
  flex: none;
  color: var(--dsw-alias-label-primary);
}

.pm-seat-chevron {
  flex: none;
  color: var(--dsw-alias-label-caption);
}

.pm-menu-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 280px;
}

.pm-menu-item-name {
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}

.pm-menu-item-desc {
  font-size: 12px;
  line-height: 16px;
  color: var(--dsw-alias-label-caption);
  white-space: normal;
}

.pm-rename-hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

.pm-rename-fields {
  margin-top: 12px;
}

.pm-rename-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pm-rename-field + .pm-rename-field {
  margin-top: 10px;
}

.pm-rename-label {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}

.pm-rename-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
  outline: none;
}

.pm-rename-input:focus {
  border-color: var(--dsw-alias-state-business-primary);
}
`;
		/** The injected <style> element id, for diagnostics and HMR disposal. */
		const STYLE_ELEMENT_ID = "dsh-preset-manager-styles";
		/**
		* Class-name map: the same call-site shape as a CSS module import, without a
		* CSS pipeline (AGENTS.md: styles live in exactly one file).
		*/
		const css = {
			root: "pm-root",
			list: "pm-list",
			status: "pm-status",
			overflow: "pm-overflow",
			empty: "pm-empty",
			retry: "pm-retry",
			notice: "pm-notice",
			group: "pm-group",
			groupRow: "pm-group-row",
			groupRowHidden: "pm-group-row-hidden",
			groupDropBefore: "pm-group-drop-before",
			groupDropAfter: "pm-group-drop-after",
			groupRowDragging: "pm-group-row-dragging",
			dragHandle: "pm-drag-handle",
			star: "pm-star",
			starActive: "pm-star-active",
			groupLabel: "pm-group-label",
			groupDesc: "pm-group-desc",
			badge: "pm-badge",
			badgeBroken: "pm-badge-broken",
			groupCount: "pm-group-count",
			iconButton: "pm-icon-button",
			chevron: "pm-chevron",
			chevronCollapsed: "pm-chevron-collapsed",
			sessionRow: "pm-session-row",
			sessionRowCurrent: "pm-session-row-current",
			sessionDot: "pm-session-dot",
			sessionDotRunning: "pm-session-dot-running",
			sessionDotCompleted: "pm-session-dot-completed",
			sessionTitle: "pm-session-title",
			sessionWorkspace: "pm-session-workspace",
			sessionTime: "pm-session-time",
			seat: "pm-seat",
			seatIcon: "pm-seat-icon",
			seatChevron: "pm-seat-chevron",
			menuItem: "pm-menu-item",
			menuItemName: "pm-menu-item-name",
			menuItemDesc: "pm-menu-item-desc",
			renameHint: "pm-rename-hint",
			renameFields: "pm-rename-fields",
			renameField: "pm-rename-field",
			renameLabel: "pm-rename-label",
			renameInput: "pm-rename-input"
		};
		/**
		* Install the plugin stylesheet once per module instance.
		* @returns a disposer removing the tag (framework reloads never call it;
		* it exists so a future HMR path can).
		*/
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
		//#region src/client/PresetGroupRow.tsx
		/**
		* Render one group header row.
		* @param props - group facts, drag seats, and action callbacks.
		* @returns the header row.
		*/
		function PresetGroupRow({ group, expanded, dragging, source, marker, onDragStart, onDragHover, onDrop, onDragEnd, onToggle, onStartSession, onSetDefault, onRename, onHide, onUnhide, t }) {
			const dragEnabled = !group.hidden && group.presetId !== void 0 && !dragging;
			const rowClass = [
				css.groupRow,
				group.hidden ? css.groupRowHidden : "",
				marker === "before" ? css.groupDropBefore : "",
				marker === "after" ? css.groupDropAfter : "",
				source ? css.groupRowDragging : ""
			].join(" ").trim();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: rowClass,
				role: "treeitem",
				"aria-expanded": expanded,
				draggable: dragEnabled,
				onDragStart: (event) => {
					if (!dragEnabled) return;
					event.dataTransfer.setData("text/plain", group.key);
					event.dataTransfer.effectAllowed = "move";
					onDragStart();
				},
				onDragOver: (event) => {
					if (group.hidden || group.presetId === void 0 || !dragging) return;
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
					const rect = event.currentTarget.getBoundingClientRect();
					onDragHover(event.clientY < rect.top + rect.height / 2 ? "before" : "after");
				},
				onDrop: (event) => {
					if (group.hidden || group.presetId === void 0 || !dragging) return;
					event.preventDefault();
					const rect = event.currentTarget.getBoundingClientRect();
					onDrop(event.clientY < rect.top + rect.height / 2 ? "before" : "after");
				},
				onDragEnd: () => {
					onDragEnd();
				},
				children: [
					dragEnabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: css.dragHandle,
						"aria-hidden": "true",
						tabIndex: -1,
						onMouseDown: (event) => {
							event.preventDefault();
						},
						children: "⋮⋮"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: [css.star, group.isDefault ? css.starActive : ""].join(" ").trim(),
						"aria-label": t("preset.default.aria"),
						title: t("preset.default.aria"),
						onClick: onSetDefault,
						children: group.isDefault ? "★" : "☆"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: css.groupLabel,
						children: group.label
					}),
					group.presetId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: css.groupDesc,
							children: group.description ?? ""
						}),
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
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: [css.chevron, expanded ? "" : css.chevronCollapsed].join(" ").trim(),
							"aria-expanded": expanded,
							onClick: onToggle,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: css.iconButton,
							"aria-label": t("preset.start.aria", { name: group.label }),
							title: t("preset.start.aria", { name: group.label }),
							disabled: group.broken,
							onClick: onStartSession,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetMenu, {
							label: group.label,
							hidden: group.hidden,
							onRename,
							onHide,
							onUnhide,
							t
						})
					] })
				]
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
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: "pm-rename-desc",
							className: css.renameInput,
							value: description,
							onChange: (e) => {
								setDescription(e.target.value);
							},
							onKeyDown: (e) => {
								if (e.key === "Enter" && !composing.current) {
									e.preventDefault();
									confirm();
								}
							}
						})]
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/SessionRow.tsx
		/** Translate a relative-time bucket into its localized trailing label. */
		function timeLabel(time, t) {
			if (time.unit === "now") return t("time.now");
			return t("time.ago", { t: t(`time.${time.unit}`, { n: time.n }) });
		}
		/**
		* Render one session row.
		* @param props - row facts and callbacks.
		* @returns the row element.
		*/
		function SessionRow({ node, current, workspace, now, onOpen, t }) {
			const dotClass = node.running ? css.sessionDotRunning : node.completed ? css.sessionDotCompleted : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: [css.sessionRow, current ? css.sessionRowCurrent : ""].join(" ").trim(),
				role: "treeitem",
				onClick: () => {
					onOpen(node.id);
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${css.sessionDot} ${dotClass}`,
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: css.sessionTitle,
						children: node.blank ? t("session.new") : node.title
					}),
					workspace !== void 0 && workspace !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: css.sessionWorkspace,
						children: workspace
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: css.sessionTime,
						children: timeLabel(relativeTime(node.updatedAt, now), t)
					})
				]
			});
		}
		//#endregion
		//#region src/client/PresetGroups.tsx
		/**
		* The preset-group tree filling the patched `sidebar.workspaces.presetGroups`
		* child slot: visible preset groups in `order` order, hidden groups dimmed
		* and pinned at the end, and the ungrouped bucket last. Rows manage the
		* whole display layer (star / drag / hide / unhide / rename / new session)
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
		/** Basename of a session cwd, the workspace-label fallback outside every workspace. */
		function cwdLabel(cwd) {
			if (cwd === void 0 || cwd === "") return void 0;
			const base = cwd.replace(/[/\\]+$/, "").split(/[/\\]/).pop();
			return base !== void 0 && base !== "" ? base : cwd;
		}
		/**
		* Render the preset group tree.
		* @param props - composed slot props.
		* @returns the tree element.
		*/
		function PresetGroups({ query, useSessions, useWorkspaces, useStore, actions, useRoster, load, open, startSessionByPreset, setDefault, hide, unhide, rename, t }) {
			const list = useSessions((snapshot) => snapshot);
			const workspaceItems = useWorkspaces((snapshot) => snapshot.items);
			const archivedSessionIds = useWorkspaces((snapshot) => snapshot.archivedSessionIds);
			const state = useStore((snapshot) => snapshot);
			const rosterSnapshot = useRoster((snapshot) => snapshot);
			const [expandedGroups, setExpandedGroups] = (0, react.useState)([]);
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
			const groups = (0, react.useMemo)(() => derivePresetGroups(list, roster, state.order, archivedSessionIds, query), [
				list,
				roster,
				state.order,
				archivedSessionIds,
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
				return cwdLabel(list.byId[sessionId]?.cwd);
			};
			(0, react.useEffect)(() => {
				if (list.phase !== "ready" || expandedInitialized.current || groups.length === 0) return;
				expandedInitialized.current = true;
				const currentGroup = groups.find((group) => group.sessions.some((node) => node.id === list.current))?.key;
				const firstVisible = groups.find((group) => group.presetId !== void 0 && !group.hidden)?.key;
				setExpandedGroups([currentGroup, firstVisible].filter((key) => key !== void 0));
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
							const shown = expanded ? group.sessions : group.sessions.slice(0, COLLAPSED_SESSION_LIMIT);
							const entry = group.presetId === void 0 ? void 0 : roster.find((r) => r.id === group.presetId);
							const marker = drag !== null && drag.over?.id === group.key ? drag.over.half : null;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: css.group,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetGroupRow, {
										group,
										expanded,
										dragging: drag !== null,
										source: drag !== null && drag.sourceId === group.key,
										marker,
										onDragStart: () => {
											dropCommitted.current = false;
											setDrag({
												sourceId: group.key,
												over: null
											});
										},
										onDragHover: (half) => {
											setDrag((active) => active === null ? active : {
												...active,
												over: {
													id: group.key,
													half
												}
											});
										},
										onDrop: (half) => {
											if (drag !== null) commitDrag(drag, {
												id: group.key,
												half
											});
										},
										onDragEnd: () => {
											if (drag !== null && drag.over !== null) commitDrag(drag, drag.over);
											else setDrag(null);
											dropCommitted.current = false;
										},
										onToggle: () => {
											toggle(group.key);
										},
										onStartSession: () => {
											if (group.presetId === void 0) return;
											const key = startSessionByPreset(group.presetId);
											if (key !== void 0) showNotice(key);
										},
										onSetDefault: () => {
											if (group.presetId === void 0 || group.isDefault) return;
											run(setDefault(state, group.presetId));
										},
										onRename: () => {
											if (entry !== void 0) setRenameTarget(entry);
										},
										onHide: () => {
											if (group.presetId === void 0) return;
											run(hide(state, group.presetId));
										},
										onUnhide: () => {
											if (group.presetId === void 0) return;
											unhide(state, group.presetId);
										},
										t
									}),
									shown.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, {
										node,
										current: node.id === list.current,
										workspace: workspaceLabelOf(node.id),
										now,
										onOpen: open,
										t
									}, node.id)),
									group.sessions.length > COLLAPSED_SESSION_LIMIT && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: css.overflow,
										"aria-expanded": expanded,
										onClick: () => {
											toggle(group.key);
										},
										children: expanded ? t("sessions.collapse") : t("sessions.expand", { n: group.sessions.length - COLLAPSED_SESSION_LIMIT })
									})
								]
							}, group.key);
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
		//#region src/client/SeatChip.tsx
		/**
		* The shadow new-session preset chip (priority -1 over the official
		* `conversation.hero.agentPreset` entry; uninstalling the plugin restores
		* the official chip). Same stage→apply semantics as the official seat, but
		* the roster is the plugin's derived list: only visible (ordered) presets,
		* display overrides applied, opened on the starred (default) preset.
		*/
		/**
		* Render the shadow new-session chip.
		* @param props - composed slot props.
		* @returns the chip, or null when no selectable preset remains.
		*/
		function SeatChip({ useRoster, useStore, useSeat, load, select, t }) {
			const rosterSnapshot = useRoster((snapshot) => snapshot);
			const state = useStore((s) => s);
			const seat = useSeat((snapshot) => snapshot);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			const options = (0, react.useMemo)(() => deriveRoster(rosterSnapshot.presets, state).filter((entry) => !entry.hidden && !entry.broken).map((entry) => ({
				id: entry.id,
				trust: entry.trust,
				displayName: entry.displayName,
				description: entry.description
			})), [rosterSnapshot.presets, state]);
			const chosen = options.find((option) => option.id === seat.current) ?? options[0];
			if (chosen === void 0) return null;
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: () => {
					setOpen(false);
				},
				items: options.map((option) => ({
					id: option.id,
					label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: css.menuItem,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: css.menuItemName,
							children: option.displayName
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: css.menuItemDesc,
							children: option.description ?? t("seat.noDescription")
						})]
					})
				})),
				selectedId: chosen.id,
				onSelect: (id) => {
					setOpen(false);
					select(id);
				},
				align: "start",
				portal: true,
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: css.seat,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					title: seat.error ?? t("seat.hint"),
					disabled: seat.busy,
					onClick: () => {
						setOpen((value) => !value);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, { className: css.seatIcon }),
						chosen.displayName,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: css.seatChevron })
					]
				})
			});
		}
		//#endregion
		//#region src/client/stores.ts
		/**
		* The plugin's viewing store: the ordered visible list and the display
		* overrides. Module level exports the factory only (a module-level handle
		* would pin the store identity across plugin reloads); both registrations
		* (the preset tree and the shadow seat chip) receive the same handle, so the
		* framework resolves ONE root instance they share.
		*/
		/**
		* Create the preset manager store handle.
		* @returns the store handle (spec + type + identity + factory in one).
		*/
		function createPresetManagerStore() {
			return (0, _deepseek_ai_dsh_client_runtime_client.defineStore)({
				init: () => ({
					order: [],
					overrides: {}
				}),
				persist: "dsh.presetManager.v1",
				actions: {
					setOrder: (d, order) => {
						d.order = order;
					},
					reconcileOrder: (d, presets) => {
						d.order = reconcile(presets, d.order);
					},
					setOverride: (d, id, override) => {
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
		/** Persist one preset as the deployment default (the official star write). */
		async function writeDefaultPreset(api, id) {
			try {
				const response = await api.settings.update({
					ns: AGENT_PRESET_SETTINGS_NS,
					patch: { default: id }
				});
				return response.result.ok ? void 0 : response.result.error.message;
			} catch (error) {
				return messageOf(error);
			}
		}
		/** I3: unset the official default so new sessions fall back to the deployment default. */
		async function unsetDefaultPreset(api) {
			try {
				await api.settings.mutate({
					ns: AGENT_PRESET_SETTINGS_NS,
					ops: [{
						op: "unset",
						path: ["default"]
					}]
				});
			} catch (error) {
				console.warn("preset default unset failed:", error);
			}
		}
		/**
		* Roster read + management sequencing. Pure decisions live in roster.ts;
		* this controller only sequences writes: order first (when needed), settings
		* second, then re-read (DESIGN.md §4.2) — every path is idempotent because
		* reconcile re-establishes I1/I2 on the echo.
		*/
		var RosterController = class {
			api;
			/** Roster snapshot shared by the tree and the shadow chip. */
			store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)({
				status: "idle",
				error: null,
				presets: []
			});
			constructor(api) {
				this.api = api;
			}
			set(patch) {
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
			/** Read the roster and reconcile the stored order (I1/I2). */
			async load(actions) {
				if (this.store.getSnapshot().status === "loading") return;
				this.set({
					status: "loading",
					error: null
				});
				let presets;
				try {
					const response = await this.api.agentPresets.list({});
					if (!response.result.ok) throw new Error(response.result.error.message);
					presets = response.result.value.presets;
				} catch (error) {
					this.set({
						status: "error",
						error: messageOf(error),
						presets: []
					});
					return;
				}
				this.set({
					status: "ready",
					error: null,
					presets
				});
				actions?.reconcileOrder(presets);
			}
			/** Star a preset: unhide it first when hidden (I1), then write settings. */
			async setDefault(actions, state, id) {
				const { presets } = this.store.getSnapshot();
				if (!presets.some((preset) => preset.id === id)) return "action.failed";
				if (!state.order.includes(id)) actions.setOrder([...state.order, id]);
				if (await writeDefaultPreset(this.api, id) !== void 0) return "action.failed";
				await this.load(actions);
			}
			/** Hide a preset; the starred one is rejected (I1), and I3 may unset the default. */
			async hide(actions, state, id) {
				const { presets } = this.store.getSnapshot();
				const plan = planHide(presets, state.order, id);
				if (!plan.ok) return "hide.rejected";
				actions.setOrder(plan.order);
				if (shouldUnsetDefault(presets, plan.order)) await unsetDefaultPreset(this.api);
			}
			/** Unhide: append at the end of the list (hidden positions are not kept). */
			async unhide(actions, state, id) {
				actions.setOrder(planUnhide(state.order, id));
			}
			/** Write the display name/description override (store only). */
			async rename(actions, id, override) {
				actions.setOverride(id, override);
			}
		};
		/**
		* Stages the next session's preset and applies it when one becomes current
		* (the official stage→apply semantics, minus the introduce cue).
		*/
		var SeatController = class {
			api;
			currentSession;
			onApplied;
			store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)({
				current: "",
				error: null,
				busy: false
			});
			/** The deployment default, so a consumed stage falls back without re-reading. */
			fallback = "";
			/** Set while a pick is waiting for a session; cleared once applied. */
			staged;
			constructor(api, currentSession, onApplied) {
				this.api = api;
				this.currentSession = currentSession;
				this.onApplied = onApplied;
			}
			set(patch) {
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
			/** Read the roster and open the chip on the deployment default. */
			async load() {
				try {
					const response = await this.api.agentPresets.list({});
					if (!response.result.ok) {
						this.set({ error: response.result.error.message });
						return;
					}
					const { presets } = response.result.value;
					this.fallback = presets.find((preset) => preset.isDefault)?.id ?? presets[0]?.id ?? "";
					this.set({
						current: this.staged ?? this.currentSession()?.agentPreset ?? this.fallback,
						error: null
					});
				} catch (error) {
					this.set({ error: messageOf(error) });
				}
			}
			/** Stage one preset for the next session, applying immediately when a blank session is current. */
			async select(id) {
				if (this.store.getSnapshot().busy) return;
				this.stage(id);
				await this.apply();
			}
			/** Stage WITHOUT the immediate apply (the tree's + button starts the session after the pick). */
			stage(id) {
				this.staged = id;
				this.set({
					current: id,
					error: null
				});
			}
			/** Hand the staged choice to the current session, if there is one to take it. */
			async apply() {
				const staged = this.staged;
				const session = this.currentSession();
				if (staged === void 0 || session === void 0) return;
				if (!session.blank || session.agentPreset === staged) {
					this.staged = void 0;
					return;
				}
				this.set({
					busy: true,
					error: null
				});
				try {
					const response = await this.api.agentPresets.select({
						sessionId: session.id,
						agentPreset: staged
					});
					this.staged = void 0;
					if (!response.result.ok) {
						this.set({
							busy: false,
							error: response.result.error.message,
							current: this.fallback
						});
						return;
					}
					this.set({
						busy: false,
						current: response.result.value.agentPreset
					});
					this.onApplied?.(session.id, response.result.value.agentPreset);
				} catch (error) {
					this.staged = void 0;
					this.set({
						busy: false,
						error: messageOf(error),
						current: this.fallback
					});
				}
			}
		};
		/** Required services (cordis fiber inject); the inner scope adds conversation/sessions/workspaces. */
		const inject = [
			"slots",
			"locale",
			"connection",
			"remote",
			"sessions"
		];
		/**
		* Register the preset tree (once the patched slot is declared) and the
		* shadow seat chip (in the conversation scope).
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const { api } = ctx.get("connection");
			const controller = new RosterController(api);
			const presetStore = createPresetManagerStore();
			let currentActions;
			let startSessionByPreset = () => "action.failed";
			let seatRef;
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-preset-manager: dictionaries");
			ctx.effect(() => {
				const refresh = () => {
					controller.load(currentActions);
					seatRef?.load();
				};
				const disposers = [ctx.remote.$on("settings/document-updated", (ns) => {
					if (ns !== AGENT_PRESET_SETTINGS_NS) return;
					refresh();
				}), ctx.on("connection/reset", () => {
					refresh();
				})];
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "dsh-preset-manager: roster refresh");
			const treeInjected = (actions) => {
				currentActions = actions;
				return {
					hooks: { roster: controller.store },
					load: () => controller.load(actions),
					open: (sessionId) => {
						ctx.sessions.open(sessionId);
					},
					startSessionByPreset: (id) => startSessionByPreset(id),
					setDefault: (state, id) => controller.setDefault(actions, state, id),
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
				"workspaces",
				"connection",
				"remote"
			], (scope) => {
				const scopeApi = scope.get("connection").api;
				const seatCtl = new SeatController(scopeApi, () => {
					const state = scope.sessions.list.getSnapshot();
					const summary = state.current === void 0 ? void 0 : state.byId[state.current];
					return summary === void 0 ? void 0 : {
						id: summary.id,
						blank: summary.blank,
						...summary.agentPreset === void 0 ? {} : { agentPreset: summary.agentPreset }
					};
				}, (sessionId, agentPreset) => {
					scope.sessions.noteAgentPreset(sessionId, agentPreset);
				});
				seatRef = seatCtl;
				startSessionByPreset = (id) => {
					const workspaces = scope.workspaces.list.getSnapshot();
					const sessions = scope.sessions.list.getSnapshot();
					if (((sessions.current === void 0 ? void 0 : workspaces.items.find((workspace) => workspace.sessionIds.includes(sessions.current))?.workspaceId) ?? workspaces.recentWorkspaceId) === void 0) return "start.noWorkspace";
					seatRef?.stage(id);
					scope.workspaces.startSession();
				};
				scope.effect(() => {
					const stop = scope.sessions.list.subscribe(() => {
						seatCtl.apply();
					});
					const settingsMoved = scope.remote.$on("settings/document-updated", (ns) => {
						if (ns !== AGENT_PRESET_SETTINGS_NS) return;
						seatCtl.load();
					});
					const presetSelected = scope.remote.$on("agent-preset/selected", (sessionId, agentPreset) => {
						scope.sessions.noteAgentPreset(sessionId, agentPreset);
					});
					const seatInjected = (actions) => {
						currentActions = actions;
						return {
							hooks: {
								seat: seatCtl.store,
								roster: controller.store
							},
							load: async () => {
								await controller.load(actions);
								await seatCtl.load();
							},
							select: (id) => seatCtl.select(id)
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
						settingsMoved();
						presetSelected();
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