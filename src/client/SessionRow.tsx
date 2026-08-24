/**
 * One session row inside a preset group: running/completed dot, title
 * (localized for blank rows), workspace label, and relative time.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { PresetSessionNode, RelativeTime } from './roster.ts'
import { relativeTime } from './roster.ts'
import { css } from './styles.ts'

/** Translate a relative-time bucket into its localized trailing label. */
export function timeLabel(
  time: RelativeTime,
  t: PropsLocale<'presetManager'>['t'],
): string {
  if (time.unit === 'now') return t('time.now')
  const magnitude = t(`time.${time.unit}`, { n: time.n })
  return t('time.ago', { t: magnitude })
}

/** Full component props: the row facts plus open/locale seats. */
export interface SessionRowProps {
  node: PresetSessionNode
  current: boolean
  /** Workspace display label of this session's workspace, if any. */
  workspace: string | undefined
  /** Current epoch ms (injected for pure rendering). */
  now: number
  onOpen: (sessionId: PresetSessionNode['id']) => void
  t: PropsLocale<'presetManager'>['t']
}

/**
 * Render one session row.
 * @param props - row facts and callbacks.
 * @returns the row element.
 */
export function SessionRow({ node, current, workspace, now, onOpen, t }: SessionRowProps) {
  const dotClass = node.running ? css.sessionDotRunning : node.completed ? css.sessionDotCompleted : ''
  return (
    <div
      className={[css.sessionRow, current ? css.sessionRowCurrent : ''].join(' ').trim()}
      role="treeitem"
      onClick={() => { onOpen(node.id) }}
    >
      <span className={`${css.sessionDot} ${dotClass}`} aria-hidden="true" />
      <span className={css.sessionTitle}>{node.blank ? t('session.new') : node.title}</span>
      {workspace !== undefined && workspace !== '' && (
        <span className={css.sessionWorkspace}>{workspace}</span>
      )}
      <span className={css.sessionTime}>{timeLabel(relativeTime(node.updatedAt, now), t)}</span>
    </div>
  )
}
