const size = 9
const boxSize = 3

export const sudokuDigits = Array.from({ length: size }, (_, index) => index + 1)

export function rowOf(cell: number) {
  return Math.floor(cell / size)
}

export function columnOf(cell: number) {
  return cell % size
}

function boxOf(cell: number) {
  return Math.floor(rowOf(cell) / boxSize) * boxSize + Math.floor(columnOf(cell) / boxSize)
}

export function sharesUnit(left: number, right: number) {
  return rowOf(left) === rowOf(right) || columnOf(left) === columnOf(right) || boxOf(left) === boxOf(right)
}

export function correctDigitCounts(values: readonly number[], solution: readonly number[]) {
  const counts = Array<number>(size + 1).fill(0)
  values.forEach((value, cell) => {
    if (value === solution[cell]) counts[value] += 1
  })
  return counts
}

export function conflictingCells(values: readonly number[]) {
  return values.map((value, cell) => value > 0 && values.some((other, peer) => (
    cell !== peer && value === other && sharesUnit(cell, peer)
  )))
}
