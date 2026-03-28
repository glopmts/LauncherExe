import { AppEntry, Category } from '@/types/interfaces'
import { AppCard } from '../card/AppCard'
import styles from './AppGrid.module.scss'

interface Props {
  apps: AppEntry[]
  launching: string | null
  onLaunch: (app: AppEntry) => void
  onEdit: (app: AppEntry) => void
  onDelete: (id: string) => void
  onPin: (id: string) => void
  onAdd: () => void
  category: Category
  search: string
}

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All Apps',
  game: 'Games',
  app: 'Apps',
  tool: 'Tools',
  other: 'Other',
  pinned: 'Pinned',
  recent: 'Recently Launched'
}

export function AppGrid({ apps, launching, onLaunch, onEdit, onDelete, onPin, onAdd, category, search }: Props) {
  const label = CATEGORY_LABELS[category]

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h2 className={styles.title}>{label}</h2>
        <span className={styles.subtitle}>
          {apps.length} {apps.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {apps.length === 0 ? (
        <div className={styles.empty}>
          {search ? (
            <>
              <span className={styles.emptyIcon}>◌</span>
              <p>
                No results for &quot;<strong>{search}</strong>&quot;
              </p>
            </>
          ) : (
            <>
              <span className={styles.emptyIcon}>⬡</span>
              <p>Nothing here yet</p>
              <button className={styles.emptyAdd} onClick={onAdd}>
                + Add your first app
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              launching={launching === app.id}
              onLaunch={onLaunch}
              onEdit={onEdit}
              onDelete={onDelete}
              onPin={onPin}
            />
          ))}
        </div>
      )}
    </main>
  )
}
