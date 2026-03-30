import { BrowserWindow } from 'electron'
import { IPC_CHANNELS, LogEntry } from '../../../types/log'

export class IpcTransport {
  async send(log: LogEntry): Promise<void> {
    const windows = BrowserWindow.getAllWindows()

    windows.forEach((window) => {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.LOG, log)
      }
    })
  }
}
