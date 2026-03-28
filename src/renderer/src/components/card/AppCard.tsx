import { AppEntry } from '@/types/interfaces'
import { useEffect, useRef, useState } from 'react'
import styles from './AppCard.module.scss'

interface Props {
  app: AppEntry
  launching: boolean
  onLaunch: (app: AppEntry) => void
  onEdit: (app: AppEntry) => void
  onDelete: (id: string) => void
  onPin: (id: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  game: '#6c63ff',
  app: '#22d3ee',
  tool: '#4ade80',
  other: '#fbbf24'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function AppCard({ app, launching, onLaunch, onEdit, onDelete, onPin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loadedIcon, setLoadedIcon] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Load icon from file cache on mount (icon is not stored in the JSON entry)
  useEffect(() => {
    if (app.cover) return // cover image takes priority
    window.electronAPI.getExeIcon(app.path).then((icon) => {
      if (icon) setLoadedIcon(icon)
    })
  }, [app.path, app.cover])
  const accentColor = app.color || CATEGORY_COLORS[app.category] || '#6c63ff'

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleOpenFolder = async () => {
    await window.electronAPI.openFolder(app.path)
    setMenuOpen(false)
  }

  return (
    <div
      className={`${styles.card} ${launching ? styles.launching : ''}`}
      style={{ '--accent': accentColor } as React.CSSProperties}
      onDoubleClick={() => onLaunch(app)}
    >
      {app.pinned && <div className={styles.pinBadge}>◆</div>}

      <div className={styles.cover}>
        {app.cover ? (
          <img src={app.cover} alt={app.name} draggable={false} />
        ) : loadedIcon ? (
          <div className={styles.iconWrap} style={{ background: `${accentColor}15` }}>
            <img src={loadedIcon} alt={app.name} className={styles.iconImg} draggable={false} />
          </div>
        ) : (
          <div className={styles.placeholder} style={{ background: `${accentColor}22` }}>
            <span style={{ color: accentColor }}>{getInitials(app.name)}</span>
          </div>
        )}

        <div className={styles.overlay}>
          <button className={styles.launchBtn} onClick={() => onLaunch(app)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            {launching ? 'Launching…' : 'Launch'}
          </button>
        </div>
      </div>

      <div className={styles.info}>
        <span className={styles.name} title={app.name}>
          {app.name}
        </span>
        <div className={styles.meta}>
          <span className={styles.cat} style={{ color: accentColor, background: `${accentColor}18` }}>
            {app.category}
          </span>
          {app.launchCount > 0 && <span className={styles.launches}>{app.launchCount}×</span>}
        </div>
      </div>

      <div className={styles.menuWrap} ref={menuRef}>
        <button className={styles.menuBtn} onClick={() => setMenuOpen((v) => !v)}>
          ⋮
        </button>
        {menuOpen && (
          <div className={styles.menu}>
            <button
              onClick={() => {
                onLaunch(app)
                setMenuOpen(false)
              }}
            >
              ▶ Launch
            </button>
            <button
              onClick={() => {
                onPin(app.id)
                setMenuOpen(false)
              }}
            >
              {app.pinned ? '◇ Unpin' : '◆ Pin'}
            </button>
            <button
              onClick={() => {
                onEdit(app)
                setMenuOpen(false)
              }}
            >
              ✎ Edit
            </button>
            <button onClick={handleOpenFolder}>⎘ Open folder</button>
            <div className={styles.menuDivider} />
            <button
              className={styles.menuDelete}
              onClick={() => {
                onDelete(app.id)
                setMenuOpen(false)
              }}
            >
              ✕ Remove
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
