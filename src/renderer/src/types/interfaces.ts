export interface Game {
  id: string
  name: string
  path: string
  exePath: string
  icon?: string
  customIcon?: string
  lastPlayed?: Date
  playTime: number
  category?: string
  isFavorite: boolean
  size?: number
  addedAt: Date
  platform?: 'pc' | 'steam' | 'epic' | 'other'
  type?: 'game' | 'app'
  description?: string
}

export interface FileStats {
  isFile: boolean
  isDirectory: boolean
  size: number
  birthtime: Date
  mtime: Date
}

export interface AppEntry {
  id: string
  name: string
  path: string
  category: 'game' | 'app' | 'tool' | 'other'
  cover?: string
  icon?: string | null //  (não persiste no store, só em memória)
  color?: string
  lastLaunched?: string
  launchCount: number
  addedAt: string
  pinned: boolean
  tags?: string[]
}

export type Category = 'all' | 'game' | 'app' | 'tool' | 'other' | 'pinned' | 'recent'

export interface ExeInfo {
  name: string
  iconDataUrl: string | null
}
