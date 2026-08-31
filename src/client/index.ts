/**
 * dsh-preset-manager browser half.
 *
 * Two registrations over one shared store (historical storage key
 * `dsh.presetManager.v1`, explicit schema v2, one root
 * instance):
 * - `sidebar.workspaces.presetGroups` fills the patched ui-workspace child
 *   slot (the whole preset-mode tree: visible groups in order, hidden groups
 *   dimmed at the end, ungrouped bucket last);
 * - `conversation.hero.agentPreset` shadows the official new-session chip at
 *   priority -1 with the derived roster (visible presets only, display
 *   overrides applied, initialized from the explicit user default, and owns
 *   the only default write entry) — uninstalling the plugin restores the official chip.
 *
 * The default lives in the user layer of the official `agent-presets.default`
 * setting. The ui-settings describe mirror projects default-only changes onto
 * the held roster; initial load and connection recovery own roster identity
 * refreshes. Zero new RPCs: roster reads, settings writes, and the official
 * hero stage→apply and preset-group connect→select→open flows are all
 * existing verbs (DESIGN.md §5).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
// Type-only: pulls ctx.settingsScope and the shared settings describe mirror.
import type { SettingsDescribeFace } from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls ctx.remote and the forwarded-event key face into this program.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls ctx.sessions into this program.
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls ctx.slots into this program.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the patched ui-workspace SlotMap merge (the child slot).
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
// Type-only: pulls the ui-conversation SlotMap merge (the hero seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { en, zh, type PresetManagerKey } from './locales.ts'
import type { HostPreset, PresetManagerState, ProjectedPreset, RosterEntry, RosterSnapshot } from './roster.ts'
import { planHide, planUnhide, shouldUnsetDefault } from './roster.ts'
import { PresetGroups, type PresetGroupsInjected } from './PresetGroups.tsx'
import { SeatChip, type SeatChipInjected, type SeatState } from './SeatChip.tsx'
import { startPresetSession } from './start-session.ts'
import { createPresetManagerStore, type PresetManagerBakedActions } from './stores.ts'

/** The agent-preset settings namespace on the host wire (stable official name). */
const AGENT_PRESET_SETTINGS_NS = 'agent-presets'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The preset tree and shadow chip copy. */
    presetManager: PresetManagerKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'presetManager'

/** Human text for a rejected wire call (transport rejects or refuses). */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Read only the raw user layer; the resolved value may contain a deployment fallback. */
function explicitUserDefault(settings: SettingsDescribeFace): string | undefined {
  const snapshot = settings.getSnapshot()
  if (snapshot.status === 'idle' || snapshot.status === 'loading') {
    throw new Error('agent-preset settings are not ready')
  }
  const row = snapshot.view?.namespaces.find(candidate => candidate.ns === AGENT_PRESET_SETTINGS_NS)
  const user = row?.user
  if (typeof user !== 'object' || user === null || Array.isArray(user)) return undefined
  const value = (user as Record<string, unknown>).default
  return typeof value === 'string' ? value : undefined
}

/** Replace the Host fallback flag with the explicit user-default projection. */
function projectExplicitDefault(
  presets: readonly HostPreset[],
  explicitDefaultId: string | undefined,
): ProjectedPreset[] {
  return presets.map(preset => ({ ...preset, isDefault: preset.id === explicitDefaultId }))
}

/** Persist one preset as the explicit user default. */
async function writeDefaultPreset(
  remote: Pick<ClientRemote, 'settings'>,
  settings: SettingsDescribeFace,
  id: string,
): Promise<string | undefined> {
  try {
    const response = await remote.settings.update(
      AGENT_PRESET_SETTINGS_NS,
      { default: id },
      undefined,
    )
    if (!response.ok) return response.error.message
    settings.acceptView(response.value)
    return undefined
  } catch (error) {
    return messageOf(error)
  }
}

/** Clear the user default so selection can fall back to the recent Session. */
async function clearDefaultPreset(
  remote: Pick<ClientRemote, 'settings'>,
  settings: SettingsDescribeFace,
): Promise<string | undefined> {
  try {
    const response = await remote.settings.mutate(
      AGENT_PRESET_SETTINGS_NS,
      [{ op: 'unset', path: ['default'] }],
      undefined,
    )
    if (!response.ok) return response.error.message
    settings.acceptView(response.value)
    return undefined
  } catch (error) {
    return messageOf(error)
  }
}

/**
 * Roster lifecycle, default projection, and management sequencing. Pure
 * decisions live in roster.ts; this controller reserves full reads and
 * reconcile for lifecycle refreshes while settings writes and mirror updates
 * project onto the held roster (DESIGN.md §4.2).
 */
class RosterController {
  /** Roster snapshot shared by the tree and the shadow chip. */
  readonly store: SnapshotStore<RosterSnapshot> = createSnapshotStore<RosterSnapshot>({
    status: 'idle',
    error: null,
    presets: [],
  })

  private generation = 0

  constructor(
    private readonly remote: Pick<ClientRemote, 'agentPresets' | 'settings'>,
    private readonly settings: SettingsDescribeFace,
  ) {}

  private set(patch: Partial<RosterSnapshot>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  /** Project the mirrored user default without invalidating roster identity or managed state. */
  projectDefault(actions?: PresetManagerBakedActions): void {
    const settingsSnapshot = this.settings.getSnapshot()
    if (settingsSnapshot.status === 'idle' || settingsSnapshot.status === 'loading') return
    const explicitDefaultId = explicitUserDefault(this.settings)
    const before = this.store.getSnapshot()
    if (
      explicitDefaultId !== undefined
      && before.presets.some(preset => preset.id === explicitDefaultId)
    ) {
      // The action is an Immer no-op unless an external settings writer named
      // a currently hidden preset, so ordinary default changes do not publish
      // or persist the preset-manager store.
      actions?.ensureDefaultVisible(explicitDefaultId)
    }
    let changed = false
    const presets = before.presets.map((preset) => {
      const isDefault = preset.id === explicitDefaultId
      if (preset.isDefault === isDefault) return preset
      changed = true
      return { ...preset, isDefault }
    })
    if (changed) this.set({ presets })
  }

  /** Read roster and explicit user default, then reconcile the stored order (I1/I2). */
  async load(actions?: PresetManagerBakedActions): Promise<void> {
    const generation = ++this.generation
    this.set({ status: 'loading', error: null })
    let presets: readonly ProjectedPreset[]
    try {
      const [response] = await Promise.all([
        this.remote.agentPresets.list(),
        this.settings.ensure(),
      ])
      if (!response.ok) throw new Error(response.error.message)
      presets = projectExplicitDefault(response.value.presets, explicitUserDefault(this.settings))
    } catch (error) {
      if (generation !== this.generation) return
      this.set({ status: 'error', error: messageOf(error), presets: [] })
      return
    }
    if (generation !== this.generation) return
    // Publish ready only after the store has atomically classified and folded
    // fresh / legacy / current state. This prevents a one-render visibility
    // flash while a whole-object legacy snapshot is still unreconciled.
    actions?.reconcileState(presets)
    this.set({ status: 'ready', error: null, presets })
  }

  /** Set one visible hero-menu preset as the user default. */
  async setDefault(id: string): Promise<PresetManagerKey | undefined> {
    const { presets } = this.store.getSnapshot()
    if (!presets.some(preset => preset.id === id)) return 'action.failed'
    const failure = await writeDefaultPreset(this.remote, this.settings, id)
    if (failure !== undefined) return 'action.failed'
    return undefined
  }

  /** Clear the explicit user default without changing the selected preset. */
  async unsetDefault(id: string): Promise<PresetManagerKey | undefined> {
    const { presets } = this.store.getSnapshot()
    if (!presets.some(preset => preset.id === id && preset.isDefault)) return 'action.failed'
    const failure = await clearDefaultPreset(this.remote, this.settings)
    if (failure !== undefined) return 'action.failed'
    return undefined
  }

  /** Hide a preset; the default one is rejected (I1), and I3 may unset the default. */
  async hide(actions: PresetManagerBakedActions, state: PresetManagerState, id: string): Promise<PresetManagerKey | undefined> {
    const { presets } = this.store.getSnapshot()
    const plan = planHide(presets, state.hidden ?? [], id)
    if (!plan.ok) return 'hide.rejected'
    actions.setHidden(plan.hidden)
    if (shouldUnsetDefault(presets, state.order, plan.hidden)) {
      const failure = await clearDefaultPreset(this.remote, this.settings)
      if (failure !== undefined) console.warn('preset default unset failed:', failure)
    }
    return undefined
  }

  /** Unhide without moving the preset's stable order position. */
  async unhide(actions: PresetManagerBakedActions, state: PresetManagerState, id: string): Promise<void> {
    actions.setHidden(planUnhide(state.hidden ?? [], id))
  }

  /** Write the display name/description override (store only). */
  async rename(actions: PresetManagerBakedActions, id: string, override: { name: string; description: string }): Promise<void> {
    actions.setOverride(id, override)
  }
}

/** One session's identity and whether it has started (the seat apply gate). */
interface SeatSessionSummary {
  id: SessionId
  blank: boolean
  projectionValues?: SessionSummary['projectionValues']
}

/**
 * Stages the next session's preset and applies it when one becomes current
 * (the official stage→apply semantics, minus the introduce cue).
 */
class SeatController {
  readonly store: SnapshotStore<SeatState> = createSnapshotStore<SeatState>({
    current: '',
    error: null,
    busy: false,
  })

  /** Current initial-priority result, used to recover a rejected selection. */
  private fallback = ''
  /** Manual choice retained for this mounted page across asynchronous refreshes. */
  private manualSelection: string | undefined
  /** Manual choice still waiting to be applied to a blank Session. */
  private pendingApply: string | undefined

  constructor(
    private readonly remote: Pick<ClientRemote, 'agentPresets'>,
    /** The session the hero is about to hand over to, when there is one. */
    private readonly currentSession: () => SeatSessionSummary | undefined,
  ) {}

  private set(patch: Partial<SeatState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  /**
   * Resolve initial selection from explicit user default → recent Session →
   * first visible healthy managed entry. A later manual choice stays current.
   */
  sync(roster: readonly RosterEntry[]): void {
    const available = roster.filter(entry => !entry.hidden && !entry.broken)
    const availableIds = new Set(available.map(entry => entry.id))
    if (this.manualSelection !== undefined && !availableIds.has(this.manualSelection)) {
      this.manualSelection = undefined
      this.pendingApply = undefined
    }
    const explicitDefault = available.find(entry => entry.isDefault)?.id
    const recent = presetOf(this.currentSession())
    this.fallback = explicitDefault
      ?? (recent !== undefined && availableIds.has(recent) ? recent : undefined)
      ?? available[0]?.id
      ?? ''
    const current = this.manualSelection ?? this.fallback
    if (this.store.getSnapshot().current !== current) this.set({ current })
  }

  /** Stage one preset for the next session, applying immediately when a blank session is current. */
  async select(id: string): Promise<void> {
    if (this.store.getSnapshot().busy) return
    this.stage(id)
    await this.apply()
  }

  /** Retain a hero pick until its blank Session becomes current. */
  private stage(id: string): void {
    this.manualSelection = id
    this.pendingApply = id
    this.set({ current: id, error: null })
  }

  /** Keep a repeated current-row choice selected while its default write settles. */
  retainSelection(id: string): void {
    this.manualSelection = id
    this.set({ current: id })
  }

  /** Adopt a successful preset-group selection without staging another apply. */
  acceptSelection(id: string): void {
    this.manualSelection = id
    this.pendingApply = undefined
    this.set({ current: id, error: null, busy: false })
  }

  /** Hand the staged choice to the current session, if there is one to take it. */
  async apply(): Promise<void> {
    const staged = this.pendingApply
    const session = this.currentSession()
    if (staged === undefined || session === undefined) return
    if (!session.blank || presetOf(session) === staged) {
      this.pendingApply = undefined
      return
    }
    this.set({ busy: true, error: null })
    try {
      const response = await this.remote.agentPresets.select(session.id, staged)
      this.pendingApply = undefined
      if (!response.ok) {
        this.manualSelection = undefined
        this.set({ busy: false, error: response.error.message, current: this.fallback })
        return
      }
      this.set({ busy: false, current: response.value })
    } catch (error) {
      this.manualSelection = undefined
      this.pendingApply = undefined
      this.set({ busy: false, error: messageOf(error), current: this.fallback })
    }
  }
}

/** Current agent-preset projection carried by one Session list row. */
function presetOf(session: SeatSessionSummary | undefined): string | undefined {
  const value = session?.projectionValues?.agentPreset
  return typeof value === 'string' ? value : undefined
}

/** Required services (cordis fiber inject); the inner scope adds conversation/sessions/workspaces. */
export const inject = [
  'slots', 'locale', 'remote', 'remote.agentPresets', 'remote.settings', 'settingsScope', 'sessions', 'uiWorkspace',
]

/**
 * Register the preset tree (once the patched slot is declared) and the
 * shadow seat chip (in the conversation scope).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const settings = ctx.settingsScope.describe()
  const controller = new RosterController(ctx.remote, settings)
  // One shared handle → the framework resolves ONE root instance both
  // registrations read and write (the single list of the whole plugin).
  const presetStore = createPresetManagerStore()
  // Latest baked actions, set by whichever registration's inject factory ran;
  // event-driven reconciles use it, and a mount-time load() covers the rest.
  let currentActions: PresetManagerBakedActions | undefined
  let startSessionByPreset: (id: string, workspaceId?: WorkspaceId) => Promise<PresetManagerKey | undefined> = async () => 'action.failed'
  let seatRef: SeatController | undefined
  // The root preset tree can precede the conversation child scope. Bind its
  // navigation while the root services are available; seat reconciliation is optional.
  startSessionByPreset = async (id: string, workspaceId?: WorkspaceId): Promise<PresetManagerKey | undefined> => {
    return startPresetSession({
      connectWorkspace: target => ctx.uiWorkspace.connectWorkspace(target),
      selectPreset: (sessionId, presetId) => ctx.remote.agentPresets.select(sessionId, presetId),
      acceptSelection: selected => seatRef?.acceptSelection(selected),
      open: sessionId => ctx.sessions.open(sessionId),
    }, id, workspaceId)
  }

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-preset-manager: dictionaries')

  ctx.effect(() => settings.subscribe(() => {
    const snapshot = settings.getSnapshot()
    if (snapshot.status === 'ready' || snapshot.status === 'unavailable') {
      controller.projectDefault(currentActions)
    }
  }), 'dsh-preset-manager: default projection')

  ctx.effect(() => ctx.on('connection/reset', () => {
    void controller.load(currentActions)
  }), 'dsh-preset-manager: roster connection refresh')

  const treeInjected = (actions: PresetManagerBakedActions): PresetGroupsInjected => {
    currentActions = actions
    controller.projectDefault(actions)
    return {
      hooks: { roster: controller.store },
      load: () => controller.load(actions),
      open: (sessionId) => { ctx.sessions.open(sessionId) },
      startSessionByPreset: (id, workspaceId) => startSessionByPreset(id, workspaceId),
      hide: (state, id) => controller.hide(actions, state, id),
      unhide: (state, id) => controller.unhide(actions, state, id),
      rename: (id, override) => controller.rename(actions, id, override),
    }
  }

  // The patched slot only exists while the patched WorkspaceBrowser entry is
  // mounted; injection follows both the owner and declaration lifetimes.
  ctx.slots.inject('sidebar.workspaces.presetGroups', () => ctx.slots.register(
    {
      name: 'sidebar.workspaces.presetGroups',
      store: presetStore,
      inject: treeInjected,
      locale: NS,
    },
    PresetGroups,
  ))

  // The shadow chip: same conversation scope as the official chip, lower
  // priority (legal shadow; uninstalling restores the official entry).
  ctx.inject([
    'slots', 'conversation', 'sessions', 'remote', 'remote.agentPresets',
  ], (scope: ClientContext) => {
    const seatCtl = new SeatController(
      scope.remote,
      (): SeatSessionSummary | undefined => {
        const state = scope.sessions.list.getSnapshot()
        const summary = state.current === undefined ? undefined : state.byId[state.current]
        return summary === undefined
          ? undefined
          : {
            id: summary.id,
            blank: summary.blank,
            ...(summary.projectionValues === undefined
              ? {}
              : { projectionValues: summary.projectionValues }),
          }
      },
    )
    seatRef = seatCtl
    scope.effect(() => {
      // A hero pick made without a current Session applies when a later
      // Workspace navigation makes a blank Session current.
      const stop = scope.sessions.list.subscribe(() => { void seatCtl.apply() })
      const seatInjected = (actions: PresetManagerBakedActions): SeatChipInjected => {
        currentActions = actions
        controller.projectDefault(actions)
        return {
          hooks: { seat: seatCtl.store, roster: controller.store },
          load: () => controller.load(actions),
          sync: roster => { seatCtl.sync(roster) },
          select: (id: string) => seatCtl.select(id),
          setDefault: (id) => {
            seatCtl.retainSelection(id)
            return controller.setDefault(id)
          },
          unsetDefault: (id) => {
            seatCtl.retainSelection(id)
            return controller.unsetDefault(id)
          },
        }
      }
      const chip = scope.slots.register({
        name: 'conversation.hero.agentPreset',
        // Shadow the official chip (priority 0) without replacing its entry.
        priority: -1,
        store: presetStore,
        inject: seatInjected,
        locale: NS,
      }, SeatChip)
      return () => {
        stop()
        chip()
        if (seatRef === seatCtl) seatRef = undefined
      }
    }, 'dsh-preset-manager: shadow seat chip')
  })
}
