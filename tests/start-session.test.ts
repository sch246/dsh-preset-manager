import { describe, expect, it, vi } from 'vitest'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { startPresetSession, type PresetSessionStartActions } from '../src/client/start-session.ts'

const WORKSPACE = 'root' as WorkspaceId
const SESSION = 'session-reused-blank' as SessionId

/** Ordered action double for the preset-group Session start seam. */
function actions(
  selectResult: Awaited<ReturnType<PresetSessionStartActions['selectPreset']>> = { ok: true, value: 'ptc' },
) {
  const calls: string[] = []
  return {
    calls,
    actions: {
      connectWorkspace: vi.fn(async () => {
        calls.push('connect')
        return SESSION
      }),
      selectPreset: vi.fn(async () => {
        calls.push('select')
        return selectResult
      }),
      acceptSelection: vi.fn(() => { calls.push('accept') }),
      open: vi.fn(() => { calls.push('open') }),
    } satisfies PresetSessionStartActions,
  }
}

describe('startPresetSession', () => {
  it('selects the requested preset on a reused blank Session before opening it', async () => {
    const bench = actions()

    await expect(startPresetSession(bench.actions, 'ptc', WORKSPACE)).resolves.toBeUndefined()

    expect(bench.calls).toEqual(['connect', 'select', 'accept', 'open'])
    expect(bench.actions.connectWorkspace).toHaveBeenCalledWith(WORKSPACE)
    expect(bench.actions.selectPreset).toHaveBeenCalledWith(SESSION, 'ptc')
    expect(bench.actions.acceptSelection).toHaveBeenCalledWith('ptc')
    expect(bench.actions.open).toHaveBeenCalledWith(SESSION)
  })

  it('keeps selection failure visible and does not open the blank Session', async () => {
    const bench = actions({ ok: false })

    await expect(startPresetSession(bench.actions, 'ptc', WORKSPACE)).resolves.toBe('action.failed')

    expect(bench.calls).toEqual(['connect', 'select'])
    expect(bench.actions.acceptSelection).not.toHaveBeenCalled()
    expect(bench.actions.open).not.toHaveBeenCalled()
  })

  it('keeps a connect failure visible without selecting or opening', async () => {
    const bench = actions()
    bench.actions.connectWorkspace.mockRejectedValueOnce(new Error('offline'))

    await expect(startPresetSession(bench.actions, 'ptc', WORKSPACE)).resolves.toBe('action.failed')

    expect(bench.actions.selectPreset).not.toHaveBeenCalled()
    expect(bench.actions.acceptSelection).not.toHaveBeenCalled()
    expect(bench.actions.open).not.toHaveBeenCalled()
  })

  it('preserves the explicit-workspace requirement', async () => {
    const bench = actions()

    await expect(startPresetSession(bench.actions, 'ptc')).resolves.toBe('start.noWorkspace')

    expect(bench.calls).toEqual([])
  })
})
