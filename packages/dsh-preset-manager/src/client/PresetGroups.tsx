/**
 * The preset-group tree filling the patched `sidebar.workspaces.presetGroups`
 * child slot: visible preset groups in `order` order, hidden groups dimmed
 * and pinned at the end, and the ungrouped bucket last. Rows manage the
 * whole display layer (drag / hide / unhide / rename / new session)
 * through the injected face; all derivation stays in roster.ts.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { GroupNode } from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PresetManagerState, PresetGroupNode, RosterEntry, RosterSnapshot } from './roster.ts'
import type { PresetManagerKey } from './locales.ts'
import { derivePresetGroups, deriveRoster } from './roster.ts'
import type { createPresetManagerStore } from './stores.ts'
import { PresetRowActions, PresetRowMeta } from './PresetRowDecorations.tsx'
import { RenameDialog } from './RenameDialog.tsx'
import { css } from './styles.ts'

/** Registration-side business face for the preset tree. */
export interface PresetGroupsInjected {
  hooks: {
    /** Roster snapshot bound by the renderer as useRoster (shared with the chip). */
    roster: SnapshotStore<RosterSnapshot>
  }
  /** Read the roster (and reconcile the order) when the tree first renders. */
  load: () => Promise<void>
  /** Open a real Session. */
  open: (sessionId: SessionId) => void
  /**
   * Resolve a blank Session in the chosen workspace, select its preset, then
   * open it; returns a message key when no workspace can take the Session or
   * connect/selection failed.
   */
  startSessionByPreset: (id: string, workspaceId?: WorkspaceId) => Promise<PresetManagerKey | undefined>
  /** Hide a preset (rejected for the default one; I3 unset may follow). */
  hide: (state: PresetManagerState, id: string) => Promise<PresetManagerKey | undefined>
  /** Unhide a preset: it reappends at the end of the list. */
  unhide: (state: PresetManagerState, id: string) => Promise<void>
  /** Write the display name/description override. */
  rename: (id: string, override: { name: string; description: string }) => Promise<void>
}

/** In-flight drag marker for one preset project section. */
interface PresetGroupDragState {
  sourceId: string
  over: { id: string; half: 'before' | 'after' } | null
}

/** Full component props: patched owner share + store + inject face + locale. */
export type PresetGroupsProps =
  PropsRuntime<'sidebar.workspaces.presetGroups'>
  & PropsStore<ReturnType<typeof createPresetManagerStore>>
  & InjectFace<PresetGroupsInjected>
  & PropsLocale<'presetManager'>

/** Accept native drops at document level while a row drag is active (mirror of the workspace browser). */
function useNativeDragAcceptance(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const acceptDrag = (event: DragEvent): void => {
      event.preventDefault()
      if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'move'
    }
    const acceptDrop = (event: DragEvent): void => { event.preventDefault() }
    document.addEventListener('dragover', acceptDrag)
    document.addEventListener('drop', acceptDrop)
    return () => {
      document.removeEventListener('dragover', acceptDrag)
      document.removeEventListener('drop', acceptDrop)
    }
  }, [active])
}

/**
 * Render the preset group tree.
 * @param props - composed slot props.
 * @returns the tree element.
 */
export function PresetGroups({
  query, rows, sessionActions, useSessions, useSessionPendingInteraction, useWorkspaces, useStore, actions,
  useRoster, load, open, startSessionByPreset, hide, unhide, rename, t,
}: PresetGroupsProps) {
  const list = useSessions(snapshot => snapshot)
  const workspaceItems = useWorkspaces(snapshot => snapshot.items)
  const archivedSessionIds = useWorkspaces(snapshot => snapshot.archivedSessionIds)
  const pendingInteractions = useSessionPendingInteraction(snapshot => snapshot)
  const state = useStore(snapshot => snapshot)
  const rosterSnapshot = useRoster(snapshot => snapshot)

  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [drag, setDrag] = useState<PresetGroupDragState | null>(null)
  const dropCommitted = useRef(false)
  const [notice, setNotice] = useState<PresetManagerKey | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const [renameTarget, setRenameTarget] = useState<RosterEntry | null>(null)
  const expandedInitialized = useRef(false)
  useNativeDragAcceptance(drag !== null)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => () => { window.clearTimeout(noticeTimer.current) }, [])
  const showNotice = (key: PresetManagerKey): void => {
    setNotice(key)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => { setNotice(null) }, 4000)
  }

  const roster = useMemo(
    () => deriveRoster(rosterSnapshot.presets, state),
    [rosterSnapshot.presets, state],
  )
  const sessionNodes = useMemo(
    () => rows.deriveSessions(list, archivedSessionIds, pendingInteractions),
    [rows, list, archivedSessionIds, pendingInteractions],
  )
  const groups = useMemo(
    () => derivePresetGroups(list, sessionNodes, roster, state.order, query),
    [list, sessionNodes, roster, state.order, query],
  )
  const workspaceBySession = useMemo(() => {
    const map = new Map<string, string>()
    for (const workspace of workspaceItems) {
      for (const sessionId of workspace.sessionIds) {
        if (!map.has(sessionId as string)) map.set(sessionId as string, workspace.title)
      }
    }
    return map
  }, [workspaceItems])
  const workspaceLabelOf = (sessionId: SessionId): string | undefined => {
    const listed = workspaceBySession.get(sessionId as string)
    if (listed !== undefined) return listed
    const cwd = list.byId[sessionId]?.cwd
    return cwd === undefined || cwd === '' ? undefined : rows.workspaceLabel(cwd)
  }
  const workspaceChoices = useMemo(
    () => workspaceItems.map(workspace => ({ id: workspace.workspaceId, title: workspace.title })),
    [workspaceItems],
  )

  // Match the official browser: only the current session's group opens
  // automatically; every closed group contains no session preview.
  useEffect(() => {
    if (list.phase !== 'ready' || expandedInitialized.current || groups.length === 0) return
    expandedInitialized.current = true
    const currentGroup = groups.find(group => group.sessions.some(node => node.id === list.current))?.key
    setExpandedGroups(currentGroup === undefined ? [] : [currentGroup])
  }, [list, groups])

  const commitDrag = (active: PresetGroupDragState, over: NonNullable<PresetGroupDragState['over']>): void => {
    if (dropCommitted.current) return
    dropCommitted.current = true
    setDrag(null)
    const source = state.order
    const sourceIndex = source.indexOf(active.sourceId)
    if (sourceIndex === -1) return
    const targetIndex = source.indexOf(over.id)
    if (targetIndex === -1) return
    const anchor = over.half === 'before' ? over.id : source[targetIndex + 1]
    if (anchor === active.sourceId) return
    const anchorIndex = anchor === undefined ? source.length : source.indexOf(anchor)
    if (anchorIndex === sourceIndex || anchorIndex === sourceIndex + 1) return
    const next = source.filter(id => id !== active.sourceId)
    const insertAt = anchor === undefined ? next.length : next.indexOf(anchor)
    next.splice(insertAt === -1 ? next.length : insertAt, 0, active.sourceId)
    actions.setOrder(next)
  }

  const toggle = (key: string): void => {
    setExpandedGroups(keys => keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key])
  }
  const run = (promise: Promise<PresetManagerKey | undefined>): void => {
    void promise.then((key) => { if (key !== undefined) showNotice(key) })
  }

  let status: ReactNode = null
  if (groups.length === 0) {
    if (rosterSnapshot.status === 'error') {
      status = (
        <div className={css.status}>
          {t('empty.error')}
          {' '}
          <button type="button" className={css.retry} onClick={() => { void load() }}>{t('retry')}</button>
        </div>
      )
    } else if (rosterSnapshot.status !== 'ready') {
      status = <div className={css.status}>{t('empty.loading')}</div>
    } else if (query.trim() !== '') {
      status = <div className={css.empty}>{t('empty.noMatches')}</div>
    } else {
      status = <div className={css.empty}>{t('empty.none')}</div>
    }
  }

  return (
    <div className={css.root}>
      {notice !== null && <div className={css.notice} role="status">{t(notice)}</div>}
      <div className={css.list} role="tree" aria-label={t('tree.aria')}>
        {status}
        {groups.map((group: PresetGroupNode) => {
          const expanded = expandedGroups.includes(group.key)
          const entry = group.presetId === undefined ? undefined : roster.find(r => r.id === group.presetId)
          const marker = drag !== null && drag.over?.id === group.key ? drag.over.half : null
          const canDrag = group.presetId !== undefined && !group.hidden
          const row: GroupNode = {
            key: group.key,
            workspaceId: undefined,
            cwd: undefined,
            createdAt: undefined,
            label: group.label,
            sessionCount: group.sessionCount,
            expanded,
            containsCurrent: group.sessions.some(node => node.id === list.current),
            sessions: expanded ? group.sessions : [],
          }
          const projectRow = rows.renderProjectRow({
            group: row,
            label: group.presetId === undefined ? t('group.ungrouped') : group.label,
            muted: group.hidden,
            meta: group.presetId === undefined ? undefined : <PresetRowMeta group={group} t={t} />,
            rowActions: group.presetId === undefined
              ? undefined
              : <PresetRowActions
                group={group}
                workspaces={workspaceChoices}
                onStartSession={(workspaceId) => {
                  void startSessionByPreset(group.presetId as string, workspaceId).then((key) => {
                    if (key !== undefined) showNotice(key)
                  })
                }}
                onRename={() => { if (entry !== undefined) setRenameTarget(entry) }}
                onHide={() => { run(hide(state, group.presetId as string)) }}
                onUnhide={() => { void unhide(state, group.presetId as string) }}
                t={t}
              />,
            ...(canDrag
              ? {
                  drag: {
                    start: () => {
                      dropCommitted.current = false
                      setDrag({ sourceId: group.key, over: null })
                    },
                    end: () => {
                      if (drag !== null && drag.over !== null) commitDrag(drag, drag.over)
                      else setDrag(null)
                      dropCommitted.current = false
                    },
                  },
                }
              : {}),
            onToggle: () => {
              toggle(group.key)
            },
          })
          const sessionRows = rows.renderSessions({
            groupKey: group.key,
            list,
            sessions: group.allSessions,
            visibleIds: group.sessions.map(node => node.id),
            expanded,
            meta: workspaceLabelOf,
            onOpen: open,
            ...sessionActions,
          })
          return (
            <Fragment key={group.key}>
              {rows.renderProjectGroup({
                ...(canDrag
                  ? {
                      drag: {
                        active: drag !== null,
                        marker,
                        hover: (half) => {
                          setDrag(active => active === null ? active : { ...active, over: { id: group.key, half } })
                        },
                        drop: (half) => {
                          if (drag !== null) commitDrag(drag, { id: group.key, half })
                        },
                      },
                    }
                  : {}),
                children: <>{projectRow}{sessionRows}</>,
              })}
            </Fragment>
          )
        })}
      </div>
      {renameTarget !== null && (
        <RenameDialog
          key={renameTarget.id}
          entry={renameTarget}
          onClose={() => { setRenameTarget(null) }}
          onConfirm={(override) => {
            void rename(renameTarget.id, override)
            setRenameTarget(null)
          }}
          t={t}
        />
      )}
    </div>
  )
}
