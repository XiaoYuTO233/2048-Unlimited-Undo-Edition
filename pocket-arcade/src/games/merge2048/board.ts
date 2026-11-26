import type { GameProps } from '../types'
import type { GameStorage, JsonValue } from '../../services/storage'

export const BOARD_SIZE = 4

const padding = 3
const gap = 3
const tileStep = (100 - padding * 2 + gap) / BOARD_SIZE
const slideTime = 120
const target = 2048
const saveKey = 'round'

type Direction = 'up' | 'down' | 'left' | 'right'

const vectors: Record<Direction, readonly [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
}

const keyDirections = new Map<string, Direction>([
  ['arrowup', 'up'], ['w', 'up'],
  ['arrowdown', 'down'], ['s', 'down'],
  ['arrowleft', 'left'], ['a', 'left'],
  ['arrowright', 'right'], ['d', 'right'],
])

interface Tile {
  value: number
  element: HTMLDivElement
}

type Grid = (Tile | null)[][]

type Round = {
  score: number
  won: boolean
  keepPlaying: boolean
  over: boolean
}

type Snapshot = {
  grid: number[][]
  round: Round
}

export interface BoardView {
  score: number
  best: number
  undoCount: number
  phase: 'playing' | 'won' | 'over'
  gained: number
  moves: number
}

interface BoardOptions {
  board: HTMLDivElement
  tileLayer: HTMLDivElement
  storage: GameStorage
  playSound: GameProps['playSound']
  onChange: (view: BoardView) => void
}

interface Slide {
  tile: Tile
  row: number
  column: number
}

interface Move {
  slides: Slide[]
  absorbed: Slide[]
  merged: Set<Tile>
  gained: number
}

interface PendingAnimation {
  timer: number
  absorbed: Slide[]
  merged: Set<Tile>
  spawned: Tile
}

interface Drag {
  id: number
  x: number
  y: number
  moved: boolean
}

export function tilePosition(row: number, column: number) {
  return {
    top: `${padding + row * tileStep}%`,
    left: `${padding + column * tileStep}%`,
    width: `${tileStep - gap}%`,
    height: `${tileStep - gap}%`,
  }
}

function isInside(row: number, column: number) {
  return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE
}

function emptyGrid(): Grid {
  return Array.from({ length: BOARD_SIZE }, () => Array<Tile | null>(BOARD_SIZE).fill(null))
}

function isTileValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) &&
    (value === 0 || (value >= 2 && Number.isInteger(Math.log2(value))))
}

function isSnapshot(value: JsonValue | undefined): value is Snapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const { grid, round } = value
  if (!Array.isArray(grid) || grid.length !== BOARD_SIZE) return false
  if (!grid.every((row): row is number[] => (
    Array.isArray(row) && row.length === BOARD_SIZE && row.every(isTileValue)
  ))) return false
  if (!grid.some((row) => row.some((tile) => tile > 0))) return false

  if (!round || typeof round !== 'object' || Array.isArray(round)) return false
  return typeof round.score === 'number' && Number.isSafeInteger(round.score) && round.score >= 0 &&
    typeof round.won === 'boolean' && typeof round.keepPlaying === 'boolean' && typeof round.over === 'boolean'
}

function readSavedRound(storage: GameStorage) {
  const saved = storage.getSetting<JsonValue>(saveKey, null)
  if (!saved || typeof saved !== 'object' || Array.isArray(saved) || saved.version !== 1) return
  if (!isSnapshot(saved.current)) return

  const history = Array.isArray(saved.history) && saved.history.every(isSnapshot) ? saved.history : []
  return { current: saved.current, history }
}

export function clearSaved2048(storage: GameStorage) {
  storage.setSetting(saveKey, null)
}

function readBest(storage: GameStorage) {
  try {
    const previousBest = Number(window.localStorage.getItem('game2048.best'))
    if (Number.isSafeInteger(previousBest) && previousBest > 0) {
      return storage.saveHighScore(previousBest)
    }
  } catch {
    // The host storage service can still serve scores when WebView storage is unavailable.
  }
  return storage.getHighScore()
}

function displayValue(tile: Tile) {
  const value = String(tile.value)
  tile.element.textContent = value
  tile.element.dataset.value = tile.value <= target ? value : 'super'
  tile.element.dataset.digits = String(Math.min(value.length, 5))
}

function resolveMove(grid: Grid, direction: Direction): Move {
  const result: Move = { slides: [], absorbed: [], merged: new Set(), gained: 0 }
  const [rowStep, columnStep] = vectors[direction]

  // Start at the edge the tiles are moving toward, as in the standalone game.
  for (let rowIndex = 0; rowIndex < BOARD_SIZE; rowIndex += 1) {
    const row = rowStep > 0 ? BOARD_SIZE - 1 - rowIndex : rowIndex
    for (let columnIndex = 0; columnIndex < BOARD_SIZE; columnIndex += 1) {
      const column = columnStep > 0 ? BOARD_SIZE - 1 - columnIndex : columnIndex
      const tile = grid[row][column]
      if (!tile) continue

      let freeRow = row
      let freeColumn = column
      let nextRow = row + rowStep
      let nextColumn = column + columnStep
      while (isInside(nextRow, nextColumn) && !grid[nextRow][nextColumn]) {
        freeRow = nextRow
        freeColumn = nextColumn
        nextRow += rowStep
        nextColumn += columnStep
      }

      const next = isInside(nextRow, nextColumn) ? grid[nextRow][nextColumn] : null
      if (next && next.value === tile.value && !result.merged.has(next)) {
        next.value *= 2
        result.gained += next.value
        result.merged.add(next)
        result.absorbed.push({ tile, row: nextRow, column: nextColumn })
        grid[row][column] = null
      } else if (freeRow !== row || freeColumn !== column) {
        grid[row][column] = null
        grid[freeRow][freeColumn] = tile
        result.slides.push({ tile, row: freeRow, column: freeColumn })
      }
    }
  }

  return result
}

function hasMoves(grid: Grid) {
  return grid.some((row, r) => row.some((tile, c) => (
    !tile || row[c + 1]?.value === tile.value || grid[r + 1]?.[c]?.value === tile.value
  )))
}

function directionForDrag(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

export function mount2048({ board, tileLayer, storage, playSound, onChange }: BoardOptions) {
  const listeners = new AbortController()
  const options = { signal: listeners.signal }
  const saved = readSavedRound(storage)
  const history: Snapshot[] = saved?.history ?? []
  let grid = emptyGrid()
  let round: Round = { score: 0, won: false, keepPlaying: false, over: false }
  let best = readBest(storage)
  let moves = 0
  let drag: Drag | null = null
  let pending: PendingAnimation | undefined

  function snapshot(): Snapshot {
    return {
      grid: grid.map((row) => row.map((tile) => tile?.value ?? 0)),
      round: { ...round },
    }
  }

  function saveRound() {
    storage.setSetting(saveKey, { version: 1, current: snapshot(), history })
  }

  function publish(gained = 0) {
    onChange({
      score: round.score,
      best,
      undoCount: history.length,
      phase: round.over ? 'over' : round.won && !round.keepPlaying ? 'won' : 'playing',
      gained,
      moves,
    })
  }

  function createTile(value: number, row: number, column: number, animation: 'spawn' | 'restore') {
    const element = document.createElement('div')
    const tile = { value, element }
    element.className = 'merge-tile'
    element.dataset.animation = animation
    displayValue(tile)
    Object.assign(element.style, tilePosition(row, column))
    tileLayer.append(element)
    return tile
  }

  function restoreRound(savedRound: Snapshot) {
    tileLayer.replaceChildren()
    grid = savedRound.grid.map((row, r) => (
      row.map((value, c) => value ? createTile(value, r, c, 'restore') : null)
    ))
    round = { ...savedRound.round }
  }

  function spawnTile() {
    const spaces = grid.flatMap((row, r) => row.flatMap((tile, c) => tile ? [] : [[r, c] as const]))
    const [row, column] = spaces[Math.floor(Math.random() * spaces.length)]
    const tile = createTile(Math.random() < 0.9 ? 2 : 4, row, column, 'spawn')
    grid[row][column] = tile
    return tile
  }

  function settle(interrupted: boolean) {
    if (!pending) return
    window.clearTimeout(pending.timer)
    for (const { tile } of pending.absorbed) tile.element.remove()
    for (const tile of pending.merged) {
      displayValue(tile)
      delete tile.element.dataset.animation
      void tile.element.offsetWidth
      tile.element.dataset.animation = 'merge'
    }
    if (interrupted) delete pending.spawned.element.dataset.animation
    pending = undefined
  }

  function playable() {
    return !round.over && (!round.won || round.keepPlaying)
  }

  function move(direction: Direction) {
    if (!playable()) return

    settle(true)
    const previous = snapshot()
    const { slides, absorbed, merged, gained } = resolveMove(grid, direction)
    if (!slides.length && !absorbed.length) return

    history.push(previous)
    moves += 1
    round.score += gained
    if (round.score > best) best = storage.saveHighScore(round.score)

    for (const { tile, row, column } of slides) {
      Object.assign(tile.element.style, tilePosition(row, column))
    }
    for (const { tile, row, column } of absorbed) {
      tile.element.style.zIndex = '1'
      Object.assign(tile.element.style, tilePosition(row, column))
    }

    const spawned = spawnTile()
    if (!round.won && [...merged].some((tile) => tile.value >= target)) round.won = true
    round.over = !hasMoves(grid)
    saveRound()
    pending = {
      timer: window.setTimeout(() => settle(false), slideTime),
      absorbed,
      merged,
      spawned,
    }
    publish(gained)
    playSound(gained ? 'merge' : 'click')
  }

  function undo() {
    const previous = history.pop()
    if (!previous) return

    settle(true)
    restoreRound(previous)
    saveRound()
    publish()
    playSound('click')
  }

  function continueGame() {
    if (!round.won || round.keepPlaying || round.over) return
    round.keepPlaying = true
    saveRound()
    publish()
    playSound('click')
  }

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase()
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && key === 'z') {
      event.preventDefault()
      undo()
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const direction = keyDirections.get(key)
    if (!direction) return
    event.preventDefault()
    move(direction)
  }, options)

  board.addEventListener('pointerdown', (event) => {
    if (!playable() || !event.isPrimary || event.button !== 0) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
    board.setPointerCapture(event.pointerId)
  }, options)

  board.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId || drag.moved) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 26) return
    drag.moved = true
    move(directionForDrag(dx, dy))
  }, options)

  board.addEventListener('pointerup', (event) => {
    if (!drag || drag.id !== event.pointerId) return
    const { x, y, moved } = drag
    drag = null
    const dx = event.clientX - x
    const dy = event.clientY - y
    if (!moved && Math.max(Math.abs(dx), Math.abs(dy)) >= 14) move(directionForDrag(dx, dy))
  }, options)

  board.addEventListener('lostpointercapture', (event) => {
    if (drag?.id === event.pointerId) drag = null
  }, options)

  if (saved) {
    restoreRound(saved.current)
  } else {
    spawnTile()
    spawnTile()
    saveRound()
  }
  publish()

  return {
    undo,
    continueGame,
    dispose() {
      listeners.abort()
      if (pending) window.clearTimeout(pending.timer)
      tileLayer.replaceChildren()
    },
  }
}
