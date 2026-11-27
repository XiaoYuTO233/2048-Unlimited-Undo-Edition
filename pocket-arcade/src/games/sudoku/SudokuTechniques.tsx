import { BookOpen, Play, RotateCcw, Star } from 'lucide-react'
import { useState } from 'react'
import type { SudokuLevel } from '../../data/sudokuLevels'
import type { GameProps } from '../types'
import { boxOf, columnOf, rowOf, sudokuDigits } from './board'
import { sudokuTechniques, type TechniqueExample } from './techniqueExamples'
import './techniques.css'

interface SudokuTechniquesProps {
  color: GameProps['game']['color']
  playSound: GameProps['playSound']
}

function ExampleBoard({ example, applied }: { example: TechniqueExample; applied: boolean }) {
  const relevantDigits = Object.values(example.candidates).map((notes) => notes?.fill ?? notes?.remove ?? '').join('')

  return (
    <div className="sudoku-board sudoku-lesson-board" role="img" aria-label="技巧示例棋盘">
      {Array.from(example.grid.join(''), (value, cell) => {
        const notes = example.candidates[cell]
        const fixed = value !== '0'
        const filled = applied ? notes?.fill : undefined
        const highlighted = example.rows?.includes(rowOf(cell) + 1)
          || example.columns?.includes(columnOf(cell) + 1)
          || example.boxes?.includes(boxOf(cell) + 1)

        return (
          <span
            key={cell}
            className="sudoku-cell"
            data-fixed={fixed}
            data-peer={Boolean(highlighted)}
            data-example-anchor={Boolean(notes && !notes.remove)}
            data-example-filled={Boolean(filled)}
            aria-hidden
          >
            {fixed && value}
            {filled}
            {!filled && notes && (
              <span className="sudoku-notes">
                {sudokuDigits.map((digit) => {
                  const text = String(digit)
                  return (
                    <span
                      key={digit}
                      data-example-digit={relevantDigits.includes(text)}
                      data-removed={Boolean(applied && notes.remove?.includes(text))}
                    >
                      {notes.digits.includes(text) ? text : ''}
                    </span>
                  )
                })}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

export function SudokuTechniques({ color, playSound }: SudokuTechniquesProps) {
  const [stars, setStars] = useState<SudokuLevel['difficulty']>(1)
  const [applied, setApplied] = useState(false)
  const lesson = sudokuTechniques[stars - 1]
  const fillsCell = Object.values(lesson.example.candidates).some((notes) => notes?.fill)

  function selectLesson(next: SudokuLevel['difficulty']) {
    if (next === stars) return
    setStars(next)
    setApplied(false)
    playSound('click')
  }

  return (
    <section className="game-layout sudoku-techniques" data-color={color} aria-labelledby="sudoku-techniques-title">
      <div className="game-heading sudoku-techniques-heading">
        <div className="game-heading-icon"><BookOpen size={24} aria-hidden /></div>
        <div>
          <h1 id="sudoku-techniques-title">数独技巧</h1>
          <p>高星关卡也会用到前面星级的技巧。</p>
        </div>
      </div>

      <div className="sudoku-techniques-stars" role="group" aria-label="技巧星级">
        {sudokuTechniques.map((technique) => (
          <button
            key={technique.stars}
            className="sudoku-tool"
            type="button"
            aria-pressed={stars === technique.stars}
            aria-controls="sudoku-lesson"
            onClick={() => selectLesson(technique.stars)}
          >
            <Star size={15} fill={stars === technique.stars ? 'currentColor' : 'none'} aria-hidden />
            {technique.stars} 星
          </button>
        ))}
      </div>

      <article className="sudoku-lesson" id="sudoku-lesson" aria-labelledby="sudoku-lesson-title">
        <div className="sudoku-lesson-copy">
          <h2 id="sudoku-lesson-title">{lesson.title}</h2>
          <p>{lesson.rule}</p>
          <dl>
            <div>
              <dt>看哪里</dt>
              <dd>{lesson.observation}</dd>
            </div>
            <div>
              <dt>怎么做</dt>
              <dd>{lesson.action}</dd>
            </div>
          </dl>
        </div>

        <figure className="sudoku-game sudoku-lesson-example">
          <div className="sudoku-lesson-toolbar">
            <span>示例棋盘</span>
            <button
              className="sudoku-tool sudoku-lesson-toggle"
              type="button"
              onClick={() => {
                setApplied(!applied)
                playSound('click')
              }}
            >
              {applied ? <RotateCcw size={15} aria-hidden /> : <Play size={15} aria-hidden />}
              {applied ? '还原示例' : '演示这一步'}
            </button>
          </div>
          <ExampleBoard example={lesson.example} applied={applied} />
          <figcaption aria-live="polite">
            {applied
              ? (fillsCell ? '高亮格已填入答案。' : '带划线的数字可以从对应格的候选中删去。')
              : '小数字表示候选数。只标出这一步用到的候选格。'}
          </figcaption>
        </figure>
      </article>
    </section>
  )
}
