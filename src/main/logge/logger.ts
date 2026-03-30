import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import { LogEntry, LogLevel, LogPayload, LogSource } from '../../types/log'
import { FileTransport } from './transports/file-transport'
import { IpcTransport } from './transports/ipc-transport'

class Logger extends EventEmitter {
  private static instance: Logger
  private transports: Array<FileTransport | IpcTransport>
  private logs: LogEntry[] = []
  private maxLogs: number = 10000
  private logTimestamps: number[] = []

  private constructor() {
    super()
    this.transports = []
    this.setupTransports()
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private setupTransports(): void {
    // File transport for persisting logs
    const fileTransport = new FileTransport()
    this.transports.push(fileTransport)

    // IPC transport for sending logs to renderer
    const ipcTransport = new IpcTransport()
    this.transports.push(ipcTransport)
  }

  private formatLog(payload: LogPayload): LogEntry {
    return {
      id: payload.id || randomUUID(),
      level: payload.level,
      message: payload.message,
      source: payload.source,
      tag: payload.tag,
      timestamp: payload.timestamp instanceof Date ? payload.timestamp : new Date(payload.timestamp || Date.now()),
      pid: payload.pid || process.pid,
      sessionId: payload.sessionId,
      meta: payload.meta,
      stackTrace: payload.stackTrace
    }
  }

  private addToMemory(log: LogEntry): void {
    this.logs.unshift(log) // Add to beginning (newest first)

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs.pop()
    }

    // Track timestamps for error rate calculation
    if (log.level === 'error' || log.level === 'fatal') {
      this.logTimestamps.unshift(Date.now())
      // Keep last 5 minutes of error timestamps
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      this.logTimestamps = this.logTimestamps.filter((ts) => ts > fiveMinutesAgo)
    }
  }

  async log(payload: LogPayload): Promise<void> {
    const formattedLog = this.formatLog(payload)

    // Add to memory
    this.addToMemory(formattedLog)

    // Send to all transports
    await Promise.all(
      this.transports.map((transport) =>
        transport.send(formattedLog).catch((err) => {
          console.error(`Failed to send log to transport ${transport.constructor.name}:`, err)
        })
      )
    )

    // Emit event for real-time listeners
    this.emit('log', formattedLog)
  }

  // Convenience methods
  debug(message: string, source: LogSource, meta?: Record<string, unknown>, tag?: string): void {
    this.log({ level: 'debug', message, source, meta, tag })
  }

  info(message: string, source: LogSource, meta?: Record<string, unknown>, tag?: string): void {
    this.log({ level: 'info', message, source, meta, tag })
  }

  warn(message: string, source: LogSource, meta?: Record<string, unknown>, tag?: string): void {
    this.log({ level: 'warn', message, source, meta, tag })
  }

  error(message: string, source: LogSource, error?: Error, meta?: Record<string, unknown>, tag?: string): void {
    this.log({
      level: 'error',
      message,
      source,
      meta: {
        ...meta,
        errorMessage: error?.message,
        errorStack: error?.stack
      },
      tag,
      stackTrace: error?.stack
    })
  }

  fatal(message: string, source: LogSource, error?: Error, meta?: Record<string, unknown>, tag?: string): void {
    this.log({
      level: 'fatal',
      message,
      source,
      meta: {
        ...meta,
        errorMessage: error?.message,
        errorStack: error?.stack
      },
      tag,
      stackTrace: error?.stack
    })
  }

  getLogs(filters?: { levels?: LogLevel[]; sources?: LogSource[]; search?: string; tags?: string[] }): LogEntry[] {
    let filtered = [...this.logs]

    if (filters) {
      if (filters.levels && filters.levels.length > 0) {
        filtered = filtered.filter((log) => filters.levels!.includes(log.level))
      }
      if (filters.sources && filters.sources.length > 0) {
        filtered = filtered.filter((log) => filters.sources!.includes(log.source))
      }
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(
          (log) => log.message.toLowerCase().includes(searchLower) || log.tag?.toLowerCase().includes(searchLower)
        )
      }
      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter((log) => log.tag && filters.tags!.includes(log.tag))
      }
    }

    return filtered
  }

  getStats(): {
    total: number
    byLevel: Record<LogLevel, number>
    bySource: Record<LogSource, number>
    errorsPerMinute: number
  } {
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0
    }

    const bySource: Record<LogSource, number> = {
      main: 0,
      renderer: 0,
      preload: 0,
      electron: 0,
      'react-native': 0
    }

    this.logs.forEach((log) => {
      byLevel[log.level]++
      bySource[log.source]++
    })

    // Calculate errors per minute (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const recentErrors = this.logTimestamps.filter((ts) => ts > fiveMinutesAgo).length
    const errorsPerMinute = recentErrors / 5

    return {
      total: this.logs.length,
      byLevel,
      bySource,
      errorsPerMinute: Math.round(errorsPerMinute * 10) / 10
    }
  }

  getUniqueTags(): string[] {
    const tags = new Set<string>()
    this.logs.forEach((log) => {
      if (log.tag) tags.add(log.tag)
    })
    return Array.from(tags).sort()
  }

  clearLogs(): void {
    this.logs = []
    this.logTimestamps = []
    this.emit('logs-cleared')
  }

  async exportLogs(): Promise<string> {
    const data = this.logs
      .map(
        (log) =>
          `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${log.tag ? ` [${log.tag}]` : ''}`
      )
      .join('\n')

    return data
  }
}

export const mainLogger = Logger.getInstance()
