import { Blocks, Grid2X2, Grid3X3, Route } from 'lucide-react'
import mergeArtwork from '../assets/merge.png'
import snakeArtwork from '../assets/snake.png'
import blocksArtwork from '../assets/blocks.png'
import sudokuArtwork from '../assets/sudoku.png'
import { FallingBlocks } from './FallingBlocks'
import { Merge2048 } from './Merge2048'
import { Snake } from './Snake'
import { Sudoku } from './Sudoku'
import type { GameModule } from './types'

export const gameRegistry: readonly GameModule[] = [
  { id: '2048', title: '2048', description: '合并数字方块，挑战更高分', icon: Grid2X2, component: Merge2048, hasLevels: false, category: '数字益智', color: 'amber', artwork: mergeArtwork },
  { id: 'snake', title: '贪吃蛇', description: '收集食物，让小蛇不断变长', icon: Route, component: Snake, hasLevels: false, category: '反应挑战', color: 'green', artwork: snakeArtwork },
  { id: 'blocks', title: '俄罗斯方块', description: '摆放下落方块，填满整行', icon: Blocks, component: FallingBlocks, hasLevels: false, category: '方块消除', color: 'blue', artwork: blocksArtwork },
  { id: 'sudoku', title: '数独', description: '填入缺失数字，解开九宫格', icon: Grid3X3, component: Sudoku, hasLevels: true, category: '逻辑推理', color: 'purple', artwork: sudokuArtwork },
]
