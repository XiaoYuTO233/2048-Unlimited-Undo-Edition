import { ChevronLeft, Clock3, Eraser, Lightbulb, Pencil, Trophy } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SudokuLevel } from '../../data/sudokuLevels'
import type { GameProps } from '../types'
import { columnOf, conflictingCells, correctDigitCounts, rowOf, sharesUnit, sudokuDigits } from './board'
import { completeSudokuLevel, formatSudokuTime } from './progress'

interface PlaySudokuProps {
  level: SudokuLevel
  storage: GameProps['storage']
  playSound: GameProps['playSound']
  onBack: () => void
  onNext?: () => void
}

interface LevelResult {
  elapsed: number
  best: number
}

function VictoryDialog({ result, onBack, onNext }: {
  result: LevelResult
  onBack: () => void
  onNext?: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => { element?.close() }
  }, [])

  return (
    <dialog
      ref={dialog}
      className="sudoku-result"
      aria-labelledby="sudoku-result-title"
      onCancel={(event) => {
        event.preventDefault()
        onBack()
      }}
    >
      <div className="sudoku-result-icon"><Trophy size={27} aria-hidden /></div>
      <h2 id="sudoku-result-title">闯关成功</h2>
      <dl className="sudoku-result-times">
        <div><dt>本关用时</dt><dd>{formatSudokuTime(result.elapsed)}</dd></div>
        <div><dt>最佳用时</dt><dd>{formatSudokuTime(result.best)}</dd></div>
      </dl>
      <div className="sudoku-result-actions">
        <button className={onNext ? 'sudoku-tool' : 'sudoku-primary'} type="button" onClick={onBack}>返回选关</button>
        {onNext && <button className="sudoku-primary" type="button" onClick={onNext}>下一关</button>}
      </div>
    </dialog>
  )
}

export function PlaySudoku({ level, storage, playSound, onBack, onNext }: PlaySudokuProps) {
  const givens = useMemo(() => Array.from(level.puzzle, Number), [level.puzzle])
  const solution = useMemo(() => Array.from(level.solution, Number), [level.solution])
  const [values, setValues] = useState(givens)
  const [notes, setNotes] = useState(() => Array<number>(givens.length).fill(0))
  const [selected, setSelected] = useState<number | null>(null)
  const [noteMode, setNoteMode] = useState(false)
  const [startedAt] = useState(() => performance.now())
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<LevelResult | null>(null)
  const correctCounts = useMemo(() => correctDigitCounts(values, solution), [values, solution])
  const conflicts = useMemo(() => conflictingCells(values), [values])
  const editableCell = selected !== null && !givens[selected] && !result ? selected : null
  const selectedValue = selected === null ? 0 : values[selected]

  useEffect(() => {
    if (result) return
    const timer = window.setInterval(() => setElapsed(performance.now() - startedAt), 500)
    return () => window.clearInterval(timer)
  }, [result, startedAt])

  function writeValue(cell: number, digit: number) {
    const updated = [...values]
    updated[cell] = digit
    setValues(updated)
    setNotes((previous) => previous.map((mask, index) => index === cell ? 0 : mask))

    if (!updated.every((value, index) => value === solution[index])) {
      playSound('click')
      return
    }

    const elapsedMs = Math.floor(performance.now() - startedAt)
    const best = completeSudokuLevel(storage, level.levelId, elapsedMs)
    setResult({ elapsed: elapsedMs, best })
    playSound('merge')
  }

  function enterDigit(digit: number) {
    if (editableCell === null || correctCounts[digit] === 9) return
    if (noteMode) {
      if (values[editableCell]) return
      setNotes((previous) => previous.map((mask, cell) => (
        cell === editableCell ? mask ^ (1 << digit) : mask
      )))
      playSound('click')
    } else {
      writeValue(editableCell, digit)
    }
  }

  const showFullBoardHint = !result && values.every(Boolean)

  return (
    <>
      <div className="sudoku-play-nav">
        <button className="sudoku-back" type="button" onClick={onBack}>
          <ChevronLeft size={19} aria-hidden /> 关卡选择
        </button>
        <span className="sudoku-time"><Clock3 size={16} aria-hidden /> {formatSudokuTime(result?.elapsed ?? elapsed)}</span>
      </div>
      <div className="sudoku-play-heading">
        <h1 id="sudoku-title">{level.title}</h1>
        <span>第 {level.levelId} 关</span>
      </div>

      <div className="sudoku-board" role="group" aria-label="9×9 数独棋盘">
        {values.map((value, cell) => {
          const fixed = Boolean(givens[cell])
          const sameNumber = value > 0 && value === selectedValue
          const candidates = sudokuDigits.filter((digit) => notes[cell] & (1 << digit))
          const cellLabel = `第 ${rowOf(cell) + 1} 行第 ${columnOf(cell) + 1} 列，` +
            (value ? `${value}${fixed ? '，题目给定' : ''}` : candidates.length ? `候选 ${candidates.join('、')}` : '空格')

          return (
            <button
              key={cell}
              className="sudoku-cell"
              type="button"
              aria-label={cellLabel}
              aria-pressed={cell === selected}
              data-fixed={fixed}
              data-peer={selected !== null && sharesUnit(cell, selected)}
              data-match={sameNumber}
              data-conflict={!fixed && conflicts[cell]}
              onClick={() => setSelected(cell)}
            >
              {value || (candidates.length > 0 && (
                <span className="sudoku-notes" aria-hidden>
                  {sudokuDigits.map((digit) => <span key={digit}>{(notes[cell] & (1 << digit)) ? digit : ''}</span>)}
                </span>
              ))}
            </button>
          )
        })}
      </div>

      <div className="sudoku-input-message" role="status">
        {showFullBoardHint ? '棋盘已填满，请检查冲突。' : noteMode ? '笔记模式下可为当前空格记录候选数字。' : selected === null ? '先点选棋盘格子，再输入数字。' : ''}
      </div>
      <div className="sudoku-keypad" role="group" aria-label="数字键盘">
        {sudokuDigits.map((digit) => {
          const done = correctCounts[digit] === 9
          return (
            <button
              key={digit}
              className="sudoku-number"
              type="button"
              aria-label={done ? `数字 ${digit}，已正确填满` : `数字 ${digit}`}
              data-filled={done}
              disabled={done || editableCell === null || (noteMode && Boolean(values[editableCell]))}
              onClick={() => enterDigit(digit)}
            >
              {digit}
            </button>
          )
        })}
      </div>
      <div className="sudoku-tools" role="group" aria-label="棋盘工具">
        <button
          className="sudoku-tool"
          type="button"
          disabled={editableCell === null || (!values[editableCell] && !notes[editableCell])}
          onClick={() => { if (editableCell !== null) writeValue(editableCell, 0) }}
        >
          <Eraser size={18} aria-hidden /> 擦除
        </button>
        <button
          className="sudoku-tool"
          type="button"
          aria-pressed={noteMode}
          onClick={() => {
            setNoteMode((previous) => !previous)
            playSound('click')
          }}
        >
          <Pencil size={18} aria-hidden /> 笔记模式
        </button>
        <button
          className="sudoku-tool"
          type="button"
          disabled={editableCell === null || values[editableCell] === solution[editableCell]}
          onClick={() => { if (editableCell !== null) writeValue(editableCell, solution[editableCell]) }}
        >
          <Lightbulb size={18} aria-hidden /> 提示
        </button>
      </div>

      {result && <VictoryDialog result={result} onBack={onBack} onNext={onNext} />}
    </>
  )
}
