/**
 * One session row inside a preset group: running/completed dot, title
 * (localized for blank rows), workspace label, and relative time.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { PresetSessionNode, RelativeTime } from './roster.ts';
/** Translate a relative-time bucket into its localized trailing label. */
export declare function timeLabel(time: RelativeTime, t: PropsLocale<'presetManager'>['t']): string;
/** Full component props: the row facts plus open/locale seats. */
export interface SessionRowProps {
    node: PresetSessionNode;
    current: boolean;
    /** Workspace display label of this session's workspace, if any. */
    workspace: string | undefined;
    /** Current epoch ms (injected for pure rendering). */
    now: number;
    onOpen: (sessionId: PresetSessionNode['id']) => void;
    t: PropsLocale<'presetManager'>['t'];
}
/**
 * Render one session row.
 * @param props - row facts and callbacks.
 * @returns the row element.
 */
export declare function SessionRow({ node, current, workspace, now, onOpen, t }: SessionRowProps): import("react").JSX.Element;
