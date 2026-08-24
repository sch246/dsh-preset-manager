/**
 * One preset group header row: drag handle, ★ default star, name +
 * description, hidden/broken badges, session count, expand chevron, the
 * new-session + button, and the ⋯ management menu.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { PresetGroupNode } from './roster.ts';
/** In-flight drag marker for one group row. */
export interface PresetGroupDragState {
    sourceId: string;
    over: {
        id: string;
        half: 'before' | 'after';
    } | null;
}
/** Full component props. */
export interface PresetGroupRowProps {
    group: PresetGroupNode;
    expanded: boolean;
    /** True while any row drag is in flight. */
    dragging: boolean;
    /** True while this row is the drag source. */
    source: boolean;
    /** The marker this row currently carries (drop target feedback). */
    marker: 'before' | 'after' | null;
    /** Begin a drag from this row (visible groups only). */
    onDragStart: () => void;
    /** Hover marker update for this row. */
    onDragHover: (half: 'before' | 'after') => void;
    /** Drop on this row. */
    onDrop: (half: 'before' | 'after') => void;
    onDragEnd: () => void;
    onToggle: () => void;
    onStartSession: () => void;
    onSetDefault: () => void;
    onRename: () => void;
    onHide: () => void;
    onUnhide: () => void;
    t: PropsLocale<'presetManager'>['t'];
}
/**
 * Render one group header row.
 * @param props - group facts, drag seats, and action callbacks.
 * @returns the header row.
 */
export declare function PresetGroupRow({ group, expanded, dragging, source, marker, onDragStart, onDragHover, onDrop, onDragEnd, onToggle, onStartSession, onSetDefault, onRename, onHide, onUnhide, t, }: PresetGroupRowProps): import("react").JSX.Element;
