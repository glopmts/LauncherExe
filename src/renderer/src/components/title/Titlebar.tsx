import { Link } from 'react-router-dom'
import styles from './titlebar.module.scss'

interface Props {
  search: string
  onSearch: (v: string) => void
}

export function Titlebar({ search, onSearch }: Props) {
  return (
    <div className={styles.titlebar}>
      <Link to="/" className={styles.drag}>
        <span className={styles.logo}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1.5" fill="var(--accent)" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" fill="var(--accent)" opacity="0.5" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" fill="var(--accent)" opacity="0.5" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" fill="var(--accent)" opacity="0.7" />
          </svg>
          EXE Vault
        </span>
      </Link>

      <div className={styles.searchWrap}>
        <svg
          className={styles.searchIcon}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className={styles.search}
          type="text"
          placeholder="Search apps..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clear} onClick={() => onSearch('')}>
            ×
          </button>
        )}
      </div>

      <div className={styles.controls}>
        <button onClick={() => window.electronAPI.minimize()} title="Minimize">
          <svg width="10" height="2" viewBox="0 0 10 2">
            <rect width="10" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        <button onClick={() => window.electronAPI.maximize()} title="Maximize">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
        <button className={styles.closeBtn} onClick={() => window.electronAPI.close()} title="Close">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
