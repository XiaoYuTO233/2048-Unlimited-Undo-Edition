import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { SoundEffect } from '../services/audio'
import type { GameStorage } from '../services/storage'

export interface GameProps {
  game: GameModule
  storage: GameStorage
  playSound: (effect: SoundEffect) => void
}

export interface GameModule {
  id: string
  title: string
  description: string
  icon: LucideIcon
  component: ComponentType<GameProps>
  hasLevels: boolean
  category: string
  artwork?: string
  color?: 'amber' | 'green' | 'blue' | 'purple'
}
