import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client';
import type { PresetGroupNode } from './roster.ts';
/** One workspace choice of the preset row's + picker. */
export interface WorkspaceChoice {
    id: WorkspaceId;
    title: string;
}
/** Star occupying the official project row's leading identity seat. */
export declare function PresetStar({ active, onSelect, t }: {
    active: boolean;
    onSelect: () => void;
    t: PropsLocale<'presetManager'>['t'];
}): import("react").JSX.Element;
/** Preset facts occupying the official project row's trailing metadata seat. */
export declare function PresetRowMeta({ group, t }: {
    group: PresetGroupNode;
    t: PropsLocale<'presetManager'>['t'];
}): import("react").JSX.Element;
/** Preset management controls occupying the official project row action seat. */
export declare function PresetRowActions({ group, workspaces, onStartSession, onRename, onHide, onUnhide, t, }: {
    group: PresetGroupNode;
    workspaces: readonly WorkspaceChoice[];
    onStartSession: (workspaceId: WorkspaceId | undefined) => void;
    onRename: () => void;
    onHide: () => void;
    onUnhide: () => void;
    t: PropsLocale<'presetManager'>['t'];
}): import("react").JSX.Element;
