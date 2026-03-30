import type { AppEntry, ExeInfo, IPCResult, Settings } from '../main/types/types'

export interface ElectronAPI {
  // Window controls
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  quit: () => Promise<void>

  // Dialogs
  openExeDialog: () => Promise<string | null>
  openImageDialog: () => Promise<string | null>

  // EXE info
  getExeInfo: (exePath: string) => Promise<ExeInfo | null>
  getExeIcon: (exePath: string) => Promise<string | null>
  clearIconCache: (exePath: string) => Promise<boolean>

  // App actions
  launch: (exePath: string) => Promise<{ success: boolean; error?: string }>
  openFolder: (exePath: string) => Promise<void>
  fileExists: (filePath: string) => Promise<boolean>
  deleteApp: (exePath: string) => Promise<boolean>

  // Store
  getApps: () => Promise<AppEntry[]>
  saveApps: (data: AppEntry[]) => Promise<boolean>
  getApp: () => Promise<AppEntry[]>

  // Auto launch
  setAutoLaunch: (enabled: boolean) => Promise<{ success: boolean }>
  getAutoLaunchStatus: () => Promise<{ enabled: boolean }>

  // Notifications
  showNotification: (options: { title: string; body: string; silent?: boolean; icon?: string }) => Promise<IPCResult>

  // Settings
  saveSettings: (settings: Settings) => Promise<IPCResult>
  loadSettings: () => Promise<Settings>

  // Funções para acessar a pasta de dados
  openAppDataFolder: () => Promise<{ success: boolean; path?: string; error?: string }>
  getAppDataPath: () => Promise<string>

  onPerformanceMode: (callback: (mode: 'focused' | 'background' | 'hidden') => void) => void
  getSettings: () => Promise<Settings>

  //Update app
  onChecking: (callback: () => void) => void
  onAvailable: (callback: (info: UpdateInfo) => void) => void
  onNotAvailable: (callback: () => void) => void
  onProgress: (callback: (progress: DownloadProgress) => void) => void
  onDownloaded: (callback: () => void) => void
  onError: (callback: (error: string) => void) => void
  check: () => Promise<void>
  download: () => Promise<void>
  install: () => Promise<void>

  //logs
  onLog: (callback: (log: LogEntry) => void) => void
  getLogs: (filters: LogFilter) => Promise<LogEntry[]>
  clearLogs: () => Promise<{ success: boolean }>
  exportLogs: () => Promise<string>
  log: (payload: LogPayload) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
