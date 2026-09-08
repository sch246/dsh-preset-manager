import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import { type RosterEntry, type RosterSnapshot } from './roster.ts';
import type { PresetManagerKey } from './locales.ts';
import type { createPresetManagerStore } from './stores.ts';
/** Selection and apply state of the seat controller. */
export interface SeatState {
    /** The committed Session preset, or the choice awaiting the first Session. */
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
    /** Read roster and explicit user default before the chip first renders. */
    load: () => Promise<void>;
    /** Resolve initial priority from the ready, managed-order roster. */
    sync: (roster: readonly RosterEntry[]) => void;
    /** Stage one preset for the next session. */
    select: (id: string) => Promise<void>;
    /** Persist the selected preset as the explicit user default. */
    setDefault: (id: string) => Promise<PresetManagerKey | undefined>;
    /** Clear the selected preset from the official settings user layer. */
    unsetDefault: (id: string) => Promise<PresetManagerKey | undefined>;
}
/** Full component props: hero seat + shared store + inject face + locale. */
export type SeatChipProps = PropsRuntime<'conversation.hero.agentPreset'> & PropsStore<ReturnType<typeof createPresetManagerStore>> & InjectFace<SeatChipInjected> & PropsLocale<'presetManager'>;
/**
 * Render the shadow new-session chip.
 * @param props - composed slot props.
 * @returns the chip, or null when no selectable preset remains.
 */
export declare function SeatChip({ useRoster, useStore, useSeat, load, sync, select, setDefault, unsetDefault, t }: SeatChipProps): import("react").JSX.Element | null;
