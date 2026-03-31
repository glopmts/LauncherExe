import { nativeImage } from 'electron'
import { AppEntry } from '../types/types'

const RECENT_KEY = 'recent-apps'
const RECENT_MAX = 3

export interface RecentApp {
  id: string
  name: string
  exePath: string
  icon?: string
  lastPlayed: string
}

export function getRecentApps(store: any): RecentApp[] {
  return store.get(RECENT_KEY, []) as RecentApp[]
}

/* Rotação: remove duplicata, insere no topo, corta em RECENT_MAX.
   Exemplo com 3 apps [A, B, C] e novo app D:
     1. filtra D (não existe) → [A, B, C]
     2. prepend D            → [D, A, B, C]
     3. slice(0, 3)          → [D, A, B]  — C descartado */
export function addRecentApp(store: any, app: AppEntry): void {
  const current: RecentApp[] = store.get(RECENT_KEY, []) as RecentApp[]

  const entry: RecentApp = {
    id: app.id,
    name: app.name,
    exePath: app.path,
    icon: app.icon || '',
    lastPlayed: new Date().toISOString()
  }

  const rotated = [entry, ...current.filter((r) => r.id !== app.id)].slice(0, RECENT_MAX)

  store.set(RECENT_KEY, rotated)
}

export function buildRecentMenuItems(
  recents: RecentApp[],
  onLaunch: (exePath: string) => void
): Electron.MenuItemConstructorOptions[] {
  if (recents.length === 0) {
    return [{ label: 'Nenhum app recente', enabled: false }]
  }

  return recents.map((app) => {
    let icon: Electron.NativeImage | undefined

    if (app.icon) {
      try {
        const base64 = app.icon.replace(/^data:image\/\w+;base64,/, '')
        const buf = Buffer.from(base64, 'base64')
        icon = nativeImage.createFromBuffer(buf).resize({ width: 16, height: 16 })
      } catch {
        icon = undefined
      }
    }

    return {
      label: app.name,
      icon,
      click: () => onLaunch(app.exePath)
    } satisfies Electron.MenuItemConstructorOptions
  })
}
