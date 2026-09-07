import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { RosterEntry } from './roster.ts';
/** Full component props. */
export interface RenameDialogProps {
    /** The preset being renamed (display facts already folded in). */
    entry: RosterEntry;
    /** Confirm the overrides; the name must stay non-empty. */
    onConfirm: (override: {
        name: string;
        description: string;
    }) => void;
    onClose: () => void;
    t: PropsLocale<'presetManager'>['t'];
}
/**
 * Render the rename modal.
 * @param props - target entry and callbacks.
 * @returns the modal.
 */
export declare function RenameDialog({ entry, onConfirm, onClose, t }: RenameDialogProps): import("react").JSX.Element;
