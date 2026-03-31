import AutoLaunch from 'auto-launch'
import { spawn } from 'child_process'
import { app, BrowserWindow, dialog, ipcMain, Notification, shell } from 'electron'
import Store from 'electron-store'
import fs from 'fs'
import { readdir } from 'fs/promises'
import path from 'path'
import { IPC_CHANNELS } from '../../constants/ipc-channels'
import { AppEntry } from '../types/types'
import { extractIcon, getCachedIcon, iconFilePath, initIconPaths, readProductName } from './extrar-icons'
import { addRecentApp, getRecentApps } from './recent-apps'
import { updateTrayMenu } from './tray'

const autoLauncher = new AutoLaunch({
  name: 'LauncherExe',
  path: app.getPath('exe')
})

const store = new Store({ name: 'app-data' })

let iconsDir = ''
let tempDir = ''

export function getAppDataPath(): string {
  return app.getPath('userData')
}

export function registerIpcHandlers(
  getWindow: () => BrowserWindow | null,
  hideWindow: () => void,
  quitApp: () => void,
  showWindow: () => void
): void {
  iconsDir = path.join(app.getPath('userData'), 'icons')
  tempDir = app.getPath('temp')

  initIconPaths(iconsDir, tempDir)

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }

  // ── Window

  ipcMain.handle('window:minimize', () => getWindow()?.minimize())
  ipcMain.handle('window:maximize', () => {
    const win = getWindow()
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })
  ipcMain.handle('window:hide', hideWindow)
  ipcMain.handle('window:close', hideWindow)
  ipcMain.handle('window:quit', quitApp)

  // ── Dialogs

  ipcMain.handle('dialog:openExe', async () => {
    const win = getWindow()
    if (!win) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Select Executable',
      filters: [
        { name: 'Executables', extensions: ['exe'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    return canceled ? null : (filePaths[0] ?? null)
  })

  ipcMain.handle('dialog:openImage', async () => {
    const win = getWindow()
    if (!win) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Select Cover Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths[0]) return null
    const buf = fs.readFileSync(filePaths[0])
    const ext = path.extname(filePaths[0]).slice(1).replace('jpg', 'jpeg')
    return `data:image/${ext};base64,${buf.toString('base64')}`
  })

  // ── EXE info

  ipcMain.handle('exe:getInfo', async (_e, exePath: string) => {
    if (!fs.existsSync(exePath)) return null
    const [iconDataUrl, productName] = await Promise.all([extractIcon(exePath), readProductName(exePath)])
    return {
      name: productName || path.basename(exePath, '.exe'),
      iconDataUrl
    }
  })

  ipcMain.handle('exe:getIcon', (_e, exePath: string): string | null => {
    return getCachedIcon(exePath)
  })

  ipcMain.handle('exe:clearIconCache', (_e, exePath: string): boolean => {
    try {
      const p = iconFilePath(exePath)
      if (fs.existsSync(p || '')) fs.unlinkSync(p || '')
      return true
    } catch {
      return false
    }
  })

  // ── App actions

  ipcMain.handle('app:launch', async (_e, exePath: string) => {
    try {
      spawn(exePath, [], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(exePath)
      }).unref()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('app:openFolder', (_e, exePath: string) => {
    shell.showItemInFolder(exePath)
  })

  ipcMain.handle('fs:fileExists', (_e, filePath: string) => fs.existsSync(filePath))

  ipcMain.handle('app:delete', (_e, exePath: string): boolean => {
    try {
      const p = iconFilePath(exePath)
      if (p && fs.existsSync(p)) fs.unlinkSync(p)
      return true
    } catch {
      return false
    }
  })

  // ── Auto launch

  ipcMain.handle(IPC_CHANNELS.SET_AUTO_LAUNCH, async (_, enabled: boolean) => {
    try {
      enabled ? await autoLauncher.enable() : await autoLauncher.disable()
      store.set('autoLaunch', enabled)
      return { success: true, data: enabled }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_AUTO_LAUNCH_STATUS, async () => {
    try {
      const isEnabled = await autoLauncher.isEnabled()
      return { enabled: isEnabled }
    } catch {
      return { enabled: false }
    }
  })

  // ── Store

  ipcMain.handle('store:get', () => {
    try {
      return store.get('apps', [])
    } catch {
      return []
    }
  })

  ipcMain.handle('store:set', (_e, data: AppEntry[]) => {
    try {
      store.set('apps', data)
      return true
    } catch (err) {
      console.error('[store:set] failed:', err)
      return false
    }
  })

  // ── Notifications

  ipcMain.handle(
    IPC_CHANNELS.SHOW_NOTIFICATION,
    (_, { title, body, silent = false, icon }: { title: string; body: string; silent?: boolean; icon?: string }) => {
      try {
        const notificationOptions: Electron.NotificationConstructorOptions = { title, body, silent }

        if (icon) {
          notificationOptions.icon = icon
        } else {
          const defaultIcon = path.join(__dirname, '../../resources/icon.png')
          if (fs.existsSync(defaultIcon)) notificationOptions.icon = defaultIcon
        }

        new Notification(notificationOptions).show()
        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  // ── Settings

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_, settings: Record<string, unknown>) => {
    try {
      Object.keys(settings).forEach((key) => store.set(key, settings[key]))
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.LOAD_SETTINGS, () => {
    try {
      return store.store
    } catch {
      return {}
    }
  })

  // ── App data folder

  ipcMain.handle('open-app-data-folder', async () => {
    try {
      const appDataPath = getAppDataPath()
      await shell.openPath(appDataPath)
      return { success: true, path: appDataPath }
    } catch (error) {
      return { success: false, error: error }
    }
  })

  ipcMain.handle('get-app-data-path', () => getAppDataPath())

  ipcMain.handle('list-app-data-files', async () => {
    try {
      return await readdir(getAppDataPath())
    } catch {
      return []
    }
  })

  // ── Recentes

  ipcMain.handle(IPC_CHANNELS.GET_RECENT_APPS, () => {
    return getRecentApps(store)
  })

  ipcMain.handle(IPC_CHANNELS.ADD_RECENT_APP, (_e, entry: AppEntry) => {
    addRecentApp(store, entry)

    const recents = getRecentApps(store)
    updateTrayMenu(showWindow, quitApp, recents, (exePath) => {
      spawn(exePath, [], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(exePath)
      }).unref()
    })
  })
}
