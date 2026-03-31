export interface AppEntry {
  id: string
  name: string
  path: string
  category: 'game' | 'app' | 'tool' | 'other'
  cover?: string
  icon?: string | null
  color?: string
  lastLaunched?: string
  launchCount: number
  addedAt: string
  pinned: boolean
  tags?: string[]
}
