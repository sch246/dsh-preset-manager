import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
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
