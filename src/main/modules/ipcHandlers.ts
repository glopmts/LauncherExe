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

// Configuração do AutoLaunch
const autoLauncher = new AutoLaunch({
  name: 'LauncherExe',
  path: app.getPath('exe')
})

const store = new Store({ name: 'app-data' })

let iconsDir = ''
let tempDir = ''

export function getAppDataPath(): string {
  // No Electron, app.getPath('userData') retorna o caminho correto
  // Exemplo Windows: C:\Users\[usuario]\AppData\Roaming\[appName]
  return app.getPath('userData')
}

// ── Register all IPC handlers
// Must be called inside app.whenReady() — app.getPath() is only valid then.

export function registerIpcHandlers(
  getWindow: () => BrowserWindow | null,
  hideWindow: () => void,
  quitApp: () => void
): void {
  // Resolve paths now that app is ready
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

  // ── EXE info: icon + product name

  ipcMain.handle('exe:getInfo', async (_e, exePath: string) => {
    if (!fs.existsSync(exePath)) return null
    const [iconDataUrl, productName] = await Promise.all([extractIcon(exePath), readProductName(exePath)])
    return {
      name: productName || path.basename(exePath, '.exe'),
      iconDataUrl
    }
  })

  // Load cached icon for an already-saved entry (does not re-extract)
  ipcMain.handle('exe:getIcon', (_e, exePath: string): string | null => {
    return getCachedIcon(exePath)
  })

  // Delete cached icon so next exe:getInfo call re-extracts it at full quality
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

  // Auto launch handlers
  ipcMain.handle(IPC_CHANNELS.SET_AUTO_LAUNCH, async (_, enabled: boolean) => {
    try {
      if (enabled) {
        await autoLauncher.enable()
      } else {
        await autoLauncher.disable()
      }

      store.set('autoLaunch', enabled)
      return { success: true, data: enabled }
    } catch (error) {
      console.error('Erro ao configurar auto launch:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_AUTO_LAUNCH_STATUS, async () => {
    try {
      const isEnabled = await autoLauncher.isEnabled()
      return { enabled: isEnabled }
    } catch (error) {
      console.error('Erro ao verificar auto launch:', error)
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

  ipcMain.handle('app:delete', (_e, exePath: string): boolean => {
    try {
      const p = iconFilePath(exePath)
      if (p && fs.existsSync(p)) fs.unlinkSync(p)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.SHOW_NOTIFICATION,
    (_, { title, body, silent = false, icon }: { title: string; body: string; silent?: boolean; icon?: string }) => {
      try {
        const notificationOptions: Electron.NotificationConstructorOptions = {
          title,
          body,
          silent
        }

        if (icon) {
          notificationOptions.icon = icon
        } else {
          const defaultIcon = path.join(__dirname, '../../resources/icon.png')
          if (fs.existsSync(defaultIcon)) {
            notificationOptions.icon = defaultIcon
          }
        }

        const notification = new Notification(notificationOptions)
        notification.show()
        return { success: true }
      } catch (error) {
        console.error('Erro ao mostrar notificação:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // Settings handlers
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_, settings: Record<string, unknown>) => {
    try {
      Object.keys(settings).forEach((key) => {
        store.set(key, settings[key])
      })
      return { success: true }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.LOAD_SETTINGS, () => {
    try {
      return store.store
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      return {}
    }
  })

  ipcMain.handle('open-app-data-folder', async () => {
    try {
      const appDataPath = getAppDataPath()
      await shell.openPath(appDataPath)
      return { success: true, path: appDataPath }
    } catch (error) {
      console.error('Erro ao abrir pasta:', error)
      return { success: false, error: error }
    }
  })

  // Handler para obter o caminho da pasta de dados
  ipcMain.handle('get-app-data-path', () => {
    return getAppDataPath()
  })

  // Opcional: Handler para listar arquivos
  ipcMain.handle('list-app-data-files', async () => {
    try {
      const appDataPath = getAppDataPath()
      const files = await readdir(appDataPath)
      return files
    } catch (error) {
      console.error('Erro ao listar arquivos:', error)
      return []
    }
  })
}
