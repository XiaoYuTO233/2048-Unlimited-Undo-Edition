import { directionVectors, gridSize } from './engine'
import type { SnakeRound } from './engine'

const dark = {
  background: '#192a2a',
  grid: '#304541',
  body: '#68c884',
  head: '#b1ecab',
  eye: '#183a32',
  food: '#f990ab',
  highlight: '#ffd0dc',
}

const light = {
  background: '#ebf2e7',
  grid: '#ccdccc',
  body: '#4b9b6a',
  head: '#27794d',
  eye: '#eff8e9',
  food: '#c34b70',
  highlight: '#f7bed0',
}

export function drawSnake(canvas: HTMLCanvasElement, round: SnakeRound) {
  const width = canvas.clientWidth
  if (!width) return

  const resolution = Math.round(width * Math.min(3, window.devicePixelRatio || 1))
  if (canvas.width !== resolution || canvas.height !== resolution) {
    canvas.width = resolution
    canvas.height = resolution
  }

  const context = canvas.getContext('2d')
  if (!context) return

  const colors = document.documentElement.dataset.theme === 'light' ? light : dark
  const scale = resolution / gridSize
  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.fillStyle = colors.background
  context.fillRect(0, 0, gridSize, gridSize)

  context.strokeStyle = colors.grid
  context.lineWidth = gridSize / width
  context.beginPath()
  for (let line = 1; line < gridSize; line += 1) {
    context.moveTo(line, 0)
    context.lineTo(line, gridSize)
    context.moveTo(0, line)
    context.lineTo(gridSize, line)
  }
  context.stroke()

  const [head, ...tail] = round.body
  context.fillStyle = colors.body
  for (const { x, y } of tail) context.fillRect(x + 0.11, y + 0.11, 0.78, 0.78)
  context.fillStyle = colors.head
  context.fillRect(head.x + 0.08, head.y + 0.08, 0.84, 0.84)

  const forward = directionVectors[round.direction]
  context.fillStyle = colors.eye
  for (const side of [-1, 1]) {
    const x = head.x + 0.5 + forward.x * 0.19 - forward.y * side * 0.18
    const y = head.y + 0.5 + forward.y * 0.19 + forward.x * side * 0.18
    context.fillRect(x - 0.06, y - 0.06, 0.12, 0.12)
  }

  if (round.food) {
    const { x, y } = round.food
    context.fillStyle = colors.food
    context.beginPath()
    context.arc(x + 0.5, y + 0.5, 0.31, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = colors.highlight
    context.fillRect(x + 0.35, y + 0.33, 0.17, 0.1)
  }
}
