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
`

/** The injected <style> element id, for diagnostics and HMR disposal. */
export const STYLE_ELEMENT_ID = 'dsh-preset-manager-styles'

/**
 * Class-name map: the same call-site shape as a CSS module import, without a
 * CSS pipeline (AGENTS.md: styles live in exactly one file).
 */
export const css = {
  root: 'pm-root',
  list: 'pm-list',
  status: 'pm-status',
  overflow: 'pm-overflow',
  empty: 'pm-empty',
  retry: 'pm-retry',
  notice: 'pm-notice',
  group: 'pm-group',
  groupRow: 'pm-group-row',
  groupRowHidden: 'pm-group-row-hidden',
  groupDropBefore: 'pm-group-drop-before',
  groupDropAfter: 'pm-group-drop-after',
  groupRowDragging: 'pm-group-row-dragging',
  dragHandle: 'pm-drag-handle',
  star: 'pm-star',
  starActive: 'pm-star-active',
  groupLabel: 'pm-group-label',
  groupDesc: 'pm-group-desc',
  badge: 'pm-badge',
  badgeBroken: 'pm-badge-broken',
  groupCount: 'pm-group-count',
  iconButton: 'pm-icon-button',
  chevron: 'pm-chevron',
  chevronCollapsed: 'pm-chevron-collapsed',
  sessionRow: 'pm-session-row',
  sessionRowCurrent: 'pm-session-row-current',
  sessionDot: 'pm-session-dot',
  sessionDotRunning: 'pm-session-dot-running',
  sessionDotCompleted: 'pm-session-dot-completed',
  sessionTitle: 'pm-session-title',
  sessionWorkspace: 'pm-session-workspace',
  sessionTime: 'pm-session-time',
  seat: 'pm-seat',
  seatIcon: 'pm-seat-icon',
  seatChevron: 'pm-seat-chevron',
  menuItem: 'pm-menu-item',
  menuItemName: 'pm-menu-item-name',
  menuItemDesc: 'pm-menu-item-desc',
  renameHint: 'pm-rename-hint',
  renameFields: 'pm-rename-fields',
  renameField: 'pm-rename-field',
  renameLabel: 'pm-rename-label',
  renameInput: 'pm-rename-input',
} as const

/**
 * Install the plugin stylesheet once per module instance.
 * @returns a disposer removing the tag (framework reloads never call it;
 * it exists so a future HMR path can).
 */
export function installStyles(): () => void {
  if (document.getElementById(STYLE_ELEMENT_ID) !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ELEMENT_ID
  style.dataset.plugin = 'dsh-preset-manager'
  style.textContent = CSS
  document.head.appendChild(style)
  return () => { style.remove() }
}

// First execution injects the tag (AGENTS.md: styles live in one place).
installStyles()
