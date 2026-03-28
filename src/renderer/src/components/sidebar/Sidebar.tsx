import { Category } from '@/types/interfaces'
import { FaCog } from 'react-icons/fa'
import { NavLink } from 'react-router-dom'
import styles from './sidebar.module.scss'

interface Props {
  counts: Record<Category, number>
  onAdd: () => void
}

const NAV: { id: Category; label: string; icon: string; to: string }[] = [
  { id: 'all', label: 'All', icon: '◈', to: '/' },
  { id: 'pinned', label: 'Pinned', icon: '◆', to: '/pinned' },
  { id: 'recent', label: 'Recent', icon: '◷', to: '/recent' }
]

const CATEGORIES: {
  id: Category
  label: string
  color: string
  to: string
}[] = [
  { id: 'game', label: 'Games', color: '#6c63ff', to: '/games' },
  { id: 'app', label: 'Apps', color: '#22d3ee', to: '/apps' },
  { id: 'tool', label: 'Tools', color: '#4ade80', to: '/tools' },
  { id: 'other', label: 'Other', color: '#fbbf24', to: '/other' }
]

// NavLink sets aria-current="page" and lets us style the active state via className
const navClass = ({ isActive }: { isActive: boolean }) => `${styles.item} ${isActive ? styles.active : ''}`

export function Sidebar({ counts, onAdd }: Props) {
  return (
    <aside className={styles.sidebar}>
      {/* ── Top nav (All / Pinned / Recent) */}
      <div className={styles.section}>
        {NAV.map((n) => (
          <NavLink
            key={n.id}
            to={n.to}
            // '/' would match every route — only mark active when exactly '/'
            end={n.to === '/'}
            className={navClass}
          >
            <span className={styles.icon}>{n.icon}</span>
            <span className={styles.label}>{n.label}</span>
            <span className={styles.count}>{counts[n.id]}</span>
          </NavLink>
        ))}
      </div>

      <div className={styles.divider} />

      {/* ── Library categories */}
      <div className={styles.sectionLabel}>Library</div>
      <div className={styles.section}>
        {CATEGORIES.map((c) => (
          <NavLink key={c.id} to={c.to} className={navClass}>
            <span className={styles.catDot} style={{ background: c.color }} />
            <span className={styles.label}>{c.label}</span>
            <span className={styles.count}>{counts[c.id]}</span>
          </NavLink>
        ))}
      </div>

      <div className={styles.spacer} />

      {/* ── Actions */}
      <div className={styles.buttons_actions}>
        <button className={styles.addBtn} onClick={onAdd}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Add App
        </button>

        <div className={styles.separete}></div>

        <NavLink to="/config" className={navClass}>
          <FaCog className={styles.configIcon} />
          <span className={styles.label}>Configurações</span>
        </NavLink>
      </div>
    </aside>
  )
}
