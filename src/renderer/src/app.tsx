import { Outlet } from 'react-router-dom'
import styles from './app.module.scss'
import { Sidebar } from './components/sidebar/Sidebar'
import { Titlebar } from './components/title/Titlebar'
import { Toast } from './components/toast/Toast'
import { AppProvider, useAppContext } from './context/AppContext'
import { OptimizedAnimation } from './context/OptimizedAnimation'
import { UpdaterBadge } from './context/Updatercomponent'
import './scss/global.scss'

export type { ToastMessage } from './context/AppContext'

function AppShell() {
  const { search, setSearch, counts, setShowAdd, setEditApp } = useAppContext()

  return (
    <OptimizedAnimation>
      <div className={styles.appShell}>
        <Titlebar search={search} onSearch={setSearch} />
        <UpdaterBadge />
        <div className={styles.appBody}>
          <Sidebar
            counts={counts}
            onAdd={() => {
              setEditApp(null)
              setShowAdd(true)
            }}
          />

          <main className={styles.main}>
            <Outlet />
          </main>
          <ToastStack />
        </div>{' '}
      </div>
    </OptimizedAnimation>
  )
}

function ToastStack() {
  const { toasts } = useAppContext()
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <Toast key={t.id} message={t} />
      ))}
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}

export default App
