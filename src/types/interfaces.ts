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
