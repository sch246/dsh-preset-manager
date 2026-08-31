/**
 * dsh-preset-manager browser half.
 *
 * Two registrations over one shared store (historical storage key
 * `dsh.presetManager.v1`, explicit schema v2, one root
 * instance):
 * - `sidebar.workspaces.presetGroups` fills the patched ui-workspace child
 *   slot (the whole preset-mode tree: visible groups in order, hidden groups
 *   dimmed at the end, ungrouped bucket last);
 * - `conversation.hero.agentPreset` shadows the official new-session chip at
 *   priority -1 with the derived roster (visible presets only, display
 *   overrides applied, opened on the Host default, and owns the only default
 *   write entry) — uninstalling the plugin restores the official chip.
 *
 * The default lives in the official `agent-presets.default` setting;
 * `settings/document-updated` keeps both surfaces and the settings page in
 * sync. Zero new RPCs: roster reads, settings writes, and the official
 * stage→apply session flow are all existing verbs (DESIGN.md §5).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type PresetManagerKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The preset tree and shadow chip copy. */
        presetManager: PresetManagerKey;
    }
}
/** Required services (cordis fiber inject); the inner scope adds conversation/sessions/workspaces. */
export declare const inject: string[];
/**
 * Register the preset tree (once the patched slot is declared) and the
 * shadow seat chip (in the conversation scope).
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
