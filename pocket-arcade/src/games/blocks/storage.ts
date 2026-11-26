import type { GameStorage, JsonValue } from '../../services/storage'
import { boardRows, columns, fits, lockDelay, maxLockResets, pieceKinds } from './engine'
import type { BlocksRound, Cell, Piece, PieceKind } from './engine'

const roundKey = 'round'

function isRecord(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isKind(value: JsonValue | undefined): value is PieceKind {
  return pieceKinds.some((kind) => kind === value)
}

function naturalNumber(value: JsonValue | undefined): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function duration(value: JsonValue | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isPiece(value: JsonValue | undefined): value is Piece {
  return isRecord(value) && isKind(value.kind) &&
    naturalNumber(value.rotation) && value.rotation <= 3 &&
    typeof value.x === 'number' && Number.isSafeInteger(value.x) &&
    typeof value.y === 'number' && Number.isSafeInteger(value.y)
}

function isRow(value: JsonValue): value is Cell[] {
  return Array.isArray(value) && value.length === columns &&
    value.includes(null) && value.every((cell) => cell === null || isKind(cell))
}

function isRound(value: JsonValue | undefined): value is BlocksRound {
  if (!isRecord(value)) return false
  const { board, active, queue, score, lines, fallElapsed, lockElapsed, lockResets, over } = value
  return Array.isArray(board) && board.length === boardRows && board.every(isRow) &&
    isPiece(active) && Array.isArray(queue) && queue.length >= 1 && queue.length <= 7 && queue.every(isKind) &&
    naturalNumber(score) && naturalNumber(lines) &&
    duration(fallElapsed) && fallElapsed < 800 &&
    duration(lockElapsed) && lockElapsed < lockDelay &&
    naturalNumber(lockResets) && lockResets <= maxLockResets &&
    typeof over === 'boolean' && (over || fits(board, active))
}

export function readBlocksRound(storage: GameStorage) {
  const saved = storage.getSetting<JsonValue>(roundKey, null)
  return isRecord(saved) && saved.version === 1 && isRound(saved.round) ? saved.round : null
}

export function saveBlocksRound(storage: GameStorage, round: BlocksRound) {
  storage.setSetting(roundKey, { version: 1, round })
}

export function clearSavedBlocks(storage: GameStorage) {
  storage.setSetting(roundKey, null)
}
