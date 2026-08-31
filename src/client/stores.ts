/**
 * The plugin's viewing store: complete order, independent hidden ids, and
 * display overrides. Module level exports the factory only (a module-level handle
 * would pin the store identity across plugin reloads); both registrations
 * (the preset tree and the shadow seat chip) receive the same handle, so the
 * framework resolves ONE root instance they share.
 */
import {
  defineStore, type BakedActions, type EngineStoreHandle,
} from '@deepseek-ai/dsh-client-store'
import type { PresetManagerState } from './roster.ts'
import { PRESET_MANAGER_SCHEMA_VERSION, reconcile } from './roster.ts'

/**
 * Annotation twin of the actions literal below (the export needs a declared
 * return type); drift fails assignability at the defineStore call.
 */
export type PresetManagerActions = {
  /** Replace the complete order (drag commit). */
  setOrder: (draft: PresetManagerState, order: string[]) => void
  /** Replace hidden ids without moving their stable order positions. */
  setHidden: (draft: PresetManagerState, hidden: string[]) => void
  /** Fold order/visibility against the roster and migrate old v1 snapshots. */
  reconcileState: (draft: PresetManagerState, presets: readonly { id: string; isDefault: boolean }[]) => void
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
    init: (): PresetManagerState => ({
      schemaVersion: PRESET_MANAGER_SCHEMA_VERSION,
      initialized: false,
      order: [],
      hidden: [],
      overrides: {},
    }),
    persist: 'dsh.presetManager.v1',
    actions: {
      setOrder: (d, order) => { d.order = order },
      setHidden: (d, hidden) => { d.hidden = hidden },
      reconcileState: (d, presets) => {
        const next = reconcile(presets, d)
        d.schemaVersion = next.schemaVersion
        d.initialized = next.initialized
        d.order = next.order
        d.hidden = next.hidden
        if (d.overrides === undefined || d.overrides === null || Array.isArray(d.overrides)) {
          d.overrides = {}
        }
      },
      setOverride: (d, id, override) => {
        if (d.overrides === undefined || d.overrides === null || Array.isArray(d.overrides)) {
          d.overrides = {}
        }
        d.overrides[id] = { ...d.overrides[id], ...override }
      },
    },
  })
}
