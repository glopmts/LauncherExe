import { is } from '@electron-toolkit/utils'
import { Menu, nativeImage, Tray } from 'electron'
import { join } from 'path'
import { buildRecentMenuItems, RecentApp } from './recent-apps'

let tray: Tray | null = null

export function buildTray(showWindow: () => void, quit: () => void): Tray {
  const iconPath = is.dev ? join(__dirname, '../../resources/icon.png') : join(process.resourcesPath, 'icon.png')

  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

  tray = icon.isEmpty() ? new Tray(nativeImage.createEmpty()) : new Tray(icon)

  tray.setToolTip('EXE Vault')

  /* Menu inicial sem recentes */
  setTrayMenu(showWindow, quit, [])

  tray.on('click', showWindow)
  tray.on('double-click', showWindow)

  return tray
}

/* Reconstrói o menu do tray com a lista de recentes atualizada.
   Deve ser chamado sempre que um app for lançado. */
export function updateTrayMenu(
  showWindow: () => void,
  quit: () => void,
  recents: RecentApp[],
  onLaunch: (exePath: string) => void
): void {
  if (!tray || tray.isDestroyed()) return
  setTrayMenu(showWindow, quit, recents, onLaunch)
}

function setTrayMenu(
  showWindow: () => void,
  quit: () => void,
  recents: RecentApp[] = [],
  onLaunch?: (exePath: string) => void
): void {
  const recentItems = buildRecentMenuItems(recents, onLaunch ?? (() => {}))

  const menu = Menu.buildFromTemplate([
    { label: 'Abrir EXE Vault', click: showWindow },
    { type: 'separator' },
    { label: 'Recentes', enabled: false },
    ...recentItems,
    { type: 'separator' },
    { label: 'Sair', click: quit }
  ])

  tray!.setContextMenu(menu)
}

export function getTray(): Tray | null {
  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

export function showBalloon(title: string, content: string): void {
  if (process.platform !== 'win32' || !tray) return
  tray.displayBalloon({ title, content, iconType: 'info' })
}
