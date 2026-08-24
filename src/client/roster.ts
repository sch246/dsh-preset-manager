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
import type {
  SessionId, SessionListState, SessionSummary,
} from '@deepseek-ai/dsh-client-runtime/client'

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

/**
 * The plugin's display-layer state, persisted under `dsh.presetManager.v1`.
 * The star (default) is NOT stored here: the authoritative copy lives in the
 * official `agent-presets.default` setting; `roster.isDefault` is the star.
 */
export interface PresetManagerState {
  /** Ordered visible presets: display order = new-session selector order. */
  order: string[]
  /** Display-name/description overrides (the rename landing point). */
  overrides: Record<string, { name?: string; description?: string }>
}

/** One roster entry with the display-layer state folded in. */
export interface RosterEntry {
  id: string
  trust: 'system' | 'user'
  /** True while the roster marks this preset as the deployment default (the star). */
  isDefault: boolean
  /** True when NOT in `order`: hidden from the selector, dimmed in the tree. */
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
 * @param state - the plugin store snapshot (`order` + `overrides`).
 * @returns one entry per preset, display facts resolved.
 */
export function deriveRoster(
  presets: readonly HostPreset[],
  state: PresetManagerState,
): RosterEntry[] {
  const visible = new Set(state.order)
  return presets.map((preset) => {
    const override = state.overrides[preset.id]
    return {
      id: preset.id,
      trust: preset.trust,
      isDefault: preset.isDefault,
      hidden: !visible.has(preset.id),
      broken: preset.broken !== undefined,
      displayName: override?.name ?? preset.name ?? preset.id,
      description: override?.description ?? preset.description,
    }
  })
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
export function reconcile(
  presets: readonly { id: string; isDefault: boolean }[],
  order: readonly string[],
): string[] {
  const existing = new Set(presets.map(preset => preset.id))
  const next: string[] = []
  const seen = new Set<string>()
  for (const id of order) {
    if (!existing.has(id) || seen.has(id)) continue
    next.push(id)
    seen.add(id)
  }
  for (const preset of presets) {
    if (seen.has(preset.id)) continue
    next.push(preset.id)
    seen.add(preset.id)
  }
  const defaultId = presets.find(preset => preset.isDefault)?.id
  if (defaultId !== undefined && !seen.has(defaultId)) next.push(defaultId)
  return next
}

/** Outcome of a hide attempt, computed pure before any write. */
export type HidePlan = { ok: true; order: string[] } | { ok: false; reason: 'default' }

/**
 * Plan a hide: I1 makes hiding the starred preset impossible, so the plan
 * rejects it and the controller turns the rejection into a message instead
 * of touching `order` or settings.
 * @param presets - the current roster.
 * @param order - the stored order.
 * @param id - the preset to hide.
 * @returns the next order, or the rejection reason.
 */
export function planHide(
  presets: readonly { id: string; isDefault: boolean }[],
  order: readonly string[],
  id: string,
): HidePlan {
  if (presets.some(preset => preset.id === id && preset.isDefault)) {
    return { ok: false, reason: 'default' }
  }
  return { ok: true, order: order.filter(existing => existing !== id) }
}

/**
 * Plan an unhide: the preset reappends at the end of the list (hidden
 * positions are deliberately not preserved, DESIGN.md §6.1). No-op for an
 * already-visible preset.
 * @param order - the stored order.
 * @param id - the preset to unhide.
 * @returns the next order.
 */
export function planUnhide(order: readonly string[], id: string): string[] {
  return [...order.filter(existing => existing !== id), id]
}

/**
 * I3: when nothing is starred and the list has just become empty, the Host
 * default must be unset so new sessions fall back to the deployment default.
 * @param presets - the current roster.
 * @param nextOrder - the order the write is about to land.
 * @returns true when the controller must also `settings.mutate` unset the default.
 */
export function shouldUnsetDefault(
  presets: readonly { id: string; isDefault: boolean }[],
  nextOrder: readonly string[],
): boolean {
  return nextOrder.length === 0 && !presets.some(preset => preset.isDefault)
}

/** Group key for Sessions outside every preset: no preset, or preset deleted. */
export const UNGROUPED_PRESET_KEY = ''

/** One session row inside a preset group. */
export interface PresetSessionNode {
  id: SessionId
  /** Stored display title; the renderer localizes the blank-row label. */
  title: string
  /** The provisional blank session (renderer shows the localized New Session title). */
  blank: boolean
  running: boolean
  /** Finished while not selected and not yet opened (the green "done" dot). */
  completed: boolean
  updatedAt: number
}

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

/** Mirror of the official browser's visibility rule (tree.ts): ordinary sessions visible; blank only when current; subagent children and archived rows hidden. */
function sessionVisible(session: SessionSummary, current: SessionId | undefined, archived: ReadonlySet<SessionId>): boolean {
  return session.origin !== 'subagent'
    && !archived.has(session.id)
    && (!session.blank || session.id === current)
}

/** A blank row's canonical title never displays; the renderer localizes it. */
function sessionTitle(session: SessionSummary): string {
  return session.blank ? 'New Session' : session.displayTitle
}

/** Recency comparator: newest first, id as the deterministic tiebreak. */
function byRecency(a: SessionSummary, b: SessionSummary): number {
  if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt
  return a.id < b.id ? -1 : 1
}

function toSessionNode(session: SessionSummary): PresetSessionNode {
  return {
    id: session.id,
    title: sessionTitle(session),
    blank: session.blank,
    running: session.running,
    completed: session.completed === true,
    updatedAt: session.updatedAt,
  }
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
export function derivePresetGroups(
  list: SessionListState,
  roster: readonly RosterEntry[],
  order: readonly string[],
  archivedSessionIds: readonly SessionId[],
  query: string,
): PresetGroupNode[] {
  const q = query.trim().toLowerCase()
  const archived = new Set(archivedSessionIds)
  const membersByPreset = new Map<string | undefined, SessionSummary[]>()
  for (const id of list.ids) {
    const session = list.byId[id]
    if (session === undefined || !sessionVisible(session, list.current, archived)) continue
    const presetId = session.agentPreset !== undefined
      && roster.some(entry => entry.id === session.agentPreset)
      ? session.agentPreset
      : undefined
    const bucket = membersByPreset.get(presetId)
    if (bucket === undefined) membersByPreset.set(presetId, [session])
    else bucket.push(session)
  }
  const filtered = (sessions: readonly SessionSummary[]): SessionSummary[] =>
    q === '' ? [...sessions] : sessions.filter(session => sessionTitle(session).toLowerCase().includes(q))
  const titleMatches = (label: string, sessions: readonly SessionSummary[]): boolean =>
    q === '' || label.toLowerCase().includes(q) || sessions.some(session => sessionTitle(session).toLowerCase().includes(q))

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
      sessions: sessions.sort(byRecency).map(toSessionNode),
    })
  }
  for (const id of order) {
    const entry = rosterById.get(id)
    if (entry === undefined || entry.hidden) continue
    pushGroup(entry, id, false, entry.isDefault)
  }
  for (const entry of roster) {
    if (!entry.hidden) continue
    pushGroup(entry, entry.id, true, entry.isDefault)
  }
  pushGroup(undefined, UNGROUPED_PRESET_KEY, false, false)
  return groups
}

/** Relative-time bucket of a session row's trailing label. */
export type RelativeTimeUnit = 'now' | 'minutes' | 'hours' | 'days' | 'months' | 'years'

/** Structured relative time: the bucket plus its magnitude (0 for 'now'). */
export interface RelativeTime {
  unit: RelativeTimeUnit
  n: number
}

/**
 * Compact relative time for session rows (mirror of the official browser's
 * `relativeTime`, kept here so the plugin bundles no ui-workspace runtime).
 * @param updatedAt - epoch ms of the session's last activity.
 * @param now - current epoch ms (injected for pure rendering).
 * @returns the row's trailing time bucket and magnitude.
 */
export function relativeTime(updatedAt: number, now: number): RelativeTime {
  const MIN = 60_000
  const HOUR = 3_600_000
  const DAY = 86_400_000
  const diff = Math.max(0, now - updatedAt)
  if (diff < MIN) return { unit: 'now', n: 0 }
  if (diff < HOUR) return { unit: 'minutes', n: Math.floor(diff / MIN) }
  if (diff < DAY) return { unit: 'hours', n: Math.floor(diff / HOUR) }
  if (diff < 30 * DAY) return { unit: 'days', n: Math.floor(diff / DAY) }
  if (diff < 365 * DAY) return { unit: 'months', n: Math.floor(diff / (30 * DAY)) }
  return { unit: 'years', n: Math.floor(diff / (365 * DAY)) }
}
