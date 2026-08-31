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
 *   overrides applied, opened on the Host default, and owns the only default
 *   write entry) — uninstalling the plugin restores the official chip.
 *
 * The default lives in the official `agent-presets.default` setting;
 * `settings/document-updated` keeps both surfaces and the settings page in
 * sync. Zero new RPCs: roster reads, settings writes, and the official
 * stage→apply session flow are all existing verbs (DESIGN.md §5).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
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
import type { HostPreset, PresetManagerState, RosterSnapshot } from './roster.ts'
import { planHide, planUnhide, shouldUnsetDefault } from './roster.ts'
import { PresetGroups, type PresetGroupsInjected } from './PresetGroups.tsx'
import { SeatChip, type SeatChipInjected, type SeatState } from './SeatChip.tsx'
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

/** Persist one preset as the deployment default. */
async function writeDefaultPreset(remote: Pick<ClientRemote, 'settings'>, id: string): Promise<string | undefined> {
  try {
    const response = await remote.settings.update(
      AGENT_PRESET_SETTINGS_NS,
      { default: id },
      undefined,
    )
    return response.ok ? undefined : response.error.message
  } catch (error) {
    return messageOf(error)
  }
}

/** I3: unset the official default so new sessions fall back to the deployment default. */
async function unsetDefaultPreset(remote: Pick<ClientRemote, 'settings'>): Promise<void> {
  try {
    await remote.settings.mutate(
      AGENT_PRESET_SETTINGS_NS,
      [{ op: 'unset', path: ['default'] }],
      undefined,
    )
  } catch (error) {
    console.warn('preset default unset failed:', error)
  }
}

/**
 * Roster read + management sequencing. Pure decisions live in roster.ts;
 * this controller only sequences visibility first (when needed), settings
 * second, then re-read (DESIGN.md §4.2) — every path is idempotent because
 * reconcile re-establishes I1/I2 on the echo.
 */
class RosterController {
  /** Roster snapshot shared by the tree and the shadow chip. */
  readonly store: SnapshotStore<RosterSnapshot> = createSnapshotStore<RosterSnapshot>({
    status: 'idle',
    error: null,
    presets: [],
  })

  constructor(private readonly remote: Pick<ClientRemote, 'agentPresets' | 'settings'>) {}

  private set(patch: Partial<RosterSnapshot>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  /** Read the roster and reconcile the stored order (I1/I2). */
  async load(actions?: PresetManagerBakedActions): Promise<void> {
    if (this.store.getSnapshot().status === 'loading') return
    this.set({ status: 'loading', error: null })
    let presets: readonly HostPreset[]
    try {
      const response = await this.remote.agentPresets.list()
      if (!response.ok) throw new Error(response.error.message)
      presets = response.value.presets
    } catch (error) {
      this.set({ status: 'error', error: messageOf(error), presets: [] })
      return
    }
    // Publish ready only after the store has atomically classified and folded
    // fresh / legacy / current state. This prevents a one-render visibility
    // flash while a whole-object legacy snapshot is still unreconciled.
    actions?.reconcileState(presets)
    this.set({ status: 'ready', error: null, presets })
  }

  /** Set one visible hero-menu preset as the Host default, then re-read the roster. */
  async setDefault(actions: PresetManagerBakedActions, id: string): Promise<PresetManagerKey | undefined> {
    const { presets } = this.store.getSnapshot()
    if (!presets.some(preset => preset.id === id)) return 'action.failed'
    const failure = await writeDefaultPreset(this.remote, id)
    if (failure !== undefined) return 'action.failed'
    await this.load(actions)
    return undefined
  }

  /** Hide a preset; the default one is rejected (I1), and I3 may unset the default. */
  async hide(actions: PresetManagerBakedActions, state: PresetManagerState, id: string): Promise<PresetManagerKey | undefined> {
    const { presets } = this.store.getSnapshot()
    const plan = planHide(presets, state.hidden ?? [], id)
    if (!plan.ok) return 'hide.rejected'
    actions.setHidden(plan.hidden)
    if (shouldUnsetDefault(presets, state.order, plan.hidden)) await unsetDefaultPreset(this.remote)
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

  /** The deployment default, so a consumed stage falls back without re-reading. */
  private fallback = ''
  /** Set while a pick is waiting for a session; cleared once applied. */
  private staged: string | undefined
  /**
   * Set while the + flow is waiting for the NEXT blank session: unlike a
   * hero-chip pick (which dies when a started session is current), this
   * stage must survive the running conversation until the workspace connect
   * makes its blank session current.
   */
  private pendingApply = false

  constructor(
    private readonly remote: Pick<ClientRemote, 'agentPresets'>,
    /** The session the hero is about to hand over to, when there is one. */
    private readonly currentSession: () => SeatSessionSummary | undefined,
  ) {}

  private set(patch: Partial<SeatState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  /** Read the roster and open the chip on the deployment default. */
  async load(): Promise<void> {
    try {
      const response = await this.remote.agentPresets.list()
      if (!response.ok) {
        this.set({ error: response.error.message })
        return
      }
      const { presets } = response.value
      this.fallback = presets.find(preset => preset.isDefault)?.id ?? presets[0]?.id ?? ''
      this.set({
        current: this.staged ?? presetOf(this.currentSession()) ?? this.fallback,
        error: null,
      })
    } catch (error) {
      this.set({ error: messageOf(error) })
    }
  }

  /** Stage one preset for the next session, applying immediately when a blank session is current. */
  async select(id: string): Promise<void> {
    if (this.store.getSnapshot().busy) return
    this.pendingApply = false
    this.stage(id)
    await this.apply()
  }

  /** Stage WITHOUT the immediate apply (the tree's + button starts the session after the pick). */
  stage(id: string): void {
    this.staged = id
    this.set({ current: id, error: null })
  }

  /**
   * The + flow's stage: set before the workspace connect, applied by the
   * list-change applier once the connect's blank session becomes current.
   * The stage survives intermediate non-blank currents (the running
   * conversation the user is leaving), so the pick cannot be lost mid-flight.
   */
  stageForNext(id: string): void {
    this.staged = id
    this.pendingApply = true
    this.set({ current: id, error: null })
  }

  /** Hand the staged choice to the current session, if there is one to take it. */
  async apply(): Promise<void> {
    const staged = this.staged
    const session = this.currentSession()
    if (staged === undefined || session === undefined) return
    // A + flow stage waits for the blank session the connect is about to
    // produce; the still-current started conversation must not consume it.
    if (this.pendingApply) {
      if (!session.blank) return
    } else if (!session.blank || presetOf(session) === staged) {
      this.staged = undefined
      return
    }
    this.set({ busy: true, error: null })
    try {
      const response = await this.remote.agentPresets.select(session.id, staged)
      this.staged = undefined
      this.pendingApply = false
      if (!response.ok) {
        this.set({ busy: false, error: response.error.message, current: this.fallback })
        return
      }
      this.set({ busy: false, current: response.value })
    } catch (error) {
      this.staged = undefined
      this.pendingApply = false
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
  'slots', 'locale', 'remote', 'remote.agentPresets', 'remote.settings', 'sessions',
]

/**
 * Register the preset tree (once the patched slot is declared) and the
 * shadow seat chip (in the conversation scope).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const controller = new RosterController(ctx.remote)
  // One shared handle → the framework resolves ONE root instance both
  // registrations read and write (the single list of the whole plugin).
  const presetStore = createPresetManagerStore()
  // Latest baked actions, set by whichever registration's inject factory ran;
  // event-driven reconciles use it, and a mount-time load() covers the rest.
  let currentActions: PresetManagerBakedActions | undefined
  let startSessionByPreset: (id: string, workspaceId?: WorkspaceId) => Promise<PresetManagerKey | undefined> = async () => 'action.failed'
  let seatRef: SeatController | undefined

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-preset-manager: dictionaries')

  ctx.effect(() => {
    const refresh = (): void => {
      void controller.load(currentActions)
      void seatRef?.load()
    }
    const disposers = [
      ctx.remote.$on('settings/document-updated', (ns) => {
        if (ns !== AGENT_PRESET_SETTINGS_NS) return
        refresh()
      }),
      ctx.on('connection/reset', () => { refresh() }),
    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'dsh-preset-manager: roster refresh')

  const treeInjected = (actions: PresetManagerBakedActions): PresetGroupsInjected => {
    currentActions = actions
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
    'slots', 'conversation', 'sessions', 'uiWorkspace', 'remote', 'remote.agentPresets',
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
    // The tree's + button: resolve the workspace (explicit pick → current →
    // recent) through the official Workspace navigation controller. The
    // staged preset applies when that controller creates or reuses the blank
    // Session and opens it. No workspace at all means no action.
    startSessionByPreset = async (id: string, workspaceId?: WorkspaceId): Promise<PresetManagerKey | undefined> => {
      if (workspaceId === undefined) return 'start.noWorkspace'
      seatRef?.stageForNext(id)
      scope.uiWorkspace.startSession(workspaceId)
      return undefined
    }

    scope.effect(() => {
      // A connecting workspace creates or reuses a blank session and either
      // way the chip's pick predates it — the stage applies when the session
      // arrives (official seat semantics).
      const stop = scope.sessions.list.subscribe(() => { void seatCtl.apply() })
      const settingsMoved = scope.remote.$on('settings/document-updated', (ns) => {
        if (ns !== AGENT_PRESET_SETTINGS_NS) return
        void seatCtl.load()
      })
      const seatInjected = (actions: PresetManagerBakedActions): SeatChipInjected => {
        currentActions = actions
        return {
          hooks: { seat: seatCtl.store, roster: controller.store },
          load: async () => {
            await controller.load(actions)
            await seatCtl.load()
          },
          select: (id: string) => seatCtl.select(id),
          setDefault: (id) => controller.setDefault(actions, id),
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
        settingsMoved()
        chip()
        if (seatRef === seatCtl) seatRef = undefined
      }
    }, 'dsh-preset-manager: shadow seat chip')
  })
}
