/**
 * The shadow new-session preset chip (priority -1 over the official
 * `conversation.hero.agentPreset` entry; uninstalling the plugin restores
 * the official chip). Same stage→apply semantics as the official seat, but
 * the roster is the plugin's derived list: only visible (ordered) presets,
 * display overrides applied, opened on the Host default. The selected
 * non-default row is also the only default-write entry.
 */
import { useEffect, useMemo, useState } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { IconAgentPresetOutline16, IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
// Type-only: pulls the ui-conversation SlotMap merge (the hero seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { deriveRoster, type PresetManagerState, type RosterSnapshot } from './roster.ts'
import type { PresetManagerKey } from './locales.ts'
import { classifySeatPick, projectSeatOptions } from './seat-menu.ts'
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
  /** Persist the selected preset as the Host default. */
  setDefault: (id: string) => Promise<PresetManagerKey | undefined>
}

/** Full component props: hero seat + shared store + inject face + locale. */
export type SeatChipProps =
  PropsRuntime<'conversation.hero.agentPreset'>
  & PropsStore<ReturnType<typeof createPresetManagerStore>>
  & InjectFace<SeatChipInjected>
  & PropsLocale<'presetManager'>

/**
 * Render the shadow new-session chip.
 * @param props - composed slot props.
 * @returns the chip, or null when no selectable preset remains.
 */
export function SeatChip({ useRoster, useStore, useSeat, load, select, setDefault, t }: SeatChipProps) {
  const rosterSnapshot = useRoster(snapshot => snapshot)
  const state = useStore((s: PresetManagerState) => s)
  const seat = useSeat(snapshot => snapshot)

  useEffect(() => {
    void load()
  }, [load])

  const roster = useMemo(
    () => deriveRoster(rosterSnapshot.presets, state),
    [rosterSnapshot.presets, state],
  )
  const stagedOptions = useMemo(
    () => projectSeatOptions(roster, seat.current),
    [roster, seat.current],
  )
  const chosenId = stagedOptions.some(option => option.id === seat.current)
    ? seat.current
    : stagedOptions[0]?.id
  const options = useMemo(
    () => chosenId === seat.current
      ? stagedOptions
      : projectSeatOptions(roster, chosenId ?? ''),
    [roster, stagedOptions, chosenId, seat.current],
  )
  const chosen = options.find(option => option.id === chosenId)
  const defaultId = options.find(option => option.defaultAction === 'default')?.id
  // Declared before the early return: an empty roster renders the chip with
  // no menu, and the hook count must not change when options arrive later
  // (a conditional hook order crashes React and abdicates the seat entry).
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<PresetManagerKey | null>(null)
  const [defaultBusy, setDefaultBusy] = useState(false)
  if (chosen === undefined) return null

  return (
    <span className={css.seatRoot}>
      <Menu
        open={open}
        onClose={() => { setOpen(false) }}
        items={options.map(option => ({
          id: option.id,
          label: (
            <span className={`${css.menuItem}${option.defaultAction === 'set-default' ? ` ${css.menuItemDefaultCandidate}` : ''}`}>
              <span className={css.menuItemHeading}>
                <span className={css.menuItemName}>{option.displayName}</span>
                {option.defaultAction === 'default' && (
                  <span className={css.menuItemDefault}>{t('seat.default')}</span>
                )}
                {option.defaultAction === 'set-default' && (
                  <span className={css.menuItemDefaultAction}>{t('seat.setDefault')}</span>
                )}
              </span>
              <span className={css.menuItemDesc}>{option.description ?? t('seat.noDescription')}</span>
            </span>
          ),
        }))}
        selectedId={chosen.id}
        onSelect={(id) => {
          setOpen(false)
          const action = classifySeatPick(chosen.id, defaultId, id)
          if (action === 'none') return
          setNotice(null)
          if (action === 'select') {
            void select(id)
            return
          }
          setDefaultBusy(true)
          void setDefault(id)
            .then((failure) => { setNotice(failure ?? null) })
            .catch(() => { setNotice('action.failed') })
            .finally(() => { setDefaultBusy(false) })
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
            disabled={seat.busy || defaultBusy}
            onClick={() => { setOpen(value => !value) }}
          >
            <IconAgentPresetOutline16 className={css.seatIcon} />
            {chosen.displayName}
            <IconChevronDownOutline14 className={css.seatChevron} />
          </button>
        )}
      />
      {notice !== null && <span className={css.seatNotice} role="alert">{t(notice)}</span>}
    </span>
  )
}
