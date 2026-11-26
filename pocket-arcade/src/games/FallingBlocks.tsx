import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowDownToLine, Pause, Play, RotateCcw, RotateCw,
} from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { mountBlocks } from './blocks/controller'
import type { BlocksAction, BlocksView } from './blocks/controller'
import { blockLevel, columns, hiddenRows, landingPiece, newBlocksRound, pieceCells, shapeCells } from './blocks/engine'
import type { Piece, PieceKind } from './blocks/engine'
import { readBlocksRound } from './blocks/storage'
import type { GameProps } from './types'
import './blocks/blocks.css'

const movementControls = [
  { action: 'left', label: '左移', icon: ArrowLeft, hold: true },
  { action: 'right', label: '右移', icon: ArrowRight, hold: true },
  { action: 'soft-drop', label: '软降', icon: ArrowDown, hold: true },
] as const

const placementControls = [
  { action: 'counterclockwise', label: '逆时针', icon: RotateCcw, hold: false },
  { action: 'clockwise', label: '顺时针', icon: RotateCw, hold: false },
  { action: 'hard-drop', label: '硬降', icon: ArrowDownToLine, hold: false },
] as const

type BlocksSwipe = {
  pointerId: number
  startX: number
  startY: number
  cellWidth: number
  board: BlocksView['round']['board']
  axis: 'horizontal' | 'down' | 'up' | null
  steps: number
}

function swipeSteps(distance: number, cellWidth: number) {
  const pastThreshold = Math.abs(distance) - cellWidth * 0.65
  return pastThreshold < 0 ? 0 : Math.sign(distance) * (1 + Math.floor(pastThreshold / cellWidth))
}

function occupiedCells(piece: Piece) {
  return new Set(pieceCells(piece).map(([x, y]) => y * columns + x))
}

function NextPiece({ kind }: { kind: PieceKind }) {
  const cells = shapeCells(kind)
  const left = Math.min(...cells.map(([x]) => x))
  const top = Math.min(...cells.map(([, y]) => y))

  return (
    <div className="blocks-next" aria-label={`下一个方块 ${kind}`}>
      <span>下一个</span>
      <div className="blocks-next-piece" aria-hidden>
        {cells.map(([x, y]) => (
          <span
            className="blocks-preview-cell"
            data-piece={kind}
            key={`${x}:${y}`}
            style={{ gridColumnStart: x - left + 1, gridRowStart: y - top + 1 }}
          />
        ))}
      </div>
    </div>
  )
}

export function FallingBlocks({ game, storage, playSound }: GameProps) {
  const [initial] = useState<BlocksView>(() => {
    const saved = readBlocksRound(storage)
    return {
      round: saved ?? newBlocksRound(),
      paused: saved ? !saved.over : document.hidden,
      best: storage.getHighScore(),
    }
  })
  const [view, setView] = useState(initial)
  const controller = useRef<ReturnType<typeof mountBlocks>>(null)
  const swipe = useRef<BlocksSwipe | null>(null)
  const { round, paused, best } = view
  const { board, active, score, lines, over, queue } = round
  const Icon = game.icon

  useLayoutEffect(() => {
    const gameController = mountBlocks({
      initial,
      storage,
      playSound,
      onChange: (next) => {
        if (swipe.current && (next.paused || swipe.current.board !== next.round.board)) {
          swipe.current = null
        }
        setView(next)
      },
    })
    controller.current = gameController
    return () => {
      gameController.dispose()
      controller.current = null
    }
  }, [initial, storage, playSound])

  const moving = over ? new Set<number>() : occupiedCells(active)
  const ghost = over ? new Set<number>() : occupiedCells(landingPiece(board, active))

  function press(action: BlocksAction, pointerId?: number) {
    controller.current?.press(action, pointerId)
  }

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (paused || over || swipe.current || event.button !== 0) return
    const surface = event.currentTarget
    swipe.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cellWidth: Math.max(14, surface.clientWidth / columns),
      board,
      axis: null,
      steps: 0,
    }
    surface.setPointerCapture(event.pointerId)
  }

  function moveSwipe(event: PointerEvent<HTMLDivElement>) {
    const current = swipe.current
    if (!current || current.pointerId !== event.pointerId) return

    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (!current.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < current.cellWidth * 0.65) return
      current.axis = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : dy > 0 ? 'down' : 'up'
    }

    if (current.axis === 'horizontal') {
      const steps = swipeSteps(dx, current.cellWidth)
      const added = steps - current.steps
      current.steps = steps
      if (added) controller.current?.moveBy(added < 0 ? 'left' : 'right', Math.abs(added))
    } else if (current.axis === 'down') {
      const steps = swipeSteps(Math.max(0, dy), current.cellWidth)
      if (steps > current.steps) {
        controller.current?.moveBy('soft-drop', steps - current.steps)
        current.steps = steps
      }
    }
  }

  function endSwipe(event: PointerEvent<HTMLDivElement>) {
    moveSwipe(event)
    cancelSwipe(event)
  }

  function cancelSwipe(event: PointerEvent<HTMLDivElement>) {
    if (swipe.current?.pointerId === event.pointerId) swipe.current = null
  }

  return (
    <section className="game-layout blocks-game" data-color={game.color} aria-labelledby="blocks-title">
      <div className="game-heading blocks-heading">
        <div className="game-heading-icon"><Icon size={22} aria-hidden /></div>
        <div>
          <h1 id="blocks-title">{game.title}</h1>
          <p className="blocks-swipe-help" id="blocks-swipe-help">横滑移位，下滑软降。</p>
        </div>
      </div>

      <div className="blocks-layout">
        <div className="blocks-playfield">
          <div
            className="blocks-board"
            role="img"
            aria-label="10 列 20 行游戏棋盘"
            aria-describedby="blocks-swipe-help"
            data-swipe={!paused && !over}
            onPointerDown={startSwipe}
            onPointerMove={moveSwipe}
            onPointerUp={endSwipe}
            onPointerCancel={cancelSwipe}
            onLostPointerCapture={cancelSwipe}
          >
            {board.slice(hiddenRows).flatMap((row, index) => row.map((cell, column) => {
              const id = (hiddenRows + index) * columns + column
              const state = moving.has(id) ? 'active' : cell ? 'settled' : ghost.has(id) ? 'ghost' : undefined
              return <span className="blocks-cell" key={id} data-state={state} data-piece={cell ?? (state ? active.kind : undefined)} />
            }))}
          </div>
          {paused && !over && (
            <div className="blocks-overlay">
              <h2>已暂停</h2>
              <button className="blocks-resume" type="button" onClick={() => controller.current?.resume()}>
                <Play size={17} aria-hidden /> 继续游戏
              </button>
            </div>
          )}
          {over && (
            <div className="blocks-overlay" role="status">
              <h2>游戏结束</h2>
              <dl className="blocks-result">
                <div><dt>本局分数</dt><dd>{score}</dd></div>
                <div><dt>最高分</dt><dd>{best}</dd></div>
              </dl>
              <p>点击顶部「重新开始」再玩一局。</p>
            </div>
          )}
        </div>

        <aside className="blocks-sidebar" aria-label="本局信息">
          <NextPiece kind={queue[0]} />
          <dl className="blocks-stats">
            <div><dt>当前分数</dt><dd>{score}</dd></div>
            <div><dt>消除行数</dt><dd>{lines}</dd></div>
            <div><dt>当前等级</dt><dd>{blockLevel(lines)}</dd></div>
          </dl>
          <button className="blocks-pause" type="button" disabled={paused || over} onClick={() => controller.current?.pause()}>
            <Pause size={16} aria-hidden /> 暂停
          </button>
        </aside>
      </div>

      <div className="blocks-controls">
        {[movementControls, placementControls].map((controls, index) => (
          <div className="blocks-control-group" role="group" aria-label={index === 0 ? '移动与软降' : '旋转与硬降'} key={index}>
            {controls.map(({ action, label, icon: ControlIcon, hold }) => (
              <button
                className="blocks-control"
                key={action}
                type="button"
                disabled={paused || over}
                onPointerDown={(event) => {
                  if (event.button !== 0) return
                  if (hold) event.currentTarget.setPointerCapture(event.pointerId)
                  press(action, hold ? event.pointerId : undefined)
                }}
                onPointerUp={(event) => controller.current?.release(event.pointerId)}
                onPointerCancel={(event) => controller.current?.release(event.pointerId)}
                onLostPointerCapture={(event) => controller.current?.release(event.pointerId)}
                onClick={(event) => { if (event.detail === 0) press(action) }}
              >
                <ControlIcon size={19} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
