import { describe, expect, it } from 'vitest'
import {
  classifySeatPick,
  projectSeatOptions,
} from '../src/client/seat-menu.ts'
import { en, zh } from '../src/client/locales.ts'
import type { RosterEntry } from '../src/client/roster.ts'

/** Derived roster entry fixture for the hero picker. */
function entry(id: string, flags: Partial<RosterEntry> = {}): RosterEntry {
  return {
    id,
    trust: 'system',
    isDefault: false,
    hidden: false,
    broken: false,
    displayName: id,
    description: undefined,
    ...flags,
  }
}

describe('classifySeatPick', () => {
  it('selects a different preset without changing the default', () => {
    expect(classifySeatPick('work', 'chat', 'code')).toBe('select')
  })

  it('sets the selected non-default preset as default when picked again', () => {
    expect(classifySeatPick('code', 'chat', 'code')).toBe('set-default')
  })

  it('does nothing when the selected default preset is picked again', () => {
    expect(classifySeatPick('chat', 'chat', 'chat')).toBe('none')
  })
})

describe('projectSeatOptions', () => {
  it('marks the default and the selected non-default action while excluding unavailable choices', () => {
    expect(projectSeatOptions([
      entry('chat', { isDefault: true }),
      entry('code', { description: 'Coding assistant' }),
      entry('review'),
      entry('hidden', { hidden: true }),
      entry('broken', { broken: true }),
    ], 'code')).toEqual([
      {
        id: 'chat',
        trust: 'system',
        displayName: 'chat',
        description: undefined,
        defaultAction: 'default',
      },
      {
        id: 'code',
        trust: 'system',
        displayName: 'code',
        description: 'Coding assistant',
        defaultAction: 'set-default',
      },
      {
        id: 'review',
        trust: 'system',
        displayName: 'review',
        description: undefined,
        defaultAction: undefined,
      },
    ])
  })

  it('owns both default affordances in the Chinese and English dictionaries', () => {
    expect([zh['seat.default'], zh['seat.setDefault']]).toEqual(['默认', '设为默认'])
    expect([en['seat.default'], en['seat.setDefault']]).toEqual(['Default', 'Set as default'])
  })
})
