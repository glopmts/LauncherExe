export interface IPCResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface AutoLaunchStatus {
  enabled: boolean
}

export interface NotificationPermission {
  granted: boolean
}

export interface FileStats {
  isFile: boolean
  isDirectory: boolean
  size: number
  birthtime: string
  mtime: string
}

export interface Settings {
  autoLaunch?: boolean
  notifications?: boolean
  privacy?: Record<string, any>
  [key: string]: any
}
