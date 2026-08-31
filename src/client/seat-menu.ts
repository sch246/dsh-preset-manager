/** Pure option projection and pick classification for the new-session preset menu. */
import type { RosterEntry } from './roster.ts'

/** Default affordance shown beside one hero-menu option. */
export type SeatDefaultAction = 'default' | 'set-default' | undefined

/** One selectable hero-menu option with its default affordance resolved. */
export interface SeatMenuOption {
  id: string
  trust: 'system' | 'user'
  displayName: string
  description: string | undefined
  /** `set-default` belongs only to the currently selected non-default option. */
  defaultAction: SeatDefaultAction
}

/** Business action produced by selecting one hero-menu row. */
export type SeatPickAction = 'select' | 'set-default' | 'none'

/**
 * Classify a hero-menu pick without coupling preset selection to default writes.
 * @param currentId - preset currently selected for the new session.
 * @param defaultId - Host-authoritative default preset, when one exists.
 * @param pickedId - menu row the user selected.
 * @returns the single business action for this pick.
 */
export function classifySeatPick(
  currentId: string,
  defaultId: string | undefined,
  pickedId: string,
): SeatPickAction {
  if (pickedId !== currentId) return 'select'
  return pickedId === defaultId ? 'none' : 'set-default'
}

/**
 * Project the visible hero menu and its default/action labels.
 * @param roster - display roster derived from Host presets and plugin state.
 * @param currentId - preset currently selected for the new session.
 * @returns visible, healthy options in roster order.
 */
export function projectSeatOptions(
  roster: readonly RosterEntry[],
  currentId: string,
): SeatMenuOption[] {
  return roster
    .filter(entry => !entry.hidden && !entry.broken)
    .map(entry => ({
      id: entry.id,
      trust: entry.trust,
      displayName: entry.displayName,
      description: entry.description,
      defaultAction: entry.isDefault
        ? 'default'
        : entry.id === currentId
          ? 'set-default'
          : undefined,
    }))
}
