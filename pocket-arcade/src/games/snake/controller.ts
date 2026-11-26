import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { GameProps } from '../types'
import { advanceSnake, canTurn, moveInterval, newSnakeRound } from './engine'
import type { Direction, SnakeMode, SnakeRound } from './engine'

const modeKey = 'mode'
const maxQueuedTurns = 2

export type SnakePhase = 'ready' | 'playing' | 'paused' | 'lost' | 'won'
export type SnakeView = {
  round: SnakeRound
  phase: SnakePhase
  best: number
}

export function initialSnakeView(storage: GameProps['storage']): SnakeView {
  const mode = storage.getSetting<string>(modeKey, 'classic') === 'wrap' ? 'wrap' : 'classic'
  return { round: newSnakeRound(mode), phase: 'ready', best: storage.getHighScore() }
}

export function mountSnake({ initial, storage, playSound, onChange }: {
  initial: SnakeView
  storage: GameProps['storage']
  playSound: GameProps['playSound']
  onChange: (view: SnakeView) => void
}) {
  let { round, phase, best } = initial
  const turns: Direction[] = []
  const listeners = new AbortController()
  let timer: number | undefined

  function publish() {
    onChange({ round, phase, best })
  }

  function stop() {
    if (timer !== undefined) window.clearTimeout(timer)
    timer = undefined
    turns.length = 0
  }

  function schedule() {
    timer = window.setTimeout(tick, moveInterval(round.score))
  }

  function tick() {
    timer = undefined
    if (phase !== 'playing') return

    const previousScore = round.score
    round = advanceSnake(round, turns.shift() ?? round.direction)
    if (round.score > best) best = storage.saveHighScore(round.score)
    if (round.status !== 'alive') {
      phase = round.status
      stop()
    } else {
      schedule()
    }
    publish()

    if (round.score > previousScore) playSound('merge')
    else if (phase === 'lost') playSound('click')
  }

  function pause() {
    if (phase !== 'playing' || listeners.signal.aborted) return
    phase = 'paused'
    stop()
    publish()
  }

  function startOrResume() {
    if (phase === 'playing' || document.hidden) return
    if (phase === 'lost' || phase === 'won') round = newSnakeRound(round.mode)
    phase = 'playing'
    playSound('click')
    publish()
    schedule()
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause()
  }, { signal: listeners.signal })
  window.addEventListener('pagehide', pause, { signal: listeners.signal })

  const nativeListener = Capacitor.isNativePlatform()
    ? App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) pause()
      }).catch(() => undefined)
    : undefined

  return {
    pause,
    startOrResume,
    selectMode(mode: SnakeMode) {
      if (mode === round.mode) return
      stop()
      round = newSnakeRound(mode)
      phase = 'ready'
      storage.setSetting(modeKey, mode)
      playSound('click')
      publish()
    },
    turn(direction: Direction) {
      if (phase !== 'playing' || turns.length >= maxQueuedTurns) return
      const from = turns.at(-1) ?? round.direction
      if (canTurn(from, direction)) turns.push(direction)
    },
    dispose() {
      listeners.abort()
      stop()
      void nativeListener?.then((listener) => listener?.remove()).catch(() => {})
    },
  }
}
