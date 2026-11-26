import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { drawSnake } from './snake/canvas'
import { initialSnakeView, mountSnake } from './snake/controller'
import { gridSize } from './snake/engine'
import type { Direction } from './snake/engine'
import type { GameProps } from './types'
import './snake/snake.css'

const directionControls = [
  { direction: 'up', label: '向上', icon: ArrowUp },
  { direction: 'left', label: '向左', icon: ArrowLeft },
  { direction: 'right', label: '向右', icon: ArrowRight },
  { direction: 'down', label: '向下', icon: ArrowDown },
] as const

type Swipe = { pointerId: number; x: number; y: number; threshold: number; used: boolean }

export function Snake({ game, storage, playSound }: GameProps) {
  const [initial] = useState(() => initialSnakeView(storage))
  const [view, setView] = useState(initial)
  const canvas = useRef<HTMLCanvasElement>(null)
  const visibleRound = useRef(initial.round)
  const controller = useRef<ReturnType<typeof mountSnake>>(null)
  const swipe = useRef<Swipe | null>(null)
  const { round, phase, best } = view
  const playing = phase === 'playing'
  const Icon = game.icon

  useLayoutEffect(() => {
    const snake = mountSnake({
      initial,
      storage,
      playSound,
      onChange(next) {
        if (next.phase !== 'playing') swipe.current = null
        setView(next)
      },
    })
    controller.current = snake
    return () => {
      snake.dispose()
      controller.current = null
    }
  }, [initial, storage, playSound])

  useLayoutEffect(() => {
    visibleRound.current = round
    if (canvas.current) drawSnake(canvas.current, round)
  }, [round])

  useEffect(() => {
    const surface = canvas.current
    if (!surface) return

    const redraw = () => drawSnake(surface, visibleRound.current)
    const resize = new ResizeObserver(redraw)
    resize.observe(surface)
    const theme = new MutationObserver(redraw)
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      resize.disconnect()
      theme.disconnect()
    }
  }, [])

  function turn(direction: Direction) {
    controller.current?.turn(direction)
  }

  function startSwipe(event: PointerEvent<HTMLCanvasElement>) {
    if (!playing || swipe.current || event.button !== 0) return
    const surface = event.currentTarget
    swipe.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      threshold: Math.max(14, surface.clientWidth / gridSize),
      used: false,
    }
    surface.setPointerCapture(event.pointerId)
  }

  function moveSwipe(event: PointerEvent<HTMLCanvasElement>) {
    const gesture = swipe.current
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.used) return

    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < gesture.threshold) return
    gesture.used = true
    if (Math.abs(dx) >= Math.abs(dy)) turn(dx < 0 ? 'left' : 'right')
    else turn(dy < 0 ? 'up' : 'down')
  }

  function cancelSwipe(event: PointerEvent<HTMLCanvasElement>) {
    if (swipe.current?.pointerId === event.pointerId) swipe.current = null
  }

  function endSwipe(event: PointerEvent<HTMLCanvasElement>) {
    moveSwipe(event)
    cancelSwipe(event)
  }

  const title = phase === 'paused' ? '已暂停' : phase === 'lost' ? '游戏结束' : phase === 'won' ? '填满棋盘' : null
  const action = phase === 'ready' ? '开始游戏' : phase === 'paused' ? '继续游戏' : '再玩一局'

  return (
    <section className="game-layout snake-game" data-color={game.color} aria-labelledby="snake-title">
      <div className="game-heading snake-heading">
        <div className="game-heading-icon"><Icon size={22} aria-hidden /></div>
        <div>
          <h1 id="snake-title">{game.title}</h1>
          <p className="snake-help" id="snake-help">滑动画布或点按方向键转向。</p>
        </div>
      </div>

      <div className="snake-modes" role="group" aria-label="游戏模式">
        <button
          type="button"
          aria-pressed={round.mode === 'classic'}
          onClick={() => controller.current?.selectMode('classic')}
        >
          <span>经典模式</span>
          <small>撞墙结束</small>
        </button>
        <button
          type="button"
          aria-pressed={round.mode === 'wrap'}
          onClick={() => controller.current?.selectMode('wrap')}
        >
          <span>穿墙模式</span>
          <small>从对侧出现</small>
        </button>
      </div>

      <div className="game-stats snake-stats" aria-label="得分记录">
        <div><span>当前得分</span><strong>{round.score}</strong></div>
        <div><span>最高分</span><strong>{best}</strong></div>
      </div>

      <div className="snake-playfield">
        <canvas
          className="snake-canvas"
          ref={canvas}
          role="img"
          aria-label="20 列 20 行贪吃蛇棋盘"
          aria-describedby="snake-help"
          data-swipe={playing}
          onPointerDown={startSwipe}
          onPointerMove={moveSwipe}
          onPointerUp={endSwipe}
          onPointerCancel={cancelSwipe}
          onLostPointerCapture={cancelSwipe}
        />
        {!playing && (
          <div className="snake-overlay">
            {title && <h2>{title}</h2>}
            <button className="snake-start" type="button" onClick={() => controller.current?.startOrResume()}>
              <Play size={18} aria-hidden /> {action}
            </button>
          </div>
        )}
      </div>

      <div className="snake-dpad" role="group" aria-label="十字方向键">
        {directionControls.map(({ direction, label, icon: ControlIcon }) => (
          <button
            key={direction}
            className={`snake-key snake-key-${direction}`}
            type="button"
            aria-label={label}
            disabled={!playing}
            onPointerDown={(event) => { if (event.button === 0) turn(direction) }}
            onClick={(event) => { if (event.detail === 0) turn(direction) }}
          >
            <ControlIcon size={23} aria-hidden />
          </button>
        ))}
        <button
          className="snake-key snake-key-pause"
          type="button"
          aria-label="暂停"
          disabled={!playing}
          onPointerDown={(event) => { if (event.button === 0) controller.current?.pause() }}
          onClick={(event) => { if (event.detail === 0) controller.current?.pause() }}
        >
          <Pause size={21} aria-hidden />
        </button>
      </div>
    </section>
  )
}
