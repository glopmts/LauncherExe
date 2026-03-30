import { useLogs } from '@/hooks/useLogs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LogLevel, LogSource } from '../../../../types/log'
import { Icon } from '../../utils/log-icon'
import styles from './logs.module.scss'

const ALL_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
const ALL_SOURCES: LogSource[] = ['react-native', 'electron', 'renderer', 'main', 'preload']
const SOURCE_LABELS: Record<LogSource, string> = {
  'react-native': 'RN',
  electron: 'Electron',
  renderer: 'Renderer',
  main: 'Main',
  preload: 'Preload'
}

// Types
interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  source: LogSource
  message: string
  tag?: string
  pid?: number
  sessionId?: string
  meta?: Record<string, unknown>
  stackTrace?: string
}

// Utility functions
function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

function formatMeta(meta: Record<string, unknown>): string {
  return JSON.stringify(meta, null, 2)
}

// Components
function LevelBadge({ level }: { level: LogLevel }) {
  return <span className={`${styles['level-badge']} ${styles[`level-badge--${level}`]}`}>{level}</span>
}

function FilterToggle({
  label,
  dotClass,
  count,
  active,
  onClick
}: {
  label: string
  dotClass: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <div className={`${styles['filter-toggle']} ${active ? styles['filter-toggle--active'] : ''}`} onClick={onClick}>
      <div className={styles['filter-toggle__left']}>
        <span className={`${styles['filter-toggle__dot']} ${styles[dotClass]}`} />
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={styles['filter-toggle__count']}>{count}</span>
        <div className={`${styles['filter-toggle__check']} ${active ? styles['filter-toggle__check--checked'] : ''}`}>
          <Icon.Check />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  modifier,
  icon
}: {
  label: string
  value: number | string
  modifier: string
  icon: string
}) {
  return (
    <div className={`${styles['stat-card']} ${styles[`stat-card--${modifier}`]}`}>
      <div className={styles['stat-card__icon']}>{icon}</div>
      <div>
        <div className={styles['stat-card__value']}>{value}</div>
        <div className={styles['stat-card__label']}>{label}</div>
      </div>
    </div>
  )
}

function DetailPanel({ entry, onClose }: { entry: LogEntry | null; onClose: () => void }) {
  if (!entry) return null

  return (
    <div className={`${styles['detail-panel']} ${styles['detail-panel--open']}`}>
      <div className={styles['detail-panel__header']}>
        <LevelBadge level={entry.level} />
        <span className={styles['detail-panel__title']}>Log Detail</span>
        <button className={styles['detail-panel__close']} onClick={onClose}>
          <Icon.X />
        </button>
      </div>
      <div className={styles['detail-panel__body']}>
        <div className={styles['detail-panel__field']}>
          <div className={styles['detail-panel__field-label']}>Timestamp</div>
          <div className={styles['detail-panel__field-value']}>{entry.timestamp.toISOString()}</div>
        </div>
        <div className={styles['detail-panel__field']}>
          <div className={styles['detail-panel__field-label']}>Message</div>
          <div className={styles['detail-panel__field-value']}>{entry.message}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className={styles['detail-panel__field']}>
            <div className={styles['detail-panel__field-label']}>Level</div>
            <div className={styles['detail-panel__field-value']}>
              <LevelBadge level={entry.level} />
            </div>
          </div>
          <div className={styles['detail-panel__field']}>
            <div className={styles['detail-panel__field-label']}>Source</div>
            <div
              className={`${styles['detail-panel__field-value']} ${styles['source-text']} ${styles[`source-text--${entry.source}`]}`}
            >
              {entry.source}
            </div>
          </div>
        </div>
        {entry.tag && (
          <div className={styles['detail-panel__field']}>
            <div className={styles['detail-panel__field-label']}>Tag</div>
            <div className={styles['detail-panel__field-value']} style={{ color: 'var(--accent-cyan)' }}>
              {entry.tag}
            </div>
          </div>
        )}
        {entry.pid && (
          <div className={styles['detail-panel__field']}>
            <div className={styles['detail-panel__field-label']}>PID</div>
            <div className={styles['detail-panel__field-value']}>{entry.pid}</div>
          </div>
        )}
        {entry.sessionId && (
          <div className={styles['detail-panel__field']}>
            <div className={styles['detail-panel__field-label']}>Session</div>
            <div className={styles['detail-panel__field-value']}>{entry.sessionId}</div>
          </div>
        )}
        {entry.meta && (
          <div className={styles['detail-panel__field']}>
            <div className={styles['detail-panel__field-label']}>Metadata</div>
            <pre className={styles['detail-panel__meta']}>{formatMeta(entry.meta)}</pre>
          </div>
        )}
        {entry.stackTrace && (
          <div className={styles['detail-panel__field']}>
            <div className={styles['detail-panel__field-label']}>Stack Trace</div>
            <pre className={styles['detail-panel__stack']}>{entry.stackTrace}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

// Main Component
export default function LogsPage() {
  const { entries, stats, tags, isPaused, setFilter, clearLogs, togglePause } = useLogs()
  const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(new Set(ALL_LEVELS))
  const [activeSources, setActiveSources] = useState<Set<LogSource>>(new Set(ALL_SOURCES))
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LogEntry | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)

  // Apply filters whenever they change
  useEffect(() => {
    setFilter({
      levels: [...activeLevels],
      sources: [...activeSources],
      search,
      tags: [...activeTags]
    })
  }, [activeLevels, activeSources, search, activeTags, setFilter])

  // Auto-scroll to top when new entries arrive
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [entries.length, autoScroll])

  const toggleLevel = useCallback((level: LogLevel) => {
    setActiveLevels((prev) => {
      const next = new Set(prev)
      next.has(level) ? next.delete(level) : next.add(level)
      return next
    })
  }, [])

  const toggleSource = useCallback((source: LogSource) => {
    setActiveSources((prev) => {
      const next = new Set(prev)
      next.has(source) ? next.delete(source) : next.add(source)
      return next
    })
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }, [])

  const handleExport = useCallback(() => {
    const data = entries
      .map((e) => `[${e.timestamp.toISOString()}] [${e.level.toUpperCase().padEnd(5)}] [${e.source}] ${e.message}`)
      .join('\n')
    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [entries])

  const handleScroll = useCallback(() => {
    if (!listRef.current) return
    setAutoScroll(listRef.current.scrollTop < 60)
  }, [])

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles['header__logo']}>
          <Icon.Terminal />
          <h1>
            Log<span>Monitor</span>
          </h1>
        </div>
        <div className={styles['header__divider']} />
        <div className={styles['header__stack-badge']}>
          <span className={`${styles['header__badge']} ${styles['header__badge--rn']}`}>React Native</span>
          <span className={`${styles['header__badge']} ${styles['header__badge--el']}`}>Electron</span>
          <span className={`${styles['header__badge']} ${styles['header__badge--vite']}`}>Vite</span>
          <span className={`${styles['header__badge']} ${styles['header__badge--ts']}`}>TypeScript</span>
        </div>
        <div className={styles['header__spacer']} />
        <div className={styles['header__controls']}>
          <div className={`${styles['header__live-dot']} ${isPaused ? styles['header__live-dot--paused'] : ''}`} />
          <button
            className={`${styles['header__btn']} ${isPaused ? styles['header__btn--resume'] : styles['header__btn--pause']}`}
            onClick={togglePause}
          >
            {isPaused ? (
              <>
                <Icon.Play />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Icon.Pause />
                <span>Pause</span>
              </>
            )}
          </button>
          <button className={`${styles['header__btn']} ${styles['header__btn--clear']}`} onClick={clearLogs}>
            <Icon.Trash />
            <span>Clear</span>
          </button>
          <button className={`${styles['header__btn']} ${styles['header__btn--export']}`} onClick={handleExport}>
            <Icon.Download />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className={styles['stats-bar']}>
        <StatCard label="Total" value={stats.total} modifier="total" icon="∑" />
        <div className={styles['stat-card__divider']} />
        <StatCard label="Debug" value={stats.byLevel.debug} modifier="debug" icon="·" />
        <StatCard label="Info" value={stats.byLevel.info} modifier="info" icon="ℹ" />
        <StatCard label="Warn" value={stats.byLevel.warn} modifier="warn" icon="⚠" />
        <StatCard label="Error" value={stats.byLevel.error} modifier="error" icon="✕" />
        <StatCard label="Fatal" value={stats.byLevel.fatal} modifier="fatal" icon="☠" />
        <div className={styles['stat-card__divider']} />
        <StatCard label="Err/min" value={stats.errorsPerMinute} modifier="epm" icon="⚡" />
      </div>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles['sidebar__section']}>
          <div className={styles['sidebar__title']}>Search</div>
          <div className={styles['sidebar__search']}>
            <Icon.Search />
            <input
              type="text"
              placeholder="Filter logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className={styles['sidebar__section']}>
          <div className={styles['sidebar__title']}>Level</div>
          {ALL_LEVELS.map((level) => (
            <FilterToggle
              key={level}
              label={level.charAt(0).toUpperCase() + level.slice(1)}
              dotClass={`filter-toggle__dot--${level}`}
              count={stats.byLevel[level]}
              active={activeLevels.has(level)}
              onClick={() => toggleLevel(level)}
            />
          ))}
        </div>

        <div className={styles['sidebar__section']}>
          <div className={styles['sidebar__title']}>Source</div>
          {ALL_SOURCES.map((source) => (
            <FilterToggle
              key={source}
              label={SOURCE_LABELS[source]}
              dotClass={`filter-toggle__dot--${source.replace('-', '')}`}
              count={stats.bySource[source]}
              active={activeSources.has(source)}
              onClick={() => toggleSource(source)}
            />
          ))}
        </div>

        <div className={styles['sidebar__section']}>
          <div className={styles['sidebar__title']}>Tags</div>
          <div className={styles['sidebar__tags']}>
            {tags.map((tag: string) => (
              <span
                key={tag}
                className={`${styles['tag-chip']} ${activeTags.has(tag) ? styles['tag-chip--active'] : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Log Panel */}
      <div className={styles['log-panel']}>
        <div className={styles['log-toolbar']}>
          <span>
            Showing <span className={styles['log-toolbar__count']}>{entries.length}</span> entries
          </span>
          {isPaused && <span style={{ color: 'var(--level-warn)', marginLeft: 8 }}>⏸ Paused</span>}
          <div className={styles['log-toolbar__spacer']} />
          <div className={styles['log-toolbar__sort']}>
            <Icon.ChevronDown />
            <span>Newest first</span>
          </div>
        </div>

        <div className={styles['log-list']} ref={listRef} onScroll={handleScroll}>
          {entries.length === 0 ? (
            <div className={styles['empty-state']}>
              <Icon.AlertTriangle />
              <p>
                No logs match the current filters.
                <br />
                Adjust your filters or wait for new entries.
              </p>
            </div>
          ) : (
            entries.map((entry: LogEntry, i: number) => (
              <div
                key={entry.id}
                className={[
                  styles['log-row'],
                  styles[`log-row--${entry.level}`],
                  selected?.id === entry.id ? styles['log-row--selected'] : '',
                  i === 0 ? styles['log-row--new'] : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelected(selected?.id === entry.id ? null : entry)}
              >
                <div className={styles['log-row__ts']}>{formatTime(entry.timestamp)}</div>
                <div className={styles['log-row__level']}>
                  <LevelBadge level={entry.level} />
                </div>
                <div
                  className={`${styles['log-row__source']} ${styles['source-text']} ${styles[`source-text--${entry.source}`]}`}
                >
                  {SOURCE_LABELS[entry.source]}
                </div>
                <div className={styles['log-row__message']}>{entry.message}</div>
                <div className={styles['log-row__tag']}>{entry.tag}</div>
              </div>
            ))
          )}
        </div>

        {!autoScroll && (
          <button
            className={styles['scroll-bottom-btn']}
            onClick={() => {
              if (listRef.current) listRef.current.scrollTop = 0
              setAutoScroll(true)
            }}
          >
            <Icon.ChevronDown />
          </button>
        )}
      </div>

      <DetailPanel entry={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
