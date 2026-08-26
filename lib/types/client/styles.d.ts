/** The injected style element id, for diagnostics and HMR disposal. */
export declare const STYLE_ELEMENT_ID = "dsh-preset-manager-styles";
/** Class names for the plugin-only decorations and dialogs. */
export declare const css: {
    readonly root: "pm-root";
    readonly list: "pm-list";
    readonly status: "pm-status";
    readonly empty: "pm-empty";
    readonly retry: "pm-retry";
    readonly notice: "pm-notice";
    readonly star: "pm-star";
    readonly starActive: "pm-star-active";
    readonly metaItems: "pm-meta-items";
    readonly badge: "pm-badge";
    readonly badgeBroken: "pm-badge-broken";
    readonly groupCount: "pm-group-count";
    readonly actionContents: "pm-action-contents";
    readonly iconButton: "pm-icon-button";
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
    readonly renameTextarea: "pm-rename-textarea";
};
/** Install the plugin stylesheet once. */
export declare function installStyles(): () => void;
