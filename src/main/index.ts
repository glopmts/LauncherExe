import { is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { setupLogHandlers } from './ipc/log-handlers'
import { mainLogger } from './logge/logger'
import { registerIpcHandlers } from './modules/ipcHandlers'
import { buildTray, showBalloon } from './modules/tray'
import { initAutoUpdater } from './updater'

const iconPath = join(__dirname, '../../resources/icon.ico')

let mainWindow: BrowserWindow | null = null
let isQuitting = false
let windowState: 'focused' | 'background' | 'hidden' = 'focused'

autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'glopmts',
  repo: 'launcherexe'
})

app.commandLine.appendSwitch('disable-gpu-vsync')
app.commandLine.appendSwitch('disable-gpu-compositing')

/* Define o App User Model ID antes do whenReady para garantir que
   notificações e ícone da taskbar usem o ID correto no Windows */
app.setAppUserModelId('com.launcherexe.glop')

const FPS = { focused: 60, background: 15, hidden: 1 } as const

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    icon: iconPath,
    ...(process.platform === 'linux' ? { iconPath } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      backgroundThrottling: true,
      offscreen: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => win.show())

  win.on('focus', () => setPerformanceMode(win, 'focused'))
  win.on('blur', () => setPerformanceMode(win, 'background'))
  win.on('minimize', () => setPerformanceMode(win, 'background'))
  win.on('hide', () => setPerformanceMode(win, 'hidden'))
  win.on('restore', () => setPerformanceMode(win, 'focused'))
  win.on('show', () => setPerformanceMode(win, 'focused'))

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win.hide()
      showBalloon('Game Launcher', 'Rodando em segundo plano. Clique no ícone da bandeja para restaurar.')
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

function setPerformanceMode(win: BrowserWindow, mode: typeof windowState): void {
  if (windowState === mode) return
  windowState = mode

  win.webContents.setFrameRate(FPS[mode])
  win.webContents.send('performance-mode', mode)

  if (mode !== 'focused') {
    win.webContents
      .executeJavaScript(
        `
      window.__performanceMode = ${JSON.stringify(mode)};
      document.body.classList.remove('perf-background', 'perf-hidden');
      document.body.classList.add('perf-${mode}');
      window.__pauseNonEssentialConnections?.();
    `
      )
      .catch(() => {})
  } else {
    win.webContents
      .executeJavaScript(
        `
      window.__performanceMode = 'focused';
      document.body.classList.remove('perf-background', 'perf-hidden');
      window.__resumeConnections?.();
    `
      )
      .catch(() => {})
  }
}

function getWindow(): BrowserWindow | null {
  return mainWindow
}

function showWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function hideWindow(): void {
  mainWindow?.hide()
}

function quit(): void {
  isQuitting = true
  app.quit()
}

function scheduleBackgroundMaintenance(): void {
  /* GC periódico apenas quando a janela não está em foco */
  setInterval(() => {
    if (windowState !== 'focused' && global.gc) {
      global.gc()
    }
  }, 60_000)

  /* Limpa cache somente quando a janela está oculta */
  setInterval(() => {
    if (windowState === 'hidden') {
      mainWindow?.webContents.session.clearCache().catch(() => {})
    }
  }, 300_000)
}

app.whenReady().then(() => {
  /* electronApp.setAppUserModelId removido daqui pois sobrescrevia
     o ID definido acima e causava identificação errada no Windows */
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  optimizer.watchWindowShortcuts

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)

    window.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      const isAnalytics = details.url.includes('analytics') || details.url.includes('telemetry')
      callback({ cancel: windowState !== 'focused' && isAnalytics })
    })
  })

  mainWindow = createWindow()

  buildTray(showWindow, quit)
  registerIpcHandlers(getWindow, hideWindow, quit, showWindow)
  initAutoUpdater(mainWindow)
  scheduleBackgroundMaintenance()
  setupLogHandlers()

  mainLogger.info('Application started', 'main')

  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3_000)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    } else {
      showWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})
