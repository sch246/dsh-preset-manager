/**
 * Pure-function unit tests: reconcile (I1/I2/I3, positive and negative
 * cases), deriveRoster, derivePresetGroups, and relativeTime. These are the
 * invariant tests AGENTS.md requires; every invariant gets at least one
 * positive and one negative example.
 */
import { describe, expect, it } from 'vitest'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import {
  derivePresetGroups, deriveRoster, planHide, planUnhide, reconcile,
  relativeTime, shouldUnsetDefault, type HostPreset, type PresetManagerState,
} from '../src/client/roster.ts'

/** Host roster entry factory. */
function host(id: string, isDefault = false, extra: Partial<HostPreset> = {}): HostPreset {
  return { id, trust: 'system', isDefault, ...extra }
}

/** Plugin state factory. */
function state(order: string[], overrides: PresetManagerState['overrides'] = {}): PresetManagerState {
  return { order, overrides }
}

/** Session factory with the optional fields folded through spreads. */
function session(
  id: string,
  extra: Partial<SessionSummary> & { id?: string },
): SessionSummary {
  return {
    id: extra.id ?? id,
    displayTitle: extra.displayTitle ?? id,
    running: false,
    blank: false,
    updatedAt: 0,
    ...extra,
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

describe('deriveRoster', () => {
  it('folds overrides, published name fallback, and id fallback', () => {
    const presets = [host('a'), host('b', false, { name: 'Bee' })]
    const roster = deriveRoster(presets, state(['a', 'b'], { b: { name: 'B-renamed', description: 'd' } }))
    expect(roster.map(entry => entry.displayName)).toEqual(['a', 'B-renamed'])
    expect(roster[1]?.description).toBe('d')
  })

  it('marks hidden (outside order), broken, and default flags', () => {
    const roster = deriveRoster(
      [host('a', true), host('b', false, { broken: 'missing plugin' })],
      state(['a']),
    )
    expect(roster.find(entry => entry.id === 'a')?.hidden).toBe(false)
    expect(roster.find(entry => entry.id === 'a')?.isDefault).toBe(true)
    expect(roster.find(entry => entry.id === 'b')?.hidden).toBe(true)
    expect(roster.find(entry => entry.id === 'b')?.broken).toBe(true)
  })

  it('treats an empty stored order as everything hidden', () => {
    const roster = deriveRoster([host('a', true)], state([]))
    expect(roster[0]?.hidden).toBe(true)
  })
})

describe('reconcile', () => {
  it('I1 positive: a default outside the order is unhidden by appending', () => {
    expect(reconcile([host('a', false), host('b', true)], ['a'])).toEqual(['a', 'b'])
  })

  it('I1 negative: a default already inside keeps its position (star and order decouple)', () => {
    expect(reconcile([host('a', true), host('b', false)], ['b', 'a'])).toEqual(['b', 'a'])
  })

  it('I2 positive: new presets append at the end in roster order', () => {
    expect(reconcile([host('a'), host('b'), host('c')], ['c'])).toEqual(['c', 'a', 'b'])
  })

  it('I2 negative: deleted presets drop out and duplicates collapse', () => {
    expect(reconcile([host('a'), host('c')], ['a', 'c', 'a', 'gone'])).toEqual(['a', 'c'])
  })

  it('I3 support: reconcile of an empty roster and empty order stays empty', () => {
    expect(reconcile([], [])).toEqual([])
  })
})

describe('planHide / planUnhide / shouldUnsetDefault', () => {
  it('I1 negative: hiding the starred preset is rejected before any write', () => {
    expect(planHide([host('a', true), host('b')], ['a', 'b'], 'a')).toEqual({ ok: false, reason: 'default' })
  })

  it('hiding a non-starred preset removes it and keeps the rest', () => {
    expect(planHide([host('a', true), host('b')], ['a', 'b'], 'b')).toEqual({ ok: true, order: ['a'] })
  })

  it('unhide appends at the end and is idempotent for visible presets', () => {
    expect(planUnhide(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(planUnhide(['a', 'b'], 'a')).toEqual(['b', 'a'])
  })

  it('I3 positive: empty list with no star requires unsetting the default', () => {
    expect(shouldUnsetDefault([host('a'), host('b')], [])).toBe(true)
  })

  it('I3 negative: a star anywhere (or a non-empty list) needs no unset', () => {
    expect(shouldUnsetDefault([host('a', true), host('b')], [])).toBe(false)
    expect(shouldUnsetDefault([host('a'), host('b')], ['a'])).toBe(false)
  })
})

describe('derivePresetGroups', () => {
  const presets = [host('p1', true), host('p2'), host('p3', false, { name: 'Third' })]
  const roster = deriveRoster(presets, state(['p3', 'p1']))
  const sessions = [
    session('s1', { agentPreset: 'p1', updatedAt: 10 }),
    session('s2', { agentPreset: 'p1', updatedAt: 20 }),
    session('s3', { agentPreset: 'p2', updatedAt: 30 }),
    session('s4', { agentPreset: undefined, updatedAt: 40 }),
    session('s5', { agentPreset: 'gone', updatedAt: 50 }),
  ]
  const base = list(sessions, 's2')

  it('groups in stored order, hidden groups pinned after visible, ungrouped last', () => {
    const groups = derivePresetGroups(base, roster, ['p3', 'p1'], [], '')
    expect(groups.map(g => g.key)).toEqual(['p3', 'p1', 'p2', ''])
    expect(groups[0]?.hidden).toBe(false)
    expect(groups[2]?.hidden).toBe(true)
    expect(groups[3]?.label).toBe('Ungrouped')
  })

  it('sessions with a deleted or missing preset go ungrouped', () => {
    const groups = derivePresetGroups(base, roster, ['p3', 'p1'], [], '')
    const ungrouped = groups.find(g => g.key === '')
    expect(ungrouped?.sessions.map(s => s.id)).toEqual(['s5', 's4'])
  })

  it('session rows sort newest first inside a group', () => {
    const groups = derivePresetGroups(base, roster, ['p3', 'p1'], [], '')
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
    const groups = derivePresetGroups(list(wide, 's8'), roster, ['p3', 'p1'], ['s7'], '')
    const p1 = groups.find(g => g.key === 'p1')
    expect(p1?.sessions.map(s => s.id)).toEqual(['s8', 's2', 's1'])
  })

  it('query filters group titles and session titles', () => {
    const groups = derivePresetGroups(base, roster, ['p3', 'p1'], [], 'third')
    expect(groups.map(g => g.key)).toEqual(['p3'])
    const bySession = derivePresetGroups(base, roster, ['p3', 'p1'], [], 's4')
    expect(bySession.map(g => g.key)).toEqual([''])
    expect(bySession[0]?.sessions.map(s => s.id)).toEqual(['s4'])
  })

  it('an empty result hides every group including the ungrouped bucket', () => {
    expect(derivePresetGroups(base, roster, ['p3', 'p1'], [], 'nothing-matches')).toEqual([])
  })
})

describe('relativeTime', () => {
  const now = 1_000_000
  it('buckets the diff into now/minutes/hours/days/months/years', () => {
    expect(relativeTime(now, now)).toEqual({ unit: 'now', n: 0 })
    expect(relativeTime(now - 5 * 60_000, now)).toEqual({ unit: 'minutes', n: 5 })
    expect(relativeTime(now - 2 * 3_600_000, now)).toEqual({ unit: 'hours', n: 2 })
    expect(relativeTime(now - 3 * 86_400_000, now)).toEqual({ unit: 'days', n: 3 })
    expect(relativeTime(now - 40 * 86_400_000, now)).toEqual({ unit: 'months', n: 1 })
    expect(relativeTime(now - 400 * 86_400_000, now)).toEqual({ unit: 'years', n: 1 })
  })

  it('clamps future timestamps to now', () => {
    expect(relativeTime(now + 10_000, now)).toEqual({ unit: 'now', n: 0 })
  })
})
