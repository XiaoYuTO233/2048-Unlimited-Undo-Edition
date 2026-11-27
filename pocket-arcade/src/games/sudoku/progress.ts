import type { GameStorage, JsonValue } from '../../services/storage'

function bestTimeKey(levelId: number) {
  return `best-time:${levelId}`
}

export function getBestTime(storage: GameStorage, levelId: number) {
  const value = storage.getSetting<JsonValue>(bestTimeKey(levelId), null)
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function completeSudokuLevel(storage: GameStorage, levelId: number, elapsedMs: number) {
  const previous = getBestTime(storage, levelId)
  const best = previous === null ? elapsedMs : Math.min(previous, elapsedMs)
  if (best !== previous) storage.setSetting(bestTimeKey(levelId), best)
  storage.completeLevel(levelId)
  return best
}

export function formatSudokuTime(elapsedMs: number) {
  const seconds = Math.floor(elapsedMs / 1000)
  const minutesText = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secondsText = String(seconds % 60).padStart(2, '0')
  return `${minutesText}:${secondsText}`
}
