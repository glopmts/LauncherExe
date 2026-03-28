import { useAppContext } from '@/context/AppContext'
import { Category } from '@/types/interfaces'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AddModal } from '../../components/add-modal/AddModal'
import { AppGrid } from '../../components/app-grid/AppGrid'

const PATH_TO_CATEGORY: Record<string, Category> = {
  '/': 'all',
  '/pinned': 'pinned',
  '/recent': 'recent',
  '/games': 'game',
  '/apps': 'app',
  '/tools': 'tool',
  '/other': 'other'
}

const Home = () => {
  const location = useLocation()

  const activeCategory: Category = PATH_TO_CATEGORY[location.pathname] ?? 'all'

  const { category, setCategory, apps, ...rest } = useAppContext()

  useEffect(() => {
    const newCategory = PATH_TO_CATEGORY[location.pathname] ?? 'all'
    if (category !== newCategory) {
      setCategory(newCategory)
    }
  }, [location.pathname, category, setCategory])

  const filteredApps = apps
    .filter((a) => {
      const matchSearch = a.name.toLowerCase().includes(rest.search.toLowerCase())

      if (activeCategory === 'all') return matchSearch
      if (activeCategory === 'pinned') return a.pinned && matchSearch
      if (activeCategory === 'recent') return !!a.lastLaunched && matchSearch
      return a.category === activeCategory && matchSearch
    })
    .sort((a, b) => {
      if (activeCategory === 'recent') {
        return new Date(b.lastLaunched!).getTime() - new Date(a.lastLaunched!).getTime()
      }
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return a.name.localeCompare(b.name)
    })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0
      }}
    >
      <AppGrid
        apps={filteredApps}
        launching={rest.launching}
        onLaunch={rest.handleLaunch}
        onEdit={rest.handleEdit}
        onDelete={rest.handleDelete}
        onPin={rest.handlePin}
        onAdd={() => {
          rest.setEditApp(null)
          rest.setShowAdd(true)
        }}
        category={activeCategory}
        search={rest.search}
      />

      {rest.showAdd && (
        <AddModal
          initial={rest.editApp}
          onSave={rest.handleSave}
          onClose={() => {
            rest.setShowAdd(false)
            rest.setEditApp(null)
          }}
        />
      )}
    </div>
  )
}

export default Home
