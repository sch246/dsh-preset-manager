import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import { type RosterSnapshot } from './roster.ts';
import type { createPresetManagerStore } from './stores.ts';
/** Staging state of the seat controller (staged pick, apply status). */
export interface SeatState {
    /** The staged-or-applied choice; falls back to the roster default. */
    current: string;
    /** A rejected apply's message, cleared by the next attempt. */
    error: string | null;
    busy: boolean;
}
/** Registration-side business face for the shadow chip. */
export interface SeatChipInjected {
    hooks: {
        /** Seat snapshot bound by the renderer as useSeat. */
        seat: SnapshotStore<SeatState>;
        /** Roster snapshot bound by the renderer as useRoster (shared with the tree). */
        roster: SnapshotStore<RosterSnapshot>;
    };
    /** Read the roster and the seat fallback when the chip first renders. */
    load: () => Promise<void>;
    /** Stage one preset for the next session. */
    select: (id: string) => Promise<void>;
}
/** Full component props: hero seat + shared store + inject face + locale. */
export type SeatChipProps = PropsRuntime<'conversation.hero.agentPreset'> & PropsStore<ReturnType<typeof createPresetManagerStore>> & InjectFace<SeatChipInjected> & PropsLocale<'presetManager'>;
/**
 * Render the shadow new-session chip.
 * @param props - composed slot props.
 * @returns the chip, or null when no selectable preset remains.
 */
export declare function SeatChip({ useRoster, useStore, useSeat, load, select, t }: SeatChipProps): import("react").JSX.Element | null;
