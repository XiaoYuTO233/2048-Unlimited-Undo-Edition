export type Theme = 'dark' | 'light'

export interface Preferences {
  theme: Theme
  soundEnabled: boolean
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export interface GameStorage {
  getHighScore(): number
  saveHighScore(score: number): number
  getCompletedLevels(): number[]
  completeLevel(level: number): number[]
  getSetting<T extends JsonValue>(key: string, fallback: T): T
  setSetting(key: string, value: JsonValue): void
}

const prefix = 'pocket-arcade:v1'
const preferencesKey = `${prefix}:preferences`
const defaultPreferences: Preferences = { theme: 'dark', soundEnabled: true }
const temporaryValues = new Map<string, string>()

function read(key: string): unknown {
  try {
    const value = temporaryValues.get(key) ?? window.localStorage.getItem(key)
    return value == null ? undefined : JSON.parse(value)
  } catch {
    return undefined
  }
}

function write(key: string, value: JsonValue) {
  const serialized = JSON.stringify(value)

  try {
    window.localStorage.setItem(key, serialized)
    temporaryValues.delete(key)
  } catch {
    temporaryValues.set(key, serialized)
  }
}

function isLevel(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

export const StorageService = {
  getPreferences(): Preferences {
    const saved = read(preferencesKey) as Partial<Preferences> | null | undefined

    return {
      theme: saved?.theme === 'light' ? 'light' : defaultPreferences.theme,
      soundEnabled: typeof saved?.soundEnabled === 'boolean'
        ? saved.soundEnabled
        : defaultPreferences.soundEnabled,
    }
  },

  savePreferences(preferences: Preferences) {
    write(preferencesKey, { ...preferences })
  },

  forGame(gameId: string): GameStorage {
    const gameKey = `${prefix}:game:${encodeURIComponent(gameId)}`
    const scoreKey = `${gameKey}:high-score`
    const levelsKey = `${gameKey}:completed-levels`
    const settingKey = (key: string) => `${gameKey}:setting:${encodeURIComponent(key)}`

    function getHighScore() {
      const score = read(scoreKey)
      return typeof score === 'number' && Number.isFinite(score) && score >= 0 ? score : 0
    }

    function getCompletedLevels() {
      const levels = read(levelsKey)
      return Array.isArray(levels) ? [...new Set(levels.filter(isLevel))].sort((a, b) => a - b) : []
    }

    return {
      getHighScore,
      saveHighScore(score) {
        const highScore = getHighScore()
        if (!Number.isFinite(score) || score <= highScore) return highScore
        write(scoreKey, score)
        return score
      },
      getCompletedLevels,
      completeLevel(level) {
        const levels = getCompletedLevels()
        if (!isLevel(level) || levels.includes(level)) return levels
        const completed = [...levels, level].sort((a, b) => a - b)
        write(levelsKey, completed)
        return completed
      },
      getSetting<T extends JsonValue>(key: string, fallback: T): T {
        const value = read(settingKey(key))
        return value === undefined ? fallback : value as T
      },
      setSetting(key, value) {
        write(settingKey(key), value)
      },
    }
  },
}
