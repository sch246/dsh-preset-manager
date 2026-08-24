/**
 * The plugin's single stylesheet source: string constants injected into one
 * <style data-plugin="dsh-preset-manager"> tag on first module execution.
 * Only --dsw-* design tokens and semantic aliases are used; no literal
 * colors (AGENTS.md discipline). Class names are scoped with the pm- prefix
 * and exposed through the `css` map (the same call-site shape as a CSS
 * module, without a CSS pipeline).
 */
/** The injected <style> element id, for diagnostics and HMR disposal. */
export declare const STYLE_ELEMENT_ID = "dsh-preset-manager-styles";
/**
 * Class-name map: the same call-site shape as a CSS module import, without a
 * CSS pipeline (AGENTS.md: styles live in exactly one file).
 */
export declare const css: {
    readonly root: "pm-root";
    readonly list: "pm-list";
    readonly status: "pm-status";
    readonly overflow: "pm-overflow";
    readonly empty: "pm-empty";
    readonly retry: "pm-retry";
    readonly notice: "pm-notice";
    readonly group: "pm-group";
    readonly groupRow: "pm-group-row";
    readonly groupRowHidden: "pm-group-row-hidden";
    readonly groupDropBefore: "pm-group-drop-before";
    readonly groupDropAfter: "pm-group-drop-after";
    readonly groupRowDragging: "pm-group-row-dragging";
    readonly dragHandle: "pm-drag-handle";
    readonly star: "pm-star";
    readonly starActive: "pm-star-active";
    readonly groupLabel: "pm-group-label";
    readonly groupDesc: "pm-group-desc";
    readonly badge: "pm-badge";
    readonly badgeBroken: "pm-badge-broken";
    readonly groupCount: "pm-group-count";
    readonly iconButton: "pm-icon-button";
    readonly chevron: "pm-chevron";
    readonly chevronCollapsed: "pm-chevron-collapsed";
    readonly sessionRow: "pm-session-row";
    readonly sessionRowCurrent: "pm-session-row-current";
    readonly sessionDot: "pm-session-dot";
    readonly sessionDotRunning: "pm-session-dot-running";
    readonly sessionDotCompleted: "pm-session-dot-completed";
    readonly sessionTitle: "pm-session-title";
    readonly sessionWorkspace: "pm-session-workspace";
    readonly sessionTime: "pm-session-time";
    readonly seat: "pm-seat";
    readonly seatIcon: "pm-seat-icon";
    readonly seatChevron: "pm-seat-chevron";
    readonly menuItem: "pm-menu-item";
    readonly menuItemName: "pm-menu-item-name";
    readonly menuItemDesc: "pm-menu-item-desc";
    readonly renameHint: "pm-rename-hint";
    readonly renameFields: "pm-rename-fields";
    readonly renameField: "pm-rename-field";
    readonly renameLabel: "pm-rename-label";
    readonly renameInput: "pm-rename-input";
};
/**
 * Install the plugin stylesheet once per module instance.
 * @returns a disposer removing the tag (framework reloads never call it;
 * it exists so a future HMR path can).
 */
export declare function installStyles(): () => void;
