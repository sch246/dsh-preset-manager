/**
 * The rename dialog: display name + description overrides. Confirming writes
 * only the plugin store (`overrides`); preset files and ids are untouched.
 */
import { useEffect, useRef, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the locale plugin's merge (the shared common vocabulary).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { RosterEntry } from './roster.ts'
import { css } from './styles.ts'

/** Full component props. */
export interface RenameDialogProps {
  /** The preset being renamed (display facts already folded in). */
  entry: RosterEntry
  /** Confirm the overrides; the name must stay non-empty. */
  onConfirm: (override: { name: string; description: string }) => void
  onClose: () => void
  t: PropsLocale<'presetManager'>['t']
}

/**
 * Render the rename modal.
 * @param props - target entry and callbacks.
 * @returns the modal.
 */
export function RenameDialog({ entry, onConfirm, onClose, t }: RenameDialogProps) {
  const [name, setName] = useState(entry.displayName)
  const [description, setDescription] = useState(entry.description ?? '')
  const composing = useRef(false)
  // Focus lands once per dialog open (entry identity remounts via key).
  useEffect(() => { setName(entry.displayName); setDescription(entry.description ?? '') }, [entry])
  const blocked = name.trim() === ''
  const confirm = (): void => {
    if (blocked) return
    onConfirm({ name: name.trim(), description: description.trim() })
  }
  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={t('close')}
      title={t('rename.title')}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" disabled={blocked} onClick={confirm}>{t('save')}</Button>
        </>
      )}
    >
      <div className={css.renameHint}>{t('rename.hint')}</div>
      <div className={css.renameFields}>
        <div className={css.renameField}>
          <label className={css.renameLabel} htmlFor="pm-rename-name">{t('field.name')}</label>
          <input
            id="pm-rename-name"
            className={css.renameInput}
            value={name}
            autoFocus
            onFocus={(e) => { e.target.select() }}
            onChange={(e) => { setName(e.target.value) }}
            onCompositionStart={() => { composing.current = true }}
            onCompositionEnd={() => { composing.current = false }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !composing.current) {
                e.preventDefault()
                confirm()
              }
            }}
          />
        </div>
        <div className={css.renameField}>
          <label className={css.renameLabel} htmlFor="pm-rename-desc">{t('field.description')}</label>
          <input
            id="pm-rename-desc"
            className={css.renameInput}
            value={description}
            onChange={(e) => { setDescription(e.target.value) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !composing.current) {
                e.preventDefault()
                confirm()
              }
            }}
          />
        </div>
      </div>
    </Modal>
  )
}
