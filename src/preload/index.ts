import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../constants/ipc-channels'
import { Settings } from '../main/types/ipc-types'
import type { AppEntry } from '../main/types/types'

// ── Type-safe invoke helper
const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args)

// ── Expose API to renderer (window.electronAPI)
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => invoke<void>('window:minimize'),
  maximize: () => invoke<void>('window:maximize'),
  close: () => invoke<void>('window:close'),
  quit: () => invoke<void>('window:quit'),

  // Dialogs
  openExeDialog: () => invoke<string | null>('dialog:openExe'),
  openImageDialog: () => invoke<string | null>('dialog:openImage'),

  // EXE info
  getExeInfo: (exePath: string) => invoke('exe:getInfo', exePath),
  getExeIcon: (exePath: string) => invoke<string | null>('exe:getIcon', exePath),
  clearIconCache: (exePath: string) => invoke<boolean>('exe:clearIconCache', exePath),

  // App actions
  launch: (exePath: string) => invoke<{ success: boolean; error?: string }>('app:launch', exePath),
  openFolder: (exePath: string) => invoke<void>('app:openFolder', exePath),
  fileExists: (filePath: string) => invoke<boolean>('fs:fileExists', filePath),
  deleteApp: (exePath: string) => invoke<boolean>('app:delete', exePath),

  // Store
  getApps: () => invoke<AppEntry[]>('store:get'),
  getApp: () => invoke<AppEntry[]>('store:get'),
  saveApps: (data: AppEntry[]) => invoke<boolean>('store:set', data),

  // Auto launch
  setAutoLaunch: (enabled: boolean) => invoke<{ success: boolean }>(IPC_CHANNELS.SET_AUTO_LAUNCH, enabled),
  getAutoLaunchStatus: () => invoke<{ enabled: boolean }>(IPC_CHANNELS.GET_AUTO_LAUNCH_STATUS),

  // Notifications
  showNotification: (options: { title: string; body: string; silent?: boolean; icon?: string }) =>
    invoke(IPC_CHANNELS.SHOW_NOTIFICATION, options),

  // Settings
  saveSettings: (settings: Settings) => invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),
  loadSettings: () => invoke<Settings>(IPC_CHANNELS.LOAD_SETTINGS),

  // Funções para acessar a pasta de dados
  openAppDataFolder: () => ipcRenderer.invoke('open-app-data-folder'),
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),

  onPerformanceMode: (callback: (mode: 'focused' | 'background' | 'hidden') => void) => {
    ipcRenderer.on('performance-mode', (_, mode) => callback(mode))
  },

  // Permitir controle de timers
  registerTimer: (id: string, interval: number) => {
    ipcRenderer.send('register-timer', { id, interval })
  },

  //Updater app

  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),

  onChecking: (cb: () => void) => ipcRenderer.on('update:checking', cb),
  onAvailable: (cb: (info: unknown) => void) => ipcRenderer.on('update:available', (_e, info) => cb(info)),
  onNotAvailable: (cb: () => void) => ipcRenderer.on('update:not-available', cb),
  onProgress: (cb: (p: unknown) => void) => ipcRenderer.on('update:progress', (_e, p) => cb(p)),
  onDownloaded: (cb: () => void) => ipcRenderer.on('update:downloaded', cb),
  onError: (cb: (msg: string) => void) => ipcRenderer.on('update:error', (_e, msg) => cb(msg))
})

document.addEventListener('visibilitychange', () => {
  ipcRenderer.send('visibility-changed', document.hidden)
})
