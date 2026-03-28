import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './modules/ipcHandlers'
import { buildTray, showBalloon } from './modules/tray'
import { initAutoUpdater } from './updater'

// State

let mainWindow: BrowserWindow | null = null
let isQuitting = false
let windowState: 'focused' | 'background' | 'hidden' = 'focused'

// GPU / performance flags
// Nota: disableHardwareAcceleration() e os switches
// abaixo são mutuamente exclusivos — escolha um ou outro.
// Aqui usamos os switches para controle granular.

app.commandLine.appendSwitch('disable-gpu-vsync')
app.commandLine.appendSwitch('disable-gpu-compositing')

const FPS = { focused: 60, background: 15, hidden: 1 } as const

// Window factory

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    icon,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      backgroundThrottling: true,
      offscreen: false
    }
  })

  // Carregar URL correta (dev vs prod)
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

// Performance modes

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

// Window helpers (passados para outros módulos)

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

// GC periódico (só quando em background)

function scheduleBackgroundMaintenance(): void {
  // GC a cada 60s — só executa quando a janela não está em foco
  setInterval(() => {
    if (windowState !== 'focused' && global.gc) {
      global.gc()
    }
  }, 60_000)

  // Limpa cache a cada 5min — só quando não está em uso
  setInterval(() => {
    if (windowState === 'hidden') {
      mainWindow?.webContents.session.clearCache().catch(() => {})
    }
  }, 300_000)
}

// App lifecycle

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)

    // Bloqueia analytics em background
    window.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      const isAnalytics = details.url.includes('analytics') || details.url.includes('telemetry')
      callback({ cancel: windowState !== 'focused' && isAnalytics })
    })
  })

  mainWindow = createWindow()

  buildTray(showWindow, quit)
  registerIpcHandlers(getWindow, hideWindow, quit)
  initAutoUpdater(mainWindow)
  scheduleBackgroundMaintenance()

  // Verifica updates 3s após o renderer carregar
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
