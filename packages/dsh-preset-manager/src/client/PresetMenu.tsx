/**
 * The preset management menu (⋯): rename, and hide/unhide. The same menu
 * component serves both visible and hidden groups.
 */
import { useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { IconEllipsisOutline16, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import { css } from './styles.ts'

/** Full component props. */
export interface PresetMenuProps {
  /** Preset display name, for the aria label. */
  label: string
  /** True when the preset is hidden (menu offers Unhide instead of Hide). */
  hidden: boolean
  onRename: () => void
  onHide: () => void
  onUnhide: () => void
  t: PropsLocale<'presetManager'>['t']
}

/**
 * Render the management menu.
 * @param props - menu actions.
 * @returns the anchor button with its portal menu.
 */
export function PresetMenu({ label, hidden, onRename, onHide, onUnhide, t }: PresetMenuProps) {
  const [open, setOpen] = useState(false)
  const close = (): void => { setOpen(false) }
  return (
    <Menu
      open={open}
      onClose={close}
      items={[
        { id: 'rename', label: t('menu.rename') },
        hidden
          ? { id: 'unhide', label: t('menu.unhide') }
          : { id: 'hide', label: t('menu.hide') },
      ]}
      onSelect={(id) => {
        close()
        if (id === 'rename') onRename()
        else if (id === 'hide') onHide()
        else onUnhide()
      }}
      align="end"
      dense
      portal
      anchor={(
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('preset.actions.aria', { name: label })}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => { setOpen(value => !value) }}
        >
          <IconEllipsisOutline16 />
        </button>
      )}
    />
  )
}
