import type { GameStorage, JsonValue } from '../../services/storage'

const originalLockedLevelIds = [2, 3, 4, 5]
const unlockedBeforeReorderKey = 'unlocked-before-reorder'

function readUnlockedBeforeReorder(storage: GameStorage) {
  const saved = storage.getSetting<JsonValue>(unlockedBeforeReorderKey, null)
  return Array.isArray(saved) ? originalLockedLevelIds.filter((id) => saved.includes(id)) : null
}

function getOriginalUnlocks(completed: ReadonlySet<number>) {
  return originalLockedLevelIds.filter((id) => completed.has(id - 1))
}

export function getUnlockedBeforeReorder(storage: GameStorage, completed: ReadonlySet<number>) {
  return readUnlockedBeforeReorder(storage) ?? getOriginalUnlocks(completed)
}

function bestTimeKey(levelId: number) {
  return `best-time:${levelId}`
}

export function getBestTime(storage: GameStorage, levelId: number) {
  const value = storage.getSetting<JsonValue>(bestTimeKey(levelId), null)
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function completeSudokuLevel(storage: GameStorage, levelId: number, elapsedMs: number) {
  if (readUnlockedBeforeReorder(storage) === null) {
    // Preserve the old unlocks before recording any completion in the reordered list.
    const completed = new Set(storage.getCompletedLevels())
    storage.setSetting(unlockedBeforeReorderKey, getOriginalUnlocks(completed))
  }

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
