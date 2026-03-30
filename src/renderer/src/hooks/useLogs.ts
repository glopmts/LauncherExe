import { useEffect } from 'react'
import { useLogStore } from '../store/logstore'

export function useLogs() {
  const { entries, stats, tags, isPaused, filters, setEntries, addEntry, setFilter, clearLogs, togglePause } =
    useLogStore()

  // Listen for logs from main process
  useEffect(() => {
    if (window.electronAPI) {
      // Load existing logs
      window.electronAPI.getLogs(filters).then(setEntries)

      // Listen for new logs
      window.electronAPI.onLog((log) => {
        addEntry(log)
      })
    }
  }, [])

  // Update filters when they change
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getLogs(filters).then(setEntries)
    }
  }, [filters])

  return {
    entries,
    stats,
    tags,
    isPaused,
    setFilter,
    clearLogs,
    togglePause
  }
}
