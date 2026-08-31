import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { PresetManagerState, RosterSnapshot } from './roster.ts';
import type { PresetManagerKey } from './locales.ts';
import type { createPresetManagerStore } from './stores.ts';
/** Registration-side business face for the preset tree. */
export interface PresetGroupsInjected {
    hooks: {
        /** Roster snapshot bound by the renderer as useRoster (shared with the chip). */
        roster: SnapshotStore<RosterSnapshot>;
    };
    /** Read the roster (and reconcile the order) when the tree first renders. */
    load: () => Promise<void>;
    /** Open a real Session. */
    open: (sessionId: SessionId) => void;
    /**
     * Stage a preset for the next session and start it in the chosen (or
     * resolved) workspace; returns a message key (translated by the tree) when
     * no workspace can take the session or the create failed.
     */
    startSessionByPreset: (id: string, workspaceId?: WorkspaceId) => Promise<PresetManagerKey | undefined>;
    /** Star a preset (unhiding it first when hidden), then write settings. */
    setDefault: (state: PresetManagerState, id: string) => Promise<PresetManagerKey | undefined>;
    /** Hide a preset (rejected for the starred one; I3 unset may follow). */
    hide: (state: PresetManagerState, id: string) => Promise<PresetManagerKey | undefined>;
    /** Unhide a preset: it reappends at the end of the list. */
    unhide: (state: PresetManagerState, id: string) => Promise<void>;
    /** Write the display name/description override. */
    rename: (id: string, override: {
        name: string;
        description: string;
    }) => Promise<void>;
}
/** Full component props: patched owner share + store + inject face + locale. */
export type PresetGroupsProps = PropsRuntime<'sidebar.workspaces.presetGroups'> & PropsStore<ReturnType<typeof createPresetManagerStore>> & InjectFace<PresetGroupsInjected> & PropsLocale<'presetManager'>;
/**
 * Render the preset group tree.
 * @param props - composed slot props.
 * @returns the tree element.
 */
export declare function PresetGroups({ query, rows, sessionActions, useSessions, useSessionPendingInteraction, useWorkspaces, useStore, actions, useRoster, load, open, startSessionByPreset, setDefault, hide, unhide, rename, t, }: PresetGroupsProps): import("react").JSX.Element;
