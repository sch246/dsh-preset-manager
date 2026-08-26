/**
 * Pure derivation layer of dsh-preset-manager.
 *
 * Complete order + independent hidden ids + one star form the display model
 * (DESIGN.md §4):
 * - `order` = every current preset in stable display order;
 * - `hidden` = visibility only (absent from the new-session selector,
 *   dimmed and pinned to the end of the group tree);
 * - the star = the Host's `agent-presets.default` (authoritative copy in
 *   official settings); the starred preset can never be hidden (I1);
 * - new presets append to the end of the list, deleted presets drop out (I2);
 * - no star + empty list ⇒ the Host default is unset (I3).
 *
 * Every invariant is enforced here as a pure function so the controller only
 * sequences visibility/settings writes and unit tests hold the
 * invariants' positive and negative cases.
 */
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client';
import type { SessionNode } from '@deepseek-ai/dsh-client-ui-workspace/client';
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
/** Current on-disk schema written into the historical v1 localStorage key. */
export declare const PRESET_MANAGER_SCHEMA_VERSION: 2;
/**
 * The plugin's display-layer state, persisted under `dsh.presetManager.v1`.
 * The star (default) is NOT stored here: the authoritative copy lives in the
 * official `agent-presets.default` setting; `roster.isDefault` is the star.
 */
export interface PresetManagerState {
    /** Explicit schema marker; do not infer install lifecycle from an empty order. */
    schemaVersion: typeof PRESET_MANAGER_SCHEMA_VERSION;
    /** False only before a fresh installation has reconciled its first Host roster. */
    initialized: boolean;
    /** Complete preset order; visibility is independent so hiding preserves position. */
    order: string[];
    /** Hidden preset ids; persisted separately from order. */
    hidden: string[];
    /** Display-name/description overrides (the rename landing point). */
    overrides: Record<string, {
        name?: string;
        description?: string;
    }>;
}
/**
 * Runtime shape accepted from the whole-object localStorage hydration used by
 * the Harness store engine. Old snapshots legitimately lack the new fields.
 */
export interface StoredPresetManagerState {
    schemaVersion?: unknown;
    initialized?: unknown;
    order?: unknown;
    hidden?: unknown;
}
/** State facts established atomically by a successful roster read. */
export type ReconciledPresetManagerState = Pick<PresetManagerState, 'schemaVersion' | 'initialized' | 'order' | 'hidden'>;
/** One roster entry with the display-layer state folded in. */
export interface RosterEntry {
    id: string;
    trust: 'system' | 'user';
    /** True while the roster marks this preset as the deployment default (the star). */
    isDefault: boolean;
    /** True when listed in `hidden`: absent from the selector, dimmed in the tree. */
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
 * @param state - the plugin store snapshot (`order` + `hidden` + `overrides`).
 * @returns one entry per preset, display facts resolved.
 */
export declare function deriveRoster(presets: readonly HostPreset[], state: PresetManagerState): RosterEntry[];
/**
 * Reconcile the complete order and independent hidden set so I1 and I2 hold:
 * - ids that no longer exist drop out; duplicates collapse (I2, deletion);
 * - preset ids the roster gained append at the end in roster order (I2, new);
 * - the starred (default) preset is removed from hidden (I1);
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
export declare function reconcile(presets: readonly {
    id: string;
    isDefault: boolean;
}[], stored: StoredPresetManagerState): ReconciledPresetManagerState;
/** Outcome of a hide attempt, computed pure before any write. */
export type HidePlan = {
    ok: true;
    hidden: string[];
} | {
    ok: false;
    reason: 'default';
};
/**
 * Plan a hide: I1 makes hiding the starred preset impossible, so the plan
 * rejects it and the controller turns the rejection into a message instead
 * of touching visibility or settings.
 * @param presets - the current roster.
 * @param hidden - the stored hidden ids.
 * @param id - the preset to hide.
 * @returns the next hidden ids, or the rejection reason.
 */
export declare function planHide(presets: readonly {
    id: string;
    isDefault: boolean;
}[], hidden: readonly string[], id: string): HidePlan;
/**
 * Plan an unhide: remove only the visibility marker; the complete order never
 * moved, so the preset returns to its prior position.
 * @param hidden - the stored hidden ids.
 * @param id - the preset to unhide.
 * @returns the next hidden ids.
 */
export declare function planUnhide(hidden: readonly string[], id: string): string[];
/**
 * I3: when nothing is starred and the list has just become empty, the Host
 * default must be unset so new sessions fall back to the deployment default.
 * @param presets - the current roster.
 * @param order - the complete current order.
 * @param nextHidden - hidden ids after the pending write.
 * @returns true when the controller must also `settings.mutate` unset the default.
 */
export declare function shouldUnsetDefault(presets: readonly {
    id: string;
    isDefault: boolean;
}[], order: readonly string[], nextHidden: readonly string[]): boolean;
/** Group key for Sessions outside every preset: no preset, or preset deleted. */
export declare const UNGROUPED_PRESET_KEY = "";
/** One session row inside a preset group: the official Workspace projection. */
export type PresetSessionNode = SessionNode;
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
 * @param sessionNodes - official workspace projection (visibility and live status already resolved).
 * @param query - the browser's normalized search query ('' while idle).
 * @returns group sections in render order.
 */
export declare function derivePresetGroups(list: SessionListState, sessionNodes: readonly SessionNode[], roster: readonly RosterEntry[], order: readonly string[], query: string): PresetGroupNode[];
