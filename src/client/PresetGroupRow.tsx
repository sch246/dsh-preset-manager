/**
 * One preset group header row: drag handle, ★ default star, name +
 * description, hidden/broken badges, session count, expand chevron, the
 * new-session + button, and the ⋯ management menu.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { IconChevronDownOutline14, IconPlusOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PresetGroupNode } from './roster.ts'
import { PresetMenu } from './PresetMenu.tsx'
import { css } from './styles.ts'

/** In-flight drag marker for one group row. */
export interface PresetGroupDragState {
  sourceId: string
  over: { id: string; half: 'before' | 'after' } | null
}

/** Full component props. */
export interface PresetGroupRowProps {
  group: PresetGroupNode
  expanded: boolean
  /** True while any row drag is in flight. */
  dragging: boolean
  /** True while this row is the drag source. */
  source: boolean
  /** The marker this row currently carries (drop target feedback). */
  marker: 'before' | 'after' | null
  /** Begin a drag from this row (visible groups only). */
  onDragStart: () => void
  /** Hover marker update for this row. */
  onDragHover: (half: 'before' | 'after') => void
  /** Drop on this row. */
  onDrop: (half: 'before' | 'after') => void
  onDragEnd: () => void
  onToggle: () => void
  onStartSession: () => void
  onSetDefault: () => void
  onRename: () => void
  onHide: () => void
  onUnhide: () => void
  t: PropsLocale<'presetManager'>['t']
}

/**
 * Render one group header row.
 * @param props - group facts, drag seats, and action callbacks.
 * @returns the header row.
 */
export function PresetGroupRow({
  group, expanded, dragging, source, marker, onDragStart, onDragHover, onDrop, onDragEnd,
  onToggle, onStartSession, onSetDefault, onRename, onHide, onUnhide, t,
}: PresetGroupRowProps) {
  const dragEnabled = !group.hidden && group.presetId !== undefined && !dragging
  const rowClass = [
    css.groupRow,
    group.hidden ? css.groupRowHidden : '',
    marker === 'before' ? css.groupDropBefore : '',
    marker === 'after' ? css.groupDropAfter : '',
    source ? css.groupRowDragging : '',
  ].join(' ').trim()
  return (
    <div
      className={rowClass}
      role="treeitem"
      aria-expanded={expanded}
      draggable={dragEnabled}
      onDragStart={(event) => {
        if (!dragEnabled) return
        // Firefox needs data set for the drag to begin.
        event.dataTransfer.setData('text/plain', group.key)
        event.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragOver={(event) => {
        if (group.hidden || group.presetId === undefined || !dragging) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        const rect = event.currentTarget.getBoundingClientRect()
        onDragHover(event.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
      }}
      onDrop={(event) => {
        if (group.hidden || group.presetId === undefined || !dragging) return
        event.preventDefault()
        const rect = event.currentTarget.getBoundingClientRect()
        onDrop(event.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
      }}
      onDragEnd={() => { onDragEnd() }}
    >
      {dragEnabled && (
        <button
          type="button"
          className={css.dragHandle}
          aria-hidden="true"
          tabIndex={-1}
          onMouseDown={(event) => { event.preventDefault() }}
        >
          ⋮⋮
        </button>
      )}
      <button
        type="button"
        className={[css.star, group.isDefault ? css.starActive : ''].join(' ').trim()}
        aria-label={t('preset.default.aria')}
        title={t('preset.default.aria')}
        onClick={onSetDefault}
      >
        {group.isDefault ? '★' : '☆'}
      </button>
      <span className={css.groupLabel}>{group.label}</span>
      {group.presetId !== undefined && (
        <>
          <span className={css.groupDesc}>{group.description ?? ''}</span>
          {group.broken && <span className={`${css.badge} ${css.badgeBroken}`}>{t('preset.broken')}</span>}
          {group.hidden && <span className={css.badge}>{t('preset.hidden')}</span>}
          <span className={css.groupCount}>
            {group.sessionCount === 1
              ? t('sessions.count.one', { n: group.sessionCount })
              : t('sessions.count.other', { n: group.sessionCount })}
          </span>
          <button
            type="button"
            className={[css.chevron, expanded ? '' : css.chevronCollapsed].join(' ').trim()}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <IconChevronDownOutline14 />
          </button>
          <button
            type="button"
            className={css.iconButton}
            aria-label={t('preset.start.aria', { name: group.label })}
            title={t('preset.start.aria', { name: group.label })}
            disabled={group.broken}
            onClick={onStartSession}
          >
            <IconPlusOutline16 />
          </button>
          <PresetMenu
            label={group.label}
            hidden={group.hidden}
            onRename={onRename}
            onHide={onHide}
            onUnhide={onUnhide}
            t={t}
          />
        </>
      )}
    </div>
  )
}
