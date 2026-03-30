import { LogLevel, LogSource } from '../../../types/log'

class RendererLogger {
  private source: LogSource

  constructor(source: LogSource = 'renderer') {
    this.source = source
  }

  private async sendLog(level: LogLevel, message: string, meta?: Record<string, unknown>, tag?: string): Promise<void> {
    if (!window.electronAPI) {
      console.error('Electron API not available')
      return
    }

    try {
      await window.electronAPI.log({
        level,
        message,
        source: this.source,
        tag,
        meta,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to send log:', error)
    }
  }

  debug(message: string, meta?: Record<string, unknown>, tag?: string): void {
    this.sendLog('debug', message, meta, tag)
  }

  info(message: string, meta?: Record<string, unknown>, tag?: string): void {
    this.sendLog('info', message, meta, tag)
  }

  warn(message: string, meta?: Record<string, unknown>, tag?: string): void {
    this.sendLog('warn', message, meta, tag)
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>, tag?: string): void {
    this.sendLog(
      'error',
      message,
      {
        ...meta,
        errorMessage: error?.message,
        errorStack: error?.stack
      },
      tag
    )
  }

  fatal(message: string, error?: Error, meta?: Record<string, unknown>, tag?: string): void {
    this.sendLog(
      'fatal',
      message,
      {
        ...meta,
        errorMessage: error?.message,
        errorStack: error?.stack
      },
      tag
    )
  }
}

// Export uma instância padrão
export const logger = new RendererLogger('renderer')

// Export a classe para criar instâncias com diferentes sources
export { RendererLogger }
