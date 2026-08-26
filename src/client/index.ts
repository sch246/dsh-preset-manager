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
 *   overrides applied, opened on the starred default) — uninstalling the
 *   plugin restores the official chip.
 *
 * The star (default) lives in the official `agent-presets.default` setting;
 * `settings/document-updated` keeps both surfaces and the settings page in
 * sync. Zero new RPCs: roster reads, settings writes, and the official
 * stage→apply session flow are all existing verbs (DESIGN.md §5).
 */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
// Type-only: pulls ctx.remote and the forwarded-event key face into this program.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { IApiClient } from '@deepseek-ai/dsh-host-apiproxy/client'
import type { ClientContext, SessionId, SnapshotStore, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the patched ui-workspace SlotMap merge (the child slot).
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
// Type-only: pulls the ui-conversation SlotMap merge (the hero seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
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

/** Persist one preset as the deployment default (the official star write). */
async function writeDefaultPreset(api: Pick<IApiClient, 'settings'>, id: string): Promise<string | undefined> {
  try {
    const response = await api.settings.update({ ns: AGENT_PRESET_SETTINGS_NS, patch: { default: id } })
    return response.result.ok ? undefined : response.result.error.message
  } catch (error) {
    return messageOf(error)
  }
}

/** I3: unset the official default so new sessions fall back to the deployment default. */
async function unsetDefaultPreset(api: Pick<IApiClient, 'settings'>): Promise<void> {
  try {
    await api.settings.mutate({
      ns: AGENT_PRESET_SETTINGS_NS,
      ops: [{ op: 'unset', path: ['default'] }],
    })
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

  constructor(private readonly api: IApiClient) {}

  private set(patch: Partial<RosterSnapshot>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  /** Read the roster and reconcile the stored order (I1/I2). */
  async load(actions?: PresetManagerBakedActions): Promise<void> {
    if (this.store.getSnapshot().status === 'loading') return
    this.set({ status: 'loading', error: null })
    let presets: readonly HostPreset[]
    try {
      const response = await this.api.agentPresets.list({})
      if (!response.result.ok) throw new Error(response.result.error.message)
      presets = response.result.value.presets
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

  /** Star a preset: unhide it first when hidden (I1), then write settings. */
  async setDefault(actions: PresetManagerBakedActions, state: PresetManagerState, id: string): Promise<PresetManagerKey | undefined> {
    const { presets } = this.store.getSnapshot()
    if (!presets.some(preset => preset.id === id)) return 'action.failed'
    if ((state.hidden ?? []).includes(id)) actions.setHidden(planUnhide(state.hidden, id))
    const failure = await writeDefaultPreset(this.api, id)
    if (failure !== undefined) return 'action.failed'
    await this.load(actions)
    return undefined
  }

  /** Hide a preset; the starred one is rejected (I1), and I3 may unset the default. */
  async hide(actions: PresetManagerBakedActions, state: PresetManagerState, id: string): Promise<PresetManagerKey | undefined> {
    const { presets } = this.store.getSnapshot()
    const plan = planHide(presets, state.hidden ?? [], id)
    if (!plan.ok) return 'hide.rejected'
    actions.setHidden(plan.hidden)
    if (shouldUnsetDefault(presets, state.order, plan.hidden)) await unsetDefaultPreset(this.api)
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
  agentPreset?: string
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
    private readonly api: Pick<IApiClient, 'agentPresets'>,
    /** The session the hero is about to hand over to, when there is one. */
    private readonly currentSession: () => SeatSessionSummary | undefined,
    /** Publish an applied switch into the session list. */
    private readonly onApplied?: (sessionId: string, agentPreset: string) => void,
  ) {}

  private set(patch: Partial<SeatState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  /** Read the roster and open the chip on the deployment default. */
  async load(): Promise<void> {
    try {
      const response = await this.api.agentPresets.list({})
      if (!response.result.ok) {
        this.set({ error: response.result.error.message })
        return
      }
      const { presets } = response.result.value
      this.fallback = presets.find(preset => preset.isDefault)?.id ?? presets[0]?.id ?? ''
      this.set({
        current: this.staged ?? this.currentSession()?.agentPreset ?? this.fallback,
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
    } else if (!session.blank || session.agentPreset === staged) {
      this.staged = undefined
      return
    }
    this.set({ busy: true, error: null })
    try {
      const response = await this.api.agentPresets.select({ sessionId: session.id, agentPreset: staged })
      this.staged = undefined
      this.pendingApply = false
      if (!response.result.ok) {
        this.set({ busy: false, error: response.result.error.message, current: this.fallback })
        return
      }
      this.set({ busy: false, current: response.result.value.agentPreset })
      this.onApplied?.(session.id as string, response.result.value.agentPreset)
    } catch (error) {
      this.staged = undefined
      this.pendingApply = false
      this.set({ busy: false, error: messageOf(error), current: this.fallback })
    }
  }
}

/** Required services (cordis fiber inject); the inner scope adds conversation/sessions/workspaces. */
export const inject = ['slots', 'locale', 'connection', 'remote', 'sessions']

/**
 * Register the preset tree (once the patched slot is declared) and the
 * shadow seat chip (in the conversation scope).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const { api } = ctx.get('connection') as ConnectionHandle
  const controller = new RosterController(api)
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
      setDefault: (state, id) => controller.setDefault(actions, state, id),
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
  ctx.inject(['slots', 'conversation', 'sessions', 'workspaces', 'connection', 'remote'], (scope: ClientContext) => {
    const scopeApi = (scope.get('connection') as ConnectionHandle).api
    const seatCtl = new SeatController(
      scopeApi,
      (): SeatSessionSummary | undefined => {
        const state = scope.sessions.list.getSnapshot()
        const summary = state.current === undefined ? undefined : state.byId[state.current]
        return summary === undefined
          ? undefined
          : {
            id: summary.id,
            blank: summary.blank,
            ...(summary.agentPreset === undefined ? {} : { agentPreset: summary.agentPreset }),
          }
      },
      (sessionId, agentPreset) => {
        scope.sessions.noteAgentPreset(sessionId as never, agentPreset)
      },
    )
    seatRef = seatCtl
    /** Wait until the sessions list mirror carries a freshly created session. */
    const waitForListed = (sessionId: SessionId, timeoutMs = 3000): Promise<boolean> => {
      const snapshot = scope.sessions.list.getSnapshot()
      if (snapshot.byId[sessionId] !== undefined) return Promise.resolve(true)
      return new Promise((resolve) => {
        let settled = false
        const timer = window.setTimeout(() => { finish(false) }, timeoutMs)
        const stop = scope.sessions.list.subscribe(() => {
          if (scope.sessions.list.getSnapshot().byId[sessionId] !== undefined) finish(true)
        })
        const finish = (ok: boolean): void => {
          if (settled) return
          settled = true
          stop()
          window.clearTimeout(timer)
          resolve(ok)
        }
      })
    }
    // The tree's + button: resolve the workspace (explicit pick → current →
    // recent), then either reuse its provisional blank session (staged preset
    // applies on the connect echo) or create the session WITH the chosen
    // preset — the preset identity is available before the session opens.
    // Ordinary presets land on the ready-to-start composer; warm-minimal stays
    // blank until its first real user input reaches the inbox. No workspace at
    // all → a hint, no action.
    startSessionByPreset = async (id: string, workspaceId?: WorkspaceId): Promise<PresetManagerKey | undefined> => {
      const workspaces = scope.workspaces.list.getSnapshot()
      const sessions = scope.sessions.list.getSnapshot()
      const currentWorkspaceId = sessions.current === undefined
        ? undefined
        : workspaces.items.find(workspace => workspace.sessionIds.includes(sessions.current as SessionId))?.workspaceId
      const target = workspaceId ?? currentWorkspaceId ?? workspaces.recentWorkspaceId
      if (target === undefined) return 'start.noWorkspace'
      const workspace = workspaces.items.find(item => item.workspaceId === target)
      // Reuse rule mirrors the official New Session flow: a blank member with
      // the canonical cwd. Once warm-minimal seeds after the first real input,
      // its turn/start flips blank off, so a started conversation is never
      // reused as "new".
      const reusable = workspace === undefined
        ? undefined
        : sessions.ids.find(id => {
          const summary = sessions.byId[id]
          return summary !== undefined && summary.blank
            && summary.cwd === workspace.path
            && workspace.sessionIds.includes(summary.id)
            && !workspaces.archivedSessionIds.includes(summary.id)
        })
      if (reusable !== undefined) {
        seatRef?.stageForNext(id)
        scope.workspaces.startSession(target)
        return undefined
      }
      try {
        const response = await scopeApi.sessions.create({ workspaceId: target, agentPreset: id })
        if (!response.result.ok) return 'action.failed'
        const created = response.result.value.sessionId
        if (!(await waitForListed(created))) return 'action.failed'
        scope.sessions.open(created)
        // The created session already carries the preset; the chip only
        // needs to mirror it (no stage to apply).
        void seatRef?.load()
        return undefined
      } catch (error) {
        return 'action.failed'
      }
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
      const presetSelected = scope.remote.$on('agent-preset/selected', (sessionId, agentPreset) => {
        scope.sessions.noteAgentPreset(sessionId as never, agentPreset)
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
        presetSelected()
        chip()
        if (seatRef === seatCtl) seatRef = undefined
      }
    }, 'dsh-preset-manager: shadow seat chip')
  })
}
