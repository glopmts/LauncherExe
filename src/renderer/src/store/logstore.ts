import { create } from 'zustand'
import { LogEntry, LogFilter, LogStats } from '../../../types/log'

interface LogStore {
  entries: LogEntry[]
  stats: LogStats
  tags: string[]
  isPaused: boolean
  filters: LogFilter
  setEntries: (entries: LogEntry[]) => void
  addEntry: (entry: LogEntry) => void
  setFilter: (filter: Partial<LogFilter>) => void
  clearLogs: () => void
  togglePause: () => void
  calculateStats: () => LogStats
  extractTags: () => string[]
}

export const useLogStore = create<LogStore>((set, get) => ({
  entries: [],
  stats: {
    total: 0,
    byLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
    bySource: { main: 0, renderer: 0, preload: 0, electron: 0, 'react-native': 0 },
    errorsPerMinute: 0
  },
  tags: [],
  isPaused: false,
  filters: {
    levels: ['debug', 'info', 'warn', 'error', 'fatal'],
    sources: ['main', 'renderer', 'preload', 'electron', 'react-native'],
    search: '',
    tags: []
  },

  setEntries: (entries) => {
    set({ entries })
    const stats = get().calculateStats()
    const tags = get().extractTags()
    set({ stats, tags })
  },

  addEntry: (entry) => {
    const { isPaused, entries, filters } = get()

    if (isPaused) return

    // Apply filters before adding
    const shouldAdd =
      (filters.levels.length === 0 || filters.levels.includes(entry.level)) &&
      (filters.sources.length === 0 || filters.sources.includes(entry.source)) &&
      (filters.search === '' ||
        entry.message.toLowerCase().includes(filters.search.toLowerCase()) ||
        entry.tag?.toLowerCase().includes(filters.search.toLowerCase())) &&
      (filters.tags.length === 0 || (entry.tag && filters.tags.includes(entry.tag)))

    if (shouldAdd) {
      const newEntries = [entry, ...entries].slice(0, 10000)
      set({ entries: newEntries })

      // Update stats
      const stats = get().calculateStats()
      const tags = get().extractTags()
      set({ stats, tags })
    }
  },

  setFilter: (filter) => {
    set((state) => ({
      filters: { ...state.filters, ...filter }
    }))

    // Re-filter existing logs
    const { entries, filters } = get()
    const filteredEntries = entries.filter((entry) => {
      return (
        (filters.levels.length === 0 || filters.levels.includes(entry.level)) &&
        (filters.sources.length === 0 || filters.sources.includes(entry.source)) &&
        (filters.search === '' ||
          entry.message.toLowerCase().includes(filters.search.toLowerCase()) ||
          entry.tag?.toLowerCase().includes(filters.search.toLowerCase())) &&
        (filters.tags.length === 0 || (entry.tag && filters.tags.includes(entry.tag)))
      )
    })

    set({ entries: filteredEntries })
    const stats = get().calculateStats()
    const tags = get().extractTags()
    set({ stats, tags })
  },

  clearLogs: async () => {
    if (window.electronAPI) {
      await window.electronAPI.clearLogs()
    }
    set({
      entries: [],
      stats: {
        total: 0,
        byLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
        bySource: { main: 0, renderer: 0, preload: 0, electron: 0, 'react-native': 0 },
        errorsPerMinute: 0
      },
      tags: []
    })
  },

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  calculateStats: () => {
    const { entries } = get()
    const byLevel: LogStats['byLevel'] = { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 }
    const bySource: LogStats['bySource'] = { main: 0, renderer: 0, preload: 0, electron: 0, 'react-native': 0 }

    let errorCount = 0
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

    entries.forEach((entry) => {
      byLevel[entry.level]++
      bySource[entry.source]++

      if (entry.level === 'error' || entry.level === 'fatal') {
        const entryTime = new Date(entry.timestamp).getTime()
        if (entryTime > fiveMinutesAgo) {
          errorCount++
        }
      }
    })

    return {
      total: entries.length,
      byLevel,
      bySource,
      errorsPerMinute: Math.round((errorCount / 5) * 10) / 10
    }
  },

  extractTags: () => {
    const { entries } = get()
    const tags = new Set<string>()
    entries.forEach((entry) => {
      if (entry.tag) tags.add(entry.tag)
    })
    return Array.from(tags).sort()
  }
}))
