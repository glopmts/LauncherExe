import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AppEntry, Category } from '../types/interfaces'

export interface ToastMessage {
  id: string
  text: string
  type: 'success' | 'error' | 'info'
}

interface AppContextValue {
  apps: AppEntry[]
  category: Category
  search: string
  showAdd: boolean
  editApp: AppEntry | null
  toasts: ToastMessage[]
  launching: string | null
  counts: Record<string, number>
  setCategory: (c: Category) => void
  setSearch: (s: string) => void
  setShowAdd: (v: boolean) => void
  setEditApp: (a: AppEntry | null) => void
  saveApps: (next: AppEntry[]) => void
  addToast: (text: string, type?: ToastMessage['type']) => void
  handleLaunch: (app: AppEntry) => Promise<void>
  handleDelete: (id: string) => void
  handlePin: (id: string) => void
  handleEdit: (app: AppEntry) => void
  handleSave: (entry: AppEntry) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [apps, setApps] = useState<AppEntry[]>([])
  const [category, setCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editApp, setEditApp] = useState<AppEntry | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [launching, setLaunching] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const storedApps = await window.electronAPI.getApps()
      const appsWithIcons = await Promise.all(
        storedApps.map(async (app) => {
          const icon = await window.electronAPI.getExeIcon(app.path)
          return { ...app, icon }
        })
      )
      setApps(appsWithIcons)
    }
    load()
  }, [])

  const counts = {
    all: apps.length,
    game: apps.filter((a) => a.category === 'game').length,
    app: apps.filter((a) => a.category === 'app').length,
    tool: apps.filter((a) => a.category === 'tool').length,
    other: apps.filter((a) => a.category === 'other').length,
    pinned: apps.filter((a) => a.pinned).length,
    recent: apps.filter((a) => !!a.lastLaunched).length
  }

  const saveApps = useCallback((next: AppEntry[]) => {
    setApps(next)
    const toStore = next.map(({ icon, ...rest }) => rest)
    window.electronAPI.saveApps(toStore)
  }, [])

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, text, type }])
    setTimeout(() => setToasts((t) => t.filter((m) => m.id !== id)), 3000)
  }, [])

  const handleLaunch = useCallback(
    async (app: AppEntry) => {
      setLaunching(app.id)
      const res = await window.electronAPI.launch(app.path)
      if (res.success) {
        addToast(`Launched ${app.name}`, 'success')
        setApps((prev) =>
          prev.map((a) =>
            a.id === app.id
              ? {
                  ...a,
                  lastLaunched: new Date().toISOString(),
                  launchCount: a.launchCount + 1
                }
              : a
          )
        )
      } else {
        addToast(`Failed to launch ${app.name}`, 'error')
      }
      setTimeout(() => setLaunching(null), 800)
    },
    [addToast]
  )

  const handleDelete = useCallback(
    (id: string) => {
      setApps((prev) => {
        const app = prev.find((a) => a.id === id)
        if (app) window.electronAPI.deleteApp(app.path)
        const next = prev.filter((a) => a.id !== id)
        const toStore = next.map(({ icon, ...rest }) => rest)
        window.electronAPI.saveApps(toStore)
        return next
      })
      addToast('Removed', 'info')
    },
    [addToast]
  )

  const handlePin = useCallback((id: string) => {
    setApps((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a))
      const toStore = next.map(({ icon, ...rest }) => rest)
      window.electronAPI.saveApps(toStore)
      return next
    })
  }, [])

  const handleEdit = useCallback((app: AppEntry) => {
    setEditApp(app)
    setShowAdd(true)
  }, [])

  const handleSave = useCallback(
    async (entry: AppEntry) => {
      const icon = await window.electronAPI.getExeIcon(entry.path)
      const entryWithIcon = { ...entry, icon: icon ?? undefined }

      setApps((prev) => {
        const next = editApp ? prev.map((a) => (a.id === editApp.id ? entryWithIcon : a)) : [...prev, entryWithIcon]
        const toStore = next.map(({ icon, ...rest }) => rest)
        window.electronAPI.saveApps(toStore)
        return next
      })

      addToast(editApp ? 'App updated' : 'App added', 'success')
      setShowAdd(false)
      setEditApp(null)
    },
    [editApp, addToast]
  )

  return (
    <AppContext.Provider
      value={{
        apps,
        category,
        search,
        showAdd,
        editApp,
        toasts,
        launching,
        counts,
        setCategory,
        setSearch,
        setShowAdd,
        setEditApp,
        saveApps,
        addToast,
        handleLaunch,
        handleDelete,
        handlePin,
        handleEdit,
        handleSave
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider')
  return ctx
}
