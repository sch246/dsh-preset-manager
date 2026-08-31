/** Preset-only seats rendered inside the official Workspace project row. */
import { useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { IconPlusOutline16, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { PresetGroupNode } from './roster.ts'
import { PresetMenu } from './PresetMenu.tsx'
import { css } from './styles.ts'

/** One workspace choice of the preset row's + picker. */
export interface WorkspaceChoice {
  id: WorkspaceId
  title: string
}

/** Preset facts occupying the official project row's trailing metadata seat. */
export function PresetRowMeta({ group, t }: {
  group: PresetGroupNode
  t: PropsLocale<'presetManager'>['t']
}) {
  return (
    <span className={css.metaItems}>
      {group.broken && <span className={`${css.badge} ${css.badgeBroken}`}>{t('preset.broken')}</span>}
      {group.hidden && <span className={css.badge}>{t('preset.hidden')}</span>}
      <span className={css.groupCount}>
        {group.sessionCount === 1
          ? t('sessions.count.one', { n: group.sessionCount })
          : t('sessions.count.other', { n: group.sessionCount })}
      </span>
    </span>
  )
}

/** Preset management controls occupying the official project row action seat. */
export function PresetRowActions({
  group, workspaces, onStartSession, onRename, onHide, onUnhide, t,
}: {
  group: PresetGroupNode
  workspaces: readonly WorkspaceChoice[]
  onStartSession: (workspaceId: WorkspaceId | undefined) => void
  onRename: () => void
  onHide: () => void
  onUnhide: () => void
  t: PropsLocale<'presetManager'>['t']
}) {
  const [plusOpen, setPlusOpen] = useState(false)
  return (
    <span className={css.actionContents} onClick={event => { event.stopPropagation() }}>
      {workspaces.length > 0
        ? (
          <Menu
            open={plusOpen}
            onClose={() => { setPlusOpen(false) }}
            items={workspaces.map(workspace => ({ id: workspace.id, label: workspace.title }))}
            onSelect={(workspaceId) => {
              setPlusOpen(false)
              onStartSession(workspaceId as WorkspaceId)
            }}
            align="end"
            dense
            portal
            anchor={(
              <button
                type="button"
                className={css.iconButton}
                aria-label={t('preset.start.aria', { name: group.label })}
                title={t('preset.start.aria', { name: group.label })}
                aria-haspopup="menu"
                aria-expanded={plusOpen}
                disabled={group.broken}
                onClick={() => { setPlusOpen(value => !value) }}
              >
                <IconPlusOutline16 />
              </button>
            )}
          />
        )
        : (
          <button
            type="button"
            className={css.iconButton}
            aria-label={t('preset.start.aria', { name: group.label })}
            title={t('preset.start.aria', { name: group.label })}
            disabled={group.broken}
            onClick={() => { onStartSession(undefined) }}
          >
            <IconPlusOutline16 />
          </button>
        )}
      <PresetMenu
        label={group.label}
        hidden={group.hidden}
        onRename={onRename}
        onHide={onHide}
        onUnhide={onUnhide}
        t={t}
      />
    </span>
  )
}
