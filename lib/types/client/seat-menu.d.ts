/** Pure option projection and pick classification for the new-session preset menu. */
import type { RosterEntry } from './roster.ts';
/** Repeat-pick default affordance shown on the current hero-menu option. */
export type SeatDefaultAction = 'set-default' | 'unset-default' | undefined;
/** One selectable hero-menu option with its default affordance resolved. */
export interface SeatMenuOption {
    id: string;
    trust: 'system' | 'user';
    displayName: string;
    description: string | undefined;
    /** Whether official settings contain this preset as the explicit user default. */
    isDefault: boolean;
    /** Set or clear action available only by picking the current option again. */
    defaultAction: SeatDefaultAction;
}
/** Business action produced by selecting one hero-menu row. */
export type SeatPickAction = 'select' | 'set-default' | 'unset-default';
/**
 * Classify a hero-menu pick without coupling preset selection to default writes.
 * @param currentId - preset currently selected for the new session.
 * @param defaultId - explicit user-default preset, when one exists.
 * @param pickedId - menu row the user selected.
 * @returns the single business action for this pick.
 */
export declare function classifySeatPick(currentId: string, defaultId: string | undefined, pickedId: string): SeatPickAction;
/**
 * Project the visible hero menu and its default/action labels.
 * @param roster - display roster derived from Host presets and plugin state.
 * @param currentId - preset currently selected for the new session.
 * @returns visible, healthy options in roster order.
 */
export declare function projectSeatOptions(roster: readonly RosterEntry[], currentId: string): SeatMenuOption[];
