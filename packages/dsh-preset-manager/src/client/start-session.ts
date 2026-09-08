/** Ordered preset-group Session start over public Client services. */
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PresetManagerKey } from './locales.ts'

/** Minimal service face required by the preset-group `+` flow. */
export interface PresetSessionStartActions {
  /** Resolve or create the target Workspace's reusable blank Session. */
  connectWorkspace: (workspaceId: WorkspaceId) => Promise<SessionId>
  /** Select the requested preset on that exact blank Session. */
  selectPreset: (sessionId: SessionId, presetId: string) => Promise<
    { readonly ok: true; readonly value: string }
    | { readonly ok: false }
  >
  /** Reconcile the hero seat after an out-of-band selection. */
  acceptSelection: (sessionId: SessionId, presetId: string) => void
  /** Navigate only after the Session carries the requested preset. */
  open: (sessionId: SessionId) => void
}

/**
 * Start a blank Session with one preset in an explicitly chosen Workspace.
 * @param actions - public Workspace, preset, seat, and Session operations.
 * @param presetId - requested preset identity.
 * @param workspaceId - explicit target from the row popup.
 * @returns a visible failure key, or undefined after navigation.
 */
export async function startPresetSession(
  actions: PresetSessionStartActions,
  presetId: string,
  workspaceId?: WorkspaceId,
): Promise<PresetManagerKey | undefined> {
  if (workspaceId === undefined) return 'start.noWorkspace'
  try {
    const sessionId = await actions.connectWorkspace(workspaceId)
    const selected = await actions.selectPreset(sessionId, presetId)
    if (!selected.ok) {
      console.warn('preset selection failed:', selected)
      return 'action.failed'
    }
    actions.acceptSelection(sessionId, selected.value)
    actions.open(sessionId)
    return undefined
  } catch (error: unknown) {
    console.warn('preset session start failed:', error)
    return 'action.failed'
  }
}
