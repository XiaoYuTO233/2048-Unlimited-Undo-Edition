export const gridSize = 20
export type Direction = 'up' | 'down' | 'left' | 'right'
export type SnakeMode = 'classic' | 'wrap'

export type Cell = { x: number; y: number }

export type SnakeRound = {
  mode: SnakeMode
  body: Cell[]
  direction: Direction
  food: Cell | null
  score: number
  status: 'alive' | 'lost' | 'won'
}

export const directionVectors: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

function sameCell(left: Cell, right: Cell) {
  return left.x === right.x && left.y === right.y
}

function cellIndex({ x, y }: Cell) {
  return y * gridSize + x
}

function randomFood(body: Cell[]): Cell | null {
  const occupied = new Set(body.map(cellIndex))
  const open: Cell[] = []
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const cell = { x, y }
      if (!occupied.has(cellIndex(cell))) open.push(cell)
    }
  }

  return open.length ? open[Math.floor(Math.random() * open.length)] : null
}

export function newSnakeRound(mode: SnakeMode): SnakeRound {
  const center = Math.floor(gridSize / 2)
  const body = [0, 1, 2].map((offset) => ({ x: center - offset, y: center }))
  return { mode, body, direction: 'right', food: randomFood(body), score: 0, status: 'alive' }
}

export function moveInterval(score: number) {
  return Math.max(80, 210 - score * 8)
}

export function canTurn(from: Direction, to: Direction) {
  const previous = directionVectors[from]
  const next = directionVectors[to]
  return previous.x * next.x + previous.y * next.y === 0
}

function wrap(index: number) {
  return (index + gridSize) % gridSize
}

export function advanceSnake(round: SnakeRound, requestedDirection: Direction): SnakeRound {
  if (round.status !== 'alive') return round
  const direction = canTurn(round.direction, requestedDirection) ? requestedDirection : round.direction
  const vector = directionVectors[direction]
  const head = { x: round.body[0].x + vector.x, y: round.body[0].y + vector.y }
  const outside = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize

  if (outside && round.mode === 'classic') return { ...round, direction, status: 'lost' }
  const next = round.mode === 'wrap' ? { x: wrap(head.x), y: wrap(head.y) } : head
  const eating = round.food !== null && sameCell(next, round.food)

  // On a regular move the tail leaves its cell before the new head occupies it.
  const rest = eating ? round.body : round.body.slice(0, -1)
  if (rest.some((cell) => sameCell(cell, next))) return { ...round, direction, status: 'lost' }

  const body = [next, ...rest]
  if (!eating) return { ...round, body, direction }

  const food = randomFood(body)
  return {
    ...round,
    body,
    direction,
    food,
    score: round.score + 1,
    status: food ? 'alive' : 'won',
  }
}
