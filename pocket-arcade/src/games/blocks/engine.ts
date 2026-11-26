export const columns = 10
export const visibleRows = 20
export const hiddenRows = 2
export const boardRows = hiddenRows + visibleRows
export const lockDelay = 500
export const maxLockResets = 15
const softDropInterval = 45
const lineScores = [0, 100, 300, 500, 800]

export const pieceKinds = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as const
export type PieceKind = typeof pieceKinds[number]
export type Rotation = 0 | 1 | 2 | 3
type Offset = readonly [x: number, y: number]

export type Piece = {
  kind: PieceKind
  rotation: Rotation
  x: number
  y: number
}

export type Cell = PieceKind | null
export type BlocksRound = {
  board: Cell[][]
  active: Piece
  queue: PieceKind[]
  score: number
  lines: number
  fallElapsed: number
  lockElapsed: number
  lockResets: number
  over: boolean
}

const spawnShapes: Record<PieceKind, readonly Offset[]> = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
}

const shapes = new Map<PieceKind, readonly (readonly Offset[])[]>(pieceKinds.map((kind) => {
  const orientations = [spawnShapes[kind]]
  const edge = kind === 'I' ? 3 : 2
  for (let turn = 1; turn < 4; turn += 1) {
    orientations.push(kind === 'O'
      ? spawnShapes.O
      : orientations[turn - 1].map(([x, y]) => [edge - y, x]))
  }
  return [kind, orientations]
}))

// SRS offsets use positive y upward. Board coordinates grow downward.
const standardKicks: Record<string, readonly Offset[]> = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}

const longKicks: Record<string, readonly Offset[]> = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

function emptyRow(): Cell[] {
  return Array<Cell>(columns).fill(null)
}

function shuffledBag() {
  const bag: PieceKind[] = [...pieceKinds]
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const piece = bag[i]
    bag[i] = bag[j]
    bag[j] = piece
  }
  return bag
}

function takePiece(queue: PieceKind[]) {
  const [kind, ...remaining] = queue.length < 2 ? [...queue, ...shuffledBag()] : queue
  const active: Piece = { kind, x: kind === 'O' ? 4 : 3, y: hiddenRows, rotation: 0 }
  return { active, queue: remaining }
}

export function newBlocksRound(): BlocksRound {
  return {
    board: Array.from({ length: boardRows }, emptyRow),
    ...takePiece([]),
    score: 0,
    lines: 0,
    fallElapsed: 0,
    lockElapsed: 0,
    lockResets: 0,
    over: false,
  }
}

export function blockLevel(lines: number) {
  return Math.floor(lines / 10) + 1
}

export function gravityInterval(lines: number) {
  return Math.max(80, Math.round(800 * Math.pow(0.85, blockLevel(lines) - 1)))
}

export function shapeCells(kind: PieceKind, rotation: Rotation = 0) {
  return shapes.get(kind)![rotation]
}

export function pieceCells(piece: Piece) {
  return shapeCells(piece.kind, piece.rotation).map(([x, y]) => [piece.x + x, piece.y + y] as const)
}

export function fits(board: Cell[][], piece: Piece) {
  return pieceCells(piece).every(([x, y]) => (
    x >= 0 && x < columns && y >= 0 && y < boardRows && board[y][x] === null
  ))
}

export function landingPiece(board: Cell[][], piece: Piece) {
  let landing = piece
  while (fits(board, { ...landing, y: landing.y + 1 })) {
    landing = { ...landing, y: landing.y + 1 }
  }
  return landing
}

function grounded(round: BlocksRound) {
  return !fits(round.board, { ...round.active, y: round.active.y + 1 })
}

function shiftGroundedPiece(round: BlocksRound, active: Piece): BlocksRound {
  if (!grounded(round) || round.lockResets >= maxLockResets) return { ...round, active }
  return { ...round, active, lockElapsed: 0, lockResets: round.lockResets + 1 }
}

export function moveBlock(round: BlocksRound, direction: -1 | 1) {
  const active = { ...round.active, x: round.active.x + direction }
  return !round.over && fits(round.board, active) ? shiftGroundedPiece(round, active) : round
}

export function rotateBlock(round: BlocksRound, direction: -1 | 1) {
  const { active, board } = round
  if (round.over || active.kind === 'O') return round

  const rotation = ((active.rotation + direction + 4) % 4) as Rotation
  const offsets = active.kind === 'I' ? longKicks : standardKicks
  for (const [x, y] of offsets[`${active.rotation}${rotation}`]) {
    const rotated = { ...active, rotation, x: active.x + x, y: active.y - y }
    if (fits(board, rotated)) return shiftGroundedPiece(round, rotated)
  }
  return round
}

export function softDrop(round: BlocksRound) {
  if (round.over || grounded(round)) return round
  return { ...round, active: { ...round.active, y: round.active.y + 1 }, fallElapsed: 0 }
}

function lockPiece(round: BlocksRound, piece: Piece): BlocksRound {
  const board = round.board.map((row) => [...row])
  for (const [x, y] of pieceCells(piece)) board[y][x] = piece.kind

  const kept = board.filter((row) => row.includes(null))
  const cleared = boardRows - kept.length
  const clearedBoard = [...Array.from({ length: cleared }, emptyRow), ...kept]
  const next = takePiece(round.queue)

  return {
    board: clearedBoard,
    ...next,
    score: round.score + lineScores[cleared],
    lines: round.lines + cleared,
    fallElapsed: 0,
    lockElapsed: 0,
    lockResets: 0,
    over: !fits(clearedBoard, next.active),
  }
}

export function hardDrop(round: BlocksRound) {
  return round.over ? round : lockPiece(round, landingPiece(round.board, round.active))
}

export function advanceBlocks(round: BlocksRound, deltaMs: number, softHeld: boolean) {
  let next = round
  let remaining = deltaMs
  while (!next.over && remaining > 0) {
    if (grounded(next)) {
      const spent = Math.min(remaining, lockDelay - next.lockElapsed)
      next = { ...next, lockElapsed: next.lockElapsed + spent }
      remaining -= spent
      if (next.lockElapsed >= lockDelay) next = lockPiece(next, next.active)
    } else {
      const delay = softHeld ? softDropInterval : gravityInterval(next.lines)
      const spent = Math.min(remaining, Math.max(0, delay - next.fallElapsed))
      next = { ...next, fallElapsed: next.fallElapsed + spent }
      remaining -= spent
      if (next.fallElapsed >= delay) next = softDrop(next)
    }
  }
  return next
}
