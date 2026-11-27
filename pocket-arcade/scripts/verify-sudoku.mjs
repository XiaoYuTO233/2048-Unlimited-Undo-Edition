import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const size = 9
const boxSize = 3
const fullMask = (1 << size) - 1
const digits = Array.from({ length: size }, (_, digit) => 1 << digit)
const indices = Array.from({ length: size * size }, (_, cell) => cell)
const rowOf = (cell) => Math.floor(cell / size)
const columnOf = (cell) => cell % size
const boxOf = (cell) => Math.floor(rowOf(cell) / boxSize) * boxSize + Math.floor(columnOf(cell) / boxSize)
const rows = digits.map((_, row) => indices.filter((cell) => rowOf(cell) === row))
const columns = digits.map((_, column) => indices.filter((cell) => columnOf(cell) === column))
const boxes = digits.map((_, box) => indices.filter((cell) => boxOf(cell) === box))
const units = [...rows, ...columns, ...boxes]
const peers = indices.map((cell) => {
  const related = [...rows[rowOf(cell)], ...columns[columnOf(cell)], ...boxes[boxOf(cell)]]
  return [...new Set(related)].filter((peer) => peer !== cell)
})
const bitCount = Array.from({ length: fullMask + 1 }, (_, mask) => digits.filter((bit) => mask & bit).length)
const digitFor = (bit) => Math.log2(bit) + 1

export function countSolutions(puzzle) {
  const grid = Array.from(puzzle, Number)
  const rowMasks = Array(size).fill(0)
  const columnMasks = Array(size).fill(0)
  const boxMasks = Array(size).fill(0)
  let count = 0
  let solution

  function used(cell) {
    return rowMasks[rowOf(cell)] | columnMasks[columnOf(cell)] | boxMasks[boxOf(cell)]
  }

  function toggle(cell, bit) {
    rowMasks[rowOf(cell)] ^= bit
    columnMasks[columnOf(cell)] ^= bit
    boxMasks[boxOf(cell)] ^= bit
  }

  for (const cell of indices) {
    if (!grid[cell]) continue
    const bit = digits[grid[cell] - 1]
    if (used(cell) & bit) return { count: 0 }
    toggle(cell, bit)
  }

  function visit() {
    let chosen = -1
    let choices = fullMask
    for (const cell of indices) {
      if (grid[cell]) continue
      const available = fullMask & ~used(cell)
      if (!available) return
      if (chosen === -1 || bitCount[available] < bitCount[choices]) {
        chosen = cell
        choices = available
      }
      if (bitCount[choices] === 1) break
    }

    if (chosen === -1) {
      if (count === 0) solution = grid.join('')
      count += 1
      return
    }

    for (const bit of digits) {
      if (!(choices & bit)) continue
      grid[chosen] = digitFor(bit)
      toggle(chosen, bit)
      visit()
      toggle(chosen, bit)
      grid[chosen] = 0
      if (count >= 2) return
    }
  }

  visit()
  return { count, solution }
}

function eliminate(candidates, cells, keep, mask) {
  let changed = false
  for (const cell of cells) {
    if (keep.includes(cell) || !(candidates[cell] & mask)) continue
    candidates[cell] &= ~mask
    changed = true
  }
  return changed
}

function lockedCandidates(candidates) {
  for (const [lines, lineOf] of [[rows, rowOf], [columns, columnOf]]) {
    for (const box of boxes) {
      for (const bit of digits) {
        const cells = box.filter((cell) => candidates[cell] & bit)
        if (!cells.length) continue
        const line = lineOf(cells[0])
        if (cells.every((cell) => lineOf(cell) === line) && eliminate(candidates, lines[line], box, bit)) return true
      }
    }

    for (const line of lines) {
      for (const bit of digits) {
        const cells = line.filter((cell) => candidates[cell] & bit)
        if (!cells.length) continue
        const box = boxOf(cells[0])
        if (cells.every((cell) => boxOf(cell) === box) && eliminate(candidates, boxes[box], line, bit)) return true
      }
    }
  }
  return false
}

function nakedPair(candidates) {
  for (const unit of units) {
    const pairedMasks = new Set(unit.map((cell) => candidates[cell]).filter((mask) => bitCount[mask] === 2))
    for (const mask of pairedMasks) {
      const pair = unit.filter((cell) => candidates[cell] === mask)
      if (pair.length === 2 && eliminate(candidates, unit, pair, mask)) return true
    }
  }
  return false
}

function xWing(candidates) {
  for (const [baseLines, coverLines, coverOf] of [[rows, columns, columnOf], [columns, rows, rowOf]]) {
    for (const bit of digits) {
      const starts = new Map()
      for (const line of baseLines) {
        const cells = line.filter((cell) => candidates[cell] & bit)
        if (cells.length !== 2) continue
        const covers = cells.map(coverOf)
        const signature = covers.join(',')
        const matching = starts.get(signature)
        if (!matching) {
          starts.set(signature, cells)
          continue
        }

        const corners = [...matching, ...cells]
        const coverCells = covers.flatMap((cover) => coverLines[cover])
        if (eliminate(candidates, coverCells, corners, bit)) return true
      }
    }
  }
  return false
}

export function solveLogically(puzzle, maxTechnique = 5) {
  const grid = Array.from(puzzle, Number)
  const candidates = grid.map((digit, cell) => digit ? 0 : peers[cell].reduce(
    (mask, peer) => grid[peer] ? mask & ~digits[grid[peer] - 1] : mask, fullMask,
  ))
  const steps = []

  function place(cell, bit) {
    grid[cell] = digitFor(bit)
    candidates[cell] = 0
    for (const peer of peers[cell]) candidates[peer] &= ~bit
  }

  function hiddenSingle() {
    for (const unit of units) {
      for (const bit of digits) {
        const cells = unit.filter((cell) => candidates[cell] & bit)
        if (cells.length !== 1) continue
        place(cells[0], bit)
        return true
      }
    }
    return false
  }

  while (grid.includes(0)) {
    const single = candidates.findIndex((mask) => bitCount[mask] === 1)
    if (single >= 0) {
      place(single, candidates[single])
      steps.push(1)
    } else if (maxTechnique >= 2 && hiddenSingle()) {
      steps.push(2)
    } else if (maxTechnique >= 3 && lockedCandidates(candidates)) {
      steps.push(3)
    } else if (maxTechnique >= 4 && nakedPair(candidates)) {
      steps.push(4)
    } else if (maxTechnique >= 5 && xWing(candidates)) {
      steps.push(5)
    } else {
      return { steps }
    }
  }

  return { solution: grid.join(''), steps }
}

async function verifyLevels() {
  const source = await readFile(new URL('../src/data/sudokuLevels.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  })
  const { sudokuLevels } = await import('data:text/javascript,' + encodeURIComponent(outputText))

  assert.ok(Array.isArray(sudokuLevels) && sudokuLevels.length > 0, 'The Sudoku bank is empty.')
  const techniqueNames = ['显性唯一', '隐性唯一', '区块排除', '显性数对', 'X-Wing']
  const levelIds = new Set()
  const puzzles = new Set()
  let previousDifficulty = 0

  for (const [index, level] of sudokuLevels.entries()) {
    const { levelId, title, difficulty, puzzle, solution } = level
    const label = `第 ${index + 1} 关`
    assert.ok(Number.isSafeInteger(levelId) && levelId > 0, `${label}的 levelId 必须是正整数`)
    assert.ok(!levelIds.has(levelId), `${label}的 levelId 重复`)
    assert.ok(typeof title === 'string' && title.trim(), `${label}缺少标题`)
    assert.ok(Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5, `${label}难度必须是 1–5 的整数`)
    assert.ok(difficulty >= previousDifficulty, `${label}必须按难度升序排列`)
    assert.match(puzzle, /^[0-9]{81}$/, `${label}题面必须是 81 位数字`)
    assert.ok(puzzle.includes('0'), `${label}必须包含空格`)
    assert.ok(!puzzles.has(puzzle), `${label}的题面重复`)
    levelIds.add(levelId)
    puzzles.add(puzzle)
    previousDifficulty = difficulty

    assert.match(solution, /^[1-9]{81}$/, `${label}答案必须是 81 位非零数字`)
    assert.deepEqual(countSolutions(puzzle), { count: 1, solution }, `${label}必须恰有一个解并与录入答案一致`)

    const logical = solveLogically(puzzle, difficulty)
    assert.equal(logical.solution, solution, `${label}无法仅用当前难度的逻辑技巧推出答案`)
    const counts = techniqueNames.map((name, rank) => `${name} ${logical.steps.filter((step) => step === rank + 1).length}`)
    console.log(`${label} ${title}（${difficulty} 星）· 唯一解 · ${counts.join('，')}`)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await verifyLevels()
