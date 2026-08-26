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
.pm-star {
  border: none; background: transparent; padding: 0; width: 16px; height: 16px;
  font-size: 13px; line-height: 16px; text-align: center;
  color: var(--dsw-alias-label-quaternary); cursor: pointer;
}
.pm-star:hover, .pm-star-active { color: var(--dsw-alias-state-warn-primary); }
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
.pm-menu-item { display: flex; flex-direction: column; gap: 2px; max-width: 280px; }
.pm-menu-item-name { font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); }
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
`

/** The injected style element id, for diagnostics and HMR disposal. */
export const STYLE_ELEMENT_ID = 'dsh-preset-manager-styles'

/** Class names for the plugin-only decorations and dialogs. */
export const css = {
  root: 'pm-root',
  list: 'pm-list',
  status: 'pm-status',
  empty: 'pm-empty',
  retry: 'pm-retry',
  notice: 'pm-notice',
  star: 'pm-star',
  starActive: 'pm-star-active',
  metaItems: 'pm-meta-items',
  badge: 'pm-badge',
  badgeBroken: 'pm-badge-broken',
  groupCount: 'pm-group-count',
  actionContents: 'pm-action-contents',
  iconButton: 'pm-icon-button',
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
  renameTextarea: 'pm-rename-textarea',
} as const

/** Install the plugin stylesheet once. */
export function installStyles(): () => void {
  if (document.getElementById(STYLE_ELEMENT_ID) !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ELEMENT_ID
  style.dataset.plugin = 'dsh-preset-manager'
  style.textContent = CSS
  document.head.appendChild(style)
  return () => { style.remove() }
}

installStyles()
