import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../constants/ipc-channels'
import { LogFilter } from '../../types/log'
import { mainLogger } from '../logge/logger'

export function setupLogHandlers(): void {
  // Get logs with filters
  ipcMain.handle(IPC_CHANNELS.GET_LOGS, async (_event, filters: LogFilter) => {
    return mainLogger.getLogs(filters)
  })

  // Clear all logs
  ipcMain.handle(IPC_CHANNELS.CLEAR_LOGS, async () => {
    mainLogger.clearLogs()
    return { success: true }
  })

  // Export logs
  ipcMain.handle(IPC_CHANNELS.EXPORT_LOGS, async () => {
    return mainLogger.exportLogs()
  })
}
