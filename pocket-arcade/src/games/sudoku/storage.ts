import type { SudokuLevel } from '../../data/sudokuLevels'
import type { GameStorage, JsonValue } from '../../services/storage'
import { sudokuDigits } from './board'

const largestDigit = sudokuDigits.length
const notesMask = sudokuDigits.reduce((mask, digit) => mask | (1 << digit), 0)

interface PausedSudokuRound {
  values: number[]
  notes: number[]
  selected: number | null
  noteMode: boolean
  elapsedMs: number
}

function pausedRoundKey(levelId: number) {
  return `paused-round:${levelId}`
}

function isBoundedInteger(value: JsonValue | undefined, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
}

export function readPausedSudokuRound(storage: GameStorage, level: SudokuLevel): PausedSudokuRound | null {
  const saved = storage.getSetting<JsonValue>(pausedRoundKey(level.levelId), null)
  if (!saved || typeof saved !== 'object' || Array.isArray(saved) || saved.version !== 1) return null

  const { values, notes, selected, noteMode, elapsedMs } = saved
  const cellCount = level.puzzle.length
  if (!Array.isArray(values) || values.length !== cellCount || !values.every((value, cell): value is number => (
    isBoundedInteger(value, largestDigit) && (level.puzzle[cell] === '0' || value === Number(level.puzzle[cell]))
  ))) return null
  if (!Array.isArray(notes) || notes.length !== cellCount || !notes.every((mask, cell): mask is number => (
    isBoundedInteger(mask, notesMask) && (mask & ~notesMask) === 0 && (!values[cell] || mask === 0)
  ))) return null
  if (selected !== null && !isBoundedInteger(selected, cellCount - 1)) return null
  if (typeof noteMode !== 'boolean' || !isBoundedInteger(elapsedMs, Number.MAX_SAFE_INTEGER)) return null

  return { values, notes, selected, noteMode, elapsedMs }
}

export function savePausedSudokuRound(storage: GameStorage, levelId: number, round: PausedSudokuRound) {
  storage.setSetting(pausedRoundKey(levelId), { version: 1, ...round })
}

export function clearPausedSudokuRound(storage: GameStorage, levelId: number) {
  storage.setSetting(pausedRoundKey(levelId), null)
}
