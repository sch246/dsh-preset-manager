/**
 * The shadow new-session preset chip (priority -1 over the official
 * `conversation.hero.agentPreset` entry; uninstalling the plugin restores
 * the official chip). Same stage→apply semantics as the official seat, but
 * the roster is the plugin's derived list: only visible (ordered) presets,
 * display overrides applied, opened by the explicit-default → recent Session
 * → managed-order priority. Repeating the selected row sets or clears the
 * explicit user default.
 */
import { useEffect, useMemo, useState } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { IconAgentPresetOutline16, IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
// Type-only: pulls the ui-conversation SlotMap merge (the hero seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { deriveRoster, type PresetManagerState, type RosterEntry, type RosterSnapshot } from './roster.ts'
import type { PresetManagerKey } from './locales.ts'
import { classifySeatPick, projectSeatOptions } from './seat-menu.ts'
import type { createPresetManagerStore } from './stores.ts'
import { css } from './styles.ts'

/** Selection and apply state of the seat controller. */
export interface SeatState {
  /** The initial or manually selected preset for this mounted page. */
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
  /** Read roster and explicit user default before the chip first renders. */
  load: () => Promise<void>
  /** Resolve initial priority from the ready, managed-order roster. */
  sync: (roster: readonly RosterEntry[]) => void
  /** Stage one preset for the next session. */
  select: (id: string) => Promise<void>
  /** Persist the selected preset as the explicit user default. */
  setDefault: (id: string) => Promise<PresetManagerKey | undefined>
  /** Clear the selected preset from the official settings user layer. */
  unsetDefault: (id: string) => Promise<PresetManagerKey | undefined>
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
export function SeatChip({ useRoster, useStore, useSeat, load, sync, select, setDefault, unsetDefault, t }: SeatChipProps) {
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
  useEffect(() => {
    if (rosterSnapshot.status === 'ready') sync(roster)
  }, [rosterSnapshot.status, roster, sync])
  const options = useMemo(
    () => projectSeatOptions(roster, seat.current),
    [roster, seat.current],
  )
  const chosen = options.find(option => option.id === seat.current)
  const defaultId = options.find(option => option.isDefault)?.id
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
            <span className={`${css.menuItem}${option.defaultAction !== undefined ? ` ${css.menuItemDefaultCandidate}` : ''}`}>
              <span className={css.menuItemHeading}>
                <span className={css.menuItemName}>{option.displayName}</span>
                {option.isDefault && (
                  <span className={css.menuItemDefault}>{t('seat.default')}</span>
                )}
                {option.defaultAction !== undefined && (
                  <span className={css.menuItemDefaultAction}>
                    {t(option.defaultAction === 'set-default' ? 'seat.setDefault' : 'seat.unsetDefault')}
                  </span>
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
          setNotice(null)
          if (action === 'select') {
            void select(id)
            return
          }
          setDefaultBusy(true)
          const write = action === 'set-default' ? setDefault(id) : unsetDefault(id)
          void write
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
