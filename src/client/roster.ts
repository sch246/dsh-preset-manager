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
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionNode } from '@deepseek-ai/dsh-client-ui-workspace/client'

/** One Host roster entry exactly as `agentPreset.list` reports it. */
export interface HostPreset {
  id: string
  trust: 'system' | 'user'
  isDefault: boolean
  name?: string
  description?: string
  broken?: string
}

/**
 * The roster read snapshot the renderer subscribes to (controller-owned;
 * shared by the tree and the shadow chip through the inject hooks seat).
 */
export interface RosterSnapshot {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  presets: readonly HostPreset[]
}

/** Current on-disk schema written into the historical v1 localStorage key. */
export const PRESET_MANAGER_SCHEMA_VERSION = 2 as const

/**
 * The plugin's display-layer state, persisted under `dsh.presetManager.v1`.
 * The star (default) is NOT stored here: the authoritative copy lives in the
 * official `agent-presets.default` setting; `roster.isDefault` is the star.
 */
export interface PresetManagerState {
  /** Explicit schema marker; do not infer install lifecycle from an empty order. */
  schemaVersion: typeof PRESET_MANAGER_SCHEMA_VERSION
  /** False only before a fresh installation has reconciled its first Host roster. */
  initialized: boolean
  /** Complete preset order; visibility is independent so hiding preserves position. */
  order: string[]
  /** Hidden preset ids; persisted separately from order. */
  hidden: string[]
  /** Display-name/description overrides (the rename landing point). */
  overrides: Record<string, { name?: string; description?: string }>
}

/**
 * Runtime shape accepted from the whole-object localStorage hydration used by
 * the Harness store engine. Old snapshots legitimately lack the new fields.
 */
export interface StoredPresetManagerState {
  schemaVersion?: unknown
  initialized?: unknown
  order?: unknown
  hidden?: unknown
}

/** State facts established atomically by a successful roster read. */
export type ReconciledPresetManagerState = Pick<
  PresetManagerState,
  'schemaVersion' | 'initialized' | 'order' | 'hidden'
>

/** One roster entry with the display-layer state folded in. */
export interface RosterEntry {
  id: string
  trust: 'system' | 'user'
  /** True while the roster marks this preset as the deployment default (the star). */
  isDefault: boolean
  /** True when listed in `hidden`: absent from the selector, dimmed in the tree. */
  hidden: boolean
  /** True when the preset cannot compose a session (still listed, never offered). */
  broken: boolean
  /** Display name: override → published name → id. */
  displayName: string
  /** Display description: override → published → absent. */
  description: string | undefined
}

/**
 * Fold the Host roster with the plugin's display state.
 * @param presets - the Host roster as reported by `agentPreset.list`.
 * @param state - the plugin store snapshot (`order` + `hidden` + `overrides`).
 * @returns one entry per preset, display facts resolved.
 */
export function deriveRoster(
  presets: readonly HostPreset[],
  state: PresetManagerState,
): RosterEntry[] {
  // Old v1 snapshots are rehydrated wholesale and briefly lack `hidden`
  // until reconcile migrates them; render them visible during that interval.
  const hidden = new Set(Array.isArray(state.hidden) ? state.hidden : [])
  return presets.map((preset) => {
    const override = state.overrides?.[preset.id]
    return {
      id: preset.id,
      trust: preset.trust,
      isDefault: preset.isDefault,
      hidden: hidden.has(preset.id),
      broken: preset.broken !== undefined,
      displayName: override?.name ?? preset.name ?? preset.id,
      description: override?.description ?? preset.description,
    }
  })
}

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
export function reconcile(
  presets: readonly { id: string; isDefault: boolean }[],
  stored: StoredPresetManagerState,
): ReconciledPresetManagerState {
  const order = Array.isArray(stored.order)
    ? stored.order.filter((id): id is string => typeof id === 'string')
    : []
  const storedHidden = Array.isArray(stored.hidden)
    ? stored.hidden.filter((id): id is string => typeof id === 'string')
    : undefined
  const legacyVisibleOrder = stored.schemaVersion !== PRESET_MANAGER_SCHEMA_VERSION
    && storedHidden === undefined
  const existing = new Set(presets.map(preset => preset.id))
  const next: string[] = []
  const seen = new Set<string>()
  for (const id of order) {
    if (!existing.has(id) || seen.has(id)) continue
    next.push(id)
    seen.add(id)
  }
  const appended: string[] = []
  for (const preset of presets) {
    if (seen.has(preset.id)) continue
    next.push(preset.id)
    appended.push(preset.id)
    seen.add(preset.id)
  }
  const defaultId = presets.find(preset => preset.isDefault)?.id
  const hiddenSource = legacyVisibleOrder ? appended : (storedHidden ?? [])
  const nextHidden: string[] = []
  const hiddenSeen = new Set<string>()
  for (const id of hiddenSource) {
    if (!existing.has(id) || id === defaultId || hiddenSeen.has(id)) continue
    nextHidden.push(id)
    hiddenSeen.add(id)
  }
  return {
    schemaVersion: PRESET_MANAGER_SCHEMA_VERSION,
    initialized: true,
    order: next,
    hidden: nextHidden,
  }
}

/** Outcome of a hide attempt, computed pure before any write. */
export type HidePlan = { ok: true; hidden: string[] } | { ok: false; reason: 'default' }

/**
 * Plan a hide: I1 makes hiding the starred preset impossible, so the plan
 * rejects it and the controller turns the rejection into a message instead
 * of touching visibility or settings.
 * @param presets - the current roster.
 * @param hidden - the stored hidden ids.
 * @param id - the preset to hide.
 * @returns the next hidden ids, or the rejection reason.
 */
export function planHide(
  presets: readonly { id: string; isDefault: boolean }[],
  hidden: readonly string[],
  id: string,
): HidePlan {
  if (presets.some(preset => preset.id === id && preset.isDefault)) {
    return { ok: false, reason: 'default' }
  }
  return { ok: true, hidden: [...hidden.filter(existing => existing !== id), id] }
}

/**
 * Plan an unhide: remove only the visibility marker; the complete order never
 * moved, so the preset returns to its prior position.
 * @param hidden - the stored hidden ids.
 * @param id - the preset to unhide.
 * @returns the next hidden ids.
 */
export function planUnhide(hidden: readonly string[], id: string): string[] {
  return hidden.filter(existing => existing !== id)
}

/**
 * I3: when nothing is starred and the list has just become empty, the Host
 * default must be unset so new sessions fall back to the deployment default.
 * @param presets - the current roster.
 * @param order - the complete current order.
 * @param nextHidden - hidden ids after the pending write.
 * @returns true when the controller must also `settings.mutate` unset the default.
 */
export function shouldUnsetDefault(
  presets: readonly { id: string; isDefault: boolean }[],
  order: readonly string[],
  nextHidden: readonly string[],
): boolean {
  if (presets.some(preset => preset.isDefault)) return false
  const existing = new Set(presets.map(preset => preset.id))
  const hidden = new Set(nextHidden)
  return !order.some(id => existing.has(id) && !hidden.has(id))
}

/** Group key for Sessions outside every preset: no preset, or preset deleted. */
export const UNGROUPED_PRESET_KEY = ''

/** One session row inside a preset group: the official Workspace projection. */
export type PresetSessionNode = SessionNode

/** One preset group section of the tree. */
export interface PresetGroupNode {
  /** Group key: the preset id or {@link UNGROUPED_PRESET_KEY}. */
  key: string
  /** Backing preset id; absent only for the ungrouped bucket. */
  presetId: string | undefined
  label: string
  /** Display description (override → published → absent). */
  description: string | undefined
  /** True for presets outside `order`: dimmed, not draggable, pinned at the end. */
  hidden: boolean
  /** True while the preset is the deployment default (solid star). */
  isDefault: boolean
  /** True when the preset cannot compose sessions (rows still listed). */
  broken: boolean
  /** Visible sessions in the group (after the query filter). */
  sessionCount: number
  /** Visible session rows, newest first. */
  sessions: readonly PresetSessionNode[]
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
export function derivePresetGroups(
  list: SessionListState,
  sessionNodes: readonly SessionNode[],
  roster: readonly RosterEntry[],
  order: readonly string[],
  query: string,
): PresetGroupNode[] {
  const q = query.trim().toLowerCase()
  const membersByPreset = new Map<string | undefined, SessionNode[]>()
  for (const node of sessionNodes) {
    const summary = list.byId[node.id]
    if (summary === undefined) continue
    const projectedPreset = summary.projectionValues?.agentPreset
    const presetId = typeof projectedPreset === 'string'
      && roster.some(entry => entry.id === projectedPreset)
      ? projectedPreset
      : undefined
    const bucket = membersByPreset.get(presetId)
    if (bucket === undefined) membersByPreset.set(presetId, [node])
    else bucket.push(node)
  }
  const filtered = (sessions: readonly SessionNode[]): SessionNode[] =>
    q === '' ? [...sessions] : sessions.filter(session => session.title.toLowerCase().includes(q))
  const titleMatches = (label: string, sessions: readonly SessionNode[]): boolean =>
    q === '' || label.toLowerCase().includes(q) || sessions.some(session => session.title.toLowerCase().includes(q))

  const rosterById = new Map(roster.map(entry => [entry.id, entry]))
  const groups: PresetGroupNode[] = []
  const pushGroup = (entry: RosterEntry | undefined, key: string, hidden: boolean, isDefault: boolean): void => {
    const label = entry === undefined ? 'Ungrouped' : entry.displayName
    const bucketKey = key === UNGROUPED_PRESET_KEY ? undefined : key
    const members = membersByPreset.get(bucketKey) ?? []
    if (entry !== undefined && !titleMatches(label, members)) return
    const sessions = filtered(members)
    if (key === UNGROUPED_PRESET_KEY && sessions.length === 0) return
    groups.push({
      key,
      presetId: key === UNGROUPED_PRESET_KEY ? undefined : key,
      label,
      description: entry?.description,
      hidden,
      isDefault,
      broken: entry?.broken === true,
      sessionCount: sessions.length,
      sessions,
    })
  }
  for (const id of order) {
    const entry = rosterById.get(id)
    if (entry === undefined || entry.hidden) continue
    pushGroup(entry, id, false, entry.isDefault)
  }
  const ordered = new Set(order)
  for (const id of order) {
    const entry = rosterById.get(id)
    if (entry === undefined || !entry.hidden) continue
    pushGroup(entry, entry.id, true, entry.isDefault)
  }
  for (const entry of roster) {
    if (!entry.hidden || ordered.has(entry.id)) continue
    pushGroup(entry, entry.id, true, entry.isDefault)
  }
  pushGroup(undefined, UNGROUPED_PRESET_KEY, false, false)
  return groups
}
