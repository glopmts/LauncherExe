export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type LogSource = 'main' | 'renderer' | 'preload' | 'electron' | 'react-native'

export interface LogPayload {
  id?: string
  level: LogLevel
  message: string
  source: LogSource
  tag?: string
  timestamp?: Date | string
  pid?: number
  sessionId?: string
  meta?: Record<string, unknown>
  stackTrace?: string
}

export interface LogEntry extends LogPayload {
  id: string
  timestamp: Date
}

export interface LogFilter {
  levels: LogLevel[]
  sources: LogSource[]
  search: string
  tags: string[]
}

export interface LogStats {
  total: number
  byLevel: Record<LogLevel, number>
  bySource: Record<LogSource, number>
  errorsPerMinute: number
}

// IPC Channels
export const IPC_CHANNELS = {
  LOG: 'log:message',
  GET_LOGS: 'log:get-logs',
  CLEAR_LOGS: 'log:clear',
  EXPORT_LOGS: 'log:export'
} as const
