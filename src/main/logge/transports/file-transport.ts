import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { LogEntry } from '../../../types/log'

export class FileTransport {
  private logFilePath: string
  private maxFileSize: number = 10 * 1024 * 1024 // 10MB

  constructor() {
    const userDataPath = app.getPath('userData')
    const logsDir = path.join(userDataPath, 'logs')
    this.logFilePath = path.join(logsDir, 'app.log')
    this.ensureLogDirectory()
  }

  private async ensureLogDirectory(): Promise<void> {
    const dir = path.dirname(this.logFilePath)
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
    }
  }

  private async rotateLogIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFilePath)
      if (stats.size > this.maxFileSize) {
        const timestamp = Date.now()
        const backupPath = `${this.logFilePath}.${timestamp}.backup`
        await fs.rename(this.logFilePath, backupPath)
      }
    } catch (error) {
      console.log(error)
    }
  }

  async send(log: LogEntry): Promise<void> {
    try {
      await this.rotateLogIfNeeded()

      const logLine =
        JSON.stringify({
          ...log,
          timestamp: log.timestamp.toISOString()
        }) + '\n'

      await fs.appendFile(this.logFilePath, logLine, 'utf-8')
    } catch (error) {
      console.error('Failed to write log to file:', error)
    }
  }
}
