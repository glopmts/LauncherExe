import { Menu, nativeImage, Tray } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function buildTray(showWindow: () => void, quit: () => void): Tray {
  let iconPath: string

  if (process.env.NODE_ENV === 'development') {
    iconPath = join(__dirname, '../../resources/icon-ico.png')
  } else {
    iconPath = join(process.resourcesPath, 'icon-ico.png')
  }

  const icon = nativeImage.createFromPath(iconPath).resize({ width: 50, height: 50 })

  if (icon.isEmpty()) {
    console.error('Falha ao carregar o ícone:', iconPath)
    const fallbackIcon = nativeImage.createEmpty()
    tray = new Tray(fallbackIcon)
  } else {
    tray = new Tray(icon)
  }

  tray.setToolTip('EXE Vault')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open EXE Vault', click: showWindow },
      { type: 'separator' },
      { label: 'Quit', click: quit }
    ])
  )

  tray.on('click', showWindow)
  tray.on('double-click', showWindow)

  return tray
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
