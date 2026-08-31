/**
 * Pure-function unit tests: reconcile (I1/I2/I3, positive and negative
 * cases), deriveRoster, and derivePresetGroups. These are the
 * invariant tests AGENTS.md requires; every invariant gets at least one
 * positive and one negative example.
 */
import { describe, expect, it } from 'vitest'
import type {
  SessionListState, SessionSummary,
} from '@deepseek-ai/dsh-api-session-controller/client'
import {
  derivePresetGroups, deriveRoster, planHide, planUnhide, reconcile,
  PRESET_MANAGER_SCHEMA_VERSION, shouldUnsetDefault,
  type HostPreset, type PresetManagerState, type PresetSessionNode,
} from '../src/client/roster.ts'

/** Host roster entry factory. */
function host(id: string, isDefault = false, extra: Partial<HostPreset> = {}): HostPreset {
  return { id, trust: 'system', isDefault, ...extra }
}

/** Plugin state factory. */
function state(
  order: string[],
  hidden: string[] = [],
  overrides: PresetManagerState['overrides'] = {},
  initialized = true,
): PresetManagerState {
  return { schemaVersion: PRESET_MANAGER_SCHEMA_VERSION, initialized, order, hidden, overrides }
}

/** Session factory with the optional fields folded through spreads. */
function session(
  id: string,
  extra: Partial<SessionSummary> & { id?: string; agentPreset?: string },
): SessionSummary {
  const { agentPreset, ...summary } = extra
  return {
    id: summary.id ?? id,
    displayTitle: summary.displayTitle ?? id,
    running: false,
    blank: false,
    updatedAt: 0,
    ...summary,
    ...(agentPreset === undefined ? {} : { projectionValues: { agentPreset } }),
  }
}

/** A minimal ready session list over the given summaries. */
function list(sessions: readonly SessionSummary[], current?: string): SessionListState {
  const ids = sessions.map(s => s.id)
  const byId = Object.fromEntries(sessions.map(s => [s.id, s])) as SessionListState['byId']
  return {
    ids,
    byId,
    current,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
}

/** Test-only official projection fixture; production receives this from ui-workspace. */
function nodes(state: SessionListState, excluded: readonly string[] = []): PresetSessionNode[] {
  const hidden = new Set(excluded)
  return state.ids
    .map(id => state.byId[id])
    .filter((summary): summary is SessionSummary => summary !== undefined)
    .filter(summary => !hidden.has(summary.id)
      && summary.origin !== 'subagent'
      && (!summary.blank || summary.id === state.current))
    .map(summary => ({
      id: summary.id,
      title: summary.displayTitle,
      blank: summary.blank,
      running: summary.running,
      runningSubagentCount: 0,
      completed: false,
      updatedAt: summary.updatedAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

describe('deriveRoster', () => {
  it('folds overrides, published name fallback, and id fallback', () => {
    const presets = [host('a'), host('b', false, { name: 'Bee' })]
    const roster = deriveRoster(presets, state(['a', 'b'], [], { b: { name: 'B-renamed', description: 'd' } }))
    expect(roster.map(entry => entry.displayName)).toEqual(['a', 'B-renamed'])
    expect(roster[1]?.description).toBe('d')
  })

  it('preserves line breaks in a long description override', () => {
    const description = '第一段说明\n第二段说明'
    const roster = deriveRoster([host('a')], state(['a'], [], { a: { description } }))
    expect(roster[0]?.description).toBe(description)
  })

  it('marks independent hidden, broken, and default flags', () => {
    const roster = deriveRoster(
      [host('a', true), host('b', false, { broken: 'missing plugin' })],
      state(['a', 'b'], ['b']),
    )
    expect(roster.find(entry => entry.id === 'a')?.hidden).toBe(false)
    expect(roster.find(entry => entry.id === 'a')?.isDefault).toBe(true)
    expect(roster.find(entry => entry.id === 'b')?.hidden).toBe(true)
    expect(roster.find(entry => entry.id === 'b')?.broken).toBe(true)
  })

  it('keeps order independent from an all-hidden visibility set', () => {
    const roster = deriveRoster([host('a')], state(['a'], ['a']))
    expect(roster[0]?.hidden).toBe(true)
  })
})

describe('reconcile', () => {
  it('I1 positive: a hidden default is unhidden without moving it', () => {
    expect(reconcile([host('a'), host('b', true)], state(['b', 'a'], ['b']))).toMatchObject({
      initialized: true, order: ['b', 'a'], hidden: [],
    })
  })

  it('I1 negative: a visible default keeps its position (star and order decouple)', () => {
    expect(reconcile([host('a', true), host('b')], state(['b', 'a']))).toMatchObject({
      order: ['b', 'a'], hidden: [],
    })
  })

  it('I2 positive: new presets append visible while existing hidden stays hidden', () => {
    expect(reconcile([host('a'), host('b'), host('c')], state(['c', 'a'], ['a']))).toMatchObject({
      order: ['c', 'a', 'b'], hidden: ['a'],
    })
  })

  it('I2 negative: deleted presets drop from order/hidden and duplicates collapse', () => {
    expect(reconcile([host('a'), host('c')], state(
      ['a', 'c', 'a', 'gone'], ['gone', 'c', 'c'],
    ))).toMatchObject({
      order: ['a', 'c'], hidden: ['c'],
    })
  })

  it('fresh install makes every existing Host preset visible, even when many already exist', () => {
    expect(reconcile(
      [host('a'), host('b'), host('c', true)],
      state([], [], {}, false),
    )).toEqual({
      schemaVersion: PRESET_MANAGER_SCHEMA_VERSION,
      initialized: true,
      order: ['a', 'b', 'c'],
      hidden: [],
    })
  })

  it('migrates old visible-order v1 ids to hidden while preserving a full order', () => {
    expect(reconcile([host('a'), host('b'), host('c', true)], { order: ['a'] })).toEqual({
      schemaVersion: PRESET_MANAGER_SCHEMA_VERSION,
      initialized: true,
      order: ['a', 'b', 'c'], hidden: ['b'],
    })
  })

  it('upgrades the deployed hidden-array model without reclassifying visibility', () => {
    expect(reconcile([host('a'), host('b'), host('c')], {
      order: ['b', 'a'], hidden: ['a'],
    })).toEqual({
      schemaVersion: PRESET_MANAGER_SCHEMA_VERSION,
      initialized: true,
      order: ['b', 'a', 'c'], hidden: ['a'],
    })
  })

  it('appends a later Host preset visible after fresh initialization', () => {
    const first = reconcile([host('a'), host('b')], state([], [], {}, false))
    expect(reconcile([host('a'), host('b'), host('c')], first)).toEqual({
      schemaVersion: PRESET_MANAGER_SCHEMA_VERSION,
      initialized: true,
      order: ['a', 'b', 'c'], hidden: [],
    })
  })

  it('sanitizes malformed persisted lists instead of confusing them with installation state', () => {
    expect(reconcile([host('a'), host('b')], {
      schemaVersion: PRESET_MANAGER_SCHEMA_VERSION,
      initialized: true,
      order: 'not-an-array',
      hidden: [42, 'b'],
    })).toEqual({
      schemaVersion: PRESET_MANAGER_SCHEMA_VERSION,
      initialized: true,
      order: ['a', 'b'], hidden: ['b'],
    })
  })

  it('I3 support: reconcile of an empty roster and empty state stays empty', () => {
    expect(reconcile([], state([]))).toEqual({
      schemaVersion: PRESET_MANAGER_SCHEMA_VERSION,
      initialized: true,
      order: [], hidden: [],
    })
  })
})

describe('planHide / planUnhide / shouldUnsetDefault', () => {
  it('I1 negative: hiding the starred preset is rejected before any write', () => {
    expect(planHide([host('a', true), host('b')], [], 'a')).toEqual({ ok: false, reason: 'default' })
  })

  it('hiding a non-starred preset changes visibility without touching order', () => {
    expect(planHide([host('a', true), host('b')], [], 'b')).toEqual({ ok: true, hidden: ['b'] })
  })

  it('keeps a hidden preset hidden across reconcile and restores its original order position', () => {
    const presets = [host('a', true), host('b'), host('c')]
    const plan = planHide(presets, [], 'b')
    expect(plan).toEqual({ ok: true, hidden: ['b'] })
    if (!plan.ok) throw new Error('expected hide plan')
    const reloaded = reconcile(presets, state(['a', 'b', 'c'], plan.hidden))
    expect(reloaded).toMatchObject({ order: ['a', 'b', 'c'], hidden: ['b'] })
    expect(planUnhide(reloaded.hidden, 'b')).toEqual([])
    expect(reloaded.order).toEqual(['a', 'b', 'c'])
  })

  it('unhide removes only the marker so the complete order retains position', () => {
    expect(planUnhide(['b', 'c'], 'b')).toEqual(['c'])
    expect(planUnhide(['c'], 'b')).toEqual(['c'])
  })

  it('I3 positive: all hidden with no star requires unsetting the default', () => {
    expect(shouldUnsetDefault([host('a'), host('b')], ['a', 'b'], ['a', 'b'])).toBe(true)
  })

  it('I3 negative: a star anywhere (or one visible preset) needs no unset', () => {
    expect(shouldUnsetDefault([host('a', true), host('b')], ['a', 'b'], ['b'])).toBe(false)
    expect(shouldUnsetDefault([host('a'), host('b')], ['a', 'b'], ['b'])).toBe(false)
  })
})

describe('derivePresetGroups', () => {
  const presets = [host('p1', true), host('p2'), host('p3', false, { name: 'Third' })]
  const roster = deriveRoster(presets, state(['p3', 'p1', 'p2'], ['p2']))
  const sessions = [
    session('s1', { agentPreset: 'p1', updatedAt: 10 }),
    session('s2', { agentPreset: 'p1', updatedAt: 20 }),
    session('s3', { agentPreset: 'p2', updatedAt: 30 }),
    session('s4', { agentPreset: undefined, updatedAt: 40 }),
    session('s5', { agentPreset: 'gone', updatedAt: 50 }),
  ]
  const base = list(sessions, 's2')
  const baseNodes = nodes(base)

  it('groups in stored order, hidden groups pinned after visible, ungrouped last', () => {
    const groups = derivePresetGroups(base, baseNodes, roster, ['p3', 'p1', 'p2'], '')
    expect(groups.map(g => g.key)).toEqual(['p3', 'p1', 'p2', ''])
    expect(groups[0]?.hidden).toBe(false)
    expect(groups[2]?.hidden).toBe(true)
    expect(groups[3]?.label).toBe('Ungrouped')
  })

  it('sessions with a deleted or missing preset go ungrouped', () => {
    const groups = derivePresetGroups(base, baseNodes, roster, ['p3', 'p1', 'p2'], '')
    const ungrouped = groups.find(g => g.key === '')
    expect(ungrouped?.sessions.map(s => s.id)).toEqual(['s5', 's4'])
  })

  it('session rows sort newest first inside a group', () => {
    const groups = derivePresetGroups(base, baseNodes, roster, ['p3', 'p1', 'p2'], '')
    const p1 = groups.find(g => g.key === 'p1')
    expect(p1?.sessions.map(s => s.id)).toEqual(['s2', 's1'])
  })

  it('mirrors the official visibility rule: archived and subagent rows hide; blank shows only when current', () => {
    const wide = [
      ...sessions,
      session('s6', { agentPreset: 'p1', updatedAt: 60, origin: 'subagent' }),
      session('s7', { agentPreset: 'p1', updatedAt: 70 }),
      session('s8', { agentPreset: 'p1', updatedAt: 80, blank: true }),
    ]
    const wideList = list(wide, 's8')
    const groups = derivePresetGroups(wideList, nodes(wideList, ['s7']), roster, ['p3', 'p1', 'p2'], '')
    const p1 = groups.find(g => g.key === 'p1')
    expect(p1?.sessions.map(s => s.id)).toEqual(['s8', 's2', 's1'])
  })

  it('uses the official session projection for live interaction status', () => {
    const withPending = list([
      ...sessions,
      session('s9', { agentPreset: 'p1', updatedAt: 90, running: true }),
    ], 's2')
    const officialNodes = nodes(withPending).map(node => node.id === 's9'
      ? { ...node, pendingInteraction: 'question' as const }
      : node)
    const p1 = derivePresetGroups(withPending, officialNodes, roster, ['p3', 'p1', 'p2'], '')
      .find(group => group.key === 'p1')
    expect(p1?.sessions[0]).toMatchObject({
      id: 's9', running: true, runningSubagentCount: 0, pendingInteraction: 'question',
    })
  })

  it('query filters group titles and session titles', () => {
    const groups = derivePresetGroups(base, baseNodes, roster, ['p3', 'p1', 'p2'], 'third')
    expect(groups.map(g => g.key)).toEqual(['p3'])
    const bySession = derivePresetGroups(base, baseNodes, roster, ['p3', 'p1', 'p2'], 's4')
    expect(bySession.map(g => g.key)).toEqual([''])
    expect(bySession[0]?.sessions.map(s => s.id)).toEqual(['s4'])
  })

  it('an empty result hides every group including the ungrouped bucket', () => {
    expect(derivePresetGroups(base, baseNodes, roster, ['p3', 'p1', 'p2'], 'nothing-matches')).toEqual([])
  })
})
