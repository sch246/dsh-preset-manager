/**
 * Pure derivation layer of dsh-preset-manager.
 *
 * One ordered list + one star is the whole display model (DESIGN.md §4):
 * - `order` = the visible presets in display order; NOT in `order` = hidden
 *   (absent from the new-session selector, dimmed and pinned to the end of
 *   the group tree);
 * - the star = the Host's `agent-presets.default` (authoritative copy in
 *   official settings); the starred preset can never be hidden (I1);
 * - new presets append to the end of the list, deleted presets drop out (I2);
 * - no star + empty list ⇒ the Host default is unset (I3).
 *
 * Every invariant is enforced here as a pure function so the controller only
 * sequences writes (order first, settings second) and unit tests hold the
 * invariants' positive and negative cases.
 */
import type { SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client';
/** One Host roster entry exactly as `agentPreset.list` reports it. */
export interface HostPreset {
    id: string;
    trust: 'system' | 'user';
    isDefault: boolean;
    name?: string;
    description?: string;
    broken?: string;
}
/**
 * The roster read snapshot the renderer subscribes to (controller-owned;
 * shared by the tree and the shadow chip through the inject hooks seat).
 */
export interface RosterSnapshot {
    status: 'idle' | 'loading' | 'ready' | 'error';
    error: string | null;
    presets: readonly HostPreset[];
}
/**
 * The plugin's display-layer state, persisted under `dsh.presetManager.v1`.
 * The star (default) is NOT stored here: the authoritative copy lives in the
 * official `agent-presets.default` setting; `roster.isDefault` is the star.
 */
export interface PresetManagerState {
    /** Ordered visible presets: display order = new-session selector order. */
    order: string[];
    /** Display-name/description overrides (the rename landing point). */
    overrides: Record<string, {
        name?: string;
        description?: string;
    }>;
}
/** One roster entry with the display-layer state folded in. */
export interface RosterEntry {
    id: string;
    trust: 'system' | 'user';
    /** True while the roster marks this preset as the deployment default (the star). */
    isDefault: boolean;
    /** True when NOT in `order`: hidden from the selector, dimmed in the tree. */
    hidden: boolean;
    /** True when the preset cannot compose a session (still listed, never offered). */
    broken: boolean;
    /** Display name: override → published name → id. */
    displayName: string;
    /** Display description: override → published → absent. */
    description: string | undefined;
}
/**
 * Fold the Host roster with the plugin's display state.
 * @param presets - the Host roster as reported by `agentPreset.list`.
 * @param state - the plugin store snapshot (`order` + `overrides`).
 * @returns one entry per preset, display facts resolved.
 */
export declare function deriveRoster(presets: readonly HostPreset[], state: PresetManagerState): RosterEntry[];
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
export declare function reconcile(presets: readonly {
    id: string;
    isDefault: boolean;
}[], order: readonly string[]): string[];
/** Outcome of a hide attempt, computed pure before any write. */
export type HidePlan = {
    ok: true;
    order: string[];
} | {
    ok: false;
    reason: 'default';
};
/**
 * Plan a hide: I1 makes hiding the starred preset impossible, so the plan
 * rejects it and the controller turns the rejection into a message instead
 * of touching `order` or settings.
 * @param presets - the current roster.
 * @param order - the stored order.
 * @param id - the preset to hide.
 * @returns the next order, or the rejection reason.
 */
export declare function planHide(presets: readonly {
    id: string;
    isDefault: boolean;
}[], order: readonly string[], id: string): HidePlan;
/**
 * Plan an unhide: the preset reappends at the end of the list (hidden
 * positions are deliberately not preserved, DESIGN.md §6.1). No-op for an
 * already-visible preset.
 * @param order - the stored order.
 * @param id - the preset to unhide.
 * @returns the next order.
 */
export declare function planUnhide(order: readonly string[], id: string): string[];
/**
 * I3: when nothing is starred and the list has just become empty, the Host
 * default must be unset so new sessions fall back to the deployment default.
 * @param presets - the current roster.
 * @param nextOrder - the order the write is about to land.
 * @returns true when the controller must also `settings.mutate` unset the default.
 */
export declare function shouldUnsetDefault(presets: readonly {
    id: string;
    isDefault: boolean;
}[], nextOrder: readonly string[]): boolean;
/** Group key for Sessions outside every preset: no preset, or preset deleted. */
export declare const UNGROUPED_PRESET_KEY = "";
/** One session row inside a preset group. */
export interface PresetSessionNode {
    id: SessionId;
    /** Stored display title; the renderer localizes the blank-row label. */
    title: string;
    /** The provisional blank session (renderer shows the localized New Session title). */
    blank: boolean;
    running: boolean;
    /** Finished while not selected and not yet opened (the green "done" dot). */
    completed: boolean;
    updatedAt: number;
}
/** One preset group section of the tree. */
export interface PresetGroupNode {
    /** Group key: the preset id or {@link UNGROUPED_PRESET_KEY}. */
    key: string;
    /** Backing preset id; absent only for the ungrouped bucket. */
    presetId: string | undefined;
    label: string;
    /** Display description (override → published → absent). */
    description: string | undefined;
    /** True for presets outside `order`: dimmed, not draggable, pinned at the end. */
    hidden: boolean;
    /** True while the preset is the deployment default (solid star). */
    isDefault: boolean;
    /** True when the preset cannot compose sessions (rows still listed). */
    broken: boolean;
    /** Visible sessions in the group (after the query filter). */
    sessionCount: number;
    /** Visible session rows, newest first. */
    sessions: readonly PresetSessionNode[];
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
export declare function derivePresetGroups(list: SessionListState, roster: readonly RosterEntry[], order: readonly string[], archivedSessionIds: readonly SessionId[], query: string): PresetGroupNode[];
/** Relative-time bucket of a session row's trailing label. */
export type RelativeTimeUnit = 'now' | 'minutes' | 'hours' | 'days' | 'months' | 'years';
/** Structured relative time: the bucket plus its magnitude (0 for 'now'). */
export interface RelativeTime {
    unit: RelativeTimeUnit;
    n: number;
}
/**
 * Compact relative time for session rows (mirror of the official browser's
 * `relativeTime`, kept here so the plugin bundles no ui-workspace runtime).
 * @param updatedAt - epoch ms of the session's last activity.
 * @param now - current epoch ms (injected for pure rendering).
 * @returns the row's trailing time bucket and magnitude.
 */
export declare function relativeTime(updatedAt: number, now: number): RelativeTime;
