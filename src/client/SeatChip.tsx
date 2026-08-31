/**
 * The shadow new-session preset chip (priority -1 over the official
 * `conversation.hero.agentPreset` entry; uninstalling the plugin restores
 * the official chip). Same stage→apply semantics as the official seat, but
 * the roster is the plugin's derived list: only visible (ordered) presets,
 * display overrides applied, opened on the starred (default) preset.
 */
import { useEffect, useMemo, useState } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { IconAgentPresetOutline16, IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
// Type-only: pulls the ui-conversation SlotMap merge (the hero seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { deriveRoster, type PresetManagerState, type RosterSnapshot } from './roster.ts'
import type { createPresetManagerStore } from './stores.ts'
import { css } from './styles.ts'

/** Staging state of the seat controller (staged pick, apply status). */
export interface SeatState {
  /** The staged-or-applied choice; falls back to the roster default. */
  current: string
  /** A rejected apply's message, cleared by the next attempt. */
  error: string | null
  busy: boolean
}

/** Registration-side business face for the shadow chip. */
export interface SeatChipInjected {
  hooks: {
    /** Seat snapshot bound by the renderer as useSeat. */
    seat: SnapshotStore<SeatState>
    /** Roster snapshot bound by the renderer as useRoster (shared with the tree). */
    roster: SnapshotStore<RosterSnapshot>
  }
  /** Read the roster and the seat fallback when the chip first renders. */
  load: () => Promise<void>
  /** Stage one preset for the next session. */
  select: (id: string) => Promise<void>
}

/** Full component props: hero seat + shared store + inject face + locale. */
export type SeatChipProps =
  PropsRuntime<'conversation.hero.agentPreset'>
  & PropsStore<ReturnType<typeof createPresetManagerStore>>
  & InjectFace<SeatChipInjected>
  & PropsLocale<'presetManager'>

/** One selectable option: a visible, healthy preset in display order. */
interface SeatOption {
  id: string
  trust: 'system' | 'user'
  displayName: string
  description: string | undefined
}

/**
 * Render the shadow new-session chip.
 * @param props - composed slot props.
 * @returns the chip, or null when no selectable preset remains.
 */
export function SeatChip({ useRoster, useStore, useSeat, load, select, t }: SeatChipProps) {
  const rosterSnapshot = useRoster(snapshot => snapshot)
  const state = useStore((s: PresetManagerState) => s)
  const seat = useSeat(snapshot => snapshot)

  useEffect(() => {
    void load()
  }, [load])

  const options = useMemo<readonly SeatOption[]>(
    () => deriveRoster(rosterSnapshot.presets, state)
      .filter(entry => !entry.hidden && !entry.broken)
      .map(entry => ({
        id: entry.id,
        trust: entry.trust,
        displayName: entry.displayName,
        description: entry.description,
      })),
    [rosterSnapshot.presets, state],
  )
  const chosen = options.find(option => option.id === seat.current) ?? options[0]
  // Declared before the early return: an empty roster renders the chip with
  // no menu, and the hook count must not change when options arrive later
  // (a conditional hook order crashes React and abdicates the seat entry).
  const [open, setOpen] = useState(false)
  if (chosen === undefined) return null

  return (
    <Menu
      open={open}
      onClose={() => { setOpen(false) }}
      items={options.map(option => ({
        id: option.id,
        label: (
          <span className={css.menuItem}>
            <span className={css.menuItemName}>{option.displayName}</span>
            <span className={css.menuItemDesc}>{option.description ?? t('seat.noDescription')}</span>
          </span>
        ),
      }))}
      selectedId={chosen.id}
      onSelect={(id) => {
        setOpen(false)
        void select(id)
      }}
      align="start"
      portal
      anchor={(
        <button
          type="button"
          className={css.seat}
          aria-haspopup="menu"
          aria-expanded={open}
          title={seat.error ?? t('seat.hint')}
          disabled={seat.busy}
          onClick={() => { setOpen(value => !value) }}
        >
          <IconAgentPresetOutline16 className={css.seatIcon} />
          {chosen.displayName}
          <IconChevronDownOutline14 className={css.seatChevron} />
        </button>
      )}
    />
  )
}
