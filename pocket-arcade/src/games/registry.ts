import { Blocks, Grid2X2, Grid3X3, Route } from 'lucide-react'
import mergeArtwork from '../assets/merge.png'
import snakeArtwork from '../assets/snake.png'
import blocksArtwork from '../assets/blocks.png'
import sudokuArtwork from '../assets/sudoku.png'
import { FallingBlocks } from './FallingBlocks'
import { clearSavedBlocks } from './blocks/storage'
import { Merge2048 } from './Merge2048'
import { clearSaved2048 } from './merge2048/board'
import { Snake } from './Snake'
import { Sudoku } from './Sudoku'
import type { GameModule } from './types'

export const gameRegistry: readonly GameModule[] = [
  { id: '2048', title: '2048', description: '合并数字方块，支持无限撤销', icon: Grid2X2, component: Merge2048, clearSavedRound: clearSaved2048, hasLevels: false, category: '数字益智', color: 'amber', artwork: mergeArtwork },
  { id: 'snake', title: '贪吃蛇', description: '收集食物，挑战经典与穿墙模式', icon: Route, component: Snake, hasLevels: false, category: '反应挑战', color: 'green', artwork: snakeArtwork },
  { id: 'blocks', title: '俄罗斯方块', description: '摆放下落方块，填满整行', icon: Blocks, component: FallingBlocks, clearSavedRound: clearSavedBlocks, hasLevels: false, category: '方块消除', color: 'blue', artwork: blocksArtwork },
  { id: 'sudoku', title: '数独闯关', description: '任选关卡，解开九宫格', icon: Grid3X3, component: Sudoku, hasLevels: true, category: '逻辑推理', color: 'purple', artwork: sudokuArtwork },
]
