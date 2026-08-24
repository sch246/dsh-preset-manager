import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
/** Full component props. */
export interface PresetMenuProps {
    /** Preset display name, for the aria label. */
    label: string;
    /** True when the preset is hidden (menu offers Unhide instead of Hide). */
    hidden: boolean;
    onRename: () => void;
    onHide: () => void;
    onUnhide: () => void;
    t: PropsLocale<'presetManager'>['t'];
}
/**
 * Render the management menu.
 * @param props - menu actions.
 * @returns the anchor button with its portal menu.
 */
export declare function PresetMenu({ label, hidden, onRename, onHide, onUnhide, t }: PresetMenuProps): import("react").JSX.Element;
