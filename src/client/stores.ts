/**
 * The plugin's viewing store: the ordered visible list and the display
 * overrides. Module level exports the factory only (a module-level handle
 * would pin the store identity across plugin reloads); both registrations
 * (the preset tree and the shadow seat chip) receive the same handle, so the
 * framework resolves ONE root instance they share.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import type { BakedActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { PresetManagerState } from './roster.ts'
import { reconcile } from './roster.ts'

/**
 * Annotation twin of the actions literal below (the export needs a declared
 * return type); drift fails assignability at the defineStore call.
 */
export type PresetManagerActions = {
  /** Replace the whole visible order (drag commit, hide/unhide plans). */
  setOrder: (draft: PresetManagerState, order: string[]) => void
  /** Fold the order against the current roster so I1/I2 hold (reconcile). */
  reconcileOrder: (draft: PresetManagerState, presets: readonly { id: string; isDefault: boolean }[]) => void
  /** Merge one rename override (display name/description only). */
  setOverride: (draft: PresetManagerState, id: string, override: { name?: string; description?: string }) => void
}

/**
 * The draft-stripped action face the framework hands inject factories and
 * components; controllers sequence writes through exactly this shape.
 */
export type PresetManagerBakedActions = BakedActions<PresetManagerState, PresetManagerActions>

/**
 * Create the preset manager store handle.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createPresetManagerStore(): EngineStoreHandle<PresetManagerState, PresetManagerActions> {
  return defineStore({
    init: (): PresetManagerState => ({ order: [], overrides: {} }),
    persist: 'dsh.presetManager.v1',
    actions: {
      setOrder: (d, order) => { d.order = order },
      reconcileOrder: (d, presets) => { d.order = reconcile(presets, d.order) },
      setOverride: (d, id, override) => {
        d.overrides[id] = { ...d.overrides[id], ...override }
      },
    },
  })
}
