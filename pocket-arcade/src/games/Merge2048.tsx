import { ChartNoAxesColumn, Trophy, Undo2 } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { BOARD_SIZE, mount2048, tilePosition } from './merge2048/board'
import type { BoardView } from './merge2048/board'
import type { GameProps } from './types'
import './merge2048/board.css'

const cells = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => (
  tilePosition(Math.floor(index / BOARD_SIZE), index % BOARD_SIZE)
))

const initialView: BoardView = {
  score: 0,
  best: 0,
  undoCount: 0,
  phase: 'playing',
  gained: 0,
  moves: 0,
}

export function Merge2048({ game, storage, playSound }: GameProps) {
  const board = useRef<HTMLDivElement>(null)
  const tileLayer = useRef<HTMLDivElement>(null)
  const controller = useRef<ReturnType<typeof mount2048>>(null)
  const [view, setView] = useState(initialView)
  const Icon = game.icon

  useLayoutEffect(() => {
    if (!board.current || !tileLayer.current) return

    const game = mount2048({
      board: board.current,
      tileLayer: tileLayer.current,
      storage,
      playSound,
      onChange: setView,
    })
    controller.current = game

    return () => {
      game.dispose()
      controller.current = null
    }
  }, [storage, playSound])

  return (
    <section className="game-layout merge-game" data-color={game.color} aria-labelledby="game-title">
      <div className="game-heading">
        <div className="game-heading-icon"><Icon size={24} aria-hidden /></div>
        <div>
          <div className="card-category">无限撤销版</div>
          <h1 id="game-title">{game.title}</h1>
        </div>
      </div>

      <div className="game-stats" aria-label="得分记录">
        <div className="merge-game-score">
          <ChartNoAxesColumn size={18} aria-hidden />
          <span>当前得分</span>
          <strong aria-label={`当前得分 ${view.score}`}>{view.score}</strong>
          {view.gained > 0 && (
            <span className="merge-score-gain" key={view.moves} aria-hidden>+{view.gained}</span>
          )}
        </div>
        <div>
          <Trophy size={18} aria-hidden />
          <span>最高分</span>
          <strong aria-label={`最高分 ${view.best}`}>{view.best}</strong>
        </div>
      </div>

      <div className="merge-board" ref={board} role="group" aria-label="2048 棋盘">
        <div aria-hidden>
          {cells.map((position, index) => <div className="merge-cell" key={index} style={position} />)}
        </div>
        <div className="merge-tiles" ref={tileLayer} />
        {view.phase === 'won' && (
          <button className="merge-result" type="button" onClick={() => controller.current?.continueGame()}>
            <strong>达成 2048</strong>
            <span>点击继续游戏</span>
          </button>
        )}
        {view.phase === 'over' && (
          <div className="merge-result" role="status">
            <strong>游戏结束</strong>
            <span>可撤销一步，或使用顶部按钮重新开始</span>
          </div>
        )}
      </div>

      <div className="merge-controls">
        <button
          className="preview-button merge-undo"
          type="button"
          disabled={view.undoCount === 0}
          onClick={() => controller.current?.undo()}
        >
          <Undo2 size={18} aria-hidden />
          撤销
          <span className="merge-undo-count">{view.undoCount}</span>
        </button>
        <p>滑动棋盘或使用方向键</p>
      </div>
    </section>
  )
}
