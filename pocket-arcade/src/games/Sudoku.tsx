import { ArrowRight, BookOpen, Check, Clock3, LockKeyhole, Star } from 'lucide-react'
import { useState } from 'react'
import { sudokuLevels } from '../data/sudokuLevels'
import { openSudokuTechniques } from '../services/navigation'
import { PlaySudoku } from './sudoku/PlaySudoku'
import { formatSudokuTime, getBestTime } from './sudoku/progress'
import type { GameProps } from './types'
import './sudoku/sudoku.css'

export function Sudoku({ game, storage, playSound }: GameProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const level = selectedLevel === null ? null : sudokuLevels[selectedLevel]
  const complete = new Set(storage.getCompletedLevels())
  const Icon = game.icon
  const completedCount = sudokuLevels.filter(({ levelId }) => complete.has(levelId)).length

  function backToLevels() {
    setSelectedLevel(null)
    playSound('click')
  }

  function startLevel(index: number) {
    setSelectedLevel(index)
    playSound('enter')
  }

  if (level && selectedLevel !== null) {
    const nextIndex = selectedLevel + 1
    return (
      <section className="game-layout sudoku-game" data-color={game.color} aria-labelledby="sudoku-title">
        <PlaySudoku
          key={level.levelId}
          level={level}
          storage={storage}
          playSound={playSound}
          onBack={backToLevels}
          onNext={nextIndex < sudokuLevels.length ? () => startLevel(nextIndex) : undefined}
        />
      </section>
    )
  }

  return (
    <section className="game-layout sudoku-levels" data-color={game.color} aria-labelledby="sudoku-title">
      <div className="game-heading sudoku-levels-heading">
        <div className="game-heading-icon"><Icon size={24} aria-hidden /></div>
        <div>
          <div className="card-category">关卡选择</div>
          <h1 id="sudoku-title">{game.title}</h1>
        </div>
        <div className="sudoku-level-actions">
          <span className="sudoku-progress">已通关 {completedCount}/{sudokuLevels.length}</span>
          <button
            className="sudoku-tool sudoku-techniques-entry"
            type="button"
            onClick={() => {
              playSound('enter')
              openSudokuTechniques()
            }}
          >
            <BookOpen size={17} aria-hidden /> 数独技巧
          </button>
        </div>
      </div>

      <ul className="sudoku-level-grid">
        {sudokuLevels.map((item, index) => {
          const finished = complete.has(item.levelId)
          const locked = !finished && index > 0 && !complete.has(sudokuLevels[index - 1].levelId)
          const best = getBestTime(storage, item.levelId)

          return (
            <li key={item.levelId}>
              <button
                className="sudoku-level"
                type="button"
                disabled={locked}
                data-state={locked ? 'locked' : finished ? 'complete' : 'available'}
                onClick={() => startLevel(index)}
              >
                <span className="sudoku-level-top">
                  第 {item.levelId} 关
                  {locked ? <LockKeyhole size={16} aria-hidden /> : finished ? <Check size={18} aria-hidden /> : <ArrowRight size={18} aria-hidden />}
                </span>
                <span className="sudoku-level-title">{item.title}</span>
                <span className="sudoku-stars" aria-label={`难度 ${item.difficulty} 星`}>
                  {Array.from({ length: 5 }, (_, star) => (
                    <Star key={star} size={14} fill={star < item.difficulty ? 'currentColor' : 'none'} aria-hidden />
                  ))}
                </span>
                <span className="sudoku-level-status">
                  {locked ? '未解锁' : finished ? '已通关' : '可挑战'}
                </span>
                {best !== null && (
                  <span className="sudoku-level-best"><Clock3 size={13} aria-hidden /> 最佳用时 {formatSudokuTime(best)}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
