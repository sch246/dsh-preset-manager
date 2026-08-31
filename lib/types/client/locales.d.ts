/**
 * `presetManager` namespace dictionaries: the preset-group tree (group rows,
 * session rows, management menus, rename dialog) and the shadow new-session
 * chip. Product copy is Simplified Chinese; runtime wire errors pass through
 * untranslated by policy (see DESIGN.md §5).
 */
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    'group.ungrouped': string;
    'session.new': string;
    'tree.aria': string;
    'empty.none': string;
    'empty.noMatches': string;
    'empty.loading': string;
    'empty.error': string;
    retry: string;
    'sessions.expand': string;
    'sessions.collapse': string;
    'sessions.count.one': string;
    'sessions.count.other': string;
    'preset.broken': string;
    'preset.hidden': string;
    'preset.actions.aria': string;
    'preset.start.aria': string;
    'menu.rename': string;
    'menu.hide': string;
    'menu.unhide': string;
    'hide.rejected': string;
    'action.failed': string;
    'start.noWorkspace': string;
    'rename.title': string;
    'rename.hint': string;
    'field.name': string;
    'field.description': string;
    'seat.hint': string;
    'seat.noDescription': string;
    'seat.default': string;
    'seat.setDefault': string;
    'time.now': string;
    'time.minutes': string;
    'time.hours': string;
    'time.days': string;
    'time.months': string;
    'time.years': string;
    'time.ago': string;
};
/** The presetManager namespace key union. */
export type PresetManagerKey = keyof typeof zh;
/** English dictionary, checked complete against the zh key set. */
export declare const en: {
    'group.ungrouped': string;
    'session.new': string;
    'tree.aria': string;
    'empty.none': string;
    'empty.noMatches': string;
    'empty.loading': string;
    'empty.error': string;
    retry: string;
    'sessions.expand': string;
    'sessions.collapse': string;
    'sessions.count.one': string;
    'sessions.count.other': string;
    'preset.broken': string;
    'preset.hidden': string;
    'preset.actions.aria': string;
    'preset.start.aria': string;
    'menu.rename': string;
    'menu.hide': string;
    'menu.unhide': string;
    'hide.rejected': string;
    'action.failed': string;
    'start.noWorkspace': string;
    'rename.title': string;
    'rename.hint': string;
    'field.name': string;
    'field.description': string;
    'seat.hint': string;
    'seat.noDescription': string;
    'seat.default': string;
    'seat.setDefault': string;
    'time.now': string;
    'time.minutes': string;
    'time.hours': string;
    'time.days': string;
    'time.months': string;
    'time.years': string;
    'time.ago': string;
};
